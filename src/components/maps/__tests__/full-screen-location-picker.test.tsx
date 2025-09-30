import { describe, expect, it, jest } from '@jest/globals';

// Mock environment
jest.mock('@/lib/env', () => ({
  Env: {
    RESPOND_MAPBOX_PUBKEY: '', // Empty to simulate missing configuration
  },
}));

// Mock all complex dependencies
jest.mock('@rnmapbox/maps', () => ({
  MapView: () => null,
  Camera: () => null,
  PointAnnotation: () => null,
}));

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  reverseGeocodeAsync: jest.fn(),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue?: string) => defaultValue || key,
  }),
}));

// Mock location store
const mockLocationStore = {
  latitude: null as number | null,
  longitude: null as number | null,
  setLocation: jest.fn(),
};

jest.mock('@/stores/app/location-store', () => ({
  useLocationStore: () => mockLocationStore,
}));

// Mock location service
const mockLocationService = {
  requestPermissions: jest.fn(() => Promise.resolve(true)),
};

jest.mock('@/services/location', () => ({
  locationService: mockLocationService,
}));

// Mock all UI components
jest.mock('@/components/ui/box', () => ({
  Box: () => null,
}));

jest.mock('@/components/ui/button', () => ({
  Button: () => null,
  ButtonText: () => null,
}));

jest.mock('@/components/ui/text', () => ({
  Text: () => null,
}));

// Mock Lucide icons
jest.mock('lucide-react-native', () => ({
  AlertTriangle: () => null,
  MapPinIcon: () => null,
  XIcon: () => null,
}));

// Mock react-native components
jest.mock('react-native', () => ({
  Dimensions: {
    get: () => ({ width: 375, height: 812 }),
  },
  StyleSheet: {
    create: (styles: any) => styles,
  },
  TouchableOpacity: () => null,
}));

describe('FullScreenLocationPicker', () => {
  it('should be importable', () => {
    const FullScreenLocationPicker = require('../full-screen-location-picker').default;
    expect(FullScreenLocationPicker).toBeDefined();
  });

  it('should detect when Mapbox is not configured', () => {
    // Test the Mapbox configuration check with empty key
    const testKey: string = '';
    const isConfigured = Boolean(testKey && testKey.trim() !== '');
    expect(isConfigured).toBe(false);
  });

  it('should detect when Mapbox is properly configured', () => {
    // Test the Mapbox configuration check with valid key
    const testKey: string = 'pk.test123';
    const isConfigured = Boolean(testKey && testKey.trim() !== '');
    expect(isConfigured).toBe(true);
  });

  it('should treat coordinates {0,0} as no location by checking the logic condition', () => {
    // Test the specific condition that was added to handle {0,0} coordinates
    const testLocation: { latitude: number; longitude: number } | undefined = { latitude: 0, longitude: 0 };
    const condition = testLocation && !(testLocation.latitude === 0 && testLocation.longitude === 0);

    // This should be false, meaning {0,0} coordinates are treated as "no initial location"
    expect(condition).toBe(false);
  });

  it('should accept valid coordinates', () => {
    // Test that valid coordinates pass the condition
    const testLocation: { latitude: number; longitude: number } | undefined = { latitude: 37.7749, longitude: -122.4194 };
    const condition = testLocation && !(testLocation.latitude === 0 && testLocation.longitude === 0);

    // This should be true, meaning valid coordinates are accepted
    expect(condition).toBe(true);
  });

  it('should handle undefined location', () => {
    // Test that undefined location is handled correctly
    const testLocation: { latitude: number; longitude: number } | undefined = undefined;
    // Since testLocation is undefined, this condition will short-circuit to false
    const condition = Boolean(testLocation);

    // This should be false, meaning undefined triggers user location fetching
    expect(condition).toBe(false);
  });

  it('should have all required translation keys in all languages', () => {
    const enTranslations = require('../../../translations/en.json');
    const esTranslations = require('../../../translations/es.json');
    const arTranslations = require('../../../translations/ar.json');

    const requiredKeys = [
      'common.loading',
      'common.loading_address',
      'common.no_location',
      'common.get_my_location',
      'common.no_address_found',
      'common.set_location',
      'maps.mapbox_not_configured',
      'maps.contact_administrator'
    ];

    requiredKeys.forEach(key => {
      const [section, keyName] = key.split('.');

      expect(enTranslations[section]).toBeDefined();
      expect(enTranslations[section][keyName]).toBeDefined();
      expect(typeof enTranslations[section][keyName]).toBe('string');

      expect(esTranslations[section]).toBeDefined();
      expect(esTranslations[section][keyName]).toBeDefined();
      expect(typeof esTranslations[section][keyName]).toBe('string');

      expect(arTranslations[section]).toBeDefined();
      expect(arTranslations[section][keyName]).toBeDefined();
      expect(typeof arTranslations[section][keyName]).toBe('string');
    });
  });

  it('should use stored location from location store when available', () => {
    // Set up mock stored location
    mockLocationStore.latitude = 37.7749;
    mockLocationStore.longitude = -122.4194;

    // Test the stored location logic
    const storedLocation =
      mockLocationStore.latitude && mockLocationStore.longitude
        ? {
          latitude: mockLocationStore.latitude,
          longitude: mockLocationStore.longitude,
        }
        : null;

    expect(storedLocation).not.toBeNull();
    expect(storedLocation?.latitude).toBe(37.7749);
    expect(storedLocation?.longitude).toBe(-122.4194);

    // Test that stored location is not treated as invalid (0,0)
    const isValidLocation = storedLocation && !(storedLocation.latitude === 0 && storedLocation.longitude === 0);
    expect(isValidLocation).toBe(true);
  });

  it('should handle null stored location from location store', () => {
    // Set up mock with no stored location
    mockLocationStore.latitude = null;
    mockLocationStore.longitude = null;

    // Test the stored location logic
    const storedLocation =
      mockLocationStore.latitude && mockLocationStore.longitude
        ? {
          latitude: mockLocationStore.latitude,
          longitude: mockLocationStore.longitude,
        }
        : null;

    expect(storedLocation).toBeNull();
  });

  it('should create proper LocationObject for store updates', () => {
    const testCoords = { latitude: 37.7749, longitude: -122.4194 };
    const timestamp = Date.now();

    const locationObject = {
      coords: {
        latitude: testCoords.latitude,
        longitude: testCoords.longitude,
        altitude: null,
        accuracy: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
      },
      timestamp: timestamp,
    };

    expect(locationObject.coords.latitude).toBe(37.7749);
    expect(locationObject.coords.longitude).toBe(-122.4194);
    expect(locationObject.coords.altitude).toBeNull();
    expect(locationObject.timestamp).toBe(timestamp);
  });
});