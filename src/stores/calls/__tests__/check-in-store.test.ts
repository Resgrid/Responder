import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { act, renderHook, waitFor } from '@testing-library/react-native';

import { getCheckInHistory, getTimerStatuses, getTimersForCall, performCheckIn } from '@/api/calls/check-in-timers';
import { useCheckInStore } from '../check-in-store';

jest.mock('@/api/calls/check-in-timers');
jest.mock('@/lib/logging', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));
jest.mock('@/stores/app/location-store', () => ({
  useLocationStore: { getState: () => ({ latitude: 40.7128, longitude: -74.006 }) },
}));
jest.mock('@/stores/offline-queue/store', () => ({
  useOfflineQueueStore: { getState: () => ({ addEvent: jest.fn() }) },
}));

const mockGetTimerStatuses = getTimerStatuses as jest.MockedFunction<typeof getTimerStatuses>;
const mockGetTimersForCall = getTimersForCall as jest.MockedFunction<typeof getTimersForCall>;
const mockGetCheckInHistory = getCheckInHistory as jest.MockedFunction<typeof getCheckInHistory>;
const mockPerformCheckIn = performCheckIn as jest.MockedFunction<typeof performCheckIn>;

describe('useCheckInStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    useCheckInStore.getState().reset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('fetchTimerStatuses', () => {
    it('should fetch and sort timer statuses by severity', async () => {
      const mockStatuses = [
        { TargetEntityId: '1', TargetType: 0, TargetTypeName: 'Personnel', TargetName: 'A', UnitId: null, LastCheckIn: null, DurationMinutes: 20, WarningThresholdMinutes: 5, ElapsedMinutes: 5, Status: 'Ok' },
        { TargetEntityId: '3', TargetType: 0, TargetTypeName: 'Personnel', TargetName: 'C', UnitId: null, LastCheckIn: null, DurationMinutes: 20, WarningThresholdMinutes: 5, ElapsedMinutes: 25, Status: 'Overdue' },
        { TargetEntityId: '2', TargetType: 0, TargetTypeName: 'Personnel', TargetName: 'B', UnitId: null, LastCheckIn: null, DurationMinutes: 20, WarningThresholdMinutes: 5, ElapsedMinutes: 17, Status: 'Warning' },
      ];

      mockGetTimerStatuses.mockResolvedValue({ Data: mockStatuses } as any);

      const { result } = renderHook(() => useCheckInStore());

      await act(async () => {
        await result.current.fetchTimerStatuses(1);
      });

      await waitFor(() => {
        expect(result.current.timerStatuses).toHaveLength(3);
        expect(result.current.timerStatuses[0].Status).toBe('Overdue');
        expect(result.current.timerStatuses[1].Status).toBe('Warning');
        expect(result.current.timerStatuses[2].Status).toBe('Ok');
        expect(result.current.isLoadingStatuses).toBe(false);
      });
    });

    it('should handle fetch error', async () => {
      mockGetTimerStatuses.mockRejectedValue(new Error('API Error'));

      const { result } = renderHook(() => useCheckInStore());

      await act(async () => {
        await result.current.fetchTimerStatuses(1);
      });

      await waitFor(() => {
        expect(result.current.statusError).toBe('API Error');
        expect(result.current.isLoadingStatuses).toBe(false);
      });
    });
  });

  describe('performCheckIn', () => {
    it('should call API and re-fetch statuses on success', async () => {
      mockPerformCheckIn.mockResolvedValue({ Data: 'ok' } as any);
      mockGetTimerStatuses.mockResolvedValue({ Data: [] } as any);

      const { result } = renderHook(() => useCheckInStore());

      let success = false;
      await act(async () => {
        success = await result.current.performCheckIn({
          CallId: 1,
          CheckInType: 0,
        });
      });

      expect(success).toBe(true);
      expect(mockPerformCheckIn).toHaveBeenCalledTimes(1);
      expect(mockGetTimerStatuses).toHaveBeenCalledWith(1);
    });

    it('should queue offline on failure', async () => {
      mockPerformCheckIn.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useCheckInStore());

      let success = false;
      await act(async () => {
        success = await result.current.performCheckIn({
          CallId: 1,
          CheckInType: 0,
        });
      });

      expect(success).toBe(false);
      expect(result.current.checkInError).toBe('Network error');
    });
  });

  describe('startPolling/stopPolling', () => {
    it('should start and stop polling interval', () => {
      mockGetTimerStatuses.mockResolvedValue({ Data: [] } as any);

      const { result } = renderHook(() => useCheckInStore());

      act(() => {
        result.current.startPolling(1, 5000);
      });

      expect(result.current._pollingInterval).not.toBeNull();

      act(() => {
        result.current.stopPolling();
      });

      expect(result.current._pollingInterval).toBeNull();
    });
  });

  describe('reset', () => {
    it('should clear all state', async () => {
      mockGetTimerStatuses.mockResolvedValue({
        Data: [{ TargetEntityId: '1', Status: 'Ok', TargetType: 0, TargetTypeName: '', TargetName: '', UnitId: null, LastCheckIn: null, DurationMinutes: 20, WarningThresholdMinutes: 5, ElapsedMinutes: 5 }],
      } as any);

      const { result } = renderHook(() => useCheckInStore());

      await act(async () => {
        await result.current.fetchTimerStatuses(1);
      });

      expect(result.current.timerStatuses).toHaveLength(1);

      act(() => {
        result.current.reset();
      });

      expect(result.current.timerStatuses).toHaveLength(0);
      expect(result.current.isLoadingStatuses).toBe(false);
      expect(result.current.statusError).toBeNull();
    });
  });
});
