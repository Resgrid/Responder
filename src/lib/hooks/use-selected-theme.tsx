import React from 'react';
import { Appearance, Platform } from 'react-native';
import { useMMKVString } from 'react-native-mmkv';

import { storage } from '../storage';

const SELECTED_THEME = 'SELECTED_THEME';
export type ColorSchemeType = 'light' | 'dark' | 'system';

const applyColorScheme = (t: ColorSchemeType) => {
  if (Platform.OS === 'web') {
    // react-native-web ships no Appearance.setColorScheme — drive the <html>
    // class directly (same mechanism as GluestackUIProvider's script.ts).
    if (typeof document !== 'undefined') {
      const resolved = t === 'system' ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : t;
      const documentElement = document.documentElement;
      documentElement.classList.remove(resolved === 'dark' ? 'light' : 'dark');
      documentElement.classList.add(resolved);
      documentElement.style.colorScheme = resolved;
    }
    return;
  }
  // NativeWind v5: theme overrides go through the standard Appearance API
  // ('unspecified' clears the override). GluestackUIProvider picks the value
  // up via useColorScheme and applies the web <html> class / native class wrapper.
  Appearance.setColorScheme(t === 'system' ? 'unspecified' : t);
};

/**
 * this hooks should only be used while selecting the theme
 * This hooks will return the selected theme which is stored in MMKV
 * selectedTheme should be one of the following values 'light', 'dark' or 'system'
 * don't use this hooks if you want to use it to style your component based on the theme use useColorScheme from nativewind instead
 *
 */
export const useSelectedTheme = () => {
  const [theme, _setTheme] = useMMKVString(SELECTED_THEME, storage);

  const setSelectedTheme = React.useCallback(
    (t: ColorSchemeType) => {
      applyColorScheme(t);
      _setTheme(t);
    },
    [_setTheme]
  );

  const selectedTheme = (theme ?? 'system') as ColorSchemeType;
  return { selectedTheme, setSelectedTheme } as const;
};
// to be used in the root file to load the selected theme from MMKV
export const loadSelectedTheme = () => {
  try {
    const theme = storage.getString(SELECTED_THEME);
    if (theme !== undefined) {
      applyColorScheme(theme as ColorSchemeType);
    }
  } catch (error) {
    console.error('Failed to load selected theme:', error);
  }
};
