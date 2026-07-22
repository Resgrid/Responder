import { logger } from '@/lib/logging';

import { getActiveAlerts, getAlertsNearLocation, getSettings, getWeatherAlert } from '../weather-alerts';

// The get mock is created inside the factory: the module under test builds its endpoints at
// import time, before any test-file const would be initialized.
jest.mock('../../common/client', () => {
  const get = jest.fn();
  return {
    createApiEndpoint: jest.fn(() => ({ get })),
    __mockGet: get,
  };
});

const { __mockGet: mockGet } = jest.requireMock('../../common/client') as { __mockGet: jest.Mock };

jest.mock('@/lib/logging', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('weather-alerts api', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getWeatherAlert', () => {
    it('returns the response data on success', async () => {
      const payload = { Data: { AlertId: '9012' } };
      mockGet.mockResolvedValueOnce({ data: payload });

      const result = await getWeatherAlert('9012');

      expect(result).toBe(payload);
    });

    it('logs with the alert id and throws an application-level error on failure', async () => {
      const networkError = new Error('Network Error');
      mockGet.mockRejectedValueOnce(networkError);

      await expect(getWeatherAlert('9012')).rejects.toThrow('Failed to fetch weather alert 9012');

      expect(logger.error).toHaveBeenCalledWith({
        message: 'Failed to fetch weather alert',
        context: { error: networkError, alertId: '9012' },
      });
    });

    it('preserves the original error as the cause', async () => {
      const networkError = new Error('Network Error');
      mockGet.mockRejectedValueOnce(networkError);

      await expect(getWeatherAlert('9012')).rejects.toMatchObject({ cause: networkError });
    });
  });

  describe('getActiveAlerts', () => {
    it('returns the response data on success', async () => {
      const payload = { Data: [] };
      mockGet.mockResolvedValueOnce({ data: payload });

      await expect(getActiveAlerts()).resolves.toBe(payload);
    });

    it('logs and throws an application-level error on failure', async () => {
      mockGet.mockRejectedValueOnce(new Error('Network Error'));

      await expect(getActiveAlerts()).rejects.toThrow('Failed to fetch active weather alerts');
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('getAlertsNearLocation', () => {
    it('passes the location parameters and returns the response data', async () => {
      const payload = { Data: [] };
      mockGet.mockResolvedValueOnce({ data: payload });

      await expect(getAlertsNearLocation(40.7, -74.0, 25)).resolves.toBe(payload);
      expect(mockGet).toHaveBeenCalledWith({ lat: 40.7, lng: -74.0, radiusMiles: 25 });
    });

    it('logs with the location context and throws an application-level error on failure', async () => {
      const networkError = new Error('Network Error');
      mockGet.mockRejectedValueOnce(networkError);

      await expect(getAlertsNearLocation(40.7, -74.0)).rejects.toThrow('Failed to fetch weather alerts near location');
      expect(logger.error).toHaveBeenCalledWith({
        message: 'Failed to fetch weather alerts near location',
        context: { error: networkError, lat: 40.7, lng: -74.0, radiusMiles: undefined },
      });
    });
  });

  describe('getSettings', () => {
    it('returns the response data on success', async () => {
      const payload = { Data: {} };
      mockGet.mockResolvedValueOnce({ data: payload });

      await expect(getSettings()).resolves.toBe(payload);
    });

    it('logs and throws an application-level error on failure', async () => {
      mockGet.mockRejectedValueOnce(new Error('Network Error'));

      await expect(getSettings()).rejects.toThrow('Failed to fetch weather alert settings');
      expect(logger.error).toHaveBeenCalled();
    });
  });
});
