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

import useAuthStore from '../store';

const mockedRemoveItem = removeItem as jest.MockedFunction<typeof removeItem>;
const mockedLogger = logger as jest.Mocked<typeof logger>;

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

      // Verify auth state was reset
      const state = useAuthStore.getState();
      expect(state.accessToken).toBeNull();
      expect(state.refreshToken).toBeNull();
      expect(state.accessTokenObtainedAt).toBeNull();
      expect(state.refreshTokenObtainedAt).toBeNull();
      expect(state.status).toBe('signedOut');
      expect(state.error).toBeNull();
      expect(state.profile).toBeNull();
      expect(state.isFirstTime).toBe(true);
      expect(state.userId).toBeNull();
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
