/* eslint-disable react/no-unstable-nested-components */

import { NovuProvider } from '@novu/react-native';
import { Redirect, SplashScreen, Tabs } from 'expo-router';
import { size } from 'lodash';
import { Clock, Contact, ListTree, Mail, Map, Megaphone, Menu, Notebook, Settings } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, useWindowDimensions } from 'react-native';

import { NotificationButton } from '@/components/notifications/NotificationButton';
import { NotificationInbox } from '@/components/notifications/NotificationInbox';
import SideMenu from '@/components/sidebar/side-menu';
import { View } from '@/components/ui';
import { Button, ButtonText } from '@/components/ui/button';
import { Drawer, DrawerBackdrop, DrawerBody, DrawerContent, DrawerFooter, DrawerHeader } from '@/components/ui/drawer';
import { Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { useAppLifecycle } from '@/hooks/use-app-lifecycle';
import { useSignalRLifecycle } from '@/hooks/use-signalr-lifecycle';
import { useAuthStore } from '@/lib/auth';
import { logger } from '@/lib/logging';
import { useIsFirstTime } from '@/lib/storage';
import { type GetConfigResultData } from '@/models/v4/configs/getConfigResultData';
import { audioService } from '@/services/audio.service';
import { bluetoothAudioService } from '@/services/bluetooth-audio.service';
import { usePushNotifications } from '@/services/push-notification';
import { useCoreStore } from '@/stores/app/core-store';
import { useCalendarStore } from '@/stores/calendar/store';
import { useCallsStore } from '@/stores/calls/store';
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
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const { isActive, appState } = useAppLifecycle();

  // Refs to track initialization state
  const hasInitialized = useRef(false);
  const isInitializing = useRef(false);
  const hasHiddenSplash = useRef(false);
  const lastSignedInStatus = useRef<string | null>(null);
  const parentRef = useRef(null);

  const hideSplash = useCallback(async () => {
    if (hasHiddenSplash.current) return;

    try {
      await SplashScreen.hideAsync();
      hasHiddenSplash.current = true;
      logger.info({
        message: 'Splash screen hidden',
      });
    } catch (error) {
      logger.error({
        message: 'Failed to hide splash screen',
        context: { error },
      });
    }
  }, []);

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
    logger.info({
      message: 'Starting app initialization',
      context: {
        hasInitialized: hasInitialized.current,
      },
    });

    try {
      // Initialize core app data
      await useCoreStore.getState().init();
      await useRolesStore.getState().init();
      await useCallsStore.getState().init();
      await useCalendarStore.getState().init();
      await useShiftsStore.getState().init();
      await securityStore.getState().getRights();

      await useSignalRStore.getState().connectUpdateHub();
      await useSignalRStore.getState().connectGeolocationHub();

      hasInitialized.current = true;

      // Initialize Bluetooth service
      await bluetoothAudioService.initialize();
      await audioService.initialize();

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

  // Handle splash screen hiding
  useEffect(() => {
    if (status !== 'idle' && !hasHiddenSplash.current) {
      const timer = setTimeout(() => {
        hideSplash();
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [status, hideSplash]);

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
    //setIsOnboarding();
    return <Redirect href="/onboarding" />;
  }
  if (status === 'signedOut') {
    return <Redirect href="/login" />;
  }

  const content = (
    <View style={styles.container}>
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
                <SideMenu />
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
          <Tabs
            screenOptions={{
              headerShown: true,
              tabBarShowLabel: true,
              tabBarIconStyle: {
                width: 24,
                height: 24,
              },
              tabBarLabelStyle: {
                fontSize: isLandscape ? 12 : 10,
                fontWeight: '500',
              },
              tabBarStyle: {
                paddingBottom: 5,
                paddingTop: 5,
                height: isLandscape ? 65 : 60,
              },
            }}
          >
            <Tabs.Screen
              name="index"
              options={{
                title: t('tabs.map'),
                tabBarIcon: ({ color }) => <Icon as={Map} stroke={color} className="text-primary-500 dark:text-primary-400" />,
                headerLeft: () => <CreateDrawerMenuButton setIsOpen={setIsOpen} isLandscape={isLandscape} />,
                tabBarButtonTestID: 'map-tab',
                headerRight: () => <CreateNotificationButton config={config} setIsNotificationsOpen={setIsNotificationsOpen} userId={userId} departmentCode={rights?.DepartmentCode} />,
              }}
            />

            <Tabs.Screen
              name="calls"
              options={{
                title: t('tabs.calls'),
                headerShown: true,
                tabBarIcon: ({ color }) => <Icon as={Megaphone} stroke={color} className="text-primary-500 dark:text-primary-400" />,
                tabBarButtonTestID: 'calls-tab',
                headerRight: () => <CreateNotificationButton config={config} setIsNotificationsOpen={setIsNotificationsOpen} userId={userId} departmentCode={rights?.DepartmentCode} />,
              }}
            />

            <Tabs.Screen
              name="contacts"
              options={{
                title: t('tabs.contacts'),
                headerShown: true,
                tabBarIcon: ({ color }) => <Icon as={Contact} stroke={color} className="text-primary-500 dark:text-primary-400" />,
                tabBarButtonTestID: 'contacts-tab',
                headerRight: () => <CreateNotificationButton config={config} setIsNotificationsOpen={setIsNotificationsOpen} userId={userId} departmentCode={rights?.DepartmentCode} />,
              }}
            />

            <Tabs.Screen
              name="messages"
              options={{
                title: t('tabs.messages'),
                headerShown: true,
                tabBarIcon: ({ color }) => <Icon as={Mail} stroke={color} className="text-primary-500 dark:text-primary-400" />,
                tabBarButtonTestID: 'messages-tab',
                headerRight: () => <CreateNotificationButton config={config} setIsNotificationsOpen={setIsNotificationsOpen} userId={userId} departmentCode={rights?.DepartmentCode} />,
              }}
            />

            <Tabs.Screen
              name="notes"
              options={{
                title: t('tabs.notes'),
                headerShown: true,
                tabBarIcon: ({ color }) => <Icon as={Notebook} stroke={color} />,
                tabBarButtonTestID: 'notes-tab',
                headerRight: () => <CreateNotificationButton config={config} setIsNotificationsOpen={setIsNotificationsOpen} userId={userId} departmentCode={rights?.DepartmentCode} />,
              }}
            />

            <Tabs.Screen
              name="protocols"
              options={{
                title: t('tabs.protocols'),
                headerShown: true,
                tabBarIcon: ({ color }) => <Icon as={ListTree} stroke={color} />,
                tabBarButtonTestID: 'protocols-tab',
                headerRight: () => <CreateNotificationButton config={config} setIsNotificationsOpen={setIsNotificationsOpen} userId={userId} departmentCode={rights?.DepartmentCode} />,
              }}
            />

            <Tabs.Screen
              name="shifts"
              options={{
                title: t('tabs.shifts'),
                headerShown: true,
                tabBarIcon: ({ color }) => <Icon as={Clock} stroke={color} className="text-primary-500 dark:text-primary-400" />,
                tabBarButtonTestID: 'shifts-tab',
                headerRight: () => <CreateNotificationButton config={config} setIsNotificationsOpen={setIsNotificationsOpen} userId={userId} departmentCode={rights?.DepartmentCode} />,
              }}
            />

            <Tabs.Screen
              name="settings"
              options={{
                title: t('tabs.settings'),
                headerShown: true,
                tabBarIcon: ({ color }) => <Icon as={Settings} stroke={color} />,
                tabBarButtonTestID: 'settings-tab',
              }}
            />
          </Tabs>
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
    return null;
  }

  return (
    <Pressable
      className="p-3"
      onPress={() => {
        setIsOpen(true);
      }}
    >
      <Menu size={24} color="currentColor" className="text-gray-700 dark:text-gray-300" />
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
