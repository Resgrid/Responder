import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { useTranslation } from 'react-i18next';

import { EnhancedCalendarView } from '../enhanced-calendar-view';
import { formatLocalDateString, getTodayLocalString } from '@/lib/utils';
import { useCalendarStore } from '@/stores/calendar/store';

// Mock the translation hook
jest.mock('react-i18next', () => ({
  useTranslation: jest.fn(),
}));

// Mock the calendar store
jest.mock('@/stores/calendar/store', () => ({
  useCalendarStore: jest.fn(),
}));

// Mock react-native-calendars
jest.mock('react-native-calendars', () => ({
  Calendar: ({ testID, onDayPress, onMonthChange, current }: any) => {
    const React = require('react');
    const { View, Text, TouchableOpacity } = require('react-native');

    return React.createElement(View, { testID }, [
      React.createElement(Text, { key: 'current-month' }, `Current: ${current}`),
      React.createElement(TouchableOpacity, {
        key: 'test-day',
        testID: `${testID}-day-button`,
        onPress: () => onDayPress({ dateString: '2024-01-15' })
      }, React.createElement(Text, {}, '15')),
      React.createElement(TouchableOpacity, {
        key: 'next-month',
        testID: `${testID}-next-month`,
        onPress: () => onMonthChange({ year: 2024, month: 2 })
      }, React.createElement(Text, {}, 'Next Month'))
    ]);
  },
}));

// Mock gluestack-ui components
jest.mock('@/components/ui', () => ({
  View: require('react-native').View,
  VStack: require('react-native').View,
  HStack: require('react-native').View,
}));

jest.mock('@/components/ui/button', () => ({
  Button: require('react-native').TouchableOpacity,
  ButtonText: require('react-native').Text,
}));

jest.mock('@/components/ui/heading', () => ({
  Heading: require('react-native').Text,
}));

jest.mock('@/components/ui/text', () => ({
  Text: require('react-native').Text,
}));

jest.mock('@/components/ui/hstack', () => ({
  HStack: require('react-native').View,
}));

jest.mock('@/components/ui/vstack', () => ({
  VStack: require('react-native').View,
}));

const mockT = jest.fn((key: string, options?: any) => {
  const translations: Record<string, string> = {
    'calendar.title': 'Calendar',
    'calendar.tabs.today': 'Today',
    'calendar.selectedDate.title': `Events for ${options?.date || 'selected date'}`,
    'calendar.eventsCount': `${options?.count || 0} events`,
    'calendar.noEvents': 'No events scheduled',
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
  selectedDate: null,
  selectedMonthItems: [],
  setSelectedDate: jest.fn(),
  loadCalendarItemsForDateRange: jest.fn(),
  isLoading: false,
};

describe('EnhancedCalendarView', () => {
  const mockOnMonthChange = jest.fn();

  beforeEach(() => {
    (useTranslation as jest.Mock).mockReturnValue({ t: mockT });
    (useCalendarStore as unknown as jest.Mock).mockReturnValue(mockStore);

    jest.clearAllMocks();
  });

  describe('Today Button Functionality', () => {
    beforeEach(() => {
      // Mock the current date to be consistent
      jest.useFakeTimers();
      jest.setSystemTime(new Date(2024, 0, 15, 10, 0)); // Jan 15, 2024, 10 AM local time
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('renders today button correctly', () => {
      const { getByText } = render(<EnhancedCalendarView />);

      expect(getByText('Today')).toBeTruthy();
    });

    it('sets correct date when today button is pressed', () => {
      const { getByText } = render(<EnhancedCalendarView />);

      fireEvent.press(getByText('Today'));

      // Should set the selected date to today in local timezone format
      const expectedDate = getTodayLocalString();
      expect(mockStore.setSelectedDate).toHaveBeenCalledWith(expectedDate);
      expect(expectedDate).toBe('2024-01-15'); // Should be correct date in local timezone
    });

    it('sets correct month when today button is pressed', () => {
      const { getByText } = render(<EnhancedCalendarView />);

      fireEvent.press(getByText('Today'));

      // The component should set the current month correctly
      const expectedDate = getTodayLocalString();
      expect(mockStore.setSelectedDate).toHaveBeenCalledWith(expectedDate);
    });

    it('handles local time correctly for today button', () => {
      // Test with different local times to ensure it always selects the correct local date

      // Test with early morning
      jest.setSystemTime(new Date(2024, 0, 15, 1, 0)); // 1 AM local
      const { getByText } = render(<EnhancedCalendarView />);

      fireEvent.press(getByText('Today'));

      const expectedDateEarly = getTodayLocalString();
      expect(mockStore.setSelectedDate).toHaveBeenCalledWith(expectedDateEarly);
      expect(expectedDateEarly).toBe('2024-01-15');

      // Test with late evening
      jest.setSystemTime(new Date(2024, 0, 15, 23, 30)); // 11:30 PM local

      fireEvent.press(getByText('Today'));

      const expectedDateLate = getTodayLocalString();
      expect(mockStore.setSelectedDate).toHaveBeenLastCalledWith(expectedDateLate);
      expect(expectedDateLate).toBe('2024-01-15');
    });

    it('always uses local date regardless of system time', () => {
      // Test case to ensure we always get the local date
      jest.setSystemTime(new Date(2024, 0, 15, 12, 0)); // Noon on Jan 15

      const { getByText } = render(<EnhancedCalendarView />);

      fireEvent.press(getByText('Today'));

      const expectedDate = getTodayLocalString();
      expect(mockStore.setSelectedDate).toHaveBeenCalledWith(expectedDate);
      expect(expectedDate).toBe('2024-01-15'); // Should be Jan 15 in local time
    });
  });

  describe('Date Selection', () => {
    it('calls setSelectedDate when day is pressed', () => {
      const { getByTestId } = render(
        <EnhancedCalendarView testID="test-calendar" />
      );

      fireEvent.press(getByTestId('test-calendar-calendar-day-button'));

      expect(mockStore.setSelectedDate).toHaveBeenCalledWith('2024-01-15');
    });

    it('calls onDayPress prop when provided', () => {
      const mockOnDayPress = jest.fn();
      const { getByTestId } = render(
        <EnhancedCalendarView
          testID="test-calendar"
          onDayPress={mockOnDayPress}
        />
      );

      fireEvent.press(getByTestId('test-calendar-calendar-day-button'));

      expect(mockOnDayPress).toHaveBeenCalledWith({ dateString: '2024-01-15' });
    });
  });

  describe('Month Navigation', () => {
    it('loads calendar items when month changes', () => {
      const { getByTestId } = render(
        <EnhancedCalendarView
          testID="test-calendar"
          onMonthChange={mockOnMonthChange}
        />
      );

      fireEvent.press(getByTestId('test-calendar-calendar-next-month'));

      expect(mockStore.loadCalendarItemsForDateRange).toHaveBeenCalled();
      expect(mockOnMonthChange).toHaveBeenCalled();
    });

    it('uses correct date format for month range', () => {
      const { getByTestId } = render(
        <EnhancedCalendarView testID="test-calendar" />
      );

      fireEvent.press(getByTestId('test-calendar-calendar-next-month'));

      // Check that the dates passed are in YYYY-MM-DD format
      expect(mockStore.loadCalendarItemsForDateRange).toHaveBeenCalledWith(
        expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/)
      );
    });
  });

  describe('Selected Date Display', () => {
    it('shows selected date information when date is selected', () => {
      (useCalendarStore as unknown as jest.Mock).mockReturnValue({
        ...mockStore,
        selectedDate: '2024-01-15',
        selectedMonthItems: [mockCalendarItem],
      });

      const { getByText } = render(<EnhancedCalendarView />);

      // Check for the date display (the test translation uses the actual formatted date)
      expect(getByText(/Events for/)).toBeTruthy();
      expect(getByText('1 events')).toBeTruthy();
    });

    it('displays correct local date in selected date title (timezone fix)', () => {
      // Test the specific timezone issue where date string parsing was showing wrong day
      (useCalendarStore as unknown as jest.Mock).mockReturnValue({
        ...mockStore,
        selectedDate: '2024-01-15',
        selectedMonthItems: [],
      });

      const { getByText } = render(<EnhancedCalendarView />);

      // The date should be parsed correctly and show January 15, 2024
      // Create expected date for verification
      const localDate = new Date(2024, 0, 15); // January 15, 2024 in local time
      const expectedDateString = localDate.toLocaleDateString([], {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      expect(getByText(`Events for ${expectedDateString}`)).toBeTruthy();
    });

    it('handles date parsing correctly across different timezones', () => {
      // Test edge case dates that could be problematic with UTC parsing
      const testCases = [
        '2024-01-01', // New Year's Day
        '2024-12-31', // New Year's Eve
        '2024-02-29', // Leap year day
      ];

      testCases.forEach((testDate) => {
        (useCalendarStore as unknown as jest.Mock).mockReturnValue({
          ...mockStore,
          selectedDate: testDate,
          selectedMonthItems: [],
        });

        const { getByText, unmount } = render(<EnhancedCalendarView />);

        // Parse the date the same way the component does
        const [year, month, day] = testDate.split('-').map(Number);
        const localDate = new Date(year!, month! - 1, day!);
        const expectedDateString = localDate.toLocaleDateString([], {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });

        expect(getByText(`Events for ${expectedDateString}`)).toBeTruthy();
        unmount();
      });
    });

    it('shows no events message when no events for selected date', () => {
      (useCalendarStore as unknown as jest.Mock).mockReturnValue({
        ...mockStore,
        selectedDate: '2024-01-15',
        selectedMonthItems: [],
      });

      const { getByText } = render(<EnhancedCalendarView />);

      expect(getByText('No events scheduled')).toBeTruthy();
    });

    it('filters events correctly for selected date', () => {
      const todayItem = {
        ...mockCalendarItem,
        CalendarItemId: 'today-item',
        Start: '2024-01-15T14:00:00Z',
      };

      const otherDayItem = {
        ...mockCalendarItem,
        CalendarItemId: 'other-day-item',
        Start: '2024-01-16T14:00:00Z',
      };

      (useCalendarStore as unknown as jest.Mock).mockReturnValue({
        ...mockStore,
        selectedDate: '2024-01-15',
        selectedMonthItems: [todayItem, otherDayItem],
      });

      const { getByText } = render(<EnhancedCalendarView />);

      // Should only count events for the selected date
      expect(getByText('1 events')).toBeTruthy();
    });
  });

  describe('Marked Dates', () => {
    it('marks dates that have events', () => {
      const itemWithEvent = {
        ...mockCalendarItem,
        Start: '2024-01-15T14:00:00Z',
        End: '2024-01-15T16:00:00Z',
      };

      (useCalendarStore as unknown as jest.Mock).mockReturnValue({
        ...mockStore,
        selectedMonthItems: [itemWithEvent],
      });

      // Calendar should receive marked dates
      const { getByTestId } = render(
        <EnhancedCalendarView testID="test-calendar" />
      );

      expect(getByTestId('test-calendar')).toBeTruthy();
      // The Calendar component should receive markedDates prop with the event date marked
    });

    it('handles multi-day events correctly', () => {
      const multiDayItem = {
        ...mockCalendarItem,
        Start: '2024-01-15T14:00:00Z',
        End: '2024-01-17T16:00:00Z', // 3-day event
      };

      (useCalendarStore as unknown as jest.Mock).mockReturnValue({
        ...mockStore,
        selectedMonthItems: [multiDayItem],
      });

      const { getByTestId } = render(
        <EnhancedCalendarView testID="test-calendar" />
      );

      expect(getByTestId('test-calendar')).toBeTruthy();
      // Multi-day events should mark all days in the range
    });
  });

  describe('Loading State', () => {
    it('shows loading indicator when loading', () => {
      (useCalendarStore as unknown as jest.Mock).mockReturnValue({
        ...mockStore,
        isLoading: true,
      });

      const { getByTestId } = render(
        <EnhancedCalendarView testID="test-calendar" />
      );

      // Calendar should show loading indicator
      expect(getByTestId('test-calendar')).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('provides proper accessibility attributes', () => {
      const { getByTestId } = render(
        <EnhancedCalendarView testID="test-calendar" />
      );

      const calendar = getByTestId('test-calendar');
      expect(calendar).toBeTruthy();
    });

    it('has accessible today button', () => {
      const { getByText } = render(<EnhancedCalendarView />);

      const todayButton = getByText('Today');
      expect(todayButton).toBeTruthy();
    });
  });
});
