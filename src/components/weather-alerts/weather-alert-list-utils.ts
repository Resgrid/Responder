import type { WeatherAlertResultData } from '@/models/v4/weatherAlerts/weatherAlertResultData';

const normalizeValue = (value?: string): string => value?.trim() ?? '';

export const getWeatherAlertIdentity = (alert: WeatherAlertResultData): string => {
  const alertId = normalizeValue(alert.AlertId);
  if (alertId.length > 0) {
    return `alert:${alertId}`;
  }

  const externalId = normalizeValue(alert.ExternalId);
  if (externalId.length > 0) {
    return `external:${externalId}`;
  }

  const fallbackParts = [alert.CreatedOnUtc, alert.Event, alert.AreaDescription].map((value) => normalizeValue(value)).filter((value) => value.length > 0);

  return fallbackParts.join('::');
};

export const getWeatherAlertRequestId = (alert: WeatherAlertResultData): string => {
  const alertId = normalizeValue(alert.AlertId);
  if (alertId.length > 0) {
    return alertId;
  }

  return '';
};

export const getWeatherAlertKey = (alert: WeatherAlertResultData, index: number): string => {
  const alertId = normalizeValue(alert.AlertId);
  if (alertId.length > 0) {
    return `alert:${alertId}`;
  }

  const externalId = normalizeValue(alert.ExternalId);
  if (externalId.length > 0) {
    return `external:${externalId}`;
  }

  const fallbackIdentity = getWeatherAlertIdentity(alert);
  if (fallbackIdentity.length > 0) {
    return `${fallbackIdentity}::${index}`;
  }

  return `weather-alert-${index}`;
};
