import { render, screen } from '@testing-library/react-native';
import React from 'react';

import { useCoreStore } from '@/stores/app/core-store';
import { useRolesStore } from '@/stores/roles/store';
import { type UnitResultData } from '@/models/v4/units/unitResultData';
import { type ActiveUnitRoleResultData } from '@/models/v4/unitRoles/activeUnitRoleResultData';

import { SidebarRolesCard } from '../roles-sidebar';

// Mock the stores
jest.mock('@/stores/app/core-store');
jest.mock('@/stores/roles/store');

// Mock the RolesBottomSheet component
jest.mock('../../roles/roles-bottom-sheet', () => ({
  RolesBottomSheet: ({ isOpen }: any) => {
    if (!isOpen) return null;
    return <div>Roles Bottom Sheet</div>;
  },
}));

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: any) => {
      if (key === 'roles.status') {
        return `${options.active}/${options.total} Active`;
      }
      return key;
    },
  }),
}));

const mockUseCoreStore = useCoreStore as jest.MockedFunction<typeof useCoreStore>;
const mockUseRolesStore = useRolesStore as jest.MockedFunction<typeof useRolesStore>;

describe('SidebarRolesCard', () => {
  const mockActiveUnit: UnitResultData = {
    UnitId: 'unit1',
    Name: 'Unit 1',
    Type: 'Engine',
    DepartmentId: 'dept1',
    TypeId: 1,
    CustomStatusSetId: '',
    GroupId: '',
    GroupName: '',
    Vin: '',
    PlateNumber: '',
    FourWheelDrive: false,
    SpecialPermit: false,
    CurrentDestinationId: '',
    CurrentStatusId: '',
    CurrentStatusTimestamp: '',
    Latitude: '',
    Longitude: '',
    Note: '',
  };

  const mockUnitRoleAssignments: ActiveUnitRoleResultData[] = [
    {
      UnitRoleId: 'role1',
      UnitId: 'unit1',
      Name: 'Captain',
      UserId: 'user1',
      FullName: 'John Doe',
      UpdatedOn: new Date().toISOString(),
    },
    {
      UnitRoleId: 'role2',
      UnitId: 'unit1',
      Name: 'Engineer',
      UserId: 'user2',
      FullName: 'Jane Smith',
      UpdatedOn: new Date().toISOString(),
    },
    {
      UnitRoleId: 'role3',
      UnitId: 'unit1',
      Name: 'Firefighter',
      UserId: '',
      FullName: '', // Unassigned role
      UpdatedOn: new Date().toISOString(),
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCoreStore.mockReturnValue(mockActiveUnit);
    mockUseRolesStore.mockReturnValue(mockUnitRoleAssignments);
  });

  it('renders correctly with active unit and role assignments', () => {
    render(<SidebarRolesCard />);

    expect(screen.getByText('2/3 Active')).toBeTruthy();
  });

  it('displays zero counts when no active unit', () => {
    mockUseCoreStore.mockReturnValue(null);

    render(<SidebarRolesCard />);

    expect(screen.getByText('0/0 Active')).toBeTruthy();
  });

  it('displays zero counts when no role assignments', () => {
    mockUseRolesStore.mockReturnValue([]);

    render(<SidebarRolesCard />);

    expect(screen.getByText('0/0 Active')).toBeTruthy();
  });

  it('filters role assignments by active unit', () => {
    const roleAssignmentsWithDifferentUnits = [
      ...mockUnitRoleAssignments,
      {
        UnitRoleId: 'role4',
        UnitId: 'unit2', // Different unit
        Name: 'Chief',
        UserId: 'user3',
        FullName: 'Bob Johnson',
        UpdatedOn: new Date().toISOString(),
      },
    ];

    mockUseRolesStore.mockReturnValue(roleAssignmentsWithDifferentUnits);

    render(<SidebarRolesCard />);

    // Should only count assignments for unit1
    expect(screen.getByText('2/3 Active')).toBeTruthy();
  });

  it('counts active assignments correctly', () => {
    const testAssignments = [
      {
        UnitRoleId: 'role1',
        UnitId: 'unit1',
        Name: 'Captain',
        UserId: 'user1',
        FullName: 'John Doe',
        UpdatedOn: new Date().toISOString(),
      },
      {
        UnitRoleId: 'role2',
        UnitId: 'unit1',
        Name: 'Engineer',
        UserId: 'user2',
        FullName: '', // Empty name should not count as active
        UpdatedOn: new Date().toISOString(),
      },
      {
        UnitRoleId: 'role3',
        UnitId: 'unit1',
        Name: 'Firefighter',
        UserId: '',
        FullName: null as any, // Null name should not count as active
        UpdatedOn: new Date().toISOString(),
      },
    ];

    mockUseRolesStore.mockReturnValue(testAssignments);

    render(<SidebarRolesCard />);

    // Should count only the one with a non-empty FullName
    expect(screen.getByText('1/3 Active')).toBeTruthy();
  });

  it('handles empty unit role assignments gracefully', () => {
    mockUseRolesStore.mockReturnValue([]);

    render(<SidebarRolesCard />);

    expect(screen.getByText('0/0 Active')).toBeTruthy();
  });

  it('handles assignments with undefined FullName', () => {
    const assignmentsWithUndefinedFullName = [
      {
        UnitRoleId: 'role1',
        UnitId: 'unit1',
        Name: 'Captain',
        UserId: 'user1',
        FullName: undefined as any,
        UpdatedOn: new Date().toISOString(),
      },
      {
        UnitRoleId: 'role2',
        UnitId: 'unit1',
        Name: 'Engineer',
        UserId: 'user2',
        FullName: 'Jane Smith',
        UpdatedOn: new Date().toISOString(),
      },
    ];

    mockUseRolesStore.mockReturnValue(assignmentsWithUndefinedFullName);

    render(<SidebarRolesCard />);

    expect(screen.getByText('1/2 Active')).toBeTruthy();
  });

  it('memoizes counts correctly when props change', () => {
    const { rerender } = render(<SidebarRolesCard />);

    expect(screen.getByText('2/3 Active')).toBeTruthy();

    // Change the role assignments
    const newAssignments = [
      {
        UnitRoleId: 'role1',
        UnitId: 'unit1',
        Name: 'Captain',
        UserId: 'user1',
        FullName: 'John Doe',
        UpdatedOn: new Date().toISOString(),
      },
    ];

    mockUseRolesStore.mockReturnValue(newAssignments);

    rerender(<SidebarRolesCard />);

    expect(screen.getByText('1/1 Active')).toBeTruthy();
  });

  it('handles unit change correctly', () => {
    const { rerender } = render(<SidebarRolesCard />);

    expect(screen.getByText('2/3 Active')).toBeTruthy();

    // Change the active unit
    const newUnit = {
      ...mockActiveUnit,
      UnitId: 'unit2',
      Name: 'Unit 2',
    };

    mockUseCoreStore.mockReturnValue(newUnit);

    rerender(<SidebarRolesCard />);

    // Should show 0/0 since no assignments for unit2
    expect(screen.getByText('0/0 Active')).toBeTruthy();
  });

  it('renders the card component', () => {
    render(<SidebarRolesCard />);

    expect(screen.getByTestId('roles-sidebar-card')).toBeTruthy();
    expect(screen.getByTestId('roles-status-text')).toBeTruthy();
  });
}); 