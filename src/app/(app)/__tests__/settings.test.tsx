import { useFocusEffect } from '@react-navigation/native';
import { useColorScheme } from 'nativewind';
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import Settings from '../settings';

// Mock dependencies
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('@env', () => ({
  Env: {
    NAME: 'Resgrid Responder',
    VERSION: '1.0.0',
    APP_ENV: 'test',
  },
}));

jest.mock('nativewind', () => ({
  useColorScheme: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn(),
}));

// Mock analytics
const mockTrackEvent = jest.fn();
jest.mock('@/hooks/use-analytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
  }),
}));

// Mock auth
const mockLogin = jest.fn();
const mockLogout = jest.fn();
jest.mock('@/lib', () => ({
  useAuth: () => ({
    login: mockLogin,
    status: 'signedIn',
    isAuthenticated: true,
  }),
  useAuthStore: {
    getState: () => ({
      logout: mockLogout,
    }),
  },
}));

// Mock storage
jest.mock('@/lib/storage/app', () => ({
  getBaseApiUrl: () => 'https://api.resgrid.com',
}));

// Mock utils
const mockOpenLinkInBrowser = jest.fn();
jest.mock('@/lib/utils', () => ({
  openLinkInBrowser: (url: string) => mockOpenLinkInBrowser(url),
}));

// Mock stores
const mockUnits = [
  { id: '1', Name: 'Unit 1', Type: 'Truck' },
  { id: '2', Name: 'Unit 2', Type: 'Ambulance' },
];

jest.mock('@/stores/units/store', () => ({
  useUnitsStore: () => ({
    units: mockUnits,
  }),
}));

// Mock settings components
jest.mock('@/components/settings/background-geolocation-item', () => ({
  BackgroundGeolocationItem: () => {
    const { View } = require('react-native');
    return <View testID="background-geolocation-item" />;
  },
}));

jest.mock('@/components/settings/bluetooth-device-item', () => ({
  BluetoothDeviceItem: () => {
    const { View } = require('react-native');
    return <View testID="bluetooth-device-item" />;
  },
}));

jest.mock('@/components/settings/item', () => ({
  Item: ({ text, onPress, testID }: any) => {
    const { TouchableOpacity, Text } = require('react-native');
    return (
      <TouchableOpacity testID={testID || `item-${text}`} onPress={onPress}>
        <Text>{text}</Text>
      </TouchableOpacity>
    );
  },
}));

jest.mock('@/components/settings/keep-alive-item', () => ({
  KeepAliveItem: () => {
    const { View } = require('react-native');
    return <View testID="keep-alive-item" />;
  },
}));

jest.mock('@/components/settings/language-item', () => ({
  LanguageItem: () => {
    const { View } = require('react-native');
    return <View testID="language-item" />;
  },
}));

jest.mock('@/components/settings/login-info-bottom-sheet', () => ({
  LoginInfoBottomSheet: ({ isOpen, onClose, onSubmit }: any) => {
    const { View, TouchableOpacity, Text } = require('react-native');
    return (
      <View testID="login-info-bottom-sheet" style={{ display: isOpen ? 'flex' : 'none' }}>
        {isOpen && (
          <View>
            <TouchableOpacity testID="close-login-sheet" onPress={onClose}>
              <Text>Close</Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="submit-login"
              onPress={() => onSubmit({ username: 'testuser', password: 'testpass' })}
            >
              <Text>Submit</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  },
}));

jest.mock('@/components/settings/server-url-bottom-sheet', () => ({
  ServerUrlBottomSheet: ({ isOpen, onClose }: any) => {
    const { View, TouchableOpacity, Text } = require('react-native');
    return (
      <View testID="server-url-bottom-sheet" style={{ display: isOpen ? 'flex' : 'none' }}>
        {isOpen && (
          <TouchableOpacity testID="close-server-sheet" onPress={onClose}>
            <Text>Close</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  },
}));

jest.mock('@/components/settings/realtime-geolocation-item', () => ({
  RealtimeGeolocationItem: () => {
    const { View } = require('react-native');
    return <View testID="realtime-geolocation-item" />;
  },
}));

jest.mock('@/components/settings/theme-item', () => ({
  ThemeItem: () => {
    const { View } = require('react-native');
    return <View testID="theme-item" />;
  },
}));

jest.mock('@/components/settings/toggle-item', () => ({
  ToggleItem: () => {
    const { View } = require('react-native');
    return <View testID="toggle-item" />;
  },
}));

// Mock UI components
jest.mock('@/components/ui', () => ({
  FocusAwareStatusBar: () => {
    const { View } = require('react-native');
    return <View testID="focus-aware-status-bar" />;
  },
  ScrollView: ({ children }: any) => {
    const { View } = require('react-native');
    return <View testID="scroll-view">{children}</View>;
  },
}));

jest.mock('@/components/ui/box', () => ({
  Box: ({ children, className, testID }: any) => {
    const { View } = require('react-native');
    return (
      <View testID={testID || 'box'} accessibilityLabel={className}>
        {children}
      </View>
    );
  },
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => {
    const { View } = require('react-native');
    return (
      <View testID="card" accessibilityLabel={className}>
        {children}
      </View>
    );
  },
}));

jest.mock('@/components/ui/heading', () => ({
  Heading: ({ children, className }: any) => {
    const { Text } = require('react-native');
    return (
      <Text testID="heading" accessibilityLabel={className}>
        {children}
      </Text>
    );
  },
}));

jest.mock('@/components/ui/vstack', () => ({
  VStack: ({ children, className }: any) => {
    const { View } = require('react-native');
    return (
      <View testID="vstack" accessibilityLabel={className}>
        {children}
      </View>
    );
  },
}));

// Mock logger
jest.mock('@/lib/logging', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

describe('Settings Screen', () => {
  const mockUseColorScheme = useColorScheme as jest.MockedFunction<typeof useColorScheme>;
  const mockUseFocusEffect = useFocusEffect as jest.MockedFunction<typeof useFocusEffect>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mocks
    mockUseColorScheme.mockReturnValue({
      colorScheme: 'light',
      setColorScheme: jest.fn(),
      toggleColorScheme: jest.fn(),
    });

    // Mock useFocusEffect to immediately call the callback
    mockUseFocusEffect.mockImplementation((callback: () => void) => {
      React.useEffect(callback, []);
    });
  });

  it('renders correctly with all sections', () => {
    render(<Settings />);

    // Check for main sections
    expect(screen.getByText('settings.app_info')).toBeTruthy();
    expect(screen.getByText('settings.account')).toBeTruthy();
    expect(screen.getByText('settings.preferences')).toBeTruthy();
    expect(screen.getByText('settings.support')).toBeTruthy();

    // Check for app info items
    expect(screen.getByText('settings.app_name')).toBeTruthy();
    expect(screen.getByText('settings.version')).toBeTruthy();
    expect(screen.getByText('settings.environment')).toBeTruthy();

    // Check for account items
    expect(screen.getByText('settings.server')).toBeTruthy();
    expect(screen.getByText('settings.login_info')).toBeTruthy();
    expect(screen.getByText('settings.logout')).toBeTruthy();

    // Check for support items
    expect(screen.getByText('settings.help_center')).toBeTruthy();
    expect(screen.getByText('settings.contact_us')).toBeTruthy();
    expect(screen.getByText('settings.status_page')).toBeTruthy();
    expect(screen.getByText('settings.privacy_policy')).toBeTruthy();
    expect(screen.getByText('settings.terms')).toBeTruthy();
  });

  it('tracks analytics when view becomes visible', () => {
    render(<Settings />);

    expect(mockTrackEvent).toHaveBeenCalledWith('settings_viewed', {
      timestamp: expect.any(String),
      colorScheme: 'light',
      isAuthenticated: true,
      serverUrl: 'https://api.resgrid.com',
      unitsCount: 2,
    });
    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
  });

  it('tracks analytics with dark color scheme', () => {
    mockUseColorScheme.mockReturnValue({
      colorScheme: 'dark',
      setColorScheme: jest.fn(),
      toggleColorScheme: jest.fn(),
    });

    render(<Settings />);

    expect(mockTrackEvent).toHaveBeenCalledWith('settings_viewed', {
      timestamp: expect.any(String),
      colorScheme: 'dark',
      isAuthenticated: true,
      serverUrl: 'https://api.resgrid.com',
      unitsCount: 2,
    });
  });

  it('handles server URL press and tracks analytics', () => {
    render(<Settings />);

    const serverItem = screen.getByTestId('item-settings.server');
    fireEvent.press(serverItem);

    expect(mockTrackEvent).toHaveBeenCalledWith('settings_server_url_pressed', {
      timestamp: expect.any(String),
      currentServerUrl: 'https://api.resgrid.com',
    });

    // Check that server URL bottom sheet is shown
    const serverSheet = screen.getByTestId('server-url-bottom-sheet');
    expect(serverSheet.props.style.display).toBe('flex');
  });

  it('handles login info press and tracks analytics', () => {
    render(<Settings />);

    const loginInfoItem = screen.getByTestId('item-settings.login_info');
    fireEvent.press(loginInfoItem);

    expect(mockTrackEvent).toHaveBeenCalledWith('settings_login_info_pressed', {
      timestamp: expect.any(String),
    });

    // Check that login info bottom sheet is shown
    const loginSheet = screen.getByTestId('login-info-bottom-sheet');
    expect(loginSheet.props.style.display).toBe('flex');
  });

  it('handles logout press and tracks analytics', () => {
    render(<Settings />);

    const logoutItem = screen.getByTestId('item-settings.logout');
    fireEvent.press(logoutItem);

    expect(mockTrackEvent).toHaveBeenCalledWith('settings_logout_pressed', {
      timestamp: expect.any(String),
    });

    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  it('handles support link presses and tracks analytics', () => {
    render(<Settings />);

    const supportLinks = [
      { key: 'help_center', url: 'https://resgrid.zohodesk.com/portal/en/home' },
      { key: 'contact_us', url: 'https://resgrid.com/contact' },
      { key: 'status_page', url: 'https://resgrid.freshstatus.io' },
      { key: 'privacy_policy', url: 'https://resgrid.com/privacy' },
      { key: 'terms', url: 'https://resgrid.com/terms' },
    ];

    supportLinks.forEach((link) => {
      const item = screen.getByTestId(`item-settings.${link.key}`);
      fireEvent.press(item);

      expect(mockTrackEvent).toHaveBeenCalledWith('settings_support_link_pressed', {
        timestamp: expect.any(String),
        linkType: link.key,
        url: link.url,
      });

      expect(mockOpenLinkInBrowser).toHaveBeenCalledWith(link.url);
    });

    expect(mockTrackEvent).toHaveBeenCalledTimes(6); // 1 for initial view + 5 for support links
    expect(mockOpenLinkInBrowser).toHaveBeenCalledTimes(5);
  });

  it('handles login info submission and tracks analytics', async () => {
    render(<Settings />);

    // Open login info sheet
    const loginInfoItem = screen.getByTestId('item-settings.login_info');
    fireEvent.press(loginInfoItem);

    // Submit login info
    const submitButton = screen.getByTestId('submit-login');
    fireEvent.press(submitButton);

    await waitFor(() => {
      expect(mockTrackEvent).toHaveBeenCalledWith('settings_login_info_updated', {
        timestamp: expect.any(String),
        username: 'testuser',
      });
    });

    expect(mockLogin).toHaveBeenCalledWith({
      username: 'testuser',
      password: 'testpass',
    });
  });

  it('renders preference items correctly', () => {
    render(<Settings />);

    expect(screen.getByTestId('theme-item')).toBeTruthy();
    expect(screen.getByTestId('language-item')).toBeTruthy();
    expect(screen.getByTestId('keep-alive-item')).toBeTruthy();
    expect(screen.getByTestId('realtime-geolocation-item')).toBeTruthy();
    expect(screen.getByTestId('background-geolocation-item')).toBeTruthy();
    expect(screen.getByTestId('bluetooth-device-item')).toBeTruthy();
  });

  it('applies correct styling for light theme', () => {
    render(<Settings />);

    const box = screen.getByTestId('box');
    expect(box.props.accessibilityLabel).toContain('bg-neutral-50');
  });

  it('applies correct styling for dark theme', () => {
    mockUseColorScheme.mockReturnValue({
      colorScheme: 'dark',
      setColorScheme: jest.fn(),
      toggleColorScheme: jest.fn(),
    });

    render(<Settings />);

    const box = screen.getByTestId('box');
    expect(box.props.accessibilityLabel).toContain('bg-neutral-950');
  });

  it('tracks analytics with correct timestamp format', () => {
    const mockDate = new Date('2024-01-15T10:00:00Z');
    jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);

    render(<Settings />);

    expect(mockTrackEvent).toHaveBeenCalledWith('settings_viewed', {
      timestamp: '2024-01-15T10:00:00.000Z',
      colorScheme: 'light',
      isAuthenticated: true,
      serverUrl: 'https://api.resgrid.com',
      unitsCount: 2,
    });

    jest.restoreAllMocks();
  });

  it('handles undefined color scheme gracefully', () => {
    mockUseColorScheme.mockReturnValue({
      colorScheme: undefined,
      setColorScheme: jest.fn(),
      toggleColorScheme: jest.fn(),
    });

    render(<Settings />);

    expect(mockTrackEvent).toHaveBeenCalledWith('settings_viewed', {
      timestamp: expect.any(String),
      colorScheme: 'light', // Should fallback to 'light'
      isAuthenticated: true,
      serverUrl: 'https://api.resgrid.com',
      unitsCount: 2,
    });
  });

  it('tracks analytics on component mount', () => {
    // The analytics tracking should be tested in the initial render
    render(<Settings />);

    expect(mockTrackEvent).toHaveBeenCalledWith('settings_viewed', {
      timestamp: expect.any(String),
      colorScheme: 'light',
      isAuthenticated: true,
      serverUrl: 'https://api.resgrid.com',
      unitsCount: 2,
    });

    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
  });
});
