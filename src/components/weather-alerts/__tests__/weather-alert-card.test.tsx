import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { WeatherAlertResultData } from '@/models/v4/weatherAlerts/weatherAlertResultData';

import { WeatherAlertCard } from '../weather-alert-card';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

jest.mock('@/lib/utils', () => ({
  getTimeAgoUtc: () => '2 hours ago',
}));

const makeAlert = (overrides: Partial<WeatherAlertResultData> = {}): WeatherAlertResultData => {
  const alert = new WeatherAlertResultData();
  alert.AlertId = '1';
  alert.Event = 'Tornado Warning';
  alert.Severity = 'Severe';
  alert.Category = 'Met';
  alert.AreaDescription = 'County A, County B';
  alert.Urgency = 'Immediate';
  alert.Certainty = 'Observed';
  alert.Expires = '2026-04-15T18:00:00Z';
  return Object.assign(alert, overrides);
};

describe('WeatherAlertCard', () => {
  it('renders alert event name', () => {
    const alert = makeAlert();
    render(<WeatherAlertCard alert={alert} onPress={jest.fn()} />);

    expect(screen.getByText('Tornado Warning')).toBeTruthy();
  });

  it('renders area description', () => {
    const alert = makeAlert();
    render(<WeatherAlertCard alert={alert} onPress={jest.fn()} />);

    expect(screen.getByText('County A, County B')).toBeTruthy();
  });

  it('calls onPress with alertId when pressed', () => {
    const onPress = jest.fn();
    const alert = makeAlert({ AlertId: 'alert-42' });
    render(<WeatherAlertCard alert={alert} onPress={onPress} />);

    fireEvent.press(screen.getByTestId('weather-alert-card-alert-42'));
    expect(onPress).toHaveBeenCalled();
  });

  it('renders with different severity levels', () => {
    const extremeAlert = makeAlert({ Severity: 'Extreme', Event: 'Extreme Heat Warning' });
    const { unmount } = render(<WeatherAlertCard alert={extremeAlert} onPress={jest.fn()} />);

    expect(screen.getByText('Extreme Heat Warning')).toBeTruthy();
    unmount();

    const minorAlert = makeAlert({ Severity: 'Minor', Event: 'Frost Advisory' });
    render(<WeatherAlertCard alert={minorAlert} onPress={jest.fn()} />);

    expect(screen.getByText('Frost Advisory')).toBeTruthy();
  });
});
