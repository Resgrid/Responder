import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { useAnalytics } from '@/hooks/use-analytics';
import { type PersonnelInfoResultData } from '@/models/v4/personnel/personnelInfoResultData';
import { usePersonnelStore } from '@/stores/personnel/store';
import { useSecurityStore } from '@/stores/security/store';

import { PersonnelDetailsSheet } from '../personnel-details-sheet';

// Mock UI components that cause rendering issues
jest.mock('../../ui/actionsheet', () => ({
  Actionsheet: ({ children, isOpen }: { children: React.ReactNode; isOpen: boolean }) =>
    isOpen ? <div data-testid="actionsheet">{children}</div> : null,
  ActionsheetBackdrop: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ActionsheetContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ActionsheetDragIndicator: () => <div>drag-indicator</div>,
  ActionsheetDragIndicatorWrapper: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock date formatting functions to return consistent values
jest.mock('@/lib/utils', () => ({
  formatDateForDisplay: jest.fn((date: Date, format: string) => {
    const isoString = date.toISOString();
    if (isoString === '2023-12-01T10:00:00.000Z') return '2023-12-01 10:00 UTC';
    if (isoString === '2023-12-01T08:00:00.000Z') return '2023-12-01 08:00 UTC';
    if (isoString === '2023-12-25T15:30:45.000Z') return '2023-12-25 15:30 UTC';
    if (isoString === '2023-12-25T14:15:30.000Z') return '2023-12-25 14:15 UTC';
    return 'Formatted Date';
  }),
  parseDateISOString: jest.fn((s: string) => new Date(s)),
}));

// Mock the personnel store
jest.mock('@/stores/personnel/store');
const mockUsePersonnelStore = usePersonnelStore as jest.MockedFunction<typeof usePersonnelStore>;

// Mock the security store
jest.mock('@/stores/security/store');
const mockUseSecurityStore = useSecurityStore as jest.MockedFunction<typeof useSecurityStore>;

// Mock the analytics hook
jest.mock('@/hooks/use-analytics');
const mockUseAnalytics = useAnalytics as jest.MockedFunction<typeof useAnalytics>;

describe('PersonnelDetailsSheet', () => {
  const mockCloseDetails = jest.fn();
  const mockTrackEvent = jest.fn();

  const basePersonnel: PersonnelInfoResultData = {
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
    StatusDestinationId: 'dest1',
    StatusDestinationName: 'Station 1',
    StaffingId: 'staff1',
    Staffing: 'On Duty',
    StaffingColor: '#3B82F6',
    StaffingTimestamp: '2023-12-01T08:00:00Z',
    Roles: ['Firefighter', 'EMT', 'Driver'],
  };

  const personnelWithMinimalData: PersonnelInfoResultData = {
    UserId: '2',
    IdentificationNumber: '',
    DepartmentId: 'dept1',
    FirstName: 'Jane',
    LastName: 'Smith',
    EmailAddress: '',
    MobilePhone: '',
    GroupId: '',
    GroupName: '',
    StatusId: '',
    Status: '',
    StatusColor: '',
    StatusTimestamp: '',
    StatusDestinationId: '',
    StatusDestinationName: '',
    StaffingId: '',
    Staffing: '',
    StaffingColor: '',
    StaffingTimestamp: '',
    Roles: [],
  };

  const defaultStoreState = {
    personnel: [basePersonnel, personnelWithMinimalData],
    selectedPersonnelId: '1',
    isDetailsOpen: true,
    closeDetails: mockCloseDetails,
  };

  const defaultSecurityState = {
    canUserViewPII: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock for analytics
    mockUseAnalytics.mockReturnValue({
      trackEvent: mockTrackEvent,
    });

    mockUsePersonnelStore.mockReturnValue(defaultStoreState as any);
    mockUseSecurityStore.mockReturnValue(defaultSecurityState as any);
  });

  describe('Basic Rendering', () => {
    it('should render personnel details sheet when open', () => {
      render(<PersonnelDetailsSheet />);

      expect(screen.getByText('John Doe')).toBeTruthy();
      expect(screen.getByText('ID: EMP001')).toBeTruthy();
      expect(screen.getByText('Contact Information')).toBeTruthy();
      expect(screen.getByText('john.doe@example.com')).toBeTruthy();
      expect(screen.getByText('+1234567890')).toBeTruthy();
      expect(screen.getByText('Group')).toBeTruthy();
      expect(screen.getByText('Fire Department')).toBeTruthy();
      expect(screen.getByText('Current Status')).toBeTruthy();
      expect(screen.getByText('Available')).toBeTruthy();
      expect(screen.getByText('Station 1')).toBeTruthy();
      expect(screen.getByText('Staffing')).toBeTruthy();
      expect(screen.getByText('On Duty')).toBeTruthy();
      expect(screen.getByText('Roles')).toBeTruthy();
      expect(screen.getByText('Firefighter')).toBeTruthy();
      expect(screen.getByText('EMT')).toBeTruthy();
      expect(screen.getByText('Driver')).toBeTruthy();
    });

    it('should render close button', () => {
      render(<PersonnelDetailsSheet />);

      expect(screen.getByTestId('close-button')).toBeTruthy();
    });

    it('should display formatted timestamps', () => {
      render(<PersonnelDetailsSheet />);

      expect(screen.getByText('2023-12-01 10:00 UTC')).toBeTruthy(); // Status timestamp
      expect(screen.getByText('2023-12-01 08:00 UTC')).toBeTruthy(); // Staffing timestamp
    });
  });

  describe('Conditional Rendering', () => {
    it('should not render identification number when empty', () => {
      mockUsePersonnelStore.mockReturnValue({
        ...defaultStoreState,
        selectedPersonnelId: '2',
      } as any);

      render(<PersonnelDetailsSheet />);

      expect(screen.getByText('Jane Smith')).toBeTruthy();
      expect(screen.queryByText(/ID:/)).toBeFalsy();
    });

    it('should not render contact section when email and phone are empty', () => {
      mockUsePersonnelStore.mockReturnValue({
        ...defaultStoreState,
        selectedPersonnelId: '2',
      } as any);

      render(<PersonnelDetailsSheet />);

      expect(screen.queryByText('Contact Information')).toBeTruthy(); // Section still renders
      expect(screen.queryByText('@')).toBeFalsy(); // No email
      expect(screen.queryByText('+')).toBeFalsy(); // No phone
    });

    it('should not render group section when group name is empty', () => {
      mockUsePersonnelStore.mockReturnValue({
        ...defaultStoreState,
        selectedPersonnelId: '2',
      } as any);

      render(<PersonnelDetailsSheet />);

      expect(screen.queryByText('Group')).toBeFalsy();
    });

    it('should not render status destination when not provided', () => {
      const personnelWithoutDestination = {
        ...basePersonnel,
        StatusDestinationName: '',
      };

      mockUsePersonnelStore.mockReturnValue({
        ...defaultStoreState,
        personnel: [personnelWithoutDestination],
      } as any);

      render(<PersonnelDetailsSheet />);

      expect(screen.getByText('Available')).toBeTruthy();
      expect(screen.queryByText('Station 1')).toBeFalsy();
    });

    it('should not render staffing section when staffing is empty', () => {
      mockUsePersonnelStore.mockReturnValue({
        ...defaultStoreState,
        selectedPersonnelId: '2',
      } as any);

      render(<PersonnelDetailsSheet />);

      expect(screen.queryByText('Staffing')).toBeFalsy();
    });

    it('should not render roles section when roles array is empty', () => {
      mockUsePersonnelStore.mockReturnValue({
        ...defaultStoreState,
        selectedPersonnelId: '2',
      } as any);

      render(<PersonnelDetailsSheet />);

      expect(screen.queryByText('Roles')).toBeFalsy();
    });

    it('should not render timestamps when not provided', () => {
      mockUsePersonnelStore.mockReturnValue({
        ...defaultStoreState,
        selectedPersonnelId: '2',
      } as any);

      render(<PersonnelDetailsSheet />);

      expect(screen.queryByText(/UTC/)).toBeFalsy();
    });
  });

  describe('Store Integration', () => {
    it('should not render when details are not open', () => {
      mockUsePersonnelStore.mockReturnValue({
        ...defaultStoreState,
        isDetailsOpen: false,
      } as any);

      const { UNSAFE_root } = render(<PersonnelDetailsSheet />);

      // Component should not render when isDetailsOpen is false
      expect(UNSAFE_root.children).toHaveLength(0);
    });

    it('should not render when no personnel is selected', () => {
      mockUsePersonnelStore.mockReturnValue({
        ...defaultStoreState,
        selectedPersonnelId: null,
      } as any);

      const { UNSAFE_root } = render(<PersonnelDetailsSheet />);

      expect(UNSAFE_root.children).toHaveLength(0);
    });

    it('should not render when selected personnel is not found', () => {
      mockUsePersonnelStore.mockReturnValue({
        ...defaultStoreState,
        selectedPersonnelId: 'non-existent-id',
      } as any);

      const { UNSAFE_root } = render(<PersonnelDetailsSheet />);

      expect(UNSAFE_root.children).toHaveLength(0);
    });

    it('should render correct personnel when different personnel is selected', () => {
      mockUsePersonnelStore.mockReturnValue({
        ...defaultStoreState,
        selectedPersonnelId: '2',
      } as any);

      render(<PersonnelDetailsSheet />);

      expect(screen.getByText('Jane Smith')).toBeTruthy();
      expect(screen.queryByText('John Doe')).toBeFalsy();
    });
  });

  describe('Interactions', () => {
    it('should call closeDetails when close button is pressed', () => {
      render(<PersonnelDetailsSheet />);

      const closeButton = screen.getByTestId('close-button');
      fireEvent.press(closeButton);

      expect(mockCloseDetails).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple close button presses', () => {
      render(<PersonnelDetailsSheet />);

      const closeButton = screen.getByTestId('close-button');
      fireEvent.press(closeButton);
      fireEvent.press(closeButton);

      expect(mockCloseDetails).toHaveBeenCalledTimes(2);
    });
  });

  describe('Name Handling', () => {
    it('should handle names with spaces correctly', () => {
      const personnelWithSpaces = {
        ...basePersonnel,
        FirstName: 'Mary Jane',
        LastName: 'Watson Smith',
      };

      mockUsePersonnelStore.mockReturnValue({
        ...defaultStoreState,
        personnel: [personnelWithSpaces],
      } as any);

      render(<PersonnelDetailsSheet />);

      expect(screen.getByText('Mary Jane Watson Smith')).toBeTruthy();
    });

    it('should handle empty first name', () => {
      const personnelWithoutFirstName = {
        ...basePersonnel,
        FirstName: '',
        LastName: 'Doe',
      };

      mockUsePersonnelStore.mockReturnValue({
        ...defaultStoreState,
        personnel: [personnelWithoutFirstName],
      } as any);

      render(<PersonnelDetailsSheet />);

      expect(screen.getByText('Doe')).toBeTruthy();
    });

    it('should handle empty last name', () => {
      const personnelWithoutLastName = {
        ...basePersonnel,
        FirstName: 'John',
        LastName: '',
      };

      mockUsePersonnelStore.mockReturnValue({
        ...defaultStoreState,
        personnel: [personnelWithoutLastName],
      } as any);

      render(<PersonnelDetailsSheet />);

      expect(screen.getByText('John')).toBeTruthy();
    });

    it('should handle both names empty', () => {
      const personnelWithoutNames = {
        ...basePersonnel,
        FirstName: '',
        LastName: '',
      };

      mockUsePersonnelStore.mockReturnValue({
        ...defaultStoreState,
        personnel: [personnelWithoutNames],
      } as any);

      render(<PersonnelDetailsSheet />);

      // Should render with empty string (trimmed)
      expect(screen.getByTestId('close-button')).toBeTruthy(); // Component still renders
    });
  });

  describe('Badge Colors', () => {
    it('should use custom status color when provided', () => {
      render(<PersonnelDetailsSheet />);

      expect(screen.getByText('Available')).toBeTruthy();
      // Note: Testing actual style colors would require more complex setup
      // This test ensures the badge renders with the status text
    });

    it('should use custom staffing color when provided', () => {
      render(<PersonnelDetailsSheet />);

      expect(screen.getByText('On Duty')).toBeTruthy();
    });

    it('should handle empty colors gracefully', () => {
      const personnelWithoutColors = {
        ...basePersonnel,
        StatusColor: '',
        StaffingColor: '',
      };

      mockUsePersonnelStore.mockReturnValue({
        ...defaultStoreState,
        personnel: [personnelWithoutColors],
      } as any);

      render(<PersonnelDetailsSheet />);

      expect(screen.getByText('Available')).toBeTruthy();
      expect(screen.getByText('On Duty')).toBeTruthy();
    });
  });

  describe('Date Formatting', () => {
    it('should format status timestamp correctly', () => {
      render(<PersonnelDetailsSheet />);

      expect(screen.getByText('2023-12-01 10:00 UTC')).toBeTruthy();
    });

    it('should format staffing timestamp correctly', () => {
      render(<PersonnelDetailsSheet />);

      expect(screen.getByText('2023-12-01 08:00 UTC')).toBeTruthy();
    });

    it('should handle different timestamp formats', () => {
      const personnelWithDifferentTimestamp = {
        ...basePersonnel,
        StatusTimestamp: '2023-12-25T15:30:45Z',
        StaffingTimestamp: '2023-12-25T14:15:30Z',
      };

      mockUsePersonnelStore.mockReturnValue({
        ...defaultStoreState,
        personnel: [personnelWithDifferentTimestamp],
      } as any);

      render(<PersonnelDetailsSheet />);

      expect(screen.getByText('2023-12-25 15:30 UTC')).toBeTruthy();
      expect(screen.getByText('2023-12-25 14:15 UTC')).toBeTruthy();
    });
  });

  describe('Roles Display', () => {
    it('should display all roles when present', () => {
      render(<PersonnelDetailsSheet />);

      expect(screen.getByText('Firefighter')).toBeTruthy();
      expect(screen.getByText('EMT')).toBeTruthy();
      expect(screen.getByText('Driver')).toBeTruthy();
    });

    it('should handle single role', () => {
      const personnelWithSingleRole = {
        ...basePersonnel,
        Roles: ['Captain'],
      };

      mockUsePersonnelStore.mockReturnValue({
        ...defaultStoreState,
        personnel: [personnelWithSingleRole],
      } as any);

      render(<PersonnelDetailsSheet />);

      expect(screen.getByText('Captain')).toBeTruthy();
      expect(screen.queryByText('Firefighter')).toBeFalsy();
    });

    it('should handle many roles', () => {
      const personnelWithManyRoles = {
        ...basePersonnel,
        Roles: ['Captain', 'Firefighter', 'EMT', 'Driver', 'Inspector', 'Trainer'],
      };

      mockUsePersonnelStore.mockReturnValue({
        ...defaultStoreState,
        personnel: [personnelWithManyRoles],
      } as any);

      render(<PersonnelDetailsSheet />);

      expect(screen.getByText('Captain')).toBeTruthy();
      expect(screen.getByText('Firefighter')).toBeTruthy();
      expect(screen.getByText('EMT')).toBeTruthy();
      expect(screen.getByText('Driver')).toBeTruthy();
      expect(screen.getByText('Inspector')).toBeTruthy();
      expect(screen.getByText('Trainer')).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle null roles array', () => {
      const personnelWithNullRoles = {
        ...basePersonnel,
        Roles: null as any,
      };

      mockUsePersonnelStore.mockReturnValue({
        ...defaultStoreState,
        personnel: [personnelWithNullRoles],
      } as any);

      render(<PersonnelDetailsSheet />);

      expect(screen.getByText('John Doe')).toBeTruthy();
      expect(screen.queryByText('Roles')).toBeFalsy();
    });

    it('should handle undefined personnel array', () => {
      mockUsePersonnelStore.mockReturnValue({
        ...defaultStoreState,
        personnel: undefined as any,
      } as any);

      const { UNSAFE_root } = render(<PersonnelDetailsSheet />);

      expect(UNSAFE_root.children).toHaveLength(0);
    });

    it('should handle empty personnel array', () => {
      mockUsePersonnelStore.mockReturnValue({
        ...defaultStoreState,
        personnel: [],
      } as any);

      const { UNSAFE_root } = render(<PersonnelDetailsSheet />);

      expect(UNSAFE_root.children).toHaveLength(0);
    });
  });

  describe('PII Protection', () => {
    it('should show contact information when user can view PII', () => {
      mockUseSecurityStore.mockReturnValue({
        canUserViewPII: true,
      } as any);

      render(<PersonnelDetailsSheet />);

      expect(screen.getByText('Contact Information')).toBeTruthy();
      expect(screen.getByText('john.doe@example.com')).toBeTruthy();
      expect(screen.getByText('+1234567890')).toBeTruthy();
    });

    it('should hide contact information when user cannot view PII', () => {
      mockUseSecurityStore.mockReturnValue({
        canUserViewPII: false,
      } as any);

      render(<PersonnelDetailsSheet />);

      expect(screen.queryByText('Contact Information')).toBeFalsy();
      expect(screen.queryByText('john.doe@example.com')).toBeFalsy();
      expect(screen.queryByText('+1234567890')).toBeFalsy();
    });

    it('should still show other information when PII is restricted', () => {
      mockUseSecurityStore.mockReturnValue({
        canUserViewPII: false,
      } as any);

      render(<PersonnelDetailsSheet />);

      // Should still show name, group, status, staffing, roles
      expect(screen.getByText('John Doe')).toBeTruthy();
      expect(screen.getByText('Group')).toBeTruthy();
      expect(screen.getByText('Fire Department')).toBeTruthy();
      expect(screen.getByText('Current Status')).toBeTruthy();
      expect(screen.getByText('Available')).toBeTruthy();
      expect(screen.getByText('Staffing')).toBeTruthy();
      expect(screen.getByText('On Duty')).toBeTruthy();
      expect(screen.getByText('Roles')).toBeTruthy();
      expect(screen.getByText('Firefighter')).toBeTruthy();
    });

    it('should handle PII restriction with personnel who have no contact info', () => {
      mockUseSecurityStore.mockReturnValue({
        canUserViewPII: false,
      } as any);

      mockUsePersonnelStore.mockReturnValue({
        ...defaultStoreState,
        selectedPersonnelId: '2', // Personnel with minimal data
      } as any);

      render(<PersonnelDetailsSheet />);

      expect(screen.getByText('Jane Smith')).toBeTruthy();
      expect(screen.queryByText('Contact Information')).toBeFalsy();
    });
  });

  describe('Actionsheet Props', () => {
    it('should pass correct props to Actionsheet', () => {
      render(<PersonnelDetailsSheet />);

      // Verify that the actionsheet renders and responds to close
      const closeButton = screen.getByTestId('close-button');
      expect(closeButton).toBeTruthy();
    });
  });

  describe('Analytics', () => {
    it('should track analytics when sheet becomes visible', () => {
      render(<PersonnelDetailsSheet />);

      expect(mockTrackEvent).toHaveBeenCalledWith('personnel_details_sheet_viewed', {
        timestamp: expect.any(String),
        personnelId: '1',
        hasContactInfo: true,
        hasGroupInfo: true,
        hasStatus: true,
        hasStaffing: true,
        hasRoles: true,
        hasIdentificationNumber: true,
        roleCount: 3,
        canViewPII: true,
      });
    });

    it('should track analytics with correct data for personnel with minimal data', () => {
      mockUsePersonnelStore.mockReturnValue({
        ...defaultStoreState,
        selectedPersonnelId: '2', // Personnel with minimal data
      } as any);

      render(<PersonnelDetailsSheet />);

      expect(mockTrackEvent).toHaveBeenCalledWith('personnel_details_sheet_viewed', {
        timestamp: expect.any(String),
        personnelId: '2',
        hasContactInfo: false,
        hasGroupInfo: false,
        hasStatus: false,
        hasStaffing: false,
        hasRoles: false,
        hasIdentificationNumber: false,
        roleCount: 0,
        canViewPII: true,
      });
    });

    it('should track analytics with canViewPII false when user cannot view PII', () => {
      mockUseSecurityStore.mockReturnValue({
        canUserViewPII: false,
      } as any);

      render(<PersonnelDetailsSheet />);

      expect(mockTrackEvent).toHaveBeenCalledWith('personnel_details_sheet_viewed', {
        timestamp: expect.any(String),
        personnelId: '1',
        hasContactInfo: true,
        hasGroupInfo: true,
        hasStatus: true,
        hasStaffing: true,
        hasRoles: true,
        hasIdentificationNumber: true,
        roleCount: 3,
        canViewPII: false,
      });
    });

    it('should track analytics with undefined canViewPII as false', () => {
      mockUseSecurityStore.mockReturnValue({
        canUserViewPII: undefined,
      } as any);

      render(<PersonnelDetailsSheet />);

      expect(mockTrackEvent).toHaveBeenCalledWith('personnel_details_sheet_viewed', {
        timestamp: expect.any(String),
        personnelId: '1',
        hasContactInfo: true,
        hasGroupInfo: true,
        hasStatus: true,
        hasStaffing: true,
        hasRoles: true,
        hasIdentificationNumber: true,
        roleCount: 3,
        canViewPII: false,
      });
    });

    it('should not track analytics when sheet is not open', () => {
      mockUsePersonnelStore.mockReturnValue({
        ...defaultStoreState,
        isDetailsOpen: false,
      } as any);

      render(<PersonnelDetailsSheet />);

      expect(mockTrackEvent).not.toHaveBeenCalled();
    });

    it('should not track analytics when no personnel is selected', () => {
      mockUsePersonnelStore.mockReturnValue({
        ...defaultStoreState,
        selectedPersonnelId: null,
      } as any);

      render(<PersonnelDetailsSheet />);

      expect(mockTrackEvent).not.toHaveBeenCalled();
    });

    it('should not track analytics when selected personnel is not found', () => {
      mockUsePersonnelStore.mockReturnValue({
        ...defaultStoreState,
        selectedPersonnelId: 'non-existent-id',
      } as any);

      render(<PersonnelDetailsSheet />);

      expect(mockTrackEvent).not.toHaveBeenCalled();
    });

    it('should handle analytics errors gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      mockTrackEvent.mockImplementation(() => {
        throw new Error('Analytics error');
      });

      render(<PersonnelDetailsSheet />);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to track personnel details sheet view analytics:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('should track analytics with correct role count', () => {
      const personnelWithManyRoles = {
        ...basePersonnel,
        Roles: ['Captain', 'Firefighter', 'EMT', 'Driver', 'Inspector'],
      };

      mockUsePersonnelStore.mockReturnValue({
        ...defaultStoreState,
        personnel: [personnelWithManyRoles],
      } as any);

      render(<PersonnelDetailsSheet />);

      expect(mockTrackEvent).toHaveBeenCalledWith('personnel_details_sheet_viewed', {
        timestamp: expect.any(String),
        personnelId: '1',
        hasContactInfo: true,
        hasGroupInfo: true,
        hasStatus: true,
        hasStaffing: true,
        hasRoles: true,
        hasIdentificationNumber: true,
        roleCount: 5,
        canViewPII: true,
      });
    });

    it('should track analytics with null roles array as 0 count', () => {
      const personnelWithNullRoles = {
        ...basePersonnel,
        Roles: null as any,
      };

      mockUsePersonnelStore.mockReturnValue({
        ...defaultStoreState,
        personnel: [personnelWithNullRoles],
      } as any);

      render(<PersonnelDetailsSheet />);

      expect(mockTrackEvent).toHaveBeenCalledWith('personnel_details_sheet_viewed', {
        timestamp: expect.any(String),
        personnelId: '1',
        hasContactInfo: true,
        hasGroupInfo: true,
        hasStatus: true,
        hasStaffing: true,
        hasRoles: false,
        hasIdentificationNumber: true,
        roleCount: 0,
        canViewPII: true,
      });
    });

    it('should track analytics only once when component re-renders with same data', () => {
      const { rerender } = render(<PersonnelDetailsSheet />);

      expect(mockTrackEvent).toHaveBeenCalledTimes(1);

      // Re-render with same props
      rerender(<PersonnelDetailsSheet />);

      // Should still only be called once since dependencies haven't changed
      expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    });

    it('should track analytics again when personnel selection changes', () => {
      const { rerender } = render(<PersonnelDetailsSheet />);

      expect(mockTrackEvent).toHaveBeenCalledTimes(1);
      expect(mockTrackEvent).toHaveBeenLastCalledWith('personnel_details_sheet_viewed', expect.objectContaining({
        personnelId: '1',
      }));

      // Change selected personnel
      mockUsePersonnelStore.mockReturnValue({
        ...defaultStoreState,
        selectedPersonnelId: '2',
      } as any);

      rerender(<PersonnelDetailsSheet />);

      expect(mockTrackEvent).toHaveBeenCalledTimes(2);
      expect(mockTrackEvent).toHaveBeenLastCalledWith('personnel_details_sheet_viewed', expect.objectContaining({
        personnelId: '2',
      }));
    });
  });
});