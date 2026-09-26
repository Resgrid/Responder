import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { ShiftDayResultData } from '@/models/v4/shifts/shiftDayResultData';
import { ShiftResultData } from '@/models/v4/shifts/shiftResultData';
import { useShiftsStore } from '@/stores/shifts/store';

import { ShiftDetailsSheet } from '../shift-details-sheet';

jest.mock('@/api/shifts/shifts', () => new Proxy({}, { get: () => jest.fn().mockResolvedValue({ Data: [] }) }));
jest.mock('@/lib/logging', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } }));
jest.mock('@/lib/storage/clear-all-data', () => ({ registerStoreReset: jest.fn() }));

const mockTrackEvent = jest.fn();
jest.mock('@/hooks/use-analytics', () => ({ useAnalytics: () => ({ trackEvent: mockTrackEvent }) }));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => (options ? `${key}:${Object.values(options).map(String).join('|')}` : key),
  }),
}));

jest.mock('lucide-react-native', () => {
  const React = require('react');
  const { View } = require('react-native');
  const icon = React.forwardRef((props: Record<string, unknown>, ref: unknown) => React.createElement(View, { ...props, ref }));
  return new Proxy({}, { get: () => icon });
});

const day = (id: string, date: string): ShiftDayResultData => ({ ...new ShiftDayResultData(), ShiftDayId: id, ShiftName: 'PMRT Night', ShiftDay: `${date}T00:00:00`, Start: `${date}T19:00:00`, End: `${date}T23:00:00` });

const shift: ShiftResultData = {
  ...new ShiftResultData(),
  ShiftId: '1',
  Name: 'PMRT Night',
  Code: 'PN',
  ScheduleType: 2,
  AssignmentType: 1,
  InShift: true,
  PersonnelCount: 8,
  GroupCount: 2,
  StartTime: '19:00',
  EndTime: '07:00',
  RequireApproval: true,
  Groups: [
    { GroupId: '3', GroupName: 'North Team', Roles: [{ RoleId: '1', RoleName: 'Clinician', Required: 2 }] },
    { GroupId: '4', GroupName: 'South Team', Roles: [] },
  ],
  Days: [day('old', '2000-01-01'), day('future', '2099-01-01')],
};

describe('ShiftDetailsSheet', () => {
  const selectShiftDay = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useShiftsStore.setState({ selectedShift: shift, isShiftLoading: false, selectShiftDay });
  });

  it('renders nothing without a selected shift', () => {
    useShiftsStore.setState({ selectedShift: null });
    render(<ShiftDetailsSheet isOpen={true} onClose={jest.fn()} onViewCalendar={jest.fn()} />);
    expect(screen.queryByTestId('shift-details-sheet')).toBeNull();
  });

  it('translates the schedule and assignment types (no hardcoded English)', () => {
    render(<ShiftDetailsSheet isOpen={true} onClose={jest.fn()} onViewCalendar={jest.fn()} />);
    expect(screen.getByText('shifts.schedule_type.twenty_four_forty_eight')).toBeTruthy();
    expect(screen.getByText('shifts.assignment_type.signup')).toBeTruthy();
    expect(screen.queryByText('Manual')).toBeNull();
    expect(screen.queryByText('Required')).toBeNull();
  });

  it('shows hours, approval requirement and group role requirements', () => {
    render(<ShiftDetailsSheet isOpen={true} onClose={jest.fn()} onViewCalendar={jest.fn()} />);
    expect(screen.getByText('19:00 – 07:00')).toBeTruthy();
    expect(screen.getByText('shifts.approval_required')).toBeTruthy();
    expect(screen.getByText('North Team')).toBeTruthy();
    expect(screen.getByText('shifts.required_count:2')).toBeTruthy();
    expect(screen.getByText('shifts.day.no_role_requirements')).toBeTruthy();
  });

  it('lists only upcoming days and opens one', () => {
    render(<ShiftDetailsSheet isOpen={true} onClose={jest.fn()} onViewCalendar={jest.fn()} />);
    expect(screen.queryByTestId('shift-day-card-old')).toBeNull();
    fireEvent.press(screen.getByTestId('shift-day-card-future'));
    expect(selectShiftDay).toHaveBeenCalledWith(shift.Days[1]);
  });

  it('opens this shift in the calendar', () => {
    const onViewCalendar = jest.fn();
    render(<ShiftDetailsSheet isOpen={true} onClose={jest.fn()} onViewCalendar={onViewCalendar} />);
    fireEvent.press(screen.getByTestId('shift-details-view-calendar'));
    expect(onViewCalendar).toHaveBeenCalledWith('1');
  });

  it('tracks a view when opened', () => {
    render(<ShiftDetailsSheet isOpen={true} onClose={jest.fn()} onViewCalendar={jest.fn()} />);
    expect(mockTrackEvent).toHaveBeenCalledWith('shift_details_sheet_viewed', expect.objectContaining({ shiftId: '1' }));
  });
});
