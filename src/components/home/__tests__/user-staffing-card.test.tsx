import { render, screen } from '@testing-library/react-native';
import React from 'react';

import { UserStaffingCard } from '../user-staffing-card';
import { useHomeStore } from '@/stores/home/home-store';
import { PersonnelInfoResultData } from '@/models/v4/personnel/personnelInfoResultData';

// Mock the store
jest.mock('@/stores/home/home-store');

// Mock the translation hook
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'home.user.my_staffing': 'My Staffing',
        'home.user.staffing_unknown': 'Unknown Staffing',
        'home.user.updated': 'Updated',
      };
      return translations[key] || key;
    },
  }),
}));

const mockUseHomeStore = useHomeStore as jest.MockedFunction<typeof useHomeStore>;

describe('UserStaffingCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state correctly', () => {
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
      isLoadingUser: true,
      availableStatuses: [],
      availableStaffings: [],
      isLoadingOptions: false,
      error: null,
      fetchDepartmentStats: jest.fn(),
      fetchCurrentUserInfo: jest.fn(),
      fetchStatusOptions: jest.fn(),
      fetchStaffingOptions: jest.fn(),
      refreshAll: jest.fn(),
    });

    render(<UserStaffingCard />);

    // Should show loading animation
    expect(screen.getByTestId('user-staffing-card')).toBeTruthy();
  });

  it('renders user staffing correctly', () => {
    const mockUser = new PersonnelInfoResultData();
    mockUser.Staffing = 'On Duty';
    mockUser.StaffingColor = 'label-success';
    mockUser.StaffingTimestamp = '2024-01-15T10:30:00Z';

    mockUseHomeStore.mockReturnValue({
      departmentStats: {
        openCalls: 0,
        personnelInService: 0,
        unitsInService: 0,
      },
      isLoadingStats: false,
      currentUser: mockUser,
      currentUserStatus: null,
      currentUserStaffing: null,
      isLoadingUser: false,
      availableStatuses: [],
      availableStaffings: [],
      isLoadingOptions: false,
      error: null,
      fetchDepartmentStats: jest.fn(),
      fetchCurrentUserInfo: jest.fn(),
      fetchStatusOptions: jest.fn(),
      fetchStaffingOptions: jest.fn(),
      refreshAll: jest.fn(),
    });

    render(<UserStaffingCard />);

    expect(screen.getByTestId('user-staffing-card')).toBeTruthy();
    expect(screen.getByTestId('user-staffing-text')).toBeTruthy();
    expect(screen.getByText('On Duty')).toBeTruthy();
    expect(screen.getByText('My Staffing')).toBeTruthy();
  });

  it('handles unknown staffing correctly', () => {
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
      fetchStatusOptions: jest.fn(),
      fetchStaffingOptions: jest.fn(),
      refreshAll: jest.fn(),
    });

    render(<UserStaffingCard />);

    expect(screen.getByText('Unknown Staffing')).toBeTruthy();
  });

  it('converts label colors correctly', () => {
    const mockUser = new PersonnelInfoResultData();
    mockUser.Staffing = 'Off Duty';
    mockUser.StaffingColor = 'label-warning';

    mockUseHomeStore.mockReturnValue({
      departmentStats: {
        openCalls: 0,
        personnelInService: 0,
        unitsInService: 0,
      },
      isLoadingStats: false,
      currentUser: mockUser,
      currentUserStatus: null,
      currentUserStaffing: null,
      isLoadingUser: false,
      availableStatuses: [],
      availableStaffings: [],
      isLoadingOptions: false,
      error: null,
      fetchDepartmentStats: jest.fn(),
      fetchCurrentUserInfo: jest.fn(),
      fetchStatusOptions: jest.fn(),
      fetchStaffingOptions: jest.fn(),
      refreshAll: jest.fn(),
    });

    render(<UserStaffingCard />);

    expect(screen.getByText('Off Duty')).toBeTruthy();
  });
}); 