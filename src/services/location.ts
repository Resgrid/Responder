import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { AppState, type AppStateStatus } from 'react-native';

import { setPersonLocation } from '@/api/personnel/personnelLocation';
import { useAuthStore } from '@/lib/auth';
import { registerLocationServiceUpdater } from '@/lib/hooks/use-background-geolocation';
import { registerLocationServiceRealtimeUpdater } from '@/lib/hooks/use-realtime-geolocation';
import { translate } from '@/lib/i18n/utils';
import { logger } from '@/lib/logging';
import { loadBackgroundGeolocationState } from '@/lib/storage/background-geolocation';
import { loadRealtimeGeolocationState, saveRealtimeGeolocationState } from '@/lib/storage/realtime-geolocation';
import { SavePersonnelLocationInput } from '@/models/v4/personnelLocation/savePersonnelLocationInput';
import { useLocationStore } from '@/stores/app/location-store';

const LOCATION_TASK_NAME = 'location-updates';

// Minimum gap between foreground location log lines (updates can fire every second).
const FOREGROUND_LOCATION_LOG_INTERVAL_MS = 30000;

// Minimum gap between foreground location API posts. iOS ignores `timeInterval` on
// watchPositionAsync, so fixes can arrive every second; match the background cadence.
const FOREGROUND_LOCATION_API_INTERVAL_MS = 15000;

/**
 * Options for the OS-managed background task.
 *
 * `deferredUpdates*` is the significant battery lever on Android: it lets the OS collect fixes
 * while the screen is off and hand them over in one batch, instead of waking the JS runtime for
 * every individual fix. iOS ignores it, so the pair below is chosen so that a responder who is
 * actually moving still reports at roughly the foreground cadence.
 *
 * `pausesUpdatesAutomatically` is deliberately false. iOS will otherwise stop updates when it
 * decides the device has been stationary for a while and only resume on significant motion — which
 * for AVL reads on dispatch's map as a responder who has dropped off the air.
 *
 * `showsBackgroundLocationIndicator` keeps the iOS status-bar indicator lit while we hold a
 * background fix. It is not just an App Store expectation; a responder is entitled to see that the
 * app is tracking them.
 */
const getBackgroundTaskOptions = (): Location.LocationTaskOptions => ({
  accuracy: Location.Accuracy.Balanced,
  timeInterval: 15000,
  distanceInterval: 10,
  deferredUpdatesInterval: 30000,
  deferredUpdatesDistance: 25,
  pausesUpdatesAutomatically: false,
  activityType: Location.LocationActivityType.Other,
  showsBackgroundLocationIndicator: true,
  foregroundService: {
    notificationTitle: translate('location.tracking_notification_title'),
    notificationBody: translate('location.tracking_notification_body'),
  },
});

// Helper to safely convert numeric values to strings, guarding against invalid numbers.
const safeNumericString = (value: number | null | undefined, field: string): string => {
  // Treat null, undefined, NaN, and Infinity as invalid
  if (value == null || !isFinite(value)) {
    logger.warn({ message: `Invalid ${field} value: ${value}, defaulting to '0'` });
    return '0';
  }
  return value.toString();
};

/**
 * Post a fix to the personnel-location endpoint.
 *
 * `isTransmissionEnabled` is resolved by the caller, because which setting governs a fix depends on
 * where it came from: a foreground fix is governed by Realtime Geolocation, a background one by
 * Background Geolocation. Deciding that here would collapse two independent settings into one.
 *
 * Resolves `true` once the request has been attempted — success or failure — and `false` when a
 * precondition rejected the fix before any request went out. The foreground watcher uses that to
 * decide whether its send throttle has actually been spent: stamping on a fix that was never sent
 * (poor accuracy, no signed-in user) would suppress the good fix arriving a second later for the
 * rest of the window.
 */
const sendLocationToAPI = async (location: Location.LocationObject, isTransmissionEnabled: boolean): Promise<boolean> => {
  // Check location accuracy early - skip if accuracy is poor (> 100 meters)
  if (location.coords.accuracy != null && location.coords.accuracy > 100) {
    logger.debug({
      message: 'Skipping low-accuracy location',
      context: { accuracy: location.coords.accuracy },
    });
    return false;
  }

  if (!isTransmissionEnabled) {
    logger.debug({
      message: 'Location transmission disabled for this fix, skipping API call',
    });
    return false;
  }

  try {
    // Responder reports personnel locations, keyed on the signed-in user.
    const userId = useAuthStore.getState().userId;
    if (!userId) {
      logger.warn({ message: 'No authenticated user, skipping location API call' });
      return false;
    }
    const locationInput = new SavePersonnelLocationInput();
    locationInput.UserId = userId;
    locationInput.Timestamp = new Date(location.timestamp).toISOString();
    locationInput.Latitude = location.coords.latitude.toString();
    locationInput.Longitude = location.coords.longitude.toString();
    locationInput.Accuracy = safeNumericString(location.coords.accuracy, 'accuracy');
    locationInput.Altitude = safeNumericString(location.coords.altitude, 'altitude');
    locationInput.AltitudeAccuracy = safeNumericString(location.coords.altitudeAccuracy, 'altitudeAccuracy');
    locationInput.Speed = safeNumericString(location.coords.speed, 'speed');
    locationInput.Heading = safeNumericString(location.coords.heading, 'heading');
    const result = await setPersonLocation(locationInput);
    logger.info({
      message: 'Location successfully sent to API',
      context: {
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

  // A request that went out and failed still counts as spent: retrying every fix would hammer an
  // endpoint that is already refusing us.
  return true;
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

      // The OS task keeps delivering while the app is foregrounded, so the fix has to be attributed
      // to the right setting before it can be sent. Foreground fixes belong to Realtime
      // Geolocation, background ones to Background Geolocation. Reading only the realtime flag here
      // meant a responder with background tracking on and realtime off transmitted nothing at all —
      // the exact combination the background setting exists to serve.
      const isTransmissionEnabled = AppState.currentState === 'active' ? await loadRealtimeGeolocationState() : await loadBackgroundGeolocationState();

      await sendLocationToAPI(location, isTransmissionEnabled);
    }
  }
});

class LocationService {
  private static instance: LocationService;
  private locationSubscription: Location.LocationSubscription | null = null;
  private startLocationUpdatesPromise: Promise<void> | null = null;
  private isBackgroundGeolocationEnabled = false;
  private isRealtimeGeolocationEnabled = false;
  private isBackgroundTaskRegistered = false;
  private lastForegroundLocationLogAt = 0;
  private lastForegroundLocationSentAt = 0;
  private appStateSubscription: { remove: () => void } | null = null;
  // Set once a start has succeeded, so returning to the foreground only re-subscribes for a session
  // that was actually tracking — not for one that is signed out or was denied permission.
  private hasStartedLocationUpdates = false;

  private constructor() {
    // Register this service's update function to avoid circular dependency
    registerLocationServiceUpdater(this.updateBackgroundGeolocationSetting.bind(this));
    registerLocationServiceRealtimeUpdater(this.updateRealtimeGeolocationSetting.bind(this));
    this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange);
  }

  /**
   * `watchPositionAsync` holds the GPS on for as long as it is subscribed. On Android it keeps
   * doing that after the app is backgrounded, so leaving it running alongside the OS task meant two
   * independent consumers of the radio — and when background tracking is off, it meant tracking a
   * responder who has explicitly asked not to be tracked in the background.
   *
   * Dropping it on the way out and re-subscribing on the way back in leaves exactly one consumer at
   * any moment: the OS task while backgrounded (only registered when the setting allows it), the
   * watcher while foregrounded.
   */
  private handleAppStateChange = async (nextAppState: AppStateStatus): Promise<void> => {
    // AppState does not await this, so an unhandled rejection here — a permission revoked while the
    // app was away is the usual cause — would surface as a crash rather than a logged failure.
    try {
      if (nextAppState === 'background') {
        this.removeForegroundSubscription();
      } else if (nextAppState === 'active' && !this.locationSubscription && this.hasStartedLocationUpdates) {
        await this.startLocationUpdates();
      }
    } catch (error) {
      logger.warn({
        message: 'Failed to handle location app state change',
        context: { error, nextAppState },
      });
    }
  };

  private removeForegroundSubscription(): void {
    if (!this.locationSubscription) {
      return;
    }

    this.locationSubscription.remove();
    this.locationSubscription = null;
    logger.info({ message: 'Foreground location watcher released while backgrounded' });
  }

  static getInstance(): LocationService {
    if (!LocationService.instance) {
      LocationService.instance = new LocationService();
    }
    return LocationService.instance;
  }

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

  startLocationUpdates(): Promise<void> {
    if (!this.startLocationUpdatesPromise) {
      this.startLocationUpdatesPromise = this.startLocationUpdatesInternal()
        .catch((error) => {
          logger.error({
            message: 'Failed to start location updates',
            context: { error },
          });
          throw error;
        })
        .finally(() => {
          this.startLocationUpdatesPromise = null;
        });
    }

    return this.startLocationUpdatesPromise;
  }

  private async startLocationUpdatesInternal(): Promise<void> {
    const hasPermissions = await this.requestPermissions();
    if (!hasPermissions) {
      throw new Error('Location permissions not granted');
    }

    // Load background and realtime geolocation settings
    this.isBackgroundGeolocationEnabled = await loadBackgroundGeolocationState();
    this.isRealtimeGeolocationEnabled = await loadRealtimeGeolocationState();

    // Check if task is already registered for background updates
    const isTaskRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
    this.isBackgroundTaskRegistered = isTaskRegistered;
    if (!isTaskRegistered && this.isBackgroundGeolocationEnabled) {
      // Check background permission before registering background task
      const { status: backgroundStatus } = await Location.getBackgroundPermissionsAsync();
      if (backgroundStatus === 'granted') {
        await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, getBackgroundTaskOptions());
        this.isBackgroundTaskRegistered = true;
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

    // Remove any existing foreground subscription so repeated calls stay idempotent
    if (this.locationSubscription) {
      this.locationSubscription.remove();
      this.locationSubscription = null;
    }
    this.lastForegroundLocationLogAt = 0;
    this.lastForegroundLocationSentAt = 0;

    // Start foreground updates
    this.locationSubscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 15000,
        distanceInterval: 10,
      },
      async (location) => {
        // Fixes can arrive every second while moving; log at most once per
        // FOREGROUND_LOCATION_LOG_INTERVAL_MS to keep the console usable.
        const now = Date.now();
        if (now - this.lastForegroundLocationLogAt >= FOREGROUND_LOCATION_LOG_INTERVAL_MS) {
          this.lastForegroundLocationLogAt = now;
          logger.info({
            message: 'Foreground location update received',
            context: {
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
              heading: location.coords.heading,
            },
          });
        }
        useLocationStore.getState().setLocation(location);

        // When the background task is registered it posts the fixes. When it is not
        // (realtime on, background off) the foreground watcher is the only sender, so
        // dispatch would otherwise never see the responder move.
        //
        // The throttle is stamped from the result, not before the call: a fix rejected for poor
        // accuracy never reached the API, and burning the window on it would drop the usable fix
        // that lands a second later.
        if (!this.isBackgroundTaskRegistered && now - this.lastForegroundLocationSentAt >= FOREGROUND_LOCATION_API_INTERVAL_MS) {
          const wasSent = await sendLocationToAPI(location, this.isRealtimeGeolocationEnabled);
          if (wasSent) {
            this.lastForegroundLocationSentAt = now;
          }
        }
      }
    );

    this.hasStartedLocationUpdates = true;

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

    // Flipping the flag is worthless without a watcher, and one is not guaranteed to exist:
    // `startLocationUpdates` runs once per sign-in and throws when the permission prompt was
    // declined. A responder who denied location at launch, granted it in the OS settings and then
    // switched realtime on would otherwise have transmitted nothing until the next cold start.
    //
    // Restarting is idempotent — the existing subscription is replaced, not stacked — and it clears
    // the send throttle so the first fix after the toggle goes out immediately rather than up to
    // FOREGROUND_LOCATION_API_INTERVAL_MS later. Failures are logged rather than rethrown: the
    // setting itself was saved, and permissions can still be granted later.
    if (enabled) {
      try {
        await this.startLocationUpdates();
      } catch (error) {
        logger.error({
          message: 'Failed to start location updates after enabling realtime geolocation',
          context: { error },
        });
      }

      // startLocationUpdatesInternal re-reads the setting from storage, and
      // loadRealtimeGeolocationState answers `false` for a read that threw. The caller's explicit
      // choice wins over that guess -- otherwise one bad read would silently stop transmitting for
      // a responder who has the toggle switched on.
      this.isRealtimeGeolocationEnabled = enabled;
    }

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
        await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, getBackgroundTaskOptions());
        logger.info({
          message: 'Background location task registered after setting change',
        });
      }
      this.isBackgroundTaskRegistered = true;

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
      this.isBackgroundTaskRegistered = false;
    }
  }

  async stopLocationUpdates(): Promise<void> {
    this.hasStartedLocationUpdates = false;

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
    this.isBackgroundTaskRegistered = false;

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
