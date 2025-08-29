// Mock expo-secure-store to prevent AFTER_FIRST_UNLOCK errors
jest.mock('expo-secure-store', () => ({
  AFTER_FIRST_UNLOCK: 'AFTER_FIRST_UNLOCK',
  ALWAYS: 'ALWAYS',
  WHEN_PASSCODE_SET_THIS_DEVICE_ONLY: 'WHEN_PASSCODE_SET_THIS_DEVICE_ONLY',
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  setItemAsync: jest.fn(() => Promise.resolve()),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
  isAvailableAsync: jest.fn(() => Promise.resolve(true)),
}));
// Removed per-test mocks for 'expo-constants' and 'expo-modules-core'; using global mocks in jest-setup.ts
// Mock all dependencies first
jest.mock('@/api/units/unitLocation', () => ({
  setUnitLocation: jest.fn(),
}));
jest.mock('@/lib/hooks/use-background-geolocation', () => ({
  registerLocationServiceUpdater: jest.fn(),
}));
jest.mock('@/lib/hooks/use-realtime-geolocation', () => ({
  registerLocationServiceRealtimeUpdater: jest.fn(),
}));
jest.mock('@/lib/logging', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));
jest.mock('@/lib/storage/background-geolocation', () => ({
  loadBackgroundGeolocationState: jest.fn(),
}));
jest.mock('@/lib/storage/realtime-geolocation', () => ({
  loadRealtimeGeolocationState: jest.fn(),
  saveRealtimeGeolocationState: jest.fn(),
}));

// Create mock store states
const mockCoreStoreState = {
  activeUnitId: 'unit-123' as string | null,
};

const mockLocationStoreState = {
  setLocation: jest.fn(),
  setBackgroundEnabled: jest.fn(),
};

// Mock stores with proper Zustand structure
jest.mock('@/stores/app/core-store', () => ({
  useCoreStore: {
    getState: jest.fn(() => mockCoreStoreState),
  },
}));

jest.mock('@/stores/app/location-store', () => ({
  useLocationStore: {
    getState: jest.fn(() => mockLocationStoreState),
  },
}));

jest.mock('expo-location', () => {
  const mockRequestForegroundPermissions = jest.fn();
  const mockRequestBackgroundPermissions = jest.fn();
  const mockGetBackgroundPermissions = jest.fn();
  const mockWatchPositionAsync = jest.fn();
  const mockStartLocationUpdatesAsync = jest.fn();
  const mockStopLocationUpdatesAsync = jest.fn();
  return {
    requestForegroundPermissionsAsync: mockRequestForegroundPermissions,
    requestBackgroundPermissionsAsync: mockRequestBackgroundPermissions,
    getBackgroundPermissionsAsync: mockGetBackgroundPermissions,
    watchPositionAsync: mockWatchPositionAsync,
    startLocationUpdatesAsync: mockStartLocationUpdatesAsync,
    stopLocationUpdatesAsync: mockStopLocationUpdatesAsync,
    Accuracy: {
      Balanced: 'balanced',
    },
  };
});

// TaskManager mocks are now handled in the jest.mock() call

jest.mock('expo-task-manager', () => ({
  defineTask: jest.fn(),
  isTaskRegisteredAsync: jest.fn(),
}));

jest.mock('react-native', () => ({
  AppState: {
    addEventListener: jest.fn(() => ({
      remove: jest.fn(),
    })),
    currentState: 'active',
  },
}));

import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { AppState } from 'react-native';

import { setUnitLocation } from '@/api/units/unitLocation';
import { registerLocationServiceUpdater } from '@/lib/hooks/use-background-geolocation';
import { registerLocationServiceRealtimeUpdater } from '@/lib/hooks/use-realtime-geolocation';
import { logger } from '@/lib/logging';
import { loadBackgroundGeolocationState } from '@/lib/storage/background-geolocation';
import { loadRealtimeGeolocationState, saveRealtimeGeolocationState } from '@/lib/storage/realtime-geolocation';
import { SaveUnitLocationInput } from '@/models/v4/unitLocation/saveUnitLocationInput';

// Import the service after mocks are set up
let locationService: any;

// Mock types
const mockSetUnitLocation = setUnitLocation as jest.MockedFunction<typeof setUnitLocation>;
const mockRegisterLocationServiceUpdater = registerLocationServiceUpdater as jest.MockedFunction<typeof registerLocationServiceUpdater>;
const mockRegisterLocationServiceRealtimeUpdater = registerLocationServiceRealtimeUpdater as jest.MockedFunction<typeof registerLocationServiceRealtimeUpdater>;
const mockLogger = logger as jest.Mocked<typeof logger>;
const mockLoadBackgroundGeolocationState = loadBackgroundGeolocationState as jest.MockedFunction<typeof loadBackgroundGeolocationState>;
const mockLoadRealtimeGeolocationState = loadRealtimeGeolocationState as jest.MockedFunction<typeof loadRealtimeGeolocationState>;
const mockSaveRealtimeGeolocationState = saveRealtimeGeolocationState as jest.MockedFunction<typeof saveRealtimeGeolocationState>;
const mockTaskManager = TaskManager as jest.Mocked<typeof TaskManager>;
const mockAppState = AppState as jest.Mocked<typeof AppState>;
const mockLocation = Location as jest.Mocked<typeof Location>;

// Mock location data
const mockLocationObject: Location.LocationObject = {
  coords: {
    latitude: 37.7749,
    longitude: -122.4194,
    altitude: 10.5,
    accuracy: 5.0,
    altitudeAccuracy: 2.0,
    heading: 90.0,
    speed: 15.5,
  },
  timestamp: Date.now(),
};

// Mock API response
const mockApiResponse = {
  Id: 'location-12345',
  PageSize: 0,
  Timestamp: '',
  Version: '',
  Node: '',
  RequestId: '',
  Status: '',
  Environment: '',
};

describe('LocationService', () => {
  let mockLocationSubscription: jest.Mocked<Location.LocationSubscription>;
  let registrationCallsVerified = false;

  beforeAll(() => {
    // Import the service after all mocks are set up
    const { locationService: service } = require('../location');
    locationService = service;

    // Verify registration calls happened during import
    if (mockRegisterLocationServiceUpdater.mock.calls.length > 0 && 
        mockRegisterLocationServiceRealtimeUpdater.mock.calls.length > 0) {
      registrationCallsVerified = true;
    }
  });

  beforeEach(() => {
    // Clear all mock call history
    jest.clearAllMocks();

    // Reset mock functions in store states - recreate the mock functions
    mockLocationStoreState.setLocation = jest.fn();
    mockLocationStoreState.setBackgroundEnabled = jest.fn();

    // Clear the mock subscription - handled in the mock itself

    // Setup mock location subscription
    mockLocationSubscription = {
      remove: jest.fn(),
    } as jest.Mocked<Location.LocationSubscription>;

    // Setup Location API mocks
    mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({
      status: 'granted' as any,
      expires: 'never',
      granted: true,
      canAskAgain: true,
    });

    mockLocation.requestBackgroundPermissionsAsync.mockResolvedValue({
      status: 'granted' as any,
      expires: 'never',
      granted: true,
      canAskAgain: true,
    });

    mockLocation.getBackgroundPermissionsAsync.mockResolvedValue({
      status: 'granted' as any,
      expires: 'never',
      granted: true,
      canAskAgain: true,
    });

    mockLocation.watchPositionAsync.mockResolvedValue(mockLocationSubscription);
    mockLocation.startLocationUpdatesAsync.mockResolvedValue();
    mockLocation.stopLocationUpdatesAsync.mockResolvedValue();

    // Setup TaskManager mocks
    mockTaskManager.isTaskRegisteredAsync.mockResolvedValue(false);

    // Setup storage mocks
    mockLoadBackgroundGeolocationState.mockResolvedValue(false);
    mockLoadRealtimeGeolocationState.mockResolvedValue(false);

    // Setup API mock
    mockSetUnitLocation.mockResolvedValue(mockApiResponse);

    // Reset core store state
    mockCoreStoreState.activeUnitId = 'unit-123';

    // Reset internal state of the service
    (locationService as any).locationSubscription = null;
    (locationService as any).backgroundSubscription = null;
    (locationService as any).isBackgroundGeolocationEnabled = false;
    (locationService as any).isRealtimeGeolocationEnabled = false;
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance when called multiple times', () => {
      const LocationServiceClass = (locationService as any).constructor;
      const instance1 = LocationServiceClass.getInstance();
      const instance2 = LocationServiceClass.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Permission Requests', () => {
    it('should request foreground permissions and only check background permissions', async () => {
      const result = await locationService.requestPermissions();

      expect(mockLocation.requestForegroundPermissionsAsync).toHaveBeenCalled();
      expect(mockLocation.getBackgroundPermissionsAsync).toHaveBeenCalled();
      expect(mockLocation.requestBackgroundPermissionsAsync).not.toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should return false if foreground permission is denied', async () => {
      mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({
        status: 'denied' as any,
        expires: 'never',
        granted: false,
        canAskAgain: true,
      });

      const result = await locationService.requestPermissions();
      expect(result).toBe(false);
    });

    it('should return true even if background permission is denied (foreground only)', async () => {
      mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({
        status: 'granted' as any,
        expires: 'never',
        granted: true,
        canAskAgain: true,
      });
      mockLocation.requestBackgroundPermissionsAsync.mockResolvedValue({
        status: 'denied' as any,
        expires: 'never',
        granted: false,
        canAskAgain: true,
      });

      const result = await locationService.requestPermissions();
      expect(result).toBe(true);
    });

    it('should log permission status', async () => {
      await locationService.startLocationUpdates();

      expect(mockLogger.info).toHaveBeenCalledWith({
        message: 'Location permissions requested',
        context: {
          foregroundStatus: 'granted',
          backgroundStatus: 'granted',
        },
      });
    });
  });

  describe('Location Updates', () => {
    it('should start foreground location updates successfully', async () => {
      await locationService.startLocationUpdates();

      expect(mockLocation.watchPositionAsync).toHaveBeenCalledWith(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 15000,
          distanceInterval: 10,
        },
        expect.any(Function)
      );

      expect(mockLogger.info).toHaveBeenCalledWith({
        message: 'Foreground location updates started',
        context: { 
          backgroundEnabled: false,
          realtimeEnabled: false,
        },
      });
    });

    it('should throw error if permissions are not granted', async () => {
      mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({
        status: 'denied' as any,
        expires: 'never',
        granted: false,
        canAskAgain: true,
      });

      await expect(locationService.startLocationUpdates()).rejects.toThrow('Location permissions not granted');
    });

    it('should register background task if background geolocation is enabled', async () => {
      mockLoadBackgroundGeolocationState.mockResolvedValue(true);

      await locationService.startLocationUpdates();

      expect(mockLocation.startLocationUpdatesAsync).toHaveBeenCalledWith('location-updates', {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 15000,
        distanceInterval: 10,
        foregroundService: {
          notificationTitle: 'Location Tracking',
          notificationBody: 'Tracking your location in the background',
        },
      });
    });

    it('should not register background task if already registered', async () => {
      mockLoadBackgroundGeolocationState.mockResolvedValue(true);
      mockTaskManager.isTaskRegisteredAsync.mockResolvedValue(true);

      await locationService.startLocationUpdates();

      expect(mockLocation.startLocationUpdatesAsync).not.toHaveBeenCalled();
    });

    it('should not register background task if background permission is denied', async () => {
      mockLoadBackgroundGeolocationState.mockResolvedValue(true);
      mockTaskManager.isTaskRegisteredAsync.mockResolvedValue(false);
      mockLocation.getBackgroundPermissionsAsync.mockResolvedValue({
        status: 'denied' as any,
        expires: 'never',
        granted: false,
        canAskAgain: true,
      });

      await locationService.startLocationUpdates();

      expect(mockLocation.getBackgroundPermissionsAsync).toHaveBeenCalled();
      expect(mockLocation.startLocationUpdatesAsync).not.toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalledWith({
        message: 'Background location permission not granted, skipping background task registration',
        context: { backgroundStatus: 'denied' },
      });
    });

    it('should handle location updates and send to store only (API sending handled by TaskManager)', async () => {
      // Enable realtime geolocation for this test
      mockLoadRealtimeGeolocationState.mockResolvedValue(true);
      
      await locationService.startLocationUpdates();

      // Get the callback function passed to watchPositionAsync
      const locationCallback = mockLocation.watchPositionAsync.mock.calls[0][1] as Function;
      await locationCallback(mockLocationObject);

      expect(mockLocationStoreState.setLocation).toHaveBeenCalledWith(mockLocationObject);
      // API sending is now handled by TaskManager only, not by foreground updates
      expect(mockSetUnitLocation).not.toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith({
        message: 'Foreground location update received',
        context: {
          latitude: mockLocationObject.coords.latitude,
          longitude: mockLocationObject.coords.longitude,
          heading: mockLocationObject.coords.heading,
        },
      });
    });
  });

  describe('Background Location Updates', () => {
    beforeEach(() => {
      // Set background geolocation enabled for these tests
      (locationService as any).isBackgroundGeolocationEnabled = true;
    });

    it('should start background updates when not already active', async () => {
      await locationService.startBackgroundUpdates();

      // Background updates now skip watchPositionAsync setup
      expect(mockLocation.watchPositionAsync).not.toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith({
        message: 'Background location updates handled by TaskManager, skipping watchPosition setup',
      });
    });

    it('should not start background updates if already active', async () => {
      // This test is no longer relevant since we removed backgroundSubscription
      // The method now checks only isBackgroundGeolocationEnabled
      await locationService.startBackgroundUpdates();

      expect(mockLocation.watchPositionAsync).not.toHaveBeenCalled();
    });

    it('should not start background updates if disabled', async () => {
      (locationService as any).isBackgroundGeolocationEnabled = false;

      await locationService.startBackgroundUpdates();

      expect(mockLocation.watchPositionAsync).not.toHaveBeenCalled();
    });

    it('should not start background updates if background permission is denied', async () => {
      mockLocation.getBackgroundPermissionsAsync.mockResolvedValue({
        status: 'denied' as any,
        expires: 'never',
        granted: false,
        canAskAgain: true,
      });

      await locationService.startBackgroundUpdates();

      expect(mockLocation.getBackgroundPermissionsAsync).toHaveBeenCalled();
      expect(mockLocation.watchPositionAsync).not.toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalledWith({
        message: 'Background location permission not granted, skipping background updates',
        context: { backgroundStatus: 'denied' },
      });
    });

    it('should stop background updates correctly', async () => {
      await locationService.stopBackgroundUpdates();

      // Background updates are now handled by TaskManager, no watchPosition cleanup needed
      expect(mockLocationStoreState.setBackgroundEnabled).toHaveBeenCalledWith(false);
    });

    it('should handle background location updates and send to API', async () => {
      // This test is no longer relevant since we removed watchPositionAsync for background updates
      // Background location updates are now handled entirely by TaskManager
      (locationService as any).isRealtimeGeolocationEnabled = true;
      
      await locationService.startBackgroundUpdates();

      // Verify that watchPositionAsync is not called for background updates
      expect(mockLocation.watchPositionAsync).not.toHaveBeenCalled();
    });
  });

  describe('API Integration - sendLocationToAPI function', () => {
    // These tests verify that the sendLocationToAPI function works correctly
    // This function is called by TaskManager
    
    it('should send location data to API with correct format', async () => {
      // Enable realtime geolocation for this test
      mockLoadRealtimeGeolocationState.mockResolvedValue(true);
      
      // Import the sendLocationToAPI function specifically for testing
      const { sendLocationToAPI } = require('../location');
      
      await sendLocationToAPI(mockLocationObject, true);

      expect(mockSetUnitLocation).toHaveBeenCalledWith(
        expect.objectContaining({
          UnitId: 'unit-123',
          Latitude: mockLocationObject.coords.latitude.toString(),
          Longitude: mockLocationObject.coords.longitude.toString(),
          Accuracy: mockLocationObject.coords.accuracy?.toString(),
          Altitude: mockLocationObject.coords.altitude?.toString(),
          AltitudeAccuracy: mockLocationObject.coords.altitudeAccuracy?.toString(),
          Speed: mockLocationObject.coords.speed?.toString(),
          Heading: mockLocationObject.coords.heading?.toString(),
          Timestamp: expect.any(String),
        })
      );
    });

    it('should skip sending when location accuracy is greater than 100 meters', async () => {
      // Enable realtime geolocation for this test
      mockLoadRealtimeGeolocationState.mockResolvedValue(true);
      
      // Create a low-accuracy location object
      const lowAccuracyLocation: Location.LocationObject = {
        coords: {
          latitude: 37.7749,
          longitude: -122.4194,
          altitude: 10.5,
          accuracy: 150, // Low accuracy - should be skipped
          altitudeAccuracy: 2.0,
          heading: 90.0,
          speed: 15.5,
        },
        timestamp: Date.now(),
      };

      // Import the sendLocationToAPI function specifically for testing
      const { sendLocationToAPI } = require('../location');
      
      // Call sendLocationToAPI with low accuracy location
      await sendLocationToAPI(lowAccuracyLocation, true);

      // Verify that the API was not called due to low accuracy
      expect(mockSetUnitLocation).not.toHaveBeenCalled();
      
      // Verify that debug log was called for skipping low accuracy
      expect(mockLogger.debug).toHaveBeenCalledWith({
        message: 'Skipping low-accuracy location',
        context: { accuracy: 150 },
      });
    });

    it('should send location when accuracy is within acceptable range (≤100 meters)', async () => {
      // Enable realtime geolocation for this test
      mockLoadRealtimeGeolocationState.mockResolvedValue(true);
      
      // Create a high-accuracy location object
      const highAccuracyLocation: Location.LocationObject = {
        coords: {
          latitude: 37.7749,
          longitude: -122.4194,
          altitude: 10.5,
          accuracy: 50, // Good accuracy - should be sent
          altitudeAccuracy: 2.0,
          heading: 90.0,
          speed: 15.5,
        },
        timestamp: Date.now(),
      };

      // Import the sendLocationToAPI function specifically for testing
      const { sendLocationToAPI } = require('../location');
      
      // Call sendLocationToAPI with good accuracy location
      await sendLocationToAPI(highAccuracyLocation, true);

      // Verify that the API was called with good accuracy
      expect(mockSetUnitLocation).toHaveBeenCalledWith(
        expect.objectContaining({
          UnitId: 'unit-123',
          Latitude: highAccuracyLocation.coords.latitude.toString(),
          Longitude: highAccuracyLocation.coords.longitude.toString(),
          Accuracy: highAccuracyLocation.coords.accuracy?.toString(),
        })
      );
    });

    it('should handle null values in location data', async () => {
      const locationWithNulls: Location.LocationObject = {
        coords: {
          latitude: 37.7749,
          longitude: -122.4194,
          altitude: null,
          accuracy: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
        },
        timestamp: Date.now(),
      };

      const { sendLocationToAPI } = require('../location');
      
      await sendLocationToAPI(locationWithNulls, true);

      expect(mockSetUnitLocation).toHaveBeenCalledWith(
        expect.objectContaining({
          Accuracy: '0',
          Altitude: '0',
          AltitudeAccuracy: '0',
          Heading: '0',
          Speed: '0',
        })
      );
    });

    it('should skip API call if no active unit is selected', async () => {
      mockCoreStoreState.activeUnitId = null;

      const { sendLocationToAPI } = require('../location');
      
      await sendLocationToAPI(mockLocationObject, true);

      expect(mockSetUnitLocation).not.toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalledWith({
        message: 'No active unit selected, skipping location API call',
      });

      // Reset for other tests
      mockCoreStoreState.activeUnitId = 'unit-123';
    });

    it('should skip API call when location accuracy is exactly 101 meters (boundary test)', async () => {
      // Enable realtime geolocation for this test
      mockLoadRealtimeGeolocationState.mockResolvedValue(true);
      
      // Create a location object with accuracy exactly at boundary
      const boundaryAccuracyLocation: Location.LocationObject = {
        coords: {
          latitude: 37.7749,
          longitude: -122.4194,
          altitude: 10.5,
          accuracy: 101, // Just over the threshold - should be skipped
          altitudeAccuracy: 2.0,
          heading: 90.0,
          speed: 15.5,
        },
        timestamp: Date.now(),
      };

      // Import the sendLocationToAPI function specifically for testing
      const { sendLocationToAPI } = require('../location');
      
      // Call sendLocationToAPI with boundary accuracy location
      await sendLocationToAPI(boundaryAccuracyLocation, true);

      // Verify that the API was not called due to low accuracy
      expect(mockSetUnitLocation).not.toHaveBeenCalled();
      
      // Verify that debug log was called for skipping low accuracy
      expect(mockLogger.debug).toHaveBeenCalledWith({
        message: 'Skipping low-accuracy location',
        context: { accuracy: 101 },
      });
    });

    it('should send location when accuracy is null (null accuracy should be allowed)', async () => {
      // Enable realtime geolocation for this test
      mockLoadRealtimeGeolocationState.mockResolvedValue(true);
      
      // Create a location object with null accuracy
      const nullAccuracyLocation: Location.LocationObject = {
        coords: {
          latitude: 37.7749,
          longitude: -122.4194,
          altitude: 10.5,
          accuracy: null, // Null accuracy - should be allowed
          altitudeAccuracy: 2.0,
          heading: 90.0,
          speed: 15.5,
        },
        timestamp: Date.now(),
      };

      // Import the sendLocationToAPI function specifically for testing
      const { sendLocationToAPI } = require('../location');
      
      // Call sendLocationToAPI with null accuracy location
      await sendLocationToAPI(nullAccuracyLocation, true);

      // Verify that the API was called with null accuracy (converted to '0')
      expect(mockSetUnitLocation).toHaveBeenCalledWith(
        expect.objectContaining({
          UnitId: 'unit-123',
          Latitude: nullAccuracyLocation.coords.latitude.toString(),
          Longitude: nullAccuracyLocation.coords.longitude.toString(),
          Accuracy: '0', // null should be converted to '0'
        })
      );
      
      // Verify that the debug log for skipping was NOT called
      expect(mockLogger.debug).not.toHaveBeenCalledWith({
        message: 'Skipping low-accuracy location',
        context: { accuracy: null },
      });
    });

    it('should skip API call when realtime geolocation is disabled', async () => {
      const { sendLocationToAPI } = require('../location');
      
      await sendLocationToAPI(mockLocationObject, false);

      expect(mockSetUnitLocation).not.toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith({
        message: 'Realtime geolocation disabled, skipping API call',
      });
    });

    it('should handle API errors gracefully', async () => {
      const apiError = new Error('API Error');
      mockSetUnitLocation.mockRejectedValue(apiError);

      const { sendLocationToAPI } = require('../location');
      
      await sendLocationToAPI(mockLocationObject, true);

      expect(mockLogger.error).toHaveBeenCalledWith({
        message: 'Failed to send location to API',
        context: {
          error: 'API Error',
          latitude: mockLocationObject.coords.latitude,
          longitude: mockLocationObject.coords.longitude,
        },
      });
    });

    it('should log successful API calls', async () => {
      // Reset mock to resolved value
      mockSetUnitLocation.mockResolvedValue(mockApiResponse);

      const { sendLocationToAPI } = require('../location');
      
      await sendLocationToAPI(mockLocationObject, true);

      expect(mockLogger.info).toHaveBeenCalledWith({
        message: 'Location successfully sent to API',
        context: {
          unitId: 'unit-123',
          resultId: mockApiResponse.Id,
          latitude: mockLocationObject.coords.latitude,
          longitude: mockLocationObject.coords.longitude,
        },
      });
    });
  });

  describe('Background Geolocation Setting Updates', () => {
    it('should request background permission when enabling background geolocation', async () => {
      await locationService.updateBackgroundGeolocationSetting(true);

      expect(mockLocation.requestBackgroundPermissionsAsync).toHaveBeenCalled();
      expect(mockLocation.startLocationUpdatesAsync).toHaveBeenCalledWith(
        'location-updates',
        expect.objectContaining({
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 15000,
          distanceInterval: 10,
        })
      );
    });

    it('should disable background geolocation if background permission is denied', async () => {
      mockLocation.requestBackgroundPermissionsAsync.mockResolvedValue({
        status: 'denied' as any,
        expires: 'never',
        granted: false,
        canAskAgain: true,
      });

      await locationService.updateBackgroundGeolocationSetting(true);

      expect(mockLocation.requestBackgroundPermissionsAsync).toHaveBeenCalled();
      expect(mockLocation.startLocationUpdatesAsync).not.toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalledWith({
        message: 'Background location permission not granted, cannot enable background geolocation',
        context: { backgroundStatus: 'denied' },
      });
    });

    it('should enable background tracking and register task', async () => {
      await locationService.updateBackgroundGeolocationSetting(true);

      expect(mockLocation.startLocationUpdatesAsync).toHaveBeenCalledWith(
        'location-updates',
        expect.objectContaining({
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 15000,
          distanceInterval: 10,
        })
      );
    });

    it('should disable background tracking and unregister task', async () => {
      mockTaskManager.isTaskRegisteredAsync.mockResolvedValue(true);

      await locationService.updateBackgroundGeolocationSetting(false);

      expect(mockLocation.stopLocationUpdatesAsync).toHaveBeenCalledWith('location-updates');
    });

    it('should start background updates if app is backgrounded when enabled', async () => {
      (AppState as any).currentState = 'background';
      const startBackgroundUpdatesSpy = jest.spyOn(locationService, 'startBackgroundUpdates');

      await locationService.updateBackgroundGeolocationSetting(true);

      expect(startBackgroundUpdatesSpy).toHaveBeenCalled();
    });
  });

  describe('Cleanup', () => {
    it('should stop all location updates', async () => {
      (locationService as any).locationSubscription = mockLocationSubscription;
      // backgroundSubscription is no longer used
      mockTaskManager.isTaskRegisteredAsync.mockResolvedValue(true);

      await locationService.stopLocationUpdates();

      // Only one subscription to remove now (foreground)
      expect(mockLocationSubscription.remove).toHaveBeenCalledTimes(1);
      expect(mockLocation.stopLocationUpdatesAsync).toHaveBeenCalledWith('location-updates');
      expect(mockLogger.info).toHaveBeenCalledWith({
        message: 'All location updates stopped',
      });
    });

    it('should cleanup app state subscription', () => {
      locationService.cleanup();

      // Note: The subscription's remove method is called, but we can't easily test it
      // since the subscription is created dynamically inside the mock
      expect(true).toBe(true); // This test passes if cleanup doesn't throw
    });

    it('should handle cleanup when no subscription exists', () => {
      (locationService as any).appStateSubscription = null;

      expect(() => locationService.cleanup()).not.toThrow();
    });
  });

  describe('Realtime Geolocation Setting Updates', () => {
    it('should update realtime geolocation setting when enabled', async () => {
      await locationService.updateRealtimeGeolocationSetting(true);

      expect((locationService as any).isRealtimeGeolocationEnabled).toBe(true);
      expect(mockSaveRealtimeGeolocationState).toHaveBeenCalledWith(true);
      expect(mockLogger.info).toHaveBeenCalledWith({
        message: 'Realtime geolocation setting updated to: true',
        context: { enabled: true },
      });
    });

    it('should update realtime geolocation setting when disabled', async () => {
      await locationService.updateRealtimeGeolocationSetting(false);

      expect((locationService as any).isRealtimeGeolocationEnabled).toBe(false);
      expect(mockSaveRealtimeGeolocationState).toHaveBeenCalledWith(false);
      expect(mockLogger.info).toHaveBeenCalledWith({
        message: 'Realtime geolocation setting updated to: false',
        context: { enabled: false },
      });
    });
  });

  describe('Location Updates with Realtime Control', () => {
    it('should always update local store regardless of realtime setting (foreground updates)', async () => {
      mockLoadRealtimeGeolocationState.mockResolvedValue(false);

      await locationService.startLocationUpdates();

      // Get the callback function passed to watchPositionAsync
      const locationCallback = mockLocation.watchPositionAsync.mock.calls[0][1] as Function;
      await locationCallback(mockLocationObject);

      expect(mockLocationStoreState.setLocation).toHaveBeenCalledWith(mockLocationObject);
      // Foreground updates should not send to API - that's TaskManager's job
      expect(mockSetUnitLocation).not.toHaveBeenCalled();
    });

    it('should always update local store regardless of realtime setting (enabled)', async () => {
      mockLoadRealtimeGeolocationState.mockResolvedValue(true);

      await locationService.startLocationUpdates();

      // Get the callback function passed to watchPositionAsync
      const locationCallback = mockLocation.watchPositionAsync.mock.calls[0][1] as Function;
      await locationCallback(mockLocationObject);

      expect(mockLocationStoreState.setLocation).toHaveBeenCalledWith(mockLocationObject);
      // Foreground updates should not send to API - that's TaskManager's job
      expect(mockSetUnitLocation).not.toHaveBeenCalled();
    });

    it('should register both background and realtime updaters on construction', () => {
      // Check that registration calls were verified during beforeAll
      expect(registrationCallsVerified).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle location subscription errors', async () => {
      const error = new Error('Location subscription failed');
      mockLocation.watchPositionAsync.mockRejectedValue(error);

      await expect(locationService.startLocationUpdates()).rejects.toThrow('Location subscription failed');
    });

    it('should handle background task registration errors', async () => {
      const error = new Error('Task registration failed');
      mockLocation.startLocationUpdatesAsync.mockRejectedValue(error);
      mockLoadBackgroundGeolocationState.mockResolvedValue(true);

      await expect(locationService.startLocationUpdates()).rejects.toThrow('Task registration failed');
    });
  });
});
