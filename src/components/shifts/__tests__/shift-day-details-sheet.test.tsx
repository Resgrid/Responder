import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

import { ShiftDayGroupNeedsResultData, ShiftDayResultData, ShiftDayRosterResultData } from '@/models/v4/shifts/shiftDayResultData';
import { ShiftDayMyStatus, ShiftRosterSource } from '@/models/v4/shifts/shiftEnums';
import { type ShiftActionOutcome, useShiftsStore } from '@/stores/shifts/store';

import { ShiftDayDetailsSheet } from '../shift-day-details-sheet';

jest.mock('@/api/shifts/shifts', () => new Proxy({}, { get: () => jest.fn().mockResolvedValue({ Data: [] }) }));
jest.mock('@/lib/logging', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } }));
jest.mock('@/lib/storage/clear-all-data', () => ({ registerStoreReset: jest.fn() }));
jest.mock('@/hooks/use-analytics', () => ({ useAnalytics: () => ({ trackEvent: jest.fn() }) }));
jest.mock('@/lib/auth', () => ({ useAuthStore: (selector: (state: { userId: string }) => unknown) => selector({ userId: 'me' }) }));

const mockShowToast = jest.fn();
jest.mock('@/stores/toast/store', () => ({ useToastStore: (selector: (state: { showToast: jest.Mock }) => unknown) => selector({ showToast: mockShowToast }) }));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => (options && 'name' in options ? `${key}:${String(options.name)}` : key),
  }),
}));

jest.mock('lucide-react-native', () => {
  const React = require('react');
  const { View } = require('react-native');
  const icon = React.forwardRef((props: Record<string, unknown>, ref: unknown) => React.createElement(View, { ...props, ref }));
  return new Proxy({}, { get: () => icon });
});

const success = (overrides: Partial<ShiftActionOutcome> = {}): ShiftActionOutcome => ({ success: true, errorCode: null, approvalPending: false, id: '1', ...overrides });
const failure = (errorCode: ShiftActionOutcome['errorCode']): ShiftActionOutcome => ({ success: false, errorCode, approvalPending: false, id: '' });

const group = (overrides: Partial<ShiftDayGroupNeedsResultData>): ShiftDayGroupNeedsResultData => ({ ...new ShiftDayGroupNeedsResultData(), ...overrides });
const rosterEntry = (overrides: Partial<ShiftDayRosterResultData>): ShiftDayRosterResultData => ({ ...new ShiftDayRosterResultData(), ...overrides });

const makeDay = (overrides: Partial<ShiftDayResultData> = {}): ShiftDayResultData => ({
  ...new ShiftDayResultData(),
  ShiftId: '1',
  ShiftName: 'PMRT Night',
  ShiftDayId: '100',
  ShiftDay: '2099-09-24T00:00:00',
  Start: '2099-09-24T19:00:00',
  End: '2099-09-25T07:00:00',
  ShiftType: 1,
  OpenSlots: 2,
  Needs: [
    group({ GroupId: '3', GroupName: 'North Team', GroupNeeds: [{ RoleId: '1', RoleName: 'Clinician', Needed: 1 }] }),
    group({ GroupId: '4', GroupName: 'South Team', GroupNeeds: [{ RoleId: '2', RoleName: 'Peer', Needed: 1 }] }),
  ],
  Roster: [
    rosterEntry({ UserId: 'u1', Name: 'Alex Kim', GroupId: '3', GroupName: 'North Team', Roles: ['Clinician'], Source: ShiftRosterSource.Assigned }),
    rosterEntry({ UserId: 'u2', Name: 'Sam Lee', GroupId: '4', GroupName: 'South Team', Source: ShiftRosterSource.Signup, ShiftSignupId: '44', ApprovalPending: true }),
    rosterEntry({ UserId: 'u3', Name: 'Jo Park', GroupId: '3', GroupName: 'North Team', Source: ShiftRosterSource.Trade, TradedFromUserId: 'u9', TradedFromName: 'Chris Doe' }),
  ],
  ...overrides,
});

const actions = {
  signupForShift: jest.fn(),
  withdrawFromShift: jest.fn(),
  requestTrade: jest.fn(),
  cancelTrade: jest.fn(),
  reviewSignup: jest.fn(),
  assignToShiftDay: jest.fn(),
  removeFromShiftDay: jest.fn(),
  fetchTradeCandidates: jest.fn(),
  fetchPersonnelOptions: jest.fn(),
};

const renderSheet = (day: ShiftDayResultData, extra: Partial<ReturnType<typeof useShiftsStore.getState>> = {}) => {
  useShiftsStore.setState({ selectedShiftDay: day, isShiftDayDetailsOpen: true, isShiftDayLoading: false, activeMutation: null, tradeCandidates: [], personnelOptions: [], ...actions, ...extra });
  return render(<ShiftDayDetailsSheet isOpen={true} onClose={jest.fn()} />);
};

describe('ShiftDayDetailsSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.values(actions).forEach((fn) => fn.mockResolvedValue(success()));
  });

  describe('overview', () => {
    it('shows the roster by group with pending, trade and scheduled markers', () => {
      renderSheet(makeDay({ IsActive: true }));

      expect(screen.getByText('PMRT Night')).toBeTruthy();
      expect(screen.getByTestId('shift-day-active-now')).toBeTruthy();
      expect(screen.getByTestId('roster-group-3')).toBeTruthy();
      expect(screen.getByTestId('roster-group-4')).toBeTruthy();
      expect(screen.getByTestId('roster-pending-u2')).toBeTruthy();
      expect(screen.getByText('shifts.day.covering_for:Chris Doe')).toBeTruthy();
      expect(screen.getAllByText('shifts.roster_source.scheduled').length).toBeGreaterThan(0);
      expect(screen.getByTestId('group-needs-3')).toBeTruthy();
    });

    it('shows pending approval status for my pending sign-up', () => {
      renderSheet(makeDay({ MyStatus: ShiftDayMyStatus.PendingApproval, MySignupId: '900', SignedUp: true }));
      expect(screen.getByTestId('shift-day-my-status-card')).toBeTruthy();
      expect(screen.getByText('shifts.day.pending_note')).toBeTruthy();
    });

    it('shows a loading state until a day opened by id arrives', () => {
      useShiftsStore.setState({ selectedShiftDay: null, isShiftDayDetailsOpen: true, isShiftDayLoading: true });
      render(<ShiftDayDetailsSheet isOpen={true} onClose={jest.fn()} />);
      expect(screen.getByTestId('shift-day-details-sheet')).toBeTruthy();
      expect(screen.queryByText('PMRT Night')).toBeNull();
    });
  });

  describe('sign up', () => {
    it('requires picking a group, then signs up with it', async () => {
      renderSheet(makeDay({ CanSignup: true }));

      fireEvent.press(screen.getByTestId('shift-day-signup-button'));
      expect(screen.getByTestId('shift-day-signup-panel')).toBeTruthy();
      expect(screen.getByTestId('shift-day-signup-confirm').props.isDisabled).toBe(true);

      fireEvent.press(screen.getByTestId('signup-group-4'));
      expect(screen.getByTestId('shift-day-signup-confirm').props.isDisabled).toBe(false);

      await act(async () => {
        fireEvent.press(screen.getByTestId('shift-day-signup-confirm'));
      });

      expect(actions.signupForShift).toHaveBeenCalledWith('100', '4');
      expect(mockShowToast).toHaveBeenCalledWith('success', 'shifts.signup_success');
    });

    it('preselects the only group', () => {
      renderSheet(makeDay({ CanSignup: true, Needs: [group({ GroupId: '3', GroupName: 'North Team' })] }));
      fireEvent.press(screen.getByTestId('shift-day-signup-button'));
      expect(screen.getByTestId('shift-day-signup-confirm').props.isDisabled).toBe(false);
    });

    it('tells the user the sign-up is pending approval', async () => {
      actions.signupForShift.mockResolvedValue(success({ approvalPending: true }));
      renderSheet(makeDay({ CanSignup: true, RequireApproval: true }));

      fireEvent.press(screen.getByTestId('shift-day-signup-button'));
      expect(screen.getByText('shifts.signup_panel.approval_notice')).toBeTruthy();
      fireEvent.press(screen.getByTestId('signup-group-3'));
      await act(async () => {
        fireEvent.press(screen.getByTestId('shift-day-signup-confirm'));
      });

      expect(mockShowToast).toHaveBeenCalledWith('success', 'shifts.toast.signup_pending');
    });

    it('shows the translated server error and stays on the panel', async () => {
      actions.signupForShift.mockResolvedValue(failure('invalid_group'));
      renderSheet(makeDay({ CanSignup: true }));

      fireEvent.press(screen.getByTestId('shift-day-signup-button'));
      fireEvent.press(screen.getByTestId('signup-group-3'));
      await act(async () => {
        fireEvent.press(screen.getByTestId('shift-day-signup-confirm'));
      });

      expect(mockShowToast).toHaveBeenCalledWith('error', 'shifts.errors.invalid_group');
      expect(screen.getByTestId('shift-day-signup-panel')).toBeTruthy();
    });

    it('hides sign up when the server says the caller cannot sign up', () => {
      renderSheet(makeDay({ CanSignup: false }));
      expect(screen.queryByTestId('shift-day-signup-button')).toBeNull();
    });
  });

  describe('withdraw', () => {
    it('withdraws my own sign-up after confirming', async () => {
      const day = makeDay({
        MyStatus: ShiftDayMyStatus.OnRoster,
        SignedUp: true,
        MySignupId: '900',
        Roster: [rosterEntry({ UserId: 'me', Name: 'Me', ShiftSignupId: '900', Source: ShiftRosterSource.Signup, GroupId: '3', GroupName: 'North Team' })],
      });
      renderSheet(day);

      fireEvent.press(screen.getByTestId('shift-day-withdraw-button'));
      await act(async () => {
        fireEvent.press(screen.getByTestId('shift-day-withdraw-confirm'));
      });

      expect(actions.withdrawFromShift).toHaveBeenCalledWith('100', '900');
      expect(mockShowToast).toHaveBeenCalledWith('success', 'shifts.withdraw_success');
    });

    it('does not offer withdraw for a standing-roster (scheduled) slot', () => {
      renderSheet(
        makeDay({
          ShiftType: 0,
          MyStatus: ShiftDayMyStatus.OnRoster,
          SignedUp: true,
          MySignupId: '901',
          Roster: [rosterEntry({ UserId: 'me', Name: 'Me', ShiftSignupId: '901', Source: ShiftRosterSource.Assigned })],
        })
      );
      expect(screen.queryByTestId('shift-day-withdraw-button')).toBeNull();
      expect(screen.getByTestId('shift-day-trade-button')).toBeTruthy();
    });
  });

  describe('trade request', () => {
    it('loads candidates, lets me pick several, and sends the request with a note', async () => {
      const day = makeDay({ MyStatus: ShiftDayMyStatus.OnRoster, SignedUp: true });
      renderSheet(day);

      fireEvent.press(screen.getByTestId('shift-day-trade-button'));
      expect(actions.fetchTradeCandidates).toHaveBeenCalledWith('100');

      act(() => {
        useShiftsStore.setState({
          tradeCandidates: [
            { UserId: 'c1', Name: 'Casey', GroupId: '3', GroupName: 'North Team', Roles: ['Clinician'], RoleIds: [1] },
            { UserId: 'c2', Name: 'Drew', GroupId: '3', GroupName: 'North Team', Roles: [], RoleIds: [] },
          ],
        });
      });

      expect(screen.getByTestId('shift-day-trade-confirm').props.isDisabled).toBe(true);
      fireEvent.press(screen.getByTestId('trade-candidate-c1'));
      fireEvent.press(screen.getByTestId('trade-candidate-c2'));
      fireEvent.changeText(screen.getByTestId('shift-day-trade-note'), '  family event  ');

      await act(async () => {
        fireEvent.press(screen.getByTestId('shift-day-trade-confirm'));
      });

      expect(actions.requestTrade).toHaveBeenCalledWith('100', ['c1', 'c2'], 'family event');
      expect(mockShowToast).toHaveBeenCalledWith('success', 'shifts.toast.trade_requested');
    });

    it('offers cancel instead of request when a trade is already open', async () => {
      renderSheet(makeDay({ MyStatus: ShiftDayMyStatus.OnRoster, SignedUp: true, MyTradeId: '5' }));

      expect(screen.queryByTestId('shift-day-trade-button')).toBeNull();
      fireEvent.press(screen.getByTestId('shift-day-cancel-trade-button'));
      await act(async () => {
        fireEvent.press(screen.getByTestId('shift-day-cancel-trade-confirm'));
      });

      expect(actions.cancelTrade).toHaveBeenCalledWith('5');
    });

    it('does not offer a trade while my sign-up is pending', () => {
      renderSheet(makeDay({ MyStatus: ShiftDayMyStatus.PendingApproval, SignedUp: true, MySignupId: '900' }));
      expect(screen.queryByTestId('shift-day-trade-button')).toBeNull();
    });
  });

  describe('supervisor controls', () => {
    const supervisedDay = () =>
      makeDay({
        CanManage: true,
        Needs: [group({ GroupId: '3', GroupName: 'North Team', CanManage: true }), group({ GroupId: '4', GroupName: 'South Team', CanManage: true })],
      });

    it('hides supervisor controls from a non-supervisor', () => {
      renderSheet(makeDay());
      expect(screen.queryByTestId('shift-day-add-person-button')).toBeNull();
      expect(screen.queryByTestId('roster-remove-u1')).toBeNull();
      expect(screen.queryByTestId('roster-approve-u2')).toBeNull();
    });

    it('only offers remove on groups the caller supervises', () => {
      renderSheet(
        makeDay({
          CanManage: true,
          Needs: [group({ GroupId: '3', GroupName: 'North Team', CanManage: true }), group({ GroupId: '4', GroupName: 'South Team', CanManage: false })],
        })
      );
      expect(screen.getByTestId('roster-remove-u1')).toBeTruthy();
      expect(screen.queryByTestId('roster-remove-u2')).toBeNull();
    });

    it('adds a person to a group for the day', async () => {
      renderSheet(supervisedDay());

      fireEvent.press(screen.getByTestId('shift-day-add-person-button'));
      expect(actions.fetchPersonnelOptions).toHaveBeenCalledWith('100');

      act(() => {
        useShiftsStore.setState({ personnelOptions: [{ UserId: 'p1', Name: 'Pat Moss', GroupId: '4', GroupName: 'South Team', Roles: [], RoleIds: [] }] });
      });

      fireEvent.press(screen.getByTestId('add-group-4'));
      fireEvent.press(screen.getByTestId('add-person-p1'));
      await act(async () => {
        fireEvent.press(screen.getByTestId('shift-day-add-confirm'));
      });

      expect(actions.assignToShiftDay).toHaveBeenCalledWith('100', 'p1', '4');
      expect(mockShowToast).toHaveBeenCalledWith('success', 'shifts.toast.person_added');
    });

    it('filters the add picker by name', () => {
      renderSheet(supervisedDay());
      fireEvent.press(screen.getByTestId('shift-day-add-person-button'));
      act(() => {
        useShiftsStore.setState({
          personnelOptions: [
            { UserId: 'p1', Name: 'Pat Moss', GroupId: '', GroupName: '', Roles: [], RoleIds: [] },
            { UserId: 'p2', Name: 'Robin Vale', GroupId: '', GroupName: '', Roles: [], RoleIds: [] },
          ],
        });
      });
      fireEvent.changeText(screen.getByTestId('shift-day-add-search'), 'rob');
      expect(screen.queryByTestId('add-person-p1')).toBeNull();
      expect(screen.getByTestId('add-person-p2')).toBeTruthy();
    });

    it('removes a person from the day with a note', async () => {
      renderSheet(supervisedDay());

      fireEvent.press(screen.getByTestId('roster-remove-u1'));
      expect(screen.getByText('shifts.remove_panel.title:Alex Kim')).toBeTruthy();
      fireEvent.changeText(screen.getByTestId('shift-day-remove-note'), 'called in sick');
      await act(async () => {
        fireEvent.press(screen.getByTestId('shift-day-remove-confirm'));
      });

      expect(actions.removeFromShiftDay).toHaveBeenCalledWith('100', 'u1', 'called in sick');
      expect(mockShowToast).toHaveBeenCalledWith('success', 'shifts.toast.person_removed');
    });

    it('approves a pending sign-up from the roster', async () => {
      renderSheet(supervisedDay());

      fireEvent.press(screen.getByTestId('roster-approve-u2'));
      await act(async () => {
        fireEvent.press(screen.getByTestId('shift-day-review-confirm'));
      });

      expect(actions.reviewSignup).toHaveBeenCalledWith('44', true, '');
      expect(mockShowToast).toHaveBeenCalledWith('success', 'shifts.toast.approved');
    });

    it('denies a pending sign-up with a note and reports not_allowed', async () => {
      actions.reviewSignup.mockResolvedValue(failure('not_allowed'));
      renderSheet(supervisedDay());

      fireEvent.press(screen.getByTestId('roster-deny-u2'));
      fireEvent.changeText(screen.getByTestId('shift-day-review-note'), 'no cover');
      await act(async () => {
        fireEvent.press(screen.getByTestId('shift-day-review-confirm'));
      });

      expect(actions.reviewSignup).toHaveBeenCalledWith('44', false, 'no cover');
      await waitFor(() => expect(mockShowToast).toHaveBeenCalledWith('error', 'shifts.errors.not_allowed'));
    });

    it('goes back to the overview from a panel', () => {
      renderSheet(supervisedDay());
      fireEvent.press(screen.getByTestId('roster-remove-u1'));
      fireEvent.press(screen.getByTestId('shift-day-remove-confirm-back'));
      expect(screen.getByTestId('shift-day-add-person-button')).toBeTruthy();
    });
  });
});
