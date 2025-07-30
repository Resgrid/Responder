import { PostHogProvider } from 'posthog-react-native';
import React, { useRef } from 'react';

import { logger } from '@/lib/logging';
import { postHogService } from '@/services/posthog.service';

interface PostHogProviderWrapperProps {
  apiKey: string;
  host: string;
  navigationRef?: any;
  children: React.ReactNode;
}

export const PostHogProviderWrapper: React.FC<PostHogProviderWrapperProps> = ({ apiKey, host, navigationRef, children }) => {
  const initializationAttempted = useRef(false);
  const [initializationFailed, setInitializationFailed] = React.useState(false);

  React.useEffect(() => {
    // Only attempt initialization once
    if (initializationAttempted.current) return;
    initializationAttempted.current = true;

    // Check if PostHog is already disabled due to previous errors
    if (postHogService.isPostHogDisabled()) {
      logger.info({
        message: 'PostHog provider skipped - service is disabled',
        context: postHogService.getStatus(),
      });
      setInitializationFailed(true);
      return;
    }

    // Set up error handling for PostHog errors
    // In React Native, we rely on the PostHog service and provider error boundaries
    // rather than global window error listeners

    logger.info({
      message: 'PostHog provider initialized',
      context: {
        apiKey: apiKey.substring(0, 8) + '...',
        host,
        serviceStatus: postHogService.getStatus(),
      },
    });

    return () => {
      // Cleanup if needed
    };
  }, []);

  // If initialization failed, render children without PostHog
  if (initializationFailed) {
    return <>{children}</>;
  }

  try {
    return (
      <PostHogProvider
        apiKey={apiKey}
        options={{
          host,
          // Conservative settings to reduce network calls and errors
          flushAt: 20, // Flush after 20 events (less frequent)
          flushInterval: 120000, // Flush every 2 minutes (less frequent)
          requestTimeout: 15000, // 15 second timeout (more generous)
          // Reduce frequency of feature flag requests
          featureFlagsRequestTimeoutMs: 10000,
        }}
        autocapture={{
          // Disable screen capture to avoid navigation state issues
          captureScreens: false,
          // Keep touch capture but be conservative
          captureTouches: false,
          // Don't pass navigationRef to avoid navigation state errors
          // navigationRef,
        }}
      >
        {children}
      </PostHogProvider>
    );
  } catch (error) {
    logger.error({
      message: 'PostHog provider initialization failed',
      context: { error: error instanceof Error ? error.message : String(error) },
    });

    // Handle the error through the service
    postHogService.handleNetworkError(error);

    // Return children without PostHog
    return <>{children}</>;
  }
};
