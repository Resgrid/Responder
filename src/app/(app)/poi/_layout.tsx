import { Stack } from 'expo-router';
import React from 'react';

export default function PoiLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    />
  );
}
