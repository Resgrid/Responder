import { describe, expect, it, jest, beforeEach, afterEach } from '@jest/globals';
import { act, renderHook, waitFor } from '@testing-library/react-native';

import { getActiveAlerts, getAlertsNearLocation, getSettings, getWeatherAlert } from '@/api/weatherAlerts/weather-alerts';
import { useWeatherAlertsStore } from '../weather-alerts-store';

jest.mock('@/api/weatherAlerts/weather-alerts');
jest.mock('@/lib/logging', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

const mockGetActiveAlerts = getActiveAlerts as jest.MockedFunction<typeof getActiveAlerts>;
const mockGetWeatherAlert = getWeatherAlert as jest.MockedFunction<typeof getWeatherAlert>;
const mockGetAlertsNearLocation = getAlertsNearLocation as jest.MockedFunction<typeof getAlertsNearLocation>;
const mockGetSettings = getSettings as jest.MockedFunction<typeof getSettings>;

const makeAlert = (overrides: Record<string, unknown> = {}) => ({
  AlertId: '1',
  DepartmentId: 1,
  Title: 'Test Alert',
  Event: 'Tornado Warning',
  Headline: 'Tornado warning for area',
  Description: 'A tornado has been spotted',
  Instruction: 'Take shelter immediately',
  AreaDescription: 'County A',
  Severity: 'Severe',
  Certainty: 'Observed',
  Urgency: 'Immediate',
  Category: 'Met',
  Status: 'Actual',
  Sender: 'NWS',
  SenderName: 'National Weather Service',
  Source: 'NWS',
  SourceType: 'NWS',
  Effective: '2026-04-15T10:00:00Z',
  Onset: '2026-04-15T10:00:00Z',
  Expires: '2026-04-15T18:00:00Z',
  Polygon: '',
  CenterGeoLocation: '',
  Latitude: '35.0',
  Longitude: '-97.0',
  RadiusMiles: 25,
  ExternalId: 'ext-1',
  CreatedOn: '2026-04-15T10:00:00Z',
  CreatedOnUtc: '2026-04-15T10:00:00Z',
  ...overrides,
});

describe('useWeatherAlertsStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useWeatherAlertsStore.getState().reset();
  });

  describe('fetchActiveAlerts', () => {
    it('should fetch and sort alerts by severity then date', async () => {
      const alerts = [
        makeAlert({ AlertId: '1', Severity: 'Minor', CreatedOnUtc: '2026-04-15T12:00:00Z' }),
        makeAlert({ AlertId: '2', Severity: 'Extreme', CreatedOnUtc: '2026-04-15T10:00:00Z' }),
        makeAlert({ AlertId: '3', Severity: 'Severe', CreatedOnUtc: '2026-04-15T11:00:00Z' }),
      ];

      mockGetActiveAlerts.mockResolvedValue({ Data: alerts } as any);

      const { result } = renderHook(() => useWeatherAlertsStore());

      await act(async () => {
        await result.current.fetchActiveAlerts();
      });

      await waitFor(() => {
        expect(result.current.alerts).toHaveLength(3);
        expect(result.current.alerts[0].Severity).toBe('Extreme');
        expect(result.current.alerts[1].Severity).toBe('Severe');
        expect(result.current.alerts[2].Severity).toBe('Minor');
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should dedupe alerts with the same identity', async () => {
      const alerts = [
        makeAlert({ AlertId: '1', ExternalId: 'external-1', Event: 'Older Alert', CreatedOnUtc: '2026-04-15T09:00:00Z', Severity: 'Moderate' }),
        makeAlert({ AlertId: '1', ExternalId: 'external-1', Event: 'Newer Alert', CreatedOnUtc: '2026-04-15T10:00:00Z', Severity: 'Severe' }),
      ];

      mockGetActiveAlerts.mockResolvedValue({ Data: alerts } as any);

      const { result } = renderHook(() => useWeatherAlertsStore());

      await act(async () => {
        await result.current.fetchActiveAlerts();
      });

      await waitFor(() => {
        expect(result.current.alerts).toHaveLength(1);
        expect(result.current.alerts[0].Event).toBe('Newer Alert');
      });
    });

    it('should handle fetch error', async () => {
      mockGetActiveAlerts.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useWeatherAlertsStore());

      await act(async () => {
        await result.current.fetchActiveAlerts();
      });

      await waitFor(() => {
        expect(result.current.error).toBe('Network error');
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe('handleAlertReceived', () => {
    it('should prepend new alert and re-sort', async () => {
      const existingAlert = makeAlert({ AlertId: '1', Severity: 'Minor' });
      mockGetActiveAlerts.mockResolvedValue({ Data: [existingAlert] } as any);

      const { result } = renderHook(() => useWeatherAlertsStore());

      await act(async () => {
        await result.current.fetchActiveAlerts();
      });

      const newAlert = makeAlert({ AlertId: '2', Severity: 'Extreme' });
      mockGetWeatherAlert.mockResolvedValue({ Data: newAlert } as any);

      await act(async () => {
        await result.current.handleAlertReceived('2');
      });

      await waitFor(() => {
        expect(result.current.alerts).toHaveLength(2);
        expect(result.current.alerts[0].AlertId).toBe('2');
        expect(result.current.alerts[0].Severity).toBe('Extreme');
      });
    });

    it('should avoid duplicate alerts when receiving an existing alert', async () => {
      const existingAlert = makeAlert({ AlertId: '1', ExternalId: 'external-1', Event: 'Current Alert', Severity: 'Minor' });
      mockGetActiveAlerts.mockResolvedValue({ Data: [existingAlert] } as any);

      const { result } = renderHook(() => useWeatherAlertsStore());

      await act(async () => {
        await result.current.fetchActiveAlerts();
      });

      const updatedAlert = makeAlert({ AlertId: '1', ExternalId: 'external-1', Event: 'Updated Alert', Severity: 'Extreme' });
      mockGetWeatherAlert.mockResolvedValue({ Data: updatedAlert } as any);

      await act(async () => {
        await result.current.handleAlertReceived('1');
      });

      await waitFor(() => {
        expect(result.current.alerts).toHaveLength(1);
        expect(result.current.alerts[0].Event).toBe('Updated Alert');
        expect(result.current.alerts[0].Severity).toBe('Extreme');
      });
    });
  });

  describe('handleAlertUpdated', () => {
    it('should update existing alert in place', async () => {
      const alert = makeAlert({ AlertId: '1', Severity: 'Moderate', Event: 'Old Event' });
      mockGetActiveAlerts.mockResolvedValue({ Data: [alert] } as any);

      const { result } = renderHook(() => useWeatherAlertsStore());

      await act(async () => {
        await result.current.fetchActiveAlerts();
      });

      const updated = makeAlert({ AlertId: '1', Severity: 'Severe', Event: 'Updated Event' });
      mockGetWeatherAlert.mockResolvedValue({ Data: updated } as any);

      await act(async () => {
        await result.current.handleAlertUpdated('1');
      });

      await waitFor(() => {
        expect(result.current.alerts).toHaveLength(1);
        expect(result.current.alerts[0].Event).toBe('Updated Event');
        expect(result.current.alerts[0].Severity).toBe('Severe');
      });
    });
  });

  describe('handleAlertExpired', () => {
    it('should remove the expired alert', async () => {
      const alerts = [makeAlert({ AlertId: '1' }), makeAlert({ AlertId: '2' })];
      mockGetActiveAlerts.mockResolvedValue({ Data: alerts } as any);

      const { result } = renderHook(() => useWeatherAlertsStore());

      await act(async () => {
        await result.current.fetchActiveAlerts();
      });

      act(() => {
        result.current.handleAlertExpired('1');
      });

      await waitFor(() => {
        expect(result.current.alerts).toHaveLength(1);
        expect(result.current.alerts[0].AlertId).toBe('2');
      });
    });
  });

  describe('getSevereAlerts', () => {
    it('should return only Extreme and Severe alerts', async () => {
      const alerts = [makeAlert({ AlertId: '1', Severity: 'Extreme' }), makeAlert({ AlertId: '2', Severity: 'Moderate' }), makeAlert({ AlertId: '3', Severity: 'Severe' }), makeAlert({ AlertId: '4', Severity: 'Minor' })];
      mockGetActiveAlerts.mockResolvedValue({ Data: alerts } as any);

      const { result } = renderHook(() => useWeatherAlertsStore());

      await act(async () => {
        await result.current.fetchActiveAlerts();
      });

      const severe = result.current.getSevereAlerts();
      expect(severe).toHaveLength(2);
      expect(severe[0].Severity).toBe('Extreme');
      expect(severe[1].Severity).toBe('Severe');
    });
  });

  describe('reset', () => {
    it('should clear all state', async () => {
      const alerts = [makeAlert({ AlertId: '1' })];
      mockGetActiveAlerts.mockResolvedValue({ Data: alerts } as any);

      const { result } = renderHook(() => useWeatherAlertsStore());

      await act(async () => {
        await result.current.fetchActiveAlerts();
      });

      expect(result.current.alerts).toHaveLength(1);

      act(() => {
        result.current.reset();
      });

      expect(result.current.alerts).toHaveLength(0);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.selectedAlert).toBeNull();
      expect(result.current.settings).toBeNull();
    });
  });

  describe('fetchSettings', () => {
    it('should fetch and store settings', async () => {
      const settings = {
        WeatherAlertsEnabled: true,
        MonitoredLatitude: '35.0',
        MonitoredLongitude: '-97.0',
        MonitoredRadiusMiles: 50,
        SourceType: 'NWS',
        SeveritySchedules: [],
      };
      mockGetSettings.mockResolvedValue({ Data: settings } as any);

      const { result } = renderHook(() => useWeatherAlertsStore());

      await act(async () => {
        await result.current.fetchSettings();
      });

      await waitFor(() => {
        expect(result.current.settings).toEqual(settings);
        expect(result.current.settings?.WeatherAlertsEnabled).toBe(true);
      });
    });
  });
});
