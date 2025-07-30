import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { StaffingButtons } from '../staffing-buttons';
import { useHomeStore } from '@/stores/home/home-store';
import { useCoreStore } from '@/stores/app/core-store';
import { useStaffingBottomSheetStore } from '@/stores/staffing/staffing-bottom-sheet-store';

jest.mock('@/stores/home/home-store');
jest.mock('@/stores/app/core-store');
jest.mock('@/stores/staffing/staffing-bottom-sheet-store');

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key === 'home.staffing.no_options_available' ? 'No staffing options available' : key,
  }),
}));

jest.mock('@/lib/utils', () => ({
  invertColor: jest.fn(() => '#000000'),
}));

const mockUseHomeStore = useHomeStore as jest.MockedFunction<typeof useHomeStore>;
const mockUseCoreStore = useCoreStore as jest.MockedFunction<typeof useCoreStore>;
const mockUseStaffingBottomSheetStore = useStaffingBottomSheetStore as jest.MockedFunction<typeof useStaffingBottomSheetStore>;

describe('StaffingButtons', () => {
  const mockSetIsOpen = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseHomeStore.mockReturnValue({
      departmentStats: { openCalls: 0, personnelInService: 0, unitsInService: 0 },
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

    mockUseCoreStore.mockReturnValue({
      activeStaffing: [{ Id: 1, Type: 1, StateId: 1, Text: 'Available', BColor: '#00FF00', Color: '#000000', Gps: false, Note: 0, Detail: 0 }],
    });

    mockUseStaffingBottomSheetStore.mockReturnValue({
      setIsOpen: mockSetIsOpen,
    });
  });

  it('renders staffing buttons correctly', () => {
    render(<StaffingButtons />);
    expect(screen.getByTestId('staffing-buttons')).toBeTruthy();
    expect(screen.getByTestId('staffing-button-1')).toBeTruthy();
    expect(screen.getByText('Available')).toBeTruthy();
  });

  it('calls setIsOpen when button is pressed', () => {
    render(<StaffingButtons />);
    const button = screen.getByTestId('staffing-button-1');
    fireEvent.press(button);
    expect(mockSetIsOpen).toHaveBeenCalledWith(true, expect.objectContaining({ Id: 1, Text: 'Available', BColor: '#00FF00' }));
  });
});
