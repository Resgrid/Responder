import { describe, expect, it, jest } from '@jest/globals';

// The mocked storage has to be built inside the factory: the store under test is imported (and
// therefore rehydrated) before any module-scope const in this file is initialized.
jest.mock('@/lib/storage', () => {
  // A session that was killed part-way through init() left `isInitializing: true` behind.
  const persistedBlob = JSON.stringify({
    state: {
      isInitializing: true,
      isLoading: true,
      error: 'Failed to init core app data',
      isInitialized: true,
      config: { EventingUrl: 'https://events.test' },
      activeCallId: 'call-1',
    },
    version: 0,
  });

  return {
    zustandStorage: {
      getItem: jest.fn(() => persistedBlob),
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
jest.mock('@/lib/storage/app', () => ({ setActiveCallId: jest.fn() }));
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

import { useCoreStore } from '../core-store';

const emptyResponse = { Data: [], PageSize: 0, Timestamp: '', Version: '', Node: '', RequestId: '', Status: 'OK', Environment: '' };

const mockedStorage = jest.requireMock('@/lib/storage') as { zustandStorage: { setItem: jest.Mock } };

describe('core store rehydration', () => {
  it('restores persisted data but never the transient init flags', () => {
    const state = useCoreStore.getState();

    expect(state.activeCallId).toBe('call-1');
    expect(state.isInitialized).toBe(true);
    expect(state.isInitializing).toBe(false);
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
  });

  it('keeps the transient flags out of what gets written back to storage', () => {
    useCoreStore.setState({ isLoading: true, isInitializing: true, error: 'boom' });

    const calls = mockedStorage.zustandStorage.setItem.mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    const [, written] = calls[calls.length - 1] as [string, string];
    const persisted = JSON.parse(written) as { state: Record<string, unknown> };

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
