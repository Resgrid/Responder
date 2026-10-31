import { Platform } from 'react-native';

import { storage } from '@/lib/storage';

/**
 * MMKV key for the per-device "Navigation app" preference: which app opens when the user
 * asks for directions to a call, destination, POI, map pin, route stop or contact.
 *
 * It describes the apps installed on this device rather than anything about the signed-in
 * user, so it is kept across logout (see LOGOUT_PRESERVED_STORAGE_KEYS in clear-all-data.ts).
 */
export const NAVIGATION_APP_STORAGE_KEY = 'NAVIGATION_APP';

/**
 * - `default`: the device decides. Android sends a `geo:` intent, so the user's default
 *   navigation app opens, or the system asks which one (Waze, Google Maps, ...). iOS opens
 *   Apple Maps. Web and desktop open Google Maps in the browser.
 * - `google_maps` / `apple_maps` / `waze`: always that app (Apple Maps exists on iOS only).
 * - `gaia_gps` / `here_wego` / `mapquest` / `onx_offroad` / `organic_maps` / `osmand`: that app, on
 *   iOS and Android only. Some of them only show the destination rather than starting a route
 *   (see src/lib/navigation.ts).
 */
export type NavigationApp = 'default' | 'google_maps' | 'apple_maps' | 'waze' | 'gaia_gps' | 'here_wego' | 'mapquest' | 'onx_offroad' | 'organic_maps' | 'osmand';

const ALL_NAVIGATION_APPS: readonly NavigationApp[] = ['default', 'google_maps', 'apple_maps', 'waze', 'gaia_gps', 'here_wego', 'mapquest', 'onx_offroad', 'organic_maps', 'osmand'];

/** Apps that only exist on phones and tablets, so web and desktop have nothing of theirs to open. */
const MOBILE_ONLY_NAVIGATION_APPS: readonly NavigationApp[] = ['gaia_gps', 'here_wego', 'mapquest', 'onx_offroad', 'organic_maps', 'osmand'];

const isOfferedOn = (app: NavigationApp, platform: string): boolean => {
  if (app === 'apple_maps') {
    return platform === 'ios';
  }
  return !MOBILE_ONLY_NAVIGATION_APPS.includes(app) || platform === 'ios' || platform === 'android';
};

/** The choices that make sense on a platform, in display order. Apple Maps is iOS-only; the less common apps are mobile-only. */
export const getNavigationAppOptions = (platform: string = Platform.OS): NavigationApp[] => ALL_NAVIGATION_APPS.filter((app) => isOfferedOn(app, platform));

/** A stored value as a valid choice for the platform; anything unknown or unavailable is `default`. */
export const normalizeNavigationApp = (value: string | null | undefined, platform: string = Platform.OS): NavigationApp => {
  const match = getNavigationAppOptions(platform).find((app) => app === value);
  return match ?? 'default';
};

/** The saved navigation app for this device, `default` when none was chosen. */
export const getNavigationApp = (): NavigationApp => {
  try {
    return normalizeNavigationApp(storage.getString(NAVIGATION_APP_STORAGE_KEY));
  } catch {
    return 'default';
  }
};

/** Saves the navigation app for this device. */
export const setNavigationApp = (app: NavigationApp): void => {
  storage.set(NAVIGATION_APP_STORAGE_KEY, app);
};
