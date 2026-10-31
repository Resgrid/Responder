import { type Href, router } from 'expo-router';
import { Linking, Platform } from 'react-native';

import { getNavigationApp, type NavigationApp } from '@/lib/storage/navigation-app';

import { logger } from './logging';

export interface RouterPushRetryOptions {
  maxAttempts?: number;
  retryDelayMs?: number;
  /**
   * Extra gate the push waits on, beyond the router itself being mounted. Deep links
   * use it to hold until the session has hydrated — pushing a protected route before
   * then just gets the app redirected straight back out by the auth guard.
   */
  waitUntil?: () => boolean;
}

let navigationReadyCheck: (() => boolean) | null = null;

/**
 * Publishes the navigation container's real readiness, registered by the root layout.
 *
 * `router.push` does NOT throw when the root layout has not mounted yet: expo-router
 * logs a warning and drops the navigation on the floor. Retrying inside a `catch` was
 * therefore waiting on an error that never arrived, which is why a push-notification
 * tap that cold-started the app silently landed on the home screen instead of the
 * target route.
 *
 * Defaults to ready when nothing has registered, so callers outside the app tree (and
 * tests) behave exactly as before.
 */
export const registerNavigationReadyCheck = (check: (() => boolean) | null): void => {
  navigationReadyCheck = check;
};

export const isNavigationReady = (): boolean => navigationReadyCheck?.() ?? true;

/**
 * Pushes an expo-router href, waiting for the router (and any caller-supplied gate) to
 * be ready. Throws once the retry budget is exhausted.
 */
export const routerPushWithRetry = async (href: Href, options?: RouterPushRetryOptions): Promise<void> => {
  const maxAttempts = options?.maxAttempts ?? 1;
  const retryDelayMs = options?.retryDelayMs ?? 250;
  const waitUntil = options?.waitUntil;

  let lastError: unknown;

  for (let attempt = 1; ; attempt++) {
    // Only push once the router can actually receive it — an early push is discarded
    // without an error, so attempting regardless would burn the whole budget silently.
    // A gate that throws counts as not-ready rather than aborting: the retry budget then
    // surfaces one clear error instead of the navigation vanishing without explanation.
    let ready: boolean;
    try {
      ready = isNavigationReady() && (waitUntil?.() ?? true);
    } catch (error) {
      lastError = error;
      ready = false;
    }

    if (ready) {
      try {
        router.push(href);
        return;
      } catch (error) {
        lastError = error;
      }
    }

    if (attempt >= maxAttempts) {
      throw lastError ?? new Error('Navigation never became ready; the push was dropped.');
    }

    await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
  }
};

// ---------------------------------------------------------------------------
// Turn-by-turn navigation hand-off
// ---------------------------------------------------------------------------
//
// Which app opens is the per-device "Navigation app" setting (`@/lib/storage/navigation-app`):
//
// - default:     Android geo: intent (the default navigation app, or the system chooser);
//                iOS Apple Maps; web / desktop Google Maps in the browser.
// - google_maps: Android google.navigation: intent; iOS comgooglemaps:// when installed;
//                web / desktop Google Maps in the browser.
// - apple_maps:  iOS Apple Maps. It is offered on iOS only; elsewhere it behaves as default.
// - waze:        waze:// when installed, else the https://waze.com/ul universal link (which
//                opens Waze when installed, else the Waze web / store page).
//
// The apps below are offered on iOS and Android only. Several cannot start a route from a link, so
// they open at the destination instead; a destination one of them cannot take (an address, mostly)
// goes to the device default chain above.
//
// - gaia_gps:     iOS gaiagps:// map; then the gaiagps.com/map universal link. Shows the point.
// - here_wego:    the share.here.com route universal link, from the live location. Coordinates only.
// - mapquest:     quest://search — MapQuest has no directions link, so it searches the destination.
// - onx_offroad:  the offroad.onxmaps.com query universal link. Shows the point. Coordinates only.
// - organic_maps: om:// route when there is an origin (its route link needs a start point), else a
//                 pin; an address is searched. Then the same link on omaps.app.
// - osmand:       Android osmand.api://navigate (navigate_search for an address, which needs an
//                 origin); iOS osmandmaps://navigate. Then osmand.net route planning.
//
// Every chain ends with the Google Maps https URL, used only if everything before it failed to open.
//
// `waze` and `comgooglemaps` are only probed with `Linking.canOpenURL`, which needs the scheme
// declared for querying (LSApplicationQueriesSchemes in app.config.ts; the Android <queries>
// entry added by customManifest.plugin.js). Everything else is opened directly and the chain
// moves on only when `openURL` rejects — `canOpenURL('geo:…')` is false on Android 11+ without
// a <queries> declaration, which is what used to divert every Android tap to Google Maps.

interface NavigationCoordinates {
  latitude: string;
  longitude: string;
}

interface NavigationDestination {
  /** Validated, invariant-formatted destination coordinates, or null to navigate by address. */
  coordinates: NavigationCoordinates | null;
  /** Trimmed destination address, used only when there are no usable coordinates. */
  address: string | null;
  /** Display name for the pin, where the target app supports one. */
  label: string | null;
  /** Explicit starting point; omitted means the navigation app uses the device's current location. */
  origin: NavigationCoordinates | null;
}

interface NavigationAttempt {
  url: string;
  /** Open only when `Linking.canOpenURL` confirms the app is installed (the scheme is declared for querying). */
  requiresInstalledApp?: boolean;
}

/**
 * One coordinate component as a number, or null when it is missing, not numeric or out of range.
 * Accepts numbers and numeric strings, including a decimal comma ("50,8503") from a locale-formatted source.
 */
const parseCoordinate = (value: number | string | null | undefined, limit: number): number | null => {
  if (value === null || value === undefined) {
    return null;
  }

  let numeric: number;
  if (typeof value === 'number') {
    numeric = value;
  } else {
    const trimmed = value.trim();
    if (trimmed === '') {
      return null;
    }
    // A lone comma between digits is a decimal separator, not a lat/lng separator.
    numeric = Number(/^-?\d+,\d+$/.test(trimmed) ? trimmed.replace(',', '.') : trimmed);
  }

  return Number.isFinite(numeric) && Math.abs(numeric) <= limit ? numeric : null;
};

/** Locale-invariant decimal text: a dot separator, no exponent notation, no trailing zeros. */
const formatCoordinate = (value: number): string => {
  const formatted = value.toFixed(6).replace(/\.?0+$/, '');
  return formatted === '-0' ? '0' : formatted;
};

/** Both components as URL-ready text, or null when either is unusable. (0,0) is the server's "no location" sentinel. */
const toNavigationCoordinates = (latitude: number | string | null | undefined, longitude: number | string | null | undefined): NavigationCoordinates | null => {
  const lat = parseCoordinate(latitude, 90);
  const lng = parseCoordinate(longitude, 180);
  if (lat === null || lng === null || (lat === 0 && lng === 0)) {
    return null;
  }
  return { latitude: formatCoordinate(lat), longitude: formatCoordinate(lng) };
};

const toNonEmpty = (value: string | null | undefined): string | null => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

const toPair = (coordinates: NavigationCoordinates): string => `${coordinates.latitude},${coordinates.longitude}`;

/** The destination as a URL parameter value: the coordinate pair, or the encoded address. */
const toDestinationParam = ({ coordinates, address }: NavigationDestination): string => (coordinates ? toPair(coordinates) : encodeURIComponent(address ?? ''));

/** Parentheses delimit the label inside a geo: query, so they must not appear unencoded in it. */
const encodeGeoLabel = (label: string): string => encodeURIComponent(label).replace(/\(/g, '%28').replace(/\)/g, '%29');

const googleMapsWebUrl = (destination: NavigationDestination): string => {
  const origin = destination.origin ? `&origin=${toPair(destination.origin)}` : '';
  return `https://www.google.com/maps/dir/?api=1${origin}&destination=${toDestinationParam(destination)}&travelmode=driving`;
};

const appleMapsUrl = (destination: NavigationDestination): string => {
  const origin = destination.origin ? `saddr=${toPair(destination.origin)}&` : '';
  return `maps://maps.apple.com/?${origin}daddr=${toDestinationParam(destination)}&dirflg=d`;
};

const googleMapsIosUrl = (destination: NavigationDestination): string => {
  const origin = destination.origin ? `saddr=${toPair(destination.origin)}&` : '';
  return `comgooglemaps://?${origin}daddr=${toDestinationParam(destination)}&directionsmode=driving`;
};

/** Google Maps' own turn-by-turn intent; it always starts from the current location. */
const googleNavigationUrl = (destination: NavigationDestination): string => `google.navigation:q=${toDestinationParam(destination)}`;

/** The generic Android location intent, which every navigation app (Waze, Google Maps, ...) handles. */
const geoUrl = ({ coordinates, address, label }: NavigationDestination): string => {
  if (coordinates) {
    const pair = toPair(coordinates);
    return `geo:${pair}?q=${pair}${label ? `(${encodeGeoLabel(label)})` : ''}`;
  }
  return `geo:0,0?q=${encodeURIComponent(address ?? '')}`;
};

/** Waze always navigates from the current location, so the origin is not passed. */
const wazeQuery = ({ coordinates, address }: NavigationDestination): string => (coordinates ? `ll=${toPair(coordinates)}` : `q=${encodeURIComponent(address ?? '')}`);

/** The zoom Gaia GPS opens at: close enough to read the trails around the point. */
const GAIA_GPS_ZOOM = 14;

/**
 * Organic Maps' link path and query. Its route link needs an explicit start point, with all five keys
 * in this order, so without an origin the destination is shown as a pin instead.
 */
const organicMapsPath = ({ coordinates, address, label, origin }: NavigationDestination): string => {
  if (coordinates && origin) {
    return `route?sll=${toPair(origin)}&saddr=&dll=${toPair(coordinates)}&daddr=${encodeURIComponent(label ?? toPair(coordinates))}&type=vehicle`;
  }
  if (coordinates) {
    return `map?v=1&ll=${toPair(coordinates)}${label ? `&n=${encodeURIComponent(label)}` : ''}`;
  }
  return `search?query=${encodeURIComponent(address ?? '')}`;
};

/**
 * OsmAnd's own links, which start guidance: its Android URL API and its iOS scheme. Null when OsmAnd
 * cannot take the destination: an address search needs a point to search around (the origin), and
 * iOS has no address link.
 */
const osmandAttempts = ({ coordinates, address, label, origin }: NavigationDestination, platform: string): NavigationAttempt[] | null => {
  if (coordinates) {
    // osmand.net's route planner opens OsmAnd on iOS (a universal link) and the web planner otherwise.
    const routePlanner: NavigationAttempt = { url: `https://osmand.net/map/navigate/?end=${toPair(coordinates)}&profile=car` };
    const name = label ? encodeURIComponent(label) : null;
    return platform === 'android'
      ? [{ url: `osmand.api://navigate?dest_lat=${coordinates.latitude}&dest_lon=${coordinates.longitude}${name ? `&dest_name=${name}` : ''}&profile=car` }, routePlanner]
      : [{ url: `osmandmaps://navigate?lat=${coordinates.latitude}&lon=${coordinates.longitude}${name ? `&title=${name}` : ''}` }, routePlanner];
  }

  return platform === 'android' && origin
    ? [{ url: `osmand.api://navigate_search?dest_search_query=${encodeURIComponent(address ?? '')}&search_lat=${origin.latitude}&search_lon=${origin.longitude}&profile=car` }]
    : null;
};

/**
 * The app's own URLs for the apps offered on iOS and Android only, or null when the app is not one of
 * them or cannot take this destination (the caller then uses the device default). Each custom scheme
 * is opened directly: `openURL` rejects when the app is not installed, and the chain moves on.
 */
const buildMobileAppAttempts = (destination: NavigationDestination, app: NavigationApp, platform: string): NavigationAttempt[] | null => {
  const { coordinates } = destination;

  switch (app) {
    case 'gaia_gps': {
      if (!coordinates) {
        return null;
      }
      // Gaia GPS centers its map on the point; it has no route or address link. Its Android app has no custom scheme.
      const universalLink: NavigationAttempt = { url: `https://www.gaiagps.com/map/?lat=${coordinates.latitude}&lon=${coordinates.longitude}&zoom=${GAIA_GPS_ZOOM}` };
      return platform === 'ios' ? [{ url: `gaiagps://map?lat=${coordinates.latitude}&lng=${coordinates.longitude}&z=${GAIA_GPS_ZOOM}` }, universalLink] : [universalLink];
    }
    case 'here_wego': {
      if (!coordinates) {
        return null;
      }
      // `mylocation` starts the route from the live position. The link opens HERE WeGo when installed, else WeGo on the web.
      const name = destination.label ? `,${encodeURIComponent(destination.label)}` : '';
      return [{ url: `https://share.here.com/r/mylocation/${toPair(coordinates)}${name}?m=d` }];
    }
    case 'mapquest':
      // MapQuest's only deep link is a search, so it opens the destination as a search result.
      return [{ url: `quest://search?q=${toDestinationParam(destination)}` }];
    case 'onx_offroad':
      // onX Offroad has no custom scheme; its universal link opens a point card, not a route.
      return coordinates ? [{ url: `https://offroad.onxmaps.com/offroad/map/query/${toPair(coordinates)}` }] : null;
    case 'organic_maps': {
      const path = organicMapsPath(destination);
      return [{ url: `om://${path}` }, { url: `https://omaps.app/${path}` }];
    }
    case 'osmand':
      return osmandAttempts(destination, platform);
    default:
      return null;
  }
};

/** The URLs to try, in order, for a navigation app on a platform. */
const buildNavigationAttempts = (destination: NavigationDestination, app: NavigationApp, platform: string): NavigationAttempt[] => {
  const webFallback: NavigationAttempt = { url: googleMapsWebUrl(destination) };
  const isNativePlatform = platform === 'ios' || platform === 'android';

  if (app === 'waze') {
    // The universal link opens Waze when it is installed and the Waze web / store page otherwise.
    const universalLink: NavigationAttempt = { url: `https://waze.com/ul?${wazeQuery(destination)}&navigate=yes` };
    return isNativePlatform ? [{ url: `waze://?${wazeQuery(destination)}&navigate=yes`, requiresInstalledApp: true }, universalLink, webFallback] : [universalLink, webFallback];
  }

  const mobileAppAttempts = isNativePlatform ? buildMobileAppAttempts(destination, app, platform) : null;
  if (mobileAppAttempts) {
    return [...mobileAppAttempts, webFallback];
  }

  if (platform === 'ios') {
    return app === 'google_maps' ? [{ url: googleMapsIosUrl(destination), requiresInstalledApp: true }, webFallback] : [{ url: appleMapsUrl(destination) }, webFallback];
  }

  if (platform === 'android') {
    return app === 'google_maps' ? [{ url: googleNavigationUrl(destination) }, webFallback] : [{ url: geoUrl(destination) }, webFallback];
  }

  return [webFallback];
};

/** Opens the first attempt that works. True when one opened. */
const openFirstAvailable = async (attempts: NavigationAttempt[], navigationApp: NavigationApp): Promise<boolean> => {
  let lastError: unknown;

  for (const attempt of attempts) {
    try {
      if (attempt.requiresInstalledApp && !(await Linking.canOpenURL(attempt.url))) {
        continue;
      }
      await Linking.openURL(attempt.url);
      return true;
    } catch (error) {
      lastError = error;
    }
  }

  // Only the schemes are logged: the URLs carry the incident address and location.
  logger.error({
    message: 'Failed to open a navigation app',
    context: { error: lastError, navigationApp, platform: Platform.OS, schemes: attempts.map((attempt) => attempt.url.split(':')[0]) },
  });
  return false;
};

const openNavigation = async (destination: NavigationDestination): Promise<boolean> => {
  if (!destination.coordinates && !destination.address) {
    logger.warn({ message: 'Navigation requested without usable coordinates or an address' });
    return false;
  }

  const navigationApp = getNavigationApp();
  return openFirstAvailable(buildNavigationAttempts(destination, navigationApp, Platform.OS), navigationApp);
};

/**
 * Starts navigation to an address in the navigation app chosen in Settings.
 *
 * @param address - The destination address
 * @returns Promise<boolean> - True if a navigation or maps app was opened; false for a blank address
 */
export const openMapsWithAddress = async (address: string): Promise<boolean> => {
  const destinationAddress = toNonEmpty(address);
  return openNavigation({ coordinates: null, address: destinationAddress, label: destinationAddress, origin: null });
};

/**
 * Starts navigation to coordinates in the navigation app chosen in Settings, on iOS, Android,
 * web and desktop.
 *
 * Coordinates may be numbers or numeric strings. Missing, non-numeric, out-of-range and (0,0)
 * coordinates are not navigable: the `fallbackAddress` is used instead when one is given,
 * otherwise nothing opens and the result is false.
 *
 * @param destinationLatitude - The latitude of the destination
 * @param destinationLongitude - The longitude of the destination
 * @param destinationName - Optional name/label for the destination
 * @param originLatitude - Optional latitude of the starting point (if not provided, current location is used)
 * @param originLongitude - Optional longitude of the starting point (if not provided, current location is used)
 * @param fallbackAddress - Optional destination address, used when the coordinates are not navigable
 * @returns Promise<boolean> - True if a navigation or maps app was opened
 */
export const openMapsWithDirections = async (
  destinationLatitude: number | string | null | undefined,
  destinationLongitude: number | string | null | undefined,
  destinationName?: string,
  originLatitude?: number | string,
  originLongitude?: number | string,
  fallbackAddress?: string | null
): Promise<boolean> => {
  const coordinates = toNavigationCoordinates(destinationLatitude, destinationLongitude);
  const address = coordinates ? null : toNonEmpty(fallbackAddress);

  return openNavigation({
    coordinates,
    address,
    label: toNonEmpty(destinationName) ?? address,
    origin: toNavigationCoordinates(originLatitude, originLongitude),
  });
};
