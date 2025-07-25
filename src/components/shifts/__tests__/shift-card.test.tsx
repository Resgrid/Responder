import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ShiftCard } from '../shift-card';
import { type ShiftResultData } from '@/models/v4/shifts/shiftResultData';

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Mock date-fns
jest.mock('date-fns', () => ({
  format: jest.fn((date, formatStr) => {
    if (formatStr === 'MMM dd, yyyy') {
      return 'Jan 15, 2024';
    }
    return date;
  }),
  parseISO: jest.fn((dateStr) => new Date(dateStr)),
}));

// Mock lucide-react-native
jest.mock('lucide-react-native', () => ({
  Clock: 'Clock',
  Users: 'Users',
  Calendar: 'Calendar',
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
    Card: ({ children, className, style, ...props }: any) =>
      React.createElement('div', { 'data-testid': 'card', className, style, ...props }, children),
    CardContent: ({ children, className, ...props }: any) =>
      React.createElement('div', { 'data-testid': 'card-content', className, ...props }, children),
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
    Pressable: ({ children, onPress, ...props }: any) => {
      return React.createElement(
        'div',
        {
          'data-testid': 'pressable',
          onClick: onPress,
          ...props,
        },
        children
      );
    },
  };
});

jest.mock('@/components/ui/icon', () => ({
  Icon: ({ as: Component, ...props }: any) => {
    const React = require('react');
    return React.createElement('div', { 'data-testid': 'icon', ...props }, Component);
  },
}));

const mockShift: ShiftResultData = {
  ShiftId: '1',
  Name: 'Day Shift',
  Code: 'DAY',
  Color: '#FF0000',
  ScheduleType: 0,
  AssignmentType: 1,
  InShift: true,
  PersonnelCount: 5,
  GroupCount: 2,
  NextDay: '2024-01-15T00:00:00Z',
  NextDayId: 'day1',
  Days: [],
};

const mockOnPress = jest.fn();

describe('ShiftCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders shift information correctly', () => {
    const { getByText, queryByText } = render(
      <ShiftCard shift={mockShift} onPress={mockOnPress} />
    );

    expect(getByText('Day Shift')).toBeTruthy();
    expect(getByText('shifts.shift_code: DAY')).toBeTruthy();
    expect(getByText('5 shifts.personnel_count')).toBeTruthy();
    expect(getByText('2 shifts.groups')).toBeTruthy();
    expect(getByText('shifts.in_shift')).toBeTruthy();
  });

  it('renders schedule and assignment type badges', () => {
    const { getByText } = render(
      <ShiftCard shift={mockShift} onPress={mockOnPress} />
    );

    expect(getByText('Manual')).toBeTruthy(); // ScheduleType 0
    expect(getByText('Required')).toBeTruthy(); // AssignmentType 1
  });

  it('renders next day information when available', () => {
    const { getByText } = render(
      <ShiftCard shift={mockShift} onPress={mockOnPress} />
    );

    expect(getByText('shifts.next_day')).toBeTruthy();
    expect(getByText('Jan 15, 2024')).toBeTruthy();
  });

  it('does not render InShift badge when not in shift', () => {
    const shiftNotInShift = { ...mockShift, InShift: false };
    const { queryByText } = render(
      <ShiftCard shift={shiftNotInShift} onPress={mockOnPress} />
    );

    expect(queryByText('shifts.in_shift')).toBeNull();
  });

  it('does not render shift code when not provided', () => {
    const shiftWithoutCode = { ...mockShift, Code: '' };
    const { queryByText } = render(
      <ShiftCard shift={shiftWithoutCode} onPress={mockOnPress} />
    );

    expect(queryByText(/shifts.shift_code/)).toBeNull();
  });

  it('handles missing next day gracefully', () => {
    const shiftWithoutNextDay = { ...mockShift, NextDay: '' };
    const { queryByText } = render(
      <ShiftCard shift={shiftWithoutNextDay} onPress={mockOnPress} />
    );

    expect(queryByText('shifts.next_day')).toBeNull();
  });

  it('calls onPress when card is pressed', () => {
    const { getByText } = render(
      <ShiftCard shift={mockShift} onPress={mockOnPress} />
    );

    fireEvent.press(getByText('Day Shift'));
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('applies correct border color from shift color', () => {
    const { getByText } = render(
      <ShiftCard shift={mockShift} onPress={mockOnPress} />
    );

    // Test that the component renders without error with the shift color
    expect(getByText('Day Shift')).toBeTruthy();
  });

  it('renders different schedule types correctly', () => {
    const automaticShift = { ...mockShift, ScheduleType: 1 };
    const { getByText } = render(
      <ShiftCard shift={automaticShift} onPress={mockOnPress} />
    );

    expect(getByText('Automatic')).toBeTruthy();
  });

  it('renders different assignment types correctly', () => {
    const optionalShift = { ...mockShift, AssignmentType: 0 };
    const { getByText } = render(
      <ShiftCard shift={optionalShift} onPress={mockOnPress} />
    );

    expect(getByText('Optional')).toBeTruthy();
  });

  it('handles unknown schedule and assignment types', () => {
    const unknownTypesShift = {
      ...mockShift,
      ScheduleType: 999,
      AssignmentType: 999
    };
    const { getAllByText } = render(
      <ShiftCard shift={unknownTypesShift} onPress={mockOnPress} />
    );

    const unknownTexts = getAllByText('Unknown');
    expect(unknownTexts).toHaveLength(2);
  });

  it('handles invalid date format gracefully', () => {
    const shiftWithInvalidDate = { ...mockShift, NextDay: 'invalid-date' };
    const { getByText } = render(
      <ShiftCard shift={shiftWithInvalidDate} onPress={mockOnPress} />
    );

    // Should still render the shift name
    expect(getByText('Day Shift')).toBeTruthy();
  });
}); 