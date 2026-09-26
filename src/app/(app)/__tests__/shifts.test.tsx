import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

import * as shiftsApi from '@/api/shifts/shifts';
import { ShiftDayResultData } from '@/models/v4/shifts/shiftDayResultData';
import { ShiftDayMyStatus, ShiftTradeDirection, ShiftTradeUserState } from '@/models/v4/shifts/shiftEnums';
import { ShiftResultData } from '@/models/v4/shifts/shiftResultData';
import { ShiftTradeResultData } from '@/models/v4/shifts/shiftTradeResultData';
import { useShiftsStore } from '@/stores/shifts/store';

import ShiftsScreen from '../shifts';

jest.mock('@/api/shifts/shifts', () => ({
  getAllShifts: jest.fn(),
  getShift: jest.fn(),
  getTodaysShifts: jest.fn(),
  getShiftDay: jest.fn(),
  getShiftDaysForDateRange: jest.fn(),
  getMyShifts: jest.fn(),
  signupForShiftDay: jest.fn(),
  withdrawFromShiftDay: jest.fn(),
  getShiftTrades: jest.fn(),
  getTradeCandidates: jest.fn(),
  requestShiftTrade: jest.fn(),
  respondToShiftTrade: jest.fn(),
  finishShiftTrade: jest.fn(),
  cancelShiftTrade: jest.fn(),
  getPendingApprovals: jest.fn(),
  reviewShiftSignup: jest.fn(),
  reviewShiftTrade: jest.fn(),
  getShiftDayPersonnelOptions: jest.fn(),
  assignToShiftDay: jest.fn(),
  removeFromShiftDay: jest.fn(),
  getOnDutyPersonnel: jest.fn(),
}));
jest.mock('@/lib/logging', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } }));
jest.mock('@/lib/storage/clear-all-data', () => ({ registerStoreReset: jest.fn() }));

const mockTrackEvent = jest.fn();
jest.mock('@/hooks/use-analytics', () => ({ useAnalytics: () => ({ trackEvent: mockTrackEvent }) }));

const mockStackScreen = jest.fn();
jest.mock('expo-router', () => {
  const React = require('react');
  return {
    Stack: {
      Screen: (props: { options: Record<string, unknown> }) => {
        mockStackScreen(props);
        return null;
      },
    },
    useFocusEffect: (callback: () => void) => React.useEffect(callback, [callback]),
  };
});

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

jest.mock('@/components/ui/focus-aware-status-bar', () => ({ FocusAwareStatusBar: () => null }));

// The shared FlatList mock only accepts component types for its slots; the screen passes elements.
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

// The sheets have their own suites; here they only report whether they are open and what they hold.
jest.mock('@/components/shifts/shift-day-details-sheet', () => {
  const React = require('react');
  const { View } = require('react-native');
  return { ShiftDayDetailsSheet: ({ isOpen }: { isOpen: boolean }) => (isOpen ? React.createElement(View, { testID: 'day-sheet-open' }) : null) };
});
jest.mock('@/components/shifts/shift-details-sheet', () => {
  const React = require('react');
  const { View, Pressable } = require('react-native');
  return {
    ShiftDetailsSheet: ({ isOpen, onViewCalendar }: { isOpen: boolean; onViewCalendar: (id: string) => void }) =>
      isOpen ? React.createElement(View, { testID: 'shift-sheet-open' }, React.createElement(Pressable, { testID: 'shift-sheet-view-calendar', onPress: () => onViewCalendar('7') })) : null,
  };
});
jest.mock('@/components/shifts/shift-action-sheet', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return { ShiftActionSheet: ({ action }: { action: { kind: string } | null }) => (action ? React.createElement(Text, { testID: 'action-sheet' }, action.kind) : null) };
});

const api = shiftsApi as unknown as Record<keyof typeof shiftsApi, jest.Mock>;

const envelope = { PageSize: 0, Timestamp: '', Version: '', Node: '', RequestId: '', Environment: '', Status: 'success' };
const list = <T,>(Data: T[]) => ({ ...envelope, Data });

const makeDay = (overrides: Partial<ShiftDayResultData> = {}): ShiftDayResultData => ({
  ...new ShiftDayResultData(),
  ShiftId: '1',
  ShiftName: 'PMRT Night',
  ShiftDayId: '100',
  ShiftDay: '2026-09-24T00:00:00',
  Start: '2026-09-24T19:00:00',
  End: '2026-09-25T07:00:00',
  ...overrides,
});

const approvals = (isSupervisor: boolean, signups: unknown[] = [], trades: unknown[] = []) => ({ ...envelope, Data: { IsSupervisor: isSupervisor, Signups: signups, Trades: trades } });

// Focus fires several independent requests; let all of them settle inside act.
const settle = async () => {
  await act(async () => {
    for (let i = 0; i < 10; i += 1) {
      await Promise.resolve();
    }
  });
};

const renderScreen = async () => {
  const utils = render(<ShiftsScreen />);
  await settle();
  return utils;
};

const pressAndSettle = async (testID: string) => {
  fireEvent.press(await screen.findByTestId(testID));
  await settle();
};

describe('ShiftsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useShiftsStore.getState().reset();

    api.getTodaysShifts.mockResolvedValue(list([makeDay()]));
    api.getMyShifts.mockResolvedValue(list([]));
    api.getShiftDaysForDateRange.mockResolvedValue(list([]));
    api.getShiftTrades.mockResolvedValue(list([]));
    api.getPendingApprovals.mockResolvedValue(approvals(false));
    api.getOnDutyPersonnel.mockResolvedValue(list([]));
    api.getAllShifts.mockResolvedValue(list([]));
    api.getShiftDay.mockResolvedValue({ ...envelope, Data: makeDay() });
  });

  it('sets the header title', async () => {
    await renderScreen();
    expect(mockStackScreen).toHaveBeenCalledWith(expect.objectContaining({ options: expect.objectContaining({ title: 'shifts.title', headerShown: true }) }));
  });

  it('loads today and learns supervisor status on focus', async () => {
    await renderScreen();
    expect(api.getTodaysShifts).toHaveBeenCalled();
    expect(api.getPendingApprovals).toHaveBeenCalled();
    expect(await screen.findByTestId('shift-day-card-100')).toBeTruthy();
    expect(mockTrackEvent).toHaveBeenCalledWith('shifts_viewed', expect.objectContaining({ activeTab: 'today' }));
  });

  it('shows the member segments, including On Duty, to a non-supervisor', async () => {
    await renderScreen();
    expect(screen.getByTestId('shifts-segment-today')).toBeTruthy();
    expect(screen.getByTestId('shifts-segment-mine')).toBeTruthy();
    expect(screen.getByTestId('shifts-segment-calendar')).toBeTruthy();
    expect(screen.getByTestId('shifts-segment-trades')).toBeTruthy();
    expect(screen.getByTestId('shifts-segment-onduty')).toBeTruthy();
    expect(screen.queryByTestId('shifts-segment-approvals')).toBeNull();
  });

  it('adds Approvals (with a pending count) for a supervisor', async () => {
    api.getPendingApprovals.mockResolvedValue(approvals(true, [{ ShiftSignupId: '44', UserName: 'Sam', Roles: [] }], []));
    await renderScreen();

    await waitFor(() => expect(screen.getByTestId('shifts-segment-approvals')).toBeTruthy());
    expect(screen.getByTestId('shifts-segment-onduty')).toBeTruthy();
    expect(screen.getByTestId('shifts-segment-badge-approvals')).toBeTruthy();
  });

  it('falls back to Today when a non-supervisor is left on a supervisor view', async () => {
    useShiftsStore.setState({ currentView: 'approvals' });
    await renderScreen();
    await waitFor(() => expect(useShiftsStore.getState().currentView).toBe('today'));
    expect(screen.getByTestId('shifts-segment-today').props.accessibilityState).toEqual({ selected: true });
  });

  it('filters today by search', async () => {
    api.getTodaysShifts.mockResolvedValue(list([makeDay(), makeDay({ ShiftDayId: '101', ShiftName: 'MCOT Day' })]));
    await renderScreen();
    await screen.findByTestId('shift-day-card-101');

    fireEvent.changeText(screen.getByTestId('shifts-search-input'), 'mcot');
    await settle();
    expect(screen.queryByTestId('shift-day-card-100')).toBeNull();
    expect(screen.getByTestId('shift-day-card-101')).toBeTruthy();
  });

  it('opens the day sheet from a card', async () => {
    await renderScreen();
    await pressAndSettle('shift-day-card-100');
    expect(screen.getByTestId('day-sheet-open')).toBeTruthy();
    expect(api.getShiftDay).toHaveBeenCalledWith('100');
  });

  it('My Shifts loads my upcoming days and my standing shifts', async () => {
    api.getMyShifts.mockResolvedValue(list([makeDay({ ShiftDayId: '300', MyStatus: ShiftDayMyStatus.PendingApproval })]));
    api.getAllShifts.mockResolvedValue(list([{ ...new ShiftResultData(), ShiftId: '1', Name: 'PMRT Night', InShift: true }]));
    await renderScreen();

    await pressAndSettle('shifts-segment-mine');

    expect(api.getMyShifts).toHaveBeenCalled();
    expect(await screen.findByTestId('shift-day-card-300')).toBeTruthy();
    expect(screen.getByTestId('shift-card-1')).toBeTruthy();
    expect(screen.getByText('shifts.status.pending_approval')).toBeTruthy();
  });

  it('Calendar loads the visible month, shows a day, and filters by shift', async () => {
    api.getAllShifts.mockResolvedValue(list([{ ...new ShiftResultData(), ShiftId: '7', Name: 'MCOT Day' }]));
    api.getShiftDaysForDateRange.mockResolvedValue(list([makeDay({ ShiftDayId: '400', ShiftDay: '2026-09-10T00:00:00', Start: '2026-09-10T07:00:00', End: '2026-09-10T19:00:00' })]));
    useShiftsStore.setState({ calendarRange: { start: '2026-09-01', end: '2026-09-30', shiftId: null } });
    await renderScreen();

    await pressAndSettle('shifts-segment-calendar');
    expect(api.getShiftDaysForDateRange).toHaveBeenCalledWith('2026-09-01', '2026-09-30', undefined);

    await pressAndSettle('shift-calendar-day-2026-09-10');
    expect(screen.getByTestId('shift-day-card-400')).toBeTruthy();

    await pressAndSettle('shifts-calendar-filter-7');
    expect(api.getShiftDaysForDateRange).toHaveBeenLastCalledWith('2026-09-01', '2026-09-30', '7');
    expect(screen.getByTestId('shifts-calendar-shift-info')).toBeTruthy();
  });

  it('Calendar asks for a new range when the month changes', async () => {
    useShiftsStore.setState({ calendarRange: { start: '2026-09-01', end: '2026-09-30', shiftId: null }, currentView: 'calendar' });
    await renderScreen();

    await pressAndSettle('shift-calendar-next');
    expect(api.getShiftDaysForDateRange).toHaveBeenLastCalledWith('2026-10-01', '2026-10-31', undefined);
  });

  it('opening a shift in the calendar switches view and filters', async () => {
    useShiftsStore.setState({ isShiftDetailsOpen: true, selectedShift: { ...new ShiftResultData(), ShiftId: '7' } });
    await renderScreen();

    await pressAndSettle('shift-sheet-view-calendar');

    expect(useShiftsStore.getState().currentView).toBe('calendar');
    expect(useShiftsStore.getState().calendarShiftId).toBe('7');
    expect(useShiftsStore.getState().isShiftDetailsOpen).toBe(false);
  });

  it('Trades lists trades and routes an accept through the confirmation sheet', async () => {
    const trade: ShiftTradeResultData = { ...new ShiftTradeResultData(), ShiftSignupTradeId: '5', ShiftName: 'PMRT Night', Direction: ShiftTradeDirection.Incoming, MyState: ShiftTradeUserState.Open };
    api.getShiftTrades.mockResolvedValue(list([trade]));
    await renderScreen();

    await pressAndSettle('shifts-segment-trades');

    expect(api.getShiftTrades).toHaveBeenCalled();
    fireEvent.press(await screen.findByTestId('trade-accept-5'));
    expect(screen.getByTestId('action-sheet').props.children).toBe('accept-trade');
  });

  it('Approvals lets a supervisor review a pending sign-up', async () => {
    api.getPendingApprovals.mockResolvedValue(approvals(true, [{ ShiftSignupId: '44', UserName: 'Sam', GroupName: 'North', ShiftName: 'PMRT Night', Roles: [] }], []));
    await renderScreen();

    await pressAndSettle('shifts-segment-approvals');

    fireEvent.press(await screen.findByTestId('pending-signup-deny-44'));
    expect(screen.getByTestId('action-sheet').props.children).toBe('review-signup');
  });

  it('On Duty shows who is on an active shift, to any member', async () => {
    api.getPendingApprovals.mockResolvedValue(approvals(false));
    api.getOnDutyPersonnel.mockResolvedValue(list([{ UserId: 'u1', Name: 'Alex Kim', ShiftId: '1', ShiftName: 'PMRT Night', ShiftDayId: '100', Start: '2026-09-24T19:00:00', End: '2026-09-25T07:00:00', GroupId: '', GroupName: '', Roles: [], Source: 0 }]));
    await renderScreen();

    await pressAndSettle('shifts-segment-onduty');

    expect(api.getOnDutyPersonnel).toHaveBeenCalled();
    expect(await screen.findByText('Alex Kim')).toBeTruthy();
  });

  it('shows an error with retry when today fails to load', async () => {
    api.getTodaysShifts.mockRejectedValueOnce(new Error('offline'));
    await renderScreen();

    expect(await screen.findByText('shifts.load_error')).toBeTruthy();
    api.getTodaysShifts.mockResolvedValue(list([makeDay()]));
    await pressAndSettle('shifts-retry');
    expect(await screen.findByTestId('shift-day-card-100')).toBeTruthy();
  });
});
