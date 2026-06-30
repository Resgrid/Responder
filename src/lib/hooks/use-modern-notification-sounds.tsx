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

const NOTIFICATION_CHANNEL_SOUND_MIGRATION = 'NOTIFICATION_CHANNEL_SOUND_MIGRATION_V1';

/**
 * One-time guard for upgraded installs. Android locks a notification channel's
 * sound at creation time, so the standard channels created by a previous app
 * version keep their old (classic/silent) sounds even though modern sounds now
 * default on. The push notification service reads this flag to delete and
 * recreate those channels exactly once so the new sound configuration applies.
 */
export const hasMigratedNotificationChannelSounds = (): boolean => {
  return storage.getBoolean(NOTIFICATION_CHANNEL_SOUND_MIGRATION) ?? false;
};

export const markNotificationChannelSoundsMigrated = (): void => {
  storage.set(NOTIFICATION_CHANNEL_SOUND_MIGRATION, true);
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
