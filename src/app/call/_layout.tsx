import { Stack } from 'expo-router';
import React from 'react';

import { callScreenOptions } from './shared-options';

export default function CallLayout() {
  return <Stack screenOptions={callScreenOptions} />;
}
