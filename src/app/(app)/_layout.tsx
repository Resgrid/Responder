/* eslint-disable react/no-unstable-nested-components */

import { NovuProvider } from '@novu/react-native';
import Mapbox from '@rnmapbox/maps';
import { Redirect, Slot, SplashScreen } from 'expo-router';
import { size } from 'lodash';
import { Contact, Home, ListTree, Mail, Map, Megaphone, Menu, Notebook, Truck, Users } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NotificationButton } from '@/components/notifications/NotificationButton';
import { NotificationInbox } from '@/components/notifications/NotificationInbox';
import SideMenu from '@/components/sidebar/side-menu';
import { View } from '@/components/ui';
import { Button, ButtonText } from '@/components/ui/button';
import { Drawer, DrawerBackdrop, DrawerBody, DrawerContent, DrawerFooter, DrawerHeader } from '@/components/ui/drawer/index';
import { Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
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
import { usePersonnelStore } from '@/stores/personnel/store';
import { useRolesStore } from '@/stores/roles/store';
import { securityStore } from '@/stores/security/store';
import { useShiftsStore } from '@/stores/shifts/store';
import { useSignalRStore } from '@/stores/signalr/signalr-store';

export default function TabLayout() {
  const { t } = useTranslation();
  const { status } = useAuthStore();
  const [isFirstTime, _setIsFirstTime] = useIsFirstTime();
  const [isOpen, setIsOpen] = React.useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = React.useState(false);

  // Memoize drawer navigation handler for better performance
  const handleNavigate = useCallback(() => {
    setIsOpen(false);
  }, []);
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const { isActive, appState } = useAppLifecycle();
  const insets = useSafeAreaInsets();

  // Refs to track initialization state
  const hasInitialized = useRef(false);
  const isInitializing = useRef(false);
  const hasHiddenSplash = useRef(false);
  const lastSignedInStatus = useRef<string | null>(null);
  const parentRef = useRef(null);

  // Initialize push notifications
  usePushNotifications();

  Mapbox.setAccessToken(Env.RESPOND_MAPBOX_PUBKEY);

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
    logger.info({
      message: 'Starting app initialization',
      context: {
        hasInitialized: hasInitialized.current,
      },
    });

    try {
      await useCoreStore.getState().init();
      await useCallsStore.getState().init();
      //await useCalendarStore.getState().init();
      //await useShiftsStore.getState().init();
      //await usePersonnelStore.getState().init();
      await securityStore.getState().getRights();

      //await useSignalRStore.getState().connectUpdateHub();
      //await useSignalRStore.getState().connectGeolocationHub();

      hasInitialized.current = true;

      // Initialize Bluetooth service
      await bluetoothAudioService.initialize();
      await audioService.initialize();

      // Initialize offline queue service
      await offlineQueueService.initialize();

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

      logger.info({
        message: 'App initialization completed successfully',
      });
    } catch (error) {
      logger.error({
        message: 'Failed to initialize app',
        context: { error },
      });
      // Reset initialization state on error so it can be retried
      hasInitialized.current = false;
    } finally {
      isInitializing.current = false;
    }
  }, [status]);

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
    hasInitialized: hasInitialized.current,
  });

  // Handle app initialization - simplified logic
  useEffect(() => {
    const shouldInitialize = status === 'signedIn' && !hasInitialized.current && !isInitializing.current && lastSignedInStatus.current !== 'signedIn';

    if (shouldInitialize) {
      logger.info({
        message: 'Triggering app initialization',
        context: {
          statusChanged: lastSignedInStatus.current !== status,
        },
      });
      initializeApp();
    }

    // Stop location tracking when user signs out
    if (status === 'signedOut' && lastSignedInStatus.current === 'signedIn') {
      logger.info({
        message: 'User signed out, stopping location tracking',
      });

      (async () => {
        try {
          await locationService.stopLocationUpdates();
          logger.info({
            message: 'Location tracking stopped successfully',
            context: { reason: 'user_signed_out' },
          });
          hasInitialized.current = false;
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
  }, [status, initializeApp]);

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
        <CreateDrawerMenuButton setIsOpen={setIsOpen} isLandscape={isLandscape} />
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
          <Drawer isOpen={isOpen} onClose={() => setIsOpen(false)}>
            <DrawerBackdrop onPress={() => setIsOpen(false)} />
            <DrawerContent className="w-4/5 bg-white p-1 dark:bg-gray-900">
              <DrawerBody>
                <SideMenu onNavigate={handleNavigate} />
              </DrawerBody>
              <DrawerFooter>
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
}

const CreateDrawerMenuButton = ({ setIsOpen, isLandscape }: CreateDrawerMenuButtonProps) => {
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
  if (!userId || !config || !config.NovuApplicationId || !config.NovuBackendApiUrl || !config.NovuSocketUrl || !departmentCode) {
    return null;
  }

  return (
    <NovuProvider subscriberId={`${departmentCode}_User_${userId}`} applicationIdentifier={config.NovuApplicationId} backendUrl={config.NovuBackendApiUrl} socketUrl={config.NovuSocketUrl}>
      <NotificationButton onPress={() => setIsNotificationsOpen(true)} />
    </NovuProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
});
