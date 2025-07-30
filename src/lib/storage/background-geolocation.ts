import { Platform } from 'react-native';
import { MMKV } from 'react-native-mmkv';

import { logger } from '../logging';

const BACKGROUND_GEOLOCATION_ENABLED = 'BACKGROUND_GEOLOCATION_ENABLED';

// Create storage instance to avoid circular dependency
const storage = Platform.OS === 'web' ? new MMKV({ id: 'ResgridUnit' }) : new MMKV({ id: 'ResgridUnit', encryptionKey: 'hunter2' });

/**
 * Load background geolocation state from MMKV storage
 * This function is used in the location service to avoid circular dependencies
 */
export const loadBackgroundGeolocationState = async (): Promise<boolean> => {
  try {
    const backgroundGeolocationEnabled = storage.getBoolean(BACKGROUND_GEOLOCATION_ENABLED);
    logger.info({
      message: 'Background geolocation state loaded on startup',
      context: { enabled: backgroundGeolocationEnabled },
    });
    return backgroundGeolocationEnabled ?? false;
  } catch (error) {
    logger.error({
      message: 'Failed to load background geolocation state on startup',
      context: { error },
    });
    return false;
  }
};

/**
 * Save background geolocation state to MMKV storage
 */
export const saveBackgroundGeolocationState = (enabled: boolean): void => {
  storage.set(BACKGROUND_GEOLOCATION_ENABLED, enabled);
};

/**
 * Get the storage key for background geolocation
 */
export const getBackgroundGeolocationStorageKey = (): string => {
  return BACKGROUND_GEOLOCATION_ENABLED;
};
