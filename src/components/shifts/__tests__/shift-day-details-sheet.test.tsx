import { render, fireEvent, waitFor } from '@testing-library/react-native';
import React from 'react';

import { ShiftDayDetailsSheet } from '../shift-day-details-sheet';
import { type ShiftDaysResultData } from '@/models/v4/shifts/shiftDayResultData';

// Mock the stores
const mockUseAuthStore = jest.fn();
const mockUseShiftsStore = jest.fn();
const mockUseToastStore = jest.fn();

jest.mock('@/lib/auth', () => ({
  useAuthStore: mockUseAuthStore,
}));

jest.mock('@/stores/shifts/store', () => ({
  useShiftsStore: mockUseShiftsStore,
}));

jest.mock('@/stores/toast/store', () => ({
  useToastStore: mockUseToastStore,
}));

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Mock nativewind
jest.mock('nativewind', () => ({
  useColorScheme: () => ({ colorScheme: 'light' }),
}));

// Mock Lucide icons
jest.mock('lucide-react-native', () => ({
  AlertCircle: 'AlertCircle',
  CheckCircle: 'CheckCircle',
  Clock: 'Clock',
  UserPlus: 'UserPlus',
  Users: 'Users',
}));

// Mock UI components
jest.mock('@/components/ui/bottom-sheet', () => ({
  CustomBottomSheet: ({ children, isOpen }: any) =>
    isOpen ? React.createElement('div', { testID: 'custom-bottom-sheet' }, children) : null,
}));

jest.mock('@/components/ui/scroll-view', () => ({
  ScrollView: ({ children }: any) => React.createElement('div', { testID: 'scroll-view' }, children),
}));

jest.mock('@/components/ui/vstack', () => ({
  VStack: ({ children }: any) => React.createElement('div', { testID: 'vstack' }, children),
}));

jest.mock('@/components/ui/hstack', () => ({
  HStack: ({ children }: any) => React.createElement('div', { testID: 'hstack' }, children),
}));

jest.mock('@/components/ui/text', () => ({
  Text: ({ children }: any) => React.createElement('span', { testID: 'text' }, children),
}));

jest.mock('@/components/ui/box', () => ({
  Box: ({ children }: any) => React.createElement('div', { testID: 'box' }, children),
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({ children }: any) => React.createElement('div', { testID: 'card' }, children),
  CardContent: ({ children }: any) => React.createElement('div', { testID: 'card-content' }, children),
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onPress, disabled }: any) =>
    React.createElement('button', {
      onClick: onPress,
      disabled,
      testID: 'button'
    }, children),
  ButtonText: ({ children }: any) => React.createElement('span', { testID: 'button-text' }, children),
}));

jest.mock('@/components/ui/spinner', () => ({
  Spinner: () => React.createElement('div', { testID: 'spinner' }, 'Loading...'),
}));

const mockShiftDay: ShiftDaysResultData = {
  ShiftId: '1',
  ShiftName: 'Test Shift',
  ShiftDayId: '1',
  ShiftDay: '2025-07-29T00:00:00Z',
  Start: '2025-07-29T08:00:00Z',
  End: '2025-07-29T16:00:00Z',
  SignedUp: false,
  ShiftType: 0,
  Signups: [
    {
      UserId: '2',
      Name: 'John Doe',
      Roles: [1, 2],
    },
  ],
  Needs: [
    {
      GroupId: '1',
      GroupName: 'Firefighters',
      GroupNeeds: [
        {
          RoleId: '1',
          RoleName: 'Captain',
          Needed: 1,
        },
        {
          RoleId: '2',
          RoleName: 'Firefighter',
          Needed: 3,
        },
      ],
    },
  ],
};

describe('ShiftDayDetailsSheet', () => {
  const mockOnClose = jest.fn();
  const mockSignupForShift = jest.fn();
  const mockShowToast = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseAuthStore.mockReturnValue({
      userId: 'test-user-id',
    });

    mockUseShiftsStore.mockReturnValue({
      selectedShiftDay: mockShiftDay,
      isShiftDayLoading: false,
      isSignupLoading: false,
      signupForShift: mockSignupForShift,
    });

    mockUseToastStore.mockReturnValue({
      showToast: mockShowToast,
    });
  });

  it('should render correctly when shift day is selected', () => {
    const { getByText } = render(
      <ShiftDayDetailsSheet isOpen={true} onClose={mockOnClose} />
    );

    expect(getByText('Test Shift')).toBeTruthy();
    expect(getByText('shifts.scheduled_for')).toBeTruthy();
    expect(getByText('shifts.signup_status')).toBeTruthy();
  });

  it('should not render when no shift day is selected', () => {
    mockUseShiftsStore.mockReturnValue({
      selectedShiftDay: null,
      isShiftDayLoading: false,
      isSignupLoading: false,
      signupForShift: mockSignupForShift,
    });

    const { queryByTestId } = render(
      <ShiftDayDetailsSheet isOpen={true} onClose={mockOnClose} />
    );

    expect(queryByTestId('custom-bottom-sheet')).toBeNull();
  });

  it('should show loading state when isShiftDayLoading is true', () => {
    mockUseShiftsStore.mockReturnValue({
      selectedShiftDay: mockShiftDay,
      isShiftDayLoading: true,
      isSignupLoading: false,
      signupForShift: mockSignupForShift,
    });

    const { getByTestId } = render(
      <ShiftDayDetailsSheet isOpen={true} onClose={mockOnClose} />
    );

    expect(getByTestId('custom-bottom-sheet')).toBeTruthy();
  });

  it('should display shift information correctly', () => {
    const { getByText } = render(
      <ShiftDayDetailsSheet isOpen={true} onClose={mockOnClose} />
    );

    expect(getByText('Test Shift')).toBeTruthy();
    expect(getByText('shifts.type_regular')).toBeTruthy();
    expect(getByText('8:00 AM - 4:00 PM')).toBeTruthy();
  });

  it('should show available needs when they exist', () => {
    const { getByText } = render(
      <ShiftDayDetailsSheet isOpen={true} onClose={mockOnClose} />
    );

    expect(getByText('Firefighters')).toBeTruthy();
    expect(getByText('Captain')).toBeTruthy();
    expect(getByText('Firefighter')).toBeTruthy();
    expect(getByText('shifts.needed: 1')).toBeTruthy();
    expect(getByText('shifts.needed: 3')).toBeTruthy();
  });

  it('should allow signup when needs exist and user is not signed up', async () => {
    const { getByText } = render(
      <ShiftDayDetailsSheet isOpen={true} onClose={mockOnClose} />
    );

    const signupButton = getByText('shifts.signup');
    expect(signupButton).toBeTruthy();

    fireEvent.press(signupButton);

    await waitFor(() => {
      expect(mockSignupForShift).toHaveBeenCalledWith('1', 'test-user-id');
    });
  });

  it('should not allow signup when no needs exist', () => {
    const shiftDayWithoutNeeds = {
      ...mockShiftDay,
      Needs: [],
    };

    mockUseShiftsStore.mockReturnValue({
      selectedShiftDay: shiftDayWithoutNeeds,
      isShiftDayLoading: false,
      isSignupLoading: false,
      signupForShift: mockSignupForShift,
    });

    const { getByText, queryByText } = render(
      <ShiftDayDetailsSheet isOpen={true} onClose={mockOnClose} />
    );

    expect(getByText('shifts.no_positions_available')).toBeTruthy();
    expect(queryByText('shifts.signup')).toBeNull();
  });

  it('should show user as already signed up when they are in the signups list', () => {
    const shiftDayWithUserSignedUp = {
      ...mockShiftDay,
      Signups: [
        ...mockShiftDay.Signups,
        {
          UserId: 'test-user-id',
          Name: 'Test User',
          Roles: [1],
        },
      ],
    };

    mockUseShiftsStore.mockReturnValue({
      selectedShiftDay: shiftDayWithUserSignedUp,
      isShiftDayLoading: false,
      isSignupLoading: false,
      signupForShift: mockSignupForShift,
    });

    const { getByText } = render(
      <ShiftDayDetailsSheet isOpen={true} onClose={mockOnClose} />
    );

    expect(getByText('shifts.already_signed_up')).toBeTruthy();
    expect(getByText('shifts.you')).toBeTruthy();
  });

  it('should show correct signup statistics', () => {
    const { getByText } = render(
      <ShiftDayDetailsSheet isOpen={true} onClose={mockOnClose} />
    );

    // 1 signup out of 4 total needs (1 Captain + 3 Firefighters)
    expect(getByText('1 / 4 shifts.signups')).toBeTruthy();
    expect(getByText('25%')).toBeTruthy();
  });

  it('should display current signups list', () => {
    const { getByText } = render(
      <ShiftDayDetailsSheet isOpen={true} onClose={mockOnClose} />
    );

    expect(getByText('John Doe')).toBeTruthy();
    expect(getByText('shifts.roles: 1, 2')).toBeTruthy();
  });

  it('should show no signups message when signups list is empty', () => {
    const shiftDayWithoutSignups = {
      ...mockShiftDay,
      Signups: [],
    };

    mockUseShiftsStore.mockReturnValue({
      selectedShiftDay: shiftDayWithoutSignups,
      isShiftDayLoading: false,
      isSignupLoading: false,
      signupForShift: mockSignupForShift,
    });

    const { getByText } = render(
      <ShiftDayDetailsSheet isOpen={true} onClose={mockOnClose} />
    );

    expect(getByText('shifts.no_signups_yet')).toBeTruthy();
  });

  it('should handle signup success', async () => {
    mockSignupForShift.mockResolvedValueOnce(undefined);

    const { getByText } = render(
      <ShiftDayDetailsSheet isOpen={true} onClose={mockOnClose} />
    );

    const signupButton = getByText('shifts.signup');
    fireEvent.press(signupButton);

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('success', 'shifts.signup_success');
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('should handle signup error', async () => {
    mockSignupForShift.mockRejectedValueOnce(new Error('Signup failed'));

    const { getByText } = render(
      <ShiftDayDetailsSheet isOpen={true} onClose={mockOnClose} />
    );

    const signupButton = getByText('shifts.signup');
    fireEvent.press(signupButton);

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('error', 'shifts.signup_error');
    });
  });

  it('should show loading state on signup button when signing up', () => {
    mockUseShiftsStore.mockReturnValue({
      selectedShiftDay: mockShiftDay,
      isShiftDayLoading: false,
      isSignupLoading: true,
      signupForShift: mockSignupForShift,
    });

    const { getByTestId } = render(
      <ShiftDayDetailsSheet isOpen={true} onClose={mockOnClose} />
    );

    // Check that spinner is present when loading
    expect(getByTestId('spinner')).toBeTruthy();
  });

  it('should format shift types correctly', () => {
    const emergencyShift = {
      ...mockShiftDay,
      ShiftType: 1,
    };

    mockUseShiftsStore.mockReturnValue({
      selectedShiftDay: emergencyShift,
      isShiftDayLoading: false,
      isSignupLoading: false,
      signupForShift: mockSignupForShift,
    });

    const { getByText } = render(
      <ShiftDayDetailsSheet isOpen={true} onClose={mockOnClose} />
    );

    expect(getByText('shifts.type_emergency')).toBeTruthy();
  });
});
