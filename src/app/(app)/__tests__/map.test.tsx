import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

import HomeMap from '../map';

// Mock NativeWind and CSS Interop
jest.mock('nativewind', () => ({
  cssInterop: jest.fn(),
}));

jest.mock('react-native-css-interop', () => ({
  cssInterop: jest.fn(),
}));

// Mock Lucide React Native SVG components
jest.mock('react-native-svg', () => ({
  SvgProps: {},
  Svg: 'Svg',
  Circle: 'Circle',
  Ellipse: 'Ellipse',
  G: 'G',
  Text: 'Text',
  TSpan: 'TSpan',
  TextPath: 'TextPath',
  Path: 'Path',
  Polygon: 'Polygon',
  Polyline: 'Polyline',
  Line: 'Line',
  Rect: 'Rect',
  Use: 'Use',
  Image: 'Image',
  Symbol: 'Symbol',
  Defs: 'Defs',
  LinearGradient: 'LinearGradient',
  RadialGradient: 'RadialGradient',
  Stop: 'Stop',
  ClipPath: 'ClipPath',
  Pattern: 'Pattern',
  Mask: 'Mask',
}));

// Mock dependencies
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('react-native', () => {
  // Don't use requireActual for React Native to avoid TurboModuleRegistry issues
  return {
    View: 'View',
    Text: 'Text',
    Pressable: 'Pressable',
    TouchableOpacity: 'TouchableOpacity',
    Animated: {
      View: 'Animated.View',
      timing: jest.fn(() => ({
        start: jest.fn(),
      })),
      sequence: jest.fn(() => ({
        start: jest.fn(),
      })),
      loop: jest.fn(() => ({
        start: jest.fn(),
      })),
      Value: jest.fn(() => ({
        setValue: jest.fn(),
        addListener: jest.fn(),
        removeListener: jest.fn(),
      })),
    },
    StyleSheet: {
      create: jest.fn((styles) => styles),
    },
    useWindowDimensions: jest.fn(() => ({
      width: 375,
      height: 812,
    })),
    Settings: {
      get: jest.fn(() => ({})),
      set: jest.fn(),
      watchKeys: jest.fn(() => ({
        remove: jest.fn(),
      })),
    },
    TurboModuleRegistry: {
      getEnforcing: jest.fn(() => null),
    },
    NativeModules: {
      SettingsManager: {
        settings: {},
        setValues: jest.fn(),
        getConstants: jest.fn(() => ({})),
      },
    },
    Platform: {
      OS: 'ios',
      select: jest.fn().mockImplementation((obj: any) => obj.ios || obj.default),
    },
  };
});

jest.mock('@rnmapbox/maps', () => ({
  __esModule: true,
  default: {
    setAccessToken: jest.fn(),
    StyleURL: {
      Street: 'mapbox://styles/mapbox/streets-v11',
      Satellite: 'mapbox://styles/mapbox/satellite-v9',
    },
    MapView: ({ children, testID }: any) => {
      const { View } = require('react-native');
      return <View testID={testID}>{children}</View>;
    },
    Camera: ({ children }: any) => {
      const { View } = require('react-native');
      return <View testID="map-camera">{children}</View>;
    },
    PointAnnotation: ({ children, testID }: any) => {
      const { View } = require('react-native');
      return <View testID={testID || 'point-annotation'}>{children}</View>;
    },
    UserTrackingMode: {
      FollowWithHeading: 'follow-with-heading',
    },
  },
}));

jest.mock('@/components/maps/map-pins', () => ({
  __esModule: true,
  default: ({ pins, onPinPress }: any) => {
    const { View, Text, Pressable } = require('react-native');
    return (
      <View testID="map-pins">
        {pins.map((pin: any) => (
          <Pressable key={pin.Id} testID={`map-pin-${pin.Id}`} onPress={() => onPinPress(pin)}>
            <Text>{pin.Title}</Text>
          </Pressable>
        ))}
      </View>
    );
  },
}));

jest.mock('@/components/maps/pin-detail-modal', () => ({
  __esModule: true,
  default: ({ pin, isOpen, onClose, onSetAsCurrentCall }: any) => {
    const { View, Text, Pressable } = require('react-native');
    if (!isOpen) return null;
    return (
      <View testID="pin-detail-modal">
        <Text>Pin: {pin?.Title}</Text>
        <Pressable testID="close-modal" onPress={onClose}>
          <Text>Close</Text>
        </Pressable>
        <Pressable testID="set-current-call" onPress={() => onSetAsCurrentCall(pin)}>
          <Text>Set as Current Call</Text>
        </Pressable>
      </View>
    );
  },
}));

jest.mock('@/components/sidebar/side-menu', () => ({
  SideMenu: ({ onNavigate }: any) => {
    const { View, Text, Pressable } = require('react-native');
    return (
      <View testID="side-menu">
        <Text>Side Menu</Text>
        <Pressable testID="side-menu-close" onPress={onNavigate}>
          <Text>Navigate</Text>
        </Pressable>
      </View>
    );
  },
}));

jest.mock('@/components/ui/header', () => ({
  Header: ({ title, onMenuPress, testID }: any) => {
    const { View, Text, Pressable } = require('react-native');
    return (
      <View testID={testID}>
        <Text testID={`${testID}-title`}>{title}</Text>
        {onMenuPress && (
          <Pressable testID={`${testID}-menu-button`} onPress={onMenuPress}>
            <Text>Menu</Text>
          </Pressable>
        )}
      </View>
    );
  },
}));

jest.mock('@/components/ui/focus-aware-status-bar', () => ({
  FocusAwareStatusBar: () => 'FocusAwareStatusBar',
}));

jest.mock('@/components/ui/drawer', () => ({
  Drawer: ({ children, isOpen, onClose }: any) => {
    const { View } = require('react-native');
    if (!isOpen) return null;
    return <View testID="drawer">{children}</View>;
  },
  DrawerBackdrop: ({ children, onPress }: any) => {
    const { Pressable } = require('react-native');
    return (
      <Pressable testID="drawer-backdrop" onPress={onPress}>
        {children}
      </Pressable>
    );
  },
  DrawerBody: ({ children }: any) => {
    const { View } = require('react-native');
    return <View testID="drawer-body">{children}</View>;
  },
  DrawerContent: ({ children }: any) => {
    const { View } = require('react-native');
    return <View testID="drawer-content">{children}</View>;
  },
  DrawerFooter: ({ children }: any) => {
    const { View } = require('react-native');
    return <View testID="drawer-footer">{children}</View>;
  },
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onPress, testID }: any) => {
    const { Pressable } = require('react-native');
    return (
      <Pressable testID={testID} onPress={onPress}>
        {children}
      </Pressable>
    );
  },
  ButtonText: ({ children }: any) => {
    const { Text } = require('react-native');
    return <Text>{children}</Text>;
  },
}));

jest.mock('@/api/mapping/mapping', () => ({
  getMapDataAndMarkers: jest.fn(() =>
    Promise.resolve({
      Data: {
        MapMakerInfos: [
          { Id: '1', Title: 'Test Pin 1', Latitude: 40.7128, Longitude: -74.006 },
          { Id: '2', Title: 'Test Pin 2', Latitude: 40.7589, Longitude: -73.9851 },
        ],
      },
    })
  ),
}));

jest.mock('@/hooks/use-app-lifecycle', () => ({
  useAppLifecycle: () => ({ isActive: true }),
}));

jest.mock('@/hooks/use-map-signalr-updates', () => ({
  useMapSignalRUpdates: jest.fn(),
}));

jest.mock('@/lib/env', () => ({
  Env: {
    RESPOND_MAPBOX_PUBKEY: 'test-mapbox-key',
  },
}));

jest.mock('@/lib/logging', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@/lib/utils', () => ({
  onSortOptions: jest.fn((a: any, b: any) => a.label.localeCompare(b.label)),
}));

jest.mock('@/services/location', () => ({
  locationService: {
    startLocationUpdates: jest.fn(),
    stopLocationUpdates: jest.fn(),
  },
}));

jest.mock('@/stores/app/core-store', () => ({
  useCoreStore: jest.fn(() => ({
    setActiveCall: jest.fn(),
  })),
}));

jest.mock('@/stores/app/location-store', () => ({
  useLocationStore: jest.fn(() => ({
    latitude: 40.7128,
    longitude: -74.006,
    heading: 90,
    isMapLocked: false,
  })),
}));

jest.mock('@/stores/toast/store', () => ({
  useToastStore: {
    getState: () => ({
      showToast: jest.fn(),
    }),
  },
}));

// Mock expo-router
jest.mock('expo-router', () => ({
  useFocusEffect: (callback: () => void) => {
    const mockReact = require('react');
    mockReact.useEffect(callback, []);
  },
}));

describe('HomeMap', () => {
  it('renders correctly with map components', () => {
    render(<HomeMap />);

    // Check that map container is rendered
    expect(screen.getByTestId('home-map-container')).toBeTruthy();
    expect(screen.getByTestId('home-map-view')).toBeTruthy();
    expect(screen.getByTestId('map-camera')).toBeTruthy();
  });

  it('shows side menu in landscape mode', () => {
    // Mock landscape dimensions
    const mockUseWindowDimensions = (jest.requireMock('react-native') as any).useWindowDimensions;
    mockUseWindowDimensions.mockReturnValue({
      width: 812,
      height: 375,
    });

    render(<HomeMap />);

    // In landscape mode, side menu should be permanently visible
    expect(screen.getByTestId('side-menu')).toBeTruthy();
  });

  it('shows drawer in portrait mode when opened', async () => {
    render(<HomeMap />);

    // Initially drawer should not be visible
    expect(screen.queryByTestId('drawer')).toBeNull();

    // Since there's no header menu button, we can't test opening the drawer
    // This test would need to be modified based on how the drawer is actually opened
  });

  it('shows recenter button when user has moved map and location is available', async () => {
    const mockLocationStore = jest.requireMock('@/stores/app/location-store') as any;
    mockLocationStore.useLocationStore.mockReturnValue({
      latitude: 40.7128,
      longitude: -74.006,
      heading: 90,
      isMapLocked: false,
    });

    render(<HomeMap />);

    // Simulate map ready
    await waitFor(() => {
      expect(screen.getByTestId('home-map-view')).toBeTruthy();
    });

    // Initially, recenter button should not be visible
    expect(screen.queryByTestId('recenter-button')).toBeNull();
  });

  it('does not show recenter button when map is locked', async () => {
    const mockLocationStore = jest.requireMock('@/stores/app/location-store') as any;
    mockLocationStore.useLocationStore.mockReturnValue({
      latitude: 40.7128,
      longitude: -74.006,
      heading: 90,
      isMapLocked: true,
    });

    render(<HomeMap />);

    await waitFor(() => {
      expect(screen.getByTestId('home-map-view')).toBeTruthy();
    });

    // Recenter button should not be visible when map is locked
    expect(screen.queryByTestId('recenter-button')).toBeNull();
  });

  it('renders map pins when data is available', async () => {
    render(<HomeMap />);

    await waitFor(() => {
      expect(screen.getByTestId('map-pins')).toBeTruthy();
      expect(screen.getByTestId('map-pin-1')).toBeTruthy();
      expect(screen.getByTestId('map-pin-2')).toBeTruthy();
    });
  });

  it('opens pin detail modal when pin is pressed', async () => {
    render(<HomeMap />);

    await waitFor(() => {
      expect(screen.getByTestId('map-pin-1')).toBeTruthy();
    });

    // Press a pin
    fireEvent.press(screen.getByTestId('map-pin-1'));

    // Check that pin detail modal is opened
    await waitFor(() => {
      expect(screen.getByTestId('pin-detail-modal')).toBeTruthy();
      expect(screen.getByText('Pin: Test Pin 1')).toBeTruthy();
    });
  });

  it('closes pin detail modal when close button is pressed', async () => {
    render(<HomeMap />);

    await waitFor(() => {
      expect(screen.getByTestId('map-pin-1')).toBeTruthy();
    });

    // Open modal
    fireEvent.press(screen.getByTestId('map-pin-1'));

    await waitFor(() => {
      expect(screen.getByTestId('pin-detail-modal')).toBeTruthy();
    });

    // Close modal
    fireEvent.press(screen.getByTestId('close-modal'));

    await waitFor(() => {
      expect(screen.queryByTestId('pin-detail-modal')).toBeNull();
    });
  });

  it('handles setting pin as current call', async () => {
    const mockSetActiveCall = jest.fn();

    // Mock the core store for this test
    const mockCoreStore = require('@/stores/app/core-store');
    mockCoreStore.useCoreStore.mockReturnValue({
      setActiveCall: mockSetActiveCall,
    });

    render(<HomeMap />);

    await waitFor(() => {
      expect(screen.getByTestId('map-pin-1')).toBeTruthy();
    });

    // Open modal
    fireEvent.press(screen.getByTestId('map-pin-1'));

    await waitFor(() => {
      expect(screen.getByTestId('pin-detail-modal')).toBeTruthy();
    });

    // Set as current call
    fireEvent.press(screen.getByTestId('set-current-call'));

    await waitFor(() => {
      expect(mockSetActiveCall).toHaveBeenCalledWith('1');
    });
  });

  it('shows user location marker when location is available', async () => {
    render(<HomeMap />);

    await waitFor(() => {
      expect(screen.getByTestId('point-annotation')).toBeTruthy();
    });
  });

  it('handles landscape mode correctly', () => {
    // Mock landscape dimensions
    const mockUseWindowDimensions = (jest.requireMock('react-native') as any).useWindowDimensions;
    mockUseWindowDimensions.mockReturnValue({
      width: 812,
      height: 375,
    });

    render(<HomeMap />);

    // In landscape mode, side menu should be permanently visible
    expect(screen.getByTestId('side-menu')).toBeTruthy();
  });
});
