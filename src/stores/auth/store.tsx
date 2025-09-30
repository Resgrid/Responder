import base64 from 'react-native-base64';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { logger } from '@/lib/logging';

import { loginRequest, refreshTokenRequest } from '../../lib/auth/api';
import type { AuthResponse, AuthStatus, LoginCredentials } from '../../lib/auth/types';
import { type ProfileModel } from '../../lib/auth/types';
import { getAuth } from '../../lib/auth/utils';
import { removeItem, setItem, zustandStorage } from '../../lib/storage';

interface AuthState {
  // Tokens
  accessToken: string | null;
  refreshToken: string | null;
  accessTokenObtainedAt: number | null;
  refreshTokenObtainedAt: number | null;
  status: AuthStatus;
  error: string | null;
  profile: ProfileModel | null;
  userId: string | null;
  isFirstTime: boolean;

  // Actions
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: (reason?: string) => Promise<void>;
  refreshAccessToken: () => Promise<void>;
  hydrate: () => void;
  setIsOnboarding: () => void;

  // Computed properties
  isAuthenticated: () => boolean;
  isAccessTokenExpired: () => boolean;
  isAccessTokenExpiringSoon: () => boolean;
  isRefreshTokenExpired: () => boolean;
  shouldRefreshToken: () => boolean;
}

const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      accessTokenObtainedAt: null,
      refreshTokenObtainedAt: null,
      status: 'idle',
      error: null,
      profile: null,
      userId: null,
      isFirstTime: true,
      login: async (credentials: LoginCredentials) => {
        try {
          set({ status: 'loading' });
          const response = await loginRequest(credentials);

          if (response.successful) {
            const idToken = response.authResponse?.id_token;
            if (!idToken) {
              logger.error({
                message: 'No ID token received during login',
                context: { username: credentials.username },
              });
              throw new Error('No ID token received');
            }
            const tokenParts = idToken.split('.');
            if (tokenParts.length < 3 || !tokenParts[1]) {
              logger.error({
                message: 'Invalid ID token format during login',
                context: { username: credentials.username },
              });
              throw new Error('Invalid ID token format');
            }
            const payload = sanitizeJson(decodeJwtPayload(tokenParts[1]));

            const now = Date.now();
            const authResponseWithTimestamp = {
              ...response.authResponse!,
              obtained_at: now,
            };

            setItem<AuthResponse>('authResponse', authResponseWithTimestamp);

            const profileData = JSON.parse(payload) as ProfileModel;

            set({
              accessToken: response.authResponse?.access_token ?? null,
              refreshToken: response.authResponse?.refresh_token ?? null,
              accessTokenObtainedAt: now,
              refreshTokenObtainedAt: now,
              status: 'signedIn',
              error: null,
              profile: profileData,
              userId: profileData.sub,
            });

            logger.info({
              message: 'User successfully logged in',
              context: {
                username: credentials.username,
                userId: profileData.sub,
                accessTokenObtainedAt: now,
                refreshTokenObtainedAt: now,
              },
            });
          } else {
            logger.error({
              message: 'Login failed - unsuccessful response',
              context: { username: credentials.username, message: response.message },
            });
            set({
              status: 'error',
              error: response.message,
            });
          }
        } catch (error) {
          logger.error({
            message: 'Login failed with exception',
            context: {
              username: credentials.username,
              error: error instanceof Error ? error.message : 'Unknown error',
            },
          });
          set({
            status: 'error',
            error: error instanceof Error ? error.message : 'Login failed',
          });
        }
      },

      logout: async (reason?: string) => {
        const currentState = get();
        const wasAuthenticated = currentState.isAuthenticated();

        // Log forced logout for previously authenticated users
        if (wasAuthenticated && reason) {
          logger.error({
            message: 'User forced to logout due to authentication issue',
            context: {
              userId: currentState.userId,
              reason,
              accessTokenObtainedAt: currentState.accessTokenObtainedAt,
              refreshTokenObtainedAt: currentState.refreshTokenObtainedAt,
              timestamp: Date.now(),
            },
          });
        } else if (wasAuthenticated) {
          logger.info({
            message: 'User logged out voluntarily',
            context: {
              userId: currentState.userId,
              timestamp: Date.now(),
            },
          });
        }

        // Clear persisted authResponse to prevent re-hydration of signed-in session
        try {
          await removeItem('authResponse');
        } catch (error) {
          logger.warn({
            message: 'Failed to remove authResponse from storage during logout',
            context: { error, reason },
          });
        }

        set({
          accessToken: null,
          refreshToken: null,
          accessTokenObtainedAt: null,
          refreshTokenObtainedAt: null,
          status: 'signedOut',
          error: null,
          profile: null,
          isFirstTime: true,
          userId: null,
        });
      },

      refreshAccessToken: async () => {
        try {
          const currentState = get();
          const { refreshToken, userId } = currentState;

          if (!refreshToken) {
            logger.error({
              message: 'No refresh token available for token refresh',
              context: { userId },
            });
            await get().logout('No refresh token available');
            return;
          }

          // Check if refresh token is expired
          if (currentState.isRefreshTokenExpired()) {
            logger.error({
              message: 'Refresh token expired, forcing logout',
              context: {
                userId,
                refreshTokenObtainedAt: currentState.refreshTokenObtainedAt,
                currentTime: Date.now(),
              },
            });
            await get().logout('Refresh token expired');
            return;
          }

          logger.info({
            message: 'Attempting to refresh access token',
            context: { userId },
          });

          const response = await refreshTokenRequest(refreshToken);
          const now = Date.now();

          // Update stored auth response with new tokens
          const updatedAuthResponse: AuthResponse = {
            access_token: response.access_token,
            refresh_token: response.refresh_token,
            id_token: response.id_token,
            expires_in: response.expires_in,
            token_type: response.token_type,
            expiration_date: new Date(now + response.expires_in * 1000).toISOString(),
            obtained_at: now,
          };

          setItem<AuthResponse>('authResponse', updatedAuthResponse);

          set({
            accessToken: response.access_token,
            refreshToken: response.refresh_token,
            accessTokenObtainedAt: now,
            refreshTokenObtainedAt: now,
            status: 'signedIn',
            error: null,
          });

          logger.info({
            message: 'Successfully refreshed access token',
            context: {
              userId,
              newAccessTokenObtainedAt: now,
            },
          });
        } catch (error) {
          const currentState = get();
          logger.error({
            message: 'Failed to refresh access token, forcing logout',
            context: {
              userId: currentState.userId,
              error: error instanceof Error ? error.message : 'Unknown error',
            },
          });
          // If refresh fails, log out the user
          await get().logout('Token refresh failed');
        }
      },
      hydrate: () => {
        try {
          logger.info({
            message: 'Hydrating auth state',
          });

          const authResponse = getAuth();
          if (authResponse !== null && authResponse.id_token) {
            const tokenParts = authResponse.id_token.split('.');
            if (tokenParts.length < 3 || !tokenParts[1]) {
              logger.error({
                message: 'Invalid ID token format during hydration',
              });
              throw new Error('Invalid ID token format during hydration');
            }
            const payload = sanitizeJson(decodeJwtPayload(tokenParts[1]));
            const profileData = JSON.parse(payload) as ProfileModel;

            const now = Date.now();
            const obtainedAt = authResponse.obtained_at || now;
            const accessTokenAge = now - obtainedAt;
            const accessTokenExpiryTime = (authResponse.expires_in || 3600) * 1000;

            // Check if access token is expired
            const isAccessExpired = accessTokenAge >= accessTokenExpiryTime;

            // Estimate refresh token expiry (1 year from obtained_at)
            const refreshTokenAge = now - obtainedAt;
            const refreshTokenExpiryTime = 365 * 24 * 60 * 60 * 1000; // 1 year
            const isRefreshExpired = refreshTokenAge >= refreshTokenExpiryTime;

            if (isRefreshExpired) {
              logger.error({
                message: 'Refresh token expired during hydration, forcing logout',
                context: {
                  userId: profileData.sub,
                  refreshTokenAge: refreshTokenAge / (24 * 60 * 60 * 1000), // days
                  obtainedAt,
                },
              });
              set({
                accessToken: null,
                refreshToken: null,
                accessTokenObtainedAt: null,
                refreshTokenObtainedAt: null,
                status: 'signedOut',
                error: null,
                profile: null,
                isFirstTime: true,
                userId: null,
              });
              return;
            }

            set({
              accessToken: authResponse.access_token,
              refreshToken: authResponse.refresh_token,
              accessTokenObtainedAt: obtainedAt,
              refreshTokenObtainedAt: obtainedAt,
              status: 'signedIn',
              error: null,
              profile: profileData,
              userId: profileData.sub,
            });

            logger.info({
              message: 'Successfully hydrated auth state',
              context: {
                userId: profileData.sub,
                isAccessExpired,
                accessTokenAgeMinutes: Math.floor(accessTokenAge / (60 * 1000)),
                refreshTokenAgeDays: Math.floor(refreshTokenAge / (24 * 60 * 60 * 1000)),
              },
            });

            // Note: Token refresh will be handled by API interceptor when needed
          } else {
            logger.info({
              message: 'No valid auth response found during hydration',
            });
            set({
              accessToken: null,
              refreshToken: null,
              accessTokenObtainedAt: null,
              refreshTokenObtainedAt: null,
              status: 'signedOut',
              error: null,
              profile: null,
              isFirstTime: true,
              userId: null,
            });
          }
        } catch (e) {
          logger.error({
            message: 'Error during auth hydration, setting to signed out',
            context: { error: e instanceof Error ? e.message : 'Unknown error' },
          });
          set({
            accessToken: null,
            refreshToken: null,
            accessTokenObtainedAt: null,
            refreshTokenObtainedAt: null,
            status: 'signedOut',
            error: null,
            profile: null,
            isFirstTime: true,
            userId: null,
          });
        }
      },
      isAuthenticated: (): boolean => {
        const state = get();
        return state.status === 'signedIn' && state.accessToken !== null && state.refreshToken !== null && !state.isRefreshTokenExpired();
      },
      setIsOnboarding: () => {
        logger.info({
          message: 'Setting isOnboarding to true',
        });

        set({
          status: 'onboarding',
        });
      },
      isAccessTokenExpired: (): boolean => {
        const state = get();
        if (!state.accessTokenObtainedAt || !state.accessToken) {
          return true;
        }

        const now = Date.now();
        const tokenAge = now - state.accessTokenObtainedAt;
        const expiryTime = 3600 * 1000; // 1 hour in milliseconds (default)

        return tokenAge >= expiryTime;
      },
      isAccessTokenExpiringSoon: (): boolean => {
        const state = get();
        if (!state.accessTokenObtainedAt || !state.accessToken) {
          return true;
        }

        const now = Date.now();
        const tokenAge = now - state.accessTokenObtainedAt;
        const expiryTime = 3600 * 1000; // 1 hour in milliseconds (default)
        const bufferTime = 5 * 60 * 1000; // 5 minutes buffer

        return tokenAge >= expiryTime - bufferTime;
      },
      isRefreshTokenExpired: (): boolean => {
        const state = get();
        if (!state.refreshTokenObtainedAt || !state.refreshToken) {
          return true;
        }

        const now = Date.now();
        const tokenAge = now - state.refreshTokenObtainedAt;
        const expiryTime = 365 * 24 * 60 * 60 * 1000; // 1 year in milliseconds

        return tokenAge >= expiryTime;
      },
      shouldRefreshToken: (): boolean => {
        const state = get();
        if (!state.accessToken || !state.refreshToken) {
          return false;
        }

        // Refresh if access token is expiring soon or expired but refresh token is still valid
        return (state.isAccessTokenExpiringSoon() || state.isAccessTokenExpired()) && !state.isRefreshTokenExpired();
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => zustandStorage),
    }
  )
);

const sanitizeJson = (json: string) => {
  return json.replace(/[\u0000]+/g, '');
};

const decodeJwtPayload = (tokenPayload: string): string => {
  // Convert base64url to base64 by replacing URL-safe characters
  let base64Str = tokenPayload.replace(/-/g, '+').replace(/_/g, '/');

  // Add padding if needed (base64url removes padding)
  const padding = base64Str.length % 4;
  if (padding) {
    base64Str += '='.repeat(4 - padding);
  }

  return base64.decode(base64Str);
};

export default useAuthStore;
