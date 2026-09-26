import * as Location from 'expo-location';

import { translate } from '@/lib/i18n/utils';
import { logger } from '@/lib/logging';
import { useLocationStore } from '@/stores/app/location-store';

/**
 * On-demand location fix, used when a status submission needs coordinates.
 *
 * The continuous watcher in `@/services/location` only runs while the app is signed in and the
 * OS granted permission at launch, and the store it feeds is deliberately not persisted. A
 * submission therefore cannot assume there is anything cached: it has to ask for a fix at the
 * moment it needs one, which is also what makes a `Gps`-required status enforceable.
 */
export type LocationFixOutcome = 'acquired' | 'permission-denied' | 'services-disabled' | 'unavailable';

export interface LocationFixResult {
  outcome: LocationFixOutcome;
  location: Location.LocationObject | null;
}

/**
 * Every native call below is bounded: a status submission waits on this whole function, and a
 * call that never settles would leave the sheet on "Submitting..." until the app is killed.
 *
 * `getCurrentPositionAsync` has no timeout of its own — indoors it can sit on the request until
 * the OS gives up, which on Android is effectively never.
 */
const FIX_TIMEOUT_MS = 8000;

/**
 * Generous, because it covers the user reading the OS prompt. It exists for the request that never
 * settles at all: on Android, a permission request made outside Expo (`PermissionsAndroid`,
 * react-native-permissions) that overlaps an Expo one takes the activity's single result callback,
 * and Expo then holds every later request behind the one that never heard back -- until the
 * process restarts. Reporting that as denied points the user at the settings screen, and a
 * permission granted there is read back without any prompt.
 */
const PERMISSION_TIMEOUT_MS = 30 * 1000;

/** Both are quick reads of device state; anything slower is a stuck native call, not a slow one. */
const SERVICES_CHECK_TIMEOUT_MS = 3000;
const LAST_KNOWN_TIMEOUT_MS = 3000;

/** A fix from the last minute is a fine answer for "where are you now" and costs no radio time. */
const LAST_KNOWN_MAX_AGE_MS = 60 * 1000;

const TIMED_OUT = Symbol('location-fix-timed-out');

/**
 * Resolves with the promise's value, or `TIMED_OUT` if it has not settled within `ms`. The timer is
 * cleared either way: leaving it pending keeps a Jest fake-timer test from settling and, in the
 * app, holds a needless reference for its duration.
 */
const settleWithin = <T>(promise: Promise<T>, ms: number): Promise<T | typeof TIMED_OUT> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => resolve(TIMED_OUT), ms);

    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });

const readLiveFix = async (): Promise<Location.LocationObject | null> => {
  const location = await settleWithin(
    Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).catch((error) => {
      logger.warn({
        message: 'Failed to acquire current position',
        context: { error: error instanceof Error ? error.message : String(error) },
      });
      return null;
    }),
    FIX_TIMEOUT_MS
  );

  return location === TIMED_OUT ? null : location;
};

const readLastKnown = async (): Promise<Location.LocationObject | null> => {
  try {
    const location = await settleWithin(Location.getLastKnownPositionAsync({ maxAge: LAST_KNOWN_MAX_AGE_MS }), LAST_KNOWN_TIMEOUT_MS);

    if (location === TIMED_OUT) {
      logger.warn({ message: 'Reading the last known position did not settle' });
      return null;
    }

    return location;
  } catch (error) {
    logger.warn({
      message: 'Failed to read last known position',
      context: { error: error instanceof Error ? error.message : String(error) },
    });
    return null;
  }
};

/**
 * Ask for a position, prompting for permission if it has not been decided yet.
 *
 * `permission-denied` and `unavailable` are kept apart because they are different problems for the
 * responder to fix: one is a trip to the OS settings, the other is a walk to a window. A caller
 * enforcing a GPS-required status needs to say which.
 */
const resolveForegroundPermission = async (): Promise<Location.LocationPermissionResponse> => {
  const permission = await Location.getForegroundPermissionsAsync();

  // `canAskAgain` is false once the user has hard-denied; prompting again is a no-op that
  // returns the same denial, so skip straight to reporting it.
  if (permission.status !== 'granted' && permission.canAskAgain) {
    return Location.requestForegroundPermissionsAsync();
  }

  return permission;
};

export const acquireLocationFix = async (): Promise<LocationFixResult> => {
  let permission: Location.LocationPermissionResponse | typeof TIMED_OUT;

  try {
    permission = await settleWithin(resolveForegroundPermission(), PERMISSION_TIMEOUT_MS);
  } catch (error) {
    logger.warn({
      message: 'Failed to resolve location permissions for fix',
      context: { error: error instanceof Error ? error.message : String(error) },
    });
    return { outcome: 'permission-denied', location: null };
  }

  if (permission === TIMED_OUT) {
    logger.warn({ message: 'Location permission request did not settle; reporting it as denied' });
    return { outcome: 'permission-denied', location: null };
  }

  if (permission.status !== 'granted') {
    logger.info({
      message: 'Location fix requested without permission',
      context: { status: permission.status, canAskAgain: permission.canAskAgain },
    });
    return { outcome: 'permission-denied', location: null };
  }

  // Permission can be granted while the device's location services are switched off entirely; the
  // position call then fails in a way that looks identical to "no signal" unless we check.
  try {
    const servicesEnabled = await settleWithin(Location.hasServicesEnabledAsync(), SERVICES_CHECK_TIMEOUT_MS);
    if (servicesEnabled === TIMED_OUT) {
      // Same as a check that throws: let the position attempt decide.
      logger.warn({ message: 'Checking whether location services are enabled did not settle' });
    } else if (!servicesEnabled) {
      logger.info({ message: 'Location services are disabled on the device' });
      return { outcome: 'services-disabled', location: null };
    }
  } catch (error) {
    // Treat an unanswerable services check as "probably fine" and let the position attempt decide.
    logger.warn({
      message: 'Failed to check whether location services are enabled',
      context: { error: error instanceof Error ? error.message : String(error) },
    });
  }

  let location = await readLiveFix();

  // A timed-out live fix is common indoors. A recent cached one is still a truthful answer and is
  // far better than refusing a GPS-required status outright.
  if (!location) {
    location = await readLastKnown();
  }

  if (!location) {
    logger.info({ message: 'No location fix available for submission' });
    return { outcome: 'unavailable', location: null };
  }

  // Feed the store so the map and anything else reading it benefit from the fix we just paid for.
  // A store write is a side benefit, not the point of the call: if it throws, the caller still has
  // a real fix and a GPS-required status must not be refused over it.
  try {
    useLocationStore.getState().setLocation(location);
  } catch (error) {
    logger.warn({
      message: 'Failed to write acquired location fix to the store',
      context: { error: error instanceof Error ? error.message : String(error) },
    });
  }

  return { outcome: 'acquired', location };
};

const FIX_ERROR_KEYS = {
  'permission-denied': 'location.fix_permission_denied',
  'services-disabled': 'location.fix_services_disabled',
  unavailable: 'location.fix_unavailable',
} as const;

const FIX_ERROR_FALLBACKS: Record<Exclude<LocationFixOutcome, 'acquired'>, string> = {
  'permission-denied': 'Location permission is required. Enable location access in your device settings and try again.',
  'services-disabled': 'Location services are turned off. Turn them on in your device settings and try again.',
  unavailable: 'Could not get a location fix. Move to an area with a clearer view of the sky and try again.',
};

/**
 * Message for a failed fix, naming the specific obstacle. "GPS is required for this status" leaves
 * the responder guessing; "turn location services on" tells them what to do about it.
 */
export const getLocationFixErrorMessage = (outcome: Exclude<LocationFixOutcome, 'acquired'>): string => {
  const key = FIX_ERROR_KEYS[outcome];
  const message = translate(key);
  return typeof message === 'string' && message.length > 0 && message !== key ? message : FIX_ERROR_FALLBACKS[outcome];
};
