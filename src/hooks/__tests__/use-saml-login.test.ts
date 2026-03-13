import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

import { handleSamlCallbackUrl, PENDING_SAML_DEPT_CODE_KEY } from '../use-saml-login';

// Mock expo modules
jest.mock('expo-linking', () => ({
  parse: jest.fn(),
}));

jest.mock('expo-web-browser', () => ({
  openBrowserAsync: jest.fn(),
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
  };
});

import useAuthStore from '@/stores/auth/store';

const mockedParse = Linking.parse as jest.Mock;

describe('handleSamlCallbackUrl', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Re-bind loginWithSso on getState to pick up per-test mockResolvedValue settings
    (useAuthStore as any).getState.mockReturnValue({ loginWithSso: mockLoginWithSso });
  });

  it('returns false when the URL has no saml_response param', async () => {
    mockedParse.mockReturnValue({ queryParams: {} });

    const result = await handleSamlCallbackUrl('resgrid://auth/callback');
    expect(result).toBe(false);
    expect(mockLoginWithSso).not.toHaveBeenCalled();
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

    const result = await handleSamlCallbackUrl(
      'resgrid://auth/callback?saml_response=base64saml=',
    );

    expect(mockLoginWithSso).toHaveBeenCalledWith({
      provider: 'saml2',
      externalToken: 'base64saml=',
      departmentCode: 'DEPT001',
    });
    expect(mockRemoveItem).toHaveBeenCalledWith(PENDING_SAML_DEPT_CODE_KEY);
    expect(result).toBe(true);
  });

  it('returns false and does not clear storage when loginWithSso throws', async () => {
    mockedParse.mockReturnValue({ queryParams: { saml_response: 'base64saml' } });
    mockGetItem.mockReturnValue('DEPT001');
    mockLoginWithSso.mockRejectedValue(new Error('Token exchange failed'));

    const result = await handleSamlCallbackUrl(
      'resgrid://auth/callback?saml_response=base64saml',
    );

    expect(result).toBe(false);
    expect(mockRemoveItem).not.toHaveBeenCalled();
  });
});

describe('handleSamlCallbackUrl', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns false when the URL has no saml_response param', async () => {
    mockedParse.mockReturnValue({ queryParams: {} });

    const result = await handleSamlCallbackUrl('resgrid://auth/callback');
    expect(result).toBe(false);
    expect(mockLoginWithSso).not.toHaveBeenCalled();
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

    const result = await handleSamlCallbackUrl(
      'resgrid://auth/callback?saml_response=base64saml=',
    );

    expect(mockLoginWithSso).toHaveBeenCalledWith({
      provider: 'saml2',
      externalToken: 'base64saml=',
      departmentCode: 'DEPT001',
    });
    expect(mockRemoveItem).toHaveBeenCalledWith(PENDING_SAML_DEPT_CODE_KEY);
    expect(result).toBe(true);
  });

  it('returns false and does not clear storage when loginWithSso throws', async () => {
    mockedParse.mockReturnValue({ queryParams: { saml_response: 'base64saml' } });
    mockGetItem.mockReturnValue('DEPT001');
    mockLoginWithSso.mockRejectedValue(new Error('Token exchange failed'));

    const result = await handleSamlCallbackUrl(
      'resgrid://auth/callback?saml_response=base64saml',
    );

    expect(result).toBe(false);
    expect(mockRemoveItem).not.toHaveBeenCalled();
  });
});
