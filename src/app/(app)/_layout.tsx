/* eslint-disable react/no-unstable-nested-components */

import { NovuProvider } from '@novu/react-native';
import Mapbox from '@rnmapbox/maps';
import { type Href, Redirect, Slot, SplashScreen, usePathname, useRouter } from 'expo-router';
import { size } from 'lodash';
import { ArrowLeft, Menu } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NotificationButton } from '@/components/notifications/NotificationButton';
import { NotificationInbox } from '@/components/notifications/NotificationInbox';
import SideMenu from '@/components/sidebar/side-menu-content';
import { View } from '@/components/ui';
import { Button, ButtonText } from '@/components/ui/button';
import { Drawer, DrawerBackdrop, DrawerBody, DrawerContent, DrawerFooter } from '@/components/ui/drawer/index';
import { Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { useAppInitRetry } from '@/hooks/use-app-init-retry';
import { useAppLifecycle } from '@/hooks/use-app-lifecycle';
import { useSignalRLifecycle } from '@/hooks/use-signalr-lifecycle';
import { useAuthStore } from '@/lib/auth';
import { Env } from '@/lib/env';
import { logger } from '@/lib/logging';
import { useIsFirstTime } from '@/lib/storage';
import { type GetConfigResultData } from '@/models/v4/configs/getConfigResultData';
import { audioService } from '@/services/audio.service';
import { bluetoothAudioService } from '@/services/bluetooth-audio.service';
import { locationService } from '@/services/location';
import { offlineQueueService } from '@/services/offline-queue.service';
import { usePushNotifications } from '@/services/push-notification';
import { useCoreStore } from '@/stores/app/core-store';
import { useCalendarStore } from '@/stores/calendar/store';
import { useCallsStore } from '@/stores/calls/store';
import { FeatureFlagKeys, featureFlagsStore } from '@/stores/feature-flags/store';
import { usePersonnelStore } from '@/stores/personnel/store';
import { useRolesStore } from '@/stores/roles/store';
import { securityStore } from '@/stores/security/store';
import { useShiftsStore } from '@/stores/shifts/store';
import { useSignalRStore } from '@/stores/signalr/signalr-store';
import { useWeatherAlertsStore } from '@/stores/weather-alerts/weather-alerts-store';

Mapbox.setAccessToken(Env.RESPOND_MAPBOX_PUBKEY);

export default function TabLayout() {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const status = useAuthStore((state) => state.status);
  const [isFirstTime, _setIsFirstTime] = useIsFirstTime();
  const [isOpen, setIsOpen] = React.useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = React.useState(false);

  // Memoize drawer navigation handler for better performance
  const handleNavigate = useCallback(() => {
    setIsOpen(false);
  }, []);

  // The assistant is a leaf of the chat list, so its nav button returns there
  // instead of opening the drawer. `replace` keeps the assistant off the history.
  const handleBackToChats = useCallback(() => {
    router.replace('/chat' as Href);
  }, [router]);
  const backHandler = pathname === '/chatbot' ? handleBackToChats : undefined;
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const { isActive, appState } = useAppLifecycle();
  const insets = useSafeAreaInsets();

  // Refs to track initialization state
  const hasInitialized = useRef(false);
  // Mirrored into state because useSignalRLifecycle reads it during render; a ref
  // mutated after the last re-render left the hub lifecycle permanently disabled.
  const [isInitialized, setIsInitialized] = React.useState(false);
  const isInitializing = useRef(false);
  const hasHiddenSplash = useRef(false);
  const lastSignedInStatus = useRef<string | null>(null);
  const parentRef = useRef(null);
  const hasAttemptedInit = useRef(false);
  const initializeAppRef = useRef<(() => Promise<void>) | null>(null);
  // Bumped on every initialization start and on sign-out. An in-flight run compares its
  // captured value after each await, so a run belonging to a session that ended can no
  // longer mark the app initialized, connect hubs, or restart location tracking.
  const initGeneration = useRef(0);
  const initRetry = useAppInitRetry();

  // Initialize push notifications
  usePushNotifications();

  const initializeApp = useCallback(async () => {
    if (isInitializing.current) {
      logger.info({
        message: 'App initialization already in progress, skipping',
      });
      return;
    }

    if (status !== 'signedIn') {
      logger.info({
        message: 'User not signed in, skipping initialization',
        context: { status },
      });
      return;
    }

    isInitializing.current = true;
    const generation = (initGeneration.current += 1);
    const isCurrentRun = () => initGeneration.current === generation;
    const attempt = initRetry.recordAttempt();
    logger.info({
      message: 'Starting app initialization',
      context: {
        hasInitialized: hasInitialized.current,
        attempt,
      },
    });

    try {
      await useCoreStore.getState().init();
      await useCallsStore.getState().init();
      //await useCalendarStore.getState().init();
      //await useShiftsStore.getState().init();
      //await usePersonnelStore.getState().init();
      await securityStore.getState().getRights();
      await featureFlagsStore.getState().fetchFlags();
      if (!isCurrentRun()) return;

      //await useSignalRStore.getState().connectUpdateHub();
      //await useSignalRStore.getState().connectGeolocationHub();

      // Connect the realtime chat hub only when the Chat.System feature flag is on for
      // this department; when it is off every chat surface stays hidden.
      if (featureFlagsStore.getState().isEnabled(FeatureFlagKeys.ChatSystem)) {
        try {
          await useSignalRStore.getState().connectChatHub();
          logger.info({
            message: 'SignalR chat hub connected successfully',
          });
        } catch (error) {
          logger.error({
            message: 'Failed to connect SignalR chat hub during initialization',
            context: { error },
          });
        }
      } else {
        logger.info({
          message: 'Chat disabled by feature flag; skipping chat hub connection',
        });
      }

      if (!isCurrentRun()) return;

      hasInitialized.current = true;
      setIsInitialized(true);

      const independentInits: [string, () => Promise<unknown>][] = [
        [
          'weather alerts',
          async () => {
            await useWeatherAlertsStore.getState().fetchSettings();
            const weatherSettings = useWeatherAlertsStore.getState().settings;
            if (weatherSettings?.WeatherAlertsEnabled) {
              await useWeatherAlertsStore.getState().fetchActiveAlerts();
            }
          },
        ],
        ['bluetooth audio service', () => bluetoothAudioService.initialize()],
        ['audio service', () => audioService.initialize()],
        ['offline queue service', () => offlineQueueService.initialize()],
      ];

      const results = await Promise.allSettled(independentInits.map(([, init]) => init()));
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          logger.error({
            message: `Failed to initialize ${independentInits[index]?.[0] ?? 'service'}`,
            context: { error: result.reason },
          });
        }
      });

      if (!isCurrentRun()) return;

      // Start location tracking when user is logged in
      try {
        await locationService.startLocationUpdates();
        logger.info({
          message: 'Location tracking started successfully after login',
        });
      } catch (error) {
        logger.error({
          message: 'Failed to start location tracking after login',
          context: { error },
        });
        // Don't fail initialization if location tracking fails
      }

      if (!isCurrentRun()) return;

      initRetry.reset();
      logger.info({
        message: 'App initialization completed successfully',
      });
    } catch (error) {
      logger.error({
        message: 'Failed to initialize app',
        context: { error, attempt },
      });
      // A run whose session already ended must not retry itself or clobber the state the
      // sign-out cleanup (or a newer run) has since established.
      if (!isCurrentRun()) return;

      // Reset initialization state on error so it can be retried
      hasInitialized.current = false;
      setIsInitialized(false);
      initRetry.scheduleRetry(() => {
        void initializeAppRef.current?.();
      });
    } finally {
      // Only the current run owns the guard; a superseded run leaving it false would let
      // two initializations overlap.
      if (isCurrentRun()) {
        isInitializing.current = false;
      }
    }
  }, [status, initRetry]);

  // The retry timer fires outside React's render cycle, so it reaches the callback
  // through a ref rather than capturing a stale closure.
  useEffect(() => {
    initializeAppRef.current = initializeApp;
  }, [initializeApp]);

  const refreshDataFromBackground = useCallback(async () => {
    if (status !== 'signedIn' || !hasInitialized.current) return;

    logger.info({
      message: 'App resumed from background, refreshing data',
    });

    try {
      // Refresh data
      await Promise.all([useCoreStore.getState().fetchConfig(), useCallsStore.getState().fetchCalls(), useRolesStore.getState().fetchRoles()]);
    } catch (error) {
      logger.error({
        message: 'Failed to refresh data on app resume',
        context: { error },
      });
    }
  }, [status]);

  // Handle SignalR lifecycle management
  useSignalRLifecycle({
    isSignedIn: status === 'signedIn',
    hasInitialized: isInitialized,
  });

  // Handle app initialization - simplified logic
  useEffect(() => {
    // Gated on its own ref rather than the previous status: keying off the status
    // meant a startup that threw could never be retried for the rest of the session.
    const shouldInitialize = status === 'signedIn' && !hasInitialized.current && !isInitializing.current && !hasAttemptedInit.current;

    if (shouldInitialize) {
      logger.info({
        message: 'Triggering app initialization',
        context: {
          statusChanged: lastSignedInStatus.current !== status,
        },
      });
      hasAttemptedInit.current = true;
      initializeApp();
    }

    // Stop location tracking when user signs out
    if (status === 'signedOut' && lastSignedInStatus.current === 'signedIn') {
      logger.info({
        message: 'User signed out, stopping location tracking',
      });

      // Always clear init state on sign-out, even if stopping location fails, so the
      // next sign-in starts a fresh attempt with a fresh retry budget. Bumping the
      // generation retires any initialization still in flight, and clearing the guard
      // it no longer owns keeps the next sign-in from being skipped as "already
      // initializing".
      initGeneration.current += 1;
      isInitializing.current = false;
      initRetry.reset();
      hasAttemptedInit.current = false;
      hasInitialized.current = false;
      setIsInitialized(false);

      (async () => {
        try {
          await locationService.stopLocationUpdates();
          logger.info({
            message: 'Location tracking stopped successfully',
            context: { reason: 'user_signed_out' },
          });
        } catch (error) {
          logger.error({
            message: 'Failed to stop location tracking on sign out',
            context: { error },
          });
        }
      })();
    }

    // Update last known status
    lastSignedInStatus.current = status;
  }, [status, initializeApp, initRetry]);

  // Handle app resuming from background - separate from initialization
  useEffect(() => {
    // Only trigger on state change, not on initial render
    if (isActive && appState === 'active' && hasInitialized.current) {
      const timer = setTimeout(() => {
        refreshDataFromBackground();
      }, 500); // Small delay to prevent multiple rapid calls

      return () => clearTimeout(timer);
    }
  }, [isActive, appState, refreshDataFromBackground]);

  // Force drawer open in landscape
  useEffect(() => {
    if (isLandscape) {
      setIsOpen(true);
    }
  }, [isLandscape]);

  // Get user ID and config for notifications
  const config = useCoreStore((state) => state.config);
  const rights = securityStore((state) => state.rights);
  const userId = useAuthStore((state) => state.userId);

  if (isFirstTime) {
    logger.info({
      message: 'Is first time navigating to onboarding',
    });

    return <Redirect href="/onboarding" />;
  } else if (status === 'signedOut') {
    logger.info({
      message: 'Is not first time but user is not signed in, redirecting to login',
    });

    return <Redirect href="/login" />;
  }

  const content = (
    <View style={styles.container}>
      {/* Top Navigation Bar */}
      <View className="flex-row items-center justify-between bg-primary-600 px-4" style={{ paddingTop: insets.top }}>
        <CreateDrawerMenuButton setIsOpen={setIsOpen} isLandscape={isLandscape} onBack={backHandler} />
        <View className="flex-1 items-center">
          <Text className="text-lg font-semibold text-white">{t('app.title', 'Resgrid Responder')}</Text>
        </View>
        <CreateNotificationButton config={config} setIsNotificationsOpen={setIsNotificationsOpen} userId={userId} departmentCode={rights?.DepartmentCode} />
      </View>

      <View className="flex-1 flex-row" ref={parentRef}>
        {/* Drawer - conditionally rendered as permanent in landscape */}
        {isLandscape ? (
          <View className="w-1/4 border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
            <SideMenu />
          </View>
        ) : (
          <Drawer isOpen={isOpen} onClose={() => setIsOpen(false)} size="lg">
            <DrawerBackdrop onPress={() => setIsOpen(false)} />
            <DrawerContent className="bg-white dark:bg-gray-900">
              <DrawerBody className="p-0">
                <SideMenu onNavigate={handleNavigate} />
              </DrawerBody>
              <DrawerFooter className="border-t border-gray-200 p-3 dark:border-gray-800">
                <Button onPress={() => setIsOpen(false)} className="w-full bg-primary-600">
                  <ButtonText>Close</ButtonText>
                </Button>
              </DrawerFooter>
            </DrawerContent>
          </Drawer>
        )}

        {/* Main content area */}
        <View className={`flex-1 ${isLandscape ? 'w-3/4' : 'w-full'}`}>
          <Slot />
        </View>
      </View>
    </View>
  );

  return (
    <>
      {userId && config && rights?.DepartmentCode ? (
        <NovuProvider subscriberId={`${rights?.DepartmentCode}_User_${userId}`} applicationIdentifier={config.NovuApplicationId} backendUrl={config.NovuBackendApiUrl} socketUrl={config.NovuSocketUrl}>
          {/* NotificationInbox at the root level */}
          <NotificationInbox isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} />
          {content}
        </NovuProvider>
      ) : (
        content
      )}
    </>
  );
}

interface CreateDrawerMenuButtonProps {
  setIsOpen: (isOpen: boolean) => void;
  isLandscape: boolean;
  /** When set, the button navigates back instead of opening the drawer. */
  onBack?: () => void;
}

const CreateDrawerMenuButton = ({ setIsOpen, isLandscape, onBack }: CreateDrawerMenuButtonProps) => {
  const { t } = useTranslation();

  if (onBack) {
    return (
      <Pressable className="p-2" onPress={onBack} accessibilityRole="button" accessibilityLabel={t('chat.back_to_chats')}>
        <ArrowLeft size={24} color="white" />
      </Pressable>
    );
  }

  if (isLandscape) {
    return <View className="w-8" />; // Spacer to maintain layout balance
  }

  return (
    <Pressable
      className="p-2"
      onPress={() => {
        setIsOpen(true);
      }}
    >
      <Menu size={24} color="white" />
    </Pressable>
  );
};

const CreateNotificationButton = ({
  config,
  setIsNotificationsOpen,
  userId,
  departmentCode,
}: {
  config: GetConfigResultData | null;
  setIsNotificationsOpen: (isOpen: boolean) => void;
  userId: string | null;
  departmentCode: string | undefined;
}) => {
  const handlePress = useCallback(() => {
    setIsNotificationsOpen(true);
  }, [setIsNotificationsOpen]);

  if (!userId || !config || !config.NovuApplicationId || !config.NovuBackendApiUrl || !config.NovuSocketUrl || !departmentCode) {
    return null;
  }

  return <NotificationButton onPress={handlePress} />;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
});
