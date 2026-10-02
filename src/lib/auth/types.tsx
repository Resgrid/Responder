import type { MfaChallenge } from '@/lib/mfa/types';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export type SsoProvider = 'oidc' | 'saml2';

export interface ExternalTokenCredentials {
  provider: SsoProvider;
  externalToken: string;
  /**
   * The department, as the system-encrypted token SSO discovery returns (or the SAML relay's callback carries). The
   * server reads this or a department code, never a username.
   */
  departmentToken: string;
  /** Current authenticator (TOTP) code; required when the account has 2FA enabled. */
  otpCode?: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
  /** Current authenticator (TOTP) code; required when the account has 2FA enabled. */
  otpCode?: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  id_token: string;
  expires_in: number;
  token_type: string;
  expiration_date: string;
  obtained_at?: number; // Unix timestamp when token was obtained
}

export interface LoginResponse {
  successful: boolean;
  message: string;
  authResponse: AuthResponse | null;
  /** The server requires a TOTP code for this account (error mfa_required / invalid_totp). */
  mfaRequired?: boolean;
  /** A code was supplied but rejected (error invalid_totp). */
  invalidOtp?: boolean;
  /**
   * The sign-in continues on a login transaction (passkey plan section 7.5): the password was right and a second factor,
   * or setting one up, finishes it. The secret is the only authority for that; it is held in memory and never logged.
   */
  mfaTransaction?: { secret: string; challenge: MfaChallenge };
  /** The department requires MFA the account does not have, and this server cannot set it up in the app. */
  enrollmentRequired?: boolean;
}
export interface ProfileModel {
  sub: string;
  jti: string;
  useage: string;
  at_hash: string;
  nbf: number;
  exp: number;
  iat: number;
  iss: string;
  name: string;
  oi_au_id: string;
  oi_tkn_id: string;
}

export type AuthStatus = 'idle' | 'signedIn' | 'signedOut' | 'loading' | 'error' | 'onboarding' | 'mfaRequired';
