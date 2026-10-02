import { act, fireEvent, render } from '@testing-library/react-native';
import React from 'react';

import useAuthStore from '@/stores/auth/store';

import SsoLogin from '../sso';

const mockPromptAsync = jest.fn();
const mockOidcOptions = jest.fn();
const mockStartSaml = jest.fn();
const mockSamlOptions = jest.fn();
jest.mock('expo-router', () => ({ Stack: { Screen: () => null }, useRouter: () => ({ replace: jest.fn(), push: jest.fn() }) }));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock('@/components/ui', () => ({ FocusAwareStatusBar: () => null }));
jest.mock('@/hooks/use-analytics', () => ({ useAnalytics: () => ({ trackEvent: jest.fn() }) }));
jest.mock('@/lib/auth', () => ({ useAuth: () => ({ status: 'signedOut', error: null, isAuthenticated: false }) }));
jest.mock('@/hooks/use-oidc-login', () => ({
  isValidSsoUrl: () => true,
  useOidcLogin: (options: unknown) => {
    mockOidcOptions(options);
    return { promptAsync: mockPromptAsync, request: null, response: null };
  },
}));
jest.mock('@/hooks/use-saml-login', () => ({
  useSamlLogin: (options: unknown) => {
    mockSamlOptions(options);
    return { startSamlLogin: mockStartSaml };
  },
}));
jest.mock('@/components/auth/login-mfa-sheet', () => ({ LoginMfaSheet: () => null }));
jest.mock('@/components/ui/modal', () => {
  const { View } = require('react-native');
  const Part = ({ children }: any) => <View>{children}</View>;
  return {
    Modal: ({ isOpen, children }: any) => (isOpen ? <View>{children}</View> : null),
    ModalBackdrop: () => null,
    ModalBody: Part,
    ModalContent: Part,
    ModalFooter: Part,
    ModalHeader: Part,
  };
});
jest.mock('@/components/auth/login-otp-modal', () => ({ LoginOtpModal: () => null }));
jest.mock('@/app/login/sso-section', () => {
  const { Pressable, Text } = require('react-native');
  return {
    SsoDepartmentForm: ({ onSsoConfigResolved }: any) => (
      <Pressable testID="resolve" onPress={() => onSsoConfigResolved('user1', (globalThis as any).__ssoConfig)}>
        <Text>resolve</Text>
      </Pressable>
    ),
    SsoLoginButtons: ({ onOidcPress, onSamlPress }: any) => (
      <>
        <Pressable testID="oidc" onPress={onOidcPress}>
          <Text>oidc</Text>
        </Pressable>
        <Pressable testID="saml" onPress={onSamlPress}>
          <Text>saml</Text>
        </Pressable>
      </>
    ),
  };
});

const config = (brokered: boolean) => ({
  ssoEnabled: true,
  providerType: 'oidc',
  authority: 'https://idp.example',
  clientId: 'c',
  metadataUrl: null,
  entityId: null,
  allowLocalLogin: true,
  requireSso: false,
  requireMfa: false,
  oidcRedirectUri: '',
  oidcScopes: '',
  departmentId: 42,
  departmentToken: brokered ? 'dept-token' : null,
  brokeredSsoAvailable: brokered,
});

describe('SSO sign-in through the broker (passkey plan section 7.7.2)', () => {
  const loginWithBrokeredSso = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    loginWithBrokeredSso.mockResolvedValue({ outcome: 'signed_in' });
    useAuthStore.setState({ loginWithBrokeredSso });
  });

  it('goes through the broker with the department token when it is available', async () => {
    (globalThis as any).__ssoConfig = config(true);
    const { getByTestId } = render(<SsoLogin />);
    fireEvent.press(getByTestId('resolve'));
    await act(async () => fireEvent.press(getByTestId('oidc')));
    expect(loginWithBrokeredSso).toHaveBeenCalledWith({ departmentToken: 'dept-token' });
    expect(mockPromptAsync).not.toHaveBeenCalled();

    await act(async () => fireEvent.press(getByTestId('saml')));
    expect(loginWithBrokeredSso).toHaveBeenCalledTimes(2);
  });

  it('keeps the app-side OIDC flow for a server without the broker, naming the department by its token', async () => {
    (globalThis as any).__ssoConfig = { ...config(false), departmentToken: 'dept-token' };
    const { getByTestId } = render(<SsoLogin />);
    fireEvent.press(getByTestId('resolve'));
    await act(async () => fireEvent.press(getByTestId('oidc')));
    expect(loginWithBrokeredSso).not.toHaveBeenCalled();
    expect(mockPromptAsync).toHaveBeenCalled();
    // The exchange names the department by discovery's token: the server reads no department from a username.
    expect(mockOidcOptions).toHaveBeenLastCalledWith(expect.objectContaining({ departmentToken: 'dept-token' }));
  });

  it("starts SAML without the broker on the server's own start page, never the IdP's metadata document", async () => {
    const start = 'https://api.example/api/v4/connect/saml-mobile-login?departmentToken=t';
    (globalThis as any).__ssoConfig = { ...config(false), providerType: 'saml2', metadataUrl: 'https://idp.example/metadata', samlLoginUrl: start, departmentToken: 'dept-token' };
    const { getByTestId, queryByText } = render(<SsoLogin />);
    fireEvent.press(getByTestId('resolve'));
    await act(async () => fireEvent.press(getByTestId('saml')));
    expect(loginWithBrokeredSso).not.toHaveBeenCalled();
    expect(mockStartSaml).toHaveBeenCalled();
    expect(mockSamlOptions).toHaveBeenLastCalledWith({ signInUrl: start, departmentToken: 'dept-token' });
    expect(queryByText('login.errorModal.message')).toBeNull();
  });

  it('says SAML cannot start where the server names no start page', async () => {
    (globalThis as any).__ssoConfig = { ...config(false), providerType: 'saml2', metadataUrl: 'https://idp.example/metadata', samlLoginUrl: null };
    const { getByTestId, queryByText } = render(<SsoLogin />);
    fireEvent.press(getByTestId('resolve'));
    await act(async () => fireEvent.press(getByTestId('saml')));
    expect(mockStartSaml).not.toHaveBeenCalled();
    expect(queryByText('login.errorModal.message')).not.toBeNull();
  });

  it('says SAML cannot start on the web edition, which the relay cannot return to', async () => {
    const { Platform } = require('react-native');
    const os = Platform.OS;
    Platform.OS = 'web';
    try {
      (globalThis as any).__ssoConfig = { ...config(false), providerType: 'saml2', samlLoginUrl: 'https://api.example/api/v4/connect/saml-mobile-login?departmentToken=t' };
      const { getByTestId, queryByText } = render(<SsoLogin />);
      fireEvent.press(getByTestId('resolve'));
      await act(async () => fireEvent.press(getByTestId('saml')));
      expect(mockStartSaml).not.toHaveBeenCalled();
      expect(queryByText('login.errorModal.message')).not.toBeNull();
    } finally {
      Platform.OS = os;
    }
  });
});
