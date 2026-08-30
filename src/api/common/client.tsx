import axios, { type AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';

import { readProtectedGrantHeaders } from '@/lib/data-protection/grant-provider';
import { logger } from '@/lib/logging';
import { getBaseApiUrl } from '@/lib/storage/app';
import useAuthStore from '@/stores/auth/store';

// A hung socket on flaky cellular never rejects on its own, so every store that flips
// isLoading would spin indefinitely. Per-request overrides (uploads use 30s) still win.
const DEFAULT_REQUEST_TIMEOUT_MS = 15000;

// Create axios instance with default config
const axiosInstance: AxiosInstance = axios.create({
  baseURL: getBaseApiUrl(),
  timeout: DEFAULT_REQUEST_TIMEOUT_MS,
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
    config.baseURL = getBaseApiUrl();

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

    // Advanced Data Protection: while the member holds a live grant, every read through this
    // instance carries it, so a protected value comes back decrypted instead of REDACTED.
    //
    // Attached centrally on purpose. The alternative - each screen remembering to add the header -
    // is the failure mode that already shipped twice on the web side, and it fails SILENTLY: the
    // screen looks fine and simply shows placeholders. The grant only ever goes to Resgrid's own
    // API (this instance's baseURL), is short-lived, and is bound to this member, department and
    // policy epoch, so the server is the only thing that can act on it.
    if (config.headers) {
      for (const [name, value] of Object.entries(readProtectedGrantHeaders())) {
        config.headers.set(name, value);
      }
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
            // Mark the replay before it goes out. Without this a queued request that still
            // 401s falls back into this branch and kicks off a second full refresh cycle
            // instead of failing fast.
            (originalRequest as InternalAxiosRequestConfig & { _retry: boolean })._retry = true;
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

        // Refresh through the auth store so this shares its single-flight promise with the
        // request interceptor. Refreshing independently here raced that path over a
        // one-time-use refresh token, and the loser's invalid_grant (a permanent 400) forced
        // a logout mid-shift.
        await useAuthStore.getState().refreshAccessToken();

        const accessToken = useAuthStore.getState().accessToken;
        if (!accessToken) {
          // The store treated the failure as permanent and already signed the user out;
          // fail this request with the original 401 rather than starting a second logout.
          processQueue(error);
          return Promise.reject(error);
        }

        // Update Authorization header
        axiosInstance.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;

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
