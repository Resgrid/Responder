import { Stack } from 'expo-router';
import React from 'react';

import { callScreenOptions } from '../shared-options';

export default function CallIdLayout() {
  return <Stack screenOptions={callScreenOptions} />;
}
