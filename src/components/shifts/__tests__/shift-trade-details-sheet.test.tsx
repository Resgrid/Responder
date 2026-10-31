import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { ShiftTradeDirection, ShiftTradeStatus, ShiftTradeUserState } from '@/models/v4/shifts/shiftEnums';
import { ShiftTradeResultData, ShiftTradeUserResultData } from '@/models/v4/shifts/shiftTradeResultData';
import { useShiftsStore } from '@/stores/shifts/store';

import { ShiftTradeDetailsSheet } from '../shift-trade-details-sheet';

jest.mock('@/api/shifts/shifts', () => new Proxy({}, { get: () => jest.fn().mockResolvedValue({ Data: [] }) }));
jest.mock('@/lib/logging', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } }));
jest.mock('@/lib/storage/clear-all-data', () => ({ registerStoreReset: jest.fn() }));

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

const user = (overrides: Partial<ShiftTradeUserResultData>): ShiftTradeUserResultData => ({ ...new ShiftTradeUserResultData(), ...overrides });

const makeTrade = (overrides: Partial<ShiftTradeResultData> = {}): ShiftTradeResultData => ({
  ...new ShiftTradeResultData(),
  ShiftSignupTradeId: '8',
  ShiftName: 'Engine Day',
  ShiftDay: '2099-09-24T00:00:00',
  Start: '2099-09-24T07:00:00',
  End: '2099-09-24T19:00:00',
  GroupName: 'Station 1',
  SourceUserName: 'Alex Kim',
  Status: ShiftTradeStatus.Open,
  IsOpen: true,
  ...overrides,
});

const renderSheet = (trade: ShiftTradeResultData, onAction = jest.fn()) => {
  useShiftsStore.setState({ selectedTrade: trade, isTradeDetailsOpen: true, isTradeDetailLoading: false, activeMutation: null, activeMutationTargetId: null });
  render(<ShiftTradeDetailsSheet isOpen={true} onClose={jest.fn()} onAction={onAction} />);
  return onAction;
};

describe('ShiftTradeDetailsSheet', () => {
  it('gives the people deciding what they need to choose between applicants', () => {
    const fit = user({
      UserId: 'a1',
      Name: 'Avery',
      Offered: true,
      GroupName: 'Station 2',
      Roles: ['Engineer'],
      IsEligible: true,
      Certifications: ['EMT-B (expires 2027-01-01)'],
      NearbyShiftCount: 2,
      NearbyShiftHours: 24,
      RespondedOn: '2099-09-20T10:00:00Z',
      Reason: 'Happy to cover',
    });
    const busy = user({ UserId: 'a2', Name: 'Blake', Offered: true, IsEligible: false, IneligibleReason: 'already_on_roster', HasConflict: true, ConflictName: 'Ladder Day', Certifications: [] });
    const withdrew = user({ UserId: 'a3', Name: 'Casey', Declined: true, IsEligible: true });
    const onAction = renderSheet(makeTrade({ CanPick: true, PickIsApproval: true, Users: [withdrew, busy, fit] }));

    expect(screen.getByText('shifts.trade.requested_by:Alex Kim')).toBeTruthy();
    expect(screen.getByText('shifts.trade.pick_as_approver_note')).toBeTruthy();
    expect(screen.getByTestId('trade-applicant-certs-a1').props.children).toBe('EMT-B (expires 2027-01-01)');
    expect(screen.getByTestId('trade-applicant-workload-a1').props.children).toBe('shifts.trade.nearby_workload:2|24');
    expect(screen.getByText('Happy to cover')).toBeTruthy();
    expect(screen.getByTestId('trade-applicant-certs-a2').props.children).toBe('shifts.trade.no_certifications');
    expect(screen.getByTestId('trade-applicant-conflict-a2')).toBeTruthy();
    expect(screen.getByText('shifts.trade.ineligible.already_on_day')).toBeTruthy();
    // Only live offers can be picked; a withdrawn one is listed but not selectable.
    expect(screen.queryByTestId('trade-detail-pick-a3')).toBeNull();

    fireEvent.press(screen.getByTestId('trade-detail-pick-a1'));
    expect(onAction).toHaveBeenLastCalledWith({ kind: 'finish-trade', trade: expect.objectContaining({ ShiftSignupTradeId: '8' }), user: fit, offeredShift: null });
  });

  it('lets a colleague apply, and an applicant withdraw', () => {
    const onApply = renderSheet(makeTrade({ Direction: ShiftTradeDirection.Incoming, CanApply: true, IsEligible: true }));
    fireEvent.press(screen.getByTestId('trade-detail-apply'));
    expect(onApply).toHaveBeenLastCalledWith({ kind: 'apply-trade', trade: expect.objectContaining({ ShiftSignupTradeId: '8' }) });

    const onWithdraw = renderSheet(makeTrade({ Direction: ShiftTradeDirection.Incoming, MyState: ShiftTradeUserState.Proposed }));
    fireEvent.press(screen.getByTestId('trade-detail-withdraw'));
    expect(onWithdraw).toHaveBeenLastCalledWith({ kind: 'withdraw-application', trade: expect.objectContaining({ ShiftSignupTradeId: '8' }) });
  });

  it('lets the requester cancel, and an approver review a pending pick', () => {
    const onCancel = renderSheet(makeTrade({ Direction: ShiftTradeDirection.Outgoing, CanCancel: true }));
    fireEvent.press(screen.getByTestId('trade-detail-cancel'));
    expect(onCancel).toHaveBeenLastCalledWith({ kind: 'cancel-trade', trade: expect.objectContaining({ ShiftSignupTradeId: '8' }) });

    const onReview = renderSheet(makeTrade({ Status: ShiftTradeStatus.PendingApproval, CanReview: true, CanCancel: false, CanPick: false, AcceptedUserName: 'Avery' }));
    expect(screen.getByText('shifts.trade.taken_by:Avery')).toBeTruthy();
    fireEvent.press(screen.getByTestId('trade-detail-approve'));
    expect(onReview).toHaveBeenLastCalledWith({ kind: 'review-trade', trade: expect.objectContaining({ ShiftSignupTradeId: '8' }), approve: true });
  });
});
