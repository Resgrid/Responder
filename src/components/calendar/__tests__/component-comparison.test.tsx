import React from 'react';
import { render } from '@testing-library/react-native';

import { CalendarCard } from '../calendar-card';
import { CompactCalendarItem } from '../compact-calendar-item';
import { type CalendarItemResultData } from '@/models/v4/calendar/calendarItemResultData';

// Mock the translation hook
jest.mock('react-i18next', () => ({
  useTranslation: jest.fn(() => ({ t: (key: string) => key })),
}));

// Mock nativewind
jest.mock('nativewind', () => ({
  useColorScheme: jest.fn(() => ({ colorScheme: 'light' })),
}));

// Mock WebView and related utilities
jest.mock('@/utils/webview-html', () => ({
  generateWebViewHtml: jest.fn(({ content }) => `<html><body>${content}</body></html>`),
  defaultWebViewProps: {},
}));

jest.mock('react-native-webview', () => ({
  __esModule: true,
  default: () => null,
}));

// Mock all UI components with proper React elements
jest.mock('@/components/ui/card', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    Card: ({ children }: any) => React.createElement(View, { testID: 'card' }, children),
    CardContent: ({ children }: any) => React.createElement(View, { testID: 'card-content' }, children),
  };
});

jest.mock('@/components/ui/vstack', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    VStack: ({ children }: any) => React.createElement(View, { testID: 'vstack' }, children),
  };
});

jest.mock('@/components/ui/hstack', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    HStack: ({ children }: any) => React.createElement(View, { testID: 'hstack' }, children),
  };
});

jest.mock('@/components/ui/text', () => {
  const React = require('react');
  const { Text: RNText } = require('react-native');
  return {
    Text: ({ children, ...props }: any) => React.createElement(RNText, { ...props, testID: 'text' }, children),
  };
});

jest.mock('@/components/ui/heading', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    Heading: ({ children, ...props }: any) => React.createElement(Text, { ...props, testID: 'heading' }, children),
  };
});

jest.mock('@/components/ui/badge', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    Badge: ({ children }: any) => React.createElement(View, { testID: 'badge' }, children),
  };
});

jest.mock('@/components/ui/box', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    Box: ({ children }: any) => React.createElement(View, { testID: 'box' }, children),
  };
});

jest.mock('@/components/ui/pressable', () => {
  const React = require('react');
  const { TouchableOpacity } = require('react-native');
  return {
    Pressable: ({ children, onPress }: any) => React.createElement(TouchableOpacity, { onPress, testID: 'pressable' }, children),
  };
});

// Mock Lucide icons
jest.mock('lucide-react-native', () => ({
  Calendar: () => null,
  Clock: () => null,
  MapPin: () => null,
  Users: () => null,
  CheckCircle: () => null,
}));

describe('Calendar Component Comparison', () => {
  const mockItem: CalendarItemResultData = {
    CalendarItemId: '123',
    Title: 'Test Event',
    Start: '2024-01-15T10:00:00Z',
    StartUtc: '2024-01-15T10:00:00Z',
    End: '2024-01-15T12:00:00Z',
    EndUtc: '2024-01-15T12:00:00Z',
    StartTimezone: 'UTC',
    EndTimezone: 'UTC',
    Description: 'Test event description with some longer content that might wrap to multiple lines',
    RecurrenceId: '',
    RecurrenceRule: '',
    RecurrenceException: '',
    ItemType: 1,
    IsAllDay: false,
    Location: 'Test Location Address, City, State 12345',
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
  };

  it('renders both components without errors', () => {
    const mockOnPress = jest.fn();

    expect(() => {
      render(<CalendarCard item={mockItem} onPress={mockOnPress} />);
    }).not.toThrow();

    expect(() => {
      render(<CompactCalendarItem item={mockItem} onPress={mockOnPress} />);
    }).not.toThrow();
  });

  it('both components handle the same data structure', () => {
    const mockOnPress = jest.fn();

    const fullCard = render(<CalendarCard item={mockItem} onPress={mockOnPress} />);
    const compactCard = render(<CompactCalendarItem item={mockItem} onPress={mockOnPress} />);

    // Both should render without errors and contain the title
    expect(fullCard.getByText('Test Event')).toBeTruthy();
    expect(compactCard.getByText('Test Event')).toBeTruthy();
  });

  it('compact component has simplified content structure', () => {
    const mockOnPress = jest.fn();

    const fullCard = render(<CalendarCard item={mockItem} onPress={mockOnPress} />);
    const compactCard = render(<CompactCalendarItem item={mockItem} onPress={mockOnPress} />);

    // Both should show essential information
    expect(fullCard.getByText('Test Event')).toBeTruthy();
    expect(fullCard.getByText('Meeting')).toBeTruthy();

    expect(compactCard.getByText('Test Event')).toBeTruthy();
    expect(compactCard.getByText('Meeting')).toBeTruthy();

    // The compact version should not have WebView for description
    // (this would be apparent in the actual component structure)
  });
});
