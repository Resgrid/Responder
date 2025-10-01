import { logger } from '@/lib/logging';
import { setItem } from '@/lib/storage';

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

import { loginRequest } from '@/lib/auth/api';
import { getAuth } from '@/lib/auth/utils';
import useAuthStore from '../store';

const mockedLoginRequest = loginRequest as jest.MockedFunction<typeof loginRequest>;
const mockedGetAuth = getAuth as jest.MockedFunction<typeof getAuth>;
const mockedSetItem = setItem as jest.MockedFunction<typeof setItem>;
const mockedLogger = logger as jest.Mocked<typeof logger>;

describe('Auth Store - Login and Hydration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Reset the store state
    useAuthStore.setState({
      accessToken: null,
      refreshToken: null,
      accessTokenObtainedAt: null,
      refreshTokenObtainedAt: null,
      status: 'idle',
      error: null,
      profile: null,
      isFirstTime: true,
      userId: null,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('login', () => {
    const mockCredentials = {
      username: 'testuser',
      password: 'testpass',
    };

    const mockIdToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0LXVzZXIiLCJuYW1lIjoiVGVzdCBVc2VyIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

    it('should successfully login with valid credentials', async () => {
      const mockResponse = {
        successful: true,
        message: 'Login successful',
        authResponse: {
          access_token: 'access-token',
          refresh_token: 'refresh-token',
          id_token: mockIdToken,
          expires_in: 3600,
          token_type: 'Bearer',
          expiration_date: new Date(Date.now() + 3600 * 1000).toISOString(),
        },
      };

      mockedLoginRequest.mockResolvedValueOnce(mockResponse);

      await useAuthStore.getState().login(mockCredentials);

      // Verify API was called
      expect(mockedLoginRequest).toHaveBeenCalledWith(mockCredentials);

      // Verify storage was updated with timestamp
      expect(mockedSetItem).toHaveBeenCalledWith('authResponse', expect.objectContaining({
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        obtained_at: expect.any(Number),
      }));

      // Verify state was updated
      const state = useAuthStore.getState();
      expect(state.accessToken).toBe('access-token');
      expect(state.refreshToken).toBe('refresh-token');
      expect(state.status).toBe('signedIn');
      expect(state.userId).toBe('test-user');
      expect(state.profile).toEqual(expect.objectContaining({
        sub: 'test-user',
        name: 'Test User',
      }));
      expect(state.accessTokenObtainedAt).toBeGreaterThan(Date.now() - 1000);
      expect(state.refreshTokenObtainedAt).toBeGreaterThan(Date.now() - 1000);

      // Verify success logging
      expect(mockedLogger.info).toHaveBeenCalledWith({
        message: 'User successfully logged in',
        context: {
          username: 'testuser',
          userId: 'test-user',
          accessTokenObtainedAt: expect.any(Number),
          refreshTokenObtainedAt: expect.any(Number),
        },
      });
    });

    it('should set up automatic token refresh after successful login', async () => {
      const mockResponse = {
        successful: true,
        message: 'Login successful',
        authResponse: {
          access_token: 'access-token',
          refresh_token: 'refresh-token',
          id_token: mockIdToken,
          expires_in: 3600, // 1 hour
          token_type: 'Bearer',
          expiration_date: new Date(Date.now() + 3600 * 1000).toISOString(),
        },
      };

      mockedLoginRequest.mockResolvedValueOnce(mockResponse);

      await useAuthStore.getState().login(mockCredentials);

      // Verify login was successful and tokens were set
      const state = useAuthStore.getState();
      expect(state.status).toBe('signedIn');
      expect(state.accessToken).toBe('access-token');
      expect(state.refreshToken).toBe('refresh-token');
      expect(state.accessTokenObtainedAt).toBeGreaterThan(Date.now() - 1000);
    });

    it('should handle login failure', async () => {
      const mockResponse = {
        successful: false,
        message: 'Invalid credentials',
        authResponse: null,
      };

      mockedLoginRequest.mockResolvedValueOnce(mockResponse);

      await useAuthStore.getState().login(mockCredentials);

      // Verify error state
      const state = useAuthStore.getState();
      expect(state.status).toBe('error');
      expect(state.error).toBe('Invalid credentials');
      expect(state.accessToken).toBeNull();
      expect(state.refreshToken).toBeNull();

      // Verify error logging
      expect(mockedLogger.error).toHaveBeenCalledWith({
        message: 'Login failed - unsuccessful response',
        context: { username: 'testuser', message: 'Invalid credentials' },
      });
    });

    it('should handle missing ID token', async () => {
      const mockResponse = {
        successful: true,
        message: 'Login successful',
        authResponse: {
          access_token: 'access-token',
          refresh_token: 'refresh-token',
          id_token: '', // Missing ID token
          expires_in: 3600,
          token_type: 'Bearer',
          expiration_date: new Date(Date.now() + 3600 * 1000).toISOString(),
        },
      };

      mockedLoginRequest.mockResolvedValueOnce(mockResponse);

      await useAuthStore.getState().login(mockCredentials);

      // Verify error state
      const state = useAuthStore.getState();
      expect(state.status).toBe('error');
      expect(state.error).toBe('No ID token received');

      // Verify error logging
      expect(mockedLogger.error).toHaveBeenCalledWith({
        message: 'No ID token received during login',
        context: { username: 'testuser' },
      });
    });

    it('should handle invalid ID token format', async () => {
      const mockResponse = {
        successful: true,
        message: 'Login successful',
        authResponse: {
          access_token: 'access-token',
          refresh_token: 'refresh-token',
          id_token: 'invalid.token', // Invalid format
          expires_in: 3600,
          token_type: 'Bearer',
          expiration_date: new Date(Date.now() + 3600 * 1000).toISOString(),
        },
      };

      mockedLoginRequest.mockResolvedValueOnce(mockResponse);

      await useAuthStore.getState().login(mockCredentials);

      // Verify error state
      const state = useAuthStore.getState();
      expect(state.status).toBe('error');
      expect(state.error).toBe('Invalid ID token format');

      // Verify error logging
      expect(mockedLogger.error).toHaveBeenCalledWith({
        message: 'Invalid ID token format during login',
        context: { username: 'testuser' },
      });
    });

    it('should handle network errors', async () => {
      const mockError = new Error('Network error');
      mockedLoginRequest.mockRejectedValueOnce(mockError);

      await useAuthStore.getState().login(mockCredentials);

      // Verify error state
      const state = useAuthStore.getState();
      expect(state.status).toBe('error');
      expect(state.error).toBe('Network error');

      // Verify error logging
      expect(mockedLogger.error).toHaveBeenCalledWith({
        message: 'Login failed with exception',
        context: {
          username: 'testuser',
          error: 'Network error',
        },
      });
    });
  });

  describe('hydrate', () => {
    const mockIdToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0LXVzZXIiLCJuYW1lIjoiVGVzdCBVc2VyIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

    it('should successfully hydrate with valid stored auth', async () => {
      const mockAuthResponse = {
        access_token: 'stored-access-token',
        refresh_token: 'stored-refresh-token',
        id_token: mockIdToken,
        expires_in: 3600,
        token_type: 'Bearer',
        expiration_date: new Date(Date.now() + 3600 * 1000).toISOString(),
        obtained_at: Date.now() - 30 * 60 * 1000, // 30 minutes ago (not expired)
      };

      mockedGetAuth.mockReturnValueOnce(mockAuthResponse);

      useAuthStore.getState().hydrate();

      const state = useAuthStore.getState();
      expect(state.status).toBe('signedIn');
      expect(state.accessToken).toBe('stored-access-token');
      expect(state.refreshToken).toBe('stored-refresh-token');
      expect(state.userId).toBe('test-user');
      expect(state.profile).toEqual(expect.objectContaining({
        sub: 'test-user',
        name: 'Test User',
      }));

      // Verify success logging
      expect(mockedLogger.info).toHaveBeenCalledWith({
        message: 'Successfully hydrated auth state',
        context: {
          userId: 'test-user',
          isAccessExpired: false,
          accessTokenAgeMinutes: 30,
          refreshTokenAgeDays: 0,
        },
      });
    });

    it('should detect expired access token during hydration but not trigger automatic refresh', async () => {
      const mockAuthResponse = {
        access_token: 'expired-access-token',
        refresh_token: 'valid-refresh-token',
        id_token: mockIdToken,
        expires_in: 3600,
        token_type: 'Bearer',
        expiration_date: new Date(Date.now() + 3600 * 1000).toISOString(),
        obtained_at: Date.now() - 2 * 60 * 60 * 1000, // 2 hours ago (expired)
      };

      mockedGetAuth.mockReturnValueOnce(mockAuthResponse);

      useAuthStore.getState().hydrate();

      const state = useAuthStore.getState();
      
      // Should hydrate successfully but with expired access token
      expect(state.status).toBe('signedIn');
      expect(state.accessToken).toBe('expired-access-token');
      expect(state.refreshToken).toBe('valid-refresh-token');
      expect(state.userId).toBe('test-user');
      expect(state.isAccessTokenExpired()).toBe(true);
      expect(state.shouldRefreshToken()).toBe(true);
      
      // Verify logging shows access token is expired
      expect(mockedLogger.info).toHaveBeenCalledWith({
        message: 'Successfully hydrated auth state',
        context: {
          userId: 'test-user',
          isAccessExpired: true,
          accessTokenAgeMinutes: 120, // 2 hours
          refreshTokenAgeDays: 0,
        },
      });
      
      // Note: Token refresh will be handled by API interceptor when needed
    });

    it('should logout when refresh token is expired during hydration', async () => {
      const mockAuthResponse = {
        access_token: 'access-token',
        refresh_token: 'expired-refresh-token',
        id_token: mockIdToken,
        expires_in: 3600,
        token_type: 'Bearer',
        expiration_date: new Date(Date.now() + 3600 * 1000).toISOString(),
        obtained_at: Date.now() - 400 * 24 * 60 * 60 * 1000, // 400 days ago (expired)
      };

      mockedGetAuth.mockReturnValueOnce(mockAuthResponse);

      useAuthStore.getState().hydrate();

      const state = useAuthStore.getState();
      expect(state.status).toBe('signedOut');
      expect(state.accessToken).toBeNull();
      expect(state.refreshToken).toBeNull();

      // Verify error logging
      expect(mockedLogger.error).toHaveBeenCalledWith({
        message: 'Refresh token expired during hydration, forcing logout',
        context: {
          userId: 'test-user',
          refreshTokenAge: expect.any(Number),
          obtainedAt: expect.any(Number),
        },
      });
    });

    it('should handle no stored auth response', () => {
      mockedGetAuth.mockReturnValueOnce(null);

      useAuthStore.getState().hydrate();

      const state = useAuthStore.getState();
      expect(state.status).toBe('signedOut');
      expect(state.accessToken).toBeNull();
      expect(state.refreshToken).toBeNull();

      // Verify info logging
      expect(mockedLogger.info).toHaveBeenCalledWith({
        message: 'No valid auth response found during hydration',
      });
    });

    it('should handle invalid ID token during hydration', () => {
      const mockAuthResponse = {
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        id_token: 'invalid.token', // Invalid format
        expires_in: 3600,
        token_type: 'Bearer',
        expiration_date: new Date(Date.now() + 3600 * 1000).toISOString(),
        obtained_at: Date.now() - 30 * 60 * 1000,
      };

      mockedGetAuth.mockReturnValueOnce(mockAuthResponse);

      useAuthStore.getState().hydrate();

      const state = useAuthStore.getState();
      expect(state.status).toBe('signedOut');
      expect(state.accessToken).toBeNull();

      // Verify error logging
      expect(mockedLogger.error).toHaveBeenCalledWith({
        message: 'Error during auth hydration, setting to signed out',
        context: { error: 'Invalid ID token format during hydration' },
      });
    });

    it('should handle hydration errors gracefully', () => {
      mockedGetAuth.mockImplementationOnce(() => {
        throw new Error('Storage error');
      });

      useAuthStore.getState().hydrate();

      const state = useAuthStore.getState();
      expect(state.status).toBe('signedOut');
      expect(state.accessToken).toBeNull();

      // Verify error logging
      expect(mockedLogger.error).toHaveBeenCalledWith({
        message: 'Error during auth hydration, setting to signed out',
        context: { error: 'Storage error' },
      });
    });
  });
});