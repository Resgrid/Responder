import { logger } from '@/lib/logging';
import type { ActiveWeatherAlertsResult } from '@/models/v4/weatherAlerts/activeWeatherAlertsResult';
import type { WeatherAlertResult } from '@/models/v4/weatherAlerts/weatherAlertResult';
import type { WeatherAlertSettingsResult } from '@/models/v4/weatherAlerts/weatherAlertSettingsResult';

import { createApiEndpoint } from '../common/client';

const getActiveAlertsApi = createApiEndpoint('/WeatherAlerts/GetActiveAlerts');
// GetWeatherAlert uses a path parameter, so the endpoint is created per call
const getWeatherAlertEndpoint = (alertId: string) => createApiEndpoint(`/WeatherAlerts/GetWeatherAlert/${encodeURIComponent(alertId)}`);
const getAlertsNearLocationApi = createApiEndpoint('/WeatherAlerts/GetAlertsNearLocation');
const getSettingsApi = createApiEndpoint('/WeatherAlerts/GetSettings');

export const getActiveAlerts = async () => {
  try {
    const response = await getActiveAlertsApi.get<ActiveWeatherAlertsResult>();
    return response.data;
  } catch (error) {
    logger.error({
      message: 'Failed to fetch active weather alerts',
      context: { error },
    });
    throw new Error('Failed to fetch active weather alerts', { cause: error });
  }
};

export const getWeatherAlert = async (alertId: string) => {
  try {
    const response = await getWeatherAlertEndpoint(alertId).get<WeatherAlertResult>();
    return response.data;
  } catch (error) {
    logger.error({
      message: 'Failed to fetch weather alert',
      context: { error, alertId },
    });
    throw new Error(`Failed to fetch weather alert ${alertId}`, { cause: error });
  }
};

export const getAlertsNearLocation = async (lat: number, lng: number, radiusMiles?: number) => {
  try {
    const response = await getAlertsNearLocationApi.get<ActiveWeatherAlertsResult>({
      lat,
      lng,
      ...(radiusMiles !== undefined ? { radiusMiles } : {}),
    });
    return response.data;
  } catch (error) {
    logger.error({
      message: 'Failed to fetch weather alerts near location',
      context: { error, lat, lng, radiusMiles },
    });
    throw new Error('Failed to fetch weather alerts near location', { cause: error });
  }
};

export const getSettings = async () => {
  try {
    const response = await getSettingsApi.get<WeatherAlertSettingsResult>();
    return response.data;
  } catch (error) {
    logger.error({
      message: 'Failed to fetch weather alert settings',
      context: { error },
    });
    throw new Error('Failed to fetch weather alert settings', { cause: error });
  }
};
