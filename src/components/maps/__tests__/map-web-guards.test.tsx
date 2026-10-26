import { render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Platform } from 'react-native';

import FullScreenMapModal from '../full-screen-map-modal';
import { MapPanel } from '../map-panel';

// On the dev-only `yarn web` target, @rnmapbox/maps resolves to its web build, which exports only MapView, Camera,
// MarkerView and Logger (plus setAccessToken, StyleURL, LineJoin). Everything else (PointAnnotation, UserTrackingMode,
// ShapeSource, FillLayer, LineLayer, UserLocation) is undefined there, and touching it crashed the map. This mock
// exposes exactly the web exports and records any other component/enum the code under test reaches for.
const mockMissingMapboxApis: string[] = [];
const mockCameraProps: Record<string, unknown>[] = [];

jest.mock('@rnmapbox/maps', () => {
  const React = require('react');
  const { View } = require('react-native');

  const webExports: Record<string, unknown> = {
    MapView: ({ children }: { children?: React.ReactNode }) => React.createElement(View, { testID: 'web-map-view' }, children),
    Camera: React.forwardRef((props: Record<string, unknown>, _ref: unknown) => {
      mockCameraProps.push(props);
      return null;
    }),
    MarkerView: ({ children, id }: { children?: React.ReactNode; id?: string }) => React.createElement(View, { testID: `web-marker-view-${id ?? 'pin'}` }, children),
    Logger: { setLogCallback: jest.fn() },
    LineJoin: { Bevel: 'bevel', Round: 'round', Miter: 'miter' },
    StyleURL: { Street: 'mapbox://styles/mapbox/streets-v11', Satellite: 'mapbox://styles/mapbox/satellite-v9' },
    setAccessToken: jest.fn(),
  };

  const recordingExports = new Proxy(webExports, {
    get(target, prop) {
      // Components and enums are PascalCase; record any the web build does not have.
      if (typeof prop === 'string' && /^[A-Z]/.test(prop) && !(prop in target)) {
        mockMissingMapboxApis.push(prop);
      }
      return target[prop as string];
    },
  });

  return { __esModule: true, default: recordingExports };
});

jest.mock('expo-image', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    Image: (props: Record<string, unknown>) => React.createElement(View, { ...props, testID: 'expo-image' }),
  };
});

jest.mock('expo-router', () => ({
  useFocusEffect: (callback: () => void | (() => void)) => {
    const mockReact = require('react');
    mockReact.useEffect(callback, []);
  },
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('lucide-react-native', () => ({
  InfoIcon: () => null,
  NavigationIcon: () => null,
  XIcon: () => null,
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@/lib/env', () => ({
  Env: { RESPOND_MAPBOX_PUBKEY: 'pk.test' },
}));

jest.mock('@/lib/map-style', () => ({
  useDepartmentMapStyle: () => 'mapbox://styles/mapbox/streets-v12',
}));

jest.mock('@/lib/logging', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('@/hooks/use-analytics', () => ({
  useAnalytics: () => ({ trackEvent: jest.fn() }),
}));

jest.mock('@/hooks/use-map-signalr-updates', () => ({
  useMapSignalRUpdates: jest.fn(),
}));

// applySnapshot must be stable per mount like the real hook, or the initial-fetch effect would rerun every render.
jest.mock('@/hooks/use-map-live-locations', () => {
  const results = new WeakMap<object, { applySnapshot: (pins: unknown[]) => void; refreshRequestedAt: number }>();
  return {
    useMapLiveLocations: (setPins: (pins: unknown[]) => void) => {
      let result = results.get(setPins);
      if (!result) {
        result = { applySnapshot: (pins: unknown[]) => setPins(pins), refreshRequestedAt: 0 };
        results.set(setPins, result);
      }
      return result;
    },
  };
});

const ROLE_ICON_URL = 'https://api.resgrid.dev/api/v4/TypeIcons/role-paramedic';

jest.mock('@/api/mapping/mapping', () => ({
  getMapDataAndMarkers: jest.fn(() =>
    Promise.resolve({
      Data: {
        MapMakerInfos: [
          { Id: 'pabc', Title: 'Jane Medic', Latitude: 40.7589, Longitude: -73.9851, Type: 3, ImagePath: 'Person_RespondingCall', InfoWindowContent: '', Color: '', zIndex: '', IconUrl: 'https://api.resgrid.dev/api/v4/TypeIcons/role-paramedic' },
          { Id: 'u7', Title: 'Medic 7', Latitude: 40.7489, Longitude: -73.9857, Type: 1, ImagePath: 'ambulance', InfoWindowContent: '', Color: '', zIndex: '' },
        ],
      },
    })
  ),
}));

jest.mock('@/components/common/loading', () => ({
  Loading: () => null,
}));

jest.mock('../pin-detail-modal', () => ({
  __esModule: true,
  default: () => null,
}));

// Locked to the user's location, so the panel follows the user (the path that used UserTrackingMode).
jest.mock('@/stores/app/location-store', () => {
  const state = { latitude: 40.7128, longitude: -74.006, heading: 90, isMapLocked: true };
  return { useLocationStore: (selector: (s: typeof state) => unknown) => selector(state) };
});

jest.mock('@/stores/calls/active-call-store', () => ({
  useActiveCallStore: { getState: () => ({ setActiveCallById: jest.fn() }) },
}));

jest.mock('@/stores/toast/store', () => ({
  useToastStore: { getState: () => ({ showToast: jest.fn() }) },
}));

jest.mock('@/stores/security/store', () => ({
  securityStore: (selector: (s: { rights: { CanViewPII: boolean } }) => unknown) => selector({ rights: { CanViewPII: true } }),
}));

const HIDDEN = { includeHiddenElements: true };

describe('maps on the web build of @rnmapbox/maps', () => {
  const originalOS = Platform.OS;

  beforeEach(() => {
    mockMissingMapboxApis.length = 0;
    mockCameraProps.length = 0;
    (Platform as { OS: string }).OS = 'web';
  });

  afterEach(() => {
    (Platform as { OS: string }).OS = originalOS;
  });

  describe('MapPanel', () => {
    it('renders the user marker as a MarkerView, skips the tracking mode, and touches nothing the web build lacks', async () => {
      render(<MapPanel focusedPoi={null} />);

      await waitFor(() => expect(screen.getByText('Jane Medic')).toBeTruthy());

      expect(screen.getByTestId('web-map-view')).toBeTruthy();
      expect(screen.getByTestId('web-marker-view-userLocation')).toBeTruthy();
      expect(mockCameraProps.length).toBeGreaterThan(0);
      for (const props of mockCameraProps) {
        expect(props.followUserMode).toBeUndefined();
      }
      expect(mockMissingMapboxApis).toEqual([]);
    });

    it('draws map pins, including an uploaded personnel role icon, through MarkerView', async () => {
      render(<MapPanel focusedPoi={null} />);

      await waitFor(() => expect(screen.getByText('Medic 7')).toBeTruthy());

      expect(screen.getByTestId('expo-image', HIDDEN).props.source).toEqual({ uri: ROLE_ICON_URL });
      expect(screen.getAllByTestId('web-marker-view-pin-pabc').length).toBe(1);
      expect(screen.getAllByTestId('web-marker-view-pin-u7').length).toBe(1);
      expect(mockMissingMapboxApis).toEqual([]);
    });
  });

  describe('FullScreenMapModal', () => {
    const baseProps = { isOpen: true, onClose: jest.fn(), latitude: 39.7392, longitude: -104.9903 };

    it('marks the location with a MarkerView and skips the user-location puck', () => {
      render(<FullScreenMapModal {...baseProps} address="123 Main St" showUserLocation={true} />);

      expect(screen.getByTestId('web-map-view')).toBeTruthy();
      expect(screen.getByTestId('web-marker-view-callLocation')).toBeTruthy();
      expect(mockMissingMapboxApis).toEqual([]);
    });

    it('skips the polygon layers and centers on the location (the web Camera ignores bounds)', () => {
      const polygon: [number, number][] = [
        [-104.9, 39.7],
        [-104.8, 39.7],
        [-104.8, 39.8],
      ];

      render(<FullScreenMapModal {...baseProps} polygon={polygon} zoom={8} />);

      expect(screen.getByTestId('web-marker-view-callLocation')).toBeTruthy();
      expect(mockCameraProps.length).toBeGreaterThan(0);
      for (const props of mockCameraProps) {
        expect(props.bounds).toBeUndefined();
        expect(props.centerCoordinate).toEqual([-104.9903, 39.7392]);
        expect(props.zoomLevel).toBe(8);
      }
      expect(mockMissingMapboxApis).toEqual([]);
    });

    it('would reach for native-only APIs without the web guard (control: the same mock on a native platform)', () => {
      (Platform as { OS: string }).OS = 'ios';
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

      try {
        expect(() => render(<FullScreenMapModal {...baseProps} showUserLocation={true} />)).toThrow();
      } finally {
        consoleError.mockRestore();
      }

      expect(mockMissingMapboxApis).toEqual(expect.arrayContaining(['PointAnnotation']));
    });
  });
});
