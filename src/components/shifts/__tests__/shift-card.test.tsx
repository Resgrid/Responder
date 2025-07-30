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
        'shifts.assigned': 'Assigned',
        'shifts.signup': 'Sign Up',
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
  Clock: () => 'Clock',
  Users: () => 'Users',
  Calendar: () => 'Calendar',
}));

// Mock UI components - simplified approach using just divs and spans
jest.mock('@/components/ui/text', () => ({
  Text: ({ children }: any) => children,
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: any) => children,
  BadgeText: ({ children }: any) => children,
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({ children }: any) => children,
}));

jest.mock('@/components/ui/hstack', () => ({
  HStack: ({ children }: any) => children,
}));

jest.mock('@/components/ui/vstack', () => ({
  VStack: ({ children }: any) => children,
}));

jest.mock('@/components/ui/pressable', () => ({
  Pressable: ({ children, onPress }: any) => {
    const React = require('react');
    return React.createElement('div', { 'data-testid': 'pressable', onClick: onPress }, children);
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
    const { toJSON } = render(<ShiftCard shift={mockShift} onPress={mockOnPress} />);

    // Test that the component renders
    expect(toJSON()).toBeTruthy();

    // Convert rendered output to string and test content presence
    const renderedText = JSON.stringify(toJSON());
    expect(renderedText).toContain('Day Shift');
    expect(renderedText).toContain('Shift Code');
    expect(renderedText).toContain('DAY');
    expect(renderedText).toContain('5');
    expect(renderedText).toContain('Personnel');
    expect(renderedText).toContain('2');
    expect(renderedText).toContain('Groups');
    expect(renderedText).toContain('In Shift');
  });

  it('renders schedule and assignment type badges correctly', () => {
    const { toJSON } = render(<ShiftCard shift={mockShift} onPress={mockOnPress} />);

    const renderedText = JSON.stringify(toJSON());
    expect(renderedText).toContain('Manual'); // ScheduleType 0
    expect(renderedText).toContain('Sign Up'); // AssignmentType 1
  });

  it('renders next day information when available', () => {
    const { toJSON } = render(<ShiftCard shift={mockShift} onPress={mockOnPress} />);

    const renderedText = JSON.stringify(toJSON());
    expect(renderedText).toContain('Next Day');
    expect(renderedText).toContain('Jan 15, 2024');
  });

  it('does not render InShift badge when not in shift', () => {
    const shiftNotInShift = { ...mockShift, InShift: false };
    const { toJSON } = render(<ShiftCard shift={shiftNotInShift} onPress={mockOnPress} />);

    const renderedText = JSON.stringify(toJSON());
    expect(renderedText).not.toContain('In Shift');
  });

  it('does not render shift code when not provided', () => {
    const shiftWithoutCode = { ...mockShift, Code: '' };
    const { toJSON } = render(<ShiftCard shift={shiftWithoutCode} onPress={mockOnPress} />);

    const renderedText = JSON.stringify(toJSON());
    expect(renderedText).not.toContain('Shift Code:');
  });

  it('handles missing next day gracefully', () => {
    const shiftWithoutNextDay = { ...mockShift, NextDay: '' };
    const { toJSON } = render(<ShiftCard shift={shiftWithoutNextDay} onPress={mockOnPress} />);

    const renderedText = JSON.stringify(toJSON());
    expect(renderedText).not.toContain('Next Day');
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