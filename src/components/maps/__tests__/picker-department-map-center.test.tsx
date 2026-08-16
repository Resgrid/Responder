import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { act, render, waitFor } from '@testing-library/react-native';
import React from 'react';

import { FALLBACK_MAP_CENTER } from '@/lib/map-center';
import { type GetConfigResultData } from '@/models/v4/configs/getConfigResultData';
import { useCoreStore } from '@/stores/app/core-store';

/**
 * Both pickers open on the department's configured map center. Config is fetched during startup and
 * regularly lands after a picker has already mounted, so these cover the case that a one-shot read
 * gets wrong: the camera must follow the config in, rather than staying on the bootstrap fallback.
 */

const mockCameraProps: Record<string, unknown>[] = [];

jest.mock('@rnmapbox/maps', () => {
  const ReactModule = require('react');
  const { View } = require('react-native');

  return {
    __esModule: true,
    default: {
      MapView: ({ children }: { children?: React.ReactNode }) => ReactModule.createElement(View, null, children),
      Camera: (props: Record<string, unknown>) => {
        mockCameraProps.push(props);
        return null;
      },
      PointAnnotation: ({ children }: { children?: React.ReactNode }) => ReactModule.createElement(View, null, children),
    },
  };
});

jest.mock('@/lib/env', () => ({
  Env: { RESPOND_MAPBOX_PUBKEY: 'pk.test' },
}));

// A real store, so the reactivity under test is the component's and not the mock's.
jest.mock('@/stores/app/core-store', () => {
  const { create } = require('zustand');

  return { useCoreStore: create(() => ({ config: null })) };
});

jest.mock('@/stores/app/location-store', () => ({
  useLocationStore: (selector: (state: { latitude: number | null; longitude: number | null; setLocation: () => void }) => unknown) =>
    selector({ latitude: null, longitude: null, setLocation: () => undefined }),
}));

jest.mock('@/services/location', () => ({
  locationService: { requestPermissions: jest.fn(async () => false) },
}));

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(async () => ({ status: 'denied' })),
  getCurrentPositionAsync: jest.fn(async () => {
    throw new Error('no location in tests');
  }),
  reverseGeocodeAsync: jest.fn(async () => []),
  Accuracy: { Balanced: 3 },
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, fallback?: string) => fallback ?? key }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('lucide-react-native', () => ({
  AlertTriangle: () => null,
  MapPinIcon: () => null,
  XIcon: () => null,
}));

jest.mock('@/components/ui/box', () => {
  const ReactModule = require('react');
  const { View } = require('react-native');

  return { Box: ({ children }: { children?: React.ReactNode }) => ReactModule.createElement(View, null, children) };
});

jest.mock('@/components/ui/button', () => {
  const ReactModule = require('react');
  const { View } = require('react-native');

  return {
    Button: ({ children }: { children?: React.ReactNode }) => ReactModule.createElement(View, null, children),
    ButtonText: ({ children }: { children?: React.ReactNode }) => ReactModule.createElement(View, null, children),
  };
});

jest.mock('@/components/ui/text', () => {
  const ReactModule = require('react');
  const { Text } = require('react-native');

  return { Text: ({ children }: { children?: React.ReactNode }) => ReactModule.createElement(Text, null, children) };
});

// A Belgian department, which is the case that made this matter: a stale read left them on the
// bootstrap fallback in Nevada.
const CONFIGURED_CENTER: GetConfigResultData = {
  MapCenterLatitude: 50.8503,
  MapCenterLongitude: 4.3517,
  MapCenterZoomLevel: 12,
  W3WKey: '',
  GoogleMapsKey: '',
  LoggingKey: '',
  MapUrl: '',
  MapAttribution: '',
  OpenWeatherApiKey: '',
  NovuBackendApiUrl: '',
  NovuSocketUrl: '',
  NovuApplicationId: '',
  EventingUrl: '',
  DirectionsMapKey: '',
  PersonnelLocationStaleSeconds: 0,
  UnitLocationStaleSeconds: 0,
  PersonnelLocationMinMeters: 0,
  UnitLocationMinMeters: 0,
  AnalyticsApiKey: '',
  AnalyticsHost: '',
};

const lastCamera = () => mockCameraProps[mockCameraProps.length - 1];

describe('location pickers - department map center', () => {
  beforeEach(() => {
    mockCameraProps.length = 0;
    useCoreStore.setState({ config: null });
  });

  it('should move FullScreenLocationPicker to the configured center and zoom when config lands after mount', async () => {
    const FullScreenLocationPicker = require('../full-screen-location-picker').default;

    render(<FullScreenLocationPicker onLocationSelected={jest.fn()} onClose={jest.fn()} />);

    await waitFor(() => expect(mockCameraProps.length).toBeGreaterThan(0));

    // Before config arrives the map sits on the bootstrap fallback, not a hardcoded zoom.
    expect(lastCamera()).toMatchObject({
      zoomLevel: FALLBACK_MAP_CENTER.zoomLevel,
      centerCoordinate: [FALLBACK_MAP_CENTER.longitude, FALLBACK_MAP_CENTER.latitude],
    });

    act(() => {
      useCoreStore.setState({ config: CONFIGURED_CENTER });
    });

    await waitFor(() =>
      expect(lastCamera()).toMatchObject({
        zoomLevel: CONFIGURED_CENTER.MapCenterZoomLevel,
        centerCoordinate: [CONFIGURED_CENTER.MapCenterLongitude, CONFIGURED_CENTER.MapCenterLatitude],
      })
    );
  });

  it('should move LocationPicker to the configured center and zoom when config lands after mount', async () => {
    const LocationPicker = require('../location-picker').default;

    render(<LocationPicker onLocationSelected={jest.fn()} />);

    await waitFor(() => expect(mockCameraProps.length).toBeGreaterThan(0));

    expect(lastCamera()).toMatchObject({
      zoomLevel: FALLBACK_MAP_CENTER.zoomLevel,
      centerCoordinate: [FALLBACK_MAP_CENTER.longitude, FALLBACK_MAP_CENTER.latitude],
    });

    act(() => {
      useCoreStore.setState({ config: CONFIGURED_CENTER });
    });

    await waitFor(() =>
      expect(lastCamera()).toMatchObject({
        zoomLevel: CONFIGURED_CENTER.MapCenterZoomLevel,
        centerCoordinate: [CONFIGURED_CENTER.MapCenterLongitude, CONFIGURED_CENTER.MapCenterLatitude],
      })
    );
  });

  it('should keep a department on its own center rather than the fallback', async () => {
    useCoreStore.setState({ config: CONFIGURED_CENTER });

    const LocationPicker = require('../location-picker').default;

    render(<LocationPicker onLocationSelected={jest.fn()} />);

    await waitFor(() => expect(mockCameraProps.length).toBeGreaterThan(0));

    expect(lastCamera()).toMatchObject({
      zoomLevel: CONFIGURED_CENTER.MapCenterZoomLevel,
      centerCoordinate: [CONFIGURED_CENTER.MapCenterLongitude, CONFIGURED_CENTER.MapCenterLatitude],
    });
    expect(lastCamera()?.centerCoordinate).not.toEqual([FALLBACK_MAP_CENTER.longitude, FALLBACK_MAP_CENTER.latitude]);
  });
});
