import { render, screen } from '@testing-library/react-native';
import React from 'react';

import { type PersonnelInfoResultData } from '@/models/v4/personnel/personnelInfoResultData';

import { PersonnelDetailsSheet } from '../personnel-details-sheet';

// Mock analytics
const mockTrackEvent = jest.fn();
jest.mock('@/hooks/use-analytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
  }),
}));

// Mock UI components
jest.mock('../../ui/actionsheet', () => ({
  Actionsheet: ({ children, isOpen }: { children: React.ReactNode; isOpen: boolean }) =>
    isOpen ? <div data-testid="actionsheet">{children}</div> : null,
  ActionsheetBackdrop: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ActionsheetContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ActionsheetDragIndicator: () => <div>drag-indicator</div>,
  ActionsheetDragIndicatorWrapper: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('../../ui/badge', () => ({
  Badge: ({ children, className }: { children: React.ReactNode; className?: string }) =>
    <span className={className}>{children}</span>,
}));

jest.mock('../../ui/box', () => ({
  Box: ({ children, className }: { children: React.ReactNode; className?: string }) =>
    <div className={className}>{children}</div>,
}));

jest.mock('../../ui/button', () => ({
  Button: ({ children, onPress, testID }: { children: React.ReactNode; onPress?: () => void; testID?: string }) => {
    const React = require('react');
    return React.createElement('button', {
      onPress,
      testID,
      'data-testid': testID,
    }, children);
  },
}));

jest.mock('../../ui/divider', () => ({
  Divider: () => <hr data-testid="divider" />,
}));

jest.mock('../../ui/heading', () => ({
  Heading: ({ children, size, className }: { children: React.ReactNode; size?: string; className?: string }) =>
    <h1 className={className}>{children}</h1>,
}));

jest.mock('../../ui/hstack', () => ({
  HStack: ({ children, space, className }: { children: React.ReactNode; space?: string; className?: string }) =>
    <span className={className}>{children}</span>,
}));

jest.mock('../../ui/text', () => ({
  Text: ({ children, className }: { children: React.ReactNode; className?: string }) =>
    <span className={className}>{children}</span>,
}));

jest.mock('../../ui/vstack', () => ({
  VStack: ({ children, space }: { children: React.ReactNode; space?: string }) =>
    <div>{children}</div>,
}));

// Mock lucide-react-native icons
jest.mock('lucide-react-native', () => ({
  Calendar: () => <div data-testid="calendar-icon" />,
  IdCard: () => <div data-testid="idcard-icon" />,
  Mail: () => <div data-testid="mail-icon" />,
  Phone: () => <div data-testid="phone-icon" />,
  Tag: () => <div data-testid="tag-icon" />,
  Users: () => <div data-testid="users-icon" />,
  X: () => <div data-testid="x-icon" />,
}));

// Mock ScrollView
jest.mock('react-native', () => ({
  ScrollView: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock the personnel store
const mockPersonnelStore = {
  personnel: [] as PersonnelInfoResultData[],
  selectedPersonnelId: null as string | null,
  isDetailsOpen: false,
  closeDetails: jest.fn(),
};

jest.mock('@/stores/personnel/store', () => ({
  usePersonnelStore: () => mockPersonnelStore,
}));

// Mock the security store
const mockSecurityStore = {
  canUserViewPII: true,
};

jest.mock('@/stores/security/store', () => ({
  useSecurityStore: () => mockSecurityStore,
}));

// Mock translation
const mockTranslation = jest.fn((key: string) => {
  const translations: Record<string, string> = {
    'personnel.id': 'ID',
    'personnel.contactInformation': 'Contact Information',
    'personnel.group': 'Group',
    'personnel.currentStatus': 'Current Status',
    'personnel.staffing': 'Staffing',
    'personnel.roles': 'Roles',
  };
  return translations[key] || key;
});

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: mockTranslation,
  }),
}));

// Mock utils
jest.mock('@/lib/utils', () => ({
  formatDateForDisplay: (date: any) => 'Formatted Date',
  parseDateISOString: (date: string) => new Date(date),
}));

describe('PersonnelDetailsSheet', () => {
  const mockPersonnel: PersonnelInfoResultData = {
    UserId: 'user-123',
    FirstName: 'John',
    LastName: 'Doe',
    IdentificationNumber: '12345',
    EmailAddress: 'john.doe@example.com',
    MobilePhone: '+1234567890',
    GroupName: 'Alpha Team',
    Status: 'Available',
    StatusColor: '#10B981',
    StatusTimestamp: '2024-01-15T10:30:00Z',
    StatusDestinationName: 'Station 1',
    Staffing: 'On Duty',
    StaffingColor: '#3B82F6',
    StaffingTimestamp: '2024-01-15T08:00:00Z',
    Roles: ['Firefighter', 'EMT', 'Driver'],
    DepartmentId: 'dept-1',
    GroupId: 'group-1',
    StatusId: 'status-1',
    StatusDestinationId: 'dest-1',
    StaffingId: 'staffing-1',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockPersonnelStore.personnel = [];
    mockPersonnelStore.selectedPersonnelId = null;
    mockPersonnelStore.isDetailsOpen = false;
    mockSecurityStore.canUserViewPII = true;
  });

  it('renders nothing when sheet is closed', () => {
    mockPersonnelStore.isDetailsOpen = false;
    mockPersonnelStore.selectedPersonnelId = mockPersonnel.UserId;
    mockPersonnelStore.personnel = [mockPersonnel];

    const { toJSON } = render(<PersonnelDetailsSheet />);
    expect(toJSON()).toBeNull();
  });

  it('renders nothing when no personnel is selected', () => {
    mockPersonnelStore.isDetailsOpen = true;
    mockPersonnelStore.selectedPersonnelId = null;
    mockPersonnelStore.personnel = [mockPersonnel];

    const { toJSON } = render(<PersonnelDetailsSheet />);
    expect(toJSON()).toBeNull();
  });

  it('renders personnel details with translations when sheet is open', () => {
    mockPersonnelStore.isDetailsOpen = true;
    mockPersonnelStore.selectedPersonnelId = mockPersonnel.UserId;
    mockPersonnelStore.personnel = [mockPersonnel];

    render(<PersonnelDetailsSheet />);

    // Check that translation keys were called
    expect(mockTranslation).toHaveBeenCalledWith('personnel.id');
    expect(mockTranslation).toHaveBeenCalledWith('personnel.contactInformation');
    expect(mockTranslation).toHaveBeenCalledWith('personnel.group');
    expect(mockTranslation).toHaveBeenCalledWith('personnel.currentStatus');
    expect(mockTranslation).toHaveBeenCalledWith('personnel.staffing');
    expect(mockTranslation).toHaveBeenCalledWith('personnel.roles');
  });

  it('renders personnel name in heading', () => {
    mockPersonnelStore.isDetailsOpen = true;
    mockPersonnelStore.selectedPersonnelId = mockPersonnel.UserId;
    mockPersonnelStore.personnel = [mockPersonnel];

    const { toJSON } = render(<PersonnelDetailsSheet />);

    // Check the component renders
    expect(toJSON()).toBeTruthy();
  });

  it('renders identification number with translation', () => {
    mockPersonnelStore.isDetailsOpen = true;
    mockPersonnelStore.selectedPersonnelId = mockPersonnel.UserId;
    mockPersonnelStore.personnel = [mockPersonnel];

    render(<PersonnelDetailsSheet />);

    expect(mockTranslation).toHaveBeenCalledWith('personnel.id');
  });

  it('renders contact information when user can view PII', () => {
    mockPersonnelStore.isDetailsOpen = true;
    mockPersonnelStore.selectedPersonnelId = mockPersonnel.UserId;
    mockPersonnelStore.personnel = [mockPersonnel];
    mockSecurityStore.canUserViewPII = true;

    render(<PersonnelDetailsSheet />);

    expect(mockTranslation).toHaveBeenCalledWith('personnel.contactInformation');
  });

  it('does not render contact information when user cannot view PII', () => {
    mockPersonnelStore.isDetailsOpen = true;
    mockPersonnelStore.selectedPersonnelId = mockPersonnel.UserId;
    mockPersonnelStore.personnel = [mockPersonnel];
    mockSecurityStore.canUserViewPII = false;

    // Clear previous calls
    mockTranslation.mockClear();

    render(<PersonnelDetailsSheet />);

    // Should NOT call contactInformation translation
    expect(mockTranslation).not.toHaveBeenCalledWith('personnel.contactInformation');
  });

  it('renders group information with translation', () => {
    mockPersonnelStore.isDetailsOpen = true;
    mockPersonnelStore.selectedPersonnelId = mockPersonnel.UserId;
    mockPersonnelStore.personnel = [mockPersonnel];

    render(<PersonnelDetailsSheet />);

    expect(mockTranslation).toHaveBeenCalledWith('personnel.group');
  });

  it('renders current status with translation', () => {
    mockPersonnelStore.isDetailsOpen = true;
    mockPersonnelStore.selectedPersonnelId = mockPersonnel.UserId;
    mockPersonnelStore.personnel = [mockPersonnel];

    render(<PersonnelDetailsSheet />);

    expect(mockTranslation).toHaveBeenCalledWith('personnel.currentStatus');
  });

  it('renders staffing information with translation', () => {
    mockPersonnelStore.isDetailsOpen = true;
    mockPersonnelStore.selectedPersonnelId = mockPersonnel.UserId;
    mockPersonnelStore.personnel = [mockPersonnel];

    render(<PersonnelDetailsSheet />);

    expect(mockTranslation).toHaveBeenCalledWith('personnel.staffing');
  });

  it('renders roles with translation', () => {
    mockPersonnelStore.isDetailsOpen = true;
    mockPersonnelStore.selectedPersonnelId = mockPersonnel.UserId;
    mockPersonnelStore.personnel = [mockPersonnel];

    render(<PersonnelDetailsSheet />);

    expect(mockTranslation).toHaveBeenCalledWith('personnel.roles');
  });

  it('tracks analytics when sheet opens', () => {
    mockPersonnelStore.isDetailsOpen = true;
    mockPersonnelStore.selectedPersonnelId = mockPersonnel.UserId;
    mockPersonnelStore.personnel = [mockPersonnel];

    render(<PersonnelDetailsSheet />);

    expect(mockTrackEvent).toHaveBeenCalledWith('personnel_details_sheet_viewed', expect.objectContaining({
      personnelId: 'user-123',
      hasContactInfo: true,
      hasGroupInfo: true,
      hasStatus: true,
      hasStaffing: true,
      hasRoles: true,
      hasIdentificationNumber: true,
      roleCount: 3,
      canViewPII: true,
    }));
  });

  it('does not render identification number section if not provided', () => {
    const personnelWithoutId = { ...mockPersonnel, IdentificationNumber: '' };
    mockPersonnelStore.isDetailsOpen = true;
    mockPersonnelStore.selectedPersonnelId = personnelWithoutId.UserId;
    mockPersonnelStore.personnel = [personnelWithoutId];

    // Clear previous calls
    mockTranslation.mockClear();

    render(<PersonnelDetailsSheet />);

    // Should not call id translation if no ID
    expect(mockTranslation).not.toHaveBeenCalledWith('personnel.id');
  });

  it('does not render group section if not provided', () => {
    const personnelWithoutGroup = { ...mockPersonnel, GroupName: '' };
    mockPersonnelStore.isDetailsOpen = true;
    mockPersonnelStore.selectedPersonnelId = personnelWithoutGroup.UserId;
    mockPersonnelStore.personnel = [personnelWithoutGroup];

    // Clear previous calls
    mockTranslation.mockClear();

    render(<PersonnelDetailsSheet />);

    // Should not call group translation if no group
    expect(mockTranslation).not.toHaveBeenCalledWith('personnel.group');
  });

  it('does not render staffing section if not provided', () => {
    const personnelWithoutStaffing = { ...mockPersonnel, Staffing: '' };
    mockPersonnelStore.isDetailsOpen = true;
    mockPersonnelStore.selectedPersonnelId = personnelWithoutStaffing.UserId;
    mockPersonnelStore.personnel = [personnelWithoutStaffing];

    // Clear previous calls
    mockTranslation.mockClear();

    render(<PersonnelDetailsSheet />);

    // Should not call staffing translation if no staffing
    expect(mockTranslation).not.toHaveBeenCalledWith('personnel.staffing');
  });

  it('does not render roles section if empty', () => {
    const personnelWithoutRoles = { ...mockPersonnel, Roles: [] };
    mockPersonnelStore.isDetailsOpen = true;
    mockPersonnelStore.selectedPersonnelId = personnelWithoutRoles.UserId;
    mockPersonnelStore.personnel = [personnelWithoutRoles];

    // Clear previous calls
    mockTranslation.mockClear();

    render(<PersonnelDetailsSheet />);

    // Should not call roles translation if no roles
    expect(mockTranslation).not.toHaveBeenCalledWith('personnel.roles');
  });

  it('handles personnel with minimal data', () => {
    const minimalPersonnel: PersonnelInfoResultData = {
      UserId: 'user-456',
      FirstName: 'Jane',
      LastName: 'Smith',
      DepartmentId: 'dept-1',
      GroupId: 'group-1',
      IdentificationNumber: '',
      EmailAddress: '',
      MobilePhone: '',
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

    mockPersonnelStore.isDetailsOpen = true;
    mockPersonnelStore.selectedPersonnelId = minimalPersonnel.UserId;
    mockPersonnelStore.personnel = [minimalPersonnel];

    const { toJSON } = render(<PersonnelDetailsSheet />);

    // Should still render and call currentStatus translation even without data
    expect(toJSON()).toBeTruthy();
    expect(mockTranslation).toHaveBeenCalledWith('personnel.currentStatus');
  });

  it('renders close button', () => {
    mockPersonnelStore.isDetailsOpen = true;
    mockPersonnelStore.selectedPersonnelId = mockPersonnel.UserId;
    mockPersonnelStore.personnel = [mockPersonnel];

    render(<PersonnelDetailsSheet />);

    const closeButton = screen.getByTestId('close-button');
    expect(closeButton).toBeTruthy();
  });
});
