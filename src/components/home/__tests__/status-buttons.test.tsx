import { act, fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { StatusButtons } from '../status-buttons';
import { type StatusesResultData } from '@/models/v4/statuses/statusesResultData';
import { useCoreStore } from '@/stores/app/core-store';
import { useHomeStore } from '@/stores/home/home-store';
import { usePersonnelStatusBottomSheetStore } from '@/stores/status/personnel-status-store';

jest.mock('@/components/common/loading', () => ({
  Loading: () => null,
}));

jest.mock('@/stores/home/home-store');
jest.mock('@/stores/app/core-store');
jest.mock('@/stores/status/personnel-status-store');

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'home.status.no_options_available': 'No status options available',
      };

      return translations[key] || key;
    },
  }),
}));

const mockUseHomeStore = useHomeStore as jest.MockedFunction<typeof useHomeStore>;
const mockUseCoreStore = useCoreStore as jest.MockedFunction<typeof useCoreStore>;
const mockUsePersonnelStatusBottomSheetStore = usePersonnelStatusBottomSheetStore as jest.MockedFunction<typeof usePersonnelStatusBottomSheetStore>;

const createStatus = (overrides: Partial<StatusesResultData>): StatusesResultData => ({
  Id: 0,
  Type: 0,
  StateId: 0,
  Text: '',
  BColor: '#2563eb',
  Color: '#ffffff',
  Gps: false,
  Note: 0,
  Detail: 0,
  ...overrides,
});

describe('StatusButtons', () => {
  const mockSetIsOpen = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseHomeStore.mockReturnValue({
      departmentStats: {
        openCalls: 0,
        personnelInService: 0,
        unitsInService: 0,
      },
      isLoadingStats: false,
      currentUser: null,
      currentUserStatus: null,
      currentUserStaffing: null,
      isLoadingUser: false,
      availableStatuses: [],
      availableStaffings: [],
      isLoadingOptions: false,
      error: null,
      fetchDepartmentStats: jest.fn(),
      fetchCurrentUserInfo: jest.fn(),
      refreshAll: jest.fn(),
    });

    mockUsePersonnelStatusBottomSheetStore.mockReturnValue({
      setIsOpen: mockSetIsOpen,
    } as ReturnType<typeof usePersonnelStatusBottomSheetStore>);
  });

  it('filters out the legacy hidden system statuses by ID', () => {
    mockUseCoreStore.mockReturnValue({
      activeStatuses: [
        createStatus({ Id: 1, Text: 'Available', Detail: 0 }),
        createStatus({ Id: 4, Text: 'System Status 4', Detail: 0 }),
        createStatus({ Id: 5, Text: 'System Status 5', Detail: 5 }),
        createStatus({ Id: 10, Text: 'Transporting', Detail: 4 }),
      ],
    } as ReturnType<typeof useCoreStore>);

    render(<StatusButtons />);

    expect(screen.getByText('Available')).toBeTruthy();
    expect(screen.getByText('Transporting')).toBeTruthy();
    expect(screen.queryByText('System Status 4')).toBeNull();
    expect(screen.queryByText('System Status 5')).toBeNull();
  });

  it('does not hide non-legacy statuses just because they use newer detail values', () => {
    mockUseCoreStore.mockReturnValue({
      activeStatuses: [
        createStatus({ Id: 8, Text: 'POI Destination Status', Detail: 4 }),
        createStatus({ Id: 9, Text: 'Call and POI Status', Detail: 5 }),
      ],
    } as ReturnType<typeof useCoreStore>);

    render(<StatusButtons />);

    expect(screen.getByText('POI Destination Status')).toBeTruthy();
    expect(screen.getByText('Call and POI Status')).toBeTruthy();
  });

  it('opens the personnel status sheet with the selected visible status', () => {
    const availableStatus = createStatus({ Id: 1, Text: 'Available', Detail: 0 });

    mockUseCoreStore.mockReturnValue({
      activeStatuses: [availableStatus],
    } as ReturnType<typeof useCoreStore>);

    render(<StatusButtons />);

    fireEvent.press(screen.getByTestId('status-button-1'));

    expect(mockSetIsOpen).toHaveBeenCalledWith(true, availableStatus);
  });

  it('shows the empty state when every status is filtered out', () => {
    mockUseCoreStore.mockReturnValue({
      activeStatuses: [
        createStatus({ Id: 4, Text: 'System Status 4', Detail: 0 }),
        createStatus({ Id: 5, Text: 'System Status 5', Detail: 5 }),
      ],
    } as ReturnType<typeof useCoreStore>);

    render(<StatusButtons />);

    expect(screen.getByText('No status options available')).toBeTruthy();
  });

  describe('status flow', () => {
    // After "Departed" only "On Scene" is offered (Custom Statuses → Next statuses).
    const available = createStatus({ Id: 10, Text: 'Available', Detail: 0, NextIds: [] });
    const departed = createStatus({ Id: 12, Text: 'Departed', Detail: 0, NextIds: [13] });
    const onScene = createStatus({ Id: 13, Text: 'On Scene', Detail: 0, NextIds: [10] });

    const setStores = (statusType: number | null, config: Record<string, unknown> | null = null) => {
      mockUseCoreStore.mockReturnValue({
        activeStatuses: [available, departed, onScene],
        currentStatus: statusType == null ? null : { StatusType: statusType },
        config,
      } as unknown as ReturnType<typeof useCoreStore>);
    };

    afterEach(() => {
      jest.useRealTimers();
    });

    it('offers only the next statuses, with a way to show them all', () => {
      setStores(12);

      render(<StatusButtons />);

      expect(screen.getByText('On Scene')).toBeTruthy();
      expect(screen.queryByText('Available')).toBeNull();

      fireEvent.press(screen.getByTestId('status-buttons-show-all'));

      expect(screen.getByText('Available')).toBeTruthy();
      expect(screen.getByTestId('status-button-12').props.accessibilityLabel).toBe('Departed, personnel.status.current');
      expect(screen.getByTestId('status-buttons-show-next')).toBeTruthy();
    });

    it('marks the current status when it has no next statuses', () => {
      setStores(10);

      render(<StatusButtons />);

      expect(screen.getByText('Departed')).toBeTruthy();
      expect(screen.getByTestId('status-current-ring-10')).toBeTruthy();
      expect(screen.getByTestId('status-button-10').props.accessibilityLabel).toBe('Available, personnel.status.current');
      expect(screen.queryByTestId('status-buttons-show-all')).toBeNull();
    });

    it('rings only the current status, without a "Current" badge', () => {
      setStores(12);

      render(<StatusButtons />);
      fireEvent.press(screen.getByTestId('status-buttons-show-all'));

      expect(screen.getByTestId('status-current-ring-12')).toBeTruthy();
      expect(screen.queryByTestId('status-current-ring-10')).toBeNull();
      expect(screen.queryByTestId('status-current-ring-13')).toBeNull();
      expect(screen.queryByText('personnel.status.current')).toBeNull();
    });

    it('rings the current status in hold mode', () => {
      setStores(12, { StatusHoldToConfirm: true });

      render(<StatusButtons />);
      fireEvent.press(screen.getByTestId('status-buttons-show-all'));

      expect(screen.getByTestId('status-current-ring-12')).toBeTruthy();
      expect(screen.getByTestId('status-hold-button-12').props.accessibilityLabel).toBe('Departed, personnel.status.current');
      expect(screen.getByTestId('status-hold-button-13').props.accessibilityLabel).toBe('On Scene');
    });

    it('in hold mode opens the sheet and confirms the status once the hold completes', () => {
      jest.useFakeTimers();
      const mockConfirmHeldStatus = jest.fn();
      mockUsePersonnelStatusBottomSheetStore.mockReturnValue({
        setIsOpen: mockSetIsOpen,
        confirmHeldStatus: mockConfirmHeldStatus,
      } as unknown as ReturnType<typeof usePersonnelStatusBottomSheetStore>);
      setStores(10, { StatusHoldToConfirm: true });

      render(<StatusButtons />);

      expect(screen.queryByTestId('status-button-12')).toBeNull();

      fireEvent(screen.getByTestId('status-hold-button-12'), 'pressIn');
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      expect(mockSetIsOpen).toHaveBeenCalledWith(true, departed);
      expect(mockConfirmHeldStatus).toHaveBeenCalledWith(departed);
    });

    it('in hold mode a tap only explains the gesture', () => {
      jest.useFakeTimers();
      setStores(10, { StatusHoldToConfirm: true });

      render(<StatusButtons />);

      fireEvent(screen.getByTestId('status-hold-button-12'), 'pressIn');
      fireEvent(screen.getByTestId('status-hold-button-12'), 'pressOut');

      expect(mockSetIsOpen).not.toHaveBeenCalled();
    });
  });
});
