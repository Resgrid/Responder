import React from 'react';
import { useMMKVString } from 'react-native-mmkv';

import { storage } from '@/lib/storage';
import { NAVIGATION_APP_STORAGE_KEY, type NavigationApp, normalizeNavigationApp } from '@/lib/storage/navigation-app';

/**
 * The per-device "Navigation app" setting, persisted in MMKV alongside the other app settings.
 * `openMapsWithDirections` / `openMapsWithAddress` read the same key when they open.
 */
export const useNavigationApp = () => {
  const [storedApp, _setStoredApp] = useMMKVString(NAVIGATION_APP_STORAGE_KEY, storage);

  const setNavigationApp = React.useCallback(
    (app: NavigationApp) => {
      _setStoredApp(app);
    },
    [_setStoredApp]
  );

  const navigationApp = normalizeNavigationApp(storedApp);
  return { navigationApp, setNavigationApp } as const;
};
