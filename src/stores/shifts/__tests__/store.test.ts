jest.mock('@/api/shifts/shifts', () => ({
  getAllShifts: jest.fn(),
  getShift: jest.fn(),
  getTodaysShifts: jest.fn(),
  getShiftDay: jest.fn(),
  getShiftDaysForDateRange: jest.fn(),
  getMyShifts: jest.fn(),
  signupForShiftDay: jest.fn(),
  withdrawFromShiftDay: jest.fn(),
  getShiftTrades: jest.fn(),
  getTradeCandidates: jest.fn(),
  requestShiftTrade: jest.fn(),
  respondToShiftTrade: jest.fn(),
  finishShiftTrade: jest.fn(),
  cancelShiftTrade: jest.fn(),
  getPendingApprovals: jest.fn(),
  reviewShiftSignup: jest.fn(),
  reviewShiftTrade: jest.fn(),
  getShiftDayPersonnelOptions: jest.fn(),
  assignToShiftDay: jest.fn(),
  removeFromShiftDay: jest.fn(),
  getOnDutyPersonnel: jest.fn(),
}));
jest.mock('@/lib/logging', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } }));
jest.mock('@/lib/storage/clear-all-data', () => ({ registerStoreReset: jest.fn() }));

import * as shiftsApi from '@/api/shifts/shifts';
import { registerStoreReset } from '@/lib/storage/clear-all-data';
import { ShiftDayResultData, ShiftDayRosterResultData } from '@/models/v4/shifts/shiftDayResultData';
import { ShiftDayMyStatus, ShiftTradeStatus, ShiftTradeUserState } from '@/models/v4/shifts/shiftEnums';
import { ShiftTradeResultData } from '@/models/v4/shifts/shiftTradeResultData';

import { useShiftsStore } from '../store';

// The mocked API is loosely typed on purpose: these tests hand back partial payloads.
const api = shiftsApi as unknown as Record<keyof typeof shiftsApi, jest.Mock>;
// Captured before any clearAllMocks: the store registers itself once, at import.
const registerCalls = [...(registerStoreReset as jest.Mock).mock.calls];

const envelope = { PageSize: 0, Timestamp: '', Version: '', Node: '', RequestId: '', Environment: '' };
const list = <T,>(Data: T[], Status = 'success') => ({ ...envelope, Status, Data });
const single = <T,>(Data: T, Status = 'success') => ({ ...envelope, Status, Data });
const action = (overrides: Partial<{ Id: string; ApprovalPending: boolean; ErrorCode: string; Status: string }> = {}) => ({ ...envelope, Id: '', ApprovalPending: false, ErrorCode: '', Status: 'success', ...overrides });
const never = () => new Promise<never>(() => undefined);

const makeDay = (overrides: Partial<ShiftDayResultData> = {}): ShiftDayResultData => ({
  ...new ShiftDayResultData(),
  ShiftId: '1',
  ShiftName: 'PMRT Night',
  ShiftDayId: '100',
  ShiftDay: '2026-09-24T00:00:00',
  Start: '2026-09-24T19:00:00',
  End: '2026-09-25T07:00:00',
  ShiftType: 1,
  CanSignup: true,
  OpenSlots: 2,
  ...overrides,
});

const makeRoster = (overrides: Partial<ShiftDayRosterResultData> = {}): ShiftDayRosterResultData => ({ ...new ShiftDayRosterResultData(), UserId: 'user-2', Name: 'Sam Lee', GroupId: '3', GroupName: 'North', ...overrides });

const makeTrade = (overrides: Partial<ShiftTradeResultData> = {}): ShiftTradeResultData => ({ ...new ShiftTradeResultData(), ShiftSignupTradeId: '5', ShiftDayId: '100', ShiftName: 'PMRT Night', ...overrides });

const flush = async () => {
  for (let i = 0; i < 10; i += 1) {
    await Promise.resolve();
  }
};

describe('useShiftsStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useShiftsStore.getState().reset();

    api.getTodaysShifts.mockResolvedValue(list([]));
    api.getMyShifts.mockResolvedValue(list([]));
    api.getShiftDaysForDateRange.mockResolvedValue(list([]));
    api.getShiftTrades.mockResolvedValue(list([]));
    api.getPendingApprovals.mockResolvedValue(single({ IsSupervisor: false, Signups: [], Trades: [] }));
    api.getOnDutyPersonnel.mockResolvedValue(list([]));
    api.getAllShifts.mockResolvedValue(list([]));
    api.getShiftDay.mockResolvedValue(single(makeDay()));
  });

  it('registers a reset so signing out clears shift data', () => {
    expect(registerCalls).toEqual([['shifts', expect.any(Function)]]);
  });

  describe('reads', () => {
    it('loads today and clears the loading flag', async () => {
      api.getTodaysShifts.mockResolvedValue(list([makeDay()]));
      const pending = useShiftsStore.getState().fetchTodaysShifts();
      expect(useShiftsStore.getState().isTodaysLoading).toBe(true);
      await pending;
      expect(useShiftsStore.getState().todaysShiftDays).toHaveLength(1);
      expect(useShiftsStore.getState().isTodaysLoading).toBe(false);
    });

    it('treats a not_found answer with null Data as an empty list', async () => {
      api.getTodaysShifts.mockResolvedValue({ ...envelope, Status: 'not_found', Data: null });
      await useShiftsStore.getState().fetchTodaysShifts();
      expect(useShiftsStore.getState().todaysShiftDays).toEqual([]);
    });

    it('records an error when today fails', async () => {
      api.getTodaysShifts.mockRejectedValue(new Error('boom'));
      await useShiftsStore.getState().fetchTodaysShifts();
      expect(useShiftsStore.getState().error).toBe("Failed to fetch today's shifts");
      expect(useShiftsStore.getState().isTodaysLoading).toBe(false);
    });

    it('a silent refresh does not flip the loading flag', async () => {
      const pending = useShiftsStore.getState().fetchMyShifts({ silent: true });
      expect(useShiftsStore.getState().isMyShiftsLoading).toBe(false);
      await pending;
      expect(api.getMyShifts).toHaveBeenCalledWith();
    });

    it('loads a calendar range and remembers it', async () => {
      api.getShiftDaysForDateRange.mockResolvedValue(list([makeDay()]));
      await useShiftsStore.getState().fetchShiftDaysForDateRange('2026-09-01', '2026-09-30', '1');
      expect(api.getShiftDaysForDateRange).toHaveBeenCalledWith('2026-09-01', '2026-09-30', '1');
      expect(useShiftsStore.getState().calendarRange).toEqual({ start: '2026-09-01', end: '2026-09-30', shiftId: '1' });
      expect(useShiftsStore.getState().calendarDays).toHaveLength(1);
    });

    it('ignores a slow calendar response for a month the user already left', async () => {
      let resolveSeptember: (value: unknown) => void = () => undefined;
      api.getShiftDaysForDateRange.mockImplementationOnce(() => new Promise((resolve) => (resolveSeptember = resolve)));
      api.getShiftDaysForDateRange.mockResolvedValueOnce(list([makeDay({ ShiftDayId: 'october' })]));

      const september = useShiftsStore.getState().fetchShiftDaysForDateRange('2026-09-01', '2026-09-30');
      await useShiftsStore.getState().fetchShiftDaysForDateRange('2026-10-01', '2026-10-31');
      resolveSeptember(list([makeDay({ ShiftDayId: 'september' })]));
      await september;

      expect(useShiftsStore.getState().calendarDays.map((day) => day.ShiftDayId)).toEqual(['october']);
      expect(useShiftsStore.getState().calendarRange?.start).toBe('2026-10-01');
    });

    it('refreshView(calendar) loads the current month on first visit', async () => {
      await useShiftsStore.getState().refreshView('calendar');
      const [start, end, shiftId] = api.getShiftDaysForDateRange.mock.calls[0]!;
      expect(start).toMatch(/^\d{4}-\d{2}-01$/);
      expect(end).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(shiftId).toBeUndefined();
      expect(api.getAllShifts).toHaveBeenCalled();
    });

    it('refreshView(trades) also loads my shifts for swap-back offers', async () => {
      await useShiftsStore.getState().refreshView('trades');
      expect(api.getShiftTrades).toHaveBeenCalled();
      expect(api.getMyShifts).toHaveBeenCalled();
    });

    it('setCalendarShiftFilter refetches the visible month for that shift', async () => {
      useShiftsStore.setState({ calendarRange: { start: '2026-09-01', end: '2026-09-30', shiftId: null } });
      await useShiftsStore.getState().setCalendarShiftFilter('7');
      expect(useShiftsStore.getState().calendarShiftId).toBe('7');
      expect(api.getShiftDaysForDateRange).toHaveBeenCalledWith('2026-09-01', '2026-09-30', '7');
    });

    it('reads IsSupervisor and the pending lists from GetPendingApprovals', async () => {
      api.getPendingApprovals.mockResolvedValue(single({ IsSupervisor: true, Signups: [{ ShiftSignupId: '44' }], Trades: [makeTrade()] }));
      await useShiftsStore.getState().fetchPendingApprovals();
      const state = useShiftsStore.getState();
      expect(state.isSupervisor).toBe(true);
      expect(state.pendingSignups).toHaveLength(1);
      expect(state.pendingTrades).toHaveLength(1);
    });

    it('keeps isSupervisor when the approvals request fails', async () => {
      useShiftsStore.setState({ isSupervisor: true });
      api.getPendingApprovals.mockRejectedValue(new Error('offline'));
      await useShiftsStore.getState().fetchPendingApprovals();
      expect(useShiftsStore.getState().isSupervisor).toBe(true);
    });

    it('loads trades, on-duty personnel, trade candidates and personnel options', async () => {
      api.getShiftTrades.mockResolvedValue(list([makeTrade()]));
      api.getOnDutyPersonnel.mockResolvedValue(list([{ UserId: 'u', Name: 'Alex' }]));
      api.getTradeCandidates.mockResolvedValue(list([{ UserId: 'c1', Name: 'Casey' }]));
      api.getShiftDayPersonnelOptions.mockResolvedValue(list([{ UserId: 'p1', Name: 'Pat' }]));

      await useShiftsStore.getState().fetchShiftTrades();
      await useShiftsStore.getState().fetchOnDutyPersonnel();
      await useShiftsStore.getState().fetchTradeCandidates('100');
      await useShiftsStore.getState().fetchPersonnelOptions('100');

      const state = useShiftsStore.getState();
      expect(state.trades).toHaveLength(1);
      expect(state.onDutyPersonnel).toHaveLength(1);
      expect(state.tradeCandidates.map((c) => c.UserId)).toEqual(['c1']);
      expect(state.personnelOptions.map((p) => p.UserId)).toEqual(['p1']);
      expect(api.getTradeCandidates).toHaveBeenCalledWith('100');
      expect(api.getShiftDayPersonnelOptions).toHaveBeenCalledWith('100');
    });

    it('selectShiftDay shows the light entry at once and loads the full day into every list', async () => {
      const light = makeDay({ Roster: [] });
      const full = makeDay({ Roster: [makeRoster()], OpenSlots: 1 });
      api.getShiftDay.mockResolvedValue(single(full));
      useShiftsStore.setState({ myShiftDays: [light], calendarDays: [light] });

      useShiftsStore.getState().selectShiftDay(light);
      expect(useShiftsStore.getState().isShiftDayDetailsOpen).toBe(true);
      expect(useShiftsStore.getState().selectedShiftDay).toBe(light);

      await flush();
      const state = useShiftsStore.getState();
      expect(api.getShiftDay).toHaveBeenCalledWith('100');
      expect(state.selectedShiftDay?.Roster).toHaveLength(1);
      expect(state.myShiftDays[0]?.OpenSlots).toBe(1);
      expect(state.calendarDays[0]?.OpenSlots).toBe(1);
    });
  });

  describe('signupForShift', () => {
    beforeEach(() => {
      useShiftsStore.setState({ todaysShiftDays: [makeDay()], selectedShiftDay: makeDay(), isShiftDayDetailsOpen: true });
    });

    it('sends the chosen group, updates the day in place, then refreshes', async () => {
      api.signupForShiftDay.mockResolvedValue(action({ Id: '900', Status: 'created' }));
      api.getTodaysShifts.mockImplementation(never);
      api.getShiftDay.mockImplementation(never);

      void useShiftsStore.getState().signupForShift('100', '3');
      await flush();

      expect(api.signupForShiftDay).toHaveBeenCalledWith('100', '3');
      expect(useShiftsStore.getState().todaysShiftDays[0]).toMatchObject({ SignedUp: true, MyStatus: ShiftDayMyStatus.OnRoster, MySignupId: '900', MyGroupId: '3', CanSignup: false });
      expect(api.getTodaysShifts).toHaveBeenCalled();
      expect(api.getMyShifts).toHaveBeenCalled();
      expect(api.getShiftDay).toHaveBeenCalledWith('100');
      expect(useShiftsStore.getState().activeMutation).toBeNull();
    });

    it('resolves a success outcome once the refresh settles', async () => {
      api.signupForShiftDay.mockResolvedValue(action({ Id: '900', Status: 'created' }));
      const outcome = await useShiftsStore.getState().signupForShift('100', '3');
      expect(outcome).toEqual({ success: true, errorCode: null, approvalPending: false, id: '900' });
    });

    it('marks the day pending approval when the server says so', async () => {
      api.signupForShiftDay.mockResolvedValue(action({ Id: '901', ApprovalPending: true, Status: 'created' }));
      api.getTodaysShifts.mockImplementation(never);
      api.getShiftDay.mockImplementation(never);

      void useShiftsStore.getState().signupForShift('100', '3');
      await flush();

      expect(useShiftsStore.getState().todaysShiftDays[0]?.MyStatus).toBe(ShiftDayMyStatus.PendingApproval);
      expect(useShiftsStore.getState().selectedShiftDay?.MyStatus).toBe(ShiftDayMyStatus.PendingApproval);
    });

    it('surfaces the server ErrorCode and does not touch the lists', async () => {
      api.signupForShiftDay.mockResolvedValue(action({ Status: 'failure', ErrorCode: 'invalid_group' }));

      const outcome = await useShiftsStore.getState().signupForShift('100', '999');

      expect(outcome).toEqual({ success: false, errorCode: 'invalid_group', approvalPending: false, id: '' });
      expect(useShiftsStore.getState().lastErrorCode).toBe('invalid_group');
      expect(useShiftsStore.getState().todaysShiftDays[0]?.SignedUp).toBe(false);
      expect(api.getTodaysShifts).not.toHaveBeenCalled();
    });

    it('reads an ErrorCode from a rejected request body', async () => {
      api.signupForShiftDay.mockRejectedValue({ response: { status: 400, data: { ErrorCode: 'day_in_past' } } });
      const outcome = await useShiftsStore.getState().signupForShift('100', '3');
      expect(outcome.errorCode).toBe('day_in_past');
    });

    it('reports network when there was no HTTP answer', async () => {
      api.signupForShiftDay.mockRejectedValue(new Error('Network Error'));
      const outcome = await useShiftsStore.getState().signupForShift('100', '3');
      expect(outcome).toMatchObject({ success: false, errorCode: 'network' });
      expect(useShiftsStore.getState().activeMutation).toBeNull();
    });
  });

  describe('withdrawFromShift', () => {
    it('clears my status, drops the day from my shifts and removes my roster row', async () => {
      const day = makeDay({ SignedUp: true, MyStatus: ShiftDayMyStatus.OnRoster, MySignupId: '900', Roster: [makeRoster({ UserId: 'me', ShiftSignupId: '900' }), makeRoster()] });
      useShiftsStore.setState({ myShiftDays: [day], todaysShiftDays: [day], selectedShiftDay: day, isShiftDayDetailsOpen: true });
      api.withdrawFromShiftDay.mockResolvedValue(action({ Status: 'deleted' }));
      api.getShiftDay.mockImplementation(never);
      api.getTodaysShifts.mockImplementation(never);
      api.getMyShifts.mockImplementation(never);

      void useShiftsStore.getState().withdrawFromShift('100', '900');
      await flush();

      const state = useShiftsStore.getState();
      expect(api.withdrawFromShiftDay).toHaveBeenCalledWith('900');
      expect(state.myShiftDays).toHaveLength(0);
      expect(state.todaysShiftDays[0]).toMatchObject({ SignedUp: false, MyStatus: ShiftDayMyStatus.None, MySignupId: '' });
      expect(state.selectedShiftDay?.Roster.map((entry) => entry.UserId)).toEqual(['user-2']);
    });

    it('surfaces day_in_past', async () => {
      api.withdrawFromShiftDay.mockResolvedValue(action({ Status: 'failure', ErrorCode: 'day_in_past' }));
      const outcome = await useShiftsStore.getState().withdrawFromShift('100', '900');
      expect(outcome.errorCode).toBe('day_in_past');
    });
  });

  describe('trades', () => {
    it('requestTrade records the trade on the day and refreshes trades', async () => {
      useShiftsStore.setState({ myShiftDays: [makeDay({ MyStatus: ShiftDayMyStatus.OnRoster })] });
      api.requestShiftTrade.mockResolvedValue(action({ Id: '5', Status: 'created' }));
      api.getShiftTrades.mockImplementation(never);
      api.getMyShifts.mockImplementation(never);

      void useShiftsStore.getState().requestTrade('100', ['c1', 'c2'], 'appointment');
      await flush();

      expect(api.requestShiftTrade).toHaveBeenCalledWith('100', ['c1', 'c2'], 'appointment');
      expect(useShiftsStore.getState().myShiftDays[0]?.MyTradeId).toBe('5');
      expect(api.getShiftTrades).toHaveBeenCalled();
    });

    it('requestTrade surfaces trade_exists', async () => {
      api.requestShiftTrade.mockResolvedValue(action({ Status: 'failure', ErrorCode: 'trade_exists' }));
      const outcome = await useShiftsStore.getState().requestTrade('100', ['c1'], '');
      expect(outcome.errorCode).toBe('trade_exists');
      expect(api.getShiftTrades).not.toHaveBeenCalled();
    });

    it('respondToTrade (accept with a swap-back) marks my state as proposed', async () => {
      useShiftsStore.setState({ trades: [makeTrade({ Direction: 1, MyState: ShiftTradeUserState.Open })] });
      api.respondToShiftTrade.mockResolvedValue(action({ Status: 'updated' }));
      api.getShiftTrades.mockImplementation(never);

      void useShiftsStore.getState().respondToTrade('5', true, 'can do', ['70']);
      await flush();

      expect(api.respondToShiftTrade).toHaveBeenCalledWith('5', true, 'can do', ['70']);
      expect(useShiftsStore.getState().trades[0]?.MyState).toBe(ShiftTradeUserState.Proposed);
    });

    it('respondToTrade (decline) marks my state as declined', async () => {
      useShiftsStore.setState({ trades: [makeTrade({ Direction: 1 })] });
      api.respondToShiftTrade.mockResolvedValue(action({ Status: 'updated' }));
      api.getShiftTrades.mockImplementation(never);

      void useShiftsStore.getState().respondToTrade('5', false, '');
      await flush();

      expect(api.respondToShiftTrade).toHaveBeenCalledWith('5', false, '', []);
      expect(useShiftsStore.getState().trades[0]?.MyState).toBe(ShiftTradeUserState.Declined);
    });

    it('respondToTrade surfaces invalid_offer', async () => {
      api.respondToShiftTrade.mockResolvedValue(action({ Status: 'failure', ErrorCode: 'invalid_offer' }));
      const outcome = await useShiftsStore.getState().respondToTrade('5', true, '', ['70']);
      expect(outcome.errorCode).toBe('invalid_offer');
    });

    it('finishTrade goes to pending approval when the server requires it', async () => {
      useShiftsStore.setState({ trades: [makeTrade()] });
      api.finishShiftTrade.mockResolvedValue(action({ Status: 'updated', ApprovalPending: true }));
      api.getShiftTrades.mockImplementation(never);

      void useShiftsStore.getState().finishTrade('5', 'c1', '70');
      await flush();

      expect(api.finishShiftTrade).toHaveBeenCalledWith('5', 'c1', '70');
      expect(useShiftsStore.getState().trades[0]).toMatchObject({ Status: ShiftTradeStatus.PendingApproval, AcceptedUserId: 'c1', TargetShiftSignupId: '70' });
    });

    it('finishTrade completes a straight give-away with no approval', async () => {
      useShiftsStore.setState({ trades: [makeTrade()] });
      api.finishShiftTrade.mockResolvedValue(action({ Status: 'updated' }));
      api.getShiftTrades.mockImplementation(never);

      void useShiftsStore.getState().finishTrade('5', 'c1', null);
      await flush();

      expect(api.finishShiftTrade).toHaveBeenCalledWith('5', 'c1', null);
      expect(useShiftsStore.getState().trades[0]?.Status).toBe(ShiftTradeStatus.Completed);
    });

    it('cancelTrade cancels it and clears the day marker', async () => {
      useShiftsStore.setState({ trades: [makeTrade()], myShiftDays: [makeDay({ MyTradeId: '5' })], selectedShiftDay: makeDay({ MyTradeId: '5' }) });
      api.cancelShiftTrade.mockResolvedValue(action({ Status: 'deleted' }));
      api.getShiftTrades.mockImplementation(never);
      api.getMyShifts.mockImplementation(never);

      void useShiftsStore.getState().cancelTrade('5');
      await flush();

      const state = useShiftsStore.getState();
      expect(api.cancelShiftTrade).toHaveBeenCalledWith('5');
      expect(state.trades[0]?.Status).toBe(ShiftTradeStatus.Cancelled);
      expect(state.myShiftDays[0]?.MyTradeId).toBe('');
      expect(state.selectedShiftDay?.MyTradeId).toBe('');
    });
  });

  describe('supervisor actions', () => {
    beforeEach(() => {
      useShiftsStore.setState({ isSupervisor: true });
    });

    it('reviewSignup (approve) removes it from pending, clears the pending flag and refreshes approvals', async () => {
      const day = makeDay({ Roster: [makeRoster({ ShiftSignupId: '44', ApprovalPending: true })] });
      useShiftsStore.setState({ pendingSignups: [{ ShiftSignupId: '44' } as never], selectedShiftDay: day });
      api.reviewShiftSignup.mockResolvedValue(action({ Status: 'updated' }));
      api.getPendingApprovals.mockImplementation(never);

      void useShiftsStore.getState().reviewSignup('44', true, 'welcome');
      await flush();

      const state = useShiftsStore.getState();
      expect(api.reviewShiftSignup).toHaveBeenCalledWith('44', true, 'welcome');
      expect(state.pendingSignups).toHaveLength(0);
      expect(state.selectedShiftDay?.Roster[0]?.ApprovalPending).toBe(false);
      expect(api.getPendingApprovals).toHaveBeenCalled();
    });

    it('reviewSignup (deny) drops the roster row', async () => {
      useShiftsStore.setState({ pendingSignups: [{ ShiftSignupId: '44' } as never], selectedShiftDay: makeDay({ Roster: [makeRoster({ ShiftSignupId: '44', ApprovalPending: true })] }) });
      api.reviewShiftSignup.mockResolvedValue(action({ Status: 'updated' }));
      api.getPendingApprovals.mockImplementation(never);

      void useShiftsStore.getState().reviewSignup('44', false, '');
      await flush();

      expect(api.reviewShiftSignup).toHaveBeenCalledWith('44', false, '');
      expect(useShiftsStore.getState().selectedShiftDay?.Roster).toHaveLength(0);
    });

    it('reviewSignup surfaces not_pending', async () => {
      api.reviewShiftSignup.mockResolvedValue(action({ Status: 'failure', ErrorCode: 'not_pending' }));
      const outcome = await useShiftsStore.getState().reviewSignup('44', true, '');
      expect(outcome.errorCode).toBe('not_pending');
    });

    it('reviewTrade removes it from pending and marks the trade', async () => {
      useShiftsStore.setState({ pendingTrades: [makeTrade({ CanReview: true, Status: ShiftTradeStatus.PendingApproval })], trades: [makeTrade({ CanReview: true, Status: ShiftTradeStatus.PendingApproval })] });
      api.reviewShiftTrade.mockResolvedValue(action({ Status: 'updated' }));
      api.getPendingApprovals.mockImplementation(never);
      api.getShiftTrades.mockImplementation(never);

      void useShiftsStore.getState().reviewTrade('5', false, 'no cover');
      await flush();

      const state = useShiftsStore.getState();
      expect(api.reviewShiftTrade).toHaveBeenCalledWith('5', false, 'no cover');
      expect(state.pendingTrades).toHaveLength(0);
      expect(state.trades[0]).toMatchObject({ Status: ShiftTradeStatus.Denied, CanReview: false });
    });

    it('assignToShiftDay removes the person from the options and reloads the open day', async () => {
      useShiftsStore.setState({ personnelOptions: [{ UserId: 'p1' } as never, { UserId: 'p2' } as never], selectedShiftDay: makeDay(), isShiftDayDetailsOpen: true });
      api.assignToShiftDay.mockResolvedValue(action({ Status: 'created' }));

      const outcome = await useShiftsStore.getState().assignToShiftDay('100', 'p1', '3');

      expect(api.assignToShiftDay).toHaveBeenCalledWith('100', 'p1', '3');
      expect(outcome.success).toBe(true);
      expect(useShiftsStore.getState().personnelOptions.map((p) => p.UserId)).toEqual(['p2']);
      expect(api.getShiftDay).toHaveBeenCalledWith('100');
      expect(api.getOnDutyPersonnel).toHaveBeenCalled();
    });

    it('assignToShiftDay surfaces already_on_roster', async () => {
      api.assignToShiftDay.mockResolvedValue(action({ Status: 'failure', ErrorCode: 'already_on_roster' }));
      const outcome = await useShiftsStore.getState().assignToShiftDay('100', 'p1', '3');
      expect(outcome.errorCode).toBe('already_on_roster');
    });

    it('removeFromShiftDay drops the person from the open day', async () => {
      useShiftsStore.setState({ selectedShiftDay: makeDay({ Roster: [makeRoster({ UserId: 'x' }), makeRoster()] }), isShiftDayDetailsOpen: true });
      api.removeFromShiftDay.mockResolvedValue(action({ Status: 'updated' }));
      api.getShiftDay.mockImplementation(never);

      void useShiftsStore.getState().removeFromShiftDay('100', 'x', 'sick');
      await flush();

      expect(api.removeFromShiftDay).toHaveBeenCalledWith('100', 'x', 'sick');
      expect(useShiftsStore.getState().selectedShiftDay?.Roster.map((entry) => entry.UserId)).toEqual(['user-2']);
    });

    it('removeFromShiftDay surfaces not_allowed', async () => {
      api.removeFromShiftDay.mockResolvedValue(action({ Status: 'failure', ErrorCode: 'not_allowed' }));
      const outcome = await useShiftsStore.getState().removeFromShiftDay('100', 'x', '');
      expect(outcome).toMatchObject({ success: false, errorCode: 'not_allowed' });
      expect(useShiftsStore.getState().lastErrorCode).toBe('not_allowed');
    });

    it('does not refresh supervisor lists for a non-supervisor', async () => {
      useShiftsStore.setState({ isSupervisor: false });
      await useShiftsStore.getState().refreshAfterMutation(['approvals', 'onduty']);
      expect(api.getPendingApprovals).not.toHaveBeenCalled();
      expect(api.getOnDutyPersonnel).not.toHaveBeenCalled();
    });
  });

  describe('ui state', () => {
    it('closeShiftDayDetails clears the day and pickers', () => {
      useShiftsStore.setState({ selectedShiftDay: makeDay(), isShiftDayDetailsOpen: true, tradeCandidates: [{ UserId: 'c' } as never] });
      useShiftsStore.getState().closeShiftDayDetails();
      const state = useShiftsStore.getState();
      expect(state.isShiftDayDetailsOpen).toBe(false);
      expect(state.selectedShiftDay).toBeNull();
      expect(state.tradeCandidates).toEqual([]);
    });

    it('openShiftDay loads a day by id', async () => {
      useShiftsStore.getState().openShiftDay('100');
      expect(useShiftsStore.getState().isShiftDayDetailsOpen).toBe(true);
      await flush();
      expect(useShiftsStore.getState().selectedShiftDay?.ShiftDayId).toBe('100');
    });

    it('getShiftDaysForDate filters the calendar days', () => {
      useShiftsStore.setState({ calendarDays: [makeDay(), makeDay({ ShiftDayId: '101', ShiftDay: '2026-09-25T00:00:00' })] });
      expect(useShiftsStore.getState().getShiftDaysForDate('2026-09-25').map((day) => day.ShiftDayId)).toEqual(['101']);
    });

    it('init loads today, approvals and the shift list', async () => {
      await useShiftsStore.getState().init();
      expect(api.getTodaysShifts).toHaveBeenCalled();
      expect(api.getPendingApprovals).toHaveBeenCalled();
      expect(api.getAllShifts).toHaveBeenCalled();
    });

    it('reset returns to the initial state', () => {
      useShiftsStore.setState({ isSupervisor: true, trades: [makeTrade()], currentView: 'trades' });
      useShiftsStore.getState().reset();
      const state = useShiftsStore.getState();
      expect(state.isSupervisor).toBe(false);
      expect(state.trades).toEqual([]);
      expect(state.currentView).toBe('today');
    });
  });
});
