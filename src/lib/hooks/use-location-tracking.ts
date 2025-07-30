import React from 'react';
import { useMMKVBoolean } from 'react-native-mmkv';

import { logger } from '../logging';
import { storage } from '../storage';

// Define a type for the location service update function
type LocationServiceUpdater = (enabled: boolean) => Promise<void>;

// Global variable to hold the location service update function
let locationServiceUpdater: LocationServiceUpdater | null = null;

const LOCATION_TRACKING_STORAGE_KEY = 'location-tracking-enabled';

/**
 * Register the location service updater function for location tracking
 * This should be called from the location service to register its update function
 */
export const registerLocationTrackingServiceUpdater = (updater: LocationServiceUpdater) => {
  locationServiceUpdater = updater;
};

/**
 * Hook for managing location tracking functionality
 * This hook will return the location tracking state which is stored in MMKV
 * When enabled, location tracking will start and send location updates to the API
 */
export const useLocationTracking = () => {
  const [locationTrackingEnabled, _setLocationTrackingEnabled] = useMMKVBoolean(LOCATION_TRACKING_STORAGE_KEY, storage);

  const setLocationTrackingEnabled = React.useCallback(
    async (enabled: boolean) => {
      try {
        _setLocationTrackingEnabled(enabled);

        // Update the location service if the updater is registered
        if (locationServiceUpdater) {
          await locationServiceUpdater(enabled);
        }

        logger.info({
          message: `Location tracking ${enabled ? 'enabled' : 'disabled'}`,
          context: { enabled },
        });
      } catch (error) {
        logger.error({
          message: 'Failed to update location tracking state',
          context: { error, enabled },
        });
        throw error;
      }
    },
    [_setLocationTrackingEnabled]
  );

  const isLocationTrackingEnabled = locationTrackingEnabled ?? false;
  return { isLocationTrackingEnabled, setLocationTrackingEnabled } as const;
};
