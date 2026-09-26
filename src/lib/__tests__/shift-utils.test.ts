import { ShiftDayResultData } from '@/models/v4/shifts/shiftDayResultData';

import {
  canManageRosterEntry,
  formatShiftDate,
  formatShiftTime,
  getDateKey,
  getGroupOpenSlots,
  getManageableGroups,
  getMonthRange,
  getShiftErrorTranslationKey,
  getShiftRequestErrorCode,
  getShiftResponseErrorCode,
  isOvernightShift,
  parseWallClock,
} from '../shift-utils';

const makeDay = (overrides: Partial<ShiftDayResultData> = {}): ShiftDayResultData => ({ ...new ShiftDayResultData(), ...overrides });

describe('shift-utils', () => {
  describe('wall-clock times', () => {
    it('displays department-local times as-is', () => {
      expect(formatShiftTime('2026-09-24T19:00:00')).toBe('7:00 PM');
      expect(formatShiftDate('2026-09-24T19:00:00')).toBe('Thu, Sep 24, 2026');
    });

    it('ignores an offset instead of shifting the time', () => {
      expect(formatShiftTime('2026-09-24T07:00:00Z')).toBe('7:00 AM');
      expect(formatShiftTime('2026-09-24T07:00:00-05:00')).toBe('7:00 AM');
    });

    it('returns null / the raw value for unparseable input', () => {
      expect(parseWallClock('')).toBeNull();
      expect(parseWallClock('not a date')).toBeNull();
      expect(formatShiftTime('7:00 AM')).toBe('7:00 AM');
      expect(getDateKey('garbage')).toBe('');
    });

    it('detects overnight shifts', () => {
      expect(isOvernightShift('2026-09-24T19:00:00', '2026-09-25T07:00:00')).toBe(true);
      expect(isOvernightShift('2026-09-24T07:00:00', '2026-09-24T19:00:00')).toBe(false);
    });

    it('builds the inclusive month range the date-range endpoint takes', () => {
      expect(getMonthRange(new Date(2026, 1, 14))).toEqual({ start: '2026-02-01', end: '2026-02-28' });
    });
  });

  describe('needs and permissions', () => {
    const day = makeDay({
      CanManage: true,
      Needs: [
        { GroupId: '1', GroupName: 'PMRT North', CanManage: true, GroupNeeds: [{ RoleId: '1', RoleName: 'Clinician', Needed: 2 }, { RoleId: '2', RoleName: 'Peer', Needed: -1 }] },
        { GroupId: '2', GroupName: 'PMRT South', CanManage: false, GroupNeeds: [] },
      ],
    });

    it('never counts a negative need', () => {
      expect(getGroupOpenSlots(day.Needs[0]!)).toBe(2);
    });

    it('lists only groups the caller supervises', () => {
      expect(getManageableGroups(day).map((group) => group.GroupId)).toEqual(['1']);
    });

    it('decides roster management per group, falling back to the day flag for ungrouped entries', () => {
      expect(canManageRosterEntry(day, { GroupId: '1' })).toBe(true);
      expect(canManageRosterEntry(day, { GroupId: '2' })).toBe(false);
      expect(canManageRosterEntry(day, { GroupId: '' })).toBe(true);
      expect(canManageRosterEntry({ ...day, CanManage: false }, { GroupId: '' })).toBe(false);
    });
  });

  describe('error codes', () => {
    it('treats created / updated / deleted / success as success', () => {
      expect(getShiftResponseErrorCode({ Status: 'created', ErrorCode: '' })).toBeNull();
      expect(getShiftResponseErrorCode({ Status: 'updated' })).toBeNull();
      expect(getShiftResponseErrorCode({ Status: 'deleted', ErrorCode: '' })).toBeNull();
      expect(getShiftResponseErrorCode({ Status: 'success', ErrorCode: '' })).toBeNull();
    });

    it('reads the ErrorCode of a failure', () => {
      expect(getShiftResponseErrorCode({ Status: 'failure', ErrorCode: 'trade_exists' })).toBe('trade_exists');
      expect(getShiftResponseErrorCode({ Status: 'Failure', ErrorCode: 'NOT_ALLOWED' })).toBe('not_allowed');
    });

    it('maps a failure without (or with an unknown) code to unknown, and not_found status to not_found', () => {
      expect(getShiftResponseErrorCode({ Status: 'failure', ErrorCode: '' })).toBe('unknown');
      expect(getShiftResponseErrorCode({ Status: 'failure', ErrorCode: 'brand_new_code' })).toBe('unknown');
      expect(getShiftResponseErrorCode({ Status: 'not_found' })).toBe('not_found');
      expect(getShiftResponseErrorCode(null)).toBe('unknown');
    });

    it('classifies rejected requests by body ErrorCode, then HTTP status', () => {
      expect(getShiftRequestErrorCode({ response: { status: 400, data: { ErrorCode: 'day_in_past' } } })).toBe('day_in_past');
      expect(getShiftRequestErrorCode({ response: { status: 404 } })).toBe('not_found');
      expect(getShiftRequestErrorCode({ response: { status: 403 } })).toBe('not_allowed');
      expect(getShiftRequestErrorCode({ response: { status: 401 } })).toBe('not_allowed');
      expect(getShiftRequestErrorCode({ response: { status: 500 } })).toBe('unknown');
      expect(getShiftRequestErrorCode(new Error('Network Error'))).toBe('network');
    });

    it('maps every code to a translation key with a generic fallback', () => {
      expect(getShiftErrorTranslationKey('invalid_group')).toBe('shifts.errors.invalid_group');
      expect(getShiftErrorTranslationKey('network')).toBe('shifts.errors.network');
      expect(getShiftErrorTranslationKey(null)).toBe('shifts.errors.unknown');
    });

    it('has an English message for every translation key it can return', () => {
      const en = require('@/translations/en.json');
      const codes = ['not_found', 'not_allowed', 'already_signed_up', 'invalid_group', 'day_in_past', 'not_on_shift', 'trade_exists', 'no_users', 'invalid_offer', 'not_pending', 'already_on_roster', 'invalid_request', 'network', 'unknown'] as const;
      codes.forEach((code) => {
        const key = getShiftErrorTranslationKey(code);
        const value = key.split('.').reduce<unknown>((acc, part) => (acc as Record<string, unknown> | undefined)?.[part], en);
        expect(typeof value).toBe('string');
      });
    });
  });
});
