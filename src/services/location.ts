import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { AppState, type AppStateStatus, Platform } from 'react-native';

import { registerLocationServiceUpdater } from '@/lib/hooks/use-background-geolocation';
import { registerLocationServiceRealtimeUpdater } from '@/lib/hooks/use-realtime-geolocation';
import { translate } from '@/lib/i18n/utils';
import { logger } from '@/lib/logging';
import { loadBackgroundGeolocationState } from '@/lib/storage/background-geolocation';
import { saveRealtimeGeolocationState } from '@/lib/storage/realtime-geolocation';
import { useLocationStore } from '@/stores/app/location-store';

import { LOCATION_TASK_NAME, resetLocationUploadState, sendLocationToAPI, submitLocationUpdate } from './location-task';

// Minimum gap between foreground location log lines (updates can fire every second).
const FOREGROUND_LOCATION_LOG_INTERVAL_MS = 30000;

/**
 * Options for the OS-managed background task.
 *
 * `deferredUpdates*` is the significant battery lever: while the app is backgrounded, both platforms
 * collect fixes natively and hand them over in one batch once 30 s (and on iOS 25 m) have passed, instead of
 * waking the JS runtime -- and the radio, for the post -- on every fix. In the foreground neither
 * platform defers, so the task alone keeps the map current there too.
 *
 * `pausesUpdatesAutomatically` is deliberately false. iOS will otherwise stop updates when it
 * decides the device has been stationary for a while and only resume on significant motion — which
 * for AVL reads on dispatch's map as a responder who has dropped off the air.
 *
 * `showsBackgroundLocationIndicator` keeps the iOS status-bar indicator lit while we hold a
 * background fix. It is not just an App Store expectation; a responder is entitled to see that the
 * app is tracking them.
 *
 * Android drops both distance filters. It pauses JS timers in the background, so the uploader's
 * heartbeat timer cannot keep a stationary responder fresh there; a batch every 30 s, moving or
 * not, is what carries the heartbeat instead. It costs no extra positioning -- the fused provider
 * computes a fix every `timeInterval` either way and the distance filter only withholds delivery --
 * just a short JS run per batch, with the post itself still skipped until the heartbeat is due.
 * iOS keeps timers running while background location holds the app alive, so it keeps the filters.
 */
const getBackgroundTaskOptions = (): Location.LocationTaskOptions => ({
  accuracy: Location.Accuracy.Balanced,
  timeInterval: 15000,
  distanceInterval: Platform.OS === 'android' ? 0 : 10,
  deferredUpdatesInterval: 30000,
  deferredUpdatesDistance: Platform.OS === 'android' ? 0 : 25,
  pausesUpdatesAutomatically: false,
  activityType: Location.LocationActivityType.Other,
  showsBackgroundLocationIndicator: true,
  foregroundService: {
    notificationTitle: translate('location.tracking_notification_title'),
    notificationBody: translate('location.tracking_notification_body'),
  },
});

/**
 * Owns which consumer of the location hardware is running. Exactly one is, at any moment:
 *
 * - Background Geolocation on: the OS task, in the foreground and the background alike. It delivers
 *   foreground fixes at the same cadence a watcher would, so a watcher alongside it only doubled the
 *   location requests and the JS work per fix.
 * - Background Geolocation off: a `watchPositionAsync` watcher, held only while foregrounded.
 *
 * Whichever it is, every foreground fix is posted: the open app always reports where the responder
 * is. Realtime Geolocation has no say here -- it only governs receiving other people's positions
 * over the geolocation hub, which the settings hook connects and disconnects.
 */
class LocationService {
  private static instance: LocationService;
  private locationSubscription: Location.LocationSubscription | null = null;
  private startLocationUpdatesPromise: Promise<void> | null = null;
  private isBackgroundGeolocationEnabled = false;
  private isBackgroundTaskRegistered = false;
  private lastForegroundLocationLogAt = 0;
  private appStateSubscription: { remove: () => void } | null = null;
  // Set when the signed-in session asks for tracking and cleared on sign-out, whether or not the
  // start succeeded, so a start that failed on permission can be retried once it is granted.
  private isTrackingRequested = false;
  // Set once a start has succeeded, so returning to the foreground only re-subscribes for a session
  // that was actually tracking — not for one that is signed out or was denied permission.
  private hasStartedLocationUpdates = false;
  // Bumped whenever the foreground watcher is released. `watchPositionAsync` is async, so a start
  // that was in flight at that moment resolves with a live watcher that nothing asked for any more;
  // comparing generations is how that start knows to throw it away.
  private foregroundWatchGeneration = 0;

  private constructor() {
    // Register this service's update function to avoid circular dependency
    registerLocationServiceUpdater(this.updateBackgroundGeolocationSetting.bind(this));
    registerLocationServiceRealtimeUpdater(this.updateRealtimeGeolocationSetting.bind(this));
    this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange);
  }

  /**
   * `watchPositionAsync` holds the GPS on for as long as it is subscribed. On Android it keeps
   * doing that after the app is backgrounded, which with background tracking off meant tracking a
   * responder who has explicitly asked not to be tracked in the background.
   *
   * So the watcher is dropped on the way out and re-subscribed on the way back in. The OS task needs
   * neither: it already runs in both states.
   */
  private handleAppStateChange = async (nextAppState: AppStateStatus): Promise<void> => {
    // AppState does not await this, so an unhandled rejection here — a permission revoked while the
    // app was away is the usual cause — would surface as a crash rather than a logged failure.
    try {
      if (nextAppState === 'background') {
        this.removeForegroundSubscription();
      } else if (nextAppState === 'active') {
        await this.resumeForegroundTracking();
      }
    } catch (error) {
      logger.warn({
        message: 'Failed to handle location app state change',
        context: { error, nextAppState },
      });
    }
  };

  private async resumeForegroundTracking(): Promise<void> {
    if (!this.isTrackingRequested || this.locationSubscription || this.isBackgroundTaskRegistered) {
      return;
    }

    // The start this session asked for never succeeded, most often because the permission prompt
    // was declined. Granting location in the OS settings brings the responder back through here, so
    // retry -- but only on a grant that has already been made. Requesting would re-prompt on every
    // return to the app, nagging a responder who has said no.
    if (!this.hasStartedLocationUpdates) {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') {
        return;
      }
    }

    await this.startLocationUpdates();
  }

  private removeForegroundSubscription(): void {
    // Invalidate first, and unconditionally: the watcher being released may still be in flight
    // inside `startLocationUpdatesInternal`, in which case there is nothing here to remove yet but
    // that pending start must still be told its result is stale.
    this.foregroundWatchGeneration += 1;

    if (!this.locationSubscription) {
      return;
    }

    this.locationSubscription.remove();
    this.locationSubscription = null;
    logger.info({ message: 'Foreground location watcher released' });
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
    this.isTrackingRequested = true;

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

  /**
   * Bring the OS task in line with the Background Geolocation setting and report whether it is
   * running.
   *
   * A task left registered while the setting is off -- by an earlier session, or after background
   * permission was withdrawn -- kept the GPS on in the background for fixes nothing would send. An
   * already-registered task is registered again on purpose: that replaces its options in place, so
   * an install upgraded from a build with different options does not keep running the old ones.
   *
   * A registration that fails falls back to the foreground watcher rather than failing the start:
   * a responder without background tracking should still be tracked while the app is open.
   */
  private async syncBackgroundTask(): Promise<boolean> {
    const isTaskRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);

    if (this.isBackgroundGeolocationEnabled) {
      const { status: backgroundStatus } = await Location.getBackgroundPermissionsAsync();
      if (backgroundStatus === 'granted') {
        try {
          await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, getBackgroundTaskOptions());
          logger.info({
            message: isTaskRegistered ? 'Background location task options refreshed' : 'Background location task registered',
          });
          return true;
        } catch (error) {
          logger.error({
            message: 'Failed to register background location task, falling back to the foreground watcher',
            context: { error },
          });
          return false;
        }
      }

      logger.warn({
        message: 'Background location permission not granted, skipping background task registration',
        context: { backgroundStatus },
      });
    }

    if (isTaskRegistered) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      logger.info({ message: 'Stopped background location task the current settings do not allow' });
    }

    return false;
  }

  private async startLocationUpdatesInternal(): Promise<void> {
    // Captured before the first await: a backgrounding at any point during the start — the
    // permission prompt and the settings reads are all async — has to invalidate the watcher this
    // call is about to create, not just one that lands after `watchPositionAsync` was reached.
    const generation = this.foregroundWatchGeneration;

    const hasPermissions = await this.requestPermissions();
    if (!hasPermissions) {
      throw new Error('Location permissions not granted');
    }

    this.isBackgroundGeolocationEnabled = await loadBackgroundGeolocationState();

    this.isBackgroundTaskRegistered = await this.syncBackgroundTask();

    if (this.isBackgroundTaskRegistered) {
      // The task delivers foreground fixes itself, feeding the store and posting them; a watcher
      // here would be a second consumer of the same fixes.
      this.removeForegroundSubscription();
      this.hasStartedLocationUpdates = true;
      logger.info({
        message: 'Location updates started on the background task',
        context: { backgroundEnabled: this.isBackgroundGeolocationEnabled },
      });
      return;
    }

    // Remove any existing foreground subscription so repeated calls stay idempotent
    if (this.locationSubscription) {
      this.locationSubscription.remove();
      this.locationSubscription = null;
    }
    this.lastForegroundLocationLogAt = 0;

    // Start foreground updates
    const subscription = await Location.watchPositionAsync(
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

        // No background task is running, so the watcher is the only sender; dispatch would
        // otherwise never see the responder move. The uploader paces the posts.
        await submitLocationUpdate(location, true);
      }
    );

    // The start itself succeeded — permissions, settings and the background task are all in place —
    // so the session counts as tracking and a return to the foreground should re-subscribe.
    this.hasStartedLocationUpdates = true;

    // The watcher was released while this call was in flight: the app went to the background, or
    // the background task took over. Adopting it now would hold the GPS on exactly where it was
    // just released, and with background tracking off it would track a responder who asked not to be.
    if (generation !== this.foregroundWatchGeneration) {
      subscription.remove();
      logger.info({ message: 'Discarded foreground location watcher that resolved after it was released' });
      return;
    }

    this.locationSubscription = subscription;

    logger.info({
      message: 'Foreground location updates started',
      context: { backgroundEnabled: this.isBackgroundGeolocationEnabled },
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

  /**
   * Realtime Geolocation only governs receiving other people's positions, and the settings hook
   * owns that hub connection. Sending this device's position does not depend on it, so the location
   * consumers are left exactly as they are.
   */
  async updateRealtimeGeolocationSetting(enabled: boolean): Promise<void> {
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

      // Registering an existing task only replaces its options, so this is safe either way.
      await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, getBackgroundTaskOptions());
      logger.info({
        message: 'Background location task registered after setting change',
      });
      this.isBackgroundTaskRegistered = true;

      // The task now delivers the foreground fixes as well.
      this.removeForegroundSubscription();

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

      // Hand foreground tracking back to the watcher, or the open app would stop updating the map.
      if (this.hasStartedLocationUpdates && AppState.currentState === 'active') {
        try {
          await this.startLocationUpdates();
        } catch (error) {
          logger.error({
            message: 'Failed to start the foreground watcher after disabling background geolocation',
            context: { error },
          });
        }
      }
    }
  }

  async stopLocationUpdates(): Promise<void> {
    this.isTrackingRequested = false;
    this.hasStartedLocationUpdates = false;

    // Through the generation bump, so a start still in flight discards its watcher too.
    this.removeForegroundSubscription();

    // A fix held for the outgoing user must never be posted under the next one.
    resetLocationUploadState();

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
export { resetLocationUploadState, sendLocationToAPI };
