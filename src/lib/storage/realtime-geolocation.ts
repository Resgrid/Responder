import { Platform } from 'react-native';
import { MMKV } from 'react-native-mmkv';

import { logger } from '../logging';
import { getGeneralStorage } from './secure-storage';

const REALTIME_GEOLOCATION_ENABLED = 'REALTIME_GEOLOCATION_ENABLED';

// Use secure storage
let storage: MMKV;

const initializeStorage = async () => {
  storage = await getGeneralStorage();
};

// Fallback for synchronous access
storage = Platform.OS === 'web' ? new MMKV({ id: 'ResgridUnit' }) : new MMKV({ id: 'ResgridUnit' });

// Initialize secure storage
initializeStorage().catch(console.error);

/**
 * Load realtime geolocation state from MMKV storage
 * This function is used in the location service to avoid circular dependencies
 */
export const loadRealtimeGeolocationState = async (): Promise<boolean> => {
  try {
    const realtimeGeolocationEnabled = storage.getBoolean(REALTIME_GEOLOCATION_ENABLED);
    logger.info({
      message: 'Realtime geolocation state loaded on startup',
      context: { enabled: realtimeGeolocationEnabled },
    });
    return realtimeGeolocationEnabled ?? false;
  } catch (error) {
    logger.error({
      message: 'Failed to load realtime geolocation state on startup',
      context: { error },
    });
    return false;
  }
};

/**
 * Save realtime geolocation state to MMKV storage
 */
export const saveRealtimeGeolocationState = (enabled: boolean): void => {
  storage.set(REALTIME_GEOLOCATION_ENABLED, enabled);
};

/**
 * Get the storage key for realtime geolocation
 */
export const getRealtimeGeolocationStorageKey = (): string => {
  return REALTIME_GEOLOCATION_ENABLED;
};
