import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

// Mock nativewind cssInterop
jest.mock('nativewind', () => ({
  useColorScheme: () => ({ colorScheme: 'light' }),
  cssInterop: jest.fn(),
}));

// Mock UI components
jest.mock('../../ui/alert', () => {
  const mockReact = require('react');
  return {
    Alert: ({ children, className, ...props }: any) => mockReact.createElement('View', { ...props, testID: 'alert' }, children),
    AlertIcon: ({ as: Component, className, ...props }: any) => mockReact.createElement('View', { ...props, testID: 'alert-icon' }),
    AlertText: ({ children, className, ...props }: any) => mockReact.createElement('Text', { ...props, testID: 'alert-text' }, children),
  };
});

jest.mock('../../ui/switch', () => {
  const mockReact = require('react');
  return {
    Switch: (props: any) => mockReact.createElement('View', { ...props, role: 'switch', testID: 'switch' }),
  };
});

jest.mock('../../ui/text', () => {
  const mockReact = require('react');
  return {
    Text: ({ children, ...props }: any) => mockReact.createElement('Text', { ...props, testID: 'text' }, children),
  };
});

jest.mock('../../ui/view', () => {
  const mockReact = require('react');
  return {
    View: ({ children, ...props }: any) => mockReact.createElement('View', { ...props, testID: 'view' }, children),
  };
});

jest.mock('../../ui/vstack', () => {
  const mockReact = require('react');
  return {
    VStack: ({ children, ...props }: any) => mockReact.createElement('View', { ...props, testID: 'vstack' }, children),
  };
});

import { RealtimeGeolocationItem } from '../realtime-geolocation-item';

// Mock the hook
const mockSetRealtimeGeolocationEnabled = jest.fn();
const mockUseRealtimeGeolocation = {
  isRealtimeGeolocationEnabled: false,
  setRealtimeGeolocationEnabled: mockSetRealtimeGeolocationEnabled,
  isGeolocationHubConnected: false,
};

jest.mock('@/lib/hooks/use-realtime-geolocation', () => ({
  useRealtimeGeolocation: () => mockUseRealtimeGeolocation,
}));

// Mock translations
const mockT = jest.fn((key: string) => {
  const translations: Record<string, string> = {
    'settings.realtime_geolocation': 'Realtime Geolocation',
    'settings.realtime_geolocation_warning': 'This feature connects to the real-time location hub to receive location updates from other personnel and units. It requires an active network connection.',
  };
  return translations[key] || key;
});

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: mockT }),
}));



describe('RealtimeGeolocationItem', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRealtimeGeolocation.isRealtimeGeolocationEnabled = false;
    mockUseRealtimeGeolocation.isGeolocationHubConnected = false;
  });

  it('renders correctly with default state', () => {
    render(<RealtimeGeolocationItem />);

    expect(screen.getByText('Realtime Geolocation')).toBeTruthy();
    expect(screen.queryByText('This feature connects to the real-time location hub')).toBeFalsy();
  });

  it('displays switch in off state when realtime geolocation is disabled', () => {
    mockUseRealtimeGeolocation.isRealtimeGeolocationEnabled = false;

    const { UNSAFE_root } = render(<RealtimeGeolocationItem />);

    expect(UNSAFE_root).toBeTruthy();
    expect(screen.getByText('Realtime Geolocation')).toBeTruthy();
  });

  it('displays switch in on state when realtime geolocation is enabled', () => {
    mockUseRealtimeGeolocation.isRealtimeGeolocationEnabled = true;

    render(<RealtimeGeolocationItem />);

    expect(screen.getByText('Realtime Geolocation')).toBeTruthy();
    expect(screen.getByText(/This feature connects to the real-time location hub/)).toBeTruthy();
  });

  it('shows warning message when realtime geolocation is enabled', () => {
    mockUseRealtimeGeolocation.isRealtimeGeolocationEnabled = true;

    render(<RealtimeGeolocationItem />);

    expect(screen.getByText(/This feature connects to the real-time location hub/)).toBeTruthy();
  });

  it('shows "Connecting to hub..." when enabled but not connected', () => {
    mockUseRealtimeGeolocation.isRealtimeGeolocationEnabled = true;
    mockUseRealtimeGeolocation.isGeolocationHubConnected = false;

    render(<RealtimeGeolocationItem />);

    expect(screen.getByText(/Connecting to hub\.\.\./)).toBeTruthy();
  });

  it('shows "Connected to hub." when enabled and connected', () => {
    mockUseRealtimeGeolocation.isRealtimeGeolocationEnabled = true;
    mockUseRealtimeGeolocation.isGeolocationHubConnected = true;

    render(<RealtimeGeolocationItem />);

    expect(screen.getByText(/Connected to hub\./)).toBeTruthy();
  });

  it('calls setRealtimeGeolocationEnabled when switch is toggled', async () => {
    render(<RealtimeGeolocationItem />);

    // Find and press the switch
    const switches = screen.getAllByTestId('switch');
    expect(switches).toHaveLength(1);

    fireEvent(switches[0], 'onValueChange', true);

    await waitFor(() => {
      expect(mockSetRealtimeGeolocationEnabled).toHaveBeenCalledWith(true);
    });
  });

  it('handles toggle errors gracefully', async () => {
    mockSetRealtimeGeolocationEnabled.mockRejectedValueOnce(new Error('Network error'));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    render(<RealtimeGeolocationItem />);

    const switches = screen.getAllByTestId('switch');
    fireEvent(switches[0], 'onValueChange', true);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Failed to toggle realtime geolocation:', expect.any(Error));
    });

    consoleSpy.mockRestore();
  });

  it('renders with dark color scheme', () => {
    // Mock the dark color scheme temporarily
    const originalMock = jest.requireMock('nativewind');
    jest.doMock('nativewind', () => ({
      ...originalMock,
      useColorScheme: () => ({ colorScheme: 'dark' }),
      cssInterop: jest.fn(),
    }));

    mockUseRealtimeGeolocation.isRealtimeGeolocationEnabled = true;

    const { UNSAFE_root } = render(<RealtimeGeolocationItem />);

    expect(UNSAFE_root).toBeTruthy();
  });

  it('uses correct translation keys', () => {
    mockUseRealtimeGeolocation.isRealtimeGeolocationEnabled = true;

    render(<RealtimeGeolocationItem />);

    expect(mockT).toHaveBeenCalledWith('settings.realtime_geolocation');
    expect(mockT).toHaveBeenCalledWith('settings.realtime_geolocation_warning');
  });

  it('does not show alert when realtime geolocation is disabled', () => {
    mockUseRealtimeGeolocation.isRealtimeGeolocationEnabled = false;

    render(<RealtimeGeolocationItem />);

    expect(screen.queryByText(/This feature connects to the real-time location hub/)).toBeFalsy();
  });
}); 