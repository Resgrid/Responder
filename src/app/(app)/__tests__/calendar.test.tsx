import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { useTranslation } from 'react-i18next';

import CalendarScreen from '../../calendar';
import { useCalendarStore } from '@/stores/calendar/store';

// Mock the translation hook
jest.mock('react-i18next', () => ({
  useTranslation: jest.fn(),
}));

// Mock the calendar store
jest.mock('@/stores/calendar/store', () => ({
  useCalendarStore: jest.fn(),
}));

// Mock all gluestack-ui components to avoid CSS interop issues
jest.mock('@/components/ui', () => ({
  View: require('react-native').View,
  VStack: require('react-native').View,
  HStack: require('react-native').View,
}));

jest.mock('@/components/ui/button', () => ({
  Button: require('react-native').TouchableOpacity,
  ButtonText: require('react-native').Text,
}));

jest.mock('@/components/ui/flat-list', () => ({
  FlatList: require('react-native').FlatList,
}));

jest.mock('@/components/ui/heading', () => ({
  Heading: require('react-native').Text,
}));

jest.mock('@/components/ui/text', () => ({
  Text: require('react-native').Text,
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: require('react-native').View,
}));

// Mock the calendar components
jest.mock('@/components/calendar/calendar-card', () => ({
  CalendarCard: ({ item, onPress }: any) => {
    const React = require('react');
    const { TouchableOpacity, Text } = require('react-native');
    return React.createElement(TouchableOpacity, {
      testID: "calendar-card",
      onPress: () => onPress(item)
    }, React.createElement(Text, {}, item.Title));
  },
}));

jest.mock('@/components/calendar/calendar-view', () => ({
  CalendarView: () => {
    const React = require('react');
    const { View, Text } = require('react-native');
    return React.createElement(View, { testID: "calendar-view" },
      React.createElement(Text, {}, "Calendar View")
    );
  },
}));

jest.mock('@/components/calendar/calendar-item-details-sheet', () => ({
  CalendarItemDetailsSheet: ({ item, isOpen, onClose }: any) => {
    const React = require('react');
    const { View, Text, TouchableOpacity } = require('react-native');
    return isOpen ? React.createElement(View, { testID: "calendar-details-sheet" }, [
      React.createElement(Text, { key: "title" }, item?.Title),
      React.createElement(TouchableOpacity, {
        key: "close-button",
        testID: "close-button",
        onPress: onClose
      }, React.createElement(Text, {}, "Close"))
    ]) : null;
  },
}));

// Mock other components
jest.mock('@/components/common/loading', () => ({
  Loading: ({ message }: any) => {
    const React = require('react');
    const { View, Text } = require('react-native');
    return React.createElement(View, { testID: "loading" },
      React.createElement(Text, {}, message)
    );
  },
}));

jest.mock('@/components/common/zero-state', () => ({
  ZeroState: ({ title, description, actionLabel, onAction }: any) => {
    const React = require('react');
    const { View, Text, TouchableOpacity } = require('react-native');
    return React.createElement(View, { testID: "zero-state" }, [
      React.createElement(Text, { key: "title" }, title),
      React.createElement(Text, { key: "description" }, description),
      actionLabel && React.createElement(TouchableOpacity, {
        key: "retry-button",
        testID: "retry-button",
        onPress: onAction
      }, React.createElement(Text, {}, actionLabel))
    ].filter(Boolean));
  },
}));

const mockT = jest.fn((key: string, options?: any) => {
  const translations: Record<string, string> = {
    'calendar.tabs.today': 'Today',
    'calendar.tabs.upcoming': 'Upcoming',
    'calendar.tabs.calendar': 'Calendar',
    'calendar.loading.today': 'Loading today\'s events...',
    'calendar.loading.upcoming': 'Loading upcoming events...',
    'calendar.loading.date': 'Loading events for selected date...',
    'calendar.error.title': 'Error',
    'calendar.today.empty.title': 'No Events Today',
    'calendar.today.empty.description': 'You have no scheduled events for today.',
    'calendar.upcoming.empty.title': 'No Upcoming Events',
    'calendar.upcoming.empty.description': 'You have no scheduled events in the next 7 days.',
    'calendar.selectedDate.title': `Events for ${options?.date || 'selected date'}`,
    'calendar.selectedDate.empty': 'No events scheduled for this date.',
    'calendar.selectDate': 'Select a date to view events',
    'common.retry': 'Retry',
  };
  return translations[key] || key;
});

const mockCalendarItem = {
  CalendarItemId: '123',
  Title: 'Test Event',
  Start: '2024-01-15T10:00:00Z',
  StartUtc: '2024-01-15T10:00:00Z',
  End: '2024-01-15T12:00:00Z',
  EndUtc: '2024-01-15T12:00:00Z',
  StartTimezone: 'UTC',
  EndTimezone: 'UTC',
  Description: 'Test description',
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
};

const mockStore = {
  todaysItems: [],
  upcomingItems: [],
  selectedMonthItems: [],
  selectedDate: null,
  isTodaysLoading: false,
  isUpcomingLoading: false,
  isLoading: false,
  error: null,
  fetchTodaysItems: jest.fn(),
  fetchUpcomingItems: jest.fn(),
  fetchItemsForDateRange: jest.fn(),
  clearError: jest.fn(),
};

describe('CalendarScreen', () => {
  beforeEach(() => {
    (useTranslation as jest.Mock).mockReturnValue({ t: mockT });
    (useCalendarStore as jest.Mock).mockReturnValue(mockStore);
    jest.clearAllMocks();
  });

  it('renders calendar screen correctly', () => {
    const { getByText } = render(<CalendarScreen />);

    expect(getByText('Today')).toBeTruthy();
    expect(getByText('Upcoming')).toBeTruthy();
    expect(getByText('Calendar')).toBeTruthy();
  });

  it('initializes data on mount', () => {
    render(<CalendarScreen />);

    expect(mockStore.fetchTodaysItems).toHaveBeenCalledTimes(1);
    expect(mockStore.fetchUpcomingItems).toHaveBeenCalledTimes(1);
  });

  it('switches between tabs correctly', () => {
    const { getByText } = render(<CalendarScreen />);

    // Switch to upcoming tab
    fireEvent.press(getByText('Upcoming'));

    // Switch to calendar tab
    fireEvent.press(getByText('Calendar'));

    // Switch back to today tab
    fireEvent.press(getByText('Today'));
  });

  describe('Today Tab', () => {
    it('shows loading state for today\'s items', () => {
      (useCalendarStore as jest.Mock).mockReturnValue({
        ...mockStore,
        isTodaysLoading: true,
      });

      const { getByTestId } = render(<CalendarScreen />);

      expect(getByTestId('loading')).toBeTruthy();
    });

    it('shows error state for today\'s items', () => {
      (useCalendarStore as jest.Mock).mockReturnValue({
        ...mockStore,
        error: 'Failed to load',
      });

      const { getByTestId, getByText } = render(<CalendarScreen />);

      expect(getByTestId('zero-state')).toBeTruthy();
      expect(getByText('Error')).toBeTruthy();
      expect(getByText('Failed to load')).toBeTruthy();
    });

    it('shows empty state when no today\'s items', () => {
      const { getByTestId, getByText } = render(<CalendarScreen />);

      expect(getByTestId('zero-state')).toBeTruthy();
      expect(getByText('No Events Today')).toBeTruthy();
    });

    it('renders today\'s items when available', () => {
      (useCalendarStore as jest.Mock).mockReturnValue({
        ...mockStore,
        todaysItems: [mockCalendarItem],
      });

      const { getByTestId } = render(<CalendarScreen />);

      expect(getByTestId('calendar-card')).toBeTruthy();
    });
  });

  describe('Upcoming Tab', () => {
    it('shows loading state for upcoming items', () => {
      (useCalendarStore as jest.Mock).mockReturnValue({
        ...mockStore,
        isUpcomingLoading: true,
      });

      const { getByText, getByTestId } = render(<CalendarScreen />);
      fireEvent.press(getByText('Upcoming'));

      expect(getByTestId('loading')).toBeTruthy();
    });

    it('shows empty state when no upcoming items', () => {
      const { getByText, getByTestId } = render(<CalendarScreen />);
      fireEvent.press(getByText('Upcoming'));

      expect(getByTestId('zero-state')).toBeTruthy();
      expect(getByText('No Upcoming Events')).toBeTruthy();
    });

    it('renders upcoming items when available', () => {
      (useCalendarStore as jest.Mock).mockReturnValue({
        ...mockStore,
        upcomingItems: [mockCalendarItem],
      });

      const { getByText, getByTestId } = render(<CalendarScreen />);
      fireEvent.press(getByText('Upcoming'));

      expect(getByTestId('calendar-card')).toBeTruthy();
    });
  });

  describe('Calendar Tab', () => {
    it('renders calendar view', () => {
      const { getByText, getByTestId } = render(<CalendarScreen />);
      fireEvent.press(getByText('Calendar'));

      expect(getByTestId('calendar-view')).toBeTruthy();
    });

    it('shows select date message when no date selected', () => {
      const { getByText } = render(<CalendarScreen />);
      fireEvent.press(getByText('Calendar'));

      expect(getByText('Select a date to view events')).toBeTruthy();
    });

    it('shows events for selected date', () => {
      const testDate = '2024-01-15T10:00:00Z'; // Use same time as item for consistency
      const mockItemWithMatchingDate = {
        ...mockCalendarItem,
        Start: '2024-01-15T10:00:00Z', // Same time as selected date
      };

      (useCalendarStore as jest.Mock).mockReturnValue({
        ...mockStore,
        selectedDate: testDate,
        selectedMonthItems: [mockItemWithMatchingDate],
      });

      const { getByText, getByTestId } = render(<CalendarScreen />);
      fireEvent.press(getByText('Calendar'));

      expect(getByTestId('calendar-card')).toBeTruthy();
    });

    it('shows empty message when no events for selected date', () => {
      (useCalendarStore as jest.Mock).mockReturnValue({
        ...mockStore,
        selectedDate: '2024-01-15',
        selectedMonthItems: [],
      });

      const { getByText } = render(<CalendarScreen />);
      fireEvent.press(getByText('Calendar'));

      expect(getByText('No events scheduled for this date.')).toBeTruthy();
    });
  });

  describe('Calendar Item Details', () => {
    it('opens details sheet when item is pressed', async () => {
      (useCalendarStore as jest.Mock).mockReturnValue({
        ...mockStore,
        todaysItems: [mockCalendarItem],
      });

      const { getByTestId } = render(<CalendarScreen />);

      fireEvent.press(getByTestId('calendar-card'));

      await waitFor(() => {
        expect(getByTestId('calendar-details-sheet')).toBeTruthy();
      });
    });

    it('closes details sheet when close is pressed', async () => {
      (useCalendarStore as jest.Mock).mockReturnValue({
        ...mockStore,
        todaysItems: [mockCalendarItem],
      });

      const { getByTestId, queryByTestId } = render(<CalendarScreen />);

      // Open details sheet
      fireEvent.press(getByTestId('calendar-card'));

      await waitFor(() => {
        expect(getByTestId('calendar-details-sheet')).toBeTruthy();
      });

      // Close details sheet
      fireEvent.press(getByTestId('close-button'));

      await waitFor(() => {
        expect(queryByTestId('calendar-details-sheet')).toBeNull();
      });
    });
  });

  describe('Error Handling', () => {
    it('calls retry action when retry button is pressed', () => {
      (useCalendarStore as jest.Mock).mockReturnValue({
        ...mockStore,
        error: 'Network error',
      });

      const { getByTestId } = render(<CalendarScreen />);

      fireEvent.press(getByTestId('retry-button'));

      expect(mockStore.clearError).toHaveBeenCalled();
    });
  });
}); 
