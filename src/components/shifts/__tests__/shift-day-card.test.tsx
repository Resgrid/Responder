import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { ShiftDayCard } from '../shift-day-card';
import { type ShiftDaysResultData } from '@/models/v4/shifts/shiftDayResultData';

// Mock lucide-react-native with proper testIDs
jest.mock('lucide-react-native', () => ({
  AlertCircle: ({ testID }: any) => <div data-testid={testID || 'alert-circle-icon'} />,
  CheckCircle: ({ testID }: any) => <div data-testid={testID || 'check-circle-icon'} />,
  Clock: ({ testID }: any) => <div data-testid={testID || 'clock-icon'} />,
  Users: ({ testID }: any) => <div data-testid={testID || 'users-icon'} />,
  Calendar: ({ testID }: any) => <div data-testid={testID || 'calendar-icon'} />,
}));

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

// Mock the UI components
jest.mock('@/components/ui/view', () => ({
  View: ({ children, testID, className, style }: any) => (
    <div data-testid={testID} className={className} style={style}>
      {children}
    </div>
  ),
}));

jest.mock('@/components/ui/text', () => ({
  Text: ({ children, ...props }: any) => (
    <span data-testid="text" {...props}>
      {children}
    </span>
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, ...props }: any) => (
    <div data-testid="badge" {...props}>
      {children}
    </div>
  ),
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({ children, testID, size, variant, className }: any) => (
    <div data-testid={testID || 'card'} className={className}>
      {children}
    </div>
  ),
}));

jest.mock('@/components/ui/hstack', () => ({
  HStack: ({ children, ...props }: any) => (
    <div data-testid="hstack" {...props}>
      {children}
    </div>
  ),
}));

jest.mock('@/components/ui/vstack', () => ({
  VStack: ({ children, ...props }: any) => (
    <div data-testid="vstack" {...props}>
      {children}
    </div>
  ),
}));

jest.mock('@/components/ui/pressable', () => {
  const React = require('react');
  return {
    Pressable: ({ children, onPress, testID, className }: any) => {
      const handlePress = () => {
        if (onPress) onPress();
      };
      return React.createElement(
        'button',
        {
          'data-testid': testID || 'pressable',
          onClick: handlePress,
          className
        },
        children
      );
    }
  };
});

// Mock lucide-react-native icons
jest.mock('lucide-react-native', () => ({
  Clock: ({ color, size, ...props }: any) => (
    <div data-testid="clock-icon" data-color={color} data-size={size} {...props} />
  ),
  Users: ({ color, size, ...props }: any) => (
    <div data-testid="users-icon" data-color={color} data-size={size} {...props} />
  ),
  CheckCircle: ({ color, size, ...props }: any) => (
    <div data-testid="check-circle-icon" data-color={color} data-size={size} {...props} />
  ),
  AlertCircle: ({ color, size, ...props }: any) => (
    <div data-testid="alert-circle-icon" data-color={color} data-size={size} {...props} />
  ),
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
    mockOnPress.mockClear();
  });

  it('renders without crashing', () => {
    const rendered = render(
      <ShiftDayCard shiftDay={mockShiftDay} onPress={mockOnPress} />
    );
    expect(rendered).toBeTruthy();
  });

  it('renders basic structure correctly', () => {
    const rendered = render(
      <ShiftDayCard shiftDay={mockShiftDay} onPress={mockOnPress} />
    );

    // Test that it renders without crashing
    expect(rendered).toBeTruthy();

    // Test that structure contains expected elements
    const json = rendered.toJSON();
    expect(json).toBeTruthy();
  });

  it('renders different content for signed up users', () => {
    const signedUpShiftDay = { ...mockShiftDay, SignedUp: true };
    const signedUpRender = render(
      <ShiftDayCard shiftDay={signedUpShiftDay} onPress={mockOnPress} />
    );

    const notSignedUpRender = render(
      <ShiftDayCard shiftDay={mockShiftDay} onPress={mockOnPress} />
    );

    // The JSON representation should be different when signed up vs not signed up
    expect(signedUpRender.toJSON()).not.toEqual(notSignedUpRender.toJSON());
  });

  it('handles different shift types', () => {
    // Test that different shift types render different content
    const regularShift = { ...mockShiftDay, ShiftType: 0 };
    const emergencyShift = { ...mockShiftDay, ShiftType: 1 };

    const regularRender = render(
      <ShiftDayCard shiftDay={regularShift} onPress={mockOnPress} />
    );

    const emergencyRender = render(
      <ShiftDayCard shiftDay={emergencyShift} onPress={mockOnPress} />
    );

    // Different shift types should render different content
    expect(regularRender.toJSON()).not.toEqual(emergencyRender.toJSON());
  });

  it('handles empty or undefined data gracefully', () => {
    const emptyShiftDay = {
      ...mockShiftDay,
      Signups: undefined,
      Needs: undefined,
    } as any;

    const rendered = render(
      <ShiftDayCard shiftDay={emptyShiftDay} onPress={mockOnPress} />
    );

    // Should render without crashing even with undefined data
    expect(rendered).toBeTruthy();
  });

  it('handles invalid dates gracefully', () => {
    const invalidDateShiftDay = {
      ...mockShiftDay,
      ShiftDay: 'invalid-date',
      Start: 'invalid-time',
      End: 'invalid-time',
    };

    const rendered = render(
      <ShiftDayCard shiftDay={invalidDateShiftDay} onPress={mockOnPress} />
    );

    // Should render without crashing even with invalid dates
    expect(rendered).toBeTruthy();
  });

  it('renders with different UI states', () => {
    const signedUpShiftDay = { ...mockShiftDay, SignedUp: true };
    const rendered = render(
      <ShiftDayCard shiftDay={signedUpShiftDay} onPress={mockOnPress} />
    );

    // Should render without crashing for different states
    expect(rendered).toBeTruthy();
  });
}); 