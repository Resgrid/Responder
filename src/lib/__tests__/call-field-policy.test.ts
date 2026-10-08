import { describe, expect, it } from '@jest/globals';
import { type TFunction } from 'i18next';

import { NewCallFieldKeys } from '@/models/v4/calls/newCallFieldPolicyResultData';

import {
  CALL_FIELD_LABEL_KEYS,
  CALL_FORM_UNCOLLECTED_FIELD_KEYS,
  formatCallFieldLabels,
  formatCallGeolocation,
  getMissingCallFieldsFromError,
  getScheduledDispatchPrefill,
  isPendingCallState,
  isScheduledDispatchTooSoon,
  MIN_SCHEDULED_DISPATCH_LEAD_MINUTES,
  parseUtcTimestamp,
  toDispatchOnUtc,
} from '../call-field-policy';

const t = ((key: string) => `t(${key})`) as unknown as TFunction;

const badRequest = (data: unknown) => ({ isAxiosError: true, response: { status: 400, data } });

describe('call field policy helpers', () => {
  describe('CALL_FIELD_LABEL_KEYS', () => {
    // The server names any of these keys when it rejects a save, so every one needs a label.
    it('should have a label for every policy key', () => {
      for (const key of Object.values(NewCallFieldKeys)) {
        expect(CALL_FIELD_LABEL_KEYS[key]).toMatch(/^calls\./);
      }
    });
  });

  describe('formatCallFieldLabels', () => {
    it('should join the translated labels in order', () => {
      expect(formatCallFieldLabels([NewCallFieldKeys.ContactName, NewCallFieldKeys.DispatchList], t)).toBe('t(calls.contact_name), t(calls.dispatch_to)');
    });

    it('should match keys regardless of casing', () => {
      expect(formatCallFieldLabels(['CONTACTINFO', 'externalid'], t)).toBe('t(calls.contact_info), t(calls.external_id)');
    });

    it('should fall back to the raw key for a key this app does not know', () => {
      expect(formatCallFieldLabels(['note', 'somethingNew'], t)).toBe('t(calls.note), somethingNew');
    });
  });

  describe('CALL_FORM_UNCOLLECTED_FIELD_KEYS', () => {
    it('should list only the fields the call forms have no input for', () => {
      expect([...CALL_FORM_UNCOLLECTED_FIELD_KEYS].sort()).toEqual(
        [NewCallFieldKeys.IndoorLocation, NewCallFieldKeys.LinkedCall, NewCallFieldKeys.Protocols].sort()
      );
    });
  });

  describe('formatCallGeolocation', () => {
    it('should format a usable point', () => {
      expect(formatCallGeolocation(39.7392, -104.9903)).toBe('39.7392,-104.9903');
    });

    // The server's rule: one zero coordinate is a place, both zero is a client with no fix.
    it('should keep a point on the equator or the prime meridian', () => {
      expect(formatCallGeolocation(0, 32.5)).toBe('0,32.5');
      expect(formatCallGeolocation(51.4779, 0)).toBe('51.4779,0');
    });

    it('should treat a missing, 0,0 or off-globe point as no location', () => {
      expect(formatCallGeolocation(undefined, undefined)).toBe('');
      expect(formatCallGeolocation(10, null)).toBe('');
      expect(formatCallGeolocation(Number.NaN, 10)).toBe('');
      expect(formatCallGeolocation(0, 0)).toBe('');
      expect(formatCallGeolocation(91, 10)).toBe('');
      expect(formatCallGeolocation(10, -181)).toBe('');
    });
  });

  describe('scheduled dispatch', () => {
    const now = new Date('2026-10-08T12:00:00.000Z');

    it('should read a dispatch time as UTC whether or not it carries a zone', () => {
      expect(parseUtcTimestamp('2026-10-09T14:30:00')?.toISOString()).toBe('2026-10-09T14:30:00.000Z');
      expect(parseUtcTimestamp('2026-10-09T14:30:00Z')?.toISOString()).toBe('2026-10-09T14:30:00.000Z');
      expect(parseUtcTimestamp('2026-10-09T16:30:00+02:00')?.toISOString()).toBe('2026-10-09T14:30:00.000Z');
      expect(parseUtcTimestamp('')).toBeNull();
      expect(parseUtcTimestamp(undefined)).toBeNull();
      expect(parseUtcTimestamp('not a date')).toBeNull();
    });

    it('should pre-fill the edit input only while the stored dispatch time is still ahead', () => {
      // Scheduled and not sent yet.
      expect(getScheduledDispatchPrefill('2026-10-08T12:05:00', now)).toBe('2026-10-08T12:05:00.000Z');
      // Already sent: the dispatch time is history, not a schedule.
      expect(getScheduledDispatchPrefill('2026-10-08T11:55:00', now)).toBe('');
      expect(getScheduledDispatchPrefill('2026-10-08T12:00:00Z', now)).toBe('');
      expect(getScheduledDispatchPrefill('', now)).toBe('');
      expect(getScheduledDispatchPrefill(null, now)).toBe('');
    });

    it('should require a chosen time at least the lead time ahead', () => {
      expect(MIN_SCHEDULED_DISPATCH_LEAD_MINUTES).toBe(15);
      expect(isScheduledDispatchTooSoon('2026-10-08T12:15:00.000Z', now)).toBe(false);
      expect(isScheduledDispatchTooSoon('2026-10-09T08:00:00.000Z', now)).toBe(false);
      expect(isScheduledDispatchTooSoon('2026-10-08T12:14:59.000Z', now)).toBe(true);
      expect(isScheduledDispatchTooSoon('2026-10-08T11:00:00.000Z', now)).toBe(true);
      expect(isScheduledDispatchTooSoon('garbage', now)).toBe(true);
    });

    it('should send a chosen time as ISO 8601 UTC, and nothing for an empty input', () => {
      expect(toDispatchOnUtc('2026-10-09T14:30:00.000Z')).toBe('2026-10-09T14:30:00.000Z');
      expect(toDispatchOnUtc('2026-10-09T16:30:00+02:00')).toBe('2026-10-09T14:30:00.000Z');
      expect(toDispatchOnUtc('')).toBeUndefined();
      expect(toDispatchOnUtc(undefined)).toBeUndefined();
    });
  });

  describe('isPendingCallState', () => {
    it('should recognise the pending state as a number, a numeric string or a name', () => {
      expect(isPendingCallState(8)).toBe(true);
      expect(isPendingCallState('8')).toBe(true);
      expect(isPendingCallState(' Pending ')).toBe(true);
    });

    it('should not treat other states as pending', () => {
      expect(isPendingCallState(0)).toBe(false);
      expect(isPendingCallState('0')).toBe(false);
      expect(isPendingCallState('Active')).toBe(false);
      expect(isPendingCallState(undefined)).toBe(false);
      expect(isPendingCallState(null)).toBe(false);
    });
  });

  describe('getMissingCallFieldsFromError', () => {
    it('should read the keys from a plain-text rejection', () => {
      expect(getMissingCallFieldsFromError(badRequest('Required call fields are missing: contactName, externalId'))).toEqual([NewCallFieldKeys.ContactName, NewCallFieldKeys.ExternalId]);
    });

    it('should canonicalise key casing and keep unknown keys', () => {
      expect(getMissingCallFieldsFromError(badRequest('Required call fields are missing: CONTACTINFO, futureField'))).toEqual([NewCallFieldKeys.ContactInfo, 'futureField']);
    });

    it('should read the message from an object body', () => {
      expect(getMissingCallFieldsFromError(badRequest({ Message: 'Required call fields are missing: dispatchOn' }))).toEqual([NewCallFieldKeys.DispatchOn]);
    });

    it('should return null for any other failure', () => {
      expect(getMissingCallFieldsFromError(badRequest('Bad destination'))).toBeNull();
      expect(getMissingCallFieldsFromError(badRequest(''))).toBeNull();
      expect(getMissingCallFieldsFromError({ response: { status: 500, data: 'Required call fields are missing: note' } })).toBeNull();
      expect(getMissingCallFieldsFromError(new Error('network down'))).toBeNull();
      expect(getMissingCallFieldsFromError(undefined)).toBeNull();
    });
  });
});
