import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { render, screen } from '@testing-library/react-native';
import React from 'react';

import { useWeatherAlertsStore } from '@/stores/weather-alerts/weather-alerts-store';

import { WeatherAlertBanner } from '../weather-alert-banner';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      if (key === 'weatherAlerts.banner.moreAlerts' && options?.count !== undefined) {
        return `+${options.count} more`;
      }
      return key;
    },
  }),
}));

jest.mock('@/stores/weather-alerts/weather-alerts-store', () => ({
  useWeatherAlertsStore: jest.fn(),
}));

const mockUseWeatherAlertsStore = useWeatherAlertsStore as jest.MockedFunction<typeof useWeatherAlertsStore>;

function setupMock(settings: Record<string, unknown> | null, alerts: Record<string, unknown>[], getSevereAlerts: () => Record<string, unknown>[] = () => []) {
  mockUseWeatherAlertsStore.mockImplementation(((selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      settings,
      alerts,
      getSevereAlerts,
    };
    return selector(state);
  }) as any);
}

describe('WeatherAlertBanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not render when feature is disabled', () => {
    setupMock({ WeatherAlertsEnabled: false }, []);

    const { toJSON } = render(<WeatherAlertBanner />);
    expect(toJSON()).toBeNull();
  });

  it('should not render when no severe alerts', () => {
    setupMock({ WeatherAlertsEnabled: true }, []);

    const { toJSON } = render(<WeatherAlertBanner />);
    expect(toJSON()).toBeNull();
  });

  it('should render with the highest severity alert', () => {
    const severeAlerts = [
      { WeatherAlertId: '1', Event: 'Tornado Warning', Severity: 0, AlertCategory: 0 },
      { WeatherAlertId: '2', Event: 'Severe Thunderstorm', Severity: 1, AlertCategory: 0 },
    ];

    setupMock({ WeatherAlertsEnabled: true }, severeAlerts);

    render(<WeatherAlertBanner />);

    expect(screen.getByText('Tornado Warning')).toBeTruthy();
    expect(screen.getByText('+1 more')).toBeTruthy();
  });

  it('should not show more badge when only one severe alert', () => {
    const severeAlerts = [
      { WeatherAlertId: '1', Event: 'Tornado Warning', Severity: 0, AlertCategory: 0 },
    ];

    setupMock({ WeatherAlertsEnabled: true }, severeAlerts);

    render(<WeatherAlertBanner />);

    expect(screen.getByText('Tornado Warning')).toBeTruthy();
    expect(screen.queryByText(/more/)).toBeNull();
  });

  it('should filter out non-severe alerts from the subscribed list', () => {
    const alerts = [
      { WeatherAlertId: '1', Event: 'Tornado Warning', Severity: 0, AlertCategory: 0 },
      { WeatherAlertId: '2', Event: 'Dense Fog Advisory', Severity: 3, AlertCategory: 0 },
    ];

    setupMock({ WeatherAlertsEnabled: true }, alerts);

    render(<WeatherAlertBanner />);

    expect(screen.getByText('Tornado Warning')).toBeTruthy();
    // Only the Extreme alert counts, so there is no "+1 more" badge for the Minor one.
    expect(screen.queryByText(/more/)).toBeNull();
  });

  // Regression: the banner must subscribe to `alerts` rather than calling the store's
  // getSevereAlerts() getter in render, which reads get().alerts and creates no
  // subscription — a newly arrived severe alert would otherwise never show.
  it('should derive severe alerts from the subscribed alerts slice, not the store getter', () => {
    const getSevereAlerts = jest.fn(() => []);

    setupMock({ WeatherAlertsEnabled: true }, [{ WeatherAlertId: '1', Event: 'Tornado Warning', Severity: 0, AlertCategory: 0 }], getSevereAlerts);

    render(<WeatherAlertBanner />);

    expect(screen.getByText('Tornado Warning')).toBeTruthy();
    expect(getSevereAlerts).not.toHaveBeenCalled();
  });

  it('should update when a severe alert arrives in the subscribed alerts slice', () => {
    setupMock({ WeatherAlertsEnabled: true }, []);

    const { rerender, toJSON } = render(<WeatherAlertBanner />);
    expect(toJSON()).toBeNull();

    setupMock({ WeatherAlertsEnabled: true }, [{ WeatherAlertId: '1', Event: 'Tornado Warning', Severity: 0, AlertCategory: 0 }]);
    rerender(<WeatherAlertBanner />);

    expect(screen.getByText('Tornado Warning')).toBeTruthy();
  });
});
