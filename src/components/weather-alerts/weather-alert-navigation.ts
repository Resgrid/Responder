import { router } from 'expo-router';

import { useWeatherAlertsStore } from '@/stores/weather-alerts/weather-alerts-store';

interface OpenWeatherAlertDetailOptions {
  // How many times to attempt the router.push before giving up. Values above 1 are for
  // cold-start deep links, where the push notification tap is replayed before the root
  // layout has mounted and router.push throws until the router is ready.
  maxAttempts?: number;
  retryDelayMs?: number;
}

export const getWeatherAlertDetailPath = (alertId: string): `/(app)/weather-alerts/${string}` => `/(app)/weather-alerts/${encodeURIComponent(`alert:${alertId}`)}`;

/**
 * Navigates to the weather alert detail screen for the given alert id. Loads the alert into
 * the store first so the detail screen can resolve it by identity (the store keys alerts as
 * `alert:<AlertId>`); handleAlertReceived logs its own errors. Throws the last navigation
 * error if every attempt fails.
 */
export const openWeatherAlertDetail = async (alertId: string, options?: OpenWeatherAlertDetailOptions): Promise<void> => {
  const maxAttempts = options?.maxAttempts ?? 1;
  const retryDelayMs = options?.retryDelayMs ?? 250;

  await useWeatherAlertsStore.getState().handleAlertReceived(alertId);

  const path = getWeatherAlertDetailPath(alertId);

  for (let attempt = 1; ; attempt++) {
    try {
      router.push(path);
      return;
    } catch (error) {
      if (attempt >= maxAttempts) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
    }
  }
};
