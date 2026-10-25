import type * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { AppState } from 'react-native';

import { setPersonLocation } from '@/api/personnel/personnelLocation';
import { useAuthStore } from '@/lib/auth';
import { logger } from '@/lib/logging';
import { loadBackgroundGeolocationState } from '@/lib/storage/background-geolocation';
import { SavePersonnelLocationInput } from '@/models/v4/personnelLocation/savePersonnelLocationInput';
import { useLocationStore } from '@/stores/app/location-store';

/**
 * The OS-managed location task and the uploader every fix goes through on its way to the API.
 *
 * This module is imported from the app entry (`index.ts`), not just from the signed-in layout.
 * When the OS relaunches a killed app to deliver a location -- Android restarting the foreground
 * service, iOS waking it for a significant location change -- it evaluates the bundle without
 * rendering a single route. A task defined only from a route module is then undefined, and every
 * fix delivered to it is dropped.
 */
export const LOCATION_TASK_NAME = 'location-updates';

/** Minimum gap between personnel-location posts, whichever consumer produced the fix. */
export const LOCATION_SEND_INTERVAL_MS = 15000;

/**
 * A fix this close to the last one posted is GPS jitter for a responder who has not moved. Each post
 * wakes the cellular radio, which then stays powered for several seconds, so skipping them is the
 * largest battery saving available once the GPS itself is already on.
 */
export const LOCATION_MIN_DISPLACEMENT_METERS = 25;

/**
 * A responder who has not moved is still re-posted this often. The department's map drops
 * personnel whose last location timestamp is older than its location TTL (minutes, 15 suggested),
 * and a responder who is trapped or unresponsive is exactly the one whose marker must not age off.
 *
 * A stationary device produces no fixes at all -- every consumer filters by distance -- so this
 * cannot wait for one. Two mechanisms cover it between them:
 * - A timer re-posts the latest fix with a fresh timestamp. It runs in the foreground everywhere,
 *   and in the background on iOS, where background location keeps the app (and its timers) alive.
 * - Android pauses JS timers in the background, so there the OS task is configured to deliver a
 *   batch every 30 s even when stationary, and the heartbeat goes out on the fix that is due.
 */
export const LOCATION_HEARTBEAT_INTERVAL_MS = 5 * 60 * 1000;

/** Fixes worse than this are discarded rather than moving the responder's pin across the map. */
const MAX_ACCEPTABLE_ACCURACY_METERS = 100;

const EARTH_RADIUS_METERS = 6371000;

/**
 * `sent` and `failed` both mean a request went out; `rejected` means a precondition stopped the fix
 * before any request was made, so it must not count against the send interval.
 */
export type LocationSendResult = 'sent' | 'failed' | 'rejected';

interface Coordinates {
  latitude: number;
  longitude: number;
}

interface SentLocation extends Coordinates {
  sentAt: number;
}

// Paces requests, so failed attempts count too.
let lastSendAttemptAt = 0;
// Only a successful post moves this: a fix the server never received cannot be what it shows, and
// the heartbeat has to be measured from what the server actually holds.
let lastSentLocation: SentLocation | null = null;
let pendingLocation: Location.LocationObject | null = null;
let pendingLocationTimer: ReturnType<typeof setTimeout> | null = null;
// Newest fix accepted for posting, whether or not it was posted: what the heartbeat reports.
let latestLocation: Location.LocationObject | null = null;
let heartbeatTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Whether a fix may be posted right now. A foreground fix always goes out -- the open app reports
 * where the responder is, Realtime Geolocation only governs receiving everyone else's positions --
 * while a background one goes out only under Background Geolocation.
 */
export const isTransmissionAllowedNow = async (): Promise<boolean> => (AppState.currentState === 'active' ? true : loadBackgroundGeolocationState());

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

const distanceInMeters = (from: Coordinates, to: Coordinates): number => {
  const deltaLatitude = toRadians(to.latitude - from.latitude);
  const deltaLongitude = toRadians(to.longitude - from.longitude);
  const a = Math.sin(deltaLatitude / 2) ** 2 + Math.cos(toRadians(from.latitude)) * Math.cos(toRadians(to.latitude)) * Math.sin(deltaLongitude / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(a)));
};

// Helper to safely convert numeric values to strings, guarding against invalid numbers.
const safeNumericString = (value: number | null | undefined, field: string): string => {
  // Treat null, undefined, NaN, and Infinity as invalid. Debug, not warn: Android routinely omits
  // altitude accuracy, and a warning here put a Sentry breadcrumb on every single post.
  if (value == null || !isFinite(value)) {
    logger.debug({ message: `Invalid ${field} value: ${value}, defaulting to '0'` });
    return '0';
  }
  return value.toString();
};

/** False, with the reason logged, for a fix that must not be transmitted at all. */
const isTransmittable = (location: Location.LocationObject, isTransmissionEnabled: boolean): boolean => {
  if (location.coords.accuracy != null && location.coords.accuracy > MAX_ACCEPTABLE_ACCURACY_METERS) {
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

  return true;
};

/**
 * Post a fix to the personnel-location endpoint, with no throttling of its own.
 *
 * `isTransmissionEnabled` is resolved by the caller, because what governs a fix depends on when it
 * was taken: a foreground fix is always sent, a background one only under Background Geolocation.
 */
export const sendLocationToAPI = async (location: Location.LocationObject, isTransmissionEnabled: boolean): Promise<LocationSendResult> => {
  if (!isTransmittable(location, isTransmissionEnabled)) {
    return 'rejected';
  }

  // Responder reports personnel locations, keyed on the signed-in user.
  const userId = useAuthStore.getState().userId;
  if (!userId) {
    logger.warn({ message: 'No authenticated user, skipping location API call' });
    return 'rejected';
  }

  try {
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
    return 'sent';
  } catch (error) {
    logger.error({
      message: 'Failed to send location to API',
      context: {
        error: error instanceof Error ? error.message : String(error),
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      },
    });
    return 'failed';
  }
};

const clearPendingLocation = (): void => {
  pendingLocation = null;
  if (pendingLocationTimer) {
    clearTimeout(pendingLocationTimer);
    pendingLocationTimer = null;
  }
};

const postLocation = async (location: Location.LocationObject): Promise<void> => {
  // A post supersedes anything still waiting: it is at least as new.
  clearPendingLocation();

  // Stamped before the request so a fix landing while it is in flight waits its turn instead of
  // racing it. A failed request still counts -- retrying every fix would hammer an endpoint that is
  // already refusing us -- but a rejected one never went out and hands the window back.
  const previousAttemptAt = lastSendAttemptAt;
  lastSendAttemptAt = Date.now();

  const result = await sendLocationToAPI(location, true);
  if (result === 'rejected') {
    lastSendAttemptAt = previousAttemptAt;
    return;
  }

  if (result === 'sent') {
    lastSentLocation = { latitude: location.coords.latitude, longitude: location.coords.longitude, sentAt: lastSendAttemptAt };
  }

  // Every post restarts the countdown, so the heartbeat only ever fires after a quiet stretch.
  scheduleHeartbeat();
};

const scheduleHeartbeat = (): void => {
  if (heartbeatTimer) {
    clearTimeout(heartbeatTimer);
  }
  heartbeatTimer = setTimeout(() => {
    heartbeatTimer = null;
    void sendHeartbeat();
  }, LOCATION_HEARTBEAT_INTERVAL_MS);
};

const sendHeartbeat = async (): Promise<void> => {
  const location = latestLocation;
  if (!location) {
    return;
  }

  // Scheduled from a post that may have been made in the foreground. iOS keeps the app -- and this
  // timer -- alive in the background for audio and VoIP as well as for background location, so the
  // setting that governs a background post is read again now. Not rescheduled when refused: the
  // next post that is allowed restarts it.
  if (!(await isTransmissionAllowedNow())) {
    logger.debug({ message: 'Skipping location heartbeat, transmission is not allowed in the current app state' });
    return;
  }

  // No fix arrived because the responder has not moved past the distance filter, or the device
  // can no longer get one at all. Either way the latest fix is still the best known position, and
  // the map ages markers by timestamp, so it is reported as current.
  logger.info({ message: 'Posting location heartbeat for a responder who has not moved' });
  await postLocation({ ...location, timestamp: Date.now() });
};

const flushPendingLocation = (): void => {
  pendingLocationTimer = null;
  const location = pendingLocation;
  pendingLocation = null;
  if (location) {
    void postLocation(location);
  }
};

/**
 * Hand a fix to the uploader, which decides whether -- and when -- it goes out.
 *
 * - At most one post per LOCATION_SEND_INTERVAL_MS. iOS has no native time interval, so a moving
 *   device delivers a fix every second or so; posting each one kept the radio on continuously.
 * - A responder who has not moved LOCATION_MIN_DISPLACEMENT_METERS is not re-posted until
 *   LOCATION_HEARTBEAT_INTERVAL_MS has passed.
 * - A fix that lands inside the interval is held, newest wins, and posted when the interval ends.
 *   Dropping it instead would leave a responder who stops right after a post shown hundreds of
 *   metres short of where they are, because a stationary device produces no further fixes.
 */
export const submitLocationUpdate = async (location: Location.LocationObject, isTransmissionEnabled: boolean): Promise<void> => {
  if (!isTransmittable(location, isTransmissionEnabled)) {
    return;
  }

  latestLocation = location;

  const now = Date.now();
  const sinceLastAttempt = now - lastSendAttemptAt;

  if (lastSentLocation && now - lastSentLocation.sentAt < LOCATION_HEARTBEAT_INTERVAL_MS && distanceInMeters(lastSentLocation, location.coords) < LOCATION_MIN_DISPLACEMENT_METERS) {
    // A held fix is older than this one and no farther from the last post; neither needs sending.
    clearPendingLocation();
    logger.debug({ message: 'Skipping location post, responder has not moved' });
    return;
  }

  if (sinceLastAttempt < LOCATION_SEND_INTERVAL_MS) {
    pendingLocation = location;
    if (!pendingLocationTimer) {
      pendingLocationTimer = setTimeout(flushPendingLocation, LOCATION_SEND_INTERVAL_MS - sinceLastAttempt);
    }
    return;
  }

  await postLocation(location);
};

/**
 * Forget everything the uploader holds. Called on sign-out, so a fix held for the outgoing user is
 * never posted under the next one, and whenever transmission is switched off.
 */
export const resetLocationUploadState = (): void => {
  clearPendingLocation();
  if (heartbeatTimer) {
    clearTimeout(heartbeatTimer);
    heartbeatTimer = null;
  }
  lastSendAttemptAt = 0;
  lastSentLocation = null;
  latestLocation = null;
};

TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    logger.error({
      message: 'Location task error',
      context: { error },
    });
    return;
  }

  const locations = (data as { locations?: Location.LocationObject[] } | undefined)?.locations;
  // Both platforms defer fixes while backgrounded and deliver them as one batch, oldest first. The
  // newest is where the responder is; the first one can be half a minute and a kilometre stale.
  const location = locations && locations.length > 0 ? locations[locations.length - 1] : undefined;
  if (!location) {
    return;
  }

  logger.info({
    message: 'Background location update received',
    context: {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      heading: location.coords.heading,
      batchSize: locations?.length ?? 0,
    },
  });

  // Always update local store
  useLocationStore.getState().setLocation(location);

  // The OS task keeps delivering while the app is foregrounded, so the fix has to be attributed to
  // the right app state before it can be sent.
  await submitLocationUpdate(location, await isTransmissionAllowedNow());
});
