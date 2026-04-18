import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

const mockPush = jest.fn();
const mockTrackEvent = jest.fn();
const mockLogin = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn((callback) => callback()),
}));

jest.mock('expo-router', () => ({
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

jest.mock('@/lib/auth', () => ({
  useAuth: () => ({
    login: mockLogin,
    status: 'idle',
    error: undefined,
    isAuthenticated: false,
  }),
}));

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
