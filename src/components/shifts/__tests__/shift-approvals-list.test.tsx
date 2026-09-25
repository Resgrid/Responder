import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { OnDutyPersonResultData } from '@/models/v4/shifts/onDutyPersonResultData';
import { PendingShiftSignupResultData } from '@/models/v4/shifts/pendingShiftSignupResultData';
import { ShiftRosterSource, ShiftTradeStatus } from '@/models/v4/shifts/shiftEnums';
import { ShiftTradeResultData } from '@/models/v4/shifts/shiftTradeResultData';

import { ShiftApprovalsList } from '../shift-approvals-list';
import { ShiftOnDutyList } from '../shift-on-duty-list';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => (options ? `${key}:${Object.values(options).map(String).join('|')}` : key),
  }),
}));

// The shared FlatList mock only accepts component types for its slots; these lists pass elements.
jest.mock('@/components/ui/flat-list', () => {
  const React = require('react');
  const { View } = require('react-native');
  const slot = (value: unknown) => (value ? (React.isValidElement(value) ? value : React.createElement(value as React.ComponentType)) : null);
  const FlatList = ({ data, renderItem, keyExtractor, ListHeaderComponent, ListEmptyComponent, testID }: { data: unknown[]; renderItem: (info: { item: unknown; index: number }) => React.ReactNode; keyExtractor: (item: unknown, index: number) => string; ListHeaderComponent?: unknown; ListEmptyComponent?: unknown; testID?: string }) =>
    React.createElement(
      View,
      { testID },
      slot(ListHeaderComponent),
      data.length === 0 ? slot(ListEmptyComponent) : data.map((item, index) => React.createElement(React.Fragment, { key: keyExtractor(item, index) }, renderItem({ item, index })))
    );
  return { FlatList };
});

jest.mock('lucide-react-native', () => {
  const React = require('react');
  const { View } = require('react-native');
  const icon = React.forwardRef((props: Record<string, unknown>, ref: unknown) => React.createElement(View, { ...props, ref }));
  return new Proxy({}, { get: () => icon });
});

const signup: PendingShiftSignupResultData = {
  ...new PendingShiftSignupResultData(),
  ShiftSignupId: '44',
  UserName: 'Sam Lee',
  ShiftName: 'PMRT Night',
  GroupName: 'North Team',
  ShiftDay: '2026-09-24T00:00:00',
  Start: '2026-09-24T19:00:00',
  End: '2026-09-25T07:00:00',
  Roles: ['Clinician'],
  SignupTimestamp: '2026-09-20T12:00:00Z',
};

const trade: ShiftTradeResultData = { ...new ShiftTradeResultData(), ShiftSignupTradeId: '5', ShiftName: 'PMRT Night', Status: ShiftTradeStatus.PendingApproval, CanReview: true, SourceUserName: 'Alex', AcceptedUserName: 'Casey' };

describe('ShiftApprovalsList', () => {
  const onAction = jest.fn();

  beforeEach(() => jest.clearAllMocks());

  it('shows the empty state', () => {
    render(<ShiftApprovalsList signups={[]} trades={[]} isLoading={false} onRefresh={jest.fn()} onAction={onAction} />);
    expect(screen.getByText('shifts.empty.approvals_title')).toBeTruthy();
  });

  it('lists pending sign-ups and trades under their own headings', () => {
    render(<ShiftApprovalsList signups={[signup]} trades={[trade]} isLoading={false} onRefresh={jest.fn()} onAction={onAction} />);
    expect(screen.getByText('shifts.approvals.signups')).toBeTruthy();
    expect(screen.getByText('shifts.approvals.trades')).toBeTruthy();
    expect(screen.getByTestId('pending-signup-44')).toBeTruthy();
    expect(screen.getByTestId('trade-card-5')).toBeTruthy();
    expect(screen.getByText('Clinician')).toBeTruthy();
  });

  it('asks to approve or deny a sign-up', () => {
    render(<ShiftApprovalsList signups={[signup]} trades={[]} isLoading={false} onRefresh={jest.fn()} onAction={onAction} />);
    fireEvent.press(screen.getByTestId('pending-signup-approve-44'));
    expect(onAction).toHaveBeenLastCalledWith({ kind: 'review-signup', signup, approve: true });
    fireEvent.press(screen.getByTestId('pending-signup-deny-44'));
    expect(onAction).toHaveBeenLastCalledWith({ kind: 'review-signup', signup, approve: false });
  });

  it('asks to approve or deny a trade', () => {
    render(<ShiftApprovalsList signups={[]} trades={[trade]} isLoading={false} onRefresh={jest.fn()} onAction={onAction} />);
    fireEvent.press(screen.getByTestId('trade-approve-5'));
    expect(onAction).toHaveBeenLastCalledWith({ kind: 'review-trade', trade, approve: true });
  });
});

describe('ShiftOnDutyList', () => {
  const person = (overrides: Partial<OnDutyPersonResultData>): OnDutyPersonResultData => ({
    ...new OnDutyPersonResultData(),
    ShiftId: '1',
    ShiftName: 'PMRT Night',
    ShiftDayId: '100',
    Start: '2026-09-24T19:00:00',
    End: '2026-09-25T07:00:00',
    ...overrides,
  });

  it('shows the empty state', () => {
    render(<ShiftOnDutyList personnel={[]} isLoading={false} onRefresh={jest.fn()} />);
    expect(screen.getByText('shifts.empty.on_duty_title')).toBeTruthy();
  });

  it('groups people by running shift with their source', () => {
    render(
      <ShiftOnDutyList
        personnel={[
          person({ UserId: 'a', Name: 'Alex', GroupName: 'North', Roles: ['Clinician'], Source: ShiftRosterSource.Assigned }),
          person({ UserId: 'b', Name: 'Casey', Source: ShiftRosterSource.Trade }),
          person({ UserId: 'c', Name: 'Dana', ShiftId: '2', ShiftName: 'MCOT Day', ShiftDayId: '200', Source: ShiftRosterSource.SupervisorAssigned }),
        ]}
        isLoading={false}
        onRefresh={jest.fn()}
      />
    );

    expect(screen.getByText('PMRT Night')).toBeTruthy();
    expect(screen.getByText('MCOT Day')).toBeTruthy();
    expect(screen.getByText('shifts.on_duty.count:2')).toBeTruthy();
    expect(screen.getByText('North · Clinician')).toBeTruthy();
    expect(screen.getByText('shifts.roster_source.scheduled')).toBeTruthy();
    expect(screen.getByText('shifts.roster_source.trade')).toBeTruthy();
    expect(screen.getByText('shifts.roster_source.supervisor')).toBeTruthy();
    expect(screen.getAllByText('shifts.on_duty.until:7:00 AM')).toHaveLength(3);
  });
});
