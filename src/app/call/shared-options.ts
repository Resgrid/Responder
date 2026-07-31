import type { NativeStackNavigationOptions } from 'expo-router';
import { Platform } from 'react-native';

export const callScreenOptions: NativeStackNavigationOptions = {
  headerBackVisible: false,
  ...(Platform.OS === 'android' && {
    animation: 'slide_from_right',
  }),
};
