import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { ShiftDayResultData } from '@/models/v4/shifts/shiftDayResultData';
import { ShiftDayMyStatus } from '@/models/v4/shifts/shiftEnums';

import { ShiftDayCard } from '../shift-day-card';

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

const makeDay = (overrides: Partial<ShiftDayResultData> = {}): ShiftDayResultData => ({
  ...new ShiftDayResultData(),
  ShiftId: '1',
  ShiftName: 'PMRT Night',
  ShiftDayId: '100',
  ShiftDay: '2026-09-24T00:00:00',
  Start: '2026-09-24T19:00:00',
  End: '2026-09-25T07:00:00',
  ShiftType: 1,
  OpenSlots: 2,
  ...overrides,
});

describe('ShiftDayCard', () => {
  it('shows the wall-clock time range with an overnight marker and open slots', () => {
    render(<ShiftDayCard shiftDay={makeDay()} onPress={jest.fn()} />);

    expect(screen.getByText('PMRT Night')).toBeTruthy();
    expect(screen.getByText('Thu, Sep 24, 2026')).toBeTruthy();
    expect(screen.getByText('7:00 PM – 7:00 AM shifts.overnight')).toBeTruthy();
    expect(screen.getByText('shifts.status.open_slots:2')).toBeTruthy();
    expect(screen.getByText('shifts.assignment_type.signup')).toBeTruthy();
  });

  it('shows fully staffed, active now, my status and a pending trade', () => {
    render(<ShiftDayCard shiftDay={makeDay({ Filled: true, IsActive: true, MyStatus: ShiftDayMyStatus.OnRoster, MyTradeId: '5' })} onPress={jest.fn()} />);

    expect(screen.getByText('shifts.status.filled')).toBeTruthy();
    expect(screen.getByTestId('shift-day-active-badge')).toBeTruthy();
    expect(screen.getByText('shifts.status.on_roster')).toBeTruthy();
    expect(screen.getByTestId('shift-day-trade-badge')).toBeTruthy();
  });

  it('marks a pending sign-up and approval-required shifts', () => {
    render(<ShiftDayCard shiftDay={makeDay({ MyStatus: ShiftDayMyStatus.PendingApproval, RequireApproval: true })} onPress={jest.fn()} />);
    expect(screen.getByText('shifts.status.pending_approval')).toBeTruthy();
    expect(screen.getByText('shifts.approval_required')).toBeTruthy();
  });

  it('passes the day to onPress and describes itself to screen readers', () => {
    const onPress = jest.fn();
    const day = makeDay({ IsActive: true });
    render(<ShiftDayCard shiftDay={day} onPress={onPress} />);

    const card = screen.getByTestId('shift-day-card-100');
    expect(card.props.accessibilityRole).toBe('button');
    expect(card.props.accessibilityLabel).toContain('PMRT Night');
    expect(card.props.accessibilityLabel).toContain('shifts.status.active_now');
    expect(card.props.accessibilityHint).toBe('shifts.card_a11y_hint');

    fireEvent.press(card);
    expect(onPress).toHaveBeenCalledWith(day);
  });
});
