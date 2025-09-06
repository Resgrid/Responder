import { useIsFocused } from '@react-navigation/native';
import * as NavigationBar from 'expo-navigation-bar';
import { useColorScheme } from 'nativewind';
import * as React from 'react';
import { Platform, StatusBar } from 'react-native';
import { SystemBars } from 'react-native-edge-to-edge';

type Props = { hidden?: boolean };
export const FocusAwareStatusBar = ({ hidden = false }: Props) => {
  const isFocused = useIsFocused();
  const { colorScheme } = useColorScheme();

  StatusBar.setBackgroundColor('transparent');
  StatusBar.setTranslucent(true);
  NavigationBar.setVisibilityAsync('hidden');
  StatusBar.setBarStyle(colorScheme === 'dark' ? 'light-content' : 'dark-content');

  React.useEffect(() => {
    if (Platform.OS === 'android') {
      // Make both status bar and navigation bar transparent
      StatusBar.setBackgroundColor('transparent');
      StatusBar.setTranslucent(true);
      NavigationBar.setVisibilityAsync('hidden');

      // Set the system UI flags to hide navigation bar
      if (hidden) {
        StatusBar.setHidden(true, 'slide');
        // Set light status bar content for better visibility
        StatusBar.setBarStyle(colorScheme === 'dark' ? 'light-content' : 'dark-content');
      } else {
        StatusBar.setHidden(false, 'slide');
        // Adapt status bar content based on theme
        StatusBar.setBarStyle(colorScheme === 'dark' ? 'light-content' : 'dark-content');
      }
    }
  }, [hidden, colorScheme]);

  if (Platform.OS === 'web') return null;

  return isFocused ? <SystemBars style={colorScheme ?? 'dark'} hidden={{ statusBar: hidden, navigationBar: true }} /> : null;
};
