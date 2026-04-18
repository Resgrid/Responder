import { useCallback, useEffect, useRef, useState } from 'react';

interface UseCheckInTimerParams {
  elapsedMinutes: number;
  durationMinutes: number;
  warningThresholdMinutes: number;
  status: string;
}

interface UseCheckInTimerReturn {
  remainingSeconds: number;
  progressPercent: number;
  isOverdue: boolean;
  isWarning: boolean;
  formattedTime: string;
  statusColor: string;
}

const STATUS_COLORS: Record<string, string> = {
  Ok: '#22C55E',
  Warning: '#F59E0B',
  Overdue: '#EF4444',
};

export function useCheckInTimer({ elapsedMinutes, durationMinutes, warningThresholdMinutes, status }: UseCheckInTimerParams): UseCheckInTimerReturn {
  const [tickOffset, setTickOffset] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setTickOffset(0);
    intervalRef.current = setInterval(() => {
      setTickOffset((prev) => prev + 1);
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [elapsedMinutes, durationMinutes, status]);

  const totalElapsedSeconds = elapsedMinutes * 60 + tickOffset;
  const totalDurationSeconds = durationMinutes * 60;
  const remainingSeconds = Math.max(0, totalDurationSeconds - totalElapsedSeconds);
  const progressPercent = totalDurationSeconds > 0 ? Math.min(100, (totalElapsedSeconds / totalDurationSeconds) * 100) : 0;

  const isOverdue = status === 'Overdue' || remainingSeconds === 0;
  const isWarning = status === 'Warning' || (!isOverdue && totalElapsedSeconds >= (durationMinutes - warningThresholdMinutes) * 60);

  const formatTime = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const computedStatus = isOverdue ? 'Overdue' : isWarning ? 'Warning' : 'Ok';
  const statusColor = STATUS_COLORS[computedStatus] ?? STATUS_COLORS.Ok;

  return {
    remainingSeconds,
    progressPercent,
    isOverdue,
    isWarning,
    formattedTime: formatTime(remainingSeconds),
    statusColor,
  };
}
