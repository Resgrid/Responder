import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { NavigationAppItem } from '../navigation-app-item';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'settings.navigation_app.title': 'Navigation App',
        'settings.navigation_app.description': 'The app this device opens when you start navigation to a call, destination or map pin.',
        'settings.navigation_app.default': 'Device default',
        'settings.navigation_app.google_maps': 'Google Maps',
        'settings.navigation_app.apple_maps': 'Apple Maps',
        'settings.navigation_app.waze': 'Waze',
        'settings.navigation_app.gaia_gps': 'Gaia GPS',
        'settings.navigation_app.here_wego': 'HERE WeGo',
        'settings.navigation_app.mapquest': 'MapQuest',
        'settings.navigation_app.onx_offroad': 'onX Offroad',
        'settings.navigation_app.organic_maps': 'Organic Maps',
        'settings.navigation_app.osmand': 'OsmAnd',
      };
      return translations[key] || key;
    },
  }),
}));

// Offer the options of the platform under test, through the real filtering.
let mockPlatform = 'android';
jest.mock('@/lib/storage/navigation-app', () => {
  const actual = jest.requireActual<typeof import('@/lib/storage/navigation-app')>('@/lib/storage/navigation-app');
  return {
    ...actual,
    getNavigationAppOptions: () => actual.getNavigationAppOptions(mockPlatform),
  };
});

const mockSetNavigationApp = jest.fn();
let mockNavigationApp = 'default';
jest.mock('@/lib/hooks/use-navigation-app', () => ({
  useNavigationApp: () => ({
    navigationApp: mockNavigationApp,
    setNavigationApp: mockSetNavigationApp,
  }),
}));

// A flat stand-in for the gluestack Select: every option is a pressable row, and the change handler is
// captured so a test can send a value no option offers.
let mockOnValueChange: ((value: string) => void) | undefined;
jest.mock('@/components/ui/select', () => {
  const React = require('react');
  const { Pressable, Text, View } = require('react-native');
  const SelectContext = React.createContext({ onValueChange: (_value: string) => {} });
  const Passthrough = ({ children }: { children?: React.ReactNode }) => <View>{children}</View>;
  return {
    Select: ({
      children,
      onValueChange,
      selectedValue,
      initialLabel,
      testID,
    }: {
      children: React.ReactNode;
      onValueChange: (value: string) => void;
      selectedValue: string | null;
      initialLabel?: string;
      testID?: string;
    }) => {
      mockOnValueChange = onValueChange;
      return (
        <SelectContext.Provider value={{ onValueChange }}>
          <View testID={testID} accessibilityValue={{ text: selectedValue ?? '' }}>
            <Text testID="navigation-app-selected-label">{initialLabel}</Text>
            {children}
          </View>
        </SelectContext.Provider>
      );
    },
    SelectTrigger: Passthrough,
    SelectInput: () => null,
    SelectIcon: () => null,
    SelectPortal: Passthrough,
    SelectBackdrop: () => null,
    SelectContent: Passthrough,
    SelectDragIndicatorWrapper: Passthrough,
    SelectDragIndicator: () => null,
    SelectItem: ({ label, value }: { label: string; value: string }) => {
      const { onValueChange } = React.useContext(SelectContext);
      return (
        <Pressable testID={`navigation-app-option-${value}`} onPress={() => onValueChange(value)}>
          <Text>{label}</Text>
        </Pressable>
      );
    },
  };
});

describe('NavigationAppItem', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPlatform = 'android';
    mockNavigationApp = 'default';
  });

  it('renders the label and description', () => {
    render(<NavigationAppItem />);

    expect(screen.getByText('Navigation App')).toBeTruthy();
    expect(screen.getByText('The app this device opens when you start navigation to a call, destination or map pin.')).toBeTruthy();
  });

  it('offers device default, Google Maps and Waze on Android, without Apple Maps', () => {
    render(<NavigationAppItem />);

    expect(screen.getByTestId('navigation-app-option-default')).toBeTruthy();
    expect(screen.getByTestId('navigation-app-option-google_maps')).toBeTruthy();
    expect(screen.getByTestId('navigation-app-option-waze')).toBeTruthy();
    expect(screen.queryByTestId('navigation-app-option-apple_maps')).toBeNull();
  });

  it('also offers Apple Maps on iOS', () => {
    mockPlatform = 'ios';

    render(<NavigationAppItem />);

    expect(screen.getByTestId('navigation-app-option-apple_maps')).toBeTruthy();
    expect(screen.getByText('Apple Maps')).toBeTruthy();
  });

  it.each(['android', 'ios'])('offers the mobile-only navigation apps on %s, by name', (platform) => {
    mockPlatform = platform;

    render(<NavigationAppItem />);

    for (const [app, name] of [
      ['gaia_gps', 'Gaia GPS'],
      ['here_wego', 'HERE WeGo'],
      ['mapquest', 'MapQuest'],
      ['onx_offroad', 'onX Offroad'],
      ['organic_maps', 'Organic Maps'],
      ['osmand', 'OsmAnd'],
    ]) {
      expect(screen.getByTestId(`navigation-app-option-${app}`)).toBeTruthy();
      expect(screen.getByText(name)).toBeTruthy();
    }
  });

  it('does not offer the mobile-only navigation apps on the web', () => {
    mockPlatform = 'web';

    render(<NavigationAppItem />);

    expect(screen.getByTestId('navigation-app-option-waze')).toBeTruthy();
    expect(screen.queryByTestId('navigation-app-option-osmand')).toBeNull();
    expect(screen.queryByTestId('navigation-app-option-here_wego')).toBeNull();
  });

  it('saves a mobile-only navigation app', () => {
    render(<NavigationAppItem />);

    fireEvent.press(screen.getByTestId('navigation-app-option-organic_maps'));

    expect(mockSetNavigationApp).toHaveBeenCalledWith('organic_maps');
  });

  it('shows the saved choice', () => {
    mockNavigationApp = 'waze';

    render(<NavigationAppItem />);

    expect(screen.getByTestId('navigation-app-select').props.accessibilityValue).toEqual({ text: 'waze' });
    expect(screen.getByTestId('navigation-app-selected-label').props.children).toBe('Waze');
  });

  it('saves the chosen app', () => {
    render(<NavigationAppItem />);

    fireEvent.press(screen.getByTestId('navigation-app-option-waze'));

    expect(mockSetNavigationApp).toHaveBeenCalledWith('waze');
  });

  it('ignores a value that is not an option on this platform', () => {
    render(<NavigationAppItem />);

    // Apple Maps is iOS-only, so on Android the change is dropped rather than saved.
    act(() => {
      mockOnValueChange?.('apple_maps');
    });

    expect(mockSetNavigationApp).not.toHaveBeenCalled();
  });
});
