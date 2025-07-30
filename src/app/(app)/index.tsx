import { Redirect } from 'expo-router';
import React from 'react';

export default function HomeRedirect() {
  // Redirect to the home tab layout
  return <Redirect href="/(app)/home" />;
}
