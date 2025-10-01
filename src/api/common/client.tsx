import axios, { type AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';

import { refreshTokenRequest } from '@/lib/auth/api';
import { logger } from '@/lib/logging';
import { getBaseApiUrl } from '@/lib/storage/app';
import useAuthStore from '@/stores/auth/store';

// Create axios instance with default config
const axiosInstance: AxiosInstance = axios.create({
  baseURL: getBaseApiUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Track if we're refreshing the token
let isRefreshing = false;
// Store pending requests
let failedQueue: {
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}[] = [];

const processQueue = (error: Error | null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
    }
  });
  failedQueue = [];
};

// Helper function to determine if a refresh error is transient
const isTransientRefreshError = (error: unknown): boolean => {
  if (error instanceof Error && 'response' in error) {
    const axiosError = error as AxiosError;
    const status = axiosError.response?.status;

    // Transient errors that might resolve on retry
    return (
      status === 429 || // Rate limited
      status === 503 || // Service unavailable
      status === 502 || // Bad gateway
      status === 504 || // Gateway timeout
      !status // Network errors
    );
  }

  // Network errors or other non-HTTP errors are typically transient
  return true;
};

// Request interceptor for API calls
axiosInstance.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const authStore = useAuthStore.getState();
    const { accessToken, isAuthenticated, isAccessTokenExpiringSoon, shouldRefreshToken } = authStore;

    // Check if user is authenticated
    if (!isAuthenticated()) {
      return config;
    }

    // Check if access token is expiring soon and needs refresh (only if not already refreshing)
    if (!isRefreshing && isAccessTokenExpiringSoon() && shouldRefreshToken()) {
      logger.info({
        message: 'Access token expiring soon, refreshing before API call',
        context: { userId: authStore.userId },
      });

      // Save the current access token before attempting refresh
      const savedAccessToken = accessToken;

      try {
        await authStore.refreshAccessToken();
        // Get the updated token after refresh
        const updatedToken = useAuthStore.getState().accessToken;
        if (updatedToken && config.headers) {
          config.headers.Authorization = `Bearer ${updatedToken}`;
        }
      } catch (error) {
        logger.error({
          message: 'Failed to refresh token in request interceptor',
          context: { error: error instanceof Error ? error.message : 'Unknown error' },
        });
        // Restore the saved token so the request proceeds with the last known good bearer token
        if (savedAccessToken && config.headers) {
          config.headers.Authorization = `Bearer ${savedAccessToken}`;
        }
      }
    } else if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor for API calls
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config;
    if (!originalRequest) {
      return Promise.reject(error);
    }

    // Handle 401 errors
    if (error.response?.status === 401 && !(originalRequest as InternalAxiosRequestConfig & { _retry?: boolean })._retry) {
      const authStore = useAuthStore.getState();

      // Check if refresh token is expired
      if (authStore.isRefreshTokenExpired()) {
        logger.error({
          message: 'Refresh token expired, forcing logout',
          context: { userId: authStore.userId },
        });
        await authStore.logout('Refresh token expired');
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // If refreshing, queue the request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => {
            return axiosInstance(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      // Add _retry property to request config type
      (originalRequest as InternalAxiosRequestConfig & { _retry: boolean })._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = authStore.refreshToken;
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        const response = await refreshTokenRequest(refreshToken);
        const { access_token, refresh_token: newRefreshToken } = response;

        // Update tokens in store
        const now = Date.now();
        const currentState = useAuthStore.getState();
        useAuthStore.setState({
          accessToken: access_token,
          refreshToken: newRefreshToken || currentState.refreshToken,
          accessTokenObtainedAt: now,
          refreshTokenObtainedAt: newRefreshToken ? now : currentState.refreshTokenObtainedAt,
          status: 'signedIn',
          error: null,
        });

        // Update Authorization header
        axiosInstance.defaults.headers.common.Authorization = `Bearer ${access_token}`;
        originalRequest.headers.Authorization = `Bearer ${access_token}`;

        processQueue(null);
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError as Error);

        // Determine if the error is transient or permanent
        const isTransientError = isTransientRefreshError(refreshError);

        if (isTransientError) {
          logger.warn({
            message: 'Transient token refresh error, not logging out',
            context: {
              error: refreshError instanceof Error ? refreshError.message : 'Unknown error',
              userId: authStore.userId,
            },
          });
          // For transient errors, don't logout - let the original request fail
          return Promise.reject(refreshError);
        } else {
          logger.error({
            message: 'Permanent token refresh failure, forcing logout',
            context: {
              error: refreshError instanceof Error ? refreshError.message : 'Unknown error',
              userId: authStore.userId,
            },
          });
          await authStore.logout('Token refresh failed permanently');
          return Promise.reject(refreshError);
        }
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// Export configured axios instance
export const api = axiosInstance;

// Helper function to create API endpoints
export const createApiEndpoint = (endpoint: string) => {
  return {
    get: <T,>(params?: Record<string, unknown>, signal?: AbortSignal) => api.get<T>(endpoint, { ...(params && { params }), ...(signal && { signal }) }),
    post: <T,>(data: Record<string, unknown>, signal?: AbortSignal) => api.post<T>(endpoint, data, signal ? { signal } : {}),
    put: <T,>(data: Record<string, unknown>, signal?: AbortSignal) => api.put<T>(endpoint, data, signal ? { signal } : {}),
    delete: <T,>(params?: Record<string, unknown>, signal?: AbortSignal) => api.delete<T>(endpoint, { ...(params && { params }), ...(signal && { signal }) }),
  };
};
