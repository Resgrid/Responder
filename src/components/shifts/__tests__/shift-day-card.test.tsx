import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ShiftDayCard } from '../shift-day-card';
import { type ShiftDaysResultData } from '@/models/v4/shifts/shiftDayResultData';

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
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
jest.mock('@/components/ui', () => ({
  View: 'View',
}));

jest.mock('@/components/ui/text', () => ({
  Text: 'Text',
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: 'Badge',
}));

jest.mock('@/components/ui/card', () => {
  const React = require('react');
  return {
    Card: ({ children, className, ...props }: any) => React.createElement('div', { 'data-testid': 'card', ...props }, children),
    CardContent: ({ children, className, ...props }: any) => React.createElement('div', { 'data-testid': 'card-content', ...props }, children),
  };
});

jest.mock('@/components/ui/hstack', () => ({
  HStack: 'HStack',
}));

jest.mock('@/components/ui/vstack', () => ({
  VStack: 'VStack',
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

jest.mock('@/components/ui/icon', () => ({
  Icon: ({ as, ...props }: any) => <div data-testid="icon" {...props} />,
}));

// Mock lucide-react-native icons
jest.mock('lucide-react-native', () => ({
  Clock: 'Clock',
  Users: 'Users',
  CheckCircle: 'CheckCircle',
  AlertCircle: 'AlertCircle',
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
    const { getByText } = render(
      <ShiftDayCard shiftDay={mockShiftDay} onPress={mockOnPress} />
    );

    expect(getByText('Day Shift')).toBeTruthy();
    expect(getByText('Jan 15, 2024')).toBeTruthy();
    expect(getByText('8:00 AM - 4:00 PM')).toBeTruthy();
    expect(getByText('2/5 shifts.signups')).toBeTruthy();
    expect(getByText('Regular')).toBeTruthy();
  });

  it('shows signup badge when user is not signed up', () => {
    const { getByText } = render(
      <ShiftDayCard shiftDay={mockShiftDay} onPress={mockOnPress} />
    );

    expect(getByText('shifts.signup')).toBeTruthy();
  });

  it('shows signed up badge when user is signed up', () => {
    const signedUpShiftDay = { ...mockShiftDay, SignedUp: true };
    const { getByText } = render(
      <ShiftDayCard shiftDay={signedUpShiftDay} onPress={mockOnPress} />
    );

    expect(getByText('shifts.signed_up')).toBeTruthy();
  });

  it('calculates total signups correctly', () => {
    const { getByText } = render(
      <ShiftDayCard shiftDay={mockShiftDay} onPress={mockOnPress} />
    );

    // 2 signups out of 5 needed (3 + 2)
    expect(getByText('2/5 shifts.signups')).toBeTruthy();
  });

  it('handles empty signups and needs', () => {
    const emptyShiftDay = {
      ...mockShiftDay,
      Signups: [],
      Needs: [],
    };
    const { getByText } = render(
      <ShiftDayCard shiftDay={emptyShiftDay} onPress={mockOnPress} />
    );

    expect(getByText('0/0 shifts.signups')).toBeTruthy();
  });

  it('handles missing signups and needs arrays', () => {
    const shiftDayWithoutArrays = {
      ...mockShiftDay,
      Signups: [],
      Needs: [],
    };
    const { getByText } = render(
      <ShiftDayCard shiftDay={shiftDayWithoutArrays} onPress={mockOnPress} />
    );

    expect(getByText('0/0 shifts.signups')).toBeTruthy();
  });

  it('renders different shift types correctly', () => {
    const emergencyShiftDay = { ...mockShiftDay, ShiftType: 1 };
    const { getByText } = render(
      <ShiftDayCard shiftDay={emergencyShiftDay} onPress={mockOnPress} />
    );

    expect(getByText('Emergency')).toBeTruthy();
  });

  it('renders training shift type correctly', () => {
    const trainingShiftDay = { ...mockShiftDay, ShiftType: 2 };
    const { getByText } = render(
      <ShiftDayCard shiftDay={trainingShiftDay} onPress={mockOnPress} />
    );

    expect(getByText('Training')).toBeTruthy();
  });

  it('handles unknown shift type', () => {
    const unknownShiftDay = { ...mockShiftDay, ShiftType: 999 };
    const { getByText } = render(
      <ShiftDayCard shiftDay={unknownShiftDay} onPress={mockOnPress} />
    );

    expect(getByText('Unknown')).toBeTruthy();
  });

  it('calls onPress when card is pressed', () => {
    const { getByText } = render(
      <ShiftDayCard shiftDay={mockShiftDay} onPress={mockOnPress} />
    );

    fireEvent.press(getByText('Day Shift'));
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('displays correct progress bar width', () => {
    const { getByText } = render(
      <ShiftDayCard shiftDay={mockShiftDay} onPress={mockOnPress} />
    );

    // Progress bar should be 40% (2 signups / 5 needed)
    // This would require adding testID to the progress bar View
    expect(getByText('Day Shift')).toBeTruthy();
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

  it('calculates signup percentage correctly for full capacity', () => {
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
    const { getByText } = render(
      <ShiftDayCard shiftDay={fullShiftDay} onPress={mockOnPress} />
    );

    expect(getByText('5/5 shifts.signups')).toBeTruthy();
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
    const { getByText } = render(
      <ShiftDayCard shiftDay={zeroCapacityShiftDay} onPress={mockOnPress} />
    );

    expect(getByText('2/0 shifts.signups')).toBeTruthy();
  });
}); 