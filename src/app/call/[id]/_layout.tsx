import { Stack } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';

export default function CallIdLayout() {
  return (
    <Stack
      screenOptions={{
        headerBackTitleVisible: false,
        ...(Platform.OS === 'android' && {
          animation: 'slide_from_right',
        }),
      }}
    />
  );
}
