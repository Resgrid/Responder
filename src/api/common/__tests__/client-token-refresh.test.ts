import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';

import { refreshTokenRequest } from '@/lib/auth/api';
import { logger } from '@/lib/logging';
import useAuthStore from '@/stores/auth/store';

import { api } from '../client';

// Mock dependencies
jest.mock('@/lib/auth/api');
jest.mock('@/lib/logging');
jest.mock('@/lib/storage/app', () => ({
  getBaseApiUrl: () => 'https://api.test.com',
}));

const mockedRefreshTokenRequest = refreshTokenRequest as jest.MockedFunction<typeof refreshTokenRequest>;
const mockedLogger = logger as jest.Mocked<typeof logger>;

describe('API Client - Token Refresh', () => {
  let mockAxios: MockAdapter;

  beforeEach(() => {
    mockAxios = new MockAdapter(api);
    jest.clearAllMocks();
    
    // Reset auth store
    useAuthStore.setState({
      accessToken: null,
      refreshToken: null,
      accessTokenObtainedAt: null,
      refreshTokenObtainedAt: null,
      status: 'signedOut',
      error: null,
      profile: null,
      userId: null,
      isFirstTime: true,
    });
  });

  afterEach(() => {
    mockAxios.restore();
  });

  describe('Request Interceptor - Proactive Token Refresh', () => {
    it('should refresh token before API call when access token is expiring soon', async () => {
      const now = Date.now();
      const expiringSoonTokenObtainedAt = now - (3600 * 1000 - 4 * 60 * 1000); // 56 minutes ago (expires in 4 minutes)

      // Set up auth store with expiring token
      useAuthStore.setState({
        accessToken: 'expiring-token',
        refreshToken: 'valid-refresh-token',
        accessTokenObtainedAt: expiringSoonTokenObtainedAt,
        refreshTokenObtainedAt: now - 1000,
        status: 'signedIn',
        profile: { sub: 'test-user' } as any,
        userId: 'test-user',
      });

      // Mock successful refresh
      mockedRefreshTokenRequest.mockResolvedValueOnce({
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        id_token: 'new-id-token',
        expires_in: 3600,
        token_type: 'Bearer',
        expiration_date: new Date(Date.now() + 3600 * 1000).toISOString(),
      });

      // Mock the API endpoint
      mockAxios.onGet('/test-endpoint').reply(200, { success: true });

      // Make API call
      const response = await api.get('/test-endpoint');

      // Verify refresh was called
      expect(mockedRefreshTokenRequest).toHaveBeenCalledWith('valid-refresh-token');
      
      // Verify token was updated in store
      const authState = useAuthStore.getState();
      expect(authState.accessToken).toBe('new-access-token');
      expect(authState.refreshToken).toBe('new-refresh-token');

      // Verify API call succeeded
      expect(response.status).toBe(200);
      expect(response.data).toEqual({ success: true });

      // Verify logging
      expect(mockedLogger.info).toHaveBeenCalledWith({
        message: 'Access token expiring soon, refreshing before API call',
        context: { userId: 'test-user' },
      });
    });

    it('should not refresh token when access token is still valid', async () => {
      const now = Date.now();
      const recentTokenObtainedAt = now - 30 * 60 * 1000; // 30 minutes ago

      // Set up auth store with valid token
      useAuthStore.setState({
        accessToken: 'valid-token',
        refreshToken: 'valid-refresh-token',
        accessTokenObtainedAt: recentTokenObtainedAt,
        refreshTokenObtainedAt: now - 1000,
        status: 'signedIn',
        profile: { sub: 'test-user' } as any,
        userId: 'test-user',
      });

      // Mock the API endpoint
      mockAxios.onGet('/test-endpoint').reply(200, { success: true });

      // Make API call
      await api.get('/test-endpoint');

      // Verify refresh was NOT called
      expect(mockedRefreshTokenRequest).not.toHaveBeenCalled();
      
      // Verify token was not changed
      const authState = useAuthStore.getState();
      expect(authState.accessToken).toBe('valid-token');
    });

    it('should logout when refresh fails in request interceptor', async () => {
      const now = Date.now();
      const expiringSoonTokenObtainedAt = now - (3600 * 1000 - 4 * 60 * 1000);

      // Set up auth store with expiring token
      useAuthStore.setState({
        accessToken: 'expiring-token',
        refreshToken: 'valid-refresh-token',
        accessTokenObtainedAt: expiringSoonTokenObtainedAt,
        refreshTokenObtainedAt: now - 1000,
        status: 'signedIn',
        profile: { sub: 'test-user' } as any,
        userId: 'test-user',
      });

      // Mock failed refresh
      mockedRefreshTokenRequest.mockRejectedValueOnce(new Error('Refresh failed'));

      // Mock the API endpoint to succeed
      mockAxios.onGet('/test-endpoint').reply(200, { success: true });

      // Make API call
      const response = await api.get('/test-endpoint');

      // Verify refresh was attempted in request interceptor
      expect(mockedRefreshTokenRequest).toHaveBeenCalledWith('valid-refresh-token');
      
      // When refresh fails, user should be logged out automatically
      const authState = useAuthStore.getState();
      expect(authState.status).toBe('signedOut');
      expect(authState.accessToken).toBe(null);
      expect(authState.refreshToken).toBe(null);
      
      // Verify the API call still succeeded with the original (expired) token
      expect(response.status).toBe(200);
      expect(response.data).toEqual({ success: true });
    });
  });

  describe('Response Interceptor - 401 Error Handling', () => {
    it('should handle transient refresh errors without logging out', async () => {
      // Set up authenticated state
      useAuthStore.setState({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        accessTokenObtainedAt: Date.now() - 1000,
        refreshTokenObtainedAt: Date.now() - 1000,
        status: 'signedIn',
        profile: { sub: 'test-user' } as any,
        userId: 'test-user',
      });

      // Mock 401 response
      mockAxios.onGet('/test-endpoint').reply(401, { error: 'Unauthorized' });

      // Mock transient refresh error (503 Service Unavailable)
      const transientError = new Error('Service Unavailable') as any;
      transientError.response = { status: 503 };
      mockedRefreshTokenRequest.mockRejectedValueOnce(transientError);

      // Make API call
      try {
        await api.get('/test-endpoint');
      } catch (error) {
        // Expected to fail
      }

      // Verify user was NOT logged out
      const authState = useAuthStore.getState();
      expect(authState.status).toBe('signedIn');
      expect(authState.accessToken).toBe('access-token');

      // Verify warning was logged
      expect(mockedLogger.warn).toHaveBeenCalledWith({
        message: 'Transient token refresh error, not logging out',
        context: {
          error: 'Service Unavailable',
          userId: 'test-user',
        },
      });
    });

    it('should logout on permanent refresh errors', async () => {
      // Set up authenticated state
      useAuthStore.setState({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        accessTokenObtainedAt: Date.now() - 1000,
        refreshTokenObtainedAt: Date.now() - 1000,
        status: 'signedIn',
        profile: { sub: 'test-user' } as any,
        userId: 'test-user',
      });

      // Mock 401 response
      mockAxios.onGet('/test-endpoint').reply(401, { error: 'Unauthorized' });

      // Mock permanent refresh error (400 Bad Request)
      const permanentError = new Error('Invalid refresh token') as any;
      permanentError.response = { status: 400 };
      mockedRefreshTokenRequest.mockRejectedValueOnce(permanentError);

      // Make API call
      try {
        await api.get('/test-endpoint');
      } catch (error) {
        // Expected to fail
      }

      // Verify user was logged out
      const authState = useAuthStore.getState();
      expect(authState.status).toBe('signedOut');
      expect(authState.accessToken).toBe(null);

      // Verify error was logged
      expect(mockedLogger.error).toHaveBeenCalledWith({
        message: 'Permanent token refresh failure, forcing logout',
        context: {
          error: 'Invalid refresh token',
          userId: 'test-user',
        },
      });
    });

    it('should logout when refresh token is expired', async () => {
      const now = Date.now();
      const expiredRefreshTokenObtainedAt = now - (366 * 24 * 60 * 60 * 1000); // Over 1 year ago

      // Set up state with expired refresh token
      useAuthStore.setState({
        accessToken: 'access-token',
        refreshToken: 'expired-refresh-token',
        accessTokenObtainedAt: now - 1000,
        refreshTokenObtainedAt: expiredRefreshTokenObtainedAt,
        status: 'signedIn',
        profile: { sub: 'test-user' } as any,
        userId: 'test-user',
      });

      // Mock 401 response
      mockAxios.onGet('/test-endpoint').reply(401, { error: 'Unauthorized' });

      // Make API call
      try {
        await api.get('/test-endpoint');
      } catch (error) {
        // Expected to fail
      }

      // Verify user was logged out
      const authState = useAuthStore.getState();
      expect(authState.status).toBe('signedOut');
      expect(authState.accessToken).toBe(null);

      // Verify refresh was NOT attempted
      expect(mockedRefreshTokenRequest).not.toHaveBeenCalled();

      // Verify logging
      expect(mockedLogger.error).toHaveBeenCalledWith({
        message: 'Refresh token expired, forcing logout',
        context: { userId: 'test-user' },
      });
    });

    it('should successfully refresh token and retry original request', async () => {
      // Set up authenticated state
      useAuthStore.setState({
        accessToken: 'old-access-token',
        refreshToken: 'valid-refresh-token',
        accessTokenObtainedAt: Date.now() - 1000,
        refreshTokenObtainedAt: Date.now() - 1000,
        status: 'signedIn',
        profile: { sub: 'test-user' } as any,
        userId: 'test-user',
      });

      // Mock 401 response first, then success with new token
      mockAxios
        .onGet('/test-endpoint')
        .replyOnce(401, { error: 'Unauthorized' })
        .onGet('/test-endpoint')
        .reply(200, { success: true });

      // Mock successful refresh
      mockedRefreshTokenRequest.mockResolvedValueOnce({
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        id_token: 'new-id-token',
        expires_in: 3600,
        token_type: 'Bearer',
        expiration_date: new Date(Date.now() + 3600 * 1000).toISOString(),
      });

      // Make API call
      const response = await api.get('/test-endpoint');

      // Verify refresh was called
      expect(mockedRefreshTokenRequest).toHaveBeenCalledWith('valid-refresh-token');
      
      // Verify tokens were updated
      const authState = useAuthStore.getState();
      expect(authState.accessToken).toBe('new-access-token');
      expect(authState.refreshToken).toBe('new-refresh-token');
      expect(authState.status).toBe('signedIn');

      // Verify original request succeeded
      expect(response.status).toBe(200);
      expect(response.data).toEqual({ success: true });

      // Verify two requests were made (original + retry)
      expect(mockAxios.history.get).toHaveLength(2);
    });
  });

  describe('Token Expiry Helper Methods', () => {
    it('should correctly identify expiring soon tokens', () => {
      const now = Date.now();
      const expiringSoonTokenObtainedAt = now - (3600 * 1000 - 4 * 60 * 1000); // 4 minutes until expiry

      useAuthStore.setState({
        accessToken: 'token',
        refreshToken: 'refresh-token',
        accessTokenObtainedAt: expiringSoonTokenObtainedAt,
        refreshTokenObtainedAt: now - 1000,
        status: 'signedIn',
        profile: { sub: 'test-user' } as any,
        userId: 'test-user',
      });

      const authState = useAuthStore.getState();
      expect(authState.isAccessTokenExpiringSoon()).toBe(true);
      expect(authState.shouldRefreshToken()).toBe(true);
    });

    it('should correctly identify valid tokens', () => {
      const now = Date.now();
      const recentTokenObtainedAt = now - 30 * 60 * 1000; // 30 minutes ago

      useAuthStore.setState({
        accessToken: 'token',
        refreshToken: 'refresh-token',
        accessTokenObtainedAt: recentTokenObtainedAt,
        refreshTokenObtainedAt: now - 1000,
        status: 'signedIn',
        profile: { sub: 'test-user' } as any,
        userId: 'test-user',
      });

      const authState = useAuthStore.getState();
      expect(authState.isAccessTokenExpiringSoon()).toBe(false);
      expect(authState.shouldRefreshToken()).toBe(false);
    });
  });
});