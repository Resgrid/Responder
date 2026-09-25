import { type MapMakerInfoData } from '@/models/v4/mapping/getMapDataAndMarkersData';

/**
 * Realtime unit/personnel positions pushed by the geolocation hub, keyed by the map pin they move.
 *
 * The hub broadcasts every position in the department to the whole department group, without the
 * per-viewer visibility matrix or location TTLs the REST map endpoint applies. A push may therefore
 * only ever MOVE a pin the REST map data already contains -- never create one.
 */

/** Map pin types (MapMakerInfoData.Type) a live position may move. */
export const LIVE_LOCATION_UNIT_PIN_TYPE = 1;
export const LIVE_LOCATION_PERSONNEL_PIN_TYPE = 3;

export interface LiveLocation {
  /** Map pin id: `u{UnitId}` for units, `p{userId}` (lower-cased) for personnel. */
  pinId: string;
  latitude: number;
  longitude: number;
  /** UTC epoch ms of the GPS fix, or null when the server did not send a usable one. */
  timestamp: number | null;
  /** Epoch ms this device received the push. */
  receivedAt: number;
}

export type LiveLocations = Record<string, LiveLocation>;

export interface ApplyLiveLocationsOptions {
  /** Only apply live locations received at or after this epoch ms (the moment a REST snapshot's fetch started). */
  receivedSince?: number;
}

export interface ApplyLiveLocationsResult {
  /** The same array when no pin moved; otherwise a new array with new objects only for the moved pins. */
  pins: MapMakerInfoData[];
  /** Pin ids with a live location but no matching unit/personnel pin. */
  unknownPinIds: string[];
}

type PayloadRecord = Record<string, unknown>;

const toPayloadRecord = (payload: unknown): PayloadRecord | null => {
  let value = payload;
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch {
      return null;
    }
  }
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as PayloadRecord;
};

/** The hub serializes camelCase; PascalCase is accepted so a differently configured serializer keeps working. */
const readField = (payload: PayloadRecord, camelCase: string): unknown => {
  const pascalCase = `${camelCase.charAt(0).toUpperCase()}${camelCase.slice(1)}`;
  return payload[camelCase] ?? payload[pascalCase];
};

const toFiniteNumber = (value: unknown): number | null => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const toEntityId = (value: unknown): string | null => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  return null;
};

const ISO_DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/i;
const ISO_ZONE_SUFFIX = /(?:z|[+-]\d{2}(?::?\d{2})?)$/i;

/**
 * The fix time is documented as UTC ISO-8601. A string without a zone designator is read as UTC
 * rather than device-local time, and fractional seconds are trimmed to milliseconds because .NET
 * emits up to seven digits, which not every JS engine's Date.parse accepts.
 */
export const parseLiveLocationTimestamp = (value: unknown): number | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }
  const isIsoDateTime = ISO_DATE_TIME.test(trimmed);
  const withMilliseconds = isIsoDateTime ? trimmed.replace(/(\.\d{3})\d+/, '$1') : trimmed;
  const normalized = isIsoDateTime && !ISO_ZONE_SUFFIX.test(withMilliseconds) ? `${withMilliseconds}Z` : withMilliseconds;
  const parsed = Date.parse(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const readCoordinates = (payload: PayloadRecord): { latitude: number; longitude: number } | null => {
  const latitude = toFiniteNumber(readField(payload, 'latitude'));
  const longitude = toFiniteNumber(readField(payload, 'longitude'));
  if (latitude === null || longitude === null) {
    return null;
  }
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return null;
  }
  // 0,0 is what an unset fix serializes to, not a real position.
  if (latitude === 0 && longitude === 0) {
    return null;
  }
  return { latitude, longitude };
};

const parseLocationUpdate = (payload: unknown, idField: 'unitId' | 'userId', pinPrefix: 'u' | 'p', receivedAt: number): LiveLocation | null => {
  const record = toPayloadRecord(payload);
  if (!record) {
    return null;
  }
  const entityId = toEntityId(readField(record, idField));
  const coordinates = readCoordinates(record);
  if (!entityId || !coordinates) {
    return null;
  }
  return {
    pinId: `${pinPrefix}${entityId}`.toLowerCase(),
    latitude: coordinates.latitude,
    longitude: coordinates.longitude,
    timestamp: parseLiveLocationTimestamp(readField(record, 'timestamp')),
    receivedAt,
  };
};

/** Parse an `onUnitLocationUpdated` payload (object or JSON string). Returns null for anything unusable. */
export const parseUnitLocationUpdate = (payload: unknown, receivedAt: number = Date.now()): LiveLocation | null => parseLocationUpdate(payload, 'unitId', 'u', receivedAt);

/** Parse an `onPersonnelLocationUpdated` payload (object or JSON string). Returns null for anything unusable. */
export const parsePersonnelLocationUpdate = (payload: unknown, receivedAt: number = Date.now()): LiveLocation | null => parseLocationUpdate(payload, 'userId', 'p', receivedAt);

/**
 * Store a live location, keeping one entry per pin. An update whose fix is older than the stored one
 * is dropped (trackers replay buffered fixes and queue consumers can reorder); an update with an
 * unknown fix time always applies. Returns the same object when the update was dropped.
 */
export const mergeLiveLocation = (current: LiveLocations, update: LiveLocation): LiveLocations => {
  const existing = current[update.pinId];
  if (existing && existing.timestamp !== null && update.timestamp !== null && update.timestamp < existing.timestamp) {
    return current;
  }
  return { ...current, [update.pinId]: update };
};

/** Entries of `next` that are new or replaced relative to `previous`, or null when there are none. */
export const diffLiveLocations = (next: LiveLocations, previous: LiveLocations): LiveLocations | null => {
  let changed: LiveLocations | null = null;
  for (const [pinId, location] of Object.entries(next)) {
    if (previous[pinId] !== location) {
      changed = changed ?? {};
      changed[pinId] = location;
    }
  }
  return changed;
};

const isLiveLocationPin = (pin: MapMakerInfoData): boolean => pin.Type === LIVE_LOCATION_UNIT_PIN_TYPE || pin.Type === LIVE_LOCATION_PERSONNEL_PIN_TYPE;

/** Lower-cased ids of the pins a live location is allowed to move (units and personnel). */
export const getLiveLocationPinIds = (pins: MapMakerInfoData[]): Set<string> => {
  const pinIds = new Set<string>();
  for (const pin of pins) {
    if (isLiveLocationPin(pin)) {
      pinIds.add(String(pin.Id).toLowerCase());
    }
  }
  return pinIds;
};

/**
 * Move unit (Type 1) and personnel (Type 3) pins to their live locations. Pin ids are matched
 * case-insensitively; no pin is ever added and pins are never mutated.
 */
export const applyLiveLocations = (pins: MapMakerInfoData[], liveLocations: LiveLocations, options?: ApplyLiveLocationsOptions): ApplyLiveLocationsResult => {
  const receivedSince = options?.receivedSince;
  const candidates = new Map<string, LiveLocation>();
  for (const location of Object.values(liveLocations)) {
    if (receivedSince === undefined || location.receivedAt >= receivedSince) {
      candidates.set(location.pinId.toLowerCase(), location);
    }
  }
  if (candidates.size === 0) {
    return { pins, unknownPinIds: [] };
  }

  const matched = new Set<string>();
  let moved = false;
  const nextPins = pins.map((pin) => {
    if (!isLiveLocationPin(pin)) {
      return pin;
    }
    const pinId = String(pin.Id).toLowerCase();
    const location = candidates.get(pinId);
    if (!location) {
      return pin;
    }
    matched.add(pinId);
    if (pin.Latitude === location.latitude && pin.Longitude === location.longitude) {
      return pin;
    }
    moved = true;
    return { ...pin, Latitude: location.latitude, Longitude: location.longitude };
  });

  const unknownPinIds: string[] = [];
  candidates.forEach((_location, pinId) => {
    if (!matched.has(pinId)) {
      unknownPinIds.push(pinId);
    }
  });

  return { pins: moved ? nextPins : pins, unknownPinIds };
};
