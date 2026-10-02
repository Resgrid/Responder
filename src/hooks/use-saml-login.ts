import * as Crypto from 'expo-crypto';
import * as Linking from 'expo-linking';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import { useCallback } from 'react';

import { isValidSsoUrl } from '@/hooks/use-oidc-login';
import { logger } from '@/lib/logging';
import { RESGRID_CLIENT } from '@/lib/mfa/client-app';
import { getItem, removeItem, setItem } from '@/lib/storage';
import useAuthStore, { PENDING_SAML_STATE_KEY } from '@/stores/auth/store';

/** MMKV key holding discovery's department token across a cold start, for a relay callback that carries none */
export const PENDING_SAML_DEPT_TOKEN_KEY = 'pending_saml_dept_token';

const PENDING_SAML_STATE_TTL_MS = 10 * 60 * 1000;

interface PendingSamlState {
  state: string;
  createdAt: number;
}

export async function clearPendingSamlState(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(PENDING_SAML_STATE_KEY);
  } catch (error) {
    logger.warn({
      message: 'SAML: failed to clear pending state',
      context: { error: error instanceof Error ? error.message : String(error) },
    });
  }
}

const savePendingSamlState = async (state: string): Promise<void> => {
  const payload: PendingSamlState = { state, createdAt: Date.now() };
  await SecureStore.setItemAsync(PENDING_SAML_STATE_KEY, JSON.stringify(payload));
};

const consumePendingSamlState = async (callbackState?: string): Promise<boolean> => {
  let raw: string | null = null;
  try {
    raw = await SecureStore.getItemAsync(PENDING_SAML_STATE_KEY);
  } catch (error) {
    logger.error({
      message: 'SAML: failed to read pending state',
      context: { error: error instanceof Error ? error.message : String(error) },
    });
    return false;
  }

  if (!raw) {
    logger.warn({ message: 'SAML: no pending login state, ignoring deep-link' });
    return false;
  }

  let pending: PendingSamlState;
  try {
    pending = JSON.parse(raw) as PendingSamlState;
  } catch {
    logger.warn({ message: 'SAML: pending login state is malformed, clearing' });
    await clearPendingSamlState();
    return false;
  }

  if (!pending.state || typeof pending.createdAt !== 'number') {
    logger.warn({ message: 'SAML: pending login state is malformed, clearing' });
    await clearPendingSamlState();
    return false;
  }

  if (Date.now() - pending.createdAt > PENDING_SAML_STATE_TTL_MS) {
    logger.warn({ message: 'SAML: pending login state expired, ignoring deep-link' });
    await clearPendingSamlState();
    return false;
  }

  if (!callbackState || callbackState !== pending.state) {
    logger.warn({ message: 'SAML: callback state missing or mismatched, ignoring deep-link' });
    await clearPendingSamlState();
    return false;
  }

  return true;
};

export interface UseSamlLoginOptions {
  /** The server's SAML start page (discovery's SamlLoginUrl), which sends the browser on to the department's IdP. */
  signInUrl: string;
  /** Discovery's department token; the relay's callback normally carries its own. */
  departmentToken: string;
}

export interface UseSamlLoginResult {
  startSamlLogin: () => Promise<void>;
  handleDeepLink: (url: string) => Promise<boolean>;
}

/**
 * Hook that drives the SAML 2.0 IdP-initiated login flow.
 *
 * Flow:
 *  1. Call startSamlLogin() to open the IdP SSO URL in a browser.
 *  2. The IdP POSTs a SAMLResponse to the SP ACS URL.
 *  3. The SP ACS URL redirects to resgrid://auth/callback?saml_response=<relay token>&relay_state=<our RelayState>.
 *  4. The deep-link is intercepted by the app and handleDeepLink() is called.
 *  5. handleDeepLink() exchanges the SAMLResponse for a Resgrid token.
 *
 * NOTE: The backend relay (connect/saml-mobile-callback) returns to the app named in the RelayState (responder.<nonce>)
 * and echoes it as relay_state; a callback whose relay_state is not our pending one is refused (login CSRF).
 */
export function useSamlLogin({ signInUrl, departmentToken }: UseSamlLoginOptions): UseSamlLoginResult {
  const { loginWithSso } = useAuthStore();

  const startSamlLogin = useCallback(async (): Promise<void> => {
    if (!signInUrl) {
      logger.warn({ message: 'SAML: no sign-in page, cannot start login' });
      return;
    }

    if (!isValidSsoUrl(signInUrl)) {
      logger.error({ message: 'SAML: refusing to open a non-HTTPS or malformed sign-in page' });
      return;
    }

    // One-time RelayState, tagged with this app's name: every app shares one ACS URL, so the server's relay returns to the
    // app named here and echoes the whole value back as relay_state. IdPs round-trip RelayState, not arbitrary params.
    const state = `${RESGRID_CLIENT}.${Crypto.randomUUID()}`;
    await savePendingSamlState(state);

    // Keep discovery's department token for a cold-start callback that carries none
    await setItem<string>(PENDING_SAML_DEPT_TOKEN_KEY, departmentToken);

    const initiateUrl = `${signInUrl}${signInUrl.includes('?') ? '&' : '?'}RelayState=${encodeURIComponent(state)}`;

    logger.info({ message: 'SAML: opening the sign-in page' });
    await WebBrowser.openBrowserAsync(initiateUrl);
  }, [signInUrl, departmentToken]);

  const handleDeepLink = useCallback(
    async (url: string): Promise<boolean> => {
      const parsed = Linking.parse(url);
      const samlResponse = parsed.queryParams?.saml_response as string | undefined;

      if (!samlResponse) {
        logger.debug({ message: 'SAML: deep-link does not contain saml_response', context: { url } });
        return false;
      }

      const stateValid = await consumePendingSamlState(parsed.queryParams?.relay_state as string | undefined);
      if (!stateValid) {
        await removeItem(PENDING_SAML_DEPT_TOKEN_KEY);
        return false;
      }

      logger.info({ message: 'SAML: received saml_response via deep-link, exchanging for Resgrid token' });

      try {
        await loginWithSso({
          provider: 'saml2',
          externalToken: samlResponse,
          departmentToken: callbackDepartmentToken(parsed.queryParams?.department_token) ?? departmentToken,
        });
        return true;
      } catch (error) {
        logger.error({
          message: 'SAML: token exchange failed',
          context: { error: error instanceof Error ? error.message : String(error) },
        });
        return false;
      } finally {
        await clearPendingSamlState();
        await removeItem(PENDING_SAML_DEPT_TOKEN_KEY);
      }
    },
    [departmentToken, loginWithSso]
  );

  return { startSamlLogin, handleDeepLink };
}

/** The department token the relay put on its callback (connect/saml-mobile-callback always sends one). */
const callbackDepartmentToken = (value: unknown): string | null => (typeof value === 'string' && value.length > 0 ? value : null);

/**
 * Standalone SAML deep-link handler for use outside of React components
 * (e.g., in the app _layout.tsx for cold-start callbacks).
 * Uses the relay callback's department token, or the one stored at launch, and calls loginWithSso directly.
 */
export async function handleSamlCallbackUrl(url: string): Promise<boolean> {
  const parsed = Linking.parse(url);
  const samlResponse = parsed.queryParams?.saml_response as string | undefined;

  if (!samlResponse) return false;

  const stateValid = await consumePendingSamlState(parsed.queryParams?.relay_state as string | undefined);
  if (!stateValid) {
    await removeItem(PENDING_SAML_DEPT_TOKEN_KEY);
    return false;
  }

  const departmentToken = callbackDepartmentToken(parsed.queryParams?.department_token) ?? getItem<string>(PENDING_SAML_DEPT_TOKEN_KEY);
  if (!departmentToken) {
    logger.warn({ message: 'SAML cold-start: no department token on the callback or in storage' });
    await clearPendingSamlState();
    return false;
  }

  logger.info({ message: 'SAML cold-start: handling saml_response deep-link' });

  try {
    await useAuthStore.getState().loginWithSso({
      provider: 'saml2',
      externalToken: samlResponse,
      departmentToken,
    });
    await removeItem(PENDING_SAML_DEPT_TOKEN_KEY);
    return true;
  } catch (error) {
    logger.error({
      message: 'SAML cold-start: token exchange failed',
      context: { error: error instanceof Error ? error.message : String(error) },
    });
    return false;
  } finally {
    await clearPendingSamlState();
  }
}
