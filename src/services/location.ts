import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { AppState, type AppStateStatus } from 'react-native';

import { setPersonLocation } from '@/api/personnel/personnelLocation';
import { setUnitLocation } from '@/api/units/unitLocation';
import { useAuthStore } from '@/lib/auth';
import { registerLocationServiceUpdater } from '@/lib/hooks/use-background-geolocation';
import { registerLocationServiceRealtimeUpdater } from '@/lib/hooks/use-realtime-geolocation';
import { logger } from '@/lib/logging';
import { loadBackgroundGeolocationState } from '@/lib/storage/background-geolocation';
import { loadRealtimeGeolocationState, saveRealtimeGeolocationState } from '@/lib/storage/realtime-geolocation';
import { SavePersonnelLocationInput } from '@/models/v4/personnelLocation/savePersonnelLocationInput';
import { SaveUnitLocationInput } from '@/models/v4/unitLocation/saveUnitLocationInput';
import { useCoreStore } from '@/stores/app/core-store';
import { useLocationStore } from '@/stores/app/location-store';

const LOCATION_TASK_NAME = 'location-updates';

// Helper to safely convert numeric values to strings, guarding against invalid numbers.
const safeNumericString = (value: number | null | undefined, field: string): string => {
  // Treat null, undefined, NaN, and Infinity as invalid
  if (value == null || !isFinite(value)) {
    logger.warn({ message: `Invalid ${field} value: ${value}, defaulting to '0'` });
    return '0';
  }
  return value.toString();
};

// Helper function to send location to API
const sendLocationToAPI = async (location: Location.LocationObject, isRealtimeEnabled: boolean): Promise<void> => {
  // Check location accuracy early - skip if accuracy is poor (> 100 meters)
  if (location.coords.accuracy != null && location.coords.accuracy > 100) {
    logger.debug({
      message: 'Skipping low-accuracy location',
      context: { accuracy: location.coords.accuracy },
    });
    return;
  }

  // Only send to API if realtime geolocation is enabled
  if (!isRealtimeEnabled) {
    logger.debug({
      message: 'Realtime geolocation disabled, skipping API call',
    });
    return;
  }

  try {
    const unitId = useCoreStore.getState().activeUnitId;
    if (!unitId) {
      logger.warn({ message: 'No active unit selected, skipping location API call' });
      return;
    }
    const locationInput = new SaveUnitLocationInput();
    locationInput.UnitId = unitId;
    locationInput.Timestamp = new Date(location.timestamp).toISOString();
    locationInput.Latitude = location.coords.latitude.toString();
    locationInput.Longitude = location.coords.longitude.toString();
    locationInput.Accuracy = safeNumericString(location.coords.accuracy, 'accuracy');
    locationInput.Altitude = safeNumericString(location.coords.altitude, 'altitude');
    locationInput.AltitudeAccuracy = safeNumericString(location.coords.altitudeAccuracy, 'altitudeAccuracy');
    locationInput.Speed = safeNumericString(location.coords.speed, 'speed');
    locationInput.Heading = safeNumericString(location.coords.heading, 'heading');
    const result = await setUnitLocation(locationInput);
    logger.info({
      message: 'Location successfully sent to API',
      context: {
        unitId: unitId,
        resultId: result.Id,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      },
    });
  } catch (error) {
    logger.error({
      message: 'Failed to send location to API',
      context: {
        error: error instanceof Error ? error.message : String(error),
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      },
    });
  }
};

// Define the task
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    logger.error({
      message: 'Location task error',
      context: { error },
    });
    return;
  }
  if (data) {
    const { locations } = data as { locations: Location.LocationObject[] };
    const location = locations[0];
    if (location) {
      logger.info({
        message: 'Background location update received',
        context: {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          heading: location.coords.heading,
        },
      });

      // Always update local store
      useLocationStore.getState().setLocation(location);

      // Load current realtime state and send to API if enabled
      const isRealtimeEnabled = await loadRealtimeGeolocationState();
      await sendLocationToAPI(location, isRealtimeEnabled);
    }
  }
});

class LocationService {
  private static instance: LocationService;
  private locationSubscription: Location.LocationSubscription | null = null;
  private appStateSubscription: { remove: () => void } | null = null;
  private isBackgroundGeolocationEnabled = false;
  private isRealtimeGeolocationEnabled = false;

  private constructor() {
    this.initializeAppStateListener();
    // Register this service's update function to avoid circular dependency
    registerLocationServiceUpdater(this.updateBackgroundGeolocationSetting.bind(this));
    registerLocationServiceRealtimeUpdater(this.updateRealtimeGeolocationSetting.bind(this));
  }

  static getInstance(): LocationService {
    if (!LocationService.instance) {
      LocationService.instance = new LocationService();
    }
    return LocationService.instance;
  }

  private initializeAppStateListener(): void {
    this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange);
  }

  private handleAppStateChange = async (nextAppState: AppStateStatus): Promise<void> => {
    logger.info({
      message: 'Location service handling app state change',
      context: { nextAppState, backgroundEnabled: this.isBackgroundGeolocationEnabled },
    });
  };

  async requestPermissions(): Promise<boolean> {
    const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
    const { status: backgroundStatus } = await Location.getBackgroundPermissionsAsync();

    logger.info({
      message: 'Location permissions requested',
      context: {
        foregroundStatus,
        backgroundStatus,
      },
    });

    // Only require foreground permissions for basic location tracking
    // Background permissions are only needed when background geolocation is enabled
    return foregroundStatus === 'granted';
  }

  async startLocationUpdates(): Promise<void> {
    const hasPermissions = await this.requestPermissions();
    if (!hasPermissions) {
      throw new Error('Location permissions not granted');
    }

    // Load background and realtime geolocation settings
    this.isBackgroundGeolocationEnabled = await loadBackgroundGeolocationState();
    this.isRealtimeGeolocationEnabled = await loadRealtimeGeolocationState();

    // Check if task is already registered for background updates
    const isTaskRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
    if (!isTaskRegistered && this.isBackgroundGeolocationEnabled) {
      // Check background permission before registering background task
      const { status: backgroundStatus } = await Location.getBackgroundPermissionsAsync();
      if (backgroundStatus === 'granted') {
        await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 15000,
          distanceInterval: 10,
          foregroundService: {
            notificationTitle: 'Location Tracking',
            notificationBody: 'Tracking your location in the background',
          },
        });
        logger.info({
          message: 'Background location task registered',
        });
      } else {
        logger.warn({
          message: 'Background location permission not granted, skipping background task registration',
          context: { backgroundStatus },
        });
      }
    }

    // Start foreground updates
    this.locationSubscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 15000,
        distanceInterval: 10,
      },
      async (location) => {
        logger.info({
          message: 'Foreground location update received',
          context: {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            heading: location.coords.heading,
          },
        });
        // Location sending is handled by TaskManager, so we only update the local store
        useLocationStore.getState().setLocation(location);
      }
    );

    logger.info({
      message: 'Foreground location updates started',
      context: {
        backgroundEnabled: this.isBackgroundGeolocationEnabled,
        realtimeEnabled: this.isRealtimeGeolocationEnabled,
      },
    });
  }

  async startBackgroundUpdates(): Promise<void> {
    if (!this.isBackgroundGeolocationEnabled) {
      return;
    }

    // Check background permission before starting background updates
    const { status: backgroundStatus } = await Location.getBackgroundPermissionsAsync();
    if (backgroundStatus !== 'granted') {
      logger.warn({
        message: 'Background location permission not granted, skipping background updates',
        context: { backgroundStatus },
      });
      return;
    }

    // Skip watchPositionAsync setup when running in background mode
    // Background tracking relies solely on TaskManager.startLocationUpdatesAsync
    logger.info({
      message: 'Background location updates handled by TaskManager, skipping watchPosition setup',
    });
    return;
  }

  async stopBackgroundUpdates(): Promise<void> {
    // Background updates are handled by TaskManager, no watchPosition to clean up
    useLocationStore.getState().setBackgroundEnabled(false);
  }

  async updateRealtimeGeolocationSetting(enabled: boolean): Promise<void> {
    this.isRealtimeGeolocationEnabled = enabled;

    await saveRealtimeGeolocationState(enabled);

    logger.info({
      message: `Realtime geolocation setting updated to: ${enabled}`,
      context: { enabled },
    });
  }

  async updateBackgroundGeolocationSetting(enabled: boolean): Promise<void> {
    this.isBackgroundGeolocationEnabled = enabled;

    if (enabled) {
      // Request background permissions when enabling background geolocation
      const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
      if (backgroundStatus !== 'granted') {
        logger.warn({
          message: 'Background location permission not granted, cannot enable background geolocation',
          context: { backgroundStatus },
        });
        this.isBackgroundGeolocationEnabled = false;
        return;
      }

      // Register the task if not already registered
      const isTaskRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
      if (!isTaskRegistered) {
        await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 15000,
          distanceInterval: 10,
          foregroundService: {
            notificationTitle: 'Location Tracking',
            notificationBody: 'Tracking your location in the background',
          },
        });
        logger.info({
          message: 'Background location task registered after setting change',
        });
      }

      // Start background updates if app is currently backgrounded
      if (AppState.currentState === 'background') {
        await this.startBackgroundUpdates();
      }
    } else {
      // Stop background updates and unregister task
      await this.stopBackgroundUpdates();
      const isTaskRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
      if (isTaskRegistered) {
        await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
        logger.info({
          message: 'Background location task unregistered after setting change',
        });
      }
    }
  }

  async stopLocationUpdates(): Promise<void> {
    if (this.locationSubscription) {
      await this.locationSubscription.remove();
      this.locationSubscription = null;
    }

    await this.stopBackgroundUpdates();

    // Check if task is registered before stopping
    const isTaskRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
    if (isTaskRegistered) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
    }

    logger.info({
      message: 'All location updates stopped',
    });
  }

  cleanup(): void {
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
  }
}

export const locationService = LocationService.getInstance();

// Export for testing
export { sendLocationToAPI };
