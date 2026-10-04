import axios from 'axios';

import { CLIENT_HEADER, RESGRID_CLIENT } from '@/lib/mfa/client-app';
import { getBaseApiUrl } from '@/lib/storage/app';

export interface DepartmentSsoConfig {
  ssoEnabled: boolean;
  providerType: 'oidc' | 'saml2' | null;
  authority: string | null;
  clientId: string | null;
  metadataUrl: string | null;
  entityId: string | null;
  /** Where a SAML sign-in without the broker starts (discovery's SamlLoginUrl): this server's page, sent on to the IdP. */
  samlLoginUrl: string | null;
  allowLocalLogin: boolean;
  requireSso: boolean;
  requireMfa: boolean;
  oidcRedirectUri: string;
  oidcScopes: string;
  /** The department's id, when the lookup resolved one (never for an unknown user). */
  departmentId: number | null;
  /** A system-encrypted department reference for `Sso/Begin` (passkey workbook section 7.3 discovery fix). */
  departmentToken: string | null;
  /** Whether sign-in can go through the Resgrid broker for this department now (plan section 7.7.2). */
  brokeredSsoAvailable: boolean;
}

type WireConfig = Record<string, unknown>;

/**
 * The v4 API is PascalCase (`SsoEnabled`, `Authority`, ...), like every other v4 model; reading the camelCase names left
 * every field undefined, so SSO looked disabled. Both spellings are read so an older server still works.
 */
const read = (data: WireConfig, name: string): unknown => data[name.charAt(0).toUpperCase() + name.slice(1)] ?? data[name];

const text = (value: unknown): string | null => (typeof value === 'string' && value.length > 0 ? value : null);

export const normalizeSsoConfig = (data: unknown): DepartmentSsoConfig | null => {
  if (typeof data !== 'object' || data === null) {
    return null;
  }
  const wire = data as WireConfig;
  const providerType = text(read(wire, 'providerType'));
  const departmentId = read(wire, 'departmentId');
  return {
    ssoEnabled: read(wire, 'ssoEnabled') === true,
    providerType: providerType === 'oidc' || providerType === 'saml2' ? providerType : null,
    authority: text(read(wire, 'authority')),
    clientId: text(read(wire, 'clientId')),
    metadataUrl: text(read(wire, 'metadataUrl')),
    entityId: text(read(wire, 'entityId')),
    samlLoginUrl: text(read(wire, 'samlLoginUrl')),
    allowLocalLogin: read(wire, 'allowLocalLogin') !== false,
    requireSso: read(wire, 'requireSso') === true,
    requireMfa: read(wire, 'requireMfa') === true,
    oidcRedirectUri: text(read(wire, 'oidcRedirectUri')) ?? '',
    oidcScopes: text(read(wire, 'oidcScopes')) ?? '',
    departmentId: typeof departmentId === 'number' && departmentId > 0 ? departmentId : null,
    departmentToken: text(read(wire, 'departmentToken')),
    brokeredSsoAvailable: read(wire, 'brokeredSsoAvailable') === true,
  };
};

// The server answers with this app's own legacy OIDC redirect URI (each app has its own scheme), so it is told which app
// is asking.
const clientHeaders = { [CLIENT_HEADER]: RESGRID_CLIENT };

export async function fetchDepartmentSsoConfig(departmentCode: string): Promise<DepartmentSsoConfig | null> {
  try {
    const baseUrl = getBaseApiUrl();
    const response = await axios.get(`${baseUrl}/connect/sso-config`, {
      params: { departmentCode },
      headers: clientHeaders,
    });
    return normalizeSsoConfig(response.data?.Data);
  } catch (err) {
    throw new Error(`SSO config lookup failed for department "${departmentCode}": ${err instanceof Error ? err.message : String(err)}`);
  }
}

/**
 * Resolves SSO config for a user by username (and optionally a specific department ID).
 * Calls GET /connect/sso-config-for-user.
 * Throws on network/server error; returns a config with ssoEnabled=false if the
 * username doesn't exist (the backend intentionally avoids account-enumeration leaks).
 */
export async function fetchUserSsoConfig(username: string, departmentId?: number): Promise<DepartmentSsoConfig | null> {
  try {
    const baseUrl = getBaseApiUrl();
    const params: Record<string, string | number> = { username };
    if (departmentId !== undefined && departmentId > 0) {
      params.departmentId = departmentId;
    }
    const response = await axios.get(`${baseUrl}/connect/sso-config-for-user`, { params, headers: clientHeaders });
    return normalizeSsoConfig(response.data?.Data);
  } catch (err) {
    throw new Error(`SSO config lookup failed for user "${username}": ${err instanceof Error ? err.message : String(err)}`);
  }
}
