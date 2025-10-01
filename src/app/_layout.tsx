// Import URL polyfill at the very top to ensure URL is available globally
import 'react-native-url-polyfill/auto';
// Import  global CSS file
import '../../global.css';
import '../lib/i18n';

import { Env } from '@env';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { registerGlobals } from '@livekit/react-native';
import { createNavigationContainerRef, DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import * as Sentry from '@sentry/react-native';
import { isRunningInExpoGo } from 'expo';
import * as Notifications from 'expo-notifications';
import { Stack, useNavigationContainerRef } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect } from 'react';
import { LogBox, useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { APIProvider } from '@/api';
import { LiveKitBottomSheet } from '@/components/livekit';
import { PushNotificationModal } from '@/components/push-notification/push-notification-modal';
import { ToastContainer } from '@/components/toast/toast-container';
import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import { hydrateAuth, useAuth } from '@/lib/auth';
import { loadKeepAliveState } from '@/lib/hooks/use-keep-alive';
import { loadSelectedTheme } from '@/lib/hooks/use-selected-theme';
import { logger } from '@/lib/logging';
import { getDeviceUuid, setDeviceUuid } from '@/lib/storage/app';
import { loadBackgroundGeolocationState } from '@/lib/storage/background-geolocation';
import { uuidv4 } from '@/lib/utils';
import { appInitializationService } from '@/services/app-initialization.service';

// Prevent the splash screen from auto-hiding before asset loading is complete.
//SplashScreen.preventAutoHideAsync();

export { ErrorBoundary } from 'expo-router';
export const navigationRef = createNavigationContainerRef();

export const unstable_settings = {
  initialRouteName: '(app)',
};

// Construct a new integration instance. This is needed to communicate between the integration and React
const navigationIntegration = Sentry.reactNavigationIntegration({
  // Disable enableTimeToInitialDisplay to prevent fallback timestamp errors
  enableTimeToInitialDisplay: false,
});

Sentry.init({
  dsn: Env.SENTRY_DSN,
  debug: __DEV__, // Only debug in development, not production
  tracesSampleRate: __DEV__ ? 1.0 : 0.2, // 100% in dev, 20% in production to reduce performance impact
  profilesSampleRate: __DEV__ ? 1.0 : 0.2, // 100% in dev, 20% in production to reduce performance impact
  sendDefaultPii: false,
  integrations: [
    // Pass integration
    navigationIntegration,
  ],
  enableNativeFramesTracking: true, //!isRunningInExpoGo(), // Tracks slow and frozen frames in the application
  // Add additional options to prevent timing issues
  beforeSendTransaction(event: any) {
    // Filter out problematic navigation transactions that might cause timestamp errors
    if (event.contexts?.trace?.op === 'navigation' && !event.contexts?.trace?.data?.route) {
      return null;
    }
    return event;
  },
});

registerGlobals();

// Load the selected theme from storage and apply it
loadSelectedTheme();

//useAuth().hydrate();

// Set the animation options. This is optional.
SplashScreen.setOptions({
  duration: 2000,
  fade: true,
});

const deviceUuid = getDeviceUuid();
if (!deviceUuid) {
  setDeviceUuid(uuidv4());
}

LogBox.ignoreLogs([
  //Mapbox errors
  'Mapbox [error] ViewTagResolver | view:',
  // Ignore Sentry fallback timestamp warnings in development
  'Sentry Logger [error]: Failed to receive any fallback timestamp',
]);

function RootLayout() {
  // Capture the NavigationContainer ref and register it with the integration.
  const ref = useNavigationContainerRef();

  useEffect(() => {
    if (ref?.current) {
      navigationIntegration.registerNavigationContainer(ref);
    }

    hydrateAuth();

    // Clear the badge count on app startup
    Notifications.setBadgeCountAsync(0)
      .then(() => {
        logger.info({
          message: 'Badge count cleared on startup',
        });
      })
      .catch((error) => {
        logger.error({
          message: 'Failed to clear badge count on startup',
          context: { error },
        });
      });

    // Load keep alive state on app startup
    loadKeepAliveState()
      .then(() => {
        logger.info({
          message: 'Keep alive state loaded on startup',
        });
      })
      .catch((error) => {
        logger.error({
          message: 'Failed to load keep alive state on startup',
          context: { error },
        });
      });

    // Load background geolocation state on app startup
    loadBackgroundGeolocationState()
      .then(() => {
        logger.info({
          message: 'Background geolocation state loaded on startup',
        });
      })
      .catch((error) => {
        logger.error({
          message: 'Failed to load background geolocation state on startup',
          context: { error },
        });
      });

    // Initialize global app services (including CallKeep for iOS)
    appInitializationService
      .initialize()
      .then(() => {
        logger.info({
          message: 'Global app services initialized successfully',
        });
      })
      .catch((error) => {
        logger.error({
          message: 'Failed to initialize global app services',
          context: { error },
        });
      });
  }, [ref]);

  return (
    <Providers>
      <Stack>
        <Stack.Screen name="(app)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="login/index" options={{ headerShown: false }} />
      </Stack>
    </Providers>
  );
}

function Providers({ children }: { children: React.ReactNode }) {
  const colorScheme = useColorScheme();

  const renderContent = () => (
    <APIProvider>
      <GluestackUIProvider mode={(colorScheme ?? 'light') as 'light' | 'dark'}>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <BottomSheetModalProvider>
            {children}
            <LiveKitBottomSheet />
            <PushNotificationModal />
            <ToastContainer />
          </BottomSheetModalProvider>
        </ThemeProvider>
      </GluestackUIProvider>
    </APIProvider>
  );

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView>
        <KeyboardProvider>{renderContent()}</KeyboardProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

export default Sentry.wrap(RootLayout);
