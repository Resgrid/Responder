import { router } from 'expo-router';

import { useWeatherAlertsStore } from '@/stores/weather-alerts/weather-alerts-store';

import { getWeatherAlertDetailPath, openWeatherAlertDetail } from '../weather-alert-navigation';

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
  },
}));

jest.mock('@/stores/weather-alerts/weather-alerts-store', () => ({
  useWeatherAlertsStore: {
    getState: jest.fn(),
  },
}));

describe('weather-alert-navigation', () => {
  const mockHandleAlertReceived = jest.fn(() => Promise.resolve());
  const mockPush = router.push as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    (useWeatherAlertsStore.getState as jest.Mock).mockReturnValue({
      handleAlertReceived: mockHandleAlertReceived,
    });
  });

  describe('getWeatherAlertDetailPath', () => {
    it('builds the detail path with the encoded alert identity', () => {
      expect(getWeatherAlertDetailPath('9012')).toBe('/(app)/weather-alerts/alert%3A9012');
    });
  });

  describe('openWeatherAlertDetail', () => {
    it('loads the alert into the store before navigating to the detail screen', async () => {
      const callOrder: string[] = [];
      mockHandleAlertReceived.mockImplementation(() => {
        callOrder.push('load');
        return Promise.resolve();
      });
      mockPush.mockImplementation(() => {
        callOrder.push('navigate');
      });

      await openWeatherAlertDetail('9012');

      expect(mockHandleAlertReceived).toHaveBeenCalledWith('9012');
      expect(mockPush).toHaveBeenCalledWith('/(app)/weather-alerts/alert%3A9012');
      expect(callOrder).toEqual(['load', 'navigate']);
    });

    it('throws immediately when navigation fails and no retries are requested', async () => {
      mockPush.mockImplementation(() => {
        throw new Error('router not mounted');
      });

      await expect(openWeatherAlertDetail('9012')).rejects.toThrow('router not mounted');
      expect(mockPush).toHaveBeenCalledTimes(1);
    });

    it('retries navigation until the router is ready', async () => {
      mockPush
        .mockImplementationOnce(() => {
          throw new Error('router not mounted');
        })
        .mockImplementationOnce(() => {
          throw new Error('router not mounted');
        })
        .mockImplementationOnce(() => undefined);

      // Global fake timers are enabled in jest-setup, so flush the retry delays manually.
      const promise = openWeatherAlertDetail('9012', { maxAttempts: 5, retryDelayMs: 1 });
      await jest.advanceTimersByTimeAsync(10);
      await promise;

      expect(mockPush).toHaveBeenCalledTimes(3);
      expect(mockPush).toHaveBeenLastCalledWith('/(app)/weather-alerts/alert%3A9012');
    });

    it('throws the last error once every attempt is exhausted', async () => {
      mockPush.mockImplementation(() => {
        throw new Error('router not mounted');
      });

      const promise = openWeatherAlertDetail('9012', { maxAttempts: 3, retryDelayMs: 1 });
      const assertion = expect(promise).rejects.toThrow('router not mounted');
      await jest.advanceTimersByTimeAsync(10);
      await assertion;

      expect(mockPush).toHaveBeenCalledTimes(3);
    });
  });
});
