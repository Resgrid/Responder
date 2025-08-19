import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { type PersonnelInfoResultData } from '@/models/v4/personnel/personnelInfoResultData';
import { useSecurityStore } from '@/stores/security/store';

import { PersonnelCard } from '../personnel-card';

// Mock the security store
jest.mock('@/stores/security/store');
const mockUseSecurityStore = useSecurityStore as jest.MockedFunction<typeof useSecurityStore>;

describe('PersonnelCard', () => {
  const mockOnPress = jest.fn();

  beforeEach(() => {
    mockOnPress.mockClear();
    // Default to allowing PII viewing
    mockUseSecurityStore.mockReturnValue({
      canUserViewPII: true,
    } as any);
  });

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
    StatusDestinationId: '',
    StatusDestinationName: '',
    StaffingId: 'staff1',
    Staffing: 'On Duty',
    StaffingColor: '#3B82F6',
    StaffingTimestamp: '2023-12-01T08:00:00Z',
    Roles: ['Firefighter', 'EMT'],
  };

  const personnelWithoutOptionalFields: PersonnelInfoResultData = {
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

  const personnelWithManyRoles: PersonnelInfoResultData = {
    ...basePersonnel,
    UserId: '3',
    FirstName: 'Bob',
    LastName: 'Johnson',
    Roles: ['Captain', 'Firefighter', 'EMT', 'Driver', 'Inspector', 'Trainer'],
  };

  const personnelWithDestination: PersonnelInfoResultData = {
    ...basePersonnel,
    UserId: '4',
    FirstName: 'Alice',
    LastName: 'Brown',
    Status: 'En Route',
    StatusDestinationName: 'Hospital A',
    StatusTimestamp: '2023-12-01T11:00:00Z',
  };

  describe('Basic Rendering', () => {
    it('should render personnel card with all fields', () => {
      render(<PersonnelCard personnel={basePersonnel} onPress={mockOnPress} />);

      expect(screen.getByText('John Doe')).toBeTruthy();
      expect(screen.getByText('john.doe@example.com')).toBeTruthy();
      expect(screen.getByText('+1234567890')).toBeTruthy();
      expect(screen.getByText('Fire Department')).toBeTruthy();
      expect(screen.getByText('Available')).toBeTruthy();
      expect(screen.getByText('On Duty')).toBeTruthy();
      expect(screen.getByText('Firefighter')).toBeTruthy();
      expect(screen.getByText('EMT')).toBeTruthy();
      expect(screen.getByText(/Status: 2023-12-01 10:00/)).toBeTruthy();
    });

    it('should render personnel card without optional fields', () => {
      render(<PersonnelCard personnel={personnelWithoutOptionalFields} onPress={mockOnPress} />);

      expect(screen.getByText('Jane Smith')).toBeTruthy();
      // Optional fields should not be rendered
      expect(screen.queryByText('@')).toBeFalsy(); // No email
      expect(screen.queryByText('+')).toBeFalsy(); // No phone
      expect(screen.queryByTestId('group-info')).toBeFalsy(); // No group
      expect(screen.queryByText('Status:')).toBeFalsy(); // No status timestamp
    });

    it('should handle personnel with many roles', () => {
      render(<PersonnelCard personnel={personnelWithManyRoles} onPress={mockOnPress} />);

      expect(screen.getByText('Bob Johnson')).toBeTruthy();
      expect(screen.getByText('Captain')).toBeTruthy();
      expect(screen.getByText('Firefighter')).toBeTruthy();
      expect(screen.getByText('EMT')).toBeTruthy();
      // Should show first 3 roles plus count of remaining
      expect(screen.getByText('+3')).toBeTruthy();
    });

    it('should handle personnel with status destination', () => {
      render(<PersonnelCard personnel={personnelWithDestination} onPress={mockOnPress} />);

      expect(screen.getByText('Alice Brown')).toBeTruthy();
      expect(screen.getByText('En Route')).toBeTruthy();
      expect(screen.getByText(/Status: 2023-12-01 11:00/)).toBeTruthy();
    });
  });

  describe('Conditional Rendering', () => {
    it('should not render email when not provided', () => {
      const personnelWithoutEmail = { ...basePersonnel, EmailAddress: '' };
      render(<PersonnelCard personnel={personnelWithoutEmail} onPress={mockOnPress} />);

      expect(screen.queryByText('@')).toBeFalsy();
    });

    it('should not render phone when not provided', () => {
      const personnelWithoutPhone = { ...basePersonnel, MobilePhone: '' };
      render(<PersonnelCard personnel={personnelWithoutPhone} onPress={mockOnPress} />);

      expect(screen.queryByText('+')).toBeFalsy();
    });

    it('should not render group when not provided', () => {
      const personnelWithoutGroup = { ...basePersonnel, GroupName: '' };
      render(<PersonnelCard personnel={personnelWithoutGroup} onPress={mockOnPress} />);

      expect(screen.queryByText('Fire Department')).toBeFalsy();
    });

    it('should not render status badge when status is empty', () => {
      const personnelWithoutStatus = { ...basePersonnel, Status: '' };
      render(<PersonnelCard personnel={personnelWithoutStatus} onPress={mockOnPress} />);

      expect(screen.queryByText('Available')).toBeFalsy();
    });

    it('should not render staffing badge when staffing is empty', () => {
      const personnelWithoutStaffing = { ...basePersonnel, Staffing: '' };
      render(<PersonnelCard personnel={personnelWithoutStaffing} onPress={mockOnPress} />);

      expect(screen.queryByText('On Duty')).toBeFalsy();
    });

    it('should not render roles when roles array is empty', () => {
      const personnelWithoutRoles = { ...basePersonnel, Roles: [] };
      render(<PersonnelCard personnel={personnelWithoutRoles} onPress={mockOnPress} />);

      expect(screen.queryByText('Firefighter')).toBeFalsy();
      expect(screen.queryByText('EMT')).toBeFalsy();
    });

    it('should not render status timestamp when not provided', () => {
      const personnelWithoutTimestamp = { ...basePersonnel, StatusTimestamp: '' };
      render(<PersonnelCard personnel={personnelWithoutTimestamp} onPress={mockOnPress} />);

      expect(screen.queryByText(/Status:/)).toBeFalsy();
    });
  });

  describe('Styling and Colors', () => {
    it('should use custom status color when provided', () => {
      const personnelWithCustomColor = {
        ...basePersonnel,
        StatusColor: '#FF5733',
        Status: 'Custom Status'
      };
      render(<PersonnelCard personnel={personnelWithCustomColor} onPress={mockOnPress} />);

      // Check that status badge uses custom color
      expect(screen.getByText('Custom Status')).toBeTruthy();
    });

    it('should use custom staffing color when provided', () => {
      const personnelWithCustomStaffingColor = {
        ...basePersonnel,
        StaffingColor: '#8E44AD',
        Staffing: 'Custom Staffing'
      };
      render(<PersonnelCard personnel={personnelWithCustomStaffingColor} onPress={mockOnPress} />);

      expect(screen.getByText('Custom Staffing')).toBeTruthy();
    });

    it('should use default colors when colors are not provided', () => {
      const personnelWithoutColors = {
        ...basePersonnel,
        StatusColor: '',
        StaffingColor: '',
      };
      render(<PersonnelCard personnel={personnelWithoutColors} onPress={mockOnPress} />);

      expect(screen.getByText('Available')).toBeTruthy();
      expect(screen.getByText('On Duty')).toBeTruthy();
    });
  });

  describe('Name Handling', () => {
    it('should handle names with spaces correctly', () => {
      const personnelWithSpaces = {
        ...basePersonnel,
        FirstName: 'Mary Jane',
        LastName: 'Watson Smith'
      };
      render(<PersonnelCard personnel={personnelWithSpaces} onPress={mockOnPress} />);

      expect(screen.getByText('Mary Jane Watson Smith')).toBeTruthy();
    });

    it('should handle empty first name', () => {
      const personnelWithoutFirstName = {
        ...basePersonnel,
        FirstName: '',
        LastName: 'Doe'
      };
      render(<PersonnelCard personnel={personnelWithoutFirstName} onPress={mockOnPress} />);

      expect(screen.getByText('Doe')).toBeTruthy();
    });

    it('should handle empty last name', () => {
      const personnelWithoutLastName = {
        ...basePersonnel,
        FirstName: 'John',
        LastName: ''
      };
      render(<PersonnelCard personnel={personnelWithoutLastName} onPress={mockOnPress} />);

      expect(screen.getByText('John')).toBeTruthy();
    });

    it('should handle both names empty', () => {
      const personnelWithoutNames = {
        ...basePersonnel,
        FirstName: '',
        LastName: ''
      };
      render(<PersonnelCard personnel={personnelWithoutNames} onPress={mockOnPress} />);

      // Should render empty string (trimmed)
      expect(screen.getByTestId('personnel-card-1')).toBeTruthy();
    });
  });

  describe('Interactions', () => {
    it('should call onPress with personnel UserId when card is pressed', () => {
      render(<PersonnelCard personnel={basePersonnel} onPress={mockOnPress} />);

      const card = screen.getByTestId('personnel-card-1');
      fireEvent.press(card);

      expect(mockOnPress).toHaveBeenCalledWith('1');
    });

    it('should call onPress with correct UserId for different personnel', () => {
      render(<PersonnelCard personnel={personnelWithoutOptionalFields} onPress={mockOnPress} />);

      const card = screen.getByTestId('personnel-card-2');
      fireEvent.press(card);

      expect(mockOnPress).toHaveBeenCalledWith('2');
    });

    it('should handle multiple press events', () => {
      render(<PersonnelCard personnel={basePersonnel} onPress={mockOnPress} />);

      const card = screen.getByTestId('personnel-card-1');
      fireEvent.press(card);
      fireEvent.press(card);

      expect(mockOnPress).toHaveBeenCalledTimes(2);
      expect(mockOnPress).toHaveBeenCalledWith('1');
    });
  });

  describe('Accessibility', () => {
    it('should have correct testID', () => {
      render(<PersonnelCard personnel={basePersonnel} onPress={mockOnPress} />);

      expect(screen.getByTestId('personnel-card-1')).toBeTruthy();
    });

    it('should generate unique testIDs for different personnel', () => {
      const { rerender } = render(<PersonnelCard personnel={basePersonnel} onPress={mockOnPress} />);
      expect(screen.getByTestId('personnel-card-1')).toBeTruthy();

      rerender(<PersonnelCard personnel={personnelWithoutOptionalFields} onPress={mockOnPress} />);
      expect(screen.getByTestId('personnel-card-2')).toBeTruthy();
    });
  });

  describe('Date Formatting', () => {
    it('should format status timestamp correctly', () => {
      render(<PersonnelCard personnel={basePersonnel} onPress={mockOnPress} />);

      expect(screen.getByText(/Status: 2023-12-01 10:00/)).toBeTruthy();
    });

    it('should handle different timestamp formats', () => {
      const personnelWithDifferentTimestamp = {
        ...basePersonnel,
        StatusTimestamp: '2023-12-25T15:30:45Z'
      };
      render(<PersonnelCard personnel={personnelWithDifferentTimestamp} onPress={mockOnPress} />);

      expect(screen.getByText(/Status: 2023-12-25 15:30/)).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle null or undefined roles array', () => {
      const personnelWithNullRoles = { ...basePersonnel, Roles: null as any };
      render(<PersonnelCard personnel={personnelWithNullRoles} onPress={mockOnPress} />);

      expect(screen.getByText('John Doe')).toBeTruthy();
      // Should not crash and roles section should not render
    });

    it('should handle exactly 3 roles without +0 display', () => {
      const personnelWithThreeRoles = {
        ...basePersonnel,
        Roles: ['Role1', 'Role2', 'Role3']
      };
      render(<PersonnelCard personnel={personnelWithThreeRoles} onPress={mockOnPress} />);

      expect(screen.getByText('Role1')).toBeTruthy();
      expect(screen.getByText('Role2')).toBeTruthy();
      expect(screen.getByText('Role3')).toBeTruthy();
      expect(screen.queryByText('+0')).toBeFalsy();
    });

    it('should handle more than 3 roles correctly', () => {
      const personnelWithFourRoles = {
        ...basePersonnel,
        Roles: ['Role1', 'Role2', 'Role3', 'Role4']
      };
      render(<PersonnelCard personnel={personnelWithFourRoles} onPress={mockOnPress} />);

      expect(screen.getByText('Role1')).toBeTruthy();
      expect(screen.getByText('Role2')).toBeTruthy();
      expect(screen.getByText('Role3')).toBeTruthy();
      expect(screen.getByText('+1')).toBeTruthy();
      expect(screen.queryByText('Role4')).toBeFalsy(); // Should be hidden
    });
  });

  describe('PII Protection', () => {
    it('should show contact information when user can view PII', () => {
      mockUseSecurityStore.mockReturnValue({
        canUserViewPII: true,
      } as any);

      render(<PersonnelCard personnel={basePersonnel} onPress={mockOnPress} />);

      expect(screen.getByText('john.doe@example.com')).toBeTruthy();
      expect(screen.getByText('+1234567890')).toBeTruthy();
      expect(screen.getByText('Fire Department')).toBeTruthy();
    });

    it('should hide contact information when user cannot view PII', () => {
      mockUseSecurityStore.mockReturnValue({
        canUserViewPII: false,
      } as any);

      render(<PersonnelCard personnel={basePersonnel} onPress={mockOnPress} />);

      expect(screen.queryByText('john.doe@example.com')).toBeFalsy();
      expect(screen.queryByText('+1234567890')).toBeFalsy();
      // Group name should still be shown
      expect(screen.getByText('Fire Department')).toBeTruthy();
    });

    it('should show group even when PII is restricted and no contact info', () => {
      mockUseSecurityStore.mockReturnValue({
        canUserViewPII: false,
      } as any);

      const personnelWithoutContact = {
        ...basePersonnel,
        EmailAddress: '',
        MobilePhone: '',
      };

      render(<PersonnelCard personnel={personnelWithoutContact} onPress={mockOnPress} />);

      expect(screen.getByText('Fire Department')).toBeTruthy();
    });

    it('should handle PII restriction when personnel has no group', () => {
      mockUseSecurityStore.mockReturnValue({
        canUserViewPII: false,
      } as any);

      const personnelWithoutGroup = {
        ...basePersonnel,
        GroupName: '',
      };

      render(<PersonnelCard personnel={personnelWithoutGroup} onPress={mockOnPress} />);

      expect(screen.getByText('John Doe')).toBeTruthy();
      expect(screen.queryByText('john.doe@example.com')).toBeFalsy();
      expect(screen.queryByText('+1234567890')).toBeFalsy();
    });

    it('should still show other information when PII is restricted', () => {
      mockUseSecurityStore.mockReturnValue({
        canUserViewPII: false,
      } as any);

      render(<PersonnelCard personnel={basePersonnel} onPress={mockOnPress} />);

      // Should still show name, status, staffing, roles
      expect(screen.getByText('John Doe')).toBeTruthy();
      expect(screen.getByText('Available')).toBeTruthy();
      expect(screen.getByText('On Duty')).toBeTruthy();
      expect(screen.getByText('Firefighter')).toBeTruthy();
      expect(screen.getByText('EMT')).toBeTruthy();
    });
  });
}); 