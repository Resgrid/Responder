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
jest.mock('@/api/personnel/personnelLocation', () => ({
  setPersonLocation: jest.fn(),
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
jest.mock('@/lib/i18n/utils', () => ({
  translate: jest.fn((key: string) => key),
}));

// Create mock store states
const mockAuthState = {
  userId: 'user-123' as string | null,
};

const mockLocationStoreState = {
  setLocation: jest.fn(),
  setBackgroundEnabled: jest.fn(),
};

// Mock stores with proper Zustand structure
jest.mock('@/lib/auth', () => ({
  useAuthStore: {
    getState: jest.fn(() => mockAuthState),
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
  const mockGetForegroundPermissions = jest.fn();
  const mockWatchPositionAsync = jest.fn();
  const mockStartLocationUpdatesAsync = jest.fn();
  const mockStopLocationUpdatesAsync = jest.fn();
  return {
    requestForegroundPermissionsAsync: mockRequestForegroundPermissions,
    requestBackgroundPermissionsAsync: mockRequestBackgroundPermissions,
    getBackgroundPermissionsAsync: mockGetBackgroundPermissions,
    getForegroundPermissionsAsync: mockGetForegroundPermissions,
    watchPositionAsync: mockWatchPositionAsync,
    startLocationUpdatesAsync: mockStartLocationUpdatesAsync,
    stopLocationUpdatesAsync: mockStopLocationUpdatesAsync,
    Accuracy: {
      Balanced: 'balanced',
    },
    LocationActivityType: {
      Other: 1,
      AutomotiveNavigation: 2,
      Fitness: 3,
      OtherNavigation: 4,
      Airborne: 5,
    },
  };
});

// TaskManager mocks are now handled in the jest.mock() call

const registeredTasks: Record<string, (body: unknown) => Promise<void>> = {};

jest.mock('expo-task-manager', () => ({
  defineTask: jest.fn((name: string, handler: (body: unknown) => Promise<void>) => {
    registeredTasks[name] = handler;
  }),
  isTaskRegisteredAsync: jest.fn(),
}));

jest.mock('react-native', () => ({
  AppState: {
    addEventListener: jest.fn(() => ({
      remove: jest.fn(),
    })),
    currentState: 'active',
  },
  Platform: { OS: 'ios' },
}));

import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { AppState, Platform } from 'react-native';

import { setPersonLocation } from '@/api/personnel/personnelLocation';
import { registerLocationServiceUpdater } from '@/lib/hooks/use-background-geolocation';
import { registerLocationServiceRealtimeUpdater } from '@/lib/hooks/use-realtime-geolocation';
import { logger } from '@/lib/logging';
import { loadBackgroundGeolocationState } from '@/lib/storage/background-geolocation';
import { loadRealtimeGeolocationState, saveRealtimeGeolocationState } from '@/lib/storage/realtime-geolocation';

// Import the service after mocks are set up
let locationService: any;
let resetLocationUploadState: () => void;

// Mock types
const mockSetPersonLocation = setPersonLocation as jest.MockedFunction<typeof setPersonLocation>;
const mockRegisterLocationServiceUpdater = registerLocationServiceUpdater as jest.MockedFunction<typeof registerLocationServiceUpdater>;
const mockRegisterLocationServiceRealtimeUpdater = registerLocationServiceRealtimeUpdater as jest.MockedFunction<typeof registerLocationServiceRealtimeUpdater>;
const mockLogger = logger as jest.Mocked<typeof logger>;
const mockLoadBackgroundGeolocationState = loadBackgroundGeolocationState as jest.MockedFunction<typeof loadBackgroundGeolocationState>;
const mockLoadRealtimeGeolocationState = loadRealtimeGeolocationState as jest.MockedFunction<typeof loadRealtimeGeolocationState>;
const mockSaveRealtimeGeolocationState = saveRealtimeGeolocationState as jest.MockedFunction<typeof saveRealtimeGeolocationState>;
const mockTaskManager = TaskManager as jest.Mocked<typeof TaskManager>;
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
    const { locationService: service, resetLocationUploadState: resetUploads } = require('../location');
    locationService = service;
    resetLocationUploadState = resetUploads;

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

    mockLocation.getForegroundPermissionsAsync.mockResolvedValue({
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
    mockSetPersonLocation.mockResolvedValue(mockApiResponse);

    // Reset core store state
    mockAuthState.userId = 'user-123';

    // Reset internal state of the service
    (locationService as any).locationSubscription = null;
    (locationService as any).startLocationUpdatesPromise = null;
    (locationService as any).backgroundSubscription = null;
    (locationService as any).isBackgroundGeolocationEnabled = false;
    (locationService as any).isTrackingRequested = false;
    (locationService as any).isBackgroundTaskRegistered = false;
    (locationService as any).hasStartedLocationUpdates = false;
    (AppState as any).currentState = 'active';

    // The uploader paces posts across tests otherwise.
    resetLocationUploadState();
  });

  afterEach(() => {
    // Drops any held fix and its flush timer, so no test leaks a post into the next one.
    resetLocationUploadState();
    jest.useRealTimers();
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
        context: { backgroundEnabled: false },
      });
    });

    it('should remove existing foreground subscription before starting a new one (idempotent restarts)', async () => {
      await locationService.startLocationUpdates();
      const firstSubscription = mockLocationSubscription;

      const secondSubscription = { remove: jest.fn() };
      mockLocation.watchPositionAsync.mockResolvedValue(secondSubscription as jest.Mocked<Location.LocationSubscription>);

      await locationService.startLocationUpdates();

      expect(firstSubscription.remove).toHaveBeenCalledTimes(1);
      expect(mockLocation.watchPositionAsync).toHaveBeenCalledTimes(2);
      expect((locationService as any).locationSubscription).toBe(secondSubscription);
    });

    it('should create only one watcher when location starts overlap', async () => {
      let resolveWatcher: (subscription: Location.LocationSubscription) => void;
      const watcherPromise = new Promise<Location.LocationSubscription>((resolve) => {
        resolveWatcher = resolve;
      });
      mockLocation.watchPositionAsync.mockReturnValue(watcherPromise);

      const firstStart = locationService.startLocationUpdates();
      const secondStart = locationService.startLocationUpdates();

      expect(firstStart).toBe(secondStart);

      resolveWatcher!(mockLocationSubscription);
      await Promise.all([firstStart, secondStart]);

      expect(mockLocation.watchPositionAsync).toHaveBeenCalledTimes(1);
      expect((locationService as any).locationSubscription).toBe(mockLocationSubscription);
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
        // Android batches fixes while the screen is off instead of waking the app per fix.
        deferredUpdatesInterval: 30000,
        deferredUpdatesDistance: 25,
        // iOS must not pause a stationary responder off dispatch's map.
        pausesUpdatesAutomatically: false,
        activityType: Location.LocationActivityType.Other,
        showsBackgroundLocationIndicator: true,
        foregroundService: {
          notificationTitle: 'location.tracking_notification_title',
          notificationBody: 'location.tracking_notification_body',
        },
      });
    });

    it('re-registers an already-registered task so its options are refreshed in place', async () => {
      mockLoadBackgroundGeolocationState.mockResolvedValue(true);
      mockTaskManager.isTaskRegisteredAsync.mockResolvedValue(true);

      await locationService.startLocationUpdates();

      expect(mockLocation.startLocationUpdatesAsync).toHaveBeenCalledTimes(1);
      expect(mockLocation.stopLocationUpdatesAsync).not.toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith({ message: 'Background location task options refreshed' });
    });

    it('drops the distance filters on Android so a stationary responder still delivers heartbeat batches', async () => {
      // Android pauses JS timers in the background, so the heartbeat has to ride on the task's batches.
      const originalOS = Platform.OS;
      (Platform as { OS: string }).OS = 'android';
      mockLoadBackgroundGeolocationState.mockResolvedValue(true);

      try {
        await locationService.startLocationUpdates();
      } finally {
        (Platform as { OS: string }).OS = originalOS;
      }

      expect(mockLocation.startLocationUpdatesAsync).toHaveBeenCalledWith(
        'location-updates',
        expect.objectContaining({
          timeInterval: 15000,
          distanceInterval: 0,
          deferredUpdatesInterval: 30000,
          deferredUpdatesDistance: 0,
        })
      );
    });

    it('stops a task left registered while background geolocation is off', async () => {
      // An earlier session registered it; the setting is now off, so it only burns battery.
      mockLoadBackgroundGeolocationState.mockResolvedValue(false);
      mockTaskManager.isTaskRegisteredAsync.mockResolvedValue(true);

      await locationService.startLocationUpdates();

      expect(mockLocation.stopLocationUpdatesAsync).toHaveBeenCalledWith('location-updates');
      expect(mockLocation.startLocationUpdatesAsync).not.toHaveBeenCalled();
      // With the task gone, the foreground watcher takes over.
      expect(mockLocation.watchPositionAsync).toHaveBeenCalledTimes(1);
    });

    it('stops a registered task when background permission was withdrawn', async () => {
      mockLoadBackgroundGeolocationState.mockResolvedValue(true);
      mockTaskManager.isTaskRegisteredAsync.mockResolvedValue(true);
      mockLocation.getBackgroundPermissionsAsync.mockResolvedValue({
        status: 'denied' as any,
        expires: 'never',
        granted: false,
        canAskAgain: true,
      });

      await locationService.startLocationUpdates();

      expect(mockLocation.stopLocationUpdatesAsync).toHaveBeenCalledWith('location-updates');
      expect(mockLocation.watchPositionAsync).toHaveBeenCalledTimes(1);
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

    it('should send foreground location updates to the API when the background task is not registered', async () => {
      // Background off: the foreground watcher is the only sender.
      mockTaskManager.isTaskRegisteredAsync.mockResolvedValue(false);

      await locationService.startLocationUpdates();

      // Get the callback function passed to watchPositionAsync
      const locationCallback = mockLocation.watchPositionAsync.mock.calls[0]?.[1] as Function;
      await locationCallback(mockLocationObject);

      expect(mockLocationStoreState.setLocation).toHaveBeenCalledWith(mockLocationObject);
      expect(mockSetPersonLocation).toHaveBeenCalledWith(
        expect.objectContaining({
          UserId: 'user-123',
          Latitude: mockLocationObject.coords.latitude.toString(),
          Longitude: mockLocationObject.coords.longitude.toString(),
        })
      );
      expect(mockLogger.info).toHaveBeenCalledWith({
        message: 'Foreground location update received',
        context: {
          latitude: mockLocationObject.coords.latitude,
          longitude: mockLocationObject.coords.longitude,
          heading: mockLocationObject.coords.heading,
        },
      });
    });

    it('runs no foreground watcher alongside the background task', async () => {
      // The task delivers foreground fixes itself; a watcher would be a second consumer of them.
      mockLoadRealtimeGeolocationState.mockResolvedValue(true);
      mockLoadBackgroundGeolocationState.mockResolvedValue(true);
      mockTaskManager.isTaskRegisteredAsync.mockResolvedValue(true);

      await locationService.startLocationUpdates();

      expect(mockLocation.watchPositionAsync).not.toHaveBeenCalled();
      expect((locationService as any).locationSubscription).toBeNull();
      expect((locationService as any).hasStartedLocationUpdates).toBe(true);
    });

    it('releases an existing foreground watcher when the background task takes over', async () => {
      await locationService.startLocationUpdates();
      expect((locationService as any).locationSubscription).toBe(mockLocationSubscription);

      mockLoadBackgroundGeolocationState.mockResolvedValue(true);
      await locationService.startLocationUpdates();

      expect(mockLocationSubscription.remove).toHaveBeenCalledTimes(1);
      expect((locationService as any).locationSubscription).toBeNull();
    });

    it('should throttle foreground API sends', async () => {
      mockLoadRealtimeGeolocationState.mockResolvedValue(true);
      mockTaskManager.isTaskRegisteredAsync.mockResolvedValue(false);

      await locationService.startLocationUpdates();

      const locationCallback = mockLocation.watchPositionAsync.mock.calls[0]?.[1] as Function;
      await locationCallback(mockLocationObject);
      await locationCallback(mockLocationObject);
      await locationCallback(mockLocationObject);

      expect(mockSetPersonLocation).toHaveBeenCalledTimes(1);
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

  describe('Foreground watcher lifecycle across app state', () => {
    // watchPositionAsync holds the GPS on for as long as it is subscribed, and on Android it keeps
    // doing so after the app is backgrounded. Leaving it running alongside the OS task means two
    // consumers of the radio; leaving it running with background tracking OFF means tracking a
    // responder who asked not to be tracked in the background.
    // jest-setup.ts mocks 'react-native' wholesale, so the AppState the service imports is not the
    // object this file's factory builds and the registered subscription cannot be captured from the
    // mock. Invoke the service's own handler, which is the unit under test either way.
    const emitAppState = async (nextAppState: string) => {
      await (locationService as any).handleAppStateChange(nextAppState);
    };

    it('releases the foreground watcher when the app is backgrounded', async () => {
      await locationService.startLocationUpdates();
      expect(mockLocation.watchPositionAsync).toHaveBeenCalledTimes(1);

      await emitAppState('background');

      expect(mockLocationSubscription.remove).toHaveBeenCalled();
    });

    it('re-subscribes on return to the foreground for a session that was tracking', async () => {
      await locationService.startLocationUpdates();
      await emitAppState('background');
      mockLocation.watchPositionAsync.mockClear();

      await emitAppState('active');

      expect(mockLocation.watchPositionAsync).toHaveBeenCalled();
    });

    it('discards a watcher that resolves after the app has already gone to the background', async () => {
      let resolveWatcher: (subscription: Location.LocationSubscription) => void;
      const watcherPromise = new Promise<Location.LocationSubscription>((resolve) => {
        resolveWatcher = resolve;
      });
      mockLocation.watchPositionAsync.mockReturnValue(watcherPromise);

      const pendingStart = locationService.startLocationUpdates();
      // Backgrounding lands while watchPositionAsync is still in flight, so there is no
      // subscription to release yet — the pending one has to release itself.
      await emitAppState('background');

      const lateSubscription = { remove: jest.fn() } as jest.Mocked<Location.LocationSubscription>;
      resolveWatcher!(lateSubscription);
      await pendingStart;

      expect(lateSubscription.remove).toHaveBeenCalledTimes(1);
      expect((locationService as any).locationSubscription).toBeNull();
    });

    it('re-subscribes on return to the foreground after a start that was discarded mid-flight', async () => {
      let resolveWatcher: (subscription: Location.LocationSubscription) => void;
      const watcherPromise = new Promise<Location.LocationSubscription>((resolve) => {
        resolveWatcher = resolve;
      });
      mockLocation.watchPositionAsync.mockReturnValue(watcherPromise);

      const pendingStart = locationService.startLocationUpdates();
      await emitAppState('background');
      resolveWatcher!({ remove: jest.fn() } as jest.Mocked<Location.LocationSubscription>);
      await pendingStart;

      mockLocation.watchPositionAsync.mockResolvedValue(mockLocationSubscription);
      await emitAppState('active');

      expect((locationService as any).locationSubscription).toBe(mockLocationSubscription);
    });

    it('does not start a watcher on return to the foreground while the background task is running', async () => {
      mockLoadBackgroundGeolocationState.mockResolvedValue(true);
      await locationService.startLocationUpdates();
      await emitAppState('background');

      await emitAppState('active');

      expect(mockLocation.watchPositionAsync).not.toHaveBeenCalled();
      // No restart either: the task already delivers foreground fixes.
      expect(mockLocation.startLocationUpdatesAsync).toHaveBeenCalledTimes(1);
    });

    it('does not start watching on foreground for a session that never started tracking', async () => {
      await locationService.stopLocationUpdates();
      mockLocation.watchPositionAsync.mockClear();

      await emitAppState('active');

      expect(mockLocation.watchPositionAsync).not.toHaveBeenCalled();
    });
  });

  describe('Background task transmission gating', () => {
    // The OS task keeps firing while the app is foregrounded, so the fix it delivers has to be
    // attributed to the setting that owns that app state before it can be transmitted.
    const runTask = async (appState: string) => {
      (AppState as any).currentState = appState;
      const handler = registeredTasks['location-updates'];
      expect(handler).toBeDefined();
      await handler({ data: { locations: [mockLocationObject] }, error: null });
    };

    beforeEach(() => {
      mockSetPersonLocation.mockResolvedValue(mockApiResponse as any);
    });

    afterEach(() => {
      (AppState as any).currentState = 'active';
    });

    it('transmits a backgrounded fix on the background setting alone, with realtime off', async () => {
      mockLoadBackgroundGeolocationState.mockResolvedValue(true);
      mockLoadRealtimeGeolocationState.mockResolvedValue(false);

      await runTask('background');

      expect(mockSetPersonLocation).toHaveBeenCalled();
      expect(mockLoadBackgroundGeolocationState).toHaveBeenCalled();
    });

    it('does not transmit a backgrounded fix when background tracking is off', async () => {
      mockLoadBackgroundGeolocationState.mockResolvedValue(false);
      mockLoadRealtimeGeolocationState.mockResolvedValue(true);

      await runTask('background');

      expect(mockSetPersonLocation).not.toHaveBeenCalled();
    });

    it('transmits a foregrounded fix with both settings off', async () => {
      // Realtime Geolocation only governs receiving; the open app always reports its position.
      mockLoadBackgroundGeolocationState.mockResolvedValue(false);
      mockLoadRealtimeGeolocationState.mockResolvedValue(false);

      await runTask('active');

      expect(mockSetPersonLocation).toHaveBeenCalled();
      expect(mockLoadRealtimeGeolocationState).not.toHaveBeenCalled();
    });

    it('always records the fix locally regardless of whether it may be transmitted', async () => {
      mockLoadBackgroundGeolocationState.mockResolvedValue(false);
      mockLoadRealtimeGeolocationState.mockResolvedValue(false);

      await runTask('background');

      expect(mockLocationStoreState.setLocation).toHaveBeenCalledWith(mockLocationObject);
      expect(mockSetPersonLocation).not.toHaveBeenCalled();
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

      expect(mockSetPersonLocation).toHaveBeenCalledWith(
        expect.objectContaining({
          UserId: 'user-123',
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
      expect(mockSetPersonLocation).not.toHaveBeenCalled();

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
      expect(mockSetPersonLocation).toHaveBeenCalledWith(
        expect.objectContaining({
          UserId: 'user-123',
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

      expect(mockSetPersonLocation).toHaveBeenCalledWith(
        expect.objectContaining({
          Accuracy: '0',
          Altitude: '0',
          AltitudeAccuracy: '0',
          Heading: '0',
          Speed: '0',
        })
      );
    });

    it('should skip API call if no user is signed in', async () => {
      mockAuthState.userId = null;

      const { sendLocationToAPI } = require('../location');

      await sendLocationToAPI(mockLocationObject, true);

      expect(mockSetPersonLocation).not.toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalledWith({
        message: 'No authenticated user, skipping location API call',
      });

      // Reset for other tests
      mockAuthState.userId = 'user-123';
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
      expect(mockSetPersonLocation).not.toHaveBeenCalled();

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
      expect(mockSetPersonLocation).toHaveBeenCalledWith(
        expect.objectContaining({
          UserId: 'user-123',
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

    it('should skip API call when transmission is disabled for the fix', async () => {
      const { sendLocationToAPI } = require('../location');

      await sendLocationToAPI(mockLocationObject, false);

      expect(mockSetPersonLocation).not.toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith({
        message: 'Location transmission disabled for this fix, skipping API call',
      });
    });

    it('should handle API errors gracefully', async () => {
      const apiError = new Error('API Error');
      mockSetPersonLocation.mockRejectedValue(apiError);

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
      mockSetPersonLocation.mockResolvedValue(mockApiResponse);

      const { sendLocationToAPI } = require('../location');

      await sendLocationToAPI(mockLocationObject, true);

      expect(mockLogger.info).toHaveBeenCalledWith({
        message: 'Location successfully sent to API',
        context: {
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

    it('releases the foreground watcher once background tracking is enabled', async () => {
      await locationService.startLocationUpdates();

      await locationService.updateBackgroundGeolocationSetting(true);

      expect(mockLocationSubscription.remove).toHaveBeenCalledTimes(1);
      expect((locationService as any).locationSubscription).toBeNull();
      expect((locationService as any).isBackgroundTaskRegistered).toBe(true);
    });

    it('hands foreground tracking back to the watcher once background tracking is disabled', async () => {
      mockLoadBackgroundGeolocationState.mockResolvedValue(true);
      await locationService.startLocationUpdates();
      expect(mockLocation.watchPositionAsync).not.toHaveBeenCalled();

      mockLoadBackgroundGeolocationState.mockResolvedValue(false);
      mockTaskManager.isTaskRegisteredAsync.mockResolvedValue(true);
      await locationService.updateBackgroundGeolocationSetting(false);

      expect(mockLocation.watchPositionAsync).toHaveBeenCalledTimes(1);
      expect((locationService as any).locationSubscription).toBe(mockLocationSubscription);
    });

    it('does not start a watcher on disable for a session that is not tracking', async () => {
      mockTaskManager.isTaskRegisteredAsync.mockResolvedValue(true);

      await locationService.updateBackgroundGeolocationSetting(false);

      expect(mockLocation.watchPositionAsync).not.toHaveBeenCalled();
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

  });

  describe('Realtime Geolocation Setting Updates', () => {
    it('should update realtime geolocation setting when enabled', async () => {
      await locationService.updateRealtimeGeolocationSetting(true);

      expect(mockSaveRealtimeGeolocationState).toHaveBeenCalledWith(true);
      expect(mockLogger.info).toHaveBeenCalledWith({
        message: 'Realtime geolocation setting updated to: true',
        context: { enabled: true },
      });
    });

    it('should update realtime geolocation setting when disabled', async () => {
      await locationService.updateRealtimeGeolocationSetting(false);

      expect(mockSaveRealtimeGeolocationState).toHaveBeenCalledWith(false);
      expect(mockLogger.info).toHaveBeenCalledWith({
        message: 'Realtime geolocation setting updated to: false',
        context: { enabled: false },
      });
    });
  });

  /**
   * Realtime Geolocation only governs receiving other people's positions. The open app reports its
   * own position whatever that toggle says, and the toggle leaves the location consumers alone.
   */
  describe('Foreground reporting is independent of Realtime Geolocation', () => {
    it('posts a foreground fix with Realtime Geolocation off', async () => {
      mockLoadRealtimeGeolocationState.mockResolvedValue(false);

      await locationService.startLocationUpdates();

      const locationCallback = mockLocation.watchPositionAsync.mock.calls[0]?.[1] as (location: Location.LocationObject) => Promise<void>;
      await locationCallback(mockLocationObject);

      // Every field the SavePersonnelLocationInput model declares, as the strings the V4 API takes.
      expect(mockSetPersonLocation).toHaveBeenCalledTimes(1);
      expect(mockSetPersonLocation).toHaveBeenCalledWith(
        expect.objectContaining({
          UserId: 'user-123',
          Timestamp: new Date(mockLocationObject.timestamp).toISOString(),
          Latitude: '37.7749',
          Longitude: '-122.4194',
          Accuracy: '5',
          Altitude: '10.5',
          AltitudeAccuracy: '2',
          Speed: '15.5',
          Heading: '90',
        })
      );
    });

    it('leaves the location consumers alone when Realtime Geolocation is toggled', async () => {
      await locationService.startLocationUpdates();
      mockLocation.watchPositionAsync.mockClear();

      await locationService.updateRealtimeGeolocationSetting(true);
      await locationService.updateRealtimeGeolocationSetting(false);

      expect(mockLocation.watchPositionAsync).not.toHaveBeenCalled();
      expect(mockLocationSubscription.remove).not.toHaveBeenCalled();
      expect(mockLocation.startLocationUpdatesAsync).not.toHaveBeenCalled();
      expect(mockLocation.stopLocationUpdatesAsync).not.toHaveBeenCalled();
    });

    it('does not spend the send throttle on a fix that never reached the API', async () => {
      mockTaskManager.isTaskRegisteredAsync.mockResolvedValue(false);

      await locationService.startLocationUpdates();
      const locationCallback = mockLocation.watchPositionAsync.mock.calls[0]?.[1] as (location: Location.LocationObject) => Promise<void>;

      // Rejected by the accuracy filter, so no request went out.
      await locationCallback({
        ...mockLocationObject,
        coords: { ...mockLocationObject.coords, accuracy: 250 },
      });
      expect(mockSetPersonLocation).not.toHaveBeenCalled();

      // The usable fix arriving a moment later must still be sent rather than throttled away.
      await locationCallback(mockLocationObject);
      expect(mockSetPersonLocation).toHaveBeenCalledTimes(1);
    });
  });

  /**
   * The start at sign-in throws when the permission prompt is declined. A responder who then grants
   * location in the OS settings comes back through the foreground transition, which is where
   * tracking has to pick up -- without re-prompting anyone who is still saying no.
   */
  describe('Recovering a start that failed on permission', () => {
    const denied = {
      status: 'denied' as any,
      expires: 'never' as const,
      granted: false,
      canAskAgain: true,
    };

    const failFirstStart = async () => {
      mockLocation.requestForegroundPermissionsAsync.mockResolvedValueOnce(denied);
      await expect(locationService.startLocationUpdates()).rejects.toThrow('Location permissions not granted');
      expect(mockLocation.watchPositionAsync).not.toHaveBeenCalled();
    };

    it('starts tracking on return to the foreground once permission has been granted', async () => {
      await failFirstStart();

      await (locationService as any).handleAppStateChange('active');

      expect(mockLocation.watchPositionAsync).toHaveBeenCalledTimes(1);
      expect((locationService as any).locationSubscription).toBe(mockLocationSubscription);
    });

    it('does not re-prompt on return to the foreground while permission is still denied', async () => {
      await failFirstStart();
      mockLocation.getForegroundPermissionsAsync.mockResolvedValue(denied);
      mockLocation.requestForegroundPermissionsAsync.mockClear();

      await (locationService as any).handleAppStateChange('active');

      expect(mockLocation.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
      expect(mockLocation.watchPositionAsync).not.toHaveBeenCalled();
    });

    it('does not retry after sign-out', async () => {
      await failFirstStart();
      await locationService.stopLocationUpdates();

      await (locationService as any).handleAppStateChange('active');

      expect(mockLocation.watchPositionAsync).not.toHaveBeenCalled();
    });
  });

  describe('Location Updates with Realtime Control', () => {
    it('should always update local store regardless of realtime setting (foreground updates)', async () => {
      mockLoadRealtimeGeolocationState.mockResolvedValue(false);

      await locationService.startLocationUpdates();

      // Get the callback function passed to watchPositionAsync
      const locationCallback = mockLocation.watchPositionAsync.mock.calls[0]?.[1] as Function;
      await locationCallback(mockLocationObject);

      expect(mockLocationStoreState.setLocation).toHaveBeenCalledWith(mockLocationObject);
      // Realtime only governs receiving, so the open app still posts it
      expect(mockSetPersonLocation).toHaveBeenCalled();
    });

    it('should always update local store regardless of realtime setting (enabled)', async () => {
      mockLoadRealtimeGeolocationState.mockResolvedValue(true);

      await locationService.startLocationUpdates();

      // Get the callback function passed to watchPositionAsync
      const locationCallback = mockLocation.watchPositionAsync.mock.calls[0]?.[1] as Function;
      await locationCallback(mockLocationObject);

      expect(mockLocationStoreState.setLocation).toHaveBeenCalledWith(mockLocationObject);
      // No background task is registered, so the watcher posts it
      expect(mockSetPersonLocation).toHaveBeenCalled();
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
      expect(mockLogger.error).toHaveBeenCalledWith({
        message: 'Failed to start location updates',
        context: { error },
      });
    });

    it('falls back to the foreground watcher when the background task cannot be registered', async () => {
      const error = new Error('Task registration failed');
      mockLocation.startLocationUpdatesAsync.mockRejectedValue(error);
      mockLoadBackgroundGeolocationState.mockResolvedValue(true);

      await expect(locationService.startLocationUpdates()).resolves.toBeUndefined();

      expect(mockLogger.error).toHaveBeenCalledWith({
        message: 'Failed to register background location task, falling back to the foreground watcher',
        context: { error },
      });
      expect(mockLocation.watchPositionAsync).toHaveBeenCalledTimes(1);
      expect((locationService as any).isBackgroundTaskRegistered).toBe(false);
    });
  });
});
