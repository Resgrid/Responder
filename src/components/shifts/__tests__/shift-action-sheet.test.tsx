import { act, fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { PendingShiftSignupResultData } from '@/models/v4/shifts/pendingShiftSignupResultData';
import { ShiftDayResultData } from '@/models/v4/shifts/shiftDayResultData';
import { ShiftDayMyStatus, ShiftTradeDirection } from '@/models/v4/shifts/shiftEnums';
import { ShiftTradeResultData, ShiftTradeUserResultData } from '@/models/v4/shifts/shiftTradeResultData';
import { type ShiftActionOutcome, useShiftsStore } from '@/stores/shifts/store';

import { ShiftActionSheet } from '../shift-action-sheet';

jest.mock('@/api/shifts/shifts', () => new Proxy({}, { get: () => jest.fn().mockResolvedValue({ Data: [] }) }));
jest.mock('@/lib/logging', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } }));
jest.mock('@/lib/storage/clear-all-data', () => ({ registerStoreReset: jest.fn() }));
jest.mock('@/hooks/use-analytics', () => ({ useAnalytics: () => ({ trackEvent: jest.fn() }) }));

const mockShowToast = jest.fn();
jest.mock('@/stores/toast/store', () => ({ useToastStore: (selector: (state: { showToast: jest.Mock }) => unknown) => selector({ showToast: mockShowToast }) }));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('lucide-react-native', () => {
  const React = require('react');
  const { View } = require('react-native');
  const icon = React.forwardRef((props: Record<string, unknown>, ref: unknown) => React.createElement(View, { ...props, ref }));
  return new Proxy({}, { get: () => icon });
});

const ok = (overrides: Partial<ShiftActionOutcome> = {}): ShiftActionOutcome => ({ success: true, errorCode: null, approvalPending: false, id: '', ...overrides });

const trade: ShiftTradeResultData = { ...new ShiftTradeResultData(), ShiftSignupTradeId: '5', ShiftDayId: '100', ShiftName: 'PMRT Night', Direction: ShiftTradeDirection.Incoming, SourceUserName: 'Alex' };
const mySignup: ShiftDayResultData = { ...new ShiftDayResultData(), ShiftDayId: '200', ShiftName: 'PMRT Day', MySignupId: '70', MyStatus: ShiftDayMyStatus.OnRoster, ShiftDay: '2026-10-02T00:00:00' };
const pendingDay: ShiftDayResultData = { ...mySignup, ShiftDayId: '201', MySignupId: '71', MyStatus: ShiftDayMyStatus.PendingApproval };
const sameDay: ShiftDayResultData = { ...mySignup, ShiftDayId: '100', MySignupId: '72' };

const actions = {
  respondToTrade: jest.fn(),
  finishTrade: jest.fn(),
  cancelTrade: jest.fn(),
  reviewTrade: jest.fn(),
  reviewSignup: jest.fn(),
};

describe('ShiftActionSheet', () => {
  const onClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    Object.values(actions).forEach((fn) => fn.mockResolvedValue(ok()));
    useShiftsStore.setState({ ...actions, myShiftDays: [mySignup, pendingDay, sameDay], activeMutation: null });
  });

  it('renders nothing without an action', () => {
    render(<ShiftActionSheet action={null} onClose={onClose} />);
    expect(screen.queryByTestId('shift-action-confirm')).toBeNull();
  });

  it('accepts a trade offering one of my approved upcoming sign-ups back', async () => {
    render(<ShiftActionSheet action={{ kind: 'accept-trade', trade }} onClose={onClose} />);

    // Only approved sign-ups on other days can be offered.
    expect(screen.getByTestId('swap-option-70')).toBeTruthy();
    expect(screen.queryByTestId('swap-option-71')).toBeNull();
    expect(screen.queryByTestId('swap-option-72')).toBeNull();

    fireEvent.press(screen.getByTestId('swap-option-70'));
    fireEvent.changeText(screen.getByTestId('shift-action-note'), ' sure ');
    await act(async () => {
      fireEvent.press(screen.getByTestId('shift-action-confirm'));
    });

    expect(actions.respondToTrade).toHaveBeenCalledWith('5', true, 'sure', ['70']);
    expect(mockShowToast).toHaveBeenCalledWith('success', 'shifts.toast.trade_accepted');
    expect(onClose).toHaveBeenCalled();
  });

  it('accepts a trade outright by default', async () => {
    render(<ShiftActionSheet action={{ kind: 'accept-trade', trade }} onClose={onClose} />);
    await act(async () => {
      fireEvent.press(screen.getByTestId('shift-action-confirm'));
    });
    expect(actions.respondToTrade).toHaveBeenCalledWith('5', true, '', []);
  });

  it('declines a trade', async () => {
    render(<ShiftActionSheet action={{ kind: 'decline-trade', trade }} onClose={onClose} />);
    await act(async () => {
      fireEvent.press(screen.getByTestId('shift-action-confirm'));
    });
    expect(actions.respondToTrade).toHaveBeenCalledWith('5', false, '', []);
    expect(mockShowToast).toHaveBeenCalledWith('success', 'shifts.toast.trade_declined');
  });

  it('finishes a trade with a swap-back and reports pending approval', async () => {
    actions.finishTrade.mockResolvedValue(ok({ approvalPending: true }));
    const user: ShiftTradeUserResultData = { ...new ShiftTradeUserResultData(), UserId: 'c2', Name: 'Drew', Offered: true };
    render(<ShiftActionSheet action={{ kind: 'finish-trade', trade: { ...trade, RequireApproval: true }, user, offeredShift: { ShiftSignupId: '80', ShiftName: 'PMRT Day', ShiftDay: '2026-10-05T00:00:00' } }} onClose={onClose} />);

    expect(screen.getByText('shifts.trade.finish_pending_note')).toBeTruthy();
    expect(screen.queryByTestId('shift-action-note')).toBeNull();
    await act(async () => {
      fireEvent.press(screen.getByTestId('shift-action-confirm'));
    });

    expect(actions.finishTrade).toHaveBeenCalledWith('5', 'c2', '80');
    expect(mockShowToast).toHaveBeenCalledWith('success', 'shifts.toast.trade_finished_pending');
  });

  it('cancels a trade', async () => {
    render(<ShiftActionSheet action={{ kind: 'cancel-trade', trade }} onClose={onClose} />);
    await act(async () => {
      fireEvent.press(screen.getByTestId('shift-action-confirm'));
    });
    expect(actions.cancelTrade).toHaveBeenCalledWith('5');
  });

  it('reviews a trade and a sign-up with a note', async () => {
    const { rerender } = render(<ShiftActionSheet action={{ kind: 'review-trade', trade, approve: false }} onClose={onClose} />);
    fireEvent.changeText(screen.getByTestId('shift-action-note'), 'no cover');
    await act(async () => {
      fireEvent.press(screen.getByTestId('shift-action-confirm'));
    });
    expect(actions.reviewTrade).toHaveBeenCalledWith('5', false, 'no cover');
    expect(mockShowToast).toHaveBeenLastCalledWith('success', 'shifts.toast.denied');

    const signup: PendingShiftSignupResultData = { ...new PendingShiftSignupResultData(), ShiftSignupId: '44', UserName: 'Sam', GroupName: 'North' };
    rerender(<ShiftActionSheet action={{ kind: 'review-signup', signup, approve: true }} onClose={onClose} />);
    await act(async () => {
      fireEvent.press(screen.getByTestId('shift-action-confirm'));
    });
    expect(actions.reviewSignup).toHaveBeenCalledWith('44', true, '');
    expect(mockShowToast).toHaveBeenLastCalledWith('success', 'shifts.toast.approved');
  });

  it('keeps the sheet open and shows the translated error on failure', async () => {
    actions.reviewTrade.mockResolvedValue({ success: false, errorCode: 'not_pending', approvalPending: false, id: '' });
    render(<ShiftActionSheet action={{ kind: 'review-trade', trade, approve: true }} onClose={onClose} />);
    await act(async () => {
      fireEvent.press(screen.getByTestId('shift-action-confirm'));
    });
    expect(mockShowToast).toHaveBeenCalledWith('error', 'shifts.errors.not_pending');
    expect(onClose).not.toHaveBeenCalled();
  });
});
