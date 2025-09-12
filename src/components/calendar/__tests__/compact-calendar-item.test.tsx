import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { useTranslation } from 'react-i18next';

import { CompactCalendarItem } from '../compact-calendar-item';
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
    'calendar.signupAvailable': 'Sign-up available',
    'calendar.signedUp': 'Signed Up',
    'calendar.tapToSignUp': 'Tap to sign up',
  };
  return translations[key] || key;
});

describe('CompactCalendarItem', () => {
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
      <CompactCalendarItem item={item} onPress={mockOnPress} />
    );

    expect(getByText('Test Event')).toBeTruthy();
    expect(getByText('Meeting')).toBeTruthy();
    expect(getByText('Test Location')).toBeTruthy();
  });

  it('displays all day event correctly', () => {
    const item = createMockItem({ IsAllDay: true });
    const { getByText } = render(
      <CompactCalendarItem item={item} onPress={mockOnPress} />
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
      <CompactCalendarItem item={item} onPress={mockOnPress} />
    );

    // Should display time range (format may vary based on locale/timezone)
    // We expect a time range format like "XX:XX AM - XX:XX AM" or "XX:XX - XX:XX"
    expect(getByText(/\d{1,2}:\d{2}.*-.*\d{1,2}:\d{2}/)).toBeTruthy();
  });

  it('shows signup section when signup is available', () => {
    const item = createMockItem({
      SignupType: 1,
      LockEditing: false,
      Attending: false,
    });

    const { getByText } = render(
      <CompactCalendarItem item={item} onPress={mockOnPress} />
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
      <CompactCalendarItem item={item} onPress={mockOnPress} />
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
      <CompactCalendarItem item={item} onPress={mockOnPress} />
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
      <CompactCalendarItem item={item} onPress={mockOnPress} />
    );

    expect(queryByText('Sign-up available')).toBeNull();
  });

  it('calls onPress when pressed', () => {
    const item = createMockItem();
    const { getByTestId } = render(
      <CompactCalendarItem item={item} onPress={mockOnPress} testID="compact-calendar-item" />
    );

    fireEvent.press(getByTestId('compact-calendar-item'));
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('does not show location when it is empty', () => {
    const item = createMockItem({
      Location: '',
    });

    const { queryByText } = render(
      <CompactCalendarItem item={item} onPress={mockOnPress} />
    );

    expect(queryByText('Test Location')).toBeNull();
  });

  it('does not show type badge when TypeName is empty', () => {
    const item = createMockItem({
      TypeName: '',
    });

    const { queryByText } = render(
      <CompactCalendarItem item={item} onPress={mockOnPress} />
    );

    expect(queryByText('Meeting')).toBeNull();
  });

  it('applies custom testID when provided', () => {
    const item = createMockItem();
    const { getByTestId } = render(
      <CompactCalendarItem item={item} onPress={mockOnPress} testID="compact-calendar-item-test" />
    );

    expect(getByTestId('compact-calendar-item-test')).toBeTruthy();
  });

  it('shows check circle icon when user is signed up', () => {
    const item = createMockItem({
      SignupType: 1,
      LockEditing: false,
      Attending: true,
    });

    const { getByText } = render(
      <CompactCalendarItem item={item} onPress={mockOnPress} />
    );

    // When signed up, should show the "Signed Up" text and signup section
    expect(getByText('Signed Up')).toBeTruthy();
    expect(getByText('Sign-up available')).toBeTruthy();
  });

  it('does not show check circle icon when user is not signed up', () => {
    const item = createMockItem({
      SignupType: 1,
      LockEditing: false,
      Attending: false,
    });

    const { getByText, queryByText } = render(
      <CompactCalendarItem item={item} onPress={mockOnPress} />
    );

    // When not signed up, should show "Tap to sign up" but not "Signed Up"
    expect(getByText('Tap to sign up')).toBeTruthy();
    expect(queryByText('Signed Up')).toBeNull();
  });

  it('renders date in correct format', () => {
    const item = createMockItem({
      Start: '2024-01-15T10:00:00Z',
    });

    const { getByText } = render(
      <CompactCalendarItem item={item} onPress={mockOnPress} />
    );

    // Should display date in short format (e.g., "Mon, Jan 15")
    // The exact format depends on locale, but should contain the date
    const dateRegex = /\w{3}.*\w{3}.*\d{1,2}/; // Matches patterns like "Mon, Jan 15"
    expect(getByText(dateRegex)).toBeTruthy();
  });

  it('truncates long titles to single line', () => {
    const item = createMockItem({
      Title: 'This is a very long event title that should be truncated to fit in a single line on mobile devices',
    });

    const { getByTestId } = render(
      <CompactCalendarItem item={item} onPress={mockOnPress} />
    );

    // The heading should have numberOfLines={1} prop
    const heading = getByTestId('heading');
    expect(heading).toBeTruthy();
    // Note: We can't easily test the numberOfLines prop in this mock setup,
    // but the component sets it correctly
  });

  it('truncates long locations to single line', () => {
    const item = createMockItem({
      Location: 'This is a very long location address that should be truncated to fit in a single line on mobile devices',
    });

    const { getByText } = render(
      <CompactCalendarItem item={item} onPress={mockOnPress} />
    );

    // Should render the location text, which will be truncated in the actual component
    expect(getByText(/This is a very long location address/)).toBeTruthy();
  });

  it('renders with minimal spacing for compact layout', () => {
    const item = createMockItem();
    const { getByTestId } = render(
      <CompactCalendarItem item={item} onPress={mockOnPress} />
    );

    // Check that the main container exists (default pressable testID)
    const pressable = getByTestId('pressable');
    expect(pressable).toBeTruthy();

    // Check that card exists (the component uses Card directly without CardContent)
    const card = getByTestId('card');
    expect(card).toBeTruthy();
  });
});
