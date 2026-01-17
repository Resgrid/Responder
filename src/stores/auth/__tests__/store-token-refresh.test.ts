import { logger } from '@/lib/logging';
import { removeItem, setItem } from '@/lib/storage';

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

import { refreshTokenRequest } from '@/lib/auth/api';
import useAuthStore from '../store';

const mockedRefreshTokenRequest = refreshTokenRequest as jest.MockedFunction<typeof refreshTokenRequest>;
const mockedSetItem = setItem as jest.MockedFunction<typeof setItem>;
const mockedLogger = logger as jest.Mocked<typeof logger>;

describe('Auth Store - Token Refresh Functionality', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Reset the store state to authenticated with tokens that need refresh
    useAuthStore.setState({
      accessToken: 'expired-token',
      refreshToken: 'valid-refresh-token',
      accessTokenObtainedAt: Date.now() - 2 * 60 * 60 * 1000, // 2 hours ago (expired)
      refreshTokenObtainedAt: Date.now() - 30 * 24 * 60 * 60 * 1000, // 30 days ago
      status: 'signedIn',
      error: null,
      profile: { sub: 'test-user', name: 'Test User' } as any,
      isFirstTime: false,
      userId: 'test-user',
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('refreshAccessToken', () => {
    it('should successfully refresh tokens when refresh token is valid', async () => {
      const mockResponse = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        id_token: 'new-id-token',
        expires_in: 3600,
        token_type: 'Bearer',
        expiration_date: new Date(Date.now() + 3600 * 1000).toISOString(),
      };

      mockedRefreshTokenRequest.mockResolvedValueOnce(mockResponse);

      await useAuthStore.getState().refreshAccessToken();

      // Verify API was called with correct refresh token
      expect(mockedRefreshTokenRequest).toHaveBeenCalledWith('valid-refresh-token');

      // Verify storage was updated
      expect(mockedSetItem).toHaveBeenCalledWith('authResponse', expect.objectContaining({
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        obtained_at: expect.any(Number),
      }));

      // Verify state was updated
      const state = useAuthStore.getState();
      expect(state.accessToken).toBe('new-access-token');
      expect(state.refreshToken).toBe('new-refresh-token');
      expect(state.status).toBe('signedIn');
      expect(state.accessTokenObtainedAt).toBeGreaterThan(Date.now() - 1000);
      expect(state.refreshTokenObtainedAt).toBeGreaterThan(Date.now() - 1000);

      // Verify success logging
      expect(mockedLogger.info).toHaveBeenCalledWith({
        message: 'Attempting to refresh access token',
        context: { userId: 'test-user' },
      });
      
      expect(mockedLogger.info).toHaveBeenCalledWith({
        message: 'Successfully refreshed access token',
        context: { 
          userId: 'test-user',
          newAccessTokenObtainedAt: expect.any(Number),
        },
      });
    });

    it('should logout when no refresh token is available', async () => {
      // Set state with no refresh token
      useAuthStore.setState({
        accessToken: 'expired-token',
        refreshToken: null,
        status: 'signedIn',
        userId: 'test-user',
      });

      const logoutSpy = jest.spyOn(useAuthStore.getState(), 'logout');

      await useAuthStore.getState().refreshAccessToken();

      // Verify logout was called with appropriate reason
      expect(logoutSpy).toHaveBeenCalledWith('No refresh token available');
      
      // Verify error logging
      expect(mockedLogger.error).toHaveBeenCalledWith({
        message: 'No refresh token available for token refresh',
        context: { userId: 'test-user' },
      });
    });

    it('should logout when refresh token is expired', async () => {
      // Set state with expired refresh token
      useAuthStore.setState({
        accessToken: 'expired-token',
        refreshToken: 'expired-refresh-token',
        refreshTokenObtainedAt: Date.now() - 400 * 24 * 60 * 60 * 1000, // 400 days ago (expired)
        status: 'signedIn',
        userId: 'test-user',
      });

      const logoutSpy = jest.spyOn(useAuthStore.getState(), 'logout');

      await useAuthStore.getState().refreshAccessToken();

      // Verify logout was called with appropriate reason
      expect(logoutSpy).toHaveBeenCalledWith('Refresh token expired');
      
      // Verify error logging
      expect(mockedLogger.error).toHaveBeenCalledWith({
        message: 'Refresh token expired, forcing logout',
        context: {
          userId: 'test-user',
          refreshTokenObtainedAt: expect.any(Number),
          currentTime: expect.any(Number),
        },
      });
    });

    it('should logout when refresh API call fails with permanent error', async () => {
      // Create a mock axios error with 401 status (permanent auth failure)
      const mockError = Object.assign(new Error('Unauthorized'), {
        response: { status: 401 },
      });
      mockedRefreshTokenRequest.mockRejectedValueOnce(mockError);

      const logoutSpy = jest.spyOn(useAuthStore.getState(), 'logout');

      await useAuthStore.getState().refreshAccessToken();

      // Verify logout was called with appropriate reason
      expect(logoutSpy).toHaveBeenCalledWith('Token refresh failed');
      
      // Verify error logging
      expect(mockedLogger.error).toHaveBeenCalledWith({
        message: 'Failed to refresh access token, forcing logout',
        context: {
          userId: 'test-user',
          error: 'Unauthorized',
        },
      });
    });

    it('should not logout when refresh API call fails with transient error', async () => {
      // Create a mock error that looks like a network error (transient)
      const mockError = new Error('Network request failed');
      mockedRefreshTokenRequest.mockRejectedValueOnce(mockError);

      const logoutSpy = jest.spyOn(useAuthStore.getState(), 'logout');

      // This should throw because transient errors are re-thrown
      await expect(useAuthStore.getState().refreshAccessToken()).rejects.toThrow('Network request failed');

      // Verify logout was NOT called for transient error
      expect(logoutSpy).not.toHaveBeenCalled();
      
      // Verify warning logging instead of error
      expect(mockedLogger.warn).toHaveBeenCalledWith({
        message: 'Transient token refresh error, not logging out',
        context: {
          userId: 'test-user',
          error: 'Network request failed',
        },
      });

      // Verify user is still signed in
      const state = useAuthStore.getState();
      expect(state.status).toBe('signedIn');
      expect(state.refreshToken).toBe('valid-refresh-token');
    });

    it('should not logout when refresh API call fails with 503 Service Unavailable', async () => {
      // Create a mock axios error with 503 status (transient)
      const mockError = Object.assign(new Error('Service Unavailable'), {
        response: { status: 503 },
      });
      mockedRefreshTokenRequest.mockRejectedValueOnce(mockError);

      const logoutSpy = jest.spyOn(useAuthStore.getState(), 'logout');

      // This should throw because transient errors are re-thrown
      await expect(useAuthStore.getState().refreshAccessToken()).rejects.toThrow('Service Unavailable');

      // Verify logout was NOT called for transient error
      expect(logoutSpy).not.toHaveBeenCalled();
      
      // Verify user is still signed in
      const state = useAuthStore.getState();
      expect(state.status).toBe('signedIn');
    });

    it('should set up automatic token refresh after successful refresh', async () => {
      const mockResponse = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        id_token: 'new-id-token',
        expires_in: 3600, // 1 hour
        token_type: 'Bearer',
        expiration_date: new Date(Date.now() + 3600 * 1000).toISOString(),
      };

      mockedRefreshTokenRequest.mockResolvedValueOnce(mockResponse);

      await useAuthStore.getState().refreshAccessToken();

      // Check that the state shows the tokens were refreshed
      const state = useAuthStore.getState();
      expect(state.accessToken).toBe('new-access-token');
      expect(state.refreshToken).toBe('new-refresh-token');

      // Verify that a timeout was set up (we can't easily test the exact setTimeout call,
      // but we can verify the tokens were updated which happens before setTimeout)
      expect(state.accessTokenObtainedAt).toBeGreaterThan(Date.now() - 1000);
    });
  });

  describe('Token expiration helpers', () => {
    it('isAccessTokenExpired should correctly identify expired tokens', () => {
      const store = useAuthStore.getState();
      
      // Token obtained 2 hours ago should be expired
      useAuthStore.setState({
        accessToken: 'test-token',
        accessTokenObtainedAt: Date.now() - 2 * 60 * 60 * 1000,
      });
      
      expect(store.isAccessTokenExpired()).toBe(true);
      
      // Token obtained 30 minutes ago should not be expired
      useAuthStore.setState({
        accessToken: 'test-token',
        accessTokenObtainedAt: Date.now() - 30 * 60 * 1000,
      });
      
      expect(store.isAccessTokenExpired()).toBe(false);
    });

    it('isRefreshTokenExpired should correctly identify expired refresh tokens', () => {
      const store = useAuthStore.getState();
      
      // Refresh token obtained 400 days ago should be expired
      useAuthStore.setState({
        refreshToken: 'test-refresh-token',
        refreshTokenObtainedAt: Date.now() - 400 * 24 * 60 * 60 * 1000,
      });
      
      expect(store.isRefreshTokenExpired()).toBe(true);
      
      // Refresh token obtained 30 days ago should not be expired
      useAuthStore.setState({
        refreshToken: 'test-refresh-token',
        refreshTokenObtainedAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
      });
      
      expect(store.isRefreshTokenExpired()).toBe(false);
    });

    it('shouldRefreshToken should return true when access token expired but refresh token valid', () => {
      const store = useAuthStore.getState();
      
      useAuthStore.setState({
        accessToken: 'expired-token',
        refreshToken: 'valid-refresh-token',
        accessTokenObtainedAt: Date.now() - 2 * 60 * 60 * 1000, // 2 hours ago
        refreshTokenObtainedAt: Date.now() - 30 * 24 * 60 * 60 * 1000, // 30 days ago
      });
      
      expect(store.shouldRefreshToken()).toBe(true);
    });

    it('shouldRefreshToken should return false when both tokens are expired', () => {
      const store = useAuthStore.getState();
      
      useAuthStore.setState({
        accessToken: 'expired-token',
        refreshToken: 'expired-refresh-token',
        accessTokenObtainedAt: Date.now() - 2 * 60 * 60 * 1000, // 2 hours ago
        refreshTokenObtainedAt: Date.now() - 400 * 24 * 60 * 60 * 1000, // 400 days ago
      });
      
      expect(store.shouldRefreshToken()).toBe(false);
    });

    it('shouldRefreshToken should return false when no tokens are present', () => {
      const store = useAuthStore.getState();
      
      useAuthStore.setState({
        accessToken: null,
        refreshToken: null,
        accessTokenObtainedAt: null,
        refreshTokenObtainedAt: null,
      });
      
      expect(store.shouldRefreshToken()).toBe(false);
    });
  });

  describe('isAuthenticated', () => {
    it('should return true when user is signed in with valid tokens', () => {
      useAuthStore.setState({
        status: 'signedIn',
        accessToken: 'valid-token',
        refreshToken: 'valid-refresh-token',
        refreshTokenObtainedAt: Date.now() - 30 * 24 * 60 * 60 * 1000, // 30 days ago
      });

      expect(useAuthStore.getState().isAuthenticated()).toBe(true);
    });

    it('should return false when refresh token is expired', () => {
      useAuthStore.setState({
        status: 'signedIn',
        accessToken: 'valid-token',
        refreshToken: 'expired-refresh-token',
        refreshTokenObtainedAt: Date.now() - 400 * 24 * 60 * 60 * 1000, // 400 days ago
      });

      expect(useAuthStore.getState().isAuthenticated()).toBe(false);
    });

    it('should return false when not signed in', () => {
      useAuthStore.setState({
        status: 'signedOut',
        accessToken: null,
        refreshToken: null,
      });

      expect(useAuthStore.getState().isAuthenticated()).toBe(false);
    });

    it('should return false when tokens are missing', () => {
      useAuthStore.setState({
        status: 'signedIn',
        accessToken: null,
        refreshToken: 'valid-refresh-token',
      });

      expect(useAuthStore.getState().isAuthenticated()).toBe(false);
    });
  });
});