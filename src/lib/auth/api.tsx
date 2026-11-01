import { Env } from '@env';
import axios from 'axios';
import queryString from 'query-string';

import { logger } from '@/lib/logging';
import { applyClientHeaders } from '@/lib/mfa/client-app';
import { type MfaChallenge, parseMethods } from '@/lib/mfa/types';

import { getBaseApiUrl } from '../storage/app';
import { classifyLoginFailure, isServerLoginReason } from './login-errors';
import type { AuthResponse, ExternalTokenCredentials, LoginCredentials, LoginResponse } from './types';

// Extract only non-sensitive fields from an axios error. Never log error.config, config.data or response bodies for the
// token endpoint - they contain credentials.
const sanitizeAuthError = (error: unknown): Record<string, unknown> => {
  const candidate = error as { isAxiosError?: boolean; message?: string; response?: { status?: number; data?: unknown }; config?: { url?: string } } | null;
  if (candidate?.isAxiosError) {
    // Keep only known OAuth diagnostics. Arbitrary response text can contain secrets.
    const data = (typeof candidate.response?.data === 'object' && candidate.response.data !== null ? candidate.response.data : {}) as Record<string, unknown>;
    const oauthErrors = ['invalid_request', 'invalid_client', 'invalid_grant', 'unauthorized_client', 'unsupported_grant_type', 'invalid_scope', 'server_error', 'temporarily_unavailable'];
    const oauthError = typeof data.error === 'string' && oauthErrors.includes(data.error) ? data.error : undefined;
    // Only a login_error the server is known to send; anything else is response text and is never logged.
    const loginError = isServerLoginReason(data.login_error) ? data.login_error : undefined;
    return {
      message: candidate.message,
      status: candidate.response?.status,
      // Strip any query string so tokens/credentials in params are never logged.
      url: candidate.config?.url?.split('?')[0],
      ...(oauthError ? { oauthError } : {}),
      ...(loginError ? { loginError } : {}),
    };
  }
  return { message: error instanceof Error ? error.message : String(error) };
};

// Without a timeout a hung socket on flaky cellular never rejects, so the login spinner
// (and every token refresh behind it) would sit there for minutes.
const AUTH_REQUEST_TIMEOUT_MS = 15000;

const authApi = axios.create({
  baseURL: getBaseApiUrl(),
  timeout: AUTH_REQUEST_TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
  },
});

authApi.interceptors.request.use((config) => {
  config.baseURL = getBaseApiUrl();
  // The app header binds a sign-in transaction and the session it creates to this app (passkey plan section 10.4).
  applyClientHeaders(config.headers);
  return config;
});

const LOGIN_SCOPE = Env.IS_MOBILE_APP ? 'openid profile offline_access mobile' : 'openid profile offline_access';

interface OAuthErrorBody {
  error?: string;
  mfa_transaction?: string;
  mfa_setup_transaction?: string;
  mfa_methods?: string;
  mfa_enrolled?: string;
  mfa_preferred?: string;
  mfa_expires_in?: number;
}

const oauthErrorBody = (error: unknown): OAuthErrorBody => {
  const data = (error as { response?: { data?: unknown } })?.response?.data;
  return typeof data === 'object' && data !== null ? (data as OAuthErrorBody) : {};
};

/** The login transaction the token endpoint started, when it started one (transaction flow on, passkey workbook section 7.1). */
export const loginTransactionFrom = (body: OAuthErrorBody, source: MfaChallenge['source']): LoginResponse['mfaTransaction'] | undefined => {
  const expiresAt = typeof body.mfa_expires_in === 'number' ? Date.now() + body.mfa_expires_in * 1000 : null;
  if (body.error === 'mfa_required' && body.mfa_transaction) {
    const methods = parseMethods(body.mfa_methods);
    const enrolled = parseMethods(body.mfa_enrolled);
    const preferred = parseMethods(body.mfa_preferred)[0] ?? null;
    return { secret: body.mfa_transaction, challenge: { kind: 'verify', methods, enrolled, preferred, expiresAt, source } };
  }
  if (body.error === 'mfa_enrollment_required' && body.mfa_setup_transaction) {
    return { secret: body.mfa_setup_transaction, challenge: { kind: 'setup', methods: ['totp'], enrolled: [], preferred: 'totp', expiresAt, source } };
  }
  return undefined;
};

export const loginRequest = async (credentials: LoginCredentials): Promise<LoginResponse> => {
  try {
    const data = queryString.stringify({
      grant_type: 'password',
      username: credentials.username,
      password: credentials.password,
      // A second factor continues on a login transaction; a server without one answers the older way (a code resent
      // with the password), which the totp_code below still serves.
      ...(credentials.otpCode ? { totp_code: credentials.otpCode.trim() } : { mfa_flow: 'transaction' }),
      scope: LOGIN_SCOPE,
    });

    const response = await authApi.post<AuthResponse>('/connect/token', data);

    if (response.status === 200) {
      logger.info({
        message: 'Login successful',
      });

      return {
        successful: true,
        message: 'Login successful',
        authResponse: response.data,
      };
    } else {
      // Only the status: the response carries the request config, and with it the password.
      logger.error({
        message: 'Login failed',
        context: { status: response.status },
      });

      return {
        successful: false,
        message: 'login_failed',
        authResponse: null,
        failure: { code: 'login_failed' },
      };
    }
  } catch (error) {
    // The OAuth error body distinguishes the 2FA challenge from a bad password. Neither the
    // password, the transaction nor any code is ever logged.
    const body = oauthErrorBody(error);
    const mfaTransaction = loginTransactionFrom(body, 'password');
    if (mfaTransaction) {
      logger.info({
        message: 'Login continues on a second-factor transaction',
        context: { kind: mfaTransaction.challenge.kind, methods: mfaTransaction.challenge.methods },
      });
      return { successful: false, message: 'Additional verification is required', authResponse: null, mfaRequired: true, mfaTransaction };
    }
    if (body.error === 'mfa_enrollment_required') {
      return { successful: false, message: 'mfa_enrollment_required', authResponse: null, enrollmentRequired: true };
    }

    const oauthError = body.error;
    if (oauthError === 'mfa_required' || oauthError === 'invalid_totp') {
      logger.info({
        message: 'Login requires two-factor code',
        context: { invalidOtp: oauthError === 'invalid_totp' },
      });

      return {
        successful: false,
        message: 'Two-factor authentication required',
        authResponse: null,
        mfaRequired: true,
        invalidOtp: oauthError === 'invalid_totp',
      };
    }

    const failure = classifyLoginFailure(error);
    logger.error({
      message: 'Login failed',
      context: { ...sanitizeAuthError(error), loginFailure: failure.code },
    });

    // Return a failed response instead of throwing; the code carries the reason the login screen explains.
    return {
      successful: false,
      message: failure.code,
      authResponse: null,
      failure,
    };
  }
};

/**
 * Exchanges a finished login transaction for tokens (passkey workbook section 7.1): the completion code is single-use,
 * bound to this transaction and app, and lives about a minute. A lost response means signing in again.
 */
export const completionGrantRequest = async (transaction: string, completionCode: string): Promise<AuthResponse> => {
  const data = queryString.stringify({
    grant_type: 'urn:resgrid:params:oauth:grant-type:mfa_completion',
    transaction,
    completion_code: completionCode,
  });
  const response = await authApi.post<AuthResponse>('/connect/token', data);
  logger.info({ message: 'Login transaction completed' });
  return response.data;
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
    // The request body holds the refresh token, so the raw error is never logged.
    logger.error({
      message: 'Token refresh failed',
      context: sanitizeAuthError(error),
    });
    throw error;
  }
};

export const externalTokenRequest = async (credentials: ExternalTokenCredentials): Promise<LoginResponse> => {
  try {
    const data = queryString.stringify({
      provider: credentials.provider,
      external_token: credentials.externalToken,
      department_token: credentials.departmentToken,
      // Accounts with Resgrid 2FA enabled must supply the current authenticator code even via SSO.
      ...(credentials.otpCode ? { totp_code: credentials.otpCode.trim() } : {}),
      scope: Env.IS_MOBILE_APP ? 'openid email profile offline_access mobile' : 'openid email profile offline_access',
    });

    const response = await authApi.post<AuthResponse>('/connect/external-token', data);

    if (response.status === 200) {
      logger.info({
        message: 'External token exchange successful',
        context: { provider: credentials.provider },
      });

      return {
        successful: true,
        message: 'Login successful',
        authResponse: response.data,
      };
    }

    // Only the status: the response carries the request config, and with it the IdP token.
    logger.error({
      message: 'External token exchange failed',
      context: { status: response.status, provider: credentials.provider },
    });

    return {
      successful: false,
      message: 'SSO login failed',
      authResponse: null,
    };
  } catch (error) {
    // The error body distinguishes the 2FA challenge from a real failure. Neither the IdP
    // token nor any code is ever logged.
    const oauthError = (error as { response?: { data?: { error?: string } } })?.response?.data?.error;
    if (oauthError === 'mfa_required' || oauthError === 'invalid_totp') {
      logger.info({
        message: 'SSO login requires two-factor code',
        context: { provider: credentials.provider, invalidOtp: oauthError === 'invalid_totp' },
      });

      return {
        successful: false,
        message: 'Two-factor authentication required',
        authResponse: null,
        mfaRequired: true,
        invalidOtp: oauthError === 'invalid_totp',
      };
    }

    logger.error({
      message: 'External token exchange error',
      context: { ...sanitizeAuthError(error), provider: credentials.provider },
    });
    throw error;
  }
};
