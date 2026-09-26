import { describe, expect, it, jest } from '@jest/globals';

// The mocked storage has to be built inside the factory: the store under test is imported (and
// therefore rehydrated) before any module-scope const in this file is initialized. The blobs live
// on globalThis so a jest.isolateModules() re-import (which re-runs this factory) sees the same map.
jest.mock('@/lib/storage', () => {
  const globalBlobs = globalThis as unknown as { __coreRehydrationBlobs?: Record<string, string> };
  globalBlobs.__coreRehydrationBlobs = globalBlobs.__coreRehydrationBlobs ?? {
    // A version-0 session that was killed part-way through init() left `isInitializing: true`
    // behind, and still carries the core store's own copy of the active call (set from the map pin).
    'core-storage': JSON.stringify({
      state: {
        isInitializing: true,
        isLoading: true,
        error: 'Failed to init core app data',
        isInitialized: true,
        config: { EventingUrl: 'https://events.test' },
        activeCallId: 'call-1',
        activeCall: { CallId: 'call-1', Name: 'Map pin call' },
        activePriority: { Id: 1, Name: 'High' },
      },
      version: 0,
    }),
  };
  const blobs = globalBlobs.__coreRehydrationBlobs;

  return {
    zustandStorage: {
      getItem: jest.fn((name: string) => blobs[name] ?? null),
      setItem: jest.fn(),
      removeItem: jest.fn(),
    },
  };
});

jest.mock('@env', () => ({
  Env: { APP_KEY: 'test-app-key' },
}));

jest.mock('@/api/config', () => ({ getConfig: jest.fn() }));
jest.mock('@/api/satuses', () => ({
  getAllPersonnelStatuses: jest.fn(),
  getCurrentPersonStatus: jest.fn(),
}));
jest.mock('@/api/staffing', () => ({
  getAllPersonnelStaffings: jest.fn(),
  getCurrentPersonStaffing: jest.fn(),
}));
jest.mock('@/lib/auth', () => ({
  useAuthStore: { getState: jest.fn(() => ({ userId: null })) },
}));
jest.mock('@/lib/logging', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));
jest.mock('@/stores/calls/store', () => ({
  useCallsStore: {
    getState: jest.fn(() => ({ fetchCalls: jest.fn(), fetchCallPriorities: jest.fn(), calls: [], callPriorities: [] })),
  },
}));

import { getConfig } from '@/api/config';
import { getAllPersonnelStatuses } from '@/api/satuses';
import { getAllPersonnelStaffings } from '@/api/staffing';
import { useActiveCallStore } from '@/stores/calls/active-call-store';

import { useCoreStore } from '../core-store';

const emptyResponse = { Data: [], PageSize: 0, Timestamp: '', Version: '', Node: '', RequestId: '', Status: 'OK', Environment: '' };

const mockedStorage = jest.requireMock('@/lib/storage') as { zustandStorage: { setItem: jest.Mock } };
const blobs = (globalThis as unknown as { __coreRehydrationBlobs: Record<string, string> }).__coreRehydrationBlobs;

const lastWrite = (name: string) => {
  const writes = mockedStorage.zustandStorage.setItem.mock.calls.filter(([key]) => key === name);
  expect(writes.length).toBeGreaterThan(0);
  const [, written] = writes[writes.length - 1] as [string, string];
  return JSON.parse(written) as { state: Record<string, unknown>; version: number };
};

describe('core store rehydration', () => {
  it('restores persisted data but never the transient init flags', () => {
    const state = useCoreStore.getState();

    expect(state.config).toEqual({ EventingUrl: 'https://events.test' });
    expect(state.isInitialized).toBe(true);
    expect(state.isInitializing).toBe(false);
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
  });

  it('hands a version-0 active call to the active call store and drops the core copy', () => {
    const state = useCoreStore.getState() as unknown as Record<string, unknown>;

    expect(state).not.toHaveProperty('activeCall');
    expect(state).not.toHaveProperty('activeCallId');
    expect(state).not.toHaveProperty('activePriority');
    expect(useActiveCallStore.getState().activeCallId).toBe('call-1');
    expect(useActiveCallStore.getState().activeCall).toEqual({ CallId: 'call-1', Name: 'Map pin call' });

    const written = lastWrite('core-storage');
    expect(written.version).toBe(1);
    expect(written.state).not.toHaveProperty('activeCall');
    expect(written.state).not.toHaveProperty('activeCallId');
    expect(written.state).not.toHaveProperty('activePriority');
  });

  it('keeps a call already set from call detail over the legacy map-pin copy', () => {
    blobs['active-call-storage'] = JSON.stringify({ state: { activeCallId: 'call-9', activeCall: { CallId: 'call-9', Name: 'Set from call detail' } }, version: 0 });

    try {
      jest.isolateModules(() => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const isolatedActiveCallStore = require('@/stores/calls/active-call-store').useActiveCallStore as typeof useActiveCallStore;
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require('../core-store');

        expect(isolatedActiveCallStore.getState().activeCallId).toBe('call-9');
        expect(isolatedActiveCallStore.getState().activeCall?.Name).toBe('Set from call detail');
      });
    } finally {
      delete blobs['active-call-storage'];
    }
  });

  it('keeps the transient flags out of what gets written back to storage', () => {
    useCoreStore.setState({ isLoading: true, isInitializing: true, error: 'boom' });

    const persisted = lastWrite('core-storage');

    expect(persisted.state).not.toHaveProperty('isInitializing');
    expect(persisted.state).not.toHaveProperty('isLoading');
    expect(persisted.state).not.toHaveProperty('error');
    expect(persisted.state.isInitialized).toBe(true);

    useCoreStore.setState({ isLoading: false, isInitializing: false, error: null });
  });

  it('still runs init() after a kill mid-initialization instead of early-returning forever', async () => {
    (getConfig as jest.Mock).mockResolvedValue({ ...emptyResponse, Data: { EventingUrl: '' } } as never);
    (getAllPersonnelStatuses as jest.Mock).mockResolvedValue(emptyResponse as never);
    (getAllPersonnelStaffings as jest.Mock).mockResolvedValue(emptyResponse as never);

    await useCoreStore.getState().init();

    expect(getConfig).toHaveBeenCalled();
    expect(useCoreStore.getState().isInitializing).toBe(false);
    expect(useCoreStore.getState().isInitialized).toBe(true);
  });
});
