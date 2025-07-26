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
import FlashMessage from 'react-native-flash-message';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { APIProvider } from '@/api';
import { PostHogProviderWrapper } from '@/components/common/posthog-provider';
import { LiveKitBottomSheet } from '@/components/livekit';
import { PersonnelStatusBottomSheet } from '@/components/status/personnel-status-bottom-sheet';
import { ToastContainer } from '@/components/toast/toast-container';
import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import { loadKeepAliveState } from '@/lib/hooks/use-keep-alive';
import { loadSelectedTheme } from '@/lib/hooks/use-selected-theme';
import { logger } from '@/lib/logging';
import { getDeviceUuid } from '@/lib/storage/app';
import { setDeviceUuid } from '@/lib/storage/app';
import { loadBackgroundGeolocationState } from '@/lib/storage/background-geolocation';
import { uuidv4 } from '@/lib/utils';

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
  tracesSampleRate: __DEV__ ? 1.0 : 0.1, // 100% in dev, 10% in production to reduce performance impact
  integrations: [
    // Pass integration
    navigationIntegration,
  ],
  enableNativeFramesTracking: !isRunningInExpoGo(), // Tracks slow and frozen frames in the application
  // Add additional options to prevent timing issues
  beforeSendTransaction(event) {
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
// Prevent the splash screen from auto-hiding before asset loading is complete.
//SplashScreen.preventAutoHideAsync();
// Set the animation options. This is optional.
SplashScreen.setOptions({
  duration: 1000,
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
    // Register navigation container with better error handling
    if (ref?.current) {
      try {
        navigationIntegration.registerNavigationContainer(ref);
        logger.info({
          message: 'Sentry navigation integration registered successfully',
        });
      } catch (error) {
        logger.warn({
          message: 'Failed to register Sentry navigation integration',
          context: { error },
        });
      }
    }

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
            <PersonnelStatusBottomSheet />
            <FlashMessage position="top" />
            <ToastContainer />
          </BottomSheetModalProvider>
        </ThemeProvider>
      </GluestackUIProvider>
    </APIProvider>
  );

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView>
        <KeyboardProvider>
          {Env.POSTHOG_API_KEY && Env.POSTHOG_HOST && !__DEV__ ? (
            <PostHogProviderWrapper apiKey={Env.POSTHOG_API_KEY} host={Env.POSTHOG_HOST} navigationRef={navigationRef}>
              {renderContent()}
            </PostHogProviderWrapper>
          ) : (
            renderContent()
          )}
        </KeyboardProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

export default Sentry.wrap(RootLayout);
