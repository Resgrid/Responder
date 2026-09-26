import { create } from 'zustand';

import {
  assignToShiftDay,
  cancelShiftTrade,
  finishShiftTrade,
  getAllShifts,
  getMyShifts,
  getOnDutyPersonnel,
  getPendingApprovals,
  getShift,
  getShiftDay,
  getShiftDayPersonnelOptions,
  getShiftDaysForDateRange,
  getShiftTrades,
  getTodaysShifts,
  getTradeCandidates,
  removeFromShiftDay,
  requestShiftTrade,
  respondToShiftTrade,
  reviewShiftSignup,
  reviewShiftTrade,
  signupForShiftDay,
  withdrawFromShiftDay,
} from '@/api/shifts/shifts';
import { logger } from '@/lib/logging';
import { getMonthRange, getShiftRequestErrorCode, getShiftResponseErrorCode } from '@/lib/shift-utils';
import { registerStoreReset } from '@/lib/storage/clear-all-data';
import { type OnDutyPersonResultData } from '@/models/v4/shifts/onDutyPersonResultData';
import { type PendingShiftSignupResultData } from '@/models/v4/shifts/pendingShiftSignupResultData';
import { type ShiftActionResult } from '@/models/v4/shifts/shiftActionResult';
import { type ShiftDayResultData } from '@/models/v4/shifts/shiftDayResultData';
import { ShiftDayMyStatus, type ShiftErrorCode, ShiftTradeStatus, ShiftTradeUserState } from '@/models/v4/shifts/shiftEnums';
import { type ShiftPersonOptionResultData } from '@/models/v4/shifts/shiftPersonOptionResultData';
import { type ShiftResultData } from '@/models/v4/shifts/shiftResultData';
import { type ShiftTradeResultData } from '@/models/v4/shifts/shiftTradeResultData';

export type ShiftViewMode = 'today' | 'mine' | 'calendar' | 'trades' | 'approvals' | 'onduty';

export type ShiftMutationKind = 'signup' | 'withdraw' | 'request-trade' | 'respond-trade' | 'finish-trade' | 'cancel-trade' | 'review-signup' | 'review-trade' | 'assign' | 'remove';

/** What a mutation did. `errorCode` is the server `ErrorCode` (or `network` / `unknown`) when it failed. */
export interface ShiftActionOutcome {
  success: boolean;
  errorCode: ShiftErrorCode | null;
  approvalPending: boolean;
  id: string;
}

export interface ShiftCalendarRange {
  start: string;
  end: string;
  shiftId: string | null;
}

export interface ShiftFetchOptions {
  /** Refresh without flipping the loading flag (no spinner / pull-to-refresh flash). */
  silent?: boolean;
}

/** Lists a mutation can change; each is refetched after it succeeds. */
export type ShiftRefreshScope = 'today' | 'mine' | 'calendar' | 'trades' | 'approvals' | 'day' | 'onduty';

interface ShiftsDataState {
  shifts: ShiftResultData[];
  todaysShiftDays: ShiftDayResultData[];
  myShiftDays: ShiftDayResultData[];
  calendarDays: ShiftDayResultData[];
  calendarRange: ShiftCalendarRange | null;
  trades: ShiftTradeResultData[];
  pendingSignups: PendingShiftSignupResultData[];
  pendingTrades: ShiftTradeResultData[];
  /** Server-decided: the caller supervises at least one shift group. */
  isSupervisor: boolean;
  onDutyPersonnel: OnDutyPersonResultData[];
  tradeCandidates: ShiftPersonOptionResultData[];
  personnelOptions: ShiftPersonOptionResultData[];
  selectedShift: ShiftResultData | null;
  selectedShiftDay: ShiftDayResultData | null;

  currentView: ShiftViewMode;
  searchQuery: string;
  calendarShiftId: string | null;
  selectedDate: string | null;
  isShiftDetailsOpen: boolean;
  isShiftDayDetailsOpen: boolean;

  isLoading: boolean;
  isTodaysLoading: boolean;
  isMyShiftsLoading: boolean;
  isCalendarLoading: boolean;
  isTradesLoading: boolean;
  isApprovalsLoading: boolean;
  isOnDutyLoading: boolean;
  isShiftLoading: boolean;
  isShiftDayLoading: boolean;
  isCandidatesLoading: boolean;
  isPersonnelOptionsLoading: boolean;
  activeMutation: ShiftMutationKind | null;
  /** The id the running mutation acts on (day, sign-up or trade), so only that row shows a spinner. */
  activeMutationTargetId: string | null;

  error: string | null;
  lastErrorCode: ShiftErrorCode | null;
}

interface ShiftsActions {
  init: () => Promise<void>;
  fetchAllShifts: (options?: ShiftFetchOptions) => Promise<void>;
  fetchShift: (shiftId: string) => Promise<void>;
  fetchTodaysShifts: (options?: ShiftFetchOptions) => Promise<void>;
  fetchMyShifts: (options?: ShiftFetchOptions) => Promise<void>;
  fetchShiftDay: (shiftDayId: string, options?: ShiftFetchOptions) => Promise<void>;
  fetchShiftDaysForDateRange: (start: string, end: string, shiftId?: string | null, options?: ShiftFetchOptions) => Promise<void>;
  fetchShiftTrades: (options?: ShiftFetchOptions) => Promise<void>;
  fetchPendingApprovals: (options?: ShiftFetchOptions) => Promise<void>;
  fetchOnDutyPersonnel: (options?: ShiftFetchOptions) => Promise<void>;
  fetchTradeCandidates: (shiftDayId: string) => Promise<void>;
  fetchPersonnelOptions: (shiftDayId: string) => Promise<void>;
  refreshView: (view: ShiftViewMode, options?: ShiftFetchOptions) => Promise<void>;
  refreshAfterMutation: (scopes: ShiftRefreshScope[]) => Promise<void>;

  signupForShift: (shiftDayId: string, groupId: string) => Promise<ShiftActionOutcome>;
  withdrawFromShift: (shiftDayId: string, shiftSignupId: string) => Promise<ShiftActionOutcome>;
  requestTrade: (shiftDayId: string, userIds: string[], note: string) => Promise<ShiftActionOutcome>;
  respondToTrade: (tradeId: string, accept: boolean, note: string, offeredShiftSignupIds?: string[]) => Promise<ShiftActionOutcome>;
  finishTrade: (tradeId: string, acceptedUserId: string, targetShiftSignupId: string | null) => Promise<ShiftActionOutcome>;
  cancelTrade: (tradeId: string) => Promise<ShiftActionOutcome>;
  reviewSignup: (shiftSignupId: string, approve: boolean, note: string) => Promise<ShiftActionOutcome>;
  reviewTrade: (tradeId: string, approve: boolean, note: string) => Promise<ShiftActionOutcome>;
  assignToShiftDay: (shiftDayId: string, userId: string, groupId: string) => Promise<ShiftActionOutcome>;
  removeFromShiftDay: (shiftDayId: string, userId: string, note: string) => Promise<ShiftActionOutcome>;

  setCurrentView: (view: ShiftViewMode) => void;
  setSearchQuery: (query: string) => void;
  setCalendarShiftFilter: (shiftId: string | null) => Promise<void>;
  setSelectedDate: (date: string | null) => void;
  selectShift: (shift: ShiftResultData) => void;
  selectShiftDay: (shiftDay: ShiftDayResultData) => void;
  openShiftDay: (shiftDayId: string) => void;
  closeShiftDetails: () => void;
  closeShiftDayDetails: () => void;
  clearTradeCandidates: () => void;
  clearPersonnelOptions: () => void;
  clearError: () => void;
  reset: () => void;

  getShiftDaysForDate: (date: string) => ShiftDayResultData[];
}

export type ShiftsState = ShiftsDataState & ShiftsActions;

const initialState: ShiftsDataState = {
  shifts: [],
  todaysShiftDays: [],
  myShiftDays: [],
  calendarDays: [],
  calendarRange: null,
  trades: [],
  pendingSignups: [],
  pendingTrades: [],
  isSupervisor: false,
  onDutyPersonnel: [],
  tradeCandidates: [],
  personnelOptions: [],
  selectedShift: null,
  selectedShiftDay: null,

  currentView: 'today',
  searchQuery: '',
  calendarShiftId: null,
  selectedDate: null,
  isShiftDetailsOpen: false,
  isShiftDayDetailsOpen: false,

  isLoading: false,
  isTodaysLoading: false,
  isMyShiftsLoading: false,
  isCalendarLoading: false,
  isTradesLoading: false,
  isApprovalsLoading: false,
  isOnDutyLoading: false,
  isShiftLoading: false,
  isShiftDayLoading: false,
  isCandidatesLoading: false,
  isPersonnelOptionsLoading: false,
  activeMutation: null,
  activeMutationTargetId: null,

  error: null,
  lastErrorCode: null,
};

// v4 answers an empty list with `{ Data: [] | null, Status: 'not_found' }`, so never trust Data to be an array.
const asArray = <T>(value: T[] | null | undefined): T[] => (Array.isArray(value) ? value : []);

type DayPatch = Partial<Pick<ShiftDayResultData, 'SignedUp' | 'MyStatus' | 'MySignupId' | 'MyGroupId' | 'MyTradeId' | 'CanSignup'>>;

const patchDays = (days: ShiftDayResultData[], shiftDayId: string, patch: DayPatch): ShiftDayResultData[] => days.map((day) => (day.ShiftDayId === shiftDayId ? { ...day, ...patch } : day));

const replaceDay = (days: ShiftDayResultData[], fresh: ShiftDayResultData): ShiftDayResultData[] => days.map((day) => (day.ShiftDayId === fresh.ShiftDayId ? fresh : day));

// Monotonic tokens: a slow response for a range, day or candidate list the user has already
// moved away from must not overwrite the one they are looking at.
let calendarRequestToken = 0;
let candidatesRequestToken = 0;
let personnelOptionsRequestToken = 0;

export const useShiftsStore = create<ShiftsState>((set, get) => {
  /** Apply the same change to every list (and the open day) that shows this shift day. */
  const patchDayEverywhere = (shiftDayId: string, patch: DayPatch) => {
    set((state) => ({
      todaysShiftDays: patchDays(state.todaysShiftDays, shiftDayId, patch),
      myShiftDays: patchDays(state.myShiftDays, shiftDayId, patch),
      calendarDays: patchDays(state.calendarDays, shiftDayId, patch),
      selectedShiftDay: state.selectedShiftDay?.ShiftDayId === shiftDayId ? { ...state.selectedShiftDay, ...patch } : state.selectedShiftDay,
    }));
  };

  const runMutation = async (
    kind: ShiftMutationKind,
    targetId: string,
    call: () => Promise<ShiftActionResult>,
    scopes: ShiftRefreshScope[],
    applyInPlace: (outcome: ShiftActionOutcome) => void
  ): Promise<ShiftActionOutcome> => {
    set({ activeMutation: kind, activeMutationTargetId: targetId, lastErrorCode: null });

    let outcome: ShiftActionOutcome;
    try {
      const result = await call();
      const errorCode = getShiftResponseErrorCode(result);
      outcome = errorCode ? { success: false, errorCode, approvalPending: false, id: '' } : { success: true, errorCode: null, approvalPending: !!result?.ApprovalPending, id: result?.Id ?? '' };

      if (!outcome.success) {
        logger.warn({
          message: 'Shift action refused by the server',
          context: { kind, targetId, errorCode },
        });
      }
    } catch (error) {
      outcome = { success: false, errorCode: getShiftRequestErrorCode(error), approvalPending: false, id: '' };
      logger.error({
        message: 'Shift action failed',
        context: { kind, targetId, error },
      });
    }

    if (outcome.success) {
      // Show the change at once, then pull the authoritative copies of everything it touched.
      applyInPlace(outcome);
      set({ activeMutation: null, activeMutationTargetId: null, lastErrorCode: null });
      await get().refreshAfterMutation(scopes);
    } else {
      set({ activeMutation: null, activeMutationTargetId: null, lastErrorCode: outcome.errorCode });
    }

    return outcome;
  };

  return {
    ...initialState,

    init: async () => {
      // Today is what the screen opens on; approvals tell us whether to offer the supervisor views;
      // the shift list feeds the calendar filter. None depends on another.
      await Promise.all([get().fetchTodaysShifts(), get().fetchPendingApprovals({ silent: true }), get().fetchAllShifts({ silent: true })]);
    },

    fetchAllShifts: async (options) => {
      if (!options?.silent) {
        set({ isLoading: true, error: null });
      }
      try {
        const response = await getAllShifts();
        set({ shifts: asArray(response?.Data) });
      } catch (error) {
        set({ error: 'Failed to fetch shifts' });
        logger.error({ message: 'Failed to fetch all shifts', context: { error } });
      } finally {
        if (!options?.silent) {
          set({ isLoading: false });
        }
      }
    },

    fetchShift: async (shiftId) => {
      set({ isShiftLoading: true, error: null });
      try {
        const response = await getShift(shiftId);
        if (response?.Data && get().selectedShift?.ShiftId === shiftId) {
          set({ selectedShift: response.Data });
        }
      } catch (error) {
        set({ error: 'Failed to fetch shift details' });
        logger.error({ message: 'Failed to fetch shift', context: { error, shiftId } });
      } finally {
        set({ isShiftLoading: false });
      }
    },

    fetchTodaysShifts: async (options) => {
      if (!options?.silent) {
        set({ isTodaysLoading: true, error: null });
      }
      try {
        const response = await getTodaysShifts();
        set({ todaysShiftDays: asArray(response?.Data) });
      } catch (error) {
        set({ error: "Failed to fetch today's shifts" });
        logger.error({ message: "Failed to fetch today's shifts", context: { error } });
      } finally {
        if (!options?.silent) {
          set({ isTodaysLoading: false });
        }
      }
    },

    fetchMyShifts: async (options) => {
      if (!options?.silent) {
        set({ isMyShiftsLoading: true, error: null });
      }
      try {
        // Server defaults (today .. +30 days) are the window the requirement asks for.
        const response = await getMyShifts();
        set({ myShiftDays: asArray(response?.Data) });
      } catch (error) {
        set({ error: 'Failed to fetch your shifts' });
        logger.error({ message: 'Failed to fetch my shifts', context: { error } });
      } finally {
        if (!options?.silent) {
          set({ isMyShiftsLoading: false });
        }
      }
    },

    fetchShiftDay: async (shiftDayId, options) => {
      if (!options?.silent) {
        set({ isShiftDayLoading: true, error: null });
      }
      try {
        const response = await getShiftDay(shiftDayId);
        const fresh = response?.Data;
        if (fresh && fresh.ShiftDayId) {
          set((state) => {
            const isOpenDay = state.isShiftDayDetailsOpen && (state.selectedShiftDay === null || state.selectedShiftDay.ShiftDayId === shiftDayId);
            return {
              // Keep every list's copy of this day current, not only the sheet's.
              todaysShiftDays: replaceDay(state.todaysShiftDays, fresh),
              myShiftDays: replaceDay(state.myShiftDays, fresh),
              calendarDays: replaceDay(state.calendarDays, fresh),
              selectedShiftDay: isOpenDay ? fresh : state.selectedShiftDay,
            };
          });
        }
      } catch (error) {
        set({ error: 'Failed to fetch shift day details' });
        logger.error({ message: 'Failed to fetch shift day', context: { error, shiftDayId } });
      } finally {
        if (!options?.silent) {
          set({ isShiftDayLoading: false });
        }
      }
    },

    fetchShiftDaysForDateRange: async (start, end, shiftId = null, options) => {
      const token = ++calendarRequestToken;
      const range: ShiftCalendarRange = { start, end, shiftId: shiftId || null };
      set(options?.silent ? { calendarRange: range } : { calendarRange: range, isCalendarLoading: true, error: null });
      try {
        const response = await getShiftDaysForDateRange(start, end, range.shiftId ?? undefined);
        if (token === calendarRequestToken) {
          set({ calendarDays: asArray(response?.Data) });
        }
      } catch (error) {
        if (token === calendarRequestToken) {
          set({ error: 'Failed to fetch shift calendar' });
        }
        logger.error({ message: 'Failed to fetch shift days for date range', context: { error, start, end, shiftId } });
      } finally {
        if (token === calendarRequestToken && !options?.silent) {
          set({ isCalendarLoading: false });
        }
      }
    },

    fetchShiftTrades: async (options) => {
      if (!options?.silent) {
        set({ isTradesLoading: true, error: null });
      }
      try {
        const response = await getShiftTrades();
        set({ trades: asArray(response?.Data) });
      } catch (error) {
        set({ error: 'Failed to fetch shift trades' });
        logger.error({ message: 'Failed to fetch shift trades', context: { error } });
      } finally {
        if (!options?.silent) {
          set({ isTradesLoading: false });
        }
      }
    },

    fetchPendingApprovals: async (options) => {
      if (!options?.silent) {
        set({ isApprovalsLoading: true, error: null });
      }
      try {
        const response = await getPendingApprovals();
        const data = response?.Data;
        set({
          isSupervisor: !!data?.IsSupervisor,
          pendingSignups: asArray(data?.Signups),
          pendingTrades: asArray(data?.Trades),
        });
      } catch (error) {
        // Leave isSupervisor as it was: a dropped request is not the server saying "no".
        set({ error: 'Failed to fetch pending approvals' });
        logger.error({ message: 'Failed to fetch pending shift approvals', context: { error } });
      } finally {
        if (!options?.silent) {
          set({ isApprovalsLoading: false });
        }
      }
    },

    fetchOnDutyPersonnel: async (options) => {
      if (!options?.silent) {
        set({ isOnDutyLoading: true, error: null });
      }
      try {
        const response = await getOnDutyPersonnel();
        set({ onDutyPersonnel: asArray(response?.Data) });
      } catch (error) {
        set({ error: 'Failed to fetch on-duty personnel' });
        logger.error({ message: 'Failed to fetch on-duty personnel', context: { error } });
      } finally {
        if (!options?.silent) {
          set({ isOnDutyLoading: false });
        }
      }
    },

    fetchTradeCandidates: async (shiftDayId) => {
      const token = ++candidatesRequestToken;
      set({ isCandidatesLoading: true, tradeCandidates: [] });
      try {
        const response = await getTradeCandidates(shiftDayId);
        if (token === candidatesRequestToken) {
          set({ tradeCandidates: asArray(response?.Data) });
        }
      } catch (error) {
        logger.error({ message: 'Failed to fetch trade candidates', context: { error, shiftDayId } });
      } finally {
        if (token === candidatesRequestToken) {
          set({ isCandidatesLoading: false });
        }
      }
    },

    fetchPersonnelOptions: async (shiftDayId) => {
      const token = ++personnelOptionsRequestToken;
      set({ isPersonnelOptionsLoading: true, personnelOptions: [] });
      try {
        const response = await getShiftDayPersonnelOptions(shiftDayId);
        if (token === personnelOptionsRequestToken) {
          set({ personnelOptions: asArray(response?.Data) });
        }
      } catch (error) {
        logger.error({ message: 'Failed to fetch shift day personnel options', context: { error, shiftDayId } });
      } finally {
        if (token === personnelOptionsRequestToken) {
          set({ isPersonnelOptionsLoading: false });
        }
      }
    },

    refreshView: async (view, options) => {
      const state = get();
      switch (view) {
        case 'today':
          await state.fetchTodaysShifts(options);
          break;
        case 'mine':
          await state.fetchMyShifts(options);
          break;
        case 'calendar': {
          // First visit loads the current month; after that, the month the user is looking at.
          const range = state.calendarRange ?? { ...getMonthRange(new Date()), shiftId: state.calendarShiftId };
          const tasks: Promise<void>[] = [state.fetchShiftDaysForDateRange(range.start, range.end, range.shiftId, options)];
          if (state.shifts.length === 0) {
            tasks.push(state.fetchAllShifts({ silent: true }));
          }
          await Promise.all(tasks);
          break;
        }
        case 'trades':
          // My upcoming sign-ups are what an accepted trade can offer back.
          await Promise.all([state.fetchShiftTrades(options), state.fetchMyShifts({ silent: true })]);
          break;
        case 'approvals':
          await state.fetchPendingApprovals(options);
          break;
        case 'onduty':
          await state.fetchOnDutyPersonnel(options);
          break;
      }
    },

    refreshAfterMutation: async (scopes) => {
      const state = get();
      const silent: ShiftFetchOptions = { silent: true };
      const tasks: Promise<void>[] = [];
      const wants = (scope: ShiftRefreshScope) => scopes.includes(scope);

      if (wants('today')) tasks.push(state.fetchTodaysShifts(silent));
      if (wants('mine')) tasks.push(state.fetchMyShifts(silent));
      if (wants('calendar') && state.calendarRange) tasks.push(state.fetchShiftDaysForDateRange(state.calendarRange.start, state.calendarRange.end, state.calendarRange.shiftId, silent));
      if (wants('trades')) tasks.push(state.fetchShiftTrades(silent));
      if (wants('approvals') && state.isSupervisor) tasks.push(state.fetchPendingApprovals(silent));
      if (wants('onduty') && state.isSupervisor) tasks.push(state.fetchOnDutyPersonnel(silent));
      if (wants('day') && state.isShiftDayDetailsOpen && state.selectedShiftDay) tasks.push(state.fetchShiftDay(state.selectedShiftDay.ShiftDayId, silent));

      await Promise.all(tasks);
    },

    signupForShift: (shiftDayId, groupId) =>
      runMutation(
        'signup',
        shiftDayId,
        () => signupForShiftDay(shiftDayId, groupId),
        ['today', 'mine', 'calendar', 'day', 'approvals', 'onduty'],
        (outcome) => {
          patchDayEverywhere(shiftDayId, {
            SignedUp: true,
            MyStatus: outcome.approvalPending ? ShiftDayMyStatus.PendingApproval : ShiftDayMyStatus.OnRoster,
            MySignupId: outcome.id,
            MyGroupId: groupId,
            CanSignup: false,
          });
        }
      ),

    withdrawFromShift: (shiftDayId, shiftSignupId) =>
      runMutation(
        'withdraw',
        shiftSignupId,
        () => withdrawFromShiftDay(shiftSignupId),
        ['today', 'mine', 'calendar', 'day', 'approvals', 'onduty', 'trades'],
        () => {
          patchDayEverywhere(shiftDayId, { SignedUp: false, MyStatus: ShiftDayMyStatus.None, MySignupId: '', MyGroupId: '', MyTradeId: '' });
          set((state) => ({
            myShiftDays: state.myShiftDays.filter((day) => day.ShiftDayId !== shiftDayId),
            selectedShiftDay:
              state.selectedShiftDay?.ShiftDayId === shiftDayId
                ? { ...state.selectedShiftDay, Roster: (state.selectedShiftDay.Roster ?? []).filter((entry) => entry.ShiftSignupId !== shiftSignupId) }
                : state.selectedShiftDay,
          }));
        }
      ),

    requestTrade: (shiftDayId, userIds, note) =>
      runMutation(
        'request-trade',
        shiftDayId,
        () => requestShiftTrade(shiftDayId, userIds, note),
        ['trades', 'mine', 'day'],
        (outcome) => {
          patchDayEverywhere(shiftDayId, { MyTradeId: outcome.id });
        }
      ),

    respondToTrade: (tradeId, accept, note, offeredShiftSignupIds = []) =>
      runMutation(
        'respond-trade',
        tradeId,
        () => respondToShiftTrade(tradeId, accept, note, offeredShiftSignupIds),
        ['trades'],
        () => {
          set((state) => ({
            trades: state.trades.map((trade) => (trade.ShiftSignupTradeId === tradeId ? { ...trade, MyState: accept ? ShiftTradeUserState.Proposed : ShiftTradeUserState.Declined } : trade)),
          }));
        }
      ),

    finishTrade: (tradeId, acceptedUserId, targetShiftSignupId) =>
      runMutation(
        'finish-trade',
        tradeId,
        () => finishShiftTrade(tradeId, acceptedUserId, targetShiftSignupId),
        ['trades', 'today', 'mine', 'calendar', 'day', 'approvals', 'onduty'],
        (outcome) => {
          set((state) => ({
            trades: state.trades.map((trade) =>
              trade.ShiftSignupTradeId === tradeId
                ? { ...trade, Status: outcome.approvalPending ? ShiftTradeStatus.PendingApproval : ShiftTradeStatus.Completed, AcceptedUserId: acceptedUserId, TargetShiftSignupId: targetShiftSignupId ?? '' }
                : trade
            ),
          }));
        }
      ),

    cancelTrade: (tradeId) =>
      runMutation(
        'cancel-trade',
        tradeId,
        () => cancelShiftTrade(tradeId),
        ['trades', 'mine', 'day', 'approvals'],
        () => {
          const clearTrade = (days: ShiftDayResultData[]) => days.map((day) => (day.MyTradeId === tradeId ? { ...day, MyTradeId: '' } : day));
          set((state) => ({
            trades: state.trades.map((trade) => (trade.ShiftSignupTradeId === tradeId ? { ...trade, Status: ShiftTradeStatus.Cancelled } : trade)),
            todaysShiftDays: clearTrade(state.todaysShiftDays),
            myShiftDays: clearTrade(state.myShiftDays),
            calendarDays: clearTrade(state.calendarDays),
            selectedShiftDay: state.selectedShiftDay?.MyTradeId === tradeId ? { ...state.selectedShiftDay, MyTradeId: '' } : state.selectedShiftDay,
          }));
        }
      ),

    reviewSignup: (shiftSignupId, approve, note) =>
      runMutation(
        'review-signup',
        shiftSignupId,
        () => reviewShiftSignup(shiftSignupId, approve, note),
        ['approvals', 'today', 'mine', 'calendar', 'day', 'onduty'],
        () => {
          set((state) => {
            const day = state.selectedShiftDay;
            const roster = day?.Roster ?? [];
            const nextRoster = approve ? roster.map((entry) => (entry.ShiftSignupId === shiftSignupId ? { ...entry, ApprovalPending: false } : entry)) : roster.filter((entry) => entry.ShiftSignupId !== shiftSignupId);
            return {
              pendingSignups: state.pendingSignups.filter((signup) => signup.ShiftSignupId !== shiftSignupId),
              selectedShiftDay: day ? { ...day, Roster: nextRoster } : day,
            };
          });
        }
      ),

    reviewTrade: (tradeId, approve, note) =>
      runMutation(
        'review-trade',
        tradeId,
        () => reviewShiftTrade(tradeId, approve, note),
        ['approvals', 'trades', 'today', 'mine', 'calendar', 'day', 'onduty'],
        () => {
          const nextStatus = approve ? ShiftTradeStatus.Completed : ShiftTradeStatus.Denied;
          set((state) => ({
            pendingTrades: state.pendingTrades.filter((trade) => trade.ShiftSignupTradeId !== tradeId),
            trades: state.trades.map((trade) => (trade.ShiftSignupTradeId === tradeId ? { ...trade, Status: nextStatus, CanReview: false } : trade)),
          }));
        }
      ),

    assignToShiftDay: (shiftDayId, userId, groupId) =>
      runMutation(
        'assign',
        shiftDayId,
        () => assignToShiftDay(shiftDayId, userId, groupId),
        ['day', 'today', 'mine', 'calendar', 'onduty'],
        () => {
          set((state) => ({ personnelOptions: state.personnelOptions.filter((option) => option.UserId !== userId) }));
        }
      ),

    removeFromShiftDay: (shiftDayId, userId, note) =>
      runMutation(
        'remove',
        shiftDayId,
        () => removeFromShiftDay(shiftDayId, userId, note),
        ['day', 'today', 'mine', 'calendar', 'onduty', 'approvals'],
        () => {
          set((state) => ({
            selectedShiftDay:
              state.selectedShiftDay?.ShiftDayId === shiftDayId ? { ...state.selectedShiftDay, Roster: (state.selectedShiftDay.Roster ?? []).filter((entry) => entry.UserId !== userId) } : state.selectedShiftDay,
          }));
        }
      ),

    setCurrentView: (view) => set({ currentView: view }),
    setSearchQuery: (query) => set({ searchQuery: query }),

    setCalendarShiftFilter: async (shiftId) => {
      set({ calendarShiftId: shiftId });
      const range = get().calendarRange ?? getMonthRange(new Date());
      await get().fetchShiftDaysForDateRange(range.start, range.end, shiftId);
    },

    setSelectedDate: (date) => set({ selectedDate: date }),

    selectShift: (shift) => set({ selectedShift: shift, isShiftDetailsOpen: true }),

    selectShiftDay: (shiftDay) => {
      // Light entries (calendar, my shifts) have no roster; show what we have and load the rest.
      // The shift sheet closes first so two bottom sheets are never stacked.
      set({ selectedShiftDay: shiftDay, isShiftDayDetailsOpen: true, isShiftDetailsOpen: false, tradeCandidates: [], personnelOptions: [] });
      void get().fetchShiftDay(shiftDay.ShiftDayId);
    },

    openShiftDay: (shiftDayId) => {
      set({ selectedShiftDay: null, isShiftDayDetailsOpen: true, isShiftDetailsOpen: false, tradeCandidates: [], personnelOptions: [] });
      void get().fetchShiftDay(shiftDayId);
    },

    closeShiftDetails: () => set({ isShiftDetailsOpen: false, selectedShift: null }),

    closeShiftDayDetails: () => set({ isShiftDayDetailsOpen: false, selectedShiftDay: null, tradeCandidates: [], personnelOptions: [] }),

    clearTradeCandidates: () => {
      candidatesRequestToken++;
      set({ tradeCandidates: [], isCandidatesLoading: false });
    },

    clearPersonnelOptions: () => {
      personnelOptionsRequestToken++;
      set({ personnelOptions: [], isPersonnelOptionsLoading: false });
    },

    clearError: () => set({ error: null, lastErrorCode: null }),

    reset: () => {
      calendarRequestToken++;
      candidatesRequestToken++;
      personnelOptionsRequestToken++;
      set({ ...initialState });
    },

    getShiftDaysForDate: (date) => get().calendarDays.filter((day) => (day.ShiftDay ?? '').startsWith(date)),
  };
});

// Signing out (or switching accounts) must not leave another person's roster, trades or approvals behind.
registerStoreReset('shifts', () => useShiftsStore.getState().reset());
