import base64 from 'react-native-base64';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { logger } from '@/lib/logging';

import { loginRequest, refreshTokenRequest } from '../../lib/auth/api';
import type { AuthResponse, AuthStatus, LoginCredentials } from '../../lib/auth/types';
import { type ProfileModel } from '../../lib/auth/types';
import { getAuth } from '../../lib/auth/utils';
import { setItem, zustandStorage } from '../../lib/storage';

export interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  refreshTokenExpiresOn: string | null;
  status: AuthStatus;
  error: string | null;
  profile: ProfileModel | null;
  userId: string | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  refreshAccessToken: () => Promise<void>;
  hydrate: () => void;
  isFirstTime: boolean;
  isAuthenticated: () => boolean;
  setIsOnboarding: () => void;
}

const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      refreshTokenExpiresOn: null,
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
            const payload = sanitizeJson(base64.decode(response.authResponse!.id_token!.split('.')[1]));

            setItem<AuthResponse>('authResponse', response.authResponse!);
            const now = new Date();
            const expiresOn = new Date(now.getTime() + response.authResponse?.expires_in! * 1000).getTime().toString();

            const profileData = JSON.parse(payload) as ProfileModel;

            set({
              accessToken: response.authResponse?.access_token,
              refreshToken: response.authResponse?.refresh_token,
              refreshTokenExpiresOn: expiresOn,
              status: 'signedIn',
              error: null,
              profile: profileData,
              userId: profileData.sub,
            });

            // Set up automatic token refresh
            //const decodedToken: { exp: number } = jwtDecode(
            //);
            //const now = new Date();
            //const expiresIn =
            //  response.authResponse?.expires_in! * 1000 - Date.now() - 60000; // Refresh 1 minute before expiry
            //const expiresOn = new Date(
            //  now.getTime() + response.authResponse?.expires_in! * 1000
            //)
            //  .getTime()
            //  .toString();

            //setTimeout(() => get().refreshAccessToken(), expiresIn);
          } else {
            set({
              status: 'error',
              error: response.message,
            });
          }
        } catch (error) {
          set({
            status: 'error',
            error: error instanceof Error ? error.message : 'Login failed',
          });
        }
      },

      logout: async () => {
        set({
          accessToken: null,
          refreshToken: null,
          status: 'signedOut',
          error: null,
          profile: null,
          isFirstTime: true,
        });
      },

      refreshAccessToken: async () => {
        try {
          const { refreshToken } = get();
          if (!refreshToken) {
            throw new Error('No refresh token available');
          }

          const response = await refreshTokenRequest(refreshToken);

          set({
            accessToken: response.access_token,
            refreshToken: response.refresh_token,
            status: 'signedIn',
            error: null,
          });

          // Set up next token refresh
          //const decodedToken: { exp: number } = jwt_decode(
          //  response.access_token
          //);
          const expiresIn = response.expires_in * 1000 - Date.now() - 60000; // Refresh 1 minute before expiry
          setTimeout(() => get().refreshAccessToken(), expiresIn);
        } catch (error) {
          // If refresh fails, log out the user
          get().logout();
        }
      },
      hydrate: () => {
        try {
          const authResponse = getAuth();
          if (authResponse !== null) {
            const payload = sanitizeJson(base64.decode(authResponse!.id_token!.split('.')[1]));

            const profileData = JSON.parse(payload) as ProfileModel;

            set({
              accessToken: authResponse.access_token,
              refreshToken: authResponse.refresh_token,
              status: 'signedIn',
              error: null,
              profile: profileData,
              userId: profileData.sub,
            });
          } else {
            get()
              .logout()
              .catch((error) => {
                logger.error({
                  message: 'Failed to logout during hydration',
                  context: { error },
                });
              });
          }
        } catch (e) {
          get()
            .logout()
            .catch((error) => {
              logger.error({
                message: 'Failed to logout during hydration',
                context: { error },
              });
            });
        }
      },
      isAuthenticated: (): boolean => {
        return get().status === 'signedIn' && get().accessToken !== null;
      },
      setIsOnboarding: () => {
        logger.info({
          message: 'Setting isOnboarding to true',
        });

        set({
          status: 'onboarding',
        });
      },
      //getRights: async () => {
      //  try {
      //    const response = await getCurrentUsersRights();

      //    set({
      //      rights: response.Data,
      //    });
      //  } catch (error) {
      //    // If refresh fails, log out the user
      //  }
      //},
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

export default useAuthStore;
