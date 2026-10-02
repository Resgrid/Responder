import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

const mockPush = jest.fn();
const mockTrackEvent = jest.fn();
const mockLogin = jest.fn();


jest.mock('expo-router', () => ({
  useFocusEffect: jest.fn((callback) => callback()),
  useRouter: () => ({
    push: mockPush,
  }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('@/hooks/use-analytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
  }),
}));

const mockAuthStatus = { current: 'idle' };
jest.mock('@/lib/auth', () => ({
  useAuth: () => ({
    login: mockLogin,
    status: mockAuthStatus.current,
    error: undefined,
    isAuthenticated: false,
  }),
}));

// The second-factor sheet renders as a marker that says whether it is open.
jest.mock('@/components/auth/login-mfa-sheet', () => {
  const React = require('react');
  const { View } = require('react-native');
  return { LoginMfaSheet: ({ isOpen }: { isOpen: boolean }) => (isOpen ? React.createElement(View, { testID: 'login-mfa-sheet-open' }) : null) };
});

jest.mock('@/lib/env', () => ({
  Env: {
    LOGGING_KEY: 'test-key',
  },
}));

jest.mock('@/lib/logging', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@/components/ui', () => ({
  FocusAwareStatusBar: () => null,
}));

jest.mock('@/components/ui/button', () => {
  const ReactActual = jest.requireActual('react');
  const { Pressable, Text } = jest.requireActual('react-native');

  return {
    Button: ({ children, onPress }: { children: React.ReactNode; onPress?: () => void }) => <Pressable onPress={onPress}>{children}</Pressable>,
    ButtonText: ({ children }: { children: React.ReactNode }) => <Text>{children}</Text>,
  };
});

jest.mock('@/components/ui/modal', () => ({
  Modal: ({ children, isOpen }: { children: React.ReactNode; isOpen: boolean }) => (isOpen ? children : null),
  ModalBackdrop: () => null,
  ModalBody: ({ children }: { children: React.ReactNode }) => children,
  ModalContent: ({ children }: { children: React.ReactNode }) => children,
  ModalFooter: ({ children }: { children: React.ReactNode }) => children,
  ModalHeader: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('@/components/ui/text', () => {
  const ReactActual = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');

  return {
    Text: ({ children }: { children: React.ReactNode }) => <Text>{children}</Text>,
  };
});

jest.mock('@/components/settings/server-url-bottom-sheet', () => ({
  ServerUrlBottomSheet: ({ isOpen }: { isOpen: boolean }) => {
    const { Text } = require('react-native');
    return isOpen ? <Text testID="server-url-bottom-sheet">server-url-bottom-sheet</Text> : null;
  },
}));

jest.mock('../login-form', () => ({
  LoginForm: ({ onServerUrlPress }: { onServerUrlPress?: () => void }) => {
    const ReactActual = require('react');
    const { Pressable, Text } = require('react-native');

    return (
      <Pressable onPress={onServerUrlPress} testID="open-server-url-sheet">
        <Text>open server url</Text>
      </Pressable>
    );
  },
}));

import Login from '../index';

describe('Login screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('only mounts the server URL sheet after the user opens it', () => {
    render(<Login />);

    expect(screen.queryByTestId('server-url-bottom-sheet')).toBeNull();

    fireEvent.press(screen.getByTestId('open-server-url-sheet'));

    expect(screen.getByTestId('server-url-bottom-sheet')).toBeTruthy();
  });
});

describe('the second-factor sheet on the login screen', () => {
  const { default: useAuthStore } = jest.requireActual('@/stores/auth/store') as typeof import('@/stores/auth/store');
  const verify = (source: 'password' | 'sso') => ({ kind: 'verify' as const, methods: ['totp' as const], enrolled: ['totp' as const], preferred: 'totp' as const, expiresAt: null, source });

  beforeEach(() => {
    mockAuthStatus.current = 'mfaRequired';
  });
  afterEach(() => {
    mockAuthStatus.current = 'idle';
    useAuthStore.setState({ mfaChallenge: null });
  });

  it('opens for a password sign-in that continues on a login transaction', () => {
    useAuthStore.setState({ mfaChallenge: verify('password') });
    render(<Login />);
    expect(screen.getByTestId('login-mfa-sheet-open')).toBeTruthy();
  });

  it("leaves a single sign-on's second factor to the SSO screen on top of it", () => {
    // Both screens are mounted while the SSO screen is shown; two sheets would each stage their own setup key.
    useAuthStore.setState({ mfaChallenge: verify('sso') });
    render(<Login />);
    expect(screen.queryByTestId('login-mfa-sheet-open')).toBeNull();
  });
});
