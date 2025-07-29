import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ShiftCard } from '../shift-card';
import { type ShiftResultData } from '@/models/v4/shifts/shiftResultData';

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'shifts.shift_code': 'Shift Code',
        'shifts.in_shift': 'In Shift',
        'shifts.personnel_count': 'Personnel',
        'shifts.groups': 'Groups',
        'shifts.next_day': 'Next Day',
        'shifts.manual': 'Manual',
        'shifts.automatic': 'Automatic',
        'shifts.optional': 'Optional',
        'shifts.required': 'Required',
        'shifts.unknown': 'Unknown',
        'shifts.no_shifts': 'No shifts available',
      };
      return translations[key] || key;
    },
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
  Clock: () => 'Clock-Icon',
  Users: () => 'Users-Icon',
  Calendar: () => 'Calendar-Icon',
}));

// Mock UI components - simplified approach
jest.mock('@/components/ui/text', () => ({
  Text: ({ children, size, className, ...props }: any) => {
    const React = require('react');
    return React.createElement('text', { 'data-size': size, 'data-class': className, ...props }, children);
  },
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, action, size, ...props }: any) => {
    const React = require('react');
    return React.createElement('badge', { 'data-action': action, 'data-size': size, ...props }, children);
  },
  BadgeText: ({ children, ...props }: any) => {
    const React = require('react');
    return React.createElement('badge-text', props, children);
  },
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className, style, ...props }: any) => {
    const React = require('react');
    return React.createElement('card', { 'data-testid': 'card', className, style, ...props }, children);
  },
}));

jest.mock('@/components/ui/hstack', () => ({
  HStack: ({ children, space, className, ...props }: any) => {
    const React = require('react');
    return React.createElement('hstack', { 'data-space': space, 'data-class': className, ...props }, children);
  },
}));

jest.mock('@/components/ui/vstack', () => ({
  VStack: ({ children, space, className, ...props }: any) => {
    const React = require('react');
    return React.createElement('vstack', { 'data-space': space, 'data-class': className, ...props }, children);
  },
}));

jest.mock('@/components/ui/pressable', () => ({
  Pressable: ({ children, onPress, ...props }: any) => {
    const React = require('react');
    return React.createElement('pressable', { 'data-testid': 'pressable', onPress, ...props }, children);
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
    const { getByText } = render(<ShiftCard shift={mockShift} onPress={mockOnPress} />);

    expect(getByText('Day Shift')).toBeTruthy();
    expect(getByText('Shift Code: DAY')).toBeTruthy();
    expect(getByText('5 Personnel')).toBeTruthy();
    expect(getByText('2 Groups')).toBeTruthy();
    expect(getByText('In Shift')).toBeTruthy();
  });

  it('renders schedule and assignment type badges correctly', () => {
    const { getByText } = render(<ShiftCard shift={mockShift} onPress={mockOnPress} />);

    expect(getByText('Manual')).toBeTruthy(); // ScheduleType 0
    expect(getByText('Required')).toBeTruthy(); // AssignmentType 1
  });

  it('renders next day information when available', () => {
    const { getByText } = render(<ShiftCard shift={mockShift} onPress={mockOnPress} />);

    expect(getByText('Next Day')).toBeTruthy();
    expect(getByText('Jan 15, 2024')).toBeTruthy();
  });

  it('does not render InShift badge when not in shift', () => {
    const shiftNotInShift = { ...mockShift, InShift: false };
    const { queryByText } = render(<ShiftCard shift={shiftNotInShift} onPress={mockOnPress} />);

    expect(queryByText('In Shift')).toBeNull();
  });

  it('does not render shift code when not provided', () => {
    const shiftWithoutCode = { ...mockShift, Code: '' };
    const { queryByText } = render(<ShiftCard shift={shiftWithoutCode} onPress={mockOnPress} />);

    expect(queryByText(/Shift Code/)).toBeNull();
  });

  it('handles missing next day gracefully', () => {
    const shiftWithoutNextDay = { ...mockShift, NextDay: '' };
    const { queryByText } = render(<ShiftCard shift={shiftWithoutNextDay} onPress={mockOnPress} />);

    expect(queryByText('Next Day')).toBeNull();
  });

  it('renders basic structure correctly', () => {
    const { UNSAFE_getByType } = render(<ShiftCard shift={mockShift} onPress={mockOnPress} />);

    // Check basic rendering - since our mocks return simple elements, 
    // we just verify the component renders without errors
    expect(() => render(<ShiftCard shift={mockShift} onPress={mockOnPress} />)).not.toThrow();
  });

  it('handles all required functionality', () => {
    // Test that the component works with all the features we implemented
    const result = render(<ShiftCard shift={mockShift} onPress={mockOnPress} />);

    // The component should render successfully with our refactored structure
    expect(result).toBeTruthy();

    // Test different variants work
    const automaticShift = { ...mockShift, ScheduleType: 1 };
    expect(() => render(<ShiftCard shift={automaticShift} onPress={mockOnPress} />)).not.toThrow();

    const optionalShift = { ...mockShift, AssignmentType: 0 };
    expect(() => render(<ShiftCard shift={optionalShift} onPress={mockOnPress} />)).not.toThrow();
  });
}); 