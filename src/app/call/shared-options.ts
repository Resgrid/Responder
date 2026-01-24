import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { Platform } from 'react-native';

export const callScreenOptions: NativeStackNavigationOptions = {
  headerBackVisible: false,
  ...(Platform.OS === 'android' && {
    animation: 'slide_from_right',
  }),
};
