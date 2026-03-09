import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { useCallback } from 'react';

import { logger } from '@/lib/logging';
import useAuthStore from '@/stores/auth/store';

// Required for iOS / Android to close the in-app browser after redirect
WebBrowser.maybeCompleteAuthSession();

export interface UseOidcLoginOptions {
  authority: string;
  clientId: string;
  departmentCode: string;
}

export interface UseOidcLoginResult {
  request: AuthSession.AuthRequest | null;
  response: AuthSession.AuthSessionResult | null;
  promptAsync: (options?: AuthSession.AuthRequestPromptOptions) => Promise<AuthSession.AuthSessionResult>;
  exchangeCodeForResgridToken: () => Promise<boolean>;
}

/**
 * Hook that drives the OIDC Authorization-Code + PKCE login flow.
 *
 * Usage:
 *   const { request, promptAsync, exchangeCodeForResgridToken } = useOidcLogin({ authority, clientId, departmentCode });
 *   // Call promptAsync() to open the system browser.
 *   // Watch `response` and call exchangeCodeForResgridToken() when response.type === 'success'.
 */
export function useOidcLogin({ authority, clientId, departmentCode }: UseOidcLoginOptions): UseOidcLoginResult {
  const redirectUri = AuthSession.makeRedirectUri({ scheme: 'resgrid', path: 'auth/callback' });

  // Auto-discover OIDC endpoints from the authority's /.well-known/openid-configuration
  // discovery will be null until the authority URL is non-empty and valid
  const discovery = AuthSession.useAutoDiscovery(authority || '');

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: clientId || '__placeholder__',
      redirectUri,
      scopes: ['openid', 'email', 'profile', 'offline_access'],
      usePKCE: true,
      responseType: AuthSession.ResponseType.Code,
    },
    // Pass null discovery when authority is not yet set to prevent premature requests
    authority ? discovery : null
  );

  const { loginWithSso } = useAuthStore();

  const exchangeCodeForResgridToken = useCallback(async (): Promise<boolean> => {
    if (response?.type !== 'success' || !request?.codeVerifier || !discovery) {
      logger.warn({
        message: 'OIDC exchange preconditions not met',
        context: { responseType: response?.type, hasCodeVerifier: !!request?.codeVerifier, hasDiscovery: !!discovery },
      });
      return false;
    }

    try {
      // Step 1: Exchange the authorization code for tokens at the IdP
      const tokenResponse = await AuthSession.exchangeCodeAsync(
        {
          clientId,
          redirectUri,
          code: response.params.code,
          extraParams: { code_verifier: request.codeVerifier },
        },
        discovery
      );

      const idToken = tokenResponse.idToken;
      if (!idToken) {
        logger.error({ message: 'No id_token in OIDC token response' });
        return false;
      }

      // Step 2: Exchange the IdP id_token for a Resgrid access token
      await loginWithSso({
        provider: 'oidc',
        externalToken: idToken,
        departmentCode,
      });

      return true;
    } catch (error) {
      logger.error({
        message: 'OIDC code exchange failed',
        context: { error: error instanceof Error ? error.message : String(error) },
      });
      return false;
    }
  }, [response, request, discovery, clientId, redirectUri, departmentCode, loginWithSso]);

  return {
    request,
    response,
    promptAsync,
    exchangeCodeForResgridToken,
  };
}
