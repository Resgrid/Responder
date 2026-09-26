import { endOfMonth, format, isValid, parseISO, startOfMonth } from 'date-fns';

import { getResponseStatus } from '@/lib/request-errors';
import { type ShiftDayGroupNeedsResultData, type ShiftDayResultData, type ShiftDayRosterResultData } from '@/models/v4/shifts/shiftDayResultData';
import { SHIFT_SERVER_ERROR_CODES, type ShiftErrorCode, type ShiftServerErrorCode } from '@/models/v4/shifts/shiftEnums';

const OFFSET_SUFFIX = /(Z|[+-]\d{2}:?\d{2})$/i;

/**
 * Shift times are department-local wall-clock strings without an offset (e.g. `2026-09-24T19:00:00`)
 * and are displayed as-is. `parseISO` reads an offset-less string as device-local, which keeps the
 * wall-clock digits; any offset a legacy server still appends is dropped so it is never shifted.
 */
export const parseWallClock = (value: string | null | undefined): Date | null => {
  if (!value) {
    return null;
  }
  const parsed = parseISO(value.trim().replace(OFFSET_SUFFIX, ''));
  return isValid(parsed) ? parsed : null;
};

const formatWallClock = (value: string | null | undefined, pattern: string): string => {
  const parsed = parseWallClock(value);
  return parsed ? format(parsed, pattern) : (value ?? '');
};

export const formatShiftTime = (value: string | null | undefined): string => formatWallClock(value, 'h:mm a');

export const formatShiftDate = (value: string | null | undefined): string => formatWallClock(value, 'EEE, MMM d, yyyy');

export const formatShiftLongDate = (value: string | null | undefined): string => formatWallClock(value, 'EEEE, MMMM d, yyyy');

/** `yyyy-MM-dd` of a wall-clock value, or '' when it cannot be parsed. */
export const getDateKey = (value: string | null | undefined): string => {
  const parsed = parseWallClock(value);
  return parsed ? format(parsed, 'yyyy-MM-dd') : '';
};

/** The `YYYY-MM-DD` query format the date-range endpoints take. */
export const toDateParam = (date: Date): string => format(date, 'yyyy-MM-dd');

export interface DateRange {
  start: string;
  end: string;
}

/** First to last day (inclusive) of the month containing `date`. */
export const getMonthRange = (date: Date): DateRange => ({
  start: toDateParam(startOfMonth(date)),
  end: toDateParam(endOfMonth(date)),
});

/** The shift ends on a later calendar day than it starts (19:00 -> 07:00). */
export const isOvernightShift = (start: string | null | undefined, end: string | null | undefined): boolean => {
  const startKey = getDateKey(start);
  const endKey = getDateKey(end);
  return startKey !== '' && endKey !== '' && endKey > startKey;
};

export const getGroupOpenSlots = (group: ShiftDayGroupNeedsResultData): number => (group.GroupNeeds ?? []).reduce((total, role) => total + Math.max(0, role.Needed || 0), 0);

/** Groups a supervisor may manage on this day. */
export const getManageableGroups = (day: ShiftDayResultData): ShiftDayGroupNeedsResultData[] => (day.Needs ?? []).filter((group) => group.CanManage);

/**
 * Whether the caller may supervise a roster entry: by the entry's group when it has one, otherwise
 * by the day-level flag (an entry not tied to a group belongs to whoever manages the day).
 */
export const canManageRosterEntry = (day: ShiftDayResultData, entry: Pick<ShiftDayRosterResultData, 'GroupId'>): boolean => {
  if (!entry.GroupId) {
    return day.CanManage;
  }
  return (day.Needs ?? []).some((group) => group.GroupId === entry.GroupId && group.CanManage);
};

const SUCCESS_STATUSES = new Set(['success', 'created', 'updated', 'deleted']);
const KNOWN_ERROR_CODES = new Set<string>(SHIFT_SERVER_ERROR_CODES);

const normalizeErrorCode = (code: unknown): ShiftErrorCode | null => {
  if (typeof code !== 'string' || code.trim().length === 0) {
    return null;
  }
  const normalized = code.trim().toLowerCase();
  return KNOWN_ERROR_CODES.has(normalized) ? (normalized as ShiftServerErrorCode) : 'unknown';
};

interface ShiftResponseLike {
  Status?: string | null;
  ErrorCode?: string | null;
}

/**
 * The error a Shifts response carries, or null when it succeeded. The POSTs answer validation
 * failures with HTTP 200, `Status: "failure"` and an `ErrorCode`, so a resolved request is not
 * proof of success.
 */
export const getShiftResponseErrorCode = (response: ShiftResponseLike | null | undefined): ShiftErrorCode | null => {
  if (!response || typeof response !== 'object') {
    return 'unknown';
  }
  const status = typeof response.Status === 'string' ? response.Status.toLowerCase() : '';
  const errorCode = normalizeErrorCode(response.ErrorCode);

  if (status === 'failure') {
    return errorCode ?? 'unknown';
  }
  if (status === 'not_found') {
    return errorCode ?? 'not_found';
  }
  if (errorCode && !SUCCESS_STATUSES.has(status)) {
    return errorCode;
  }
  return null;
};

/** Classifies a rejected Shifts request: a body `ErrorCode` wins, then the HTTP status. */
export const getShiftRequestErrorCode = (error: unknown): ShiftErrorCode => {
  const body = (error as { response?: { data?: unknown } } | null | undefined)?.response?.data;
  if (body && typeof body === 'object') {
    const fromBody = normalizeErrorCode((body as ShiftResponseLike).ErrorCode);
    if (fromBody) {
      return fromBody;
    }
  }

  const status = getResponseStatus(error);
  if (status === null) {
    return 'network';
  }
  if (status === 404) {
    return 'not_found';
  }
  if (status === 401 || status === 403) {
    return 'not_allowed';
  }
  return 'unknown';
};

const SHIFT_ERROR_TRANSLATION_KEYS: Record<ShiftErrorCode, string> = {
  not_found: 'shifts.errors.not_found',
  not_allowed: 'shifts.errors.not_allowed',
  already_signed_up: 'shifts.errors.already_signed_up',
  invalid_group: 'shifts.errors.invalid_group',
  day_in_past: 'shifts.errors.day_in_past',
  not_on_shift: 'shifts.errors.not_on_shift',
  trade_exists: 'shifts.errors.trade_exists',
  no_users: 'shifts.errors.no_users',
  invalid_offer: 'shifts.errors.invalid_offer',
  not_pending: 'shifts.errors.not_pending',
  already_on_roster: 'shifts.errors.already_on_roster',
  invalid_request: 'shifts.errors.invalid_request',
  network: 'shifts.errors.network',
  unknown: 'shifts.errors.unknown',
};

/** Translation key for an error code; unrecognised codes fall back to the generic message. */
export const getShiftErrorTranslationKey = (code: ShiftErrorCode | null | undefined): string => SHIFT_ERROR_TRANSLATION_KEYS[code ?? 'unknown'] ?? SHIFT_ERROR_TRANSLATION_KEYS.unknown;
