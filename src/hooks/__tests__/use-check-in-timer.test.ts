import { describe, expect, it, beforeEach } from '@jest/globals';
import { act, renderHook } from '@testing-library/react-native';

import { useCheckInTimer } from '../use-check-in-timer';

describe('useCheckInTimer', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('countdown calculation', () => {
    it('should calculate remaining time correctly', () => {
      const { result } = renderHook(() =>
        useCheckInTimer({
          elapsedMinutes: 5,
          durationMinutes: 20,
          warningThresholdMinutes: 5,
          status: 'Ok',
        })
      );

      expect(result.current.remainingSeconds).toBe(15 * 60);
      expect(result.current.progressPercent).toBeCloseTo(25);
      expect(result.current.isOverdue).toBe(false);
      expect(result.current.isWarning).toBe(false);
    });

    it('should count down with each tick', () => {
      const { result } = renderHook(() =>
        useCheckInTimer({
          elapsedMinutes: 5,
          durationMinutes: 20,
          warningThresholdMinutes: 5,
          status: 'Ok',
        })
      );

      const initialRemaining = result.current.remainingSeconds;

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(result.current.remainingSeconds).toBe(initialRemaining - 1);
    });

    it('should not go below zero', () => {
      const { result } = renderHook(() =>
        useCheckInTimer({
          elapsedMinutes: 21,
          durationMinutes: 20,
          warningThresholdMinutes: 5,
          status: 'Overdue',
        })
      );

      expect(result.current.remainingSeconds).toBe(0);
      expect(result.current.isOverdue).toBe(true);
    });
  });

  describe('status color mapping', () => {
    it('should return green for Ok status', () => {
      const { result } = renderHook(() =>
        useCheckInTimer({
          elapsedMinutes: 5,
          durationMinutes: 20,
          warningThresholdMinutes: 5,
          status: 'Ok',
        })
      );

      expect(result.current.statusColor).toBe('#22C55E');
    });

    it('should return yellow for Warning status', () => {
      const { result } = renderHook(() =>
        useCheckInTimer({
          elapsedMinutes: 17,
          durationMinutes: 20,
          warningThresholdMinutes: 5,
          status: 'Warning',
        })
      );

      expect(result.current.statusColor).toBe('#F59E0B');
    });

    it('should return red for Overdue status', () => {
      const { result } = renderHook(() =>
        useCheckInTimer({
          elapsedMinutes: 25,
          durationMinutes: 20,
          warningThresholdMinutes: 5,
          status: 'Overdue',
        })
      );

      expect(result.current.statusColor).toBe('#EF4444');
    });
  });

  describe('formatted time output', () => {
    it('should format time as mm:ss', () => {
      const { result } = renderHook(() =>
        useCheckInTimer({
          elapsedMinutes: 15,
          durationMinutes: 20,
          warningThresholdMinutes: 5,
          status: 'Ok',
        })
      );

      expect(result.current.formattedTime).toBe('5:00');
    });

    it('should pad seconds with leading zero', () => {
      const { result } = renderHook(() =>
        useCheckInTimer({
          elapsedMinutes: 19,
          durationMinutes: 20,
          warningThresholdMinutes: 5,
          status: 'Warning',
        })
      );

      // 1 minute remaining = 1:00
      expect(result.current.formattedTime).toBe('1:00');

      act(() => {
        jest.advanceTimersByTime(55000); // advance 55 seconds
      });

      expect(result.current.formattedTime).toBe('0:05');
    });
  });

  describe('progress percent', () => {
    it('should cap at 100%', () => {
      const { result } = renderHook(() =>
        useCheckInTimer({
          elapsedMinutes: 30,
          durationMinutes: 20,
          warningThresholdMinutes: 5,
          status: 'Overdue',
        })
      );

      expect(result.current.progressPercent).toBe(100);
    });

    it('should handle zero duration', () => {
      const { result } = renderHook(() =>
        useCheckInTimer({
          elapsedMinutes: 0,
          durationMinutes: 0,
          warningThresholdMinutes: 0,
          status: 'Ok',
        })
      );

      expect(result.current.progressPercent).toBe(0);
    });
  });
});
