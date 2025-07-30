import React from 'react';
import { useMMKVBoolean } from 'react-native-mmkv';

import { useSignalRStore } from '@/stores/signalr/signalr-store';

import { logger } from '../logging';
import { storage } from '../storage';

const REALTIME_GEOLOCATION_STORAGE_KEY = 'realtime-geolocation-enabled';

/**
 * Hook for managing realtime geolocation functionality
 * This hook manages the connection to the SignalR geolocation hub
 * When enabled, the app will receive real-time location updates from other personnel/units
 */
export const useRealtimeGeolocation = () => {
  const [realtimeGeolocationEnabled, _setRealtimeGeolocationEnabled] = useMMKVBoolean(REALTIME_GEOLOCATION_STORAGE_KEY, storage);

  const { isGeolocationHubConnected, connectGeolocationHub, disconnectGeolocationHub } = useSignalRStore();

  const setRealtimeGeolocationEnabled = React.useCallback(
    async (enabled: boolean) => {
      try {
        _setRealtimeGeolocationEnabled(enabled);

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
