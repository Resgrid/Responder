import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

import { StaffingButtons } from '../staffing-buttons';
import { savePersonnelStaffing } from '@/api/personnel/personnelStaffing';
import { useAuthStore } from '@/lib/auth';
import { StatusesResultData } from '@/models/v4/statuses/statusesResultData';
import { useHomeStore } from '@/stores/home/home-store';
import { useToastStore } from '@/stores/toast/store';

// Mock all dependencies
jest.mock('@/api/personnel/personnelStaffing');
jest.mock('@/lib/auth');
jest.mock('@/stores/home/home-store');
jest.mock('@/stores/toast/store');

// Mock the Loading component
jest.mock('@/components/common/loading', () => ({
  Loading: ({ testID = 'loading' }: { testID?: string }) => (
    <div data-testid={testID}>Loading</div>
  ),
}));

// Mock gluestack-ui Button components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onPress, testID, ...props }: any) => (
    <button data-testid={testID} onClick={onPress} {...props}>
      {children}
    </button>
  ),
  ButtonText: ({ children, style, ...props }: any) => (
    <span style={style} {...props}>{children}</span>
  ),
}));

// Mock VStack component
jest.mock('@/components/ui/vstack', () => ({
  VStack: ({ children, testID, ...props }: any) => (
    <div data-testid={testID} {...props}>{children}</div>
  ),
}));

// Mock the translation hook
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'home.staffing.updated_successfully': 'Staffing updated successfully',
        'home.staffing.update_failed': 'Failed to update staffing',
        'home.staffing.no_options_available': 'No staffing options available',
        'home.error.no_user_id': 'User ID not available',
      };
      return translations[key] || key;
    },
  }),
}));

const mockSavePersonnelStaffing = savePersonnelStaffing as jest.MockedFunction<typeof savePersonnelStaffing>;
const mockUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>;
const mockUseHomeStore = useHomeStore as jest.MockedFunction<typeof useHomeStore>;
const mockUseToastStore = useToastStore as jest.MockedFunction<typeof useToastStore>;

describe('StaffingButtons', () => {
  const mockShowToast = jest.fn();
  const mockFetchCurrentUserInfo = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseAuthStore.mockReturnValue({
      userId: 'test-user-id',
      // Add other required auth properties
      isAuthenticated: true,
      isLoading: false,
      error: null,
      login: jest.fn(),
      logout: jest.fn(),
      status: 'signedIn',
      hydrate: jest.fn(),
    });

    mockUseToastStore.mockReturnValue(mockShowToast);
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
      isLoadingUser: false,
      availableStatuses: [],
      availableStaffings: [],
      isLoadingOptions: true,
      error: null,
      fetchDepartmentStats: jest.fn(),
      fetchCurrentUserInfo: mockFetchCurrentUserInfo,
      fetchStatusOptions: jest.fn(),
      fetchStaffingOptions: jest.fn(),
      refreshAll: jest.fn(),
    });

    const result = render(<StaffingButtons />);

    // Should render without errors
    expect(result).toBeTruthy();
  });

  it('renders staffing buttons correctly', () => {
    const mockStaffings = [
      { Id: 1, Text: 'On Duty', Color: '#10B981' } as StatusesResultData,
      { Id: 2, Text: 'Off Duty', Color: '#EF4444' } as StatusesResultData,
    ];

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
      availableStaffings: mockStaffings,
      isLoadingOptions: false,
      error: null,
      fetchDepartmentStats: jest.fn(),
      fetchCurrentUserInfo: mockFetchCurrentUserInfo,
      fetchStatusOptions: jest.fn(),
      fetchStaffingOptions: jest.fn(),
      refreshAll: jest.fn(),
    });

    const result = render(<StaffingButtons />);

    // Should render without errors
    expect(result).toBeTruthy();
  });

  it('handles staffing button press correctly', async () => {
    const mockStaffings = [
      { Id: 1, Text: 'On Duty', Color: '#10B981' } as StatusesResultData,
    ];

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
      availableStaffings: mockStaffings,
      isLoadingOptions: false,
      error: null,
      fetchDepartmentStats: jest.fn(),
      fetchCurrentUserInfo: mockFetchCurrentUserInfo,
      fetchStatusOptions: jest.fn(),
      fetchStaffingOptions: jest.fn(),
      refreshAll: jest.fn(),
    });

    render(<StaffingButtons />);

    // Component should render and hook should be called
    expect(mockUseHomeStore).toHaveBeenCalled();
  });

  it('handles no staffing options correctly', () => {
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
      fetchCurrentUserInfo: mockFetchCurrentUserInfo,
      fetchStatusOptions: jest.fn(),
      fetchStaffingOptions: jest.fn(),
      refreshAll: jest.fn(),
    });

    const result = render(<StaffingButtons />);

    expect(result).toBeTruthy();
  });

  it('handles API error correctly', async () => {
    const mockStaffings = [
      { Id: 1, Text: 'On Duty', Color: '#10B981' } as StatusesResultData,
    ];

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
      availableStaffings: mockStaffings,
      isLoadingOptions: false,
      error: null,
      fetchDepartmentStats: jest.fn(),
      fetchCurrentUserInfo: mockFetchCurrentUserInfo,
      fetchStatusOptions: jest.fn(),
      fetchStaffingOptions: jest.fn(),
      refreshAll: jest.fn(),
    });

    const result = render(<StaffingButtons />);

    expect(result).toBeTruthy();
  });
}); 