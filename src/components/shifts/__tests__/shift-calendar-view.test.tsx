import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { ShiftDayResultData } from '@/models/v4/shifts/shiftDayResultData';
import { ShiftDayMyStatus } from '@/models/v4/shifts/shiftEnums';

import { ShiftCalendarView, summarizeShiftDaysByDate } from '../shift-calendar-view';
import { ShiftSegmentBar } from '../shift-segment-bar';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => (options ? `${key}:${Object.values(options).map(String).join('|')}` : key),
    i18n: { language: 'en' },
  }),
}));

jest.mock('lucide-react-native', () => {
  const React = require('react');
  const { View } = require('react-native');
  const icon = React.forwardRef((props: Record<string, unknown>, ref: unknown) => React.createElement(View, { ...props, ref }));
  return new Proxy({}, { get: () => icon });
});

const day = (overrides: Partial<ShiftDayResultData>): ShiftDayResultData => ({ ...new ShiftDayResultData(), ...overrides });

describe('summarizeShiftDaysByDate', () => {
  it('groups by the wall-clock date and sums open slots of unfilled days', () => {
    const summary = summarizeShiftDaysByDate([
      day({ ShiftDayId: '1', ShiftDay: '2026-09-24T00:00:00', OpenSlots: 2 }),
      day({ ShiftDayId: '2', ShiftDay: '2026-09-24T00:00:00', OpenSlots: 0, Filled: true, MyStatus: ShiftDayMyStatus.OnRoster }),
      day({ ShiftDayId: '3', ShiftDay: '2026-09-25T00:00:00', Filled: true }),
    ]);

    expect(summary.get('2026-09-24')).toEqual({ count: 2, openSlots: 2, hasMine: true, allFilled: false });
    expect(summary.get('2026-09-25')).toEqual({ count: 1, openSlots: 0, hasMine: false, allFilled: true });
  });
});

describe('ShiftCalendarView', () => {
  const month = new Date(2026, 8, 15);

  it('lays out the month with a leading offset and marks my shifts and open slots', () => {
    render(
      <ShiftCalendarView
        month={month}
        days={[day({ ShiftDay: '2026-09-24T00:00:00', OpenSlots: 1 }), day({ ShiftDay: '2026-09-10T00:00:00', MyStatus: ShiftDayMyStatus.PendingApproval, Filled: true })]}
        selectedDate={null}
        isLoading={false}
        onMonthChange={jest.fn()}
        onSelectDate={jest.fn()}
      />
    );

    expect(screen.getByTestId('shift-calendar-day-2026-09-01')).toBeTruthy();
    expect(screen.getByTestId('shift-calendar-day-2026-09-30')).toBeTruthy();
    expect(screen.queryByTestId('shift-calendar-day-2026-10-01')).toBeNull();
    expect(screen.getByTestId('shift-calendar-open-2026-09-24')).toBeTruthy();
    expect(screen.getByTestId('shift-calendar-mine-2026-09-10')).toBeTruthy();
    expect(screen.getByText('calendar.daysOfWeek.sun')).toBeTruthy();
  });

  it('describes each day for screen readers and selects it', () => {
    const onSelectDate = jest.fn();
    render(<ShiftCalendarView month={month} days={[day({ ShiftDay: '2026-09-24T00:00:00', OpenSlots: 3 })]} selectedDate="2026-09-24" isLoading={false} onMonthChange={jest.fn()} onSelectDate={onSelectDate} />);

    const cell = screen.getByTestId('shift-calendar-day-2026-09-24');
    expect(cell.props.accessibilityState).toEqual({ selected: true });
    expect(cell.props.accessibilityLabel).toBe('shifts.calendar_view.day_a11y:Thursday, September 24, 2026|1|3');

    fireEvent.press(cell);
    expect(onSelectDate).toHaveBeenCalledWith('2026-09-24');
  });

  it('moves between months and shows a loading indicator', () => {
    const onMonthChange = jest.fn();
    render(<ShiftCalendarView month={month} days={[]} selectedDate={null} isLoading={true} onMonthChange={onMonthChange} onSelectDate={jest.fn()} />);

    expect(screen.getByTestId('shift-calendar-loading')).toBeTruthy();
    fireEvent.press(screen.getByTestId('shift-calendar-next'));
    expect((onMonthChange.mock.calls[0]![0] as Date).getMonth()).toBe(9);
    fireEvent.press(screen.getByTestId('shift-calendar-previous'));
    expect((onMonthChange.mock.calls[1]![0] as Date).getMonth()).toBe(7);
  });
});

describe('ShiftSegmentBar', () => {
  it('marks the active tab and shows a pending count', () => {
    const onChange = jest.fn();
    render(
      <ShiftSegmentBar
        segments={[
          { key: 'today', label: 'Today' },
          { key: 'approvals', label: 'Approvals', badge: 3 },
        ]}
        active="today"
        onChange={onChange}
      />
    );

    expect(screen.getByTestId('shifts-segment-today').props.accessibilityState).toEqual({ selected: true });
    expect(screen.getByTestId('shifts-segment-approvals').props.accessibilityRole).toBe('tab');
    expect(screen.getByTestId('shifts-segment-approvals').props.accessibilityLabel).toBe('shifts.segments.with_count:Approvals|3');
    expect(screen.getByTestId('shifts-segment-badge-approvals')).toBeTruthy();

    fireEvent.press(screen.getByTestId('shifts-segment-approvals'));
    expect(onChange).toHaveBeenCalledWith('approvals');
  });
});
