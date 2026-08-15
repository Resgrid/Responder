import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { act, renderHook } from '@testing-library/react-native';

import { FALLBACK_MAP_CENTER, getDepartmentMapCenter, useDepartmentMapCenter } from '@/lib/map-center';
import { type GetConfigResultData } from '@/models/v4/configs/getConfigResultData';
import { useCoreStore } from '@/stores/app/core-store';

jest.mock('@/stores/app/core-store', () => {
  const { create } = require('zustand');

  return { useCoreStore: create(() => ({ config: null })) };
});

const BASE_CONFIG: GetConfigResultData = {
  MapCenterLatitude: 0,
  MapCenterLongitude: 0,
  MapCenterZoomLevel: 0,
  W3WKey: '',
  GoogleMapsKey: '',
  LoggingKey: '',
  MapUrl: '',
  MapAttribution: '',
  OpenWeatherApiKey: '',
  NovuBackendApiUrl: '',
  NovuSocketUrl: '',
  NovuApplicationId: '',
  EventingUrl: '',
  DirectionsMapKey: '',
  PersonnelLocationStaleSeconds: 0,
  UnitLocationStaleSeconds: 0,
  PersonnelLocationMinMeters: 0,
  UnitLocationMinMeters: 0,
  AnalyticsApiKey: '',
  AnalyticsHost: '',
};

const setConfig = (center: Partial<GetConfigResultData>) => {
  useCoreStore.setState({ config: { ...BASE_CONFIG, ...center } });
};

describe('map center', () => {
  beforeEach(() => {
    useCoreStore.setState({ config: null });
  });

  describe('coordinates', () => {
    it('should fall back before config has loaded', () => {
      expect(getDepartmentMapCenter()).toEqual(FALLBACK_MAP_CENTER);
    });

    it('should keep a zero on a single axis', () => {
      // A zero latitude or longitude is an ordinary place, not an unset field.
      const cases = [
        { MapCenterLatitude: 0, MapCenterLongitude: -0.1278, MapCenterZoomLevel: 11 }, // equator
        { MapCenterLatitude: 51.4779, MapCenterLongitude: 0, MapCenterZoomLevel: 11 }, // prime meridian
        { MapCenterLatitude: 5.6037, MapCenterLongitude: 0, MapCenterZoomLevel: 11 }, // Accra
      ];

      for (const center of cases) {
        setConfig(center);

        expect(getDepartmentMapCenter()).toEqual({
          latitude: center.MapCenterLatitude,
          longitude: center.MapCenterLongitude,
          zoomLevel: center.MapCenterZoomLevel,
        });
      }
    });

    it('should fall back on the 0,0 pair', () => {
      setConfig({ MapCenterLatitude: 0, MapCenterLongitude: 0, MapCenterZoomLevel: 11 });

      expect(getDepartmentMapCenter()).toEqual(FALLBACK_MAP_CENTER);
    });

    it('should fall back on out-of-range coordinates', () => {
      const cases = [
        { MapCenterLatitude: 91, MapCenterLongitude: 4.3517 },
        { MapCenterLatitude: -90.5, MapCenterLongitude: 4.3517 },
        { MapCenterLatitude: 50.8503, MapCenterLongitude: 181 },
        { MapCenterLatitude: 50.8503, MapCenterLongitude: -180.1 },
        { MapCenterLatitude: Number.NaN, MapCenterLongitude: 4.3517 },
        { MapCenterLatitude: 50.8503, MapCenterLongitude: Number.POSITIVE_INFINITY },
      ];

      for (const center of cases) {
        setConfig({ ...center, MapCenterZoomLevel: 11 });

        expect(getDepartmentMapCenter()).toEqual(FALLBACK_MAP_CENTER);
      }
    });

    it('should accept the range boundaries', () => {
      setConfig({ MapCenterLatitude: -90, MapCenterLongitude: 180, MapCenterZoomLevel: 3 });

      expect(getDepartmentMapCenter()).toEqual({ latitude: -90, longitude: 180, zoomLevel: 3 });
    });
  });

  describe('zoom level', () => {
    it('should fall back on a non-finite or non-positive zoom while keeping the coordinates', () => {
      const cases = [Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NaN, 0, -4];

      for (const zoomLevel of cases) {
        setConfig({ MapCenterLatitude: 50.8503, MapCenterLongitude: 4.3517, MapCenterZoomLevel: zoomLevel });

        expect(getDepartmentMapCenter()).toEqual({
          latitude: 50.8503,
          longitude: 4.3517,
          zoomLevel: FALLBACK_MAP_CENTER.zoomLevel,
        });
      }
    });

    it('should keep a configured positive zoom', () => {
      setConfig({ MapCenterLatitude: 50.8503, MapCenterLongitude: 4.3517, MapCenterZoomLevel: 14 });

      expect(getDepartmentMapCenter().zoomLevel).toBe(14);
    });
  });

  describe('useDepartmentMapCenter', () => {
    it('should re-render with the department center when config lands', () => {
      const { result } = renderHook(() => useDepartmentMapCenter());

      expect(result.current).toEqual(FALLBACK_MAP_CENTER);

      // The store drives the re-render on its own — no rerender() needed, which is the point.
      act(() => {
        setConfig({ MapCenterLatitude: 50.8503, MapCenterLongitude: 4.3517, MapCenterZoomLevel: 12 });
      });

      expect(result.current).toEqual({ latitude: 50.8503, longitude: 4.3517, zoomLevel: 12 });
    });
  });
});
