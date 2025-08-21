import { init } from '@aptabase/react-native';
import { Env } from '@env';
import React, { useRef } from 'react';

import { logger } from '@/lib/logging';
import { aptabaseService } from '@/services/aptabase.service';

interface AptabaseProviderWrapperProps {
  appKey: string;
  children: React.ReactNode;
}

export const AptabaseProviderWrapper: React.FC<AptabaseProviderWrapperProps> = ({ appKey, children }) => {
  const initializationAttempted = useRef(false);
  const [initializationFailed, setInitializationFailed] = React.useState(false);

  React.useEffect(() => {
    // Only attempt initialization once
    if (initializationAttempted.current) return;
    initializationAttempted.current = true;

    // Check if analytics is already disabled due to previous errors
    if (aptabaseService.isAnalyticsDisabled()) {
      logger.info({
        message: 'Aptabase provider skipped - service is disabled',
        context: aptabaseService.getStatus(),
      });
      setInitializationFailed(true);
      return;
    }

    try {
      // Initialize Aptabase - use appKey prop if provided, otherwise fall back to env
      const keyToUse = appKey || Env.APTABASE_APP_KEY;
      init(keyToUse, {
        host: Env.APTABASE_URL || '',
      });

      logger.info({
        message: 'Aptabase provider initialized',
        context: {
          appKey: keyToUse.substring(0, 8) + '...',
          serviceStatus: aptabaseService.getStatus(),
        },
      });
    } catch (error) {
      logger.error({
        message: 'Aptabase provider initialization failed',
        context: { error: error instanceof Error ? error.message : String(error) },
      });

      // Handle the error through the service
      aptabaseService.reset();
      setInitializationFailed(true);
    }

    return () => {
      // Cleanup if needed
    };
  }, [appKey]);

  // Always render children - Aptabase doesn't require a provider wrapper around the app
  return <>{children}</>;
};
