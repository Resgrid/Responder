import { parseWallClock } from '@/lib/shift-utils';
import { type ShiftDayResultData, type ShiftDayRosterResultData } from '@/models/v4/shifts/shiftDayResultData';
import { ShiftAssignmentType, ShiftDayMyStatus, ShiftRosterSource, ShiftScheduleType, ShiftTradeStatus, ShiftTradeUserState } from '@/models/v4/shifts/shiftEnums';

export type BadgeAction = 'success' | 'warning' | 'error' | 'info' | 'muted';

export interface ShiftLabel {
  key: string;
  action: BadgeAction;
}

export const getAssignmentTypeKey = (assignmentType: number): string => {
  switch (assignmentType) {
    case ShiftAssignmentType.Assigned:
      return 'shifts.assignment_type.assigned';
    case ShiftAssignmentType.Signup:
      return 'shifts.assignment_type.signup';
    default:
      return 'shifts.unknown';
  }
};

export const getScheduleTypeKey = (scheduleType: number): string => {
  switch (scheduleType) {
    case ShiftScheduleType.Custom:
      return 'shifts.schedule_type.custom';
    case ShiftScheduleType.Manual:
      return 'shifts.schedule_type.manual';
    case ShiftScheduleType.TwentyFourFortyEight:
      return 'shifts.schedule_type.twenty_four_forty_eight';
    case ShiftScheduleType.TwentyFourSeventyTwo:
      return 'shifts.schedule_type.twenty_four_seventy_two';
    case ShiftScheduleType.FortyEightNinetySix:
      return 'shifts.schedule_type.forty_eight_ninety_six';
    default:
      return 'shifts.unknown';
  }
};

/**
 * Source 0 covers both the standing roster and a standing-roster member's own per-day slot (the
 * server creates one when they request a trade), so it reads as "Scheduled" either way.
 */
export const getRosterSourceLabel = (source: number): ShiftLabel => {
  switch (source) {
    case ShiftRosterSource.Signup:
      return { key: 'shifts.roster_source.signup', action: 'info' };
    case ShiftRosterSource.SupervisorAssigned:
      return { key: 'shifts.roster_source.supervisor', action: 'info' };
    case ShiftRosterSource.Trade:
      return { key: 'shifts.roster_source.trade', action: 'warning' };
    case ShiftRosterSource.Assigned:
    default:
      return { key: 'shifts.roster_source.scheduled', action: 'muted' };
  }
};

export const getMyStatusLabel = (myStatus: number): ShiftLabel | null => {
  switch (myStatus) {
    case ShiftDayMyStatus.OnRoster:
      return { key: 'shifts.status.on_roster', action: 'success' };
    case ShiftDayMyStatus.PendingApproval:
      return { key: 'shifts.status.pending_approval', action: 'warning' };
    case ShiftDayMyStatus.Denied:
      return { key: 'shifts.status.denied', action: 'error' };
    default:
      return null;
  }
};

export const getTradeStatusLabel = (status: number): ShiftLabel => {
  switch (status) {
    case ShiftTradeStatus.PendingApproval:
      return { key: 'shifts.trade.status.pending_approval', action: 'warning' };
    case ShiftTradeStatus.Completed:
      return { key: 'shifts.trade.status.completed', action: 'success' };
    case ShiftTradeStatus.Denied:
      return { key: 'shifts.trade.status.denied', action: 'error' };
    case ShiftTradeStatus.Cancelled:
      return { key: 'shifts.trade.status.cancelled', action: 'muted' };
    case ShiftTradeStatus.Open:
    default:
      return { key: 'shifts.trade.status.open', action: 'info' };
  }
};

export const getTradeMyStateKey = (state: number): string => {
  switch (state) {
    case ShiftTradeUserState.Filled:
      return 'shifts.trade.my_state.filled';
    case ShiftTradeUserState.Declined:
      return 'shifts.trade.my_state.declined';
    case ShiftTradeUserState.Accepted:
      return 'shifts.trade.my_state.accepted';
    case ShiftTradeUserState.Proposed:
      return 'shifts.trade.my_state.proposed';
    case ShiftTradeUserState.PendingApproval:
      return 'shifts.trade.my_state.pending_approval';
    case ShiftTradeUserState.Denied:
      return 'shifts.trade.my_state.denied';
    case ShiftTradeUserState.Open:
    default:
      return 'shifts.trade.my_state.open';
  }
};

/** The day has finished (by the device clock against the department wall-clock end). */
export const isShiftDayOver = (day: Pick<ShiftDayResultData, 'End' | 'IsActive'>, now: Date = new Date()): boolean => {
  if (day.IsActive) {
    return false;
  }
  const end = parseWallClock(day.End);
  return end !== null && end.getTime() <= now.getTime();
};

/** The caller's own roster entry for the day, when the full day (with Roster) is loaded. */
export const findMyRosterEntry = (day: ShiftDayResultData, userId: string | null | undefined): ShiftDayRosterResultData | undefined => {
  if (!userId) {
    return undefined;
  }
  return (day.Roster ?? []).find((entry) => entry.UserId === userId && (!day.MySignupId || entry.ShiftSignupId === day.MySignupId || entry.ShiftSignupId === ''));
};

/**
 * A sign-up the caller made themselves can be withdrawn. A standing-roster slot (Source 0, even
 * when the server created a per-day sign-up for it) is traded, not withdrawn.
 */
export const canWithdrawFromDay = (day: ShiftDayResultData, userId: string | null | undefined): boolean => {
  if (!day.MySignupId || (day.MyStatus !== ShiftDayMyStatus.OnRoster && day.MyStatus !== ShiftDayMyStatus.PendingApproval) || isShiftDayOver(day)) {
    return false;
  }
  const entry = findMyRosterEntry(day, userId);
  if (entry) {
    return entry.Source === ShiftRosterSource.Signup || entry.Source === ShiftRosterSource.SupervisorAssigned || entry.Source === ShiftRosterSource.Trade;
  }
  return day.ShiftType === ShiftAssignmentType.Signup;
};

/** On the roster (approved), no trade already open, and the day is not over. */
export const canRequestTradeForDay = (day: ShiftDayResultData): boolean => day.MyStatus === ShiftDayMyStatus.OnRoster && !day.MyTradeId && !isShiftDayOver(day);
