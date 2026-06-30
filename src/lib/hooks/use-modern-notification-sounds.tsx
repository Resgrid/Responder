import React from 'react';
import { useMMKVBoolean } from 'react-native-mmkv';

import { storage } from '../storage';

const MODERN_NOTIFICATION_SOUNDS_ENABLED = 'MODERN_NOTIFICATION_SOUNDS_ENABLED';

/**
 * Reads the persisted "modern notification sounds" preference outside of React
 * (e.g. from the push notification service when creating Android notification
 * channels). Defaults to `true` (modern sounds on) when the user has never
 * changed the setting.
 */
export const getModernNotificationSoundsEnabled = (): boolean => {
  if (!storage.contains(MODERN_NOTIFICATION_SOUNDS_ENABLED)) {
    return true;
  }
  return storage.getBoolean(MODERN_NOTIFICATION_SOUNDS_ENABLED) ?? true;
};

/**
 * Hook for the Android-only "modern notification sounds" preference. When
 * enabled (the default) push notification channels use the modern sound set;
 * when disabled they fall back to the classic sounds. The value is stored in
 * MMKV so it survives app restarts.
 */
export const useModernNotificationSounds = () => {
  const [modernSoundsEnabled, _setModernSoundsEnabled] = useMMKVBoolean(MODERN_NOTIFICATION_SOUNDS_ENABLED, storage);

  const setModernNotificationSoundsEnabled = React.useCallback(
    (enabled: boolean) => {
      _setModernSoundsEnabled(enabled);
    },
    [_setModernSoundsEnabled]
  );

  const isModernNotificationSoundsEnabled = modernSoundsEnabled ?? true;
  return { isModernNotificationSoundsEnabled, setModernNotificationSoundsEnabled } as const;
};
