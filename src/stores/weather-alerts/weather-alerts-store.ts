import { create } from 'zustand';

import { getActiveAlerts, getAlertsNearLocation, getSettings, getWeatherAlert } from '@/api/weatherAlerts/weather-alerts';
import { getWeatherAlertSeverityOrder, isSevereWeatherAlert } from '@/components/weather-alerts/weather-alert-formatters';
import { getWeatherAlertIdentity } from '@/components/weather-alerts/weather-alert-list-utils';
import { logger } from '@/lib/logging';
import type { WeatherAlertResultData } from '@/models/v4/weatherAlerts/weatherAlertResultData';
import type { WeatherAlertSettingsData } from '@/models/v4/weatherAlerts/weatherAlertSettingsData';
import type { ApiResponse } from '@/types/api';

interface WeatherAlertsState {
  alerts: WeatherAlertResultData[];
  isLoading: boolean;
  error: string | null;
  selectedAlert: WeatherAlertResultData | null;
  isLoadingDetail: boolean;
  settings: WeatherAlertSettingsData | null;
  nearbyAlerts: WeatherAlertResultData[];
  isLoadingNearby: boolean;
  lastWeatherAlertTimestamp: number;

  fetchActiveAlerts: () => Promise<void>;
  fetchAlertDetail: (alertId: string) => Promise<void>;
  selectAlertByIdentity: (identity: string) => WeatherAlertResultData | null;
  fetchNearbyAlerts: (lat: number, lng: number, radiusMiles?: number) => Promise<void>;
  fetchSettings: () => Promise<void>;
  handleAlertReceived: (alertId: string) => Promise<void>;
  handleAlertUpdated: (alertId: string) => Promise<void>;
  handleAlertExpired: (alertId: string) => void;
  getSevereAlerts: () => WeatherAlertResultData[];
  reset: () => void;
}

const sortAlerts = (alerts: WeatherAlertResultData[]): WeatherAlertResultData[] => {
  const sortedAlerts = [...alerts].sort((a, b) => {
    const severityDiff = getWeatherAlertSeverityOrder(a.Severity) - getWeatherAlertSeverityOrder(b.Severity);
    if (severityDiff !== 0) return severityDiff;
    return new Date(b.CreatedOnUtc).getTime() - new Date(a.CreatedOnUtc).getTime();
  });

  const seenAlertIds = new Set<string>();

  return sortedAlerts.filter((alert) => {
    const identity = getWeatherAlertIdentity(alert);

    if (identity.length === 0) {
      return true;
    }

    if (seenAlertIds.has(identity)) {
      return false;
    }

    seenAlertIds.add(identity);
    return true;
  });
};

export const useWeatherAlertsStore = create<WeatherAlertsState>((set, get) => ({
  alerts: [],
  isLoading: false,
  error: null,
  selectedAlert: null,
  isLoadingDetail: false,
  settings: null,
  nearbyAlerts: [],
  isLoadingNearby: false,
  lastWeatherAlertTimestamp: 0,

  fetchActiveAlerts: async () => {
    set({ isLoading: true, error: null });
    try {
      const result = (await getActiveAlerts()) as ApiResponse<WeatherAlertResultData[]>;
      const alerts = sortAlerts(result.Data ?? []);
      set({ alerts, isLoading: false });
    } catch (error) {
      logger.error({
        message: 'Failed to fetch active weather alerts',
        context: { error },
      });
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch weather alerts',
        isLoading: false,
      });
    }
  },

  fetchAlertDetail: async (alertId: string) => {
    set({ isLoadingDetail: true });
    try {
      const result = (await getWeatherAlert(alertId)) as ApiResponse<WeatherAlertResultData>;
      set({ selectedAlert: result.Data ?? null, isLoadingDetail: false });
    } catch (error) {
      logger.error({
        message: 'Failed to fetch weather alert detail',
        context: { error, alertId },
      });
      set({ isLoadingDetail: false });
    }
  },

  fetchNearbyAlerts: async (lat: number, lng: number, radiusMiles?: number) => {
    set({ isLoadingNearby: true });
    try {
      const result = (await getAlertsNearLocation(lat, lng, radiusMiles)) as ApiResponse<WeatherAlertResultData[]>;
      const alerts = sortAlerts(result.Data ?? []);
      set({ nearbyAlerts: alerts, isLoadingNearby: false });
    } catch (error) {
      logger.error({
        message: 'Failed to fetch nearby weather alerts',
        context: { error },
      });
      set({ isLoadingNearby: false });
    }
  },

  fetchSettings: async () => {
    try {
      const result = (await getSettings()) as ApiResponse<WeatherAlertSettingsData>;
      set({ settings: result.Data ?? null });
    } catch (error) {
      logger.error({
        message: 'Failed to fetch weather alert settings',
        context: { error },
      });
    }
  },

  handleAlertReceived: async (alertId: string) => {
    try {
      const result = (await getWeatherAlert(alertId)) as ApiResponse<WeatherAlertResultData>;
      const newAlert = result.Data;
      if (newAlert) {
        set((state) => ({
          alerts: sortAlerts([newAlert, ...state.alerts]),
          lastWeatherAlertTimestamp: Date.now(),
        }));
      }
    } catch (error) {
      logger.error({
        message: 'Failed to handle weather alert received',
        context: { error, alertId },
      });
    }
  },

  handleAlertUpdated: async (alertId: string) => {
    try {
      const result = (await getWeatherAlert(alertId)) as ApiResponse<WeatherAlertResultData>;
      const updatedAlert = result.Data;
      if (updatedAlert) {
        set((state) => ({
          alerts: sortAlerts(state.alerts.map((a) => (a.AlertId === alertId ? updatedAlert : a))),
          lastWeatherAlertTimestamp: Date.now(),
        }));
      }
    } catch (error) {
      logger.error({
        message: 'Failed to handle weather alert updated',
        context: { error, alertId },
      });
    }
  },

  handleAlertExpired: (alertId: string) => {
    set((state) => ({
      alerts: state.alerts.filter((a) => a.AlertId !== alertId),
      lastWeatherAlertTimestamp: Date.now(),
    }));
  },

  getSevereAlerts: () => {
    const { alerts } = get();
    return alerts.filter((alert) => isSevereWeatherAlert(alert.Severity));
  },

  selectAlertByIdentity: (identity: string) => {
    const normalizedIdentity = identity.trim();
    if (normalizedIdentity.length === 0) {
      set({ selectedAlert: null });
      return null;
    }

    const matchedAlert = get().alerts.find((alert) => getWeatherAlertIdentity(alert) === normalizedIdentity) ?? null;
    set({ selectedAlert: matchedAlert, isLoadingDetail: false });
    return matchedAlert;
  },

  reset: () => {
    set({
      alerts: [],
      isLoading: false,
      error: null,
      selectedAlert: null,
      isLoadingDetail: false,
      settings: null,
      nearbyAlerts: [],
      isLoadingNearby: false,
      lastWeatherAlertTimestamp: 0,
    });
  },
}));
