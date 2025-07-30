import { useEffect } from 'react';

import { useAppLifecycleStore } from '@/stores/app/app-lifecycle';

export const useAppLifecycle = () => {
  const { appState, isActive, isBackground, lastActiveTimestamp } = useAppLifecycleStore();

  useEffect(() => {
    // You can add any side effects based on app state changes here
    // For example, you might want to pause/resume certain operations
    // when the app goes to background/foreground
  }, [appState]);

  return {
    appState,
    isActive,
    isBackground,
    lastActiveTimestamp,
  };
};
