import * as Calendar from 'expo-calendar/legacy';

import { addShiftDaysToCalendar, buildShiftCalendarEvent, getShiftCalendarKey, isShiftDayInCalendar, SHIFT_CALENDAR_TITLE, toShiftInstant } from '@/lib/shift-calendar';
import { storage } from '@/lib/storage';
import { ShiftAssignmentType, ShiftDayMyStatus } from '@/models/v4/shifts/shiftEnums';
import { type ShiftDayResultData } from '@/models/v4/shifts/shiftDayResultData';

jest.mock('@/lib/logging', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } }));

const mockCalendar = Calendar as jest.Mocked<typeof Calendar>;

const day = (overrides: Partial<ShiftDayResultData> = {}): ShiftDayResultData =>
  ({
    ShiftId: '1',
    ShiftName: 'A Shift',
    ShiftDayId: '55',
    ShiftDay: '2026-11-03T00:00:00',
    Start: '2026-11-03T07:00:00',
    End: '2026-11-03T19:00:00',
    StartUtc: '2026-11-03T12:00:00Z',
    EndUtc: '2026-11-04T00:00:00Z',
    ShiftType: ShiftAssignmentType.Assigned,
    MyStatus: ShiftDayMyStatus.OnRoster,
    Roster: [],
    Needs: [],
    Signups: [],
    ...overrides,
  }) as ShiftDayResultData;

const describeDay = (value: ShiftDayResultData) => ({ title: value.ShiftName, notes: 'notes' });

describe('shift calendar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    storage.delete('SHIFT_CALENDAR_EVENT_IDS');
    storage.delete('SHIFT_CALENDAR_ID');
    mockCalendar.getCalendarPermissionsAsync.mockResolvedValue({ granted: true, canAskAgain: true, status: 'granted', expires: 'never' } as never);
    mockCalendar.getCalendarsAsync.mockResolvedValue([]);
    mockCalendar.createCalendarAsync.mockResolvedValue('shift-calendar');
    mockCalendar.createEventAsync.mockResolvedValue('event-1');
    mockCalendar.getEventAsync.mockImplementation(async (id: string) => ({ id }) as never);
  });

  it('reads UTC instants with or without a Z, and falls back to the wall clock', () => {
    expect(toShiftInstant('2026-11-03T12:00:00', '2026-11-03T07:00:00')?.toISOString()).toBe('2026-11-03T12:00:00.000Z');
    expect(toShiftInstant('2026-11-03T12:00:00Z', null)?.toISOString()).toBe('2026-11-03T12:00:00.000Z');
    // An older server's DateTime.MinValue means "not sent".
    expect(toShiftInstant('0001-01-01T00:00:00', '2026-11-03T07:00:00')).toEqual(new Date(2026, 10, 3, 7, 0, 0));
    expect(toShiftInstant(undefined, undefined)).toBeNull();
  });

  it('keeps static shift days apart from shift days with the same id', () => {
    expect(getShiftCalendarKey(day())).toBe('s:55');
    expect(getShiftCalendarKey(day({ ShiftType: ShiftAssignmentType.Workshift }))).toBe('w:55');
  });

  it('builds an event with a reminder and refuses unreadable times', () => {
    const event = buildShiftCalendarEvent(day(), describeDay(day()));
    expect(event).toMatchObject({ title: 'A Shift', notes: 'notes', alarms: [{ relativeOffset: -60 }] });
    expect(event?.startDate.toISOString()).toBe('2026-11-03T12:00:00.000Z');
    expect(event?.endDate.toISOString()).toBe('2026-11-04T00:00:00.000Z');

    expect(buildShiftCalendarEvent(day({ StartUtc: '', EndUtc: '', Start: '', End: '' }), describeDay(day()))).toBeNull();
  });

  it('creates the shifts calendar once and the event, then updates it instead of duplicating', async () => {
    const first = await addShiftDaysToCalendar([day()], describeDay);

    expect(first).toEqual({ added: 1, updated: 0, failed: 0, denied: false });
    expect(mockCalendar.createCalendarAsync).toHaveBeenCalledWith(expect.objectContaining({ title: SHIFT_CALENDAR_TITLE }));
    expect(mockCalendar.createEventAsync).toHaveBeenCalledWith('shift-calendar', expect.objectContaining({ title: 'A Shift' }));
    expect(isShiftDayInCalendar(day())).toBe(true);

    mockCalendar.getCalendarsAsync.mockResolvedValue([{ id: 'shift-calendar', title: SHIFT_CALENDAR_TITLE, allowsModifications: true } as never]);
    const second = await addShiftDaysToCalendar([day({ End: '2026-11-03T20:00:00', EndUtc: '2026-11-04T01:00:00Z' })], describeDay);

    expect(second).toEqual({ added: 0, updated: 1, failed: 0, denied: false });
    expect(mockCalendar.createCalendarAsync).toHaveBeenCalledTimes(1);
    expect(mockCalendar.updateEventAsync).toHaveBeenCalledWith('event-1', expect.objectContaining({ endDate: new Date('2026-11-04T01:00:00Z') }));
  });

  it('adds the event again when the user deleted it from their calendar', async () => {
    await addShiftDaysToCalendar([day()], describeDay);
    mockCalendar.getEventAsync.mockRejectedValue(new Error('gone'));
    mockCalendar.createEventAsync.mockResolvedValue('event-2');

    const result = await addShiftDaysToCalendar([day()], describeDay);

    expect(result.added).toBe(1);
    expect(mockCalendar.updateEventAsync).not.toHaveBeenCalled();
  });

  it('writes nothing when calendar access is refused', async () => {
    mockCalendar.getCalendarPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: true, status: 'undetermined', expires: 'never' } as never);
    mockCalendar.requestCalendarPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: false, status: 'denied', expires: 'never' } as never);

    const result = await addShiftDaysToCalendar([day()], describeDay);

    expect(result).toEqual({ added: 0, updated: 0, failed: 0, denied: true });
    expect(mockCalendar.createEventAsync).not.toHaveBeenCalled();
    expect(isShiftDayInCalendar(day())).toBe(false);
  });

  it('falls back to a writable calendar when one cannot be created', async () => {
    mockCalendar.getCalendarsAsync.mockResolvedValue([
      { id: 'read-only', title: 'Holidays', allowsModifications: false } as never,
      { id: 'personal', title: 'Personal', allowsModifications: true, isPrimary: true } as never,
    ]);
    mockCalendar.createCalendarAsync.mockRejectedValue(new Error('not allowed'));

    await addShiftDaysToCalendar([day()], describeDay);

    expect(mockCalendar.createEventAsync).toHaveBeenCalledWith('personal', expect.anything());
  });
});
