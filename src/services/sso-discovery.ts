import axios from 'axios';

import { getBaseApiUrl } from '@/lib/storage/app';

export interface DepartmentSsoConfig {
  ssoEnabled: boolean;
  providerType: 'oidc' | 'saml2' | null;
  authority: string | null;
  clientId: string | null;
  metadataUrl: string | null;
  entityId: string | null;
  allowLocalLogin: boolean;
  requireSso: boolean;
  requireMfa: boolean;
  oidcRedirectUri: string;
  oidcScopes: string;
}

export async function fetchDepartmentSsoConfig(departmentCode: string): Promise<DepartmentSsoConfig | null> {
  try {
    const baseUrl = getBaseApiUrl();
    const response = await axios.get(`${baseUrl}/connect/sso-config`, {
      params: { departmentCode },
    });
    return (response.data?.Data as DepartmentSsoConfig) ?? null;
  } catch {
    return null;
  }
}

/**
 * Resolves SSO config for a user by username (and optionally a specific department ID).
 * Calls GET /connect/sso-config-for-user.
 * Returns null on network error; returns a config with ssoEnabled=false if the
 * username doesn't exist (the backend intentionally avoids account-enumeration leaks).
 */
export async function fetchUserSsoConfig(username: string, departmentId?: number): Promise<DepartmentSsoConfig | null> {
  try {
    const baseUrl = getBaseApiUrl();
    const params: Record<string, string | number> = { username };
    if (departmentId !== undefined && departmentId > 0) {
      params.departmentId = departmentId;
    }
    const response = await axios.get(`${baseUrl}/connect/sso-config-for-user`, { params });
    return (response.data?.Data as DepartmentSsoConfig) ?? null;
  } catch {
    return null;
  }
}
