import { cacheManager } from '@/lib/cache/cache-manager';
import { clearCacheScope, setCacheScope } from '@/lib/cache/cache-scope';
import { logger } from '@/lib/logging';

jest.mock('@/lib/storage', () => ({
  removeItem: jest.fn(),
  setItem: jest.fn(),
  getItem: jest.fn(),
  zustandStorage: {
    setItem: jest.fn(),
    getItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

jest.mock('@/lib/logging', () => ({
  logger: {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

jest.mock('@/lib/auth/utils', () => ({
  getAuth: jest.fn(),
}));

jest.mock('@/lib/auth/api', () => ({
  loginRequest: jest.fn(),
  refreshTokenRequest: jest.fn(),
  externalTokenRequest: jest.fn(),
}));

jest.mock('@/lib/env', () => ({
  Env: {
    BASE_API_URL: 'https://mock-api.com',
    API_VERSION: 'v1',
  },
}));

jest.mock('@/lib/storage/app', () => ({
  getDeviceUuid: jest.fn(),
  getBaseApiUrl: jest.fn(() => 'https://mock-api.com/api/v1'),
}));

jest.mock('@/lib/storage/clear-all-data', () => ({
  clearAllAppData: jest.fn().mockResolvedValue(undefined),
  LOGOUT_PRESERVED_STORAGE_KEYS: ['baseUrl', 'IS_FIRST_TIME'],
}));

jest.mock('@/lib/cache/cache-manager', () => ({
  cacheManager: { clear: jest.fn(), get: jest.fn() },
}));

jest.mock('@/lib/cache/cache-scope', () => ({
  setCacheScope: jest.fn(),
  clearCacheScope: jest.fn(),
}));

import useAuthStore from '../store';

const mockedCacheManager = cacheManager as jest.Mocked<typeof cacheManager>;
const mockedSetCacheScope = setCacheScope as jest.MockedFunction<typeof setCacheScope>;
const mockedClearCacheScope = clearCacheScope as jest.MockedFunction<typeof clearCacheScope>;
const mockedLogger = logger as jest.Mocked<typeof logger>;

describe('Auth Store - API cache scope', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({ userId: 'user-a' });
    jest.clearAllMocks();
  });

  it('should clear the cache and take over the scope when a new user signs in', () => {
    useAuthStore.setState({ userId: 'user-b' });

    expect(mockedCacheManager.clear).toHaveBeenCalledTimes(1);
    expect(mockedSetCacheScope).toHaveBeenCalledWith({ userId: 'user-b' });
    expect(mockedClearCacheScope).not.toHaveBeenCalled();
  });

  it('should drop the scope on sign-out', () => {
    useAuthStore.setState({ userId: null });

    expect(mockedCacheManager.clear).toHaveBeenCalledTimes(1);
    expect(mockedClearCacheScope).toHaveBeenCalledTimes(1);
    expect(mockedSetCacheScope).not.toHaveBeenCalled();
  });

  it('should do nothing while the identity is unchanged', () => {
    useAuthStore.setState({ status: 'signedIn', userId: 'user-a' });

    expect(mockedCacheManager.clear).not.toHaveBeenCalled();
    expect(mockedSetCacheScope).not.toHaveBeenCalled();
    expect(mockedClearCacheScope).not.toHaveBeenCalled();
  });

  // The leak this guards: entries the failed clear left behind are still keyed to the previous
  // user, so the scope has to move on regardless or the new session reads them back.
  it('should still hand the scope to the new user when clearing the cache throws', () => {
    const clearError = new Error('MMKV unavailable');
    mockedCacheManager.clear.mockImplementationOnce(() => {
      throw clearError;
    });

    useAuthStore.setState({ userId: 'user-b' });

    expect(mockedSetCacheScope).toHaveBeenCalledWith({ userId: 'user-b' });
    expect(mockedLogger.warn).toHaveBeenCalledWith({
      message: 'Failed to clear the API cache on identity change',
      context: { error: clearError },
    });
  });

  it('should still drop the scope on sign-out when clearing the cache throws', () => {
    mockedCacheManager.clear.mockImplementationOnce(() => {
      throw new Error('MMKV unavailable');
    });

    useAuthStore.setState({ userId: null });

    expect(mockedClearCacheScope).toHaveBeenCalledTimes(1);
  });

  it('should not break the identity change when the scope update throws', () => {
    const scopeError = new Error('scope write failed');
    mockedSetCacheScope.mockImplementationOnce(() => {
      throw scopeError;
    });

    expect(() => useAuthStore.setState({ userId: 'user-b' })).not.toThrow();

    expect(useAuthStore.getState().userId).toBe('user-b');
    expect(mockedLogger.warn).toHaveBeenCalledWith({
      message: 'Failed to reset the API cache scope on identity change',
      context: { error: scopeError },
    });
  });
});

// zustandStorage is MMKV-backed, so persist restores the saved identity synchronously inside
// create() -- before the store's own subscription exists to react to it. These tests reload the
// module in a reset registry with auth-storage already seeded, which is the only way to observe the
// scope a real cold start begins with. jest.isolateModules is deliberately not used: it keeps the
// shared mock registry, so the seeded storage never reaches the reloaded store.
describe('Auth Store - API cache scope on cold start', () => {
  interface ColdStartMocks {
    setScope: jest.Mock;
    clearScope: jest.Mock;
    cache: { get: jest.Mock; clear: jest.Mock };
    coldStartLogger: { warn: jest.Mock };
  }

  const loadStoreColdStart = (persistedAuthStorage: string | null): ColdStartMocks => {
    jest.resetModules();
    jest.doMock('@/lib/storage', () => ({
      removeItem: jest.fn(),
      setItem: jest.fn(),
      getItem: jest.fn(),
      zustandStorage: {
        setItem: jest.fn(),
        removeItem: jest.fn(),
        getItem: jest.fn((name: string) => (name === 'auth-storage' ? persistedAuthStorage : null)),
      },
    }));

    const scopeModule = require('@/lib/cache/cache-scope');
    const cacheModule = require('@/lib/cache/cache-manager');
    const loggingModule = require('@/lib/logging');

    return {
      setScope: scopeModule.setCacheScope as jest.Mock,
      clearScope: scopeModule.clearCacheScope as jest.Mock,
      cache: cacheModule.cacheManager as { get: jest.Mock; clear: jest.Mock },
      coldStartLogger: loggingModule.logger as { warn: jest.Mock },
    };
  };

  const persistedAuthStorageFor = (userId: string): string => JSON.stringify({ state: { userId, status: 'signedIn' }, version: 0 });

  afterAll(() => {
    jest.resetModules();
  });

  it('should scope the cache to the persisted user before the first cache read', () => {
    const { setScope, clearScope, cache } = loadStoreColdStart(persistedAuthStorageFor('persisted-user'));

    require('../store');

    expect(setScope).toHaveBeenCalledWith({ userId: 'persisted-user' });
    expect(clearScope).not.toHaveBeenCalled();
    // Nothing has read the cache yet, and a launch must not wipe the user's own entries.
    expect(cache.get).not.toHaveBeenCalled();
    expect(cache.clear).not.toHaveBeenCalled();

    cache.get('/units');

    expect(setScope.mock.invocationCallOrder[0]).toBeLessThan(cache.get.mock.invocationCallOrder[0]);
  });

  it('should drop the scope on a cold start with no persisted identity', () => {
    const { setScope, clearScope, cache } = loadStoreColdStart(null);

    require('../store');

    expect(clearScope).toHaveBeenCalledTimes(1);
    expect(setScope).not.toHaveBeenCalled();
    expect(cache.get).not.toHaveBeenCalled();

    cache.get('/units');

    expect(clearScope.mock.invocationCallOrder[0]).toBeLessThan(cache.get.mock.invocationCallOrder[0]);
  });

  it('should not let a failing scope write break startup', () => {
    const scopeError = new Error('scope write failed');
    const { setScope, coldStartLogger } = loadStoreColdStart(persistedAuthStorageFor('persisted-user'));
    setScope.mockImplementationOnce(() => {
      throw scopeError;
    });

    expect(() => require('../store')).not.toThrow();

    expect(coldStartLogger.warn).toHaveBeenCalledWith({
      message: 'Failed to initialize the API cache scope from the persisted identity',
      context: { error: scopeError },
    });
  });
});
