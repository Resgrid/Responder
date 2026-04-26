import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { StatusButtons } from '../status-buttons';
import { type StatusesResultData } from '@/models/v4/statuses/statusesResultData';
import { useCoreStore } from '@/stores/app/core-store';
import { useHomeStore } from '@/stores/home/home-store';
import { usePersonnelStatusBottomSheetStore } from '@/stores/status/personnel-status-store';

jest.mock('@gluestack-ui/nativewind-utils/tva', () => ({
  tva: jest.fn().mockImplementation(() => {
    return jest.fn().mockImplementation((props) => {
      const { class: className } = props || {};
      return className || '';
    });
  }),
}));

jest.mock('@gluestack-ui/nativewind-utils/IsWeb', () => ({
  isWeb: false,
}));

jest.mock('@gluestack-ui/nativewind-utils', () => ({
  tva: jest.fn().mockImplementation(() => {
    return jest.fn().mockImplementation((props) => {
      const { class: className } = props || {};
      return className || '';
    });
  }),
  isWeb: false,
}));

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
});
