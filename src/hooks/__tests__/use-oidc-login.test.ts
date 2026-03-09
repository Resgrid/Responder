import { renderHook, act } from '@testing-library/react-native';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

// Mock expo-auth-session
jest.mock('expo-auth-session', () => ({
  makeRedirectUri: jest.fn().mockReturnValue('resgrid://auth/callback'),
  useAutoDiscovery: jest.fn().mockReturnValue(null),
  useAuthRequest: jest.fn().mockReturnValue([null, null, jest.fn()]),
  exchangeCodeAsync: jest.fn(),
  ResponseType: { Code: 'code' },
}));

jest.mock('expo-web-browser', () => ({
  maybeCompleteAuthSession: jest.fn(),
}));

jest.mock('@/lib/logging', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
  },
}));

// Define loginWithSso mock inside the factory so it's not subject to TDZ
jest.mock('@/stores/auth/store', () => {
  const loginWithSso = jest.fn();
  const storeMock = jest.fn().mockReturnValue({ loginWithSso });
  (storeMock as any).__loginWithSso = loginWithSso;
  return { __esModule: true, default: storeMock };
});

import useAuthStore from '@/stores/auth/store';
import { useOidcLogin } from '../use-oidc-login';

// Access mockLoginWithSso via the attached property
const mockLoginWithSso: jest.Mock = (useAuthStore as any).__loginWithSso;

const mockedUseAuthRequest = AuthSession.useAuthRequest as jest.Mock;
const mockedUseAutoDiscovery = AuthSession.useAutoDiscovery as jest.Mock;
const mockedExchangeCodeAsync = AuthSession.exchangeCodeAsync as jest.Mock;

describe('useOidcLogin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Restore default mock return values after clearAllMocks
    mockedUseAuthRequest.mockReturnValue([null, null, jest.fn()]);
    mockedUseAutoDiscovery.mockReturnValue(null);
    (useAuthStore as unknown as jest.Mock).mockReturnValue({ loginWithSso: mockLoginWithSso });
  });

  it('returns request=null and response=null when authority is empty', () => {
    const { result } = renderHook(() =>
      useOidcLogin({ authority: '', clientId: 'test', departmentCode: 'DEPT' }),
    );

    expect(result.current.request).toBeNull();
    expect(result.current.response).toBeNull();
  });

  it('exchangeCodeForResgridToken returns false when response type is not success', async () => {
    mockedUseAuthRequest.mockReturnValue([
      { codeVerifier: 'verifier123' },
      { type: 'cancel' },
      jest.fn(),
    ]);
    mockedUseAutoDiscovery.mockReturnValue({ authorizationEndpoint: 'https://idp/auth' });

    const { result } = renderHook(() =>
      useOidcLogin({
        authority: 'https://idp.example.com',
        clientId: 'client123',
        departmentCode: 'DEPT',
      }),
    );

    const ok = await result.current.exchangeCodeForResgridToken();
    expect(ok).toBe(false);
    expect(mockLoginWithSso).not.toHaveBeenCalled();
  });

  it('exchangeCodeForResgridToken returns false when no idToken in IdP response', async () => {
    mockedUseAuthRequest.mockReturnValue([
      { codeVerifier: 'verifier123' },
      { type: 'success', params: { code: 'auth-code-abc' } },
      jest.fn(),
    ]);
    const mockDiscovery = { authorizationEndpoint: 'https://idp/auth', tokenEndpoint: 'https://idp/token' };
    mockedUseAutoDiscovery.mockReturnValue(mockDiscovery);
    mockedExchangeCodeAsync.mockResolvedValue({ idToken: null, accessToken: 'at' });

    const { result } = renderHook(() =>
      useOidcLogin({
        authority: 'https://idp.example.com',
        clientId: 'client123',
        departmentCode: 'DEPT',
      }),
    );

    const ok = await result.current.exchangeCodeForResgridToken();
    expect(ok).toBe(false);
  });

  it('exchangeCodeForResgridToken calls loginWithSso on success', async () => {
    const mockRequest = { codeVerifier: 'verifier123' };
    const mockResponse = { type: 'success', params: { code: 'auth-code-abc' } };
    const mockDiscovery = {
      authorizationEndpoint: 'https://idp/auth',
      tokenEndpoint: 'https://idp/token',
    };

    mockedUseAuthRequest.mockReturnValue([mockRequest, mockResponse, jest.fn()]);
    mockedUseAutoDiscovery.mockReturnValue(mockDiscovery);
    mockedExchangeCodeAsync.mockResolvedValue({ idToken: 'id.token.here' });
    mockLoginWithSso.mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useOidcLogin({
        authority: 'https://idp.example.com',
        clientId: 'client123',
        departmentCode: 'DEPT001',
      }),
    );

    let ok: boolean;
    await act(async () => {
      ok = await result.current.exchangeCodeForResgridToken();
    });

    expect(mockLoginWithSso).toHaveBeenCalledWith({
      provider: 'oidc',
      externalToken: 'id.token.here',
      departmentCode: 'DEPT001',
    });
    expect(ok!).toBe(true);
  });
});
