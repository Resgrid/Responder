import { logger } from '@/lib/logging';
import { removeItem } from '@/lib/storage';

// Mock the storage module first
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

// Mock the logger
jest.mock('@/lib/logging', () => ({
  logger: {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

// Mock auth utils
jest.mock('@/lib/auth/utils', () => ({
  getAuth: jest.fn(),
}));

// Mock the API module
jest.mock('@/lib/auth/api', () => ({
  loginRequest: jest.fn(),
  refreshTokenRequest: jest.fn(),
}));

// Mock environment
jest.mock('@/lib/env', () => ({
  Env: {
    BASE_API_URL: 'https://mock-api.com',
    API_VERSION: 'v1',
  },
}));

// Mock app storage
jest.mock('@/lib/storage/app', () => ({
  getDeviceUuid: jest.fn(),
  getBaseApiUrl: jest.fn(() => 'https://mock-api.com/api/v1'),
}));

jest.mock('@/lib/storage/clear-all-data', () => ({
  clearAllAppData: jest.fn().mockResolvedValue(undefined),
  LOGOUT_PRESERVED_STORAGE_KEYS: ['baseUrl', 'IS_FIRST_TIME'],
}));

import * as SecureStore from 'expo-secure-store';

import { _clearSignOutHooks, registerSignOutHook } from '@/lib/auth/sign-out-hooks';
import { clearAllAppData } from '@/lib/storage/clear-all-data';
import useAuthStore from '../store';

const mockedRemoveItem = removeItem as jest.MockedFunction<typeof removeItem>;
const mockedLogger = logger as jest.Mocked<typeof logger>;
const mockedClearAllAppData = clearAllAppData as jest.MockedFunction<typeof clearAllAppData>;

describe('Auth Store - Logout Functionality', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the store state
    useAuthStore.setState({
      accessToken: 'test-token',
      refreshToken: 'test-refresh',
      accessTokenObtainedAt: Date.now() - 30 * 60 * 1000, // 30 minutes ago
      refreshTokenObtainedAt: Date.now() - 30 * 60 * 1000,
      status: 'signedIn',
      error: null,
      profile: { sub: 'test-user', name: 'Test User' } as any,
      isFirstTime: false,
      userId: 'test-user',
    });
  });

  describe('logout', () => {
    it('should clear authResponse from storage and reset auth state', async () => {
      await useAuthStore.getState().logout();

      // Verify authResponse was removed from storage
      expect(mockedRemoveItem).toHaveBeenCalledWith('authResponse');

      expect(mockedClearAllAppData).toHaveBeenCalledWith({
        resetStores: true,
        clearStorage: true,
        clearFilters: true,
        clearSecure: false,
        preserveStorageKeys: ['baseUrl', 'IS_FIRST_TIME'],
      });

      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('pending_saml_state');

      // Verify auth state was reset
      const state = useAuthStore.getState();
      expect(state.accessToken).toBeNull();
      expect(state.refreshToken).toBeNull();
      expect(state.accessTokenObtainedAt).toBeNull();
      expect(state.refreshTokenObtainedAt).toBeNull();
      expect(state.status).toBe('signedOut');
      expect(state.error).toBeNull();
      expect(state.profile).toBeNull();
      expect(state.isFirstTime).toBe(false);
      expect(state.userId).toBeNull();
    });

    it('runs the sign-out hooks first, with the session still signed in and its token, before any data is cleared', async () => {
      const seen: { token: string | null; status: string; cleared: boolean }[] = [];
      registerSignOutHook(async (token) => {
        seen.push({ token, status: useAuthStore.getState().status, cleared: mockedClearAllAppData.mock.calls.length > 0 });
      });

      await useAuthStore.getState().logout();

      expect(seen).toEqual([{ token: 'test-token', status: 'signedIn', cleared: false }]);
      expect(useAuthStore.getState().accessToken).toBeNull();
      _clearSignOutHooks();
    });

    it('still signs out when a sign-out hook fails', async () => {
      registerSignOutHook(async () => {
        throw new Error('server unreachable');
      });

      await useAuthStore.getState().logout();

      expect(useAuthStore.getState().status).toBe('signedOut');
      expect(mockedClearAllAppData).toHaveBeenCalled();
      _clearSignOutHooks();
    });

    it('should log warning if removeItem fails but still reset auth state', async () => {
      const mockError = new Error('Storage error');
      mockedRemoveItem.mockRejectedValueOnce(mockError);

      await useAuthStore.getState().logout();

      // Verify warning was logged
      expect(mockedLogger.warn).toHaveBeenCalledWith({
        message: 'Failed to remove authResponse from storage during logout',
        context: { error: mockError, reason: undefined },
      });

      // Verify auth state was still reset
      const state = useAuthStore.getState();
      expect(state.accessToken).toBeNull();
      expect(state.status).toBe('signedOut');
    });

    it('should log warning if clearAllAppData fails but still reset auth state', async () => {
      const mockError = new Error('Cleanup error');
      mockedClearAllAppData.mockRejectedValueOnce(mockError);

      await useAuthStore.getState().logout();

      expect(mockedLogger.warn).toHaveBeenCalledWith({
        message: 'Failed to clear app data during logout',
        context: { error: mockError, reason: undefined },
      });

      const state = useAuthStore.getState();
      expect(state.accessToken).toBeNull();
      expect(state.status).toBe('signedOut');
    });

    it('should log forced logout with reason', async () => {
      const logoutReason = 'Token refresh failed';

      await useAuthStore.getState().logout(logoutReason);

      // Verify error was logged for forced logout
      expect(mockedLogger.error).toHaveBeenCalledWith({
        message: 'User forced to logout due to authentication issue',
        context: {
          userId: 'test-user',
          reason: logoutReason,
          accessTokenObtainedAt: expect.any(Number),
          refreshTokenObtainedAt: expect.any(Number),
          timestamp: expect.any(Number),
        },
      });
    });

    it('should log voluntary logout without reason', async () => {
      await useAuthStore.getState().logout();

      // Verify info was logged for voluntary logout
      expect(mockedLogger.info).toHaveBeenCalledWith({
        message: 'User logged out voluntarily',
        context: {
          userId: 'test-user',
          timestamp: expect.any(Number),
        },
      });
    });
  });
});
