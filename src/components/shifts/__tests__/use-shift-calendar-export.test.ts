import { act, renderHook } from '@testing-library/react-native';

import { addShiftDaysToCalendar } from '@/lib/shift-calendar';
import { ShiftDayResultData } from '@/models/v4/shifts/shiftDayResultData';
import { ShiftAssignmentType, ShiftDayMyStatus } from '@/models/v4/shifts/shiftEnums';

import { useShiftCalendarExport } from '../use-shift-calendar-export';

jest.mock('@/lib/shift-calendar', () => ({ addShiftDaysToCalendar: jest.fn() }));
jest.mock('@/hooks/use-analytics', () => ({ useAnalytics: () => ({ trackEvent: jest.fn() }) }));
const mockShowToast = jest.fn();
jest.mock('@/stores/toast/store', () => ({ useToastStore: (selector: (state: { showToast: jest.Mock }) => unknown) => selector({ showToast: mockShowToast }) }));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => (options ? `${key}:${Object.values(options).map(String).join('|')}` : key),
  }),
}));

const mockAdd = addShiftDaysToCalendar as jest.Mock;

const makeDay = (overrides: Partial<ShiftDayResultData> = {}): ShiftDayResultData => ({
  ...new ShiftDayResultData(),
  ShiftDayId: '100',
  ShiftName: 'Engine Day',
  Start: '2099-09-24T07:00:00',
  End: '2099-09-24T19:00:00',
  MyStatus: ShiftDayMyStatus.OnRoster,
  ...overrides,
});

describe('useShiftCalendarExport', () => {
  beforeEach(() => jest.clearAllMocks());

  it('skips days I am not confirmed on and says so when nothing is left', async () => {
    const { result } = renderHook(() => useShiftCalendarExport());

    await act(async () => {
      await result.current.addToCalendar([makeDay({ MyStatus: ShiftDayMyStatus.PendingApproval })]);
    });

    expect(mockAdd).not.toHaveBeenCalled();
    expect(mockShowToast).toHaveBeenCalledWith('info', 'shifts.calendar_export.nothing_to_add');
  });

  it('describes the event with the shift, the unit and where it came from', async () => {
    mockAdd.mockResolvedValue({ added: 1, updated: 0, failed: 0, denied: false });
    const { result } = renderHook(() => useShiftCalendarExport());
    const workshift = makeDay({ ShiftType: ShiftAssignmentType.Workshift, MyUnitName: 'Engine 1' });

    await act(async () => {
      await result.current.addToCalendar([workshift, makeDay({ ShiftDayId: '101', MyStatus: ShiftDayMyStatus.None })]);
    });

    expect(mockAdd).toHaveBeenCalledWith([workshift], expect.any(Function));
    const describe = mockAdd.mock.calls[0][1] as (day: ShiftDayResultData) => { title: string; notes: string };
    expect(describe(workshift)).toEqual({
      title: 'shifts.calendar_export.event_title:Engine Day',
      notes: 'shifts.assignment_type.workshift\nshifts.calendar_export.event_place:Engine 1\nshifts.calendar_export.event_footer',
    });
    expect(mockShowToast).toHaveBeenCalledWith('success', 'shifts.calendar_export.added_one');
  });

  it('reports a refused permission and a bulk add', async () => {
    const { result } = renderHook(() => useShiftCalendarExport());

    mockAdd.mockResolvedValueOnce({ added: 0, updated: 0, failed: 0, denied: true });
    await act(async () => {
      await result.current.addToCalendar([makeDay()]);
    });
    expect(mockShowToast).toHaveBeenLastCalledWith('error', 'shifts.calendar_export.permission_denied');

    mockAdd.mockResolvedValueOnce({ added: 1, updated: 1, failed: 0, denied: false });
    await act(async () => {
      await result.current.addToCalendar([makeDay(), makeDay({ ShiftDayId: '101' })]);
    });
    expect(mockShowToast).toHaveBeenLastCalledWith('success', 'shifts.calendar_export.added_many:2');
  });
});
