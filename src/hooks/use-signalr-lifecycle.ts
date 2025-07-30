import { useCallback, useEffect, useRef } from 'react';

import { logger } from '@/lib/logging';
import { useSignalRStore } from '@/stores/signalr/signalr-store';

import { useAppLifecycle } from './use-app-lifecycle';

interface UseSignalRLifecycleOptions {
  isSignedIn: boolean;
  hasInitialized: boolean;
}

export function useSignalRLifecycle({ isSignedIn, hasInitialized }: UseSignalRLifecycleOptions) {
  const { isActive, appState } = useAppLifecycle();
  const signalRStore = useSignalRStore();
  const lastAppState = useRef<string | null>(null);

  const handleAppBackground = useCallback(async () => {
    if (!isSignedIn || !hasInitialized) return;

    logger.info({
      message: 'App going to background, disconnecting SignalR',
    });

    try {
      await signalRStore.disconnectUpdateHub();
      await signalRStore.disconnectGeolocationHub();
    } catch (error) {
      logger.error({
        message: 'Failed to disconnect SignalR on app background',
        context: { error },
      });
    }
  }, [isSignedIn, hasInitialized, signalRStore]);

  const handleAppResume = useCallback(async () => {
    if (!isSignedIn || !hasInitialized) return;

    logger.info({
      message: 'App resumed from background, reconnecting SignalR',
    });

    try {
      await signalRStore.connectUpdateHub();
      await signalRStore.connectGeolocationHub();
    } catch (error) {
      logger.error({
        message: 'Failed to reconnect SignalR on app resume',
        context: { error },
      });
    }
  }, [isSignedIn, hasInitialized, signalRStore]);

  // Handle app going to background
  useEffect(() => {
    if (!isActive && (appState === 'background' || appState === 'inactive') && hasInitialized) {
      handleAppBackground();
    }
  }, [isActive, appState, hasInitialized, handleAppBackground]);

  // Handle app resuming from background
  useEffect(() => {
    if (isActive && appState === 'active' && hasInitialized && lastAppState.current !== 'active') {
      // Only reconnect if coming from background/inactive state
      if (lastAppState.current === 'background' || lastAppState.current === 'inactive') {
        const timer = setTimeout(() => {
          handleAppResume();
        }, 500); // Small delay to prevent multiple rapid calls

        return () => clearTimeout(timer);
      }
    }

    lastAppState.current = appState;
  }, [isActive, appState, hasInitialized, handleAppResume]);

  return {
    isActive,
    appState,
    handleAppBackground,
    handleAppResume,
  };
}
