import * as Crypto from 'expo-crypto';
import * as Linking from 'expo-linking';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import { useCallback } from 'react';

import { isValidSsoUrl } from '@/hooks/use-oidc-login';
import { logger } from '@/lib/logging';
import { getItem, removeItem, setItem } from '@/lib/storage';
import useAuthStore, { PENDING_SAML_STATE_KEY } from '@/stores/auth/store';

/** MMKV key used to persist the active SAML department code across cold starts */
export const PENDING_SAML_DEPT_CODE_KEY = 'pending_saml_dept_code';

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
  idpSsoUrl: string;
  departmentCode: string;
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
 *  3. The SP ACS URL redirects to resgrid://auth/callback?saml_response=<base64>.
 *  4. The deep-link is intercepted by the app and handleDeepLink() is called.
 *  5. handleDeepLink() exchanges the SAMLResponse for a Resgrid token.
 *
 * NOTE: The backend SP ACS endpoint must redirect to
 * resgrid://auth/callback?saml_response=<base64url-encoded SAMLResponse>
 * See the implementation plan Step 8 for backend configuration.
 */
export function useSamlLogin({ idpSsoUrl, departmentCode }: UseSamlLoginOptions): UseSamlLoginResult {
  const { loginWithSso } = useAuthStore();

  const startSamlLogin = useCallback(async (): Promise<void> => {
    if (!idpSsoUrl) {
      logger.warn({ message: 'SAML: idpSsoUrl is empty, cannot start login' });
      return;
    }

    if (!isValidSsoUrl(idpSsoUrl)) {
      logger.error({ message: 'SAML: refusing to open non-HTTPS or malformed IdP SSO URL', context: { idpSsoUrl } });
      return;
    }

    const state = Crypto.randomUUID();
    await savePendingSamlState(state);

    // Persist department code so the cold-start deep-link handler can retrieve it
    await setItem<string>(PENDING_SAML_DEPT_CODE_KEY, departmentCode);

    const initiateUrl = `${idpSsoUrl}${idpSsoUrl.includes('?') ? '&' : '?'}state=${encodeURIComponent(state)}`;

    logger.info({ message: 'SAML: opening IdP SSO URL', context: { idpSsoUrl } });
    await WebBrowser.openBrowserAsync(initiateUrl);
  }, [idpSsoUrl, departmentCode]);

  const handleDeepLink = useCallback(
    async (url: string): Promise<boolean> => {
      const parsed = Linking.parse(url);
      const samlResponse = parsed.queryParams?.saml_response as string | undefined;

      if (!samlResponse) {
        logger.debug({ message: 'SAML: deep-link does not contain saml_response', context: { url } });
        return false;
      }

      const stateValid = await consumePendingSamlState(parsed.queryParams?.state as string | undefined);
      if (!stateValid) {
        await removeItem(PENDING_SAML_DEPT_CODE_KEY);
        return false;
      }

      logger.info({ message: 'SAML: received saml_response via deep-link, exchanging for Resgrid token' });

      try {
        await loginWithSso({
          provider: 'saml2',
          externalToken: samlResponse,
          departmentCode,
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
        await removeItem(PENDING_SAML_DEPT_CODE_KEY);
      }
    },
    [departmentCode, loginWithSso]
  );

  return { startSamlLogin, handleDeepLink };
}

/**
 * Standalone SAML deep-link handler for use outside of React components
 * (e.g., in the app _layout.tsx for cold-start callbacks).
 * Reads the stored department code from MMKV and calls loginWithSso directly.
 */
export async function handleSamlCallbackUrl(url: string): Promise<boolean> {
  const parsed = Linking.parse(url);
  const samlResponse = parsed.queryParams?.saml_response as string | undefined;

  if (!samlResponse) return false;

  const stateValid = await consumePendingSamlState(parsed.queryParams?.state as string | undefined);
  if (!stateValid) {
    await removeItem(PENDING_SAML_DEPT_CODE_KEY);
    return false;
  }

  const departmentCode = getItem<string>(PENDING_SAML_DEPT_CODE_KEY);
  if (!departmentCode) {
    logger.warn({ message: 'SAML cold-start: no pending department code found in storage' });
    await clearPendingSamlState();
    return false;
  }

  logger.info({ message: 'SAML cold-start: handling saml_response deep-link' });

  try {
    await useAuthStore.getState().loginWithSso({
      provider: 'saml2',
      externalToken: samlResponse,
      departmentCode,
    });
    await removeItem(PENDING_SAML_DEPT_CODE_KEY);
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
