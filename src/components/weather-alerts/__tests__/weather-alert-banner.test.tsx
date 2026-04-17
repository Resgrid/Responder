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

function setupMock(settings: Record<string, unknown> | null, severeAlerts: Record<string, unknown>[]) {
  mockUseWeatherAlertsStore.mockImplementation(((selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      settings,
      getSevereAlerts: () => severeAlerts,
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
      { AlertId: '1', Event: 'Tornado Warning', Severity: 'Extreme', Category: 'Met' },
      { AlertId: '2', Event: 'Severe Thunderstorm', Severity: 'Severe', Category: 'Met' },
    ];

    setupMock({ WeatherAlertsEnabled: true }, severeAlerts);

    render(<WeatherAlertBanner />);

    expect(screen.getByText('Tornado Warning')).toBeTruthy();
    expect(screen.getByText('+1 more')).toBeTruthy();
  });

  it('should not show more badge when only one severe alert', () => {
    const severeAlerts = [
      { AlertId: '1', Event: 'Tornado Warning', Severity: 'Extreme', Category: 'Met' },
    ];

    setupMock({ WeatherAlertsEnabled: true }, severeAlerts);

    render(<WeatherAlertBanner />);

    expect(screen.getByText('Tornado Warning')).toBeTruthy();
    expect(screen.queryByText(/more/)).toBeNull();
  });
});
