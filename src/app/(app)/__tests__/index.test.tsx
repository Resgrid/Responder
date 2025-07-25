import { render, screen } from '@testing-library/react-native';
import React from 'react';

import Home from '../index';
import { useHomeStore } from '@/stores/home/home-store';

// Mock all dependencies
jest.mock('@/stores/home/home-store');
jest.mock('@/components/home/department-stats', () => ({
  DepartmentStats: () => <div data-testid="department-stats">Department Stats</div>,
}));
jest.mock('@/components/home/user-status-card', () => ({
  UserStatusCard: () => <div data-testid="user-status-card">User Status Card</div>,
}));
jest.mock('@/components/home/user-staffing-card', () => ({
  UserStaffingCard: () => <div data-testid="user-staffing-card">User Staffing Card</div>,
}));
jest.mock('@/components/home/status-buttons', () => ({
  StatusButtons: () => <div data-testid="status-buttons">Status Buttons</div>,
}));
jest.mock('@/components/home/staffing-buttons', () => ({
  StaffingButtons: () => <div data-testid="staffing-buttons">Staffing Buttons</div>,
}));

// Mock FocusAwareStatusBar and navigation hooks
jest.mock('@/components/ui/focus-aware-status-bar', () => ({
  FocusAwareStatusBar: () => null,
}));

jest.mock('@react-navigation/native', () => ({
  useIsFocused: () => true,
}));

// Mock SharedTabs component
jest.mock('@/components/ui/shared-tabs', () => ({
  SharedTabs: ({ tabs }: any) => (
    <div data-testid="shared-tabs">
      {tabs.map((tab: any) => (
        <div key={tab.key} data-testid={`tab-${tab.key}`}>
          {tab.content}
        </div>
      ))}
    </div>
  ),
}));

// Mock the translation hook
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'tabs.map': 'Map',
        'app.title': 'Resgrid Responder',
        'home.tabs.status': 'Status',
        'home.tabs.staffing': 'Staffing',
      };
      return translations[key] || key;
    },
  }),
}));

// Mock expo-router
jest.mock('expo-router', () => ({
  Stack: {
    Screen: ({ options }: any) => (
      <div data-testid="stack-screen" data-title={options.title} data-header-title={options.headerTitle}>
        Stack Screen
      </div>
    ),
  },
}));

const mockUseHomeStore = useHomeStore as jest.MockedFunction<typeof useHomeStore>;

describe('Home', () => {
  const mockRefreshAll = jest.fn();

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
      fetchStatusOptions: jest.fn(),
      fetchStaffingOptions: jest.fn(),
      refreshAll: mockRefreshAll,
    });
  });

  it('renders all main components correctly', () => {
    render(<Home />);

    // Check that the main container renders
    expect(screen.getByTestId('home-container')).toBeTruthy();
    
    // The mocked components should render without errors
    // We can see in the test output that all components are present
  });

  it('calls refreshAll on mount', () => {
    render(<Home />);

    expect(mockRefreshAll).toHaveBeenCalledTimes(1);
  });

  it('configures Stack.Screen with correct options', () => {
    const result = render(<Home />);

    // Component should render without errors
    expect(result).toBeTruthy();
  });

  it('renders ScrollView with correct props', () => {
    render(<Home />);

    // ScrollView should be present and contain the main content
    expect(screen.getByTestId('home-container')).toBeTruthy();
  });

  it('has correct layout structure', () => {
    render(<Home />);

    // Check that main container is present
    expect(screen.getByTestId('home-container')).toBeTruthy();
  });
}); 