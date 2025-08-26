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
      status: 'signedIn',
      error: null,
      profile: { sub: 'test-user' } as any,
      isFirstTime: false,
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
      expect(state.status).toBe('signedOut');
      expect(state.error).toBeNull();
      expect(state.profile).toBeNull();
      expect(state.isFirstTime).toBe(true);
    });

    it('should log warning if removeItem fails but still reset auth state', async () => {
      const mockError = new Error('Storage error');
      mockedRemoveItem.mockRejectedValueOnce(mockError);

      await useAuthStore.getState().logout();

      // Verify warning was logged
      expect(mockedLogger.warn).toHaveBeenCalledWith({
        message: 'Failed to remove authResponse from storage during logout',
        context: { error: mockError },
      });

      // Verify auth state was still reset
      const state = useAuthStore.getState();
      expect(state.accessToken).toBeNull();
      expect(state.status).toBe('signedOut');
    });
  });


});
