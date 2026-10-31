import * as Calendar from 'expo-calendar/legacy';
import { Platform } from 'react-native';

import { logger } from '@/lib/logging';
import { isWorkshiftDay, parseWallClock } from '@/lib/shift-utils';
import { storage } from '@/lib/storage';
import { type ShiftDayResultData } from '@/models/v4/shifts/shiftDayResultData';

const EVENT_IDS_KEY = 'SHIFT_CALENDAR_EVENT_IDS';
const CALENDAR_ID_KEY = 'SHIFT_CALENDAR_ID';
const OFFSET_SUFFIX = /(Z|[+-]\d{2}:?\d{2})$/i;
const REMINDER_MINUTES_BEFORE = 60;

/** The device calendar the app keeps shifts in, so they are easy to find, hide or remove together. */
export const SHIFT_CALENDAR_TITLE = 'Resgrid Shifts';
const SHIFT_CALENDAR_COLOR = '#2a7dd5';

export interface ShiftCalendarEventText {
  title: string;
  notes: string;
}

export interface ShiftCalendarExportResult {
  added: number;
  updated: number;
  failed: number;
  /** The user refused calendar access (nothing was written). */
  denied: boolean;
}

/** One entry per shift day; static shift days have GUID ids of their own. */
export const getShiftCalendarKey = (day: Pick<ShiftDayResultData, 'ShiftDayId' | 'ShiftType'>): string => `${isWorkshiftDay(day) ? 'w' : 's'}:${day.ShiftDayId}`;

/**
 * The real instant of a shift time. `StartUtc` / `EndUtc` are exact; servers that do not send them
 * leave the department wall-clock time, read as device-local (right when the device is in the
 * department's time zone, which is the usual case).
 */
export const toShiftInstant = (utc: string | null | undefined, wallClock: string | null | undefined): Date | null => {
  if (utc && !utc.startsWith('0001-')) {
    const value = utc.trim();
    const parsed = new Date(OFFSET_SUFFIX.test(value) ? value : `${value}Z`);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  return parseWallClock(wallClock);
};

const readEventIds = (): Record<string, string> => {
  try {
    const raw = storage.getString(EVENT_IDS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, string>) : {};
  } catch (error) {
    logger.warn({ message: 'Shift calendar event ids unreadable; starting fresh', context: { error } });
    return {};
  }
};

const writeEventIds = (ids: Record<string, string>): void => {
  try {
    storage.set(EVENT_IDS_KEY, JSON.stringify(ids));
  } catch (error) {
    logger.error({ message: 'Failed to save shift calendar event ids', context: { error } });
  }
};

/** The day has been added to the device calendar from this device. */
export const isShiftDayInCalendar = (day: Pick<ShiftDayResultData, 'ShiftDayId' | 'ShiftType'>): boolean => !!readEventIds()[getShiftCalendarKey(day)];

const ensureCalendarAccess = async (): Promise<boolean> => {
  const current = await Calendar.getCalendarPermissionsAsync();
  if (current.granted) {
    return true;
  }
  if (!current.canAskAgain) {
    return false;
  }
  const requested = await Calendar.requestCalendarPermissionsAsync();
  return requested.granted;
};

const createShiftCalendar = async (): Promise<string> => {
  if (Platform.OS === 'ios') {
    const defaultCalendar = await Calendar.getDefaultCalendarAsync();
    return Calendar.createCalendarAsync({
      title: SHIFT_CALENDAR_TITLE,
      color: SHIFT_CALENDAR_COLOR,
      entityType: Calendar.EntityTypes.EVENT,
      sourceId: defaultCalendar.source.id,
      source: defaultCalendar.source,
      name: SHIFT_CALENDAR_TITLE,
      ownerAccount: 'personal',
      accessLevel: Calendar.CalendarAccessLevel.OWNER,
    });
  }
  return Calendar.createCalendarAsync({
    title: SHIFT_CALENDAR_TITLE,
    color: SHIFT_CALENDAR_COLOR,
    entityType: Calendar.EntityTypes.EVENT,
    source: { isLocalAccount: true, name: SHIFT_CALENDAR_TITLE, type: Calendar.SourceType.LOCAL },
    name: SHIFT_CALENDAR_TITLE,
    ownerAccount: SHIFT_CALENDAR_TITLE,
    accessLevel: Calendar.CalendarAccessLevel.OWNER,
  });
};

/** The app's own calendar (found again or created), falling back to the default writable one. */
const getShiftCalendarId = async (): Promise<string | null> => {
  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const storedId = storage.getString(CALENDAR_ID_KEY);
  const existing = calendars.find((calendar) => calendar.id === storedId) ?? calendars.find((calendar) => calendar.title === SHIFT_CALENDAR_TITLE && calendar.allowsModifications);

  if (existing) {
    storage.set(CALENDAR_ID_KEY, existing.id);
    return existing.id;
  }

  try {
    const created = await createShiftCalendar();
    storage.set(CALENDAR_ID_KEY, created);
    return created;
  } catch (error) {
    // Some accounts (managed devices, iCloud-only setups) refuse new calendars; use one that takes events.
    logger.warn({ message: 'Could not create the shift calendar; using a writable one', context: { error } });
    const writable = calendars.find((calendar) => calendar.allowsModifications && calendar.isPrimary) ?? calendars.find((calendar) => calendar.allowsModifications);
    return writable?.id ?? null;
  }
};

/** Event fields for a day, or null when its times cannot be read. */
export const buildShiftCalendarEvent = (day: ShiftDayResultData, text: ShiftCalendarEventText) => {
  const startDate = toShiftInstant(day.StartUtc, day.Start);
  const endDate = toShiftInstant(day.EndUtc, day.End);

  if (!startDate || !endDate || endDate.getTime() <= startDate.getTime()) {
    return null;
  }

  return {
    title: text.title,
    notes: text.notes,
    startDate,
    endDate,
    // Android requires a zone; the instants are absolute, so the device's only decides how they display.
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    alarms: [{ relativeOffset: -REMINDER_MINUTES_BEFORE }],
  };
};

const eventStillExists = async (eventId: string): Promise<boolean> => {
  try {
    const event = await Calendar.getEventAsync(eventId);
    return !!event?.id;
  } catch {
    return false;
  }
};

/**
 * Adds the days to the device calendar, or updates the events added for them before (a changed time
 * or a re-add never duplicates). Calendar access is asked for once, the first time.
 */
export const addShiftDaysToCalendar = async (days: ShiftDayResultData[], describe: (day: ShiftDayResultData) => ShiftCalendarEventText): Promise<ShiftCalendarExportResult> => {
  const result: ShiftCalendarExportResult = { added: 0, updated: 0, failed: 0, denied: false };

  if (!(await ensureCalendarAccess())) {
    return { ...result, denied: true };
  }

  const calendarId = await getShiftCalendarId();
  if (!calendarId) {
    return { ...result, failed: days.length };
  }

  const eventIds = readEventIds();

  for (const day of days) {
    const details = buildShiftCalendarEvent(day, describe(day));
    if (!details) {
      result.failed++;
      continue;
    }

    const key = getShiftCalendarKey(day);
    try {
      const existingId = eventIds[key];
      if (existingId && (await eventStillExists(existingId))) {
        await Calendar.updateEventAsync(existingId, details);
        result.updated++;
      } else {
        eventIds[key] = await Calendar.createEventAsync(calendarId, details);
        result.added++;
      }
    } catch (error) {
      result.failed++;
      logger.error({ message: 'Failed to add a shift to the device calendar', context: { error, key } });
    }
  }

  writeEventIds(eventIds);
  return result;
};
