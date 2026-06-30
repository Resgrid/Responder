import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { Platform } from 'react-native';

import { ModernNotificationSoundsItem } from '../modern-notification-sounds-item';

const mockSetEnabled = jest.fn();
let mockEnabled = true;
jest.mock('@/lib', () => ({
  useModernNotificationSounds: () => ({
    isModernNotificationSoundsEnabled: mockEnabled,
    setModernNotificationSoundsEnabled: mockSetEnabled,
  }),
}));

const mockRefresh = jest.fn();
jest.mock('@/services/push-notification', () => ({
  pushNotificationService: {
    refreshNotificationChannelSounds: () => mockRefresh(),
  },
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('nativewind', () => ({
  useColorScheme: () => ({ colorScheme: 'light' }),
}));

jest.mock('../../ui/switch', () => ({
  Switch: ({ value, onValueChange }: any) => {
    const { TouchableOpacity } = require('react-native');
    return <TouchableOpacity testID="modern-sounds-switch" onPress={() => onValueChange(!value)} />;
  },
}));

jest.mock('../../ui/text', () => ({
  Text: ({ children }: any) => {
    const { Text } = require('react-native');
    return <Text>{children}</Text>;
  },
}));

jest.mock('../../ui/view', () => ({
  View: ({ children }: any) => {
    const { View } = require('react-native');
    return <View>{children}</View>;
  },
}));

jest.mock('../../ui/vstack', () => ({
  VStack: ({ children }: any) => {
    const { View } = require('react-native');
    return <View>{children}</View>;
  },
}));

describe('ModernNotificationSoundsItem', () => {
  const originalOS = Platform.OS;

  beforeEach(() => {
    mockSetEnabled.mockClear();
    mockRefresh.mockClear();
    mockEnabled = true;
  });

  afterEach(() => {
    (Platform as { OS: string }).OS = originalOS;
  });

  it('renders the toggle on Android', () => {
    (Platform as { OS: string }).OS = 'android';
    render(<ModernNotificationSoundsItem />);

    expect(screen.getByText('settings.modern_notification_sounds')).toBeTruthy();
    expect(screen.getByTestId('modern-sounds-switch')).toBeTruthy();
  });

  it('renders nothing on iOS', () => {
    (Platform as { OS: string }).OS = 'ios';
    render(<ModernNotificationSoundsItem />);

    expect(screen.queryByText('settings.modern_notification_sounds')).toBeNull();
  });

  it('persists the new value and refreshes the channels when toggled off', () => {
    (Platform as { OS: string }).OS = 'android';
    render(<ModernNotificationSoundsItem />);

    fireEvent.press(screen.getByTestId('modern-sounds-switch'));

    expect(mockSetEnabled).toHaveBeenCalledWith(false);
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });
});
