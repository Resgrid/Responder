import React from 'react';
import { useMMKVBoolean } from 'react-native-mmkv';

import { logger } from '../logging';
import { storage } from '../storage';
import { getBackgroundGeolocationStorageKey, saveBackgroundGeolocationState } from '../storage/background-geolocation';

// Define a type for the location service update function
type LocationServiceUpdater = (enabled: boolean) => Promise<void>;

// Global variable to hold the location service update function
let locationServiceUpdater: LocationServiceUpdater | null = null;

/**
 * Register the location service updater function
 * This should be called from the location service to register its update function
 */
export const registerLocationServiceUpdater = (updater: LocationServiceUpdater) => {
  locationServiceUpdater = updater;
};

/**
 * Hook for managing background geolocation functionality
 * This hook will return the background geolocation state which is stored in MMKV
 * When enabled, location tracking will continue when the app is backgrounded
 */
export const useBackgroundGeolocation = () => {
  const [backgroundGeolocationEnabled, _setBackgroundGeolocationEnabled] = useMMKVBoolean(getBackgroundGeolocationStorageKey(), storage);

  const setBackgroundGeolocationEnabled = React.useCallback(
    async (enabled: boolean) => {
      try {
        _setBackgroundGeolocationEnabled(enabled);
        saveBackgroundGeolocationState(enabled);

        // Update the location service if the updater is registered
        if (locationServiceUpdater) {
          await locationServiceUpdater(enabled);
        }

        logger.info({
          message: `Background geolocation ${enabled ? 'enabled' : 'disabled'}`,
          context: { enabled },
        });
      } catch (error) {
        logger.error({
          message: 'Failed to update background geolocation state',
          context: { error, enabled },
        });
        throw error;
      }
    },
    [_setBackgroundGeolocationEnabled]
  );

  const isBackgroundGeolocationEnabled = backgroundGeolocationEnabled ?? false;
  return { isBackgroundGeolocationEnabled, setBackgroundGeolocationEnabled } as const;
};
