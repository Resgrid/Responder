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
  cacheManager: { clear: jest.fn() },
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
