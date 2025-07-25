import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { useTranslation } from 'react-i18next';

import { CalendarCard } from '../calendar-card';
import { type CalendarItemResultData } from '@/models/v4/calendar/calendarItemResultData';

// Mock the translation hook
jest.mock('react-i18next', () => ({
  useTranslation: jest.fn(),
}));

// Mock Lucide icons
jest.mock('lucide-react-native', () => ({
  Calendar: 'Calendar',
  Clock: 'Clock',
  MapPin: 'MapPin',
  Users: 'Users',
  CheckCircle: 'CheckCircle',
}));

// Mock UI components
jest.mock('@/components/ui/card', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    Card: ({ children, className, ...props }: any) => React.createElement(View, { ...props, testID: 'card' }, children),
    CardContent: ({ children, className, ...props }: any) => React.createElement(View, { ...props, testID: 'card-content' }, children),
  };
});

jest.mock('@/components/ui/vstack', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    VStack: ({ children, space, className, ...props }: any) => React.createElement(View, { ...props, testID: 'vstack' }, children),
  };
});

jest.mock('@/components/ui/hstack', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    HStack: ({ children, space, className, ...props }: any) => React.createElement(View, { ...props, testID: 'hstack' }, children),
  };
});

jest.mock('@/components/ui/text', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    Text: ({ children, className, numberOfLines, ...props }: any) => React.createElement(Text, { ...props, testID: 'text' }, children),
  };
});

jest.mock('@/components/ui/heading', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    Heading: ({ children, size, className, numberOfLines, ...props }: any) => React.createElement(Text, { ...props, testID: 'heading' }, children),
  };
});

jest.mock('@/components/ui/badge', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    Badge: ({ children, variant, className, style, ...props }: any) => React.createElement(View, { ...props, testID: 'badge' }, children),
  };
});

jest.mock('@/components/ui/pressable', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    Pressable: ({ children, onPress, testID, ...props }: any) => React.createElement(View, { ...props, onPress, testID: testID || 'pressable' }, children),
  };
});

const mockT = jest.fn((key: string, options?: any) => {
  const translations: Record<string, string> = {
    'calendar.allDay': 'All Day',
    'calendar.attendeesCount': `${options?.count || 1} attendee${options?.count > 1 ? 's' : ''}`,
    'calendar.signupAvailable': 'Sign-up available',
    'calendar.signedUp': 'Signed Up',
    'calendar.tapToSignUp': 'Tap to sign up',
  };
  return translations[key] || key;
});

describe('CalendarCard', () => {
  const mockOnPress = jest.fn();

  beforeEach(() => {
    (useTranslation as jest.Mock).mockReturnValue({ t: mockT });
    jest.clearAllMocks();
  });

  const createMockItem = (overrides: Partial<CalendarItemResultData> = {}): CalendarItemResultData => ({
    CalendarItemId: '123',
    Title: 'Test Event',
    Start: '2024-01-15T10:00:00Z',
    StartUtc: '2024-01-15T10:00:00Z',
    End: '2024-01-15T12:00:00Z',
    EndUtc: '2024-01-15T12:00:00Z',
    StartTimezone: 'UTC',
    EndTimezone: 'UTC',
    Description: 'Test event description',
    RecurrenceId: '',
    RecurrenceRule: '',
    RecurrenceException: '',
    ItemType: 1,
    IsAllDay: false,
    Location: 'Test Location',
    SignupType: 1,
    Reminder: 0,
    LockEditing: false,
    Entities: '',
    RequiredAttendes: '',
    OptionalAttendes: '',
    IsAdminOrCreator: false,
    CreatorUserId: 'user123',
    Attending: false,
    TypeName: 'Meeting',
    TypeColor: '#3B82F6',
    Attendees: [],
    ...overrides,
  });

  it('renders basic event information correctly', () => {
    const item = createMockItem();
    const { getByText } = render(
      <CalendarCard item={item} onPress={mockOnPress} />
    );

    expect(getByText('Test Event')).toBeTruthy();
    expect(getByText('Meeting')).toBeTruthy();
    expect(getByText('Test Location')).toBeTruthy();
    expect(getByText('Test event description')).toBeTruthy();
  });

  it('displays all day event correctly', () => {
    const item = createMockItem({ IsAllDay: true });
    const { getByText } = render(
      <CalendarCard item={item} onPress={mockOnPress} />
    );

    expect(getByText('All Day')).toBeTruthy();
  });

  it('displays time range for non-all-day events', () => {
    const item = createMockItem({
      Start: '2024-01-15T10:00:00Z',
      End: '2024-01-15T12:00:00Z',
      IsAllDay: false,
    });

    const { getByText } = render(
      <CalendarCard item={item} onPress={mockOnPress} />
    );

    // Should display time range (format may vary based on locale/timezone)
    // We expect a time range format like "XX:XX AM - XX:XX AM" or "XX:XX - XX:XX"
    expect(getByText(/\d{1,2}:\d{2}.*-.*\d{1,2}:\d{2}/)).toBeTruthy();
  });

  it('shows attendees count when attendees exist', () => {
    const item = createMockItem({
      Attendees: [
        {
          CalendarItemId: '123',
          UserId: 'user1',
          Name: 'John Doe',
          GroupName: 'Group A',
          AttendeeType: 1,
          Timestamp: '2024-01-15T10:00:00Z',
          Note: '',
        },
        {
          CalendarItemId: '123',
          UserId: 'user2',
          Name: 'Jane Smith',
          GroupName: 'Group B',
          AttendeeType: 2,
          Timestamp: '2024-01-15T10:00:00Z',
          Note: '',
        },
      ],
    });

    const { getByText } = render(
      <CalendarCard item={item} onPress={mockOnPress} />
    );

    expect(getByText('2 attendees')).toBeTruthy();
  });

  it('shows signup section when signup is available', () => {
    const item = createMockItem({
      SignupType: 1,
      LockEditing: false,
      Attending: false,
    });

    const { getByText } = render(
      <CalendarCard item={item} onPress={mockOnPress} />
    );

    expect(getByText('Sign-up available')).toBeTruthy();
    expect(getByText('Tap to sign up')).toBeTruthy();
  });

  it('shows signed up status when user is attending', () => {
    const item = createMockItem({
      SignupType: 1,
      LockEditing: false,
      Attending: true,
    });

    const { getByText } = render(
      <CalendarCard item={item} onPress={mockOnPress} />
    );

    expect(getByText('Sign-up available')).toBeTruthy();
    expect(getByText('Signed Up')).toBeTruthy();
  });

  it('does not show signup section when signup is not available', () => {
    const item = createMockItem({
      SignupType: 0,
      LockEditing: false,
      Attending: false,
    });

    const { queryByText } = render(
      <CalendarCard item={item} onPress={mockOnPress} />
    );

    expect(queryByText('Sign-up available')).toBeNull();
  });

  it('does not show signup section when editing is locked', () => {
    const item = createMockItem({
      SignupType: 1,
      LockEditing: true,
      Attending: false,
    });

    const { queryByText } = render(
      <CalendarCard item={item} onPress={mockOnPress} />
    );

    expect(queryByText('Sign-up available')).toBeNull();
  });

  it('calls onPress when pressed', () => {
    const item = createMockItem();
    const { getByText } = render(
      <CalendarCard item={item} onPress={mockOnPress} />
    );

    fireEvent.press(getByText('Test Event'));
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('does not show optional fields when they are empty', () => {
    const item = createMockItem({
      Location: '',
      Description: '',
      TypeName: '',
      Attendees: [],
    });

    const { queryByText } = render(
      <CalendarCard item={item} onPress={mockOnPress} />
    );

    expect(queryByText('Test Location')).toBeNull();
    expect(queryByText('Test event description')).toBeNull();
  });

  it('applies custom testID when provided', () => {
    const item = createMockItem();
    const { getByTestId } = render(
      <CalendarCard item={item} onPress={mockOnPress} testID="calendar-card-test" />
    );

    expect(getByTestId('calendar-card-test')).toBeTruthy();
  });
}); 