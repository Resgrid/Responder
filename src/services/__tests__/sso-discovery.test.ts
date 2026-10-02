import axios from 'axios';

import { fetchDepartmentSsoConfig, fetchUserSsoConfig } from '../sso-discovery';

jest.mock('axios');

// Mock storage
jest.mock('@/lib/storage/app', () => ({
  getBaseApiUrl: jest.fn().mockReturnValue('https://api.resgrid.dev/api/v4'),
}));

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('ssoDiscovery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchDepartmentSsoConfig', () => {
    it('returns the SSO config when the API responds successfully', async () => {
      const mockConfig = {
        ssoEnabled: true,
        providerType: 'oidc',
        authority: 'https://idp.example.com',
        clientId: 'client-123',
        metadataUrl: null,
        entityId: null,
        allowLocalLogin: true,
        requireSso: false,
        requireMfa: false,
        oidcRedirectUri: 'resgrid://auth/callback',
        oidcScopes: 'openid email profile offline_access',
      };

      mockedAxios.get = jest.fn().mockResolvedValue({
        data: { Data: mockConfig },
      });

      const result = await fetchDepartmentSsoConfig('DEPT001');

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://api.resgrid.dev/api/v4/connect/sso-config',
        { params: { departmentCode: 'DEPT001' }, headers: { 'X-Resgrid-Client': 'responder' } },
      );
      expect(result).toEqual({ ...mockConfig, departmentId: null, departmentToken: null, brokeredSsoAvailable: false, samlLoginUrl: null });
    });

    it('reads the PascalCase v4 payload, including the brokered SSO fields', async () => {
      mockedAxios.get = jest.fn().mockResolvedValue({
        data: {
          Data: {
            SsoEnabled: true,
            ProviderType: 'saml2',
            Authority: null,
            ClientId: null,
            MetadataUrl: 'https://idp.example.com/metadata',
            EntityId: 'urn:resgrid',
            AllowLocalLogin: false,
            RequireSso: true,
            RequireMfa: true,
            OidcRedirectUri: null,
            OidcScopes: null,
            DepartmentId: 42,
            DepartmentToken: 'enc-token',
            BrokeredSsoAvailable: true,
            SamlLoginUrl: 'https://api.example.com/api/v4/connect/saml-mobile-login?departmentToken=enc-token',
          },
        },
      });

      const result = await fetchDepartmentSsoConfig('DEPT001');

      expect(result).toEqual({
        ssoEnabled: true,
        providerType: 'saml2',
        authority: null,
        clientId: null,
        metadataUrl: 'https://idp.example.com/metadata',
        entityId: 'urn:resgrid',
        samlLoginUrl: 'https://api.example.com/api/v4/connect/saml-mobile-login?departmentToken=enc-token',
        allowLocalLogin: false,
        requireSso: true,
        requireMfa: true,
        oidcRedirectUri: '',
        oidcScopes: '',
        departmentId: 42,
        departmentToken: 'enc-token',
        brokeredSsoAvailable: true,
      });
    });

    it('returns null when the API response has no Data field', async () => {
      mockedAxios.get = jest.fn().mockResolvedValue({ data: {} });

      const result = await fetchDepartmentSsoConfig('DEPT001');
      expect(result).toBeNull();
    });

    it('throws when the API call fails', async () => {
      mockedAxios.get = jest.fn().mockRejectedValue(new Error('Network error'));

      await expect(fetchDepartmentSsoConfig('DEPT001')).rejects.toThrow(
        'SSO config lookup failed for department "DEPT001"'
      );
    });

    it('handles a SAML providerType', async () => {
      const mockConfig = {
        ssoEnabled: true,
        providerType: 'saml2',
        authority: null,
        clientId: null,
        metadataUrl: 'https://idp.example.com/saml/sso',
        entityId: 'urn:example:sp',
        allowLocalLogin: false,
        requireSso: true,
        requireMfa: false,
        oidcRedirectUri: '',
        oidcScopes: '',
      };

      mockedAxios.get = jest.fn().mockResolvedValue({ data: { Data: mockConfig } });

      const result = await fetchDepartmentSsoConfig('SAML_DEPT');
      expect(result?.providerType).toBe('saml2');
      expect(result?.requireSso).toBe(true);
    });
  });

  describe('fetchUserSsoConfig', () => {
    const mockOidcConfig = {
      ssoEnabled: true,
      providerType: 'oidc',
      authority: 'https://idp.example.com',
      clientId: 'client-123',
      metadataUrl: null,
      entityId: null,
      allowLocalLogin: true,
      requireSso: false,
      requireMfa: false,
      oidcRedirectUri: 'resgrid://auth/callback',
      oidcScopes: 'openid email profile offline_access',
    };

    it('calls the correct endpoint with username only', async () => {
      mockedAxios.get = jest.fn().mockResolvedValue({ data: { Data: mockOidcConfig } });

      const result = await fetchUserSsoConfig('jdoe@example.com');

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://api.resgrid.dev/api/v4/connect/sso-config-for-user',
        { params: { username: 'jdoe@example.com' }, headers: { 'X-Resgrid-Client': 'responder' } },
      );
      expect(result).toEqual({ ...mockOidcConfig, departmentId: null, departmentToken: null, brokeredSsoAvailable: false, samlLoginUrl: null });
    });

    it('includes departmentId param when provided', async () => {
      mockedAxios.get = jest.fn().mockResolvedValue({ data: { Data: mockOidcConfig } });

      await fetchUserSsoConfig('jdoe@example.com', 42);

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://api.resgrid.dev/api/v4/connect/sso-config-for-user',
        { params: { username: 'jdoe@example.com', departmentId: 42 }, headers: { 'X-Resgrid-Client': 'responder' } },
      );
    });

    it('omits departmentId when value is 0 or undefined', async () => {
      mockedAxios.get = jest.fn().mockResolvedValue({ data: { Data: mockOidcConfig } });

      await fetchUserSsoConfig('jdoe@example.com', 0);

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://api.resgrid.dev/api/v4/connect/sso-config-for-user',
        { params: { username: 'jdoe@example.com' }, headers: { 'X-Resgrid-Client': 'responder' } },
      );
    });

    it('throws on network error', async () => {
      mockedAxios.get = jest.fn().mockRejectedValue(new Error('Network error'));

      await expect(fetchUserSsoConfig('jdoe@example.com')).rejects.toThrow(
        'SSO config lookup failed for user "jdoe@example.com"'
      );
    });

    it('returns ssoEnabled=false config when user is unknown (no account enumeration)', async () => {
      const noSsoConfig = { ssoEnabled: false, allowLocalLogin: true, providerType: null };
      mockedAxios.get = jest.fn().mockResolvedValue({ data: { Data: noSsoConfig } });

      const result = await fetchUserSsoConfig('unknown@example.com');
      expect(result?.ssoEnabled).toBe(false);
      expect(result?.allowLocalLogin).toBe(true);
    });
  });
});
