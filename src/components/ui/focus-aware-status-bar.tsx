import * as NavigationBar from 'expo-navigation-bar';
import { useIsFocused } from 'expo-router';
import { useColorScheme } from 'nativewind';
import * as React from 'react';
import { Platform, StatusBar } from 'react-native';
import { SystemBars } from 'react-native-edge-to-edge';

type Props = { hidden?: boolean };

/**
 * Provided by a layout whose header stays dark in both themes (the app shell's primary bar), so the
 * status bar drawn over it keeps light content instead of following the theme.
 */
export const StatusBarOverDarkHeaderContext = React.createContext(false);

export const FocusAwareStatusBar = ({ hidden = false }: Props) => {
  const isFocused = useIsFocused();
  const { colorScheme } = useColorScheme();
  const isOverDarkHeader = React.useContext(StatusBarOverDarkHeaderContext);
  // Light content (white icons) is for a dark surface: the dark theme, or the shell's dark header.
  const wantsLightContent = isOverDarkHeader || colorScheme === 'dark';

  React.useEffect(() => {
    // Early return if screen is not focused to prevent off-screen instances from overriding UI
    if (!isFocused) return;

    // Only call platform-specific methods when they are supported
    if (Platform.OS === 'android') {
      try {
        // Make both status bar and navigation bar transparent
        StatusBar.setBackgroundColor('transparent');
        StatusBar.setTranslucent(true);

        // Hide navigation bar only on Android
        NavigationBar.setVisibilityAsync('hidden').catch(() => {
          // Silently handle errors if NavigationBar API is not available
        });

        // Set the system UI flags to hide navigation bar
        if (hidden) {
          StatusBar.setHidden(true, 'slide');
        } else {
          StatusBar.setHidden(false, 'slide');
        }

        // Adapt status bar content based on theme
        StatusBar.setBarStyle(wantsLightContent ? 'light-content' : 'dark-content');
      } catch (error) {
        // Silently handle errors if StatusBar methods are not available
      }
    } else if (Platform.OS === 'ios') {
      try {
        // iOS-specific status bar configuration
        if (hidden) {
          StatusBar.setHidden(true, 'slide');
        } else {
          StatusBar.setHidden(false, 'slide');
        }

        // Set status bar style for iOS
        StatusBar.setBarStyle(wantsLightContent ? 'light-content' : 'dark-content');
      } catch (error) {
        // Silently handle errors if StatusBar methods are not available
      }
    }
  }, [hidden, wantsLightContent, isFocused]);

  // Don't render anything on web
  if (Platform.OS === 'web') return null;

  // Only render SystemBars when focused and on supported platforms. Edge-to-edge 'light' means light content.
  return isFocused && (Platform.OS === 'android' || Platform.OS === 'ios') ? <SystemBars style={wantsLightContent ? 'light' : 'dark'} hidden={{ statusBar: hidden, navigationBar: true }} /> : null;
};
