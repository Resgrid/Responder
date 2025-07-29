import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ShiftDayCard } from '../shift-day-card';
import { type ShiftDaysResultData } from '@/models/v4/shifts/shiftDayResultData';

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'shifts.signed_up': 'Signed Up',
        'shifts.signup': 'Sign Up',
        'shifts.signups': 'Sign-ups',
        'shifts.shift_type.regular': 'Regular',
        'shifts.shift_type.emergency': 'Emergency',
        'shifts.shift_type.training': 'Training',
        'shifts.shift_type.unknown': 'Unknown',
      };
      return translations[key] || key;
    },
  }),
}));

// Mock date-fns
jest.mock('date-fns', () => ({
  format: jest.fn((date, formatStr) => {
    if (formatStr === 'h:mm a') {
      const timeStr = date.toISOString();
      if (timeStr.includes('08:00')) return '8:00 AM';
      if (timeStr.includes('16:00')) return '4:00 PM';
      return timeStr;
    }
    if (formatStr === 'MMM dd, yyyy') {
      return 'Jan 15, 2024';
    }
    return date;
  }),
  parseISO: jest.fn((dateStr) => new Date(dateStr)),
}));

// Mock UI components
jest.mock('@/components/ui/view', () => ({
  View: 'View',
}));

jest.mock('@/components/ui/text', () => ({
  Text: ({ children, ...props }: any) => <div data-testid="text" {...props}>{children}</div>,
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, ...props }: any) => <div data-testid="badge" {...props}>{children}</div>,
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({ children, ...props }: any) => <div data-testid="card" {...props}>{children}</div>,
}));

jest.mock('@/components/ui/hstack', () => ({
  HStack: ({ children, ...props }: any) => <div data-testid="hstack" {...props}>{children}</div>,
}));

jest.mock('@/components/ui/vstack', () => ({
  VStack: ({ children, ...props }: any) => <div data-testid="vstack" {...props}>{children}</div>,
}));

jest.mock('@/components/ui/pressable', () => {
  const React = require('react');
  return {
    Pressable: React.forwardRef(({ onPress, children, ...props }: any, ref: any) => (
      React.createElement('div', {
        'data-testid': 'pressable',
        onClick: onPress,
        ref,
        ...props
      }, children)
    )),
  };
});

// Mock lucide-react-native icons
jest.mock('lucide-react-native', () => ({
  Clock: ({ color, size, ...props }: any) => <div data-testid="clock-icon" data-color={color} data-size={size} {...props} />,
  Users: ({ color, size, ...props }: any) => <div data-testid="users-icon" data-color={color} data-size={size} {...props} />,
  CheckCircle: ({ color, size, ...props }: any) => <div data-testid="check-circle-icon" data-color={color} data-size={size} {...props} />,
  AlertCircle: ({ color, size, ...props }: any) => <div data-testid="alert-circle-icon" data-color={color} data-size={size} {...props} />,
}));

const mockShiftDay: ShiftDaysResultData = {
  ShiftId: '1',
  ShiftName: 'Day Shift',
  ShiftDayId: 'day1',
  ShiftDay: '2024-01-15T00:00:00Z',
  Start: '2024-01-15T08:00:00Z',
  End: '2024-01-15T16:00:00Z',
  SignedUp: false,
  ShiftType: 0,
  Signups: [
    {
      UserId: 'user1',
      Name: 'John Doe',
      Roles: [1, 2],
    },
    {
      UserId: 'user2',
      Name: 'Jane Smith',
      Roles: [1],
    },
  ],
  Needs: [
    {
      GroupId: 'group1',
      GroupName: 'EMT',
      GroupNeeds: [
        {
          RoleId: 'role1',
          RoleName: 'EMT Basic',
          Needed: 3,
        },
        {
          RoleId: 'role2',
          RoleName: 'EMT Advanced',
          Needed: 2,
        },
      ],
    },
  ],
};

const mockOnPress = jest.fn();

describe('ShiftDayCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders shift day information correctly', () => {
    const { getByText, getAllByText } = render(
      <ShiftDayCard shiftDay={mockShiftDay} onPress={mockOnPress} />
    );

    expect(getByText('Day Shift')).toBeTruthy();
    expect(getByText('Jan 15, 2024')).toBeTruthy();
    expect(getByText('8:00 AM')).toBeTruthy();
    expect(getByText('4:00 PM')).toBeTruthy();
    expect(getByText('Regular')).toBeTruthy();
    // Check that signup/needs numbers are rendered (may be in different elements)
    const signupNumbers = getAllByText(/[0-9]+/);
    expect(signupNumbers.length).toBeGreaterThan(0);
  });

  it('shows signup badge when user is not signed up', () => {
    const { getByText } = render(
      <ShiftDayCard shiftDay={mockShiftDay} onPress={mockOnPress} />
    );

    expect(getByText('Sign Up')).toBeTruthy();
  });

  it('shows signed up badge when user is signed up', () => {
    const signedUpShiftDay = { ...mockShiftDay, SignedUp: true };
    const { getByText } = render(
      <ShiftDayCard shiftDay={signedUpShiftDay} onPress={mockOnPress} />
    );

    expect(getByText('Signed Up')).toBeTruthy();
  });

  it('displays shift types correctly', () => {
    // Test Regular (default)
    const { getByText: getRegularText } = render(
      <ShiftDayCard shiftDay={mockShiftDay} onPress={mockOnPress} />
    );
    expect(getRegularText('Regular')).toBeTruthy();

    // Test Emergency
    const emergencyShiftDay = { ...mockShiftDay, ShiftType: 1 };
    const { getByText: getEmergencyText } = render(
      <ShiftDayCard shiftDay={emergencyShiftDay} onPress={mockOnPress} />
    );
    expect(getEmergencyText('Emergency')).toBeTruthy();

    // Test Training
    const trainingShiftDay = { ...mockShiftDay, ShiftType: 2 };
    const { getByText: getTrainingText } = render(
      <ShiftDayCard shiftDay={trainingShiftDay} onPress={mockOnPress} />
    );
    expect(getTrainingText('Training')).toBeTruthy();

    // Test Unknown
    const unknownShiftDay = { ...mockShiftDay, ShiftType: 999 };
    const { getByText: getUnknownText } = render(
      <ShiftDayCard shiftDay={unknownShiftDay} onPress={mockOnPress} />
    );
    expect(getUnknownText('Unknown')).toBeTruthy();
  });

  it('handles onPress events correctly', () => {
    const { getByText } = render(
      <ShiftDayCard shiftDay={mockShiftDay} onPress={mockOnPress} />
    );

    // Click on any element within the pressable card
    fireEvent.press(getByText('Day Shift'));
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('displays progress bar with correct testID', () => {
    const { getByTestId } = render(
      <ShiftDayCard shiftDay={mockShiftDay} onPress={mockOnPress} />
    );

    const progressBar = getByTestId('progress-bar');
    expect(progressBar).toBeTruthy();
    // Progress should be 40% (2 signups / 5 needed)
    expect(progressBar.props.style.width).toBe('40%');
  });

  it('handles empty signups and needs arrays', () => {
    const emptyShiftDay = {
      ...mockShiftDay,
      Signups: [],
      Needs: [],
    };
    const { getByTestId } = render(
      <ShiftDayCard shiftDay={emptyShiftDay} onPress={mockOnPress} />
    );

    const progressBar = getByTestId('progress-bar');
    expect(progressBar.props.style.width).toBe('0%');
  });

  it('handles undefined signups and needs gracefully', () => {
    const shiftDayWithUndefined = {
      ...mockShiftDay,
      Signups: undefined,
      Needs: undefined,
    } as any;
    const { getByTestId, getByText } = render(
      <ShiftDayCard shiftDay={shiftDayWithUndefined} onPress={mockOnPress} />
    );

    expect(getByText('Day Shift')).toBeTruthy();
    const progressBar = getByTestId('progress-bar');
    expect(progressBar.props.style.width).toBe('0%');
  });

  it('handles invalid date formats gracefully', () => {
    const shiftDayWithInvalidDate = {
      ...mockShiftDay,
      ShiftDay: 'invalid-date',
      Start: 'invalid-time',
      End: 'invalid-time',
    };
    const { getByText } = render(
      <ShiftDayCard shiftDay={shiftDayWithInvalidDate} onPress={mockOnPress} />
    );

    // Should still render the shift name
    expect(getByText('Day Shift')).toBeTruthy();
    // Invalid times should be displayed as-is
    expect(getByText('invalid-time')).toBeTruthy();
  });

  it('handles empty date strings', () => {
    const shiftDayWithEmptyDates = {
      ...mockShiftDay,
      ShiftDay: '',
      Start: '',
      End: '',
    };
    const { getByText } = render(
      <ShiftDayCard shiftDay={shiftDayWithEmptyDates} onPress={mockOnPress} />
    );

    expect(getByText('Day Shift')).toBeTruthy();
    expect(getByText(' - ')).toBeTruthy(); // Empty start and end times
  });

  it('calculates progress percentage correctly for full capacity', () => {
    const fullShiftDay = {
      ...mockShiftDay,
      Signups: [
        { UserId: 'user1', Name: 'User 1', Roles: [] },
        { UserId: 'user2', Name: 'User 2', Roles: [] },
        { UserId: 'user3', Name: 'User 3', Roles: [] },
        { UserId: 'user4', Name: 'User 4', Roles: [] },
        { UserId: 'user5', Name: 'User 5', Roles: [] },
      ],
    };
    const { getByTestId } = render(
      <ShiftDayCard shiftDay={fullShiftDay} onPress={mockOnPress} />
    );

    const progressBar = getByTestId('progress-bar');
    expect(progressBar.props.style.width).toBe('100%'); // 5/5 = 100%
  });

  it('handles zero capacity gracefully', () => {
    const zeroCapacityShiftDay = {
      ...mockShiftDay,
      Needs: [
        {
          GroupId: 'group1',
          GroupName: 'EMT',
          GroupNeeds: [
            {
              RoleId: 'role1',
              RoleName: 'EMT Basic',
              Needed: 0,
            },
          ],
        },
      ],
    };
    const { getByTestId } = render(
      <ShiftDayCard shiftDay={zeroCapacityShiftDay} onPress={mockOnPress} />
    );

    const progressBar = getByTestId('progress-bar');
    expect(progressBar.props.style.width).toBe('0%'); // No capacity means 0% progress
  });

  it('calculates progress percentage correctly when over capacity', () => {
    const overCapacityShiftDay = {
      ...mockShiftDay,
      Signups: Array.from({ length: 10 }, (_, i) => ({
        UserId: `user${i}`,
        Name: `User ${i}`,
        Roles: [],
      })),
    };
    const { getByTestId } = render(
      <ShiftDayCard shiftDay={overCapacityShiftDay} onPress={mockOnPress} />
    );

    const progressBar = getByTestId('progress-bar');
    expect(progressBar.props.style.width).toBe('100%'); // Should cap at 100%
  });

  it('renders basic UI components correctly', () => {
    const { getByTestId } = render(
      <ShiftDayCard shiftDay={mockShiftDay} onPress={mockOnPress} />
    );

    // Check that key UI elements are present
    expect(getByTestId('card')).toBeTruthy();
    expect(getByTestId('progress-bar')).toBeTruthy();

    // Check for icon presence - they should be mocked
    expect(getByTestId('clock-icon')).toBeTruthy();
    expect(getByTestId('users-icon')).toBeTruthy();
    expect(getByTestId('alert-circle-icon')).toBeTruthy();
  });

  it('shows correct icon when signed up', () => {
    const signedUpShiftDay = { ...mockShiftDay, SignedUp: true };
    const { getByTestId } = render(
      <ShiftDayCard shiftDay={signedUpShiftDay} onPress={mockOnPress} />
    );

    expect(getByTestId('check-circle-icon')).toBeTruthy();
  });
}); 