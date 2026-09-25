import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { ShiftResultData } from '@/models/v4/shifts/shiftResultData';

import { ShiftCard } from '../shift-card';

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

describe('ShiftCard', () => {
  const shift: ShiftResultData = {
    ...new ShiftResultData(),
    ShiftId: '1',
    Name: 'PMRT Night',
    Code: 'PN',
    ScheduleType: 1,
    AssignmentType: 0,
    InShift: true,
    PersonnelCount: 8,
    GroupCount: 2,
    StartTime: '19:00',
    EndTime: '07:00',
    RequireApproval: true,
    NextDay: '2026-09-24T00:00:00',
  };

  it('translates schedule and assignment types and shows hours', () => {
    render(<ShiftCard shift={shift} onPress={jest.fn()} />);
    expect(screen.getByText('shifts.schedule_type.manual')).toBeTruthy();
    expect(screen.getByText('shifts.assignment_type.assigned')).toBeTruthy();
    expect(screen.getByText('19:00 – 07:00')).toBeTruthy();
    expect(screen.getByText('shifts.in_shift')).toBeTruthy();
    expect(screen.getByText('shifts.approval_required')).toBeTruthy();
  });

  it('falls back to unknown for an unrecognised type', () => {
    render(<ShiftCard shift={{ ...shift, ScheduleType: 42, AssignmentType: 9 }} onPress={jest.fn()} />);
    expect(screen.getAllByText('shifts.unknown')).toHaveLength(2);
  });

  it('passes the shift to onPress', () => {
    const onPress = jest.fn();
    render(<ShiftCard shift={shift} onPress={onPress} />);
    fireEvent.press(screen.getByTestId('shift-card-1'));
    expect(onPress).toHaveBeenCalledWith(shift);
  });
});
