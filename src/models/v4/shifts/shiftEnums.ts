/** Server `ShiftAssignmentTypes`; a shift day's `ShiftType` carries the same values. */
export enum ShiftAssignmentType {
  Assigned = 0,
  Signup = 1,
}

/** Server `ShiftScheduleTypes`. */
export enum ShiftScheduleType {
  Custom = 0,
  Manual = 1,
  TwentyFourFortyEight = 2,
  TwentyFourSeventyTwo = 3,
  FortyEightNinetySix = 4,
}

/** Why a person is on a shift day's roster. */
export enum ShiftRosterSource {
  Assigned = 0,
  Signup = 1,
  SupervisorAssigned = 2,
  Trade = 3,
}

/** The calling user's standing on a shift day. */
export enum ShiftDayMyStatus {
  None = 0,
  OnRoster = 1,
  PendingApproval = 2,
  Denied = 3,
}

/** Overall state of a trade. */
export enum ShiftTradeStatus {
  Open = 0,
  PendingApproval = 1,
  Completed = 2,
  Denied = 3,
  Cancelled = 4,
}

/** An invited user's own state on a trade (`MyState`). */
export enum ShiftTradeUserState {
  Open = 0,
  Filled = 1,
  Declined = 2,
  Accepted = 3,
  Proposed = 4,
  PendingApproval = 5,
  Denied = 6,
}

export enum ShiftTradeDirection {
  Outgoing = 0,
  Incoming = 1,
}

/** `ErrorCode` values the Shifts POST endpoints return with `Status: "failure"`. */
export const SHIFT_SERVER_ERROR_CODES = [
  'not_found',
  'not_allowed',
  'already_signed_up',
  'invalid_group',
  'day_in_past',
  'not_on_shift',
  'trade_exists',
  'no_users',
  'invalid_offer',
  'not_pending',
  'already_on_roster',
  'invalid_request',
] as const;

export type ShiftServerErrorCode = (typeof SHIFT_SERVER_ERROR_CODES)[number];

/** Server codes plus the two the app derives itself: no HTTP answer at all, and anything unrecognised. */
export type ShiftErrorCode = ShiftServerErrorCode | 'network' | 'unknown';
