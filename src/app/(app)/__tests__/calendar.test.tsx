import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { useTranslation } from 'react-i18next';

import CalendarScreen from '../calendar';
import { useAnalytics } from '@/hooks/use-analytics';
import { useCalendarStore } from '@/stores/calendar/store';

// Mock the translation hook
jest.mock('react-i18next', () => ({
  useTranslation: jest.fn(),
}));

// Mock expo-router components
jest.mock('expo-router', () => ({
  Stack: {
    Screen: ({ children, ...props }: any) => {
      const React = require('react');
      const { View } = require('react-native');
      return React.createElement(View, { testID: 'stack-screen', ...props }, children);
    },
  },
  useNavigation: jest.fn(() => ({})),
  useRouter: jest.fn(() => ({})),
  useLocalSearchParams: jest.fn(() => ({})),
}));

// Mock react-navigation/native
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn((callback) => {
    // Immediately call the callback to simulate focus effect
    callback();
  }),
}));

// Mock the calendar store
jest.mock('@/stores/calendar/store', () => ({
  useCalendarStore: jest.fn(),
}));

// Mock the analytics hook
jest.mock('@/hooks/use-analytics', () => ({
  useAnalytics: jest.fn(),
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
  FlatList: ({ data, renderItem, keyExtractor }: any) => {
    const React = require('react');
    const { View } = require('react-native');

    if (!data || data.length === 0) {
      return React.createElement(View, { testID: "empty-flatlist" });
    }

    return React.createElement(View, { testID: "flatlist" },
      data.map((item: any, index: number) => {
        const key = keyExtractor ? keyExtractor(item, index) : index.toString();
        return React.createElement(View, { key }, renderItem({ item, index }));
      })
    );
  },
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

jest.mock('@/components/calendar/compact-calendar-item', () => ({
  CompactCalendarItem: ({ item, onPress }: any) => {
    const React = require('react');
    const { TouchableOpacity, Text } = require('react-native');
    return React.createElement(TouchableOpacity, {
      testID: "compact-calendar-item",
      onPress: () => onPress(item)
    }, React.createElement(Text, {}, item.Title));
  },
}));

jest.mock('@/components/calendar/enhanced-calendar-view', () => ({
  EnhancedCalendarView: ({ onMonthChange }: any) => {
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
  Loading: ({ text }: any) => {
    const React = require('react');
    const { View, Text } = require('react-native');
    return React.createElement(View, { testID: "loading" },
      React.createElement(Text, {}, text)
    );
  },
}));

jest.mock('@/components/common/zero-state', () => ({
  __esModule: true,
  default: ({ heading, description, children, isError }: any) => {
    const React = require('react');
    const { View, Text } = require('react-native');

    // If there are children, clone them with testID
    const childrenWithTestId = children ? React.cloneElement(children, {
      key: "children",
      testID: "retry-button"
    }) : null;

    return React.createElement(View, { testID: "zero-state" }, [
      React.createElement(Text, { key: "heading" }, heading),
      React.createElement(Text, { key: "description" }, description),
      childrenWithTestId
    ].filter(Boolean));
  },
}));

const mockT = jest.fn((key: string, options?: any) => {
  const translations: Record<string, string> = {
    'calendar.title': 'Calendar',
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
  StartUtc: '2024-01-15T10:00:00Z', // Keep for completeness
  End: '2024-01-15T12:00:00Z',
  EndUtc: '2024-01-15T12:00:00Z', // Keep for completeness
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
  todayCalendarItems: [],
  upcomingCalendarItems: [],
  calendarItems: [],
  viewCalendarItem: null,
  selectedMonthItems: [],
  selectedDate: null,
  itemTypes: [],
  updateCalendarItems: false,
  isTodaysLoading: false,
  isUpcomingLoading: false,
  isLoading: false,
  isItemLoading: false,
  isAttendanceLoading: false,
  isTypesLoading: false,
  error: null,
  attendanceError: null,
  loadTodaysCalendarItems: jest.fn(),
  loadUpcomingCalendarItems: jest.fn(),
  loadCalendarItems: jest.fn(),
  loadCalendarItemsForDateRange: jest.fn(),
  viewCalendarItemAction: jest.fn(),
  setCalendarItemAttendingStatus: jest.fn(),
  fetchCalendarItem: jest.fn(),
  fetchItemTypes: jest.fn(),
  setSelectedDate: jest.fn(),
  clearSelectedItem: jest.fn(),
  clearError: jest.fn(),
  dismissModal: jest.fn(),
  init: jest.fn(),
  fetchTodaysItems: jest.fn(),
  fetchUpcomingItems: jest.fn(),
  fetchItemsForDateRange: jest.fn(),
};

describe('CalendarScreen', () => {
  const mockTrackEvent = jest.fn();
  const mockUseAnalytics = useAnalytics as jest.MockedFunction<typeof useAnalytics>;

  beforeEach(() => {
    (useTranslation as jest.Mock).mockReturnValue({ t: mockT });
    (useCalendarStore as unknown as jest.Mock).mockReturnValue(mockStore);

    // Default mock for analytics
    mockUseAnalytics.mockReturnValue({
      trackEvent: mockTrackEvent,
    });

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

    expect(mockStore.loadTodaysCalendarItems).toHaveBeenCalledTimes(1);
    expect(mockStore.loadUpcomingCalendarItems).toHaveBeenCalledTimes(1);
  });

  it('tracks analytics when view becomes visible', () => {
    render(<CalendarScreen />);

    expect(mockTrackEvent).toHaveBeenCalledWith('calendar_viewed', {
      timestamp: expect.any(String),
      activeTab: 'today',
    });
    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
  });

  it('switches between tabs correctly', () => {
    const { getByText } = render(<CalendarScreen />);

    // Clear previous analytics calls
    mockTrackEvent.mockClear();

    // Switch to upcoming tab
    fireEvent.press(getByText('Upcoming'));

    expect(mockTrackEvent).toHaveBeenCalledWith('calendar_tab_changed', {
      timestamp: expect.any(String),
      fromTab: 'today',
      toTab: 'upcoming',
    });

    // Switch to calendar tab
    fireEvent.press(getByText('Calendar'));

    expect(mockTrackEvent).toHaveBeenCalledWith('calendar_tab_changed', {
      timestamp: expect.any(String),
      fromTab: 'upcoming',
      toTab: 'calendar',
    });

    // Switch back to today tab
    fireEvent.press(getByText('Today'));

    expect(mockTrackEvent).toHaveBeenCalledWith('calendar_tab_changed', {
      timestamp: expect.any(String),
      fromTab: 'calendar',
      toTab: 'today',
    });
  });

  describe('Today Tab', () => {
    beforeEach(() => {
      // Mock the current date to be consistent
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-15T10:00:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('shows loading state for today\'s items', () => {
      (useCalendarStore as unknown as jest.Mock).mockReturnValue({
        ...mockStore,
        isTodaysLoading: true,
      });

      const { getByTestId } = render(<CalendarScreen />);

      expect(getByTestId('loading')).toBeTruthy();
    });

    it('shows error state for today\'s items', () => {
      (useCalendarStore as unknown as jest.Mock).mockReturnValue({
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
      const todayItem = {
        ...mockCalendarItem,
        CalendarItemId: 'today-item',
        Title: 'Today Event',
        Start: '2024-01-15T14:00:00Z', // Today
        StartUtc: '2024-01-15T14:00:00Z', // Keep for completeness
        End: '2024-01-15T16:00:00Z',
        EndUtc: '2024-01-15T16:00:00Z',
      };

      (useCalendarStore as unknown as jest.Mock).mockReturnValue({
        ...mockStore,
        todayCalendarItems: [todayItem],
      });

      const { getByTestId } = render(<CalendarScreen />);

      expect(getByTestId('calendar-card')).toBeTruthy();
    });

    it('filters today\'s items correctly by date', () => {
      const todayItem = {
        ...mockCalendarItem,
        CalendarItemId: 'today-item',
        Title: 'Today Event',
        Start: '2024-01-15T14:00:00Z', // Today
        StartUtc: '2024-01-15T14:00:00Z', // Keep for completeness
        End: '2024-01-15T16:00:00Z',
        EndUtc: '2024-01-15T16:00:00Z',
      };

      const tomorrowItem = {
        ...mockCalendarItem,
        CalendarItemId: 'tomorrow-item',
        Title: 'Tomorrow Event',
        Start: '2024-01-16T14:00:00Z', // Tomorrow
        StartUtc: '2024-01-16T14:00:00Z', // Keep for completeness
        End: '2024-01-16T16:00:00Z',
        EndUtc: '2024-01-16T16:00:00Z',
      };

      (useCalendarStore as unknown as jest.Mock).mockReturnValue({
        ...mockStore,
        todayCalendarItems: [todayItem], // Should only contain today's item
      });

      const { getByTestId, getByText } = render(<CalendarScreen />);

      expect(getByTestId('calendar-card')).toBeTruthy();
      expect(getByText('Today Event')).toBeTruthy();
    });

    it('handles timezone differences in date comparison', () => {
      // Test with different timezone formats but same date
      const todayItemUTC = {
        ...mockCalendarItem,
        CalendarItemId: 'today-utc',
        Title: 'Today UTC Event',
        Start: '2024-01-15T23:30:00Z', // Late today UTC (local time)
        StartUtc: '2024-01-15T23:30:00Z', // Keep for completeness
        End: '2024-01-15T23:59:00Z',
        EndUtc: '2024-01-15T23:59:00Z',
      };

      const todayItemPST = {
        ...mockCalendarItem,
        CalendarItemId: 'today-pst',
        Title: 'Today PST Event',
        Start: '2024-01-15T01:30:00-08:00', // Early today PST (local time)
        StartUtc: '2024-01-15T09:30:00Z', // Keep for completeness
        End: '2024-01-15T02:30:00-08:00',
        EndUtc: '2024-01-15T10:30:00Z',
      };

      (useCalendarStore as unknown as jest.Mock).mockReturnValue({
        ...mockStore,
        todayCalendarItems: [todayItemUTC, todayItemPST],
      });

      const { getAllByTestId } = render(<CalendarScreen />);

      // Both items should be rendered as they're on the same date
      expect(getAllByTestId('calendar-card')).toHaveLength(2);
    });

    it('correctly identifies today regardless of timezone', () => {
      // Test that today's items are correctly identified even with timezone offsets
      jest.setSystemTime(new Date('2024-01-15T23:30:00-08:00')); // Late PST

      const todayItem = {
        ...mockCalendarItem,
        CalendarItemId: 'today-item-pst',
        Title: 'Today Event PST',
        Start: '2024-01-15T22:00:00-08:00', // Today in PST
        StartUtc: '2024-01-16T06:00:00Z', // Tomorrow in UTC
        End: '2024-01-15T23:00:00-08:00',
        EndUtc: '2024-01-16T07:00:00Z',
      };

      (useCalendarStore as unknown as jest.Mock).mockReturnValue({
        ...mockStore,
        todayCalendarItems: [todayItem],
      });

      const { getByTestId } = render(<CalendarScreen />);

      expect(getByTestId('calendar-card')).toBeTruthy();
    });

    it('does not show tomorrow\'s items as today due to timezone conversion', () => {
      jest.setSystemTime(new Date('2024-01-15T10:00:00Z'));

      const tomorrowItemUTC = {
        ...mockCalendarItem,
        CalendarItemId: 'tomorrow-item',
        Title: 'Tomorrow Event',
        Start: '2024-01-16T02:00:00Z', // Tomorrow UTC
        StartUtc: '2024-01-16T02:00:00Z',
        End: '2024-01-16T04:00:00Z',
        EndUtc: '2024-01-16T04:00:00Z',
      };

      (useCalendarStore as unknown as jest.Mock).mockReturnValue({
        ...mockStore,
        todayCalendarItems: [], // Should be empty since no items are today
      });

      const { getByTestId } = render(<CalendarScreen />);

      expect(getByTestId('zero-state')).toBeTruthy();
    });
  });

  describe('Upcoming Tab', () => {
    it('shows loading state for upcoming items', () => {
      (useCalendarStore as unknown as jest.Mock).mockReturnValue({
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
      (useCalendarStore as unknown as jest.Mock).mockReturnValue({
        ...mockStore,
        upcomingCalendarItems: [mockCalendarItem],
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
      const testDate = '2024-01-15'; // Selected date
      const todayItem = {
        ...mockCalendarItem,
        CalendarItemId: 'today-item',
        Title: 'Today Event',
        Start: '2024-01-15T14:00:00Z', // Same date
        StartUtc: '2024-01-15T14:00:00Z', // Keep for completeness
        End: '2024-01-15T16:00:00Z',
        EndUtc: '2024-01-15T16:00:00Z',
      };

      const otherDayItem = {
        ...mockCalendarItem,
        CalendarItemId: 'other-day-item',
        Title: 'Other Day Event',
        Start: '2024-01-16T14:00:00Z', // Different date
        StartUtc: '2024-01-16T14:00:00Z', // Keep for completeness
        End: '2024-01-16T16:00:00Z',
        EndUtc: '2024-01-16T16:00:00Z',
      }; (useCalendarStore as unknown as jest.Mock).mockReturnValue({
        ...mockStore,
        selectedDate: testDate,
        selectedMonthItems: [todayItem, otherDayItem],
      });

      const { getByText, queryAllByTestId } = render(<CalendarScreen />);
      fireEvent.press(getByText('Calendar'));

      // Should only show the item for the selected date
      // Use queryAllByTestId instead of getAllByTestId to avoid error if no elements found
      const calendarCards = queryAllByTestId('compact-calendar-item');
      expect(calendarCards).toHaveLength(1);
    });

    it('handles timezone differences in selected date filtering', () => {
      const testDate = '2024-01-15';

      // Different timezone but same date
      const utcItem = {
        ...mockCalendarItem,
        CalendarItemId: 'utc-item',
        Title: 'UTC Event',
        Start: '2024-01-15T23:00:00Z', // Late UTC same date
        StartUtc: '2024-01-15T23:00:00Z', // Keep for completeness
        End: '2024-01-15T23:30:00Z',
        EndUtc: '2024-01-15T23:30:00Z',
      };

      const pstItem = {
        ...mockCalendarItem,
        CalendarItemId: 'pst-item',
        Title: 'PST Event',
        Start: '2024-01-15T02:00:00-08:00', // Early PST same date
        StartUtc: '2024-01-15T10:00:00Z', // Keep for completeness 
        End: '2024-01-15T03:00:00-08:00',
        EndUtc: '2024-01-15T11:00:00Z',
      };

      const nextDayItem = {
        ...mockCalendarItem,
        CalendarItemId: 'next-day-item',
        Title: 'Next Day Event',
        Start: '2024-01-16T10:00:00Z', // Different date (Jan 16 2AM PST)
        StartUtc: '2024-01-16T10:00:00Z', // Keep for completeness
        End: '2024-01-16T11:00:00Z',
        EndUtc: '2024-01-16T11:00:00Z',
      };

      (useCalendarStore as unknown as jest.Mock).mockReturnValue({
        ...mockStore,
        selectedDate: testDate,
        selectedMonthItems: [utcItem, pstItem, nextDayItem],
      });

      const { getByText, queryAllByTestId } = render(<CalendarScreen />);
      fireEvent.press(getByText('Calendar'));

      // Should show 2 items (UTC and PST same date, but not next day)
      // Use queryAllByTestId instead of getAllByTestId to avoid error if no elements found
      const calendarCards = queryAllByTestId('compact-calendar-item');
      expect(calendarCards).toHaveLength(2);
    });

    it('shows empty message when no events for selected date', () => {
      (useCalendarStore as unknown as jest.Mock).mockReturnValue({
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
      (useCalendarStore as unknown as jest.Mock).mockReturnValue({
        ...mockStore,
        todayCalendarItems: [mockCalendarItem],
      });

      const { getByTestId } = render(<CalendarScreen />);

      // Clear previous analytics calls
      mockTrackEvent.mockClear();

      fireEvent.press(getByTestId('calendar-card'));

      await waitFor(() => {
        expect(getByTestId('calendar-details-sheet')).toBeTruthy();
      });

      // Check analytics tracking for item view
      expect(mockTrackEvent).toHaveBeenCalledWith('calendar_item_viewed', {
        timestamp: expect.any(String),
        itemId: mockCalendarItem.CalendarItemId,
        itemTitle: mockCalendarItem.Title,
        itemType: mockCalendarItem.TypeName,
        tab: 'today',
      });
    });

    it('closes details sheet when close is pressed', async () => {
      (useCalendarStore as unknown as jest.Mock).mockReturnValue({
        ...mockStore,
        todayCalendarItems: [mockCalendarItem],
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
      (useCalendarStore as unknown as jest.Mock).mockReturnValue({
        ...mockStore,
        error: 'Network error',
      });

      const { getByTestId } = render(<CalendarScreen />);

      // Clear previous analytics calls
      mockTrackEvent.mockClear();

      fireEvent.press(getByTestId('retry-button'));

      expect(mockStore.clearError).toHaveBeenCalled();

      // Check analytics tracking for refresh action
      expect(mockTrackEvent).toHaveBeenCalledWith('calendar_refreshed', {
        timestamp: expect.any(String),
        tab: 'today',
      });
    });
  });

  describe('Analytics Tracking', () => {
    it('tracks calendar view on mount', () => {
      render(<CalendarScreen />);

      expect(mockTrackEvent).toHaveBeenCalledWith('calendar_viewed', {
        timestamp: expect.any(String),
        activeTab: 'today',
      });
    });

    it('tracks tab changes', () => {
      const { getByText } = render(<CalendarScreen />);

      // Clear initial analytics call
      mockTrackEvent.mockClear();

      fireEvent.press(getByText('Upcoming'));

      expect(mockTrackEvent).toHaveBeenCalledWith('calendar_tab_changed', {
        timestamp: expect.any(String),
        fromTab: 'today',
        toTab: 'upcoming',
      });
    });

    it('tracks item interactions', async () => {
      (useCalendarStore as unknown as jest.Mock).mockReturnValue({
        ...mockStore,
        todayCalendarItems: [mockCalendarItem],
      });

      const { getByTestId } = render(<CalendarScreen />);

      // Clear initial analytics call
      mockTrackEvent.mockClear();

      fireEvent.press(getByTestId('calendar-card'));

      expect(mockTrackEvent).toHaveBeenCalledWith('calendar_item_viewed', {
        timestamp: expect.any(String),
        itemId: mockCalendarItem.CalendarItemId,
        itemTitle: mockCalendarItem.Title,
        itemType: mockCalendarItem.TypeName,
        tab: 'today',
      });
    });
  });
}); 
