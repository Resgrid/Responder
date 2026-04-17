import { create } from 'zustand';

import { getCheckInHistory, getTimersForCall, getTimerStatuses, performCheckIn, type PerformCheckInInput } from '@/api/calls/check-in-timers';
import { logger } from '@/lib/logging';
import { QueuedEventType } from '@/models/offline-queue/queued-event';
import { type CheckInRecordResultData } from '@/models/v4/checkIn/checkInRecordResultData';
import { type CheckInTimerStatusResultData } from '@/models/v4/checkIn/checkInTimerStatusResultData';
import { type ResolvedCheckInTimerResultData } from '@/models/v4/checkIn/resolvedCheckInTimerResultData';
import { useLocationStore } from '@/stores/app/location-store';
import { useOfflineQueueStore } from '@/stores/offline-queue/store';
import type { ApiResponse } from '@/types/api';

interface CallWithTimerFlag {
  CallId: string;
  CheckInTimersEnabled: boolean;
}

const STATUS_SEVERITY: Record<string, number> = {
  Overdue: 0,
  Warning: 1,
  Ok: 2,
};

interface CheckInState {
  timerStatuses: CheckInTimerStatusResultData[];
  resolvedTimers: ResolvedCheckInTimerResultData[];
  checkInHistory: CheckInRecordResultData[];
  isLoadingStatuses: boolean;
  isLoadingHistory: boolean;
  isCheckingIn: boolean;
  statusError: string | null;
  checkInError: string | null;
  _pollingInterval: ReturnType<typeof setInterval> | null;
  /** Aggregate overdue+warning count across all active calls — used by the home page summary. */
  globalOverdueCount: number;

  fetchTimerStatuses: (callId: number) => Promise<void>;
  fetchResolvedTimers: (callId: number) => Promise<void>;
  fetchCheckInHistory: (callId: number) => Promise<void>;
  performCheckIn: (input: PerformCheckInInput) => Promise<boolean>;
  startPolling: (callId: number, intervalMs?: number) => void;
  stopPolling: () => void;
  reset: () => void;
  /** Fetches timer statuses for every call with CheckInTimersEnabled and sets globalOverdueCount. */
  fetchGlobalOverdueCount: (calls: CallWithTimerFlag[]) => Promise<void>;
}

export const useCheckInStore = create<CheckInState>((set, get) => ({
  timerStatuses: [],
  resolvedTimers: [],
  checkInHistory: [],
  isLoadingStatuses: false,
  isLoadingHistory: false,
  isCheckingIn: false,
  statusError: null,
  checkInError: null,
  _pollingInterval: null,
  globalOverdueCount: 0,

  fetchTimerStatuses: async (callId: number) => {
    set({ isLoadingStatuses: true, statusError: null });
    try {
      const result = (await getTimerStatuses(callId)) as ApiResponse<CheckInTimerStatusResultData[]>;
      const statuses = result.Data ?? [];
      statuses.sort((a, b) => (STATUS_SEVERITY[a.Status] ?? 3) - (STATUS_SEVERITY[b.Status] ?? 3));
      set({ timerStatuses: statuses, isLoadingStatuses: false });
    } catch (error) {
      set({
        statusError: error instanceof Error ? error.message : 'Failed to fetch timer statuses',
        isLoadingStatuses: false,
      });
    }
  },

  fetchResolvedTimers: async (callId: number) => {
    try {
      const result = (await getTimersForCall(callId)) as ApiResponse<ResolvedCheckInTimerResultData[]>;
      set({ resolvedTimers: result.Data ?? [] });
    } catch (error) {
      logger.error({
        message: 'Failed to fetch resolved timers',
        context: { error, callId },
      });
    }
  },

  fetchCheckInHistory: async (callId: number) => {
    set({ isLoadingHistory: true });
    try {
      const result = (await getCheckInHistory(callId)) as ApiResponse<CheckInRecordResultData[]>;
      set({ checkInHistory: result.Data ?? [], isLoadingHistory: false });
    } catch (error) {
      set({
        checkInHistory: [],
        isLoadingHistory: false,
      });
    }
  },

  performCheckIn: async (input: PerformCheckInInput) => {
    set({ isCheckingIn: true, checkInError: null });

    const locationState = useLocationStore.getState();
    const enrichedInput: PerformCheckInInput = {
      ...input,
      Latitude: input.Latitude ?? locationState.latitude?.toString() ?? '',
      Longitude: input.Longitude ?? locationState.longitude?.toString() ?? '',
    };

    try {
      await performCheckIn(enrichedInput);
      set({ isCheckingIn: false });
      await get().fetchTimerStatuses(input.CallId);
      return true;
    } catch (error) {
      logger.warn({
        message: 'Check-in failed, queueing offline',
        context: { error, callId: input.CallId },
      });

      const offlineStore = useOfflineQueueStore.getState();
      offlineStore.addEvent(QueuedEventType.CHECK_IN, {
        callId: enrichedInput.CallId,
        checkInType: enrichedInput.CheckInType,
        unitId: enrichedInput.UnitId,
        latitude: enrichedInput.Latitude,
        longitude: enrichedInput.Longitude,
        note: enrichedInput.Note ?? '',
        timestamp: new Date().toISOString(),
      });

      set({
        isCheckingIn: false,
        checkInError: error instanceof Error ? error.message : 'Failed to check in',
      });
      return false;
    }
  },

  startPolling: (callId: number, intervalMs: number = 30000) => {
    const existing = get()._pollingInterval;
    if (existing) {
      clearInterval(existing);
    }
    const interval = setInterval(() => {
      get().fetchTimerStatuses(callId);
    }, intervalMs);
    set({ _pollingInterval: interval });
  },

  stopPolling: () => {
    const interval = get()._pollingInterval;
    if (interval) {
      clearInterval(interval);
      set({ _pollingInterval: null });
    }
  },

  reset: () => {
    const interval = get()._pollingInterval;
    if (interval) {
      clearInterval(interval);
    }
    set({
      timerStatuses: [],
      resolvedTimers: [],
      checkInHistory: [],
      isLoadingStatuses: false,
      isLoadingHistory: false,
      isCheckingIn: false,
      statusError: null,
      checkInError: null,
      _pollingInterval: null,
      globalOverdueCount: 0,
    });
  },

  fetchGlobalOverdueCount: async (calls: CallWithTimerFlag[]) => {
    const callsWithTimers = calls.filter((c) => c.CheckInTimersEnabled);
    if (callsWithTimers.length === 0) {
      set({ globalOverdueCount: 0 });
      return;
    }

    const counts = await Promise.all(
      callsWithTimers.map(async (call) => {
        try {
          const callId = parseInt(call.CallId, 10);
          const result = (await getTimerStatuses(callId)) as ApiResponse<CheckInTimerStatusResultData[]>;
          const statuses = result.Data ?? [];
          return statuses.filter((s) => s.Status === 'Overdue' || s.Status === 'Warning').length;
        } catch {
          return 0;
        }
      })
    );

    set({ globalOverdueCount: counts.reduce((acc, n) => acc + n, 0) });
  },
}));
