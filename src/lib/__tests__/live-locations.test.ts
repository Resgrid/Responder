import {
  applyLiveLocations,
  diffLiveLocations,
  getLiveLocationPinIds,
  type LiveLocation,
  type LiveLocations,
  mergeLiveLocation,
  parseLiveLocationTimestamp,
  parsePersonnelLocationUpdate,
  parseUnitLocationUpdate,
} from '@/lib/live-locations';
import { type MapMakerInfoData } from '@/models/v4/mapping/getMapDataAndMarkersData';

const RECEIVED_AT = 1_700_000_000_000;
const GUID = '0A1B2C3D-4E5F-6071-8293-A4B5C6D7E8F9';

const pin = (overrides: Partial<MapMakerInfoData>): MapMakerInfoData => ({
  Id: 'x',
  Title: 'Pin',
  Latitude: 10,
  Longitude: 20,
  zIndex: '1',
  ImagePath: '',
  InfoWindowContent: '',
  Color: '',
  Type: 0,
  ...overrides,
});

const live = (pinId: string, latitude: number, longitude: number, overrides: Partial<LiveLocation> = {}): LiveLocation => ({
  pinId,
  latitude,
  longitude,
  timestamp: null,
  receivedAt: RECEIVED_AT,
  ...overrides,
});

describe('parseUnitLocationUpdate', () => {
  it('parses the camelCase payload the hub sends', () => {
    const payload = { departmentId: 1, unitId: '12', latitude: 39.5, longitude: -104.9, recordId: 'r1', timestamp: '2026-09-25T14:03:11.123Z' };

    expect(parseUnitLocationUpdate(payload, RECEIVED_AT)).toEqual({
      pinId: 'u12',
      latitude: 39.5,
      longitude: -104.9,
      timestamp: Date.UTC(2026, 8, 25, 14, 3, 11, 123),
      receivedAt: RECEIVED_AT,
    });
  });

  it('accepts PascalCase field names', () => {
    const payload = { DepartmentId: 1, UnitId: '7', Latitude: 1.25, Longitude: 2.5, Timestamp: '2026-09-25T14:03:11Z' };

    expect(parseUnitLocationUpdate(payload, RECEIVED_AT)).toMatchObject({ pinId: 'u7', latitude: 1.25, longitude: 2.5, timestamp: Date.UTC(2026, 8, 25, 14, 3, 11) });
  });

  it('accepts the payload as a JSON string', () => {
    const payload = JSON.stringify({ unitId: '12', latitude: 39.5, longitude: -104.9 });

    expect(parseUnitLocationUpdate(payload, RECEIVED_AT)).toMatchObject({ pinId: 'u12', latitude: 39.5, longitude: -104.9 });
  });

  it('accepts a numeric unit id', () => {
    expect(parseUnitLocationUpdate({ unitId: 12, latitude: 1, longitude: 2 }, RECEIVED_AT)?.pinId).toBe('u12');
  });

  it('treats a missing, null or unparseable timestamp as unknown', () => {
    expect(parseUnitLocationUpdate({ unitId: '1', latitude: 1, longitude: 2 }, RECEIVED_AT)?.timestamp).toBeNull();
    expect(parseUnitLocationUpdate({ unitId: '1', latitude: 1, longitude: 2, timestamp: null }, RECEIVED_AT)?.timestamp).toBeNull();
    expect(parseUnitLocationUpdate({ unitId: '1', latitude: 1, longitude: 2, timestamp: 'not a date' }, RECEIVED_AT)?.timestamp).toBeNull();
  });

  it.each([
    ['latitude above 90', { unitId: '1', latitude: 90.1, longitude: 0.5 }],
    ['latitude below -90', { unitId: '1', latitude: -91, longitude: 0.5 }],
    ['longitude above 180', { unitId: '1', latitude: 1, longitude: 180.5 }],
    ['longitude below -180', { unitId: '1', latitude: 1, longitude: -181 }],
    ['0,0', { unitId: '1', latitude: 0, longitude: 0 }],
    ['NaN', { unitId: '1', latitude: Number.NaN, longitude: 2 }],
    ['Infinity', { unitId: '1', latitude: 1, longitude: Number.POSITIVE_INFINITY }],
    ['missing coordinates', { unitId: '1' }],
    ['non-numeric coordinates', { unitId: '1', latitude: 'north', longitude: 2 }],
  ])('rejects %s', (_label, payload) => {
    expect(parseUnitLocationUpdate(payload, RECEIVED_AT)).toBeNull();
  });

  it('rejects payloads without a unit id or that are not objects', () => {
    expect(parseUnitLocationUpdate({ latitude: 1, longitude: 2 }, RECEIVED_AT)).toBeNull();
    expect(parseUnitLocationUpdate({ unitId: '  ', latitude: 1, longitude: 2 }, RECEIVED_AT)).toBeNull();
    expect(parseUnitLocationUpdate('{not json', RECEIVED_AT)).toBeNull();
    expect(parseUnitLocationUpdate(null, RECEIVED_AT)).toBeNull();
    expect(parseUnitLocationUpdate([1, 2], RECEIVED_AT)).toBeNull();
  });

  it('keeps a boundary coordinate and a position on a single zero axis', () => {
    expect(parseUnitLocationUpdate({ unitId: '1', latitude: -90, longitude: 180 }, RECEIVED_AT)).not.toBeNull();
    expect(parseUnitLocationUpdate({ unitId: '1', latitude: 0, longitude: 12 }, RECEIVED_AT)).not.toBeNull();
  });
});

describe('parsePersonnelLocationUpdate', () => {
  it('maps the user id to a lower-cased personnel pin id', () => {
    const payload = { departmentId: 1, userId: GUID, latitude: 39.5, longitude: -104.9, recordId: 'r1', timestamp: null };

    expect(parsePersonnelLocationUpdate(payload, RECEIVED_AT)).toEqual({
      pinId: `p${GUID.toLowerCase()}`,
      latitude: 39.5,
      longitude: -104.9,
      timestamp: null,
      receivedAt: RECEIVED_AT,
    });
  });

  it('accepts PascalCase and a JSON string', () => {
    const payload = JSON.stringify({ UserId: GUID, Latitude: 5, Longitude: 6 });

    expect(parsePersonnelLocationUpdate(payload, RECEIVED_AT)).toMatchObject({ pinId: `p${GUID.toLowerCase()}`, latitude: 5, longitude: 6 });
  });

  it('rejects bad coordinates', () => {
    expect(parsePersonnelLocationUpdate({ userId: GUID, latitude: 0, longitude: 0 }, RECEIVED_AT)).toBeNull();
    expect(parsePersonnelLocationUpdate({ userId: GUID, latitude: 100, longitude: 0 }, RECEIVED_AT)).toBeNull();
  });
});

describe('parseLiveLocationTimestamp', () => {
  it('reads a zone-less ISO string as UTC', () => {
    expect(parseLiveLocationTimestamp('2026-09-25T14:03:11.123')).toBe(Date.UTC(2026, 8, 25, 14, 3, 11, 123));
  });

  it('honours an explicit offset', () => {
    expect(parseLiveLocationTimestamp('2026-09-25T16:03:11+02:00')).toBe(Date.UTC(2026, 8, 25, 14, 3, 11));
  });

  it('trims .NET seven-digit fractional seconds to milliseconds', () => {
    expect(parseLiveLocationTimestamp('2026-09-25T14:03:11.1234567Z')).toBe(Date.UTC(2026, 8, 25, 14, 3, 11, 123));
  });

  it('returns null for non-strings and blanks', () => {
    expect(parseLiveLocationTimestamp(1_700_000_000)).toBeNull();
    expect(parseLiveLocationTimestamp('')).toBeNull();
    expect(parseLiveLocationTimestamp(undefined)).toBeNull();
  });
});

describe('mergeLiveLocation', () => {
  it('adds a new entity without mutating the previous map', () => {
    const current: LiveLocations = { u1: live('u1', 1, 1) };
    const next = mergeLiveLocation(current, live('u2', 2, 2));

    expect(next).not.toBe(current);
    expect(Object.keys(current)).toEqual(['u1']);
    expect(next).toEqual({ u1: current.u1, u2: live('u2', 2, 2) });
  });

  it('ignores an update whose fix is older than the stored one', () => {
    const current: LiveLocations = { u1: live('u1', 1, 1, { timestamp: 2000 }) };

    expect(mergeLiveLocation(current, live('u1', 5, 5, { timestamp: 1000 }))).toBe(current);
  });

  it('applies a newer or equally old fix', () => {
    const current: LiveLocations = { u1: live('u1', 1, 1, { timestamp: 2000 }) };

    expect(mergeLiveLocation(current, live('u1', 5, 5, { timestamp: 3000 })).u1.latitude).toBe(5);
    expect(mergeLiveLocation(current, live('u1', 6, 6, { timestamp: 2000 })).u1.latitude).toBe(6);
  });

  it('always applies an update with an unknown fix time, and one arriving over an unknown fix', () => {
    const known: LiveLocations = { u1: live('u1', 1, 1, { timestamp: 2000 }) };
    const unknown: LiveLocations = { u1: live('u1', 1, 1) };

    expect(mergeLiveLocation(known, live('u1', 5, 5)).u1.latitude).toBe(5);
    expect(mergeLiveLocation(unknown, live('u1', 6, 6, { timestamp: 1 })).u1.latitude).toBe(6);
  });
});

describe('diffLiveLocations', () => {
  it('returns only new or replaced entries', () => {
    const unchanged = live('u1', 1, 1);
    const previous: LiveLocations = { u1: unchanged, u2: live('u2', 2, 2) };
    const replaced = live('u2', 3, 3);
    const added = live('u3', 4, 4);

    expect(diffLiveLocations({ u1: unchanged, u2: replaced, u3: added }, previous)).toEqual({ u2: replaced, u3: added });
  });

  it('returns null when nothing changed', () => {
    const previous: LiveLocations = { u1: live('u1', 1, 1) };

    expect(diffLiveLocations(previous, previous)).toBeNull();
    expect(diffLiveLocations({ ...previous }, previous)).toBeNull();
  });
});

describe('getLiveLocationPinIds', () => {
  it('collects lower-cased ids of unit and personnel pins only', () => {
    const pins = [pin({ Id: 'u12', Type: 1 }), pin({ Id: `p${GUID}`, Type: 3 }), pin({ Id: 'c5', Type: 0 }), pin({ Id: 's2', Type: 2 })];

    expect(getLiveLocationPinIds(pins)).toEqual(new Set(['u12', `p${GUID.toLowerCase()}`]));
  });
});

describe('applyLiveLocations', () => {
  const callPin = pin({ Id: 'c1', Type: 0, Latitude: 1, Longitude: 1 });
  const unitPin = pin({ Id: 'u12', Type: 1, Latitude: 10, Longitude: 20 });
  const personnelPin = pin({ Id: `p${GUID}`, Type: 3, Latitude: 30, Longitude: 40 });
  const stationPin = pin({ Id: 's3', Type: 2, Latitude: 50, Longitude: 60 });
  const pins = [callPin, unitPin, personnelPin, stationPin];

  it('returns the same array when there are no live locations', () => {
    expect(applyLiveLocations(pins, {})).toEqual({ pins, unknownPinIds: [] });
    expect(applyLiveLocations(pins, {}).pins).toBe(pins);
  });

  it('returns the same array when every matching pin is already in place', () => {
    const result = applyLiveLocations(pins, { u12: live('u12', 10, 20) });

    expect(result.pins).toBe(pins);
    expect(result.unknownPinIds).toEqual([]);
  });

  it('moves a pin immutably, replacing only that pin', () => {
    const snapshot = pins.map((p) => ({ ...p }));
    const result = applyLiveLocations(pins, { u12: live('u12', 11, 21) });

    expect(result.pins).not.toBe(pins);
    expect(result.pins[1]).toEqual({ ...unitPin, Latitude: 11, Longitude: 21 });
    expect(result.pins[1]).not.toBe(unitPin);
    expect(result.pins[0]).toBe(callPin);
    expect(result.pins[2]).toBe(personnelPin);
    expect(result.pins[3]).toBe(stationPin);
    // Nothing was mutated.
    expect(pins).toEqual(snapshot);
  });

  it('matches personnel pins case-insensitively', () => {
    const location = live(`p${GUID.toLowerCase()}`, 31, 41);
    const result = applyLiveLocations(pins, { [location.pinId]: location });

    expect(result.pins[2]).toMatchObject({ Id: `p${GUID}`, Latitude: 31, Longitude: 41 });
    expect(result.unknownPinIds).toEqual([]);
  });

  it('never adds a pin and reports the unknown ids instead', () => {
    const result = applyLiveLocations(pins, { u99: live('u99', 1, 2), u12: live('u12', 11, 21) });

    expect(result.pins).toHaveLength(pins.length);
    expect(result.pins.map((p) => p.Id)).toEqual(pins.map((p) => p.Id));
    expect(result.unknownPinIds).toEqual(['u99']);
  });

  it('only ever moves unit (1) and personnel (3) pins', () => {
    // A pin of another type whose id happens to collide must stay put.
    const collidingPins = [pin({ Id: 'u12', Type: 0, Latitude: 10, Longitude: 20 })];
    const result = applyLiveLocations(collidingPins, { u12: live('u12', 11, 21) });

    expect(result.pins).toBe(collidingPins);
    expect(result.unknownPinIds).toEqual(['u12']);
  });

  it('skips live locations received before receivedSince', () => {
    const older = live('u12', 11, 21, { receivedAt: 1000 });
    const newer = live(`p${GUID.toLowerCase()}`, 31, 41, { receivedAt: 2000 });
    const result = applyLiveLocations(pins, { u12: older, [newer.pinId]: newer }, { receivedSince: 2000 });

    expect(result.pins[1]).toBe(unitPin);
    expect(result.pins[2]).toMatchObject({ Latitude: 31, Longitude: 41 });
  });

  it('returns the same array when every live location predates receivedSince', () => {
    const result = applyLiveLocations(pins, { u12: live('u12', 11, 21, { receivedAt: 1000 }), u99: live('u99', 1, 1, { receivedAt: 1000 }) }, { receivedSince: 1001 });

    expect(result).toEqual({ pins, unknownPinIds: [] });
    expect(result.pins).toBe(pins);
  });
});
