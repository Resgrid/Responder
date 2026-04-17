import { describe, expect, it } from '@jest/globals';

import { WeatherAlertResultData } from '@/models/v4/weatherAlerts/weatherAlertResultData';
import { formatWeatherAlertTranslation, getWeatherAlertSeverityOrder, isSevereWeatherAlert, normalizeWeatherAlertSeverity } from '@/components/weather-alerts/weather-alert-formatters';
import { getWeatherAlertKey, getWeatherAlertRequestId } from '@/components/weather-alerts/weather-alert-list-utils';

const makeAlert = (overrides: Partial<WeatherAlertResultData> = {}): WeatherAlertResultData => {
  const alert = new WeatherAlertResultData();
  alert.AlertId = 'alert-1';
  alert.ExternalId = 'external-1';
  alert.CreatedOnUtc = '2026-04-15T10:00:00Z';
  alert.Event = 'Tornado Warning';
  return Object.assign(alert, overrides);
};

describe('getWeatherAlertKey', () => {
  it('uses alert identity fields when present', () => {
    const alert = makeAlert();

    expect(getWeatherAlertKey(alert, 3)).toBe('alert:alert-1');
  });

  it('uses external id when alert id is missing', () => {
    const alert = makeAlert({ AlertId: '' });

    expect(getWeatherAlertKey(alert, 7)).toBe('external:external-1');
  });

  it('falls back to derived identity plus index when ids are missing', () => {
    const alert = makeAlert({ AlertId: '', ExternalId: '' });

    expect(getWeatherAlertKey(alert, 7)).toBe('2026-04-15T10:00:00Z::Tornado Warning::7');
  });

  it('falls back to the list index when all identity fields are missing', () => {
    const alert = makeAlert({ AlertId: '', ExternalId: '', CreatedOnUtc: '', Event: '', AreaDescription: '' });

    expect(getWeatherAlertKey(alert, 7)).toBe('weather-alert-7');
  });
});

describe('getWeatherAlertRequestId', () => {
  it('prefers alert id when present', () => {
    const alert = makeAlert();

    expect(getWeatherAlertRequestId(alert)).toBe('alert-1');
  });

  it('does not use external id for detail requests', () => {
    const alert = makeAlert({ AlertId: '' });

    expect(getWeatherAlertRequestId(alert)).toBe('');
  });

  it('returns empty string when no request id is available', () => {
    const alert = makeAlert({ AlertId: '', ExternalId: '' });

    expect(getWeatherAlertRequestId(alert)).toBe('');
  });
});

describe('normalizeWeatherAlertSeverity', () => {
  it('normalizes case-insensitive severity values', () => {
    expect(normalizeWeatherAlertSeverity(' severe ')).toBe('Severe');
  });

  it('maps numeric severity values', () => {
    expect(normalizeWeatherAlertSeverity(2)).toBe('Moderate');
  });
});

describe('formatWeatherAlertTranslation', () => {
  const t = (key: string): string => key;

  it('formats known urgency values through translations', () => {
    expect(formatWeatherAlertTranslation(t as never, 'urgency', 'Immediate')).toBe('weatherAlerts.urgency.Immediate');
  });

  it('formats numeric urgency values through translations', () => {
    expect(formatWeatherAlertTranslation(t as never, 'urgency', 1)).toBe('weatherAlerts.urgency.Expected');
  });

  it('formats numeric certainty values through translations', () => {
    expect(formatWeatherAlertTranslation(t as never, 'certainty', 2)).toBe('weatherAlerts.certainty.Possible');
  });

  it('formats numeric status values through translations', () => {
    expect(formatWeatherAlertTranslation(t as never, 'status', 3)).toBe('weatherAlerts.status.Cancelled');
  });

  it('falls back to human readable text for unknown values', () => {
    expect(formatWeatherAlertTranslation(t as never, 'certainty', 'very_likely')).toBe('Very Likely');
  });

  it('returns empty text for undefined values', () => {
    expect(formatWeatherAlertTranslation(t as never, 'urgency', undefined)).toBe('');
  });

  it('formats non-string values without crashing', () => {
    expect(formatWeatherAlertTranslation(t as never, 'status', 404)).toBe('404');
  });
});

describe('getWeatherAlertSeverityOrder', () => {
  it('maps numeric severities with lower values as more severe', () => {
    expect(getWeatherAlertSeverityOrder(0)).toBe(0);
    expect(getWeatherAlertSeverityOrder(1)).toBe(1);
    expect(getWeatherAlertSeverityOrder(2)).toBe(2);
  });
});

describe('isSevereWeatherAlert', () => {
  it('treats numeric extreme and severe values as severe alerts', () => {
    expect(isSevereWeatherAlert(0)).toBe(true);
    expect(isSevereWeatherAlert(1)).toBe(true);
    expect(isSevereWeatherAlert(2)).toBe(false);
  });
});
