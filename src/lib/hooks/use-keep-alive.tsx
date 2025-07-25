import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import React from 'react';
import { useMMKVBoolean } from 'react-native-mmkv';

import { storage } from '../storage';

const KEEP_ALIVE_ENABLED = 'KEEP_ALIVE_ENABLED';

/**
 * Hook for managing keep alive/screen awake functionality
 * This hooks will return the keep alive state which is stored in MMKV
 * When enabled, the screen will stay awake and not go to sleep
 */
export const useKeepAlive = () => {
  const [keepAliveEnabled, _setKeepAliveEnabled] = useMMKVBoolean(KEEP_ALIVE_ENABLED, storage);

  const setKeepAliveEnabled = React.useCallback(
    async (enabled: boolean) => {
      try {
        if (enabled) {
          await activateKeepAwakeAsync('settings');
        } else {
          deactivateKeepAwake('settings');
        }
        _setKeepAliveEnabled(enabled);
      } catch (error) {
        console.error('Failed to update keep alive state:', error);
      }
    },
    [_setKeepAliveEnabled]
  );

  const isKeepAliveEnabled = keepAliveEnabled ?? false;
  return { isKeepAliveEnabled, setKeepAliveEnabled } as const;
};

// Function to be used in the root file to load the keep alive state from MMKV on app startup
export const loadKeepAliveState = async () => {
  try {
    const keepAliveEnabled = storage.getBoolean(KEEP_ALIVE_ENABLED);
    if (keepAliveEnabled === true) {
      await activateKeepAwakeAsync('settings');
    }
  } catch (error) {
    console.error('Failed to load keep alive state on startup:', error);
  }
};
