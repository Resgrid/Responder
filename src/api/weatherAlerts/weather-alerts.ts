import type { ActiveWeatherAlertsResult } from '@/models/v4/weatherAlerts/activeWeatherAlertsResult';
import type { WeatherAlertResult } from '@/models/v4/weatherAlerts/weatherAlertResult';
import type { WeatherAlertSettingsResult } from '@/models/v4/weatherAlerts/weatherAlertSettingsResult';

import { createApiEndpoint } from '../common/client';

const getActiveAlertsApi = createApiEndpoint('/WeatherAlerts/GetActiveAlerts');
const getWeatherAlertApi = createApiEndpoint('/WeatherAlerts/GetWeatherAlert');
const getAlertsNearLocationApi = createApiEndpoint('/WeatherAlerts/GetAlertsNearLocation');
const getSettingsApi = createApiEndpoint('/WeatherAlerts/GetSettings');

export const getActiveAlerts = async () => {
  const response = await getActiveAlertsApi.get<ActiveWeatherAlertsResult>();
  return response.data;
};

export const getWeatherAlert = async (alertId: string) => {
  const response = await getWeatherAlertApi.get<WeatherAlertResult>({
    alertId,
  });
  return response.data;
};

export const getAlertsNearLocation = async (lat: number, lng: number, radiusMiles?: number) => {
  const response = await getAlertsNearLocationApi.get<ActiveWeatherAlertsResult>({
    lat,
    lng,
    ...(radiusMiles !== undefined ? { radiusMiles } : {}),
  });
  return response.data;
};

export const getSettings = async () => {
  const response = await getSettingsApi.get<WeatherAlertSettingsResult>();
  return response.data;
};
