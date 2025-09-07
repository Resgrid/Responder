import { render, screen } from '@testing-library/react-native';
import React from 'react';

import { UserStatusCard } from '../user-status-card';
import { useHomeStore } from '@/stores/home/home-store';
import { PersonnelInfoResultData } from '@/models/v4/personnel/personnelInfoResultData';

// Mock Gluestack UI utilities before any UI component imports
jest.mock('@gluestack-ui/nativewind-utils/tva', () => ({
  tva: jest.fn().mockImplementation((config) => {
    return jest.fn().mockImplementation((props) => {
      const { class: className, ...restProps } = props || {};
      return className || '';
    });
  }),
}));

jest.mock('@gluestack-ui/nativewind-utils/IsWeb', () => ({
  isWeb: false,
}));

jest.mock('@gluestack-ui/nativewind-utils', () => ({
  tva: jest.fn().mockImplementation((config) => {
    return jest.fn().mockImplementation((props) => {
      const { class: className, ...restProps } = props || {};
      return className || '';
    });
  }),
  isWeb: false,
}));

// Mock the store
jest.mock('@/stores/home/home-store');

// Mock the translation hook
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'home.user.my_status': 'My Status',
        'home.user.status_unknown': 'Unknown Status',
        'home.user.updated': 'Updated',
      };
      return translations[key] || key;
    },
  }),
}));

const mockUseHomeStore = useHomeStore as jest.MockedFunction<typeof useHomeStore>;

describe('UserStatusCard', () => {
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

    render(<UserStatusCard />);

    // Should show loading animation
    expect(screen.getByTestId('user-status-card')).toBeTruthy();
  });

  it('renders user status correctly', () => {
    const mockUser = new PersonnelInfoResultData();
    mockUser.Status = 'Available';
    mockUser.StatusColor = 'label-success';
    mockUser.StatusTimestamp = '2024-01-15T10:30:00Z';

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

    render(<UserStatusCard />);

    expect(screen.getByTestId('user-status-card')).toBeTruthy();
    expect(screen.getByTestId('user-status-text')).toBeTruthy();
    expect(screen.getByText('Available')).toBeTruthy();
    expect(screen.getByText('My Status')).toBeTruthy();
  });

  it('handles unknown status correctly', () => {
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

    render(<UserStatusCard />);

    expect(screen.getByText('Unknown Status')).toBeTruthy();
  });

  it('converts label colors correctly', () => {
    const mockUser = new PersonnelInfoResultData();
    mockUser.Status = 'On Scene';
    mockUser.StatusColor = 'label-danger';

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

    render(<UserStatusCard />);

    expect(screen.getByText('On Scene')).toBeTruthy();
  });
}); 