import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { render } from '@testing-library/react-native';
import React from 'react';

import { useCheckInStore } from '@/stores/calls/check-in-store';
import { CheckInTabPanel } from '../check-in-tab-panel';

let mockUnits: Array<{ UnitId: string; TypeId: number; Name: string }> = [];
let mockActiveUnitId: string | null = null;
let mockCurrentUser: { UserId: string; FirstName: string; LastName: string } | null = { UserId: 'user-1', FirstName: 'Test', LastName: 'User' };
let mockRoles: Array<{ UnitId: string; UnitRoleId: string; Name: string; UserId?: string }> = [];

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('nativewind', () => ({
  useColorScheme: () => ({ colorScheme: 'light' }),
  cssInterop: jest.fn(),
}));

jest.mock('lucide-react-native', () => ({
  Timer: () => 'Timer',
}));

jest.mock('@/stores/calls/check-in-store');
jest.mock('@/stores/toast/store', () => ({
  useToastStore: () => jest.fn(),
}));
jest.mock('@/stores/units/store', () => ({
  useUnitsStore: jest.fn((selector: (state: any) => any) => selector({ units: mockUnits, fetchUnits: jest.fn() })),
}));
jest.mock('@/stores/dispatch/store', () => ({
  useDispatchStore: jest.fn((selector: (state: any) => any) => selector({ data: { units: [] }, fetchDispatchData: jest.fn() })),
}));
jest.mock('@/stores/home/home-store', () => ({
  useHomeStore: jest.fn((selector: (state: any) => any) => selector({ currentUser: mockCurrentUser })),
}));
jest.mock('@/stores/roles/store', () => ({
  useRolesStore: jest.fn((selector: (state: any) => any) => selector({ users: [], roles: mockRoles })),
}));
jest.mock('@/stores/app/core-store', () => ({
  useCoreStore: jest.fn((selector: (state: any) => any) => selector({ activeUnitId: mockActiveUnitId })),
}));

const mockUseCheckInStore = useCheckInStore as unknown as jest.Mock;

describe('CheckInTabPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUnits = [];
    mockActiveUnitId = null;
    mockCurrentUser = { UserId: 'user-1', FirstName: 'Test', LastName: 'User' };
    mockRoles = [];
    mockUseCheckInStore.mockReturnValue({
      timerStatuses: [],
      resolvedTimers: [],
      checkInHistory: [],
      isLoadingStatuses: false,
      isLoadingHistory: false,
      isCheckingIn: false,
      fetchTimerStatuses: jest.fn(),
      fetchResolvedTimers: jest.fn(),
      fetchCheckInHistory: jest.fn(),
      performCheckIn: jest.fn(),
      startPolling: jest.fn(),
      stopPolling: jest.fn(),
    });
  });

  it('should render disabled message when timers disabled', () => {
    const { getByText } = render(<CheckInTabPanel callId={1} checkInTimersEnabled={false} />);

    expect(getByText('check_in.timers_disabled')).toBeTruthy();
  });

  it('should render quick check-in button when enabled', () => {
    mockUseCheckInStore.mockReturnValue({
      timerStatuses: [
        {
          TargetType: 0,
          TargetTypeName: 'Personnel',
          TargetEntityId: '1',
          TargetName: 'John Doe',
          UnitId: null,
          LastCheckIn: null,
          DurationMinutes: 20,
          WarningThresholdMinutes: 5,
          ElapsedMinutes: 0,
          Status: 'Ok',
        },
      ],
      resolvedTimers: [],
      checkInHistory: [],
      isLoadingStatuses: false,
      isLoadingHistory: false,
      isCheckingIn: false,
      fetchTimerStatuses: jest.fn(),
      fetchResolvedTimers: jest.fn(),
      fetchCheckInHistory: jest.fn(),
      performCheckIn: jest.fn(),
      startPolling: jest.fn(),
      stopPolling: jest.fn(),
    });

    const { getByTestId } = render(<CheckInTabPanel callId={1} checkInTimersEnabled={true} />);

    expect(getByTestId('quick-check-in-button')).toBeTruthy();
  });

  it('should hide quick check-in when a resolved Personnel timer is not currently active', () => {
    mockUseCheckInStore.mockReturnValue({
      timerStatuses: [
        {
          TargetType: 1,
          TargetTypeName: 'UnitType',
          TargetEntityId: '1',
          TargetName: 'UnitType',
          UnitId: 42,
          LastCheckIn: null,
          DurationMinutes: 30,
          WarningThresholdMinutes: 5,
          ElapsedMinutes: 0,
          Status: 'Ok',
        },
      ],
      resolvedTimers: [
        {
          TargetType: 0,
          TargetTypeName: 'Personnel',
          UnitTypeId: null,
          TargetEntityId: '',
          TargetName: 'Personnel',
          DurationMinutes: 30,
          WarningThresholdMinutes: 5,
          IsFromOverride: false,
          ActiveForStates: '3',
        },
      ],
      checkInHistory: [],
      isLoadingStatuses: false,
      isLoadingHistory: false,
      isCheckingIn: false,
      fetchTimerStatuses: jest.fn(),
      fetchResolvedTimers: jest.fn(),
      fetchCheckInHistory: jest.fn(),
      performCheckIn: jest.fn(),
      startPolling: jest.fn(),
      stopPolling: jest.fn(),
    });

    const { queryByTestId } = render(<CheckInTabPanel callId={1} checkInTimersEnabled={true} />);

    expect(queryByTestId('quick-check-in-button')).toBeNull();
  });

  it('shows a UnitType check-in when the assigned current unit has the required type', () => {
    mockUnits = [{ UnitId: '42', TypeId: 5, Name: 'Engine 42' }];
    mockRoles = [{ UnitId: '42', UnitRoleId: '1', Name: 'Driver', UserId: 'user-1' }];
    mockUseCheckInStore.mockReturnValue({
      timerStatuses: [
        {
          TargetType: 1,
          TargetTypeName: 'UnitType',
          TargetEntityId: '5',
          TargetName: 'UnitType',
          UnitId: null,
          LastCheckIn: null,
          DurationMinutes: 30,
          WarningThresholdMinutes: 5,
          ElapsedMinutes: 0,
          Status: 'Ok',
        },
      ],
      resolvedTimers: [],
      checkInHistory: [],
      isLoadingStatuses: false,
      isLoadingHistory: false,
      isCheckingIn: false,
      fetchTimerStatuses: jest.fn(),
      fetchResolvedTimers: jest.fn(),
      fetchCheckInHistory: jest.fn(),
      performCheckIn: jest.fn(),
      startPolling: jest.fn(),
      stopPolling: jest.fn(),
    });

    const { getByTestId } = render(<CheckInTabPanel callId={1} checkInTimersEnabled={true} />);

    expect(getByTestId('quick-check-in-button')).toBeTruthy();
  });

  it('hides mismatched UnitType and IC check-ins', () => {
    mockUnits = [{ UnitId: '42', TypeId: 5, Name: 'Engine 42' }];
    mockActiveUnitId = '42';
    mockUseCheckInStore.mockReturnValue({
      timerStatuses: [
        {
          TargetType: 1,
          TargetTypeName: 'UnitType',
          TargetEntityId: '6',
          TargetName: 'Other UnitType',
          UnitId: null,
          LastCheckIn: null,
          DurationMinutes: 30,
          WarningThresholdMinutes: 5,
          ElapsedMinutes: 0,
          Status: 'Ok',
        },
        {
          TargetType: 2,
          TargetTypeName: 'IC',
          TargetEntityId: '',
          TargetName: 'IC',
          UnitId: null,
          LastCheckIn: null,
          DurationMinutes: 30,
          WarningThresholdMinutes: 5,
          ElapsedMinutes: 0,
          Status: 'Ok',
        },
      ],
      resolvedTimers: [],
      checkInHistory: [],
      isLoadingStatuses: false,
      isLoadingHistory: false,
      isCheckingIn: false,
      fetchTimerStatuses: jest.fn(),
      fetchResolvedTimers: jest.fn(),
      fetchCheckInHistory: jest.fn(),
      performCheckIn: jest.fn(),
      startPolling: jest.fn(),
      stopPolling: jest.fn(),
    });

    const { getByText, queryByTestId, queryByText } = render(<CheckInTabPanel callId={1} checkInTimersEnabled={true} />);

    expect(getByText('check_in.no_timers')).toBeTruthy();
    expect(queryByTestId('quick-check-in-button')).toBeNull();
    expect(queryByText('Other UnitType')).toBeNull();
    expect(queryByText('IC')).toBeNull();
  });

  it('should render empty state when no timers', () => {
    const { getByText } = render(<CheckInTabPanel callId={1} checkInTimersEnabled={true} />);

    expect(getByText('check_in.no_timers')).toBeTruthy();
  });
});
