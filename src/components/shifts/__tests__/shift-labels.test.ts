import { ShiftDayResultData } from '@/models/v4/shifts/shiftDayResultData';
import { ShiftAssignmentType, ShiftDayMyStatus } from '@/models/v4/shifts/shiftEnums';

import { canAddDayToCalendar, canRequestTradeForDay, getAssignmentTypeKey, getIneligibleReasonKey } from '../shift-labels';

const makeDay = (overrides: Partial<ShiftDayResultData> = {}): ShiftDayResultData => ({
  ...new ShiftDayResultData(),
  ShiftDayId: '100',
  Start: '2099-09-24T07:00:00',
  End: '2099-09-24T19:00:00',
  MyStatus: ShiftDayMyStatus.OnRoster,
  ...overrides,
});

describe('shift-labels', () => {
  it('names all three kinds of shift', () => {
    expect(getAssignmentTypeKey(ShiftAssignmentType.Assigned)).toBe('shifts.assignment_type.assigned');
    expect(getAssignmentTypeKey(ShiftAssignmentType.Signup)).toBe('shifts.assignment_type.signup');
    expect(getAssignmentTypeKey(ShiftAssignmentType.Workshift)).toBe('shifts.assignment_type.workshift');
  });

  it('offers a trade on a day I work, unless the server says otherwise', () => {
    expect(canRequestTradeForDay(makeDay())).toBe(true);
    expect(canRequestTradeForDay(makeDay({ CanTrade: false }))).toBe(false);
    expect(canRequestTradeForDay(makeDay({ MyTradeId: '5' }))).toBe(false);
    expect(canRequestTradeForDay(makeDay({ MyStatus: ShiftDayMyStatus.PendingApproval }))).toBe(false);
    expect(canRequestTradeForDay(makeDay({ End: '2000-01-01T19:00:00' }))).toBe(false);
  });

  it('only puts days I am confirmed on in the calendar', () => {
    expect(canAddDayToCalendar(makeDay())).toBe(true);
    expect(canAddDayToCalendar(makeDay({ MyStatus: ShiftDayMyStatus.PendingApproval }))).toBe(false);
    expect(canAddDayToCalendar(makeDay({ MyStatus: ShiftDayMyStatus.None }))).toBe(false);
    expect(canAddDayToCalendar(makeDay({ End: '2000-01-01T19:00:00' }))).toBe(false);
  });

  it('explains why someone cannot take a slot', () => {
    expect(getIneligibleReasonKey('')).toBeNull();
    expect(getIneligibleReasonKey(undefined)).toBeNull();
    expect(getIneligibleReasonKey('already_on_roster')).toBe('shifts.trade.ineligible.already_on_day');
    expect(getIneligibleReasonKey('not_eligible')).toBe('shifts.trade.ineligible.missing_roles');
    expect(getIneligibleReasonKey('not_allowed')).toBe('shifts.trade.ineligible.not_allowed');
  });
});
