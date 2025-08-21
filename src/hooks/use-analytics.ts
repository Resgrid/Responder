import { useCallback } from 'react';

import { aptabaseService } from '@/services/aptabase.service';

interface AnalyticsEventProperties {
  [key: string]: string | number | boolean;
}

/**
 * Hook for tracking analytics events with Aptabase
 *
 * @returns Object with trackEvent function
 */
export const useAnalytics = () => {
  const trackEvent = useCallback((eventName: string, properties?: AnalyticsEventProperties) => {
    aptabaseService.trackEvent(eventName, properties);
  }, []);

  return {
    trackEvent,
  };
};
