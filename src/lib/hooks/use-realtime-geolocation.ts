import React from 'react';
import { useMMKVBoolean } from 'react-native-mmkv';

import { useSignalRStore } from '@/stores/signalr/signalr-store';

import { logger } from '../logging';
import { storage } from '../storage';
import { getRealtimeGeolocationStorageKey, saveRealtimeGeolocationState } from '../storage/realtime-geolocation';

// Define a type for the location service update function
type LocationServiceRealtimeUpdater = (enabled: boolean) => Promise<void>;

// Global variable to hold the location service update function
let locationServiceRealtimeUpdater: LocationServiceRealtimeUpdater | null = null;

/**
 * Register the location service realtime updater function
 * This should be called from the location service to register its update function
 */
export const registerLocationServiceRealtimeUpdater = (updater: LocationServiceRealtimeUpdater) => {
  locationServiceRealtimeUpdater = updater;
};

/**
 * Hook for managing realtime geolocation functionality
 * This hook manages the connection to the SignalR geolocation hub
 * When enabled, the app will receive real-time location updates from other personnel/units
 * and will also send location updates to the API
 */
export const useRealtimeGeolocation = () => {
  const [realtimeGeolocationEnabled, _setRealtimeGeolocationEnabled] = useMMKVBoolean(getRealtimeGeolocationStorageKey(), storage);

  const { isGeolocationHubConnected, connectGeolocationHub, disconnectGeolocationHub } = useSignalRStore();

  const setRealtimeGeolocationEnabled = React.useCallback(
    async (enabled: boolean) => {
      try {
        _setRealtimeGeolocationEnabled(enabled);
        saveRealtimeGeolocationState(enabled);

        // Update the location service if the updater is registered
        if (locationServiceRealtimeUpdater) {
          await locationServiceRealtimeUpdater(enabled);
        }

        // Connect or disconnect from the SignalR geolocation hub
        if (enabled) {
          await connectGeolocationHub();
        } else {
          await disconnectGeolocationHub();
        }

        logger.info({
          message: `Realtime geolocation ${enabled ? 'enabled' : 'disabled'}`,
          context: { enabled, hubConnected: isGeolocationHubConnected },
        });
      } catch (error) {
        logger.error({
          message: 'Failed to update realtime geolocation state',
          context: { error, enabled },
        });
        throw error;
      }
    },
    [_setRealtimeGeolocationEnabled, connectGeolocationHub, disconnectGeolocationHub, isGeolocationHubConnected]
  );

  const isRealtimeGeolocationEnabled = realtimeGeolocationEnabled ?? false;

  return {
    isRealtimeGeolocationEnabled,
    setRealtimeGeolocationEnabled,
    isGeolocationHubConnected,
  } as const;
};
