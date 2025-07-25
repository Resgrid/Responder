import { render, screen } from '@testing-library/react-native';
import React from 'react';

import { DepartmentStats } from '../department-stats';
import { useHomeStore } from '@/stores/home/home-store';

// Mock the store
jest.mock('@/stores/home/home-store');

// Mock the translation hook
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'home.stats.open_calls': 'Open Calls',
        'home.stats.personnel_in_service': 'Personnel In Service',
        'home.stats.units_in_service': 'Units In Service',
      };
      return translations[key] || key;
    },
  }),
}));

const mockUseHomeStore = useHomeStore as jest.MockedFunction<typeof useHomeStore>;

describe('DepartmentStats', () => {
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
      isLoadingStats: true,
      // Add other required properties
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

    render(<DepartmentStats />);

    expect(screen.getByTestId('department-stats')).toBeTruthy();
  });

  it('renders department statistics correctly', () => {
    mockUseHomeStore.mockReturnValue({
      departmentStats: {
        openCalls: 5,
        personnelInService: 12,
        unitsInService: 8,
      },
      isLoadingStats: false,
      // Add other required properties
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

    render(<DepartmentStats />);

    expect(screen.getByTestId('department-stats')).toBeTruthy();
    expect(screen.getByTestId('open-calls-stat')).toBeTruthy();
    expect(screen.getByTestId('personnel-in-service-stat')).toBeTruthy();
    expect(screen.getByTestId('units-in-service-stat')).toBeTruthy();

    expect(screen.getByText('5')).toBeTruthy();
    expect(screen.getByText('12')).toBeTruthy();
    expect(screen.getByText('8')).toBeTruthy();

    expect(screen.getByText('Open Calls')).toBeTruthy();
    expect(screen.getByText('Personnel In Service')).toBeTruthy();
    expect(screen.getByText('Units In Service')).toBeTruthy();
  });

  it('handles zero statistics correctly', () => {
    mockUseHomeStore.mockReturnValue({
      departmentStats: {
        openCalls: 0,
        personnelInService: 0,
        unitsInService: 0,
      },
      isLoadingStats: false,
      // Add other required properties
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

    render(<DepartmentStats />);

    // Check that there are three instances of "0" (one for each stat)
    const zeroElements = screen.getAllByText('0');
    expect(zeroElements).toHaveLength(3);
  });
}); 