import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { ShiftTradeDirection, ShiftTradeStatus, ShiftTradeUserState } from '@/models/v4/shifts/shiftEnums';
import { ShiftTradeResultData, ShiftTradeUserResultData } from '@/models/v4/shifts/shiftTradeResultData';

import { ShiftTradeCard } from '../shift-trade-card';
import { ShiftTradesList } from '../shift-trades-list';

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

const user = (overrides: Partial<ShiftTradeUserResultData>): ShiftTradeUserResultData => ({ ...new ShiftTradeUserResultData(), ...overrides });

const makeTrade = (overrides: Partial<ShiftTradeResultData> = {}): ShiftTradeResultData => ({
  ...new ShiftTradeResultData(),
  ShiftSignupTradeId: '5',
  ShiftName: 'PMRT Night',
  ShiftDayId: '100',
  ShiftDay: '2026-09-24T00:00:00',
  Start: '2026-09-24T19:00:00',
  End: '2026-09-25T07:00:00',
  GroupName: 'North Team',
  SourceUserName: 'Alex Kim',
  ...overrides,
});

describe('ShiftTradeCard', () => {
  const onAction = jest.fn();

  beforeEach(() => jest.clearAllMocks());

  it('lets me accept or decline an incoming trade that is waiting on me', () => {
    const trade = makeTrade({ Direction: ShiftTradeDirection.Incoming, MyState: ShiftTradeUserState.Open, Note: 'family event' });
    render(<ShiftTradeCard trade={trade} onAction={onAction} />);

    expect(screen.getByText('shifts.trade.incoming')).toBeTruthy();
    expect(screen.getByText('shifts.trade.from:Alex Kim')).toBeTruthy();
    expect(screen.getByText('shifts.trade.my_state.open')).toBeTruthy();

    fireEvent.press(screen.getByTestId('trade-accept-5'));
    expect(onAction).toHaveBeenLastCalledWith({ kind: 'accept-trade', trade });

    fireEvent.press(screen.getByTestId('trade-decline-5'));
    expect(onAction).toHaveBeenLastCalledWith({ kind: 'decline-trade', trade });
  });

  it('shows my state and no actions once I have answered', () => {
    render(<ShiftTradeCard trade={makeTrade({ Direction: ShiftTradeDirection.Incoming, MyState: ShiftTradeUserState.Proposed })} onAction={onAction} />);
    expect(screen.getByText('shifts.trade.my_state.proposed')).toBeTruthy();
    expect(screen.queryByTestId('trade-accept-5')).toBeNull();
  });

  it('lets the requester pick a straight give-away or a swap-back offer, or cancel', () => {
    const taker = user({ UserId: 'c1', Name: 'Casey', Offered: true });
    const swapper = user({ UserId: 'c2', Name: 'Drew', Offered: true, OfferedShifts: [{ ShiftSignupId: '70', ShiftName: 'PMRT Day', ShiftDay: '2026-10-02T00:00:00' }] });
    const decliner = user({ UserId: 'c3', Name: 'Eli', Declined: true, Reason: 'away' });
    const trade = makeTrade({ Direction: ShiftTradeDirection.Outgoing, Status: ShiftTradeStatus.Open, Users: [taker, swapper, decliner] });

    render(<ShiftTradeCard trade={trade} onAction={onAction} />);

    fireEvent.press(screen.getByTestId('trade-pick-5-c1'));
    expect(onAction).toHaveBeenLastCalledWith({ kind: 'finish-trade', trade, user: taker, offeredShift: null });

    fireEvent.press(screen.getByTestId('trade-pick-5-c2-70'));
    expect(onAction).toHaveBeenLastCalledWith({ kind: 'finish-trade', trade, user: swapper, offeredShift: swapper.OfferedShifts[0] });

    expect(screen.queryByTestId('trade-pick-5-c3')).toBeNull();
    expect(screen.getByText('away')).toBeTruthy();

    fireEvent.press(screen.getByTestId('trade-cancel-5'));
    expect(onAction).toHaveBeenLastCalledWith({ kind: 'cancel-trade', trade });
  });

  it('shows status for pending, completed and denied trades', () => {
    const { rerender } = render(<ShiftTradeCard trade={makeTrade({ Status: ShiftTradeStatus.PendingApproval, AcceptedUserName: 'Casey' })} onAction={onAction} />);
    expect(screen.getByText('shifts.trade.status.pending_approval')).toBeTruthy();
    expect(screen.getByText('shifts.trade.finish_pending_note')).toBeTruthy();

    rerender(<ShiftTradeCard trade={makeTrade({ Status: ShiftTradeStatus.Completed, AcceptedUserName: 'Casey', TargetShiftDay: '2026-10-02T00:00:00' })} onAction={onAction} />);
    expect(screen.getByText('shifts.trade.status.completed')).toBeTruthy();
    expect(screen.queryByTestId('trade-cancel-5')).toBeNull();

    rerender(<ShiftTradeCard trade={makeTrade({ Status: ShiftTradeStatus.Denied, ReviewedByName: 'Sup', ReviewNote: 'no cover' })} onAction={onAction} />);
    expect(screen.getByText('shifts.trade.status.denied')).toBeTruthy();
  });

  it('gives a reviewer approve and deny', () => {
    const trade = makeTrade({ Status: ShiftTradeStatus.PendingApproval, CanReview: true, Direction: ShiftTradeDirection.Incoming, MyState: ShiftTradeUserState.PendingApproval });
    render(<ShiftTradeCard trade={trade} onAction={onAction} />);

    fireEvent.press(screen.getByTestId('trade-approve-5'));
    expect(onAction).toHaveBeenLastCalledWith({ kind: 'review-trade', trade, approve: true });
    fireEvent.press(screen.getByTestId('trade-deny-5'));
    expect(onAction).toHaveBeenLastCalledWith({ kind: 'review-trade', trade, approve: false });
  });
});

describe('ShiftTradesList', () => {
  it('shows the empty state', () => {
    render(<ShiftTradesList trades={[]} isLoading={false} busyTradeId={null} onRefresh={jest.fn()} onAction={jest.fn()} />);
    expect(screen.getByText('shifts.empty.trades_title')).toBeTruthy();
  });

  it('puts trades that need me first, then in-progress, then recent', () => {
    const needsMe = makeTrade({ ShiftSignupTradeId: '1', Direction: ShiftTradeDirection.Incoming, MyState: ShiftTradeUserState.Open });
    const waiting = makeTrade({ ShiftSignupTradeId: '2', Direction: ShiftTradeDirection.Outgoing, Users: [user({ UserId: 'x', Name: 'X' })] });
    const done = makeTrade({ ShiftSignupTradeId: '3', Status: ShiftTradeStatus.Completed });

    render(<ShiftTradesList trades={[done, waiting, needsMe]} isLoading={false} busyTradeId={null} onRefresh={jest.fn()} onAction={jest.fn()} />);

    const order = screen.getAllByTestId(/^trade-card-/).map((node) => node.props.testID);
    expect(order).toEqual(['trade-card-1', 'trade-card-2', 'trade-card-3']);
    expect(screen.getByText('shifts.trade.section_attention')).toBeTruthy();
    expect(screen.getByText('shifts.trade.section_active')).toBeTruthy();
    expect(screen.getByText('shifts.trade.section_recent')).toBeTruthy();
  });
});
