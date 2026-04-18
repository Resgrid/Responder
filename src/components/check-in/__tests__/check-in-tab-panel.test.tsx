import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { render } from '@testing-library/react-native';
import React from 'react';

import { useCheckInStore } from '@/stores/calls/check-in-store';
import { CheckInTabPanel } from '../check-in-tab-panel';

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
  useUnitsStore: jest.fn((selector: (state: any) => any) => selector({ units: [], fetchUnits: jest.fn() })),
}));
jest.mock('@/stores/dispatch/store', () => ({
  useDispatchStore: jest.fn((selector: (state: any) => any) => selector({ data: { units: [] }, fetchDispatchData: jest.fn() })),
}));
jest.mock('@/stores/home/home-store', () => ({
  useHomeStore: jest.fn((selector: (state: any) => any) => selector({ currentUser: null })),
}));
jest.mock('@/stores/roles/store', () => ({
  useRolesStore: jest.fn((selector: (state: any) => any) => selector({ users: [] })),
}));

const mockUseCheckInStore = useCheckInStore as unknown as jest.Mock;

describe('CheckInTabPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

  it('should render quick check-in button when resolvedTimers contain Personnel type', () => {
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

    const { getByTestId } = render(<CheckInTabPanel callId={1} checkInTimersEnabled={true} />);

    expect(getByTestId('quick-check-in-button')).toBeTruthy();
  });

  it('should render empty state when no timers', () => {
    const { getByText } = render(<CheckInTabPanel callId={1} checkInTimersEnabled={true} />);

    expect(getByText('check_in.no_timers')).toBeTruthy();
  });
});
