import { renderHook, act } from '@testing-library/react-native';
import * as Linking from 'expo-linking';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';

import { handleSamlCallbackUrl, PENDING_SAML_DEPT_CODE_KEY, useSamlLogin } from '../use-saml-login';

// Mock expo modules
jest.mock('expo-linking', () => ({
  parse: jest.fn(),
}));

jest.mock('expo-web-browser', () => ({
  openBrowserAsync: jest.fn(),
  maybeCompleteAuthSession: jest.fn(),
}));

jest.mock('expo-auth-session', () => ({
  makeRedirectUri: jest.fn().mockReturnValue('resgrid://auth/callback'),
  useAutoDiscovery: jest.fn().mockReturnValue(null),
  useAuthRequest: jest.fn().mockReturnValue([null, null, jest.fn()]),
  ResponseType: { Code: 'code' },
}));

jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn().mockReturnValue('test-state-uuid'),
}));

const mockSecureGetItemAsync = jest.fn();
const mockSecureSetItemAsync = jest.fn().mockResolvedValue(undefined);
const mockSecureDeleteItemAsync = jest.fn().mockResolvedValue(undefined);
jest.mock('expo-secure-store', () => ({
  getItemAsync: (...args: any[]) => mockSecureGetItemAsync(...args),
  setItemAsync: (...args: any[]) => mockSecureSetItemAsync(...args),
  deleteItemAsync: (...args: any[]) => mockSecureDeleteItemAsync(...args),
}));

// Mock storage
const mockSetItem = jest.fn();
const mockGetItem = jest.fn();
const mockRemoveItem = jest.fn();
jest.mock('@/lib/storage', () => ({
  setItem: (...args: any[]) => mockSetItem(...args),
  getItem: (...args: any[]) => mockGetItem(...args),
  removeItem: (...args: any[]) => mockRemoveItem(...args),
}));

// Mock logger
jest.mock('@/lib/logging', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
  },
}));

// Mock auth store — define loginWithSso inside the mock factory
const mockLoginWithSso = jest.fn();
jest.mock('@/stores/auth/store', () => {
  const storeMock = jest.fn();
  (storeMock as any).getState = jest.fn().mockReturnValue({ loginWithSso: mockLoginWithSso });
  return {
    __esModule: true,
    default: storeMock,
    PENDING_SAML_STATE_KEY: 'pending_saml_state',
  };
});

import { logger } from '@/lib/logging';
import useAuthStore from '@/stores/auth/store';

const mockedParse = Linking.parse as jest.Mock;
const mockedOpenBrowserAsync = WebBrowser.openBrowserAsync as jest.Mock;
const mockedLogger = logger as jest.Mocked<typeof logger>;

const validPendingState = (createdAt: number = Date.now(), state: string = 'test-state-uuid') => JSON.stringify({ state, createdAt });

describe('handleSamlCallbackUrl', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Re-bind loginWithSso on getState to pick up per-test mockResolvedValue settings
    (useAuthStore as any).getState.mockReturnValue({ loginWithSso: mockLoginWithSso });
    mockSecureGetItemAsync.mockResolvedValue(validPendingState());
  });

  it('returns false when the URL has no saml_response param', async () => {
    mockedParse.mockReturnValue({ queryParams: {} });

    const result = await handleSamlCallbackUrl('resgrid://auth/callback');
    expect(result).toBe(false);
    expect(mockLoginWithSso).not.toHaveBeenCalled();
  });

  it('returns false when no pending login state exists', async () => {
    mockedParse.mockReturnValue({ queryParams: { saml_response: 'base64saml' } });
    mockSecureGetItemAsync.mockResolvedValue(null);
    mockGetItem.mockReturnValue('DEPT001');

    const result = await handleSamlCallbackUrl('resgrid://auth/callback?saml_response=base64saml');
    expect(result).toBe(false);
    expect(mockLoginWithSso).not.toHaveBeenCalled();
    expect(mockedLogger.warn).toHaveBeenCalledWith(expect.objectContaining({ message: 'SAML: no pending login state, ignoring deep-link' }));
  });

  it('returns false when the pending login state is expired', async () => {
    mockedParse.mockReturnValue({ queryParams: { saml_response: 'base64saml' } });
    mockSecureGetItemAsync.mockResolvedValue(validPendingState(Date.now() - 11 * 60 * 1000));
    mockGetItem.mockReturnValue('DEPT001');

    const result = await handleSamlCallbackUrl('resgrid://auth/callback?saml_response=base64saml');
    expect(result).toBe(false);
    expect(mockLoginWithSso).not.toHaveBeenCalled();
    expect(mockSecureDeleteItemAsync).toHaveBeenCalledWith('pending_saml_state');
  });

  it('returns false when the callback state does not match the pending state', async () => {
    mockedParse.mockReturnValue({ queryParams: { saml_response: 'base64saml', state: 'attacker-state' } });
    mockGetItem.mockReturnValue('DEPT001');

    const result = await handleSamlCallbackUrl('resgrid://auth/callback?saml_response=base64saml&state=attacker-state');
    expect(result).toBe(false);
    expect(mockLoginWithSso).not.toHaveBeenCalled();
  });

  it('returns false when the pending state is malformed', async () => {
    mockedParse.mockReturnValue({ queryParams: { saml_response: 'base64saml' } });
    mockSecureGetItemAsync.mockResolvedValue('not-json');
    mockGetItem.mockReturnValue('DEPT001');

    const result = await handleSamlCallbackUrl('resgrid://auth/callback?saml_response=base64saml');
    expect(result).toBe(false);
    expect(mockLoginWithSso).not.toHaveBeenCalled();
    expect(mockSecureDeleteItemAsync).toHaveBeenCalledWith('pending_saml_state');
  });

  it('returns false when no pending department code is stored', async () => {
    mockedParse.mockReturnValue({ queryParams: { saml_response: 'base64saml' } });
    mockGetItem.mockReturnValue(null);

    const result = await handleSamlCallbackUrl('resgrid://auth/callback?saml_response=base64saml');
    expect(result).toBe(false);
    expect(mockLoginWithSso).not.toHaveBeenCalled();
  });

  it('calls loginWithSso and clears stored dept code on success', async () => {
    mockedParse.mockReturnValue({ queryParams: { saml_response: 'base64saml=' } });
    mockGetItem.mockReturnValue('DEPT001');
    mockLoginWithSso.mockResolvedValue(undefined);

    const result = await handleSamlCallbackUrl('resgrid://auth/callback?saml_response=base64saml=');

    expect(mockLoginWithSso).toHaveBeenCalledWith({
      provider: 'saml2',
      externalToken: 'base64saml=',
      departmentCode: 'DEPT001',
    });
    expect(mockRemoveItem).toHaveBeenCalledWith(PENDING_SAML_DEPT_CODE_KEY);
    expect(mockSecureDeleteItemAsync).toHaveBeenCalledWith('pending_saml_state');
    expect(result).toBe(true);
  });

  it('calls loginWithSso when the callback state matches the pending state', async () => {
    mockedParse.mockReturnValue({ queryParams: { saml_response: 'base64saml', state: 'test-state-uuid' } });
    mockGetItem.mockReturnValue('DEPT001');
    mockLoginWithSso.mockResolvedValue(undefined);

    const result = await handleSamlCallbackUrl('resgrid://auth/callback?saml_response=base64saml&state=test-state-uuid');

    expect(mockLoginWithSso).toHaveBeenCalledWith({
      provider: 'saml2',
      externalToken: 'base64saml',
      departmentCode: 'DEPT001',
    });
    expect(result).toBe(true);
  });

  it('returns false and clears pending state when loginWithSso throws', async () => {
    mockedParse.mockReturnValue({ queryParams: { saml_response: 'base64saml' } });
    mockGetItem.mockReturnValue('DEPT001');
    mockLoginWithSso.mockRejectedValue(new Error('Token exchange failed'));

    const result = await handleSamlCallbackUrl('resgrid://auth/callback?saml_response=base64saml');

    expect(result).toBe(false);
    expect(mockSecureDeleteItemAsync).toHaveBeenCalledWith('pending_saml_state');
  });
});

describe('useSamlLogin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAuthStore as unknown as jest.Mock).mockReturnValue({ loginWithSso: mockLoginWithSso });
    mockSecureGetItemAsync.mockResolvedValue(validPendingState());
  });

  describe('startSamlLogin', () => {
    it('persists state and department code, then opens the IdP URL with the state param', async () => {
      const { result } = renderHook(() => useSamlLogin({ idpSsoUrl: 'https://idp.example.com/sso', departmentCode: 'DEPT001' }));

      await act(async () => {
        await result.current.startSamlLogin();
      });

      expect(mockSecureSetItemAsync).toHaveBeenCalledWith('pending_saml_state', expect.stringContaining('test-state-uuid'));
      expect(mockSetItem).toHaveBeenCalledWith(PENDING_SAML_DEPT_CODE_KEY, 'DEPT001');
      expect(mockedOpenBrowserAsync).toHaveBeenCalledWith('https://idp.example.com/sso?state=test-state-uuid');
    });

    it('appends the state param with & when the URL already has a query string', async () => {
      const { result } = renderHook(() => useSamlLogin({ idpSsoUrl: 'https://idp.example.com/sso?foo=bar', departmentCode: 'DEPT001' }));

      await act(async () => {
        await result.current.startSamlLogin();
      });

      expect(mockedOpenBrowserAsync).toHaveBeenCalledWith('https://idp.example.com/sso?foo=bar&state=test-state-uuid');
    });

    it('does nothing when idpSsoUrl is empty', async () => {
      const { result } = renderHook(() => useSamlLogin({ idpSsoUrl: '', departmentCode: 'DEPT001' }));

      await act(async () => {
        await result.current.startSamlLogin();
      });

      expect(mockedOpenBrowserAsync).not.toHaveBeenCalled();
      expect(mockSecureSetItemAsync).not.toHaveBeenCalled();
    });

    it('refuses to open a malformed IdP URL', async () => {
      const { result } = renderHook(() => useSamlLogin({ idpSsoUrl: 'not a url', departmentCode: 'DEPT001' }));

      await act(async () => {
        await result.current.startSamlLogin();
      });

      expect(mockedOpenBrowserAsync).not.toHaveBeenCalled();
      expect(mockSecureSetItemAsync).not.toHaveBeenCalled();
      expect(mockedLogger.error).toHaveBeenCalledWith(expect.objectContaining({ message: 'SAML: refusing to open non-HTTPS or malformed IdP SSO URL' }));
    });

    it('refuses to open an http IdP URL when not in dev mode', async () => {
      const originalDev = (global as Record<string, unknown>).__DEV__;
      (global as Record<string, unknown>).__DEV__ = false;

      try {
        const { result } = renderHook(() => useSamlLogin({ idpSsoUrl: 'http://idp.example.com/sso', departmentCode: 'DEPT001' }));

        await act(async () => {
          await result.current.startSamlLogin();
        });

        expect(mockedOpenBrowserAsync).not.toHaveBeenCalled();
      } finally {
        (global as Record<string, unknown>).__DEV__ = originalDev;
      }
    });
  });

  describe('handleDeepLink', () => {
    it('returns false when there is no pending login state', async () => {
      mockSecureGetItemAsync.mockResolvedValue(null);
      mockedParse.mockReturnValue({ queryParams: { saml_response: 'base64saml' } });

      const { result } = renderHook(() => useSamlLogin({ idpSsoUrl: 'https://idp.example.com/sso', departmentCode: 'DEPT001' }));

      let ok: boolean | undefined;
      await act(async () => {
        ok = await result.current.handleDeepLink('resgrid://auth/callback?saml_response=base64saml');
      });

      expect(ok).toBe(false);
      expect(mockLoginWithSso).not.toHaveBeenCalled();
    });

    it('returns false when the callback state does not match', async () => {
      mockedParse.mockReturnValue({ queryParams: { saml_response: 'base64saml', state: 'wrong-state' } });

      const { result } = renderHook(() => useSamlLogin({ idpSsoUrl: 'https://idp.example.com/sso', departmentCode: 'DEPT001' }));

      let ok: boolean | undefined;
      await act(async () => {
        ok = await result.current.handleDeepLink('resgrid://auth/callback?saml_response=base64saml&state=wrong-state');
      });

      expect(ok).toBe(false);
      expect(mockLoginWithSso).not.toHaveBeenCalled();
    });

    it('exchanges the response and clears pending state on success', async () => {
      mockedParse.mockReturnValue({ queryParams: { saml_response: 'base64saml', state: 'test-state-uuid' } });
      mockLoginWithSso.mockResolvedValue(undefined);

      const { result } = renderHook(() => useSamlLogin({ idpSsoUrl: 'https://idp.example.com/sso', departmentCode: 'DEPT001' }));

      let ok: boolean | undefined;
      await act(async () => {
        ok = await result.current.handleDeepLink('resgrid://auth/callback?saml_response=base64saml&state=test-state-uuid');
      });

      expect(ok).toBe(true);
      expect(mockLoginWithSso).toHaveBeenCalledWith({
        provider: 'saml2',
        externalToken: 'base64saml',
        departmentCode: 'DEPT001',
      });
      expect(mockSecureDeleteItemAsync).toHaveBeenCalledWith('pending_saml_state');
      expect(mockRemoveItem).toHaveBeenCalledWith(PENDING_SAML_DEPT_CODE_KEY);
    });
  });
});
