import { Env } from '@env';
import axios from 'axios';
import queryString from 'query-string';

import { logger } from '@/lib/logging';

import { getBaseApiUrl } from '../storage/app';
import type { AuthResponse, ExternalTokenCredentials, LoginCredentials, LoginResponse } from './types';

const authApi = axios.create({
  baseURL: getBaseApiUrl(),
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
  },
});

export const loginRequest = async (credentials: LoginCredentials): Promise<LoginResponse> => {
  try {
    const data = queryString.stringify({
      grant_type: 'password',
      username: credentials.username,
      password: credentials.password,
      scope: Env.IS_MOBILE_APP ? 'openid profile offline_access mobile' : 'openid profile offline_access',
    });

    const response = await authApi.post<AuthResponse>('/connect/token', data);

    if (response.status === 200) {
      logger.info({
        message: 'Login successful',
        context: { username: credentials.username },
      });

      return {
        successful: true,
        message: 'Login successful',
        authResponse: response.data,
      };
    } else {
      logger.error({
        message: 'Login failed',
        context: { response, username: credentials.username },
      });

      return {
        successful: false,
        message: 'Login failed',
        authResponse: null,
      };
    }
  } catch (error) {
    logger.error({
      message: 'Login failed',
      context: { error, username: credentials.username },
    });
    throw error;
  }
};

export const refreshTokenRequest = async (refreshToken: string): Promise<AuthResponse> => {
  try {
    const data = queryString.stringify({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      scope: '',
    });

    const response = await authApi.post<AuthResponse>('/connect/token', data);

    logger.info({
      message: 'Token refresh successful',
    });

    return response.data;
  } catch (error) {
    logger.error({
      message: 'Token refresh failed',
      context: { error },
    });
    throw error;
  }
};

export const externalTokenRequest = async (credentials: ExternalTokenCredentials): Promise<LoginResponse> => {
  try {
    const data = queryString.stringify({
      provider: credentials.provider,
      external_token: credentials.externalToken,
      department_code: credentials.departmentCode,
      scope: Env.IS_MOBILE_APP ? 'openid email profile offline_access mobile' : 'openid email profile offline_access',
    });

    const response = await authApi.post<AuthResponse>('/connect/external-token', data);

    if (response.status === 200) {
      logger.info({
        message: 'External token exchange successful',
        context: { provider: credentials.provider, departmentCode: credentials.departmentCode },
      });

      return {
        successful: true,
        message: 'Login successful',
        authResponse: response.data,
      };
    }

    logger.error({
      message: 'External token exchange failed',
      context: { response, provider: credentials.provider },
    });

    return {
      successful: false,
      message: 'SSO login failed',
      authResponse: null,
    };
  } catch (error) {
    logger.error({
      message: 'External token exchange error',
      context: { error, provider: credentials.provider },
    });
    throw error;
  }
};
