import { type TFunction } from 'i18next';

import { type NewCallFieldKey, NewCallFieldKeys } from '@/models/v4/calls/newCallFieldPolicyResultData';

/**
 * Shared pieces of the department's call field policy (Department > Dispatch Settings > New Call Form
 * Fields) used by both the new-call and edit-call screens.
 */

/**
 * The label each policy key is shown under. The policy speaks in stable wire keys; a dispatcher told to
 * fill in 'contactName' is being shown the protocol rather than their own form, so every key maps back
 * to the label the call forms put on the field. Keys neither screen renders (external id, protocols...)
 * still get a label, because the server names them when it rejects a save.
 */
export const CALL_FIELD_LABEL_KEYS: Record<NewCallFieldKey, string> = {
  [NewCallFieldKeys.Address]: 'calls.address',
  [NewCallFieldKeys.Geolocation]: 'calls.coordinates',
  [NewCallFieldKeys.What3Words]: 'calls.what3words',
  [NewCallFieldKeys.PlusCode]: 'calls.plus_code',
  [NewCallFieldKeys.DestinationPoi]: 'calls.destination',
  [NewCallFieldKeys.IndoorLocation]: 'calls.indoor_location',
  [NewCallFieldKeys.Note]: 'calls.note',
  [NewCallFieldKeys.ContactName]: 'calls.contact_name',
  [NewCallFieldKeys.ContactInfo]: 'calls.contact_info',
  [NewCallFieldKeys.ExternalId]: 'calls.external_id',
  [NewCallFieldKeys.IncidentId]: 'calls.incident_id',
  [NewCallFieldKeys.ReferenceId]: 'calls.reference_id',
  [NewCallFieldKeys.Protocols]: 'calls.protocols',
  [NewCallFieldKeys.LinkedCall]: 'calls.linked_call',
  [NewCallFieldKeys.DispatchOn]: 'calls.dispatch_on',
  [NewCallFieldKeys.DispatchList]: 'calls.dispatch_to',
};

/** Lowercased key -> canonical key, so a server message's casing never decides whether a label is found. */
const CANONICAL_KEYS = new Map<string, NewCallFieldKey>(Object.values(NewCallFieldKeys).map((key) => [key.toLowerCase(), key]));

/**
 * The comma-separated labels for a list of policy keys, ready for `calls.required_fields_missing`. A key
 * this app does not know (a newer server) falls back to the raw key, which at least names something,
 * rather than being dropped from the message.
 */
export const formatCallFieldLabels = (keys: readonly string[], t: TFunction): string =>
  keys
    .map((key) => {
      const canonical = CANONICAL_KEYS.get(key.toLowerCase());

      return canonical ? t(CALL_FIELD_LABEL_KEYS[canonical]) : key;
    })
    .join(', ');

/**
 * Policy keys this app's call forms have no input for. The client check skips them -- requiring a field
 * the dispatcher has no way to fill only produces a message they cannot act on -- and leaves them to the
 * server:
 * protocols, linkedCall and indoorLocation are only enforced when the request carries ProtocolIds,
 * LinkedCallId or IndoorMapZoneId, which this app never sends, so the server does not hold it to them.
 */
export const CALL_FORM_UNCOLLECTED_FIELD_KEYS: ReadonlySet<NewCallFieldKey> = new Set<NewCallFieldKey>([NewCallFieldKeys.IndoorLocation, NewCallFieldKeys.Protocols, NewCallFieldKeys.LinkedCall]);

/** How far ahead a scheduled dispatch must be, matching the web call form. */
export const MIN_SCHEDULED_DISPATCH_LEAD_MINUTES = 15;

/**
 * Parses a dispatch time from the API. The stored value is UTC, but older servers send it without a zone
 * designator, which `Date` would otherwise read as local time.
 */
export const parseUtcTimestamp = (value: string | null | undefined): Date | null => {
  const trimmed = value?.trim();

  if (!trimmed) {
    return null;
  }

  const parsed = new Date(/(?:Z|[+-]\d{2}:?\d{2})$/i.test(trimmed) ? trimmed : `${trimmed}Z`);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

/**
 * The value the edit form's scheduled-dispatch input starts with: the stored dispatch time (the call result's
 * DispatchedOnUtc) while it is still ahead -- the call is scheduled and not sent yet -- and '' otherwise.
 */
export const getScheduledDispatchPrefill = (dispatchedOnUtc: string | null | undefined, now: Date = new Date()): string => {
  const dispatchOn = parseUtcTimestamp(dispatchedOnUtc);

  return dispatchOn && dispatchOn.getTime() > now.getTime() ? dispatchOn.toISOString() : '';
};

/** True when a chosen dispatch time is not at least MIN_SCHEDULED_DISPATCH_LEAD_MINUTES ahead (or unreadable). */
export const isScheduledDispatchTooSoon = (value: string, now: Date = new Date()): boolean => {
  const dispatchOn = parseUtcTimestamp(value);

  return !dispatchOn || dispatchOn.getTime() < now.getTime() + MIN_SCHEDULED_DISPATCH_LEAD_MINUTES * 60 * 1000;
};

/** The `DispatchOnUtc` to send for a chosen time (ISO 8601 UTC), or undefined to leave it out. */
export const toDispatchOnUtc = (value: string | null | undefined): string | undefined => parseUtcTimestamp(value)?.toISOString();

/**
 * The `Geolocation` value a call is saved with, or '' when the form holds no usable point. Mirrors the
 * server's rule, so "required" means the same thing on both sides: a single zero coordinate (the equator,
 * the prime meridian) is a real place, but a missing coordinate, 0,0 or an off-globe value is not.
 */
export const formatCallGeolocation = (latitude?: number | null, longitude?: number | null): string => {
  if (typeof latitude !== 'number' || typeof longitude !== 'number' || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return '';
  }

  if (latitude === 0 && longitude === 0) {
    return '';
  }

  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return '';
  }

  return `${latitude},${longitude}`;
};

const CALL_STATE_PENDING = 8;

/**
 * Whether a call is Pending (State 8): saved and numbered but not dispatched yet. Core sends the state as a
 * number; older API versions send its name.
 */
export const isPendingCallState = (state: number | string | null | undefined): boolean => {
  if (state === null || state === undefined) {
    return false;
  }

  if (typeof state === 'number') {
    return state === CALL_STATE_PENDING;
  }

  const normalized = state.trim().toLowerCase();

  return normalized === String(CALL_STATE_PENDING) || normalized === 'pending';
};

const REQUIRED_FIELDS_MESSAGE = /required call fields are missing:\s*(.+)$/i;

const readErrorText = (error: unknown): string | null => {
  const data = (error as { response?: { data?: unknown } } | null | undefined)?.response?.data;

  if (typeof data === 'string') {
    return data;
  }

  if (data && typeof data === 'object') {
    for (const field of ['Message', 'message', 'detail', 'title']) {
      const value = (data as Record<string, unknown>)[field];

      if (typeof value === 'string') {
        return value;
      }
    }
  }

  return null;
};

/**
 * The policy keys a save was rejected for, when the server refused it because required call fields were
 * missing (HTTP 400, "Required call fields are missing: key1, key2"); null for any other failure. Lets the
 * screen name the fields instead of showing a generic error -- including fields this app has no input for,
 * which it cannot check before sending.
 */
export const getMissingCallFieldsFromError = (error: unknown): string[] | null => {
  const status = (error as { response?: { status?: unknown } } | null | undefined)?.response?.status;

  if (status !== 400) {
    return null;
  }

  const text = readErrorText(error);
  const match = text ? REQUIRED_FIELDS_MESSAGE.exec(text.trim()) : null;

  if (!match?.[1]) {
    return null;
  }

  const keys = match[1]
    .split(',')
    .map((key) => key.trim().replace(/[."]+$/, ''))
    .filter((key) => key.length > 0)
    .map((key) => CANONICAL_KEYS.get(key.toLowerCase()) ?? key);

  return keys.length > 0 ? keys : null;
};
