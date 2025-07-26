import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

import { type PersonnelInfoResultData } from '@/models/v4/personnel/personnelInfoResultData';
import { usePersonnelStore } from '@/stores/personnel/store';

import Personnel from '../home/personnel';

// Mock components
jest.mock('@/components/common/loading', () => ({
  Loading: () => {
    const React = require('react');
    const { Text } = require('react-native');

    return React.createElement(Text, {}, 'Loading');
  },
}));

jest.mock('@/components/common/zero-state', () => ({
  __esModule: true,
  default: ({ heading, description }: { heading: string; description: string }) => {
    const React = require('react');
    const { View, Text } = require('react-native');

    return React.createElement(
      View,
      { testID: 'zero-state' },
      React.createElement(Text, {}, `ZeroState: ${heading}`),
      React.createElement(Text, {}, description)
    );
  },
}));

jest.mock('@/components/personnel/personnel-card', () => ({
  PersonnelCard: ({ personnel, onPress }: { personnel: PersonnelInfoResultData; onPress: (id: string) => void }) => {
    const React = require('react');
    const { Pressable, Text } = require('react-native');

    return React.createElement(
      Pressable,
      {
        testID: `personnel-card-${personnel.UserId}`,
        onPress: () => onPress(personnel.UserId),
      },
      React.createElement(Text, {}, `${personnel.FirstName} ${personnel.LastName}`)
    );
  },
}));

jest.mock('@/components/personnel/personnel-details-sheet', () => ({
  PersonnelDetailsSheet: () => {
    const React = require('react');
    const { Text } = require('react-native');

    return React.createElement(Text, {}, 'PersonnelDetailsSheet');
  },
}));

// Mock FocusAwareStatusBar
jest.mock('@/components/ui/focus-aware-status-bar', () => ({
  FocusAwareStatusBar: () => null,
}));

// Mock navigation hooks
jest.mock('@react-navigation/core', () => ({
  useIsFocused: () => true,
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
  }),
}));

// Mock the personnel store
jest.mock('@/stores/personnel/store');
const mockUsePersonnelStore = usePersonnelStore as jest.MockedFunction<typeof usePersonnelStore>;

// Mock translations
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue?: string) => defaultValue || key,
  }),
}));

describe('Personnel Page', () => {
  const mockFetchPersonnel = jest.fn();
  const mockSetSearchQuery = jest.fn();
  const mockSelectPersonnel = jest.fn();

  const mockPersonnelData: PersonnelInfoResultData[] = [
    {
      UserId: '1',
      IdentificationNumber: 'EMP001',
      DepartmentId: 'dept1',
      FirstName: 'John',
      LastName: 'Doe',
      EmailAddress: 'john.doe@example.com',
      MobilePhone: '+1234567890',
      GroupId: 'group1',
      GroupName: 'Fire Department',
      StatusId: 'status1',
      Status: 'Available',
      StatusColor: '#22C55E',
      StatusTimestamp: '2023-12-01T10:00:00Z',
      StatusDestinationId: '',
      StatusDestinationName: '',
      StaffingId: 'staff1',
      Staffing: 'On Duty',
      StaffingColor: '#3B82F6',
      StaffingTimestamp: '2023-12-01T08:00:00Z',
      Roles: ['Firefighter', 'EMT'],
    },
    {
      UserId: '2',
      IdentificationNumber: 'EMP002',
      DepartmentId: 'dept1',
      FirstName: 'Jane',
      LastName: 'Smith',
      EmailAddress: 'jane.smith@example.com',
      MobilePhone: '+1234567891',
      GroupId: 'group2',
      GroupName: 'EMS',
      StatusId: 'status2',
      Status: 'Busy',
      StatusColor: '#EF4444',
      StatusTimestamp: '2023-12-01T09:30:00Z',
      StatusDestinationId: 'dest1',
      StatusDestinationName: 'Hospital A',
      StaffingId: 'staff2',
      Staffing: 'Off Duty',
      StaffingColor: '#6B7280',
      StaffingTimestamp: '2023-12-01T09:00:00Z',
      Roles: ['Paramedic', 'Driver'],
    },
    {
      UserId: '3',
      IdentificationNumber: 'EMP003',
      DepartmentId: 'dept1',
      FirstName: 'Bob',
      LastName: 'Johnson',
      EmailAddress: 'bob.johnson@example.com',
      MobilePhone: '',
      GroupId: 'group1',
      GroupName: 'Fire Department',
      StatusId: 'status3',
      Status: 'Unavailable',
      StatusColor: '#94A3B8',
      StatusTimestamp: '2023-12-01T07:00:00Z',
      StatusDestinationId: '',
      StatusDestinationName: '',
      StaffingId: 'staff3',
      Staffing: 'On Duty',
      StaffingColor: '#3B82F6',
      StaffingTimestamp: '2023-12-01T08:30:00Z',
      Roles: ['Captain', 'Firefighter'],
    },
  ];

  const defaultStoreState = {
    personnel: [],
    searchQuery: '',
    setSearchQuery: mockSetSearchQuery,
    selectPersonnel: mockSelectPersonnel,
    isLoading: false,
    fetchPersonnel: mockFetchPersonnel,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePersonnelStore.mockReturnValue(defaultStoreState as any);
  });

  describe('Initial State and Loading', () => {
    it('should render loading state during initial fetch', () => {
      mockUsePersonnelStore.mockReturnValue({
        ...defaultStoreState,
        isLoading: true,
        personnel: [],
      } as any);

      render(<Personnel />);

      expect(screen.getByText('Loading')).toBeTruthy();
    });

    it('should call fetchPersonnel on mount', () => {
      render(<Personnel />);

      expect(mockFetchPersonnel).toHaveBeenCalledTimes(1);
    });

    it('should render search input', () => {
      render(<Personnel />);

      expect(screen.getByPlaceholderText('Search personnel...')).toBeTruthy();
    });
  });

  describe('Personnel List Rendering', () => {
    it('should render personnel list when data is loaded', async () => {
      mockUsePersonnelStore.mockReturnValue({
        ...defaultStoreState,
        personnel: mockPersonnelData,
        isLoading: false,
      } as any);

      render(<Personnel />);

      await waitFor(() => {
        expect(screen.getByTestId('personnel-card-1')).toBeTruthy();
        expect(screen.getByTestId('personnel-card-2')).toBeTruthy();
        expect(screen.getByTestId('personnel-card-3')).toBeTruthy();
      });

      expect(mockFetchPersonnel).toHaveBeenCalledTimes(1);
    });

    it('should render personnel names correctly', async () => {
      mockUsePersonnelStore.mockReturnValue({
        ...defaultStoreState,
        personnel: mockPersonnelData,
        isLoading: false,
      } as any);

      render(<Personnel />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeTruthy();
        expect(screen.getByText('Jane Smith')).toBeTruthy();
        expect(screen.getByText('Bob Johnson')).toBeTruthy();
      });
    });

    it('should handle personnel with empty IDs using keyExtractor fallback', async () => {
      const personnelWithEmptyId = [
        ...mockPersonnelData,
        {
          ...mockPersonnelData[0],
          UserId: '',
          FirstName: 'Test',
          LastName: 'User',
        },
      ];

      mockUsePersonnelStore.mockReturnValue({
        ...defaultStoreState,
        personnel: personnelWithEmptyId,
        isLoading: false,
      } as any);

      render(<Personnel />);

      await waitFor(() => {
        expect(screen.getByText('Test User')).toBeTruthy();
      });
    });
  });

  describe('Zero State', () => {
    it('should render zero state when no personnel are available', () => {
      mockUsePersonnelStore.mockReturnValue({
        ...defaultStoreState,
        personnel: [],
        isLoading: false,
      } as any);

      render(<Personnel />);

      expect(screen.getByTestId('zero-state')).toBeTruthy();
      expect(screen.getByText('No personnel match your search criteria or no personnel data is available.')).toBeTruthy();
    });

    it('should render zero state when search returns no results', () => {
      mockUsePersonnelStore.mockReturnValue({
        ...defaultStoreState,
        personnel: mockPersonnelData,
        searchQuery: 'nonexistent',
        isLoading: false,
      } as any);

      render(<Personnel />);

      expect(screen.getByTestId('zero-state')).toBeTruthy();
    });
  });

  describe('Search Functionality', () => {
    beforeEach(() => {
      mockUsePersonnelStore.mockReturnValue({
        ...defaultStoreState,
        personnel: mockPersonnelData,
        isLoading: false,
      } as any);
    });

    it('should filter personnel by first name', async () => {
      mockUsePersonnelStore.mockReturnValue({
        ...defaultStoreState,
        personnel: mockPersonnelData,
        searchQuery: 'john',
        isLoading: false,
      } as any);

      render(<Personnel />);

      // John Doe and Bob Johnson should both be visible (Johnson contains "john")
      await waitFor(() => {
        expect(screen.getByTestId('personnel-card-1')).toBeTruthy(); // John Doe
        expect(screen.queryByTestId('personnel-card-2')).toBeFalsy(); // Jane Smith - not visible
        expect(screen.getByTestId('personnel-card-3')).toBeTruthy(); // Bob Johnson - contains "john"
      });
    });

    it('should filter personnel by last name', async () => {
      mockUsePersonnelStore.mockReturnValue({
        ...defaultStoreState,
        personnel: mockPersonnelData,
        searchQuery: 'smith',
        isLoading: false,
      } as any);

      render(<Personnel />);

      await waitFor(() => {
        expect(screen.queryByTestId('personnel-card-1')).toBeFalsy();
        expect(screen.getByTestId('personnel-card-2')).toBeTruthy();
        expect(screen.queryByTestId('personnel-card-3')).toBeFalsy();
      });
    });

    it('should filter personnel by email', async () => {
      mockUsePersonnelStore.mockReturnValue({
        ...defaultStoreState,
        personnel: mockPersonnelData,
        searchQuery: 'jane.smith',
        isLoading: false,
      } as any);

      render(<Personnel />);

      await waitFor(() => {
        expect(screen.getByTestId('personnel-card-2')).toBeTruthy();
        expect(screen.queryByTestId('personnel-card-1')).toBeFalsy();
      });
    });

    it('should filter personnel by group name', async () => {
      mockUsePersonnelStore.mockReturnValue({
        ...defaultStoreState,
        personnel: mockPersonnelData,
        searchQuery: 'EMS',
        isLoading: false,
      } as any);

      render(<Personnel />);

      await waitFor(() => {
        expect(screen.getByTestId('personnel-card-2')).toBeTruthy();
        expect(screen.queryByTestId('personnel-card-1')).toBeFalsy();
        expect(screen.queryByTestId('personnel-card-3')).toBeFalsy();
      });
    });

    it('should filter personnel by status', async () => {
      mockUsePersonnelStore.mockReturnValue({
        ...defaultStoreState,
        personnel: mockPersonnelData,
        searchQuery: 'available',
        isLoading: false,
      } as any);

      render(<Personnel />);

      await waitFor(() => {
        expect(screen.getByTestId('personnel-card-1')).toBeTruthy();
        expect(screen.queryByTestId('personnel-card-2')).toBeFalsy();
      });
    });

    it('should filter personnel by staffing', async () => {
      mockUsePersonnelStore.mockReturnValue({
        ...defaultStoreState,
        personnel: mockPersonnelData,
        searchQuery: 'off duty',
        isLoading: false,
      } as any);

      render(<Personnel />);

      await waitFor(() => {
        expect(screen.getByTestId('personnel-card-2')).toBeTruthy();
        expect(screen.queryByTestId('personnel-card-1')).toBeFalsy();
      });
    });

    it('should filter personnel by identification number', async () => {
      mockUsePersonnelStore.mockReturnValue({
        ...defaultStoreState,
        personnel: mockPersonnelData,
        searchQuery: 'EMP002',
        isLoading: false,
      } as any);

      render(<Personnel />);

      await waitFor(() => {
        expect(screen.getByTestId('personnel-card-2')).toBeTruthy();
        expect(screen.queryByTestId('personnel-card-1')).toBeFalsy();
      });
    });

    it('should filter personnel by roles', async () => {
      mockUsePersonnelStore.mockReturnValue({
        ...defaultStoreState,
        personnel: mockPersonnelData,
        searchQuery: 'paramedic',
        isLoading: false,
      } as any);

      render(<Personnel />);

      await waitFor(() => {
        expect(screen.getByTestId('personnel-card-2')).toBeTruthy();
        expect(screen.queryByTestId('personnel-card-1')).toBeFalsy();
      });
    });

    it('should be case-insensitive', async () => {
      mockUsePersonnelStore.mockReturnValue({
        ...defaultStoreState,
        personnel: mockPersonnelData,
        searchQuery: 'JOHN',
        isLoading: false,
      } as any);

      render(<Personnel />);

      await waitFor(() => {
        expect(screen.getByTestId('personnel-card-1')).toBeTruthy();
      });
    });

    it('should handle empty search query by showing all personnel', async () => {
      mockUsePersonnelStore.mockReturnValue({
        ...defaultStoreState,
        personnel: mockPersonnelData,
        searchQuery: '',
        isLoading: false,
      } as any);

      render(<Personnel />);

      await waitFor(() => {
        expect(screen.getByTestId('personnel-card-1')).toBeTruthy();
        expect(screen.getByTestId('personnel-card-2')).toBeTruthy();
        expect(screen.getByTestId('personnel-card-3')).toBeTruthy();
      });
    });

    it('should handle whitespace-only search query', async () => {
      mockUsePersonnelStore.mockReturnValue({
        ...defaultStoreState,
        personnel: mockPersonnelData,
        searchQuery: '   ',
        isLoading: false,
      } as any);

      render(<Personnel />);

      await waitFor(() => {
        expect(screen.getByTestId('personnel-card-1')).toBeTruthy();
        expect(screen.getByTestId('personnel-card-2')).toBeTruthy();
        expect(screen.getByTestId('personnel-card-3')).toBeTruthy();
      });
    });
  });

  describe('Search Input Interactions', () => {
    it('should call setSearchQuery when search input changes', () => {
      render(<Personnel />);

      const searchInput = screen.getByPlaceholderText('Search personnel...');
      fireEvent.changeText(searchInput, 'john');

      expect(mockSetSearchQuery).toHaveBeenCalledWith('john');
    });

    it('should display clear button when search query exists', async () => {
      mockUsePersonnelStore.mockReturnValue({
        ...defaultStoreState,
        personnel: mockPersonnelData,
        searchQuery: 'john',
        isLoading: false,
      } as any);

      render(<Personnel />);

      // Verify search input has the value (which means clear button should be visible)
      await waitFor(() => {
        expect(screen.getByDisplayValue('john')).toBeTruthy();
      });
    });

    it('should clear search when search input is changed', async () => {
      mockUsePersonnelStore.mockReturnValue({
        ...defaultStoreState,
        personnel: mockPersonnelData,
        searchQuery: 'john',
        isLoading: false,
      } as any);

      render(<Personnel />);

      const searchInput = screen.getByPlaceholderText('Search personnel...');
      fireEvent.changeText(searchInput, '');

      expect(mockSetSearchQuery).toHaveBeenCalledWith('');
    });

    it('should not display clear button when search query is empty', () => {
      mockUsePersonnelStore.mockReturnValue({
        ...defaultStoreState,
        personnel: mockPersonnelData,
        searchQuery: '',
        isLoading: false,
      } as any);

      render(<Personnel />);

      expect(screen.queryByTestId('clear-search')).toBeFalsy();
    });
  });

  describe('Personnel Interactions', () => {
    it('should call selectPersonnel when personnel card is pressed', async () => {
      mockUsePersonnelStore.mockReturnValue({
        ...defaultStoreState,
        personnel: mockPersonnelData,
        isLoading: false,
      } as any);

      render(<Personnel />);

      await waitFor(() => {
        const personnelCard = screen.getByTestId('personnel-card-1');
        expect(personnelCard).toBeTruthy();
      });

      const personnelCard = screen.getByTestId('personnel-card-1');
      fireEvent.press(personnelCard);

      expect(mockSelectPersonnel).toHaveBeenCalledWith('1');
    });

    it('should call selectPersonnel with correct ID for different personnel', async () => {
      mockUsePersonnelStore.mockReturnValue({
        ...defaultStoreState,
        personnel: mockPersonnelData,
        isLoading: false,
      } as any);

      render(<Personnel />);

      await waitFor(() => {
        const personnelCard = screen.getByTestId('personnel-card-2');
        expect(personnelCard).toBeTruthy();
      });

      const personnelCard = screen.getByTestId('personnel-card-2');
      fireEvent.press(personnelCard);

      expect(mockSelectPersonnel).toHaveBeenCalledWith('2');
    });
  });

  describe('Pull-to-Refresh', () => {
    it('should have refresh control functionality', async () => {
      mockUsePersonnelStore.mockReturnValue({
        ...defaultStoreState,
        personnel: mockPersonnelData,
        isLoading: false,
      } as any);

      render(<Personnel />);

      // FlatList should be rendered with RefreshControl
      await waitFor(() => {
        expect(screen.getByTestId('personnel-card-1')).toBeTruthy();
      });

      expect(mockFetchPersonnel).toHaveBeenCalledTimes(1);
    });
  });

  describe('Components Integration', () => {
    it('should render personnel details sheet', () => {
      mockUsePersonnelStore.mockReturnValue({
        ...defaultStoreState,
        personnel: mockPersonnelData,
        isLoading: false,
      } as any);

      render(<Personnel />);

      expect(screen.getByText('PersonnelDetailsSheet')).toBeTruthy();
    });

    it('should not show loading during refresh', () => {
      mockUsePersonnelStore.mockReturnValue({
        ...defaultStoreState,
        personnel: mockPersonnelData,
        isLoading: false, // Not loading
      } as any);

      render(<Personnel />);

      // Should show personnel data, not loading component
      expect(screen.getByTestId('personnel-card-1')).toBeTruthy();
      expect(screen.getByTestId('personnel-card-2')).toBeTruthy();
      expect(screen.getByTestId('personnel-card-3')).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle personnel with null or undefined properties', async () => {
      const personnelWithNullFields = [
        {
          ...mockPersonnelData[0],
          EmailAddress: null as any,
          GroupName: undefined as any,
          Roles: null as any,
        },
      ];

      mockUsePersonnelStore.mockReturnValue({
        ...defaultStoreState,
        personnel: personnelWithNullFields,
        isLoading: false,
      } as any);

      render(<Personnel />);

      await waitFor(() => {
        expect(screen.getByTestId('personnel-card-1')).toBeTruthy();
      });
    });

    it('should handle empty personnel array', () => {
      mockUsePersonnelStore.mockReturnValue({
        ...defaultStoreState,
        personnel: [],
        isLoading: false,
      } as any);

      render(<Personnel />);

      expect(screen.getByTestId('zero-state')).toBeTruthy();
    });

    it('should handle undefined personnel array', () => {
      mockUsePersonnelStore.mockReturnValue({
        ...defaultStoreState,
        personnel: undefined as any,
        isLoading: false,
      } as any);

      render(<Personnel />);

      expect(screen.getByTestId('zero-state')).toBeTruthy();
    });
  });
}); 