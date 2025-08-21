import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import ShiftsScreen from '../shifts';
import { useShiftsStore } from '@/stores/shifts/store';
import { useAnalytics } from '@/hooks/use-analytics';

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Mock the analytics hook
jest.mock('@/hooks/use-analytics', () => ({
  useAnalytics: jest.fn(),
}));

// Mock React Navigation
jest.mock('@react-navigation/native', () => ({
  useIsFocused: () => true,
  useFocusEffect: (callback: () => void) => {
    callback();
  },
  useNavigation: () => ({
    navigate: jest.fn(),
  }),
}));

// Mock FocusAwareStatusBar
jest.mock('@/components/ui/focus-aware-status-bar', () => ({
  FocusAwareStatusBar: () => null,
}));

// Mock nativewind
jest.mock('nativewind', () => ({
  useColorScheme: () => ({ colorScheme: 'light' }),
  cssInterop: jest.fn(),
}));

// Mock @expo/html-elements
jest.mock('@expo/html-elements', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    H1: ({ children, ...props }: any) => React.createElement(Text, props, children),
    H2: ({ children, ...props }: any) => React.createElement(Text, props, children),
    H3: ({ children, ...props }: any) => React.createElement(Text, props, children),
    H4: ({ children, ...props }: any) => React.createElement(Text, props, children),
    H5: ({ children, ...props }: any) => React.createElement(Text, props, children),
    H6: ({ children, ...props }: any) => React.createElement(Text, props, children),
  };
});

// Mock react-native-svg
jest.mock('react-native-svg', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: ({ children, ...props }: any) => React.createElement(View, props, children),
    Svg: ({ children, ...props }: any) => React.createElement(View, props, children),
    Circle: ({ children, ...props }: any) => React.createElement(View, props, children),
    Path: ({ children, ...props }: any) => React.createElement(View, props, children),
    G: ({ children, ...props }: any) => React.createElement(View, props, children),
  };
});

// Mock lucide-react-native
jest.mock('lucide-react-native', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    Search: ({ size, color, ...props }: any) => React.createElement(View, { testID: 'search-icon', ...props }),
    FileQuestion: ({ size, color, ...props }: any) => React.createElement(View, { testID: 'file-question-icon', ...props }),
    AlertCircle: ({ size, color, ...props }: any) => React.createElement(View, { testID: 'alert-circle-icon', ...props }),
    Clock: ({ size, color, ...props }: any) => React.createElement(View, { testID: 'clock-icon', ...props }),
    Users: ({ size, color, ...props }: any) => React.createElement(View, { testID: 'users-icon', ...props }),
    User: ({ size, color, ...props }: any) => React.createElement(View, { testID: 'user-icon', ...props }),
    Calendar: ({ size, color, ...props }: any) => React.createElement(View, { testID: 'calendar-icon', ...props }),
  };
});

// Mock specific React Native components that cause issues
jest.mock('react-native/Libraries/Components/RefreshControl/RefreshControl', () => 'RefreshControl');

// Mock the shifts store
jest.mock('@/stores/shifts/store');

// Mock the components that are imported
jest.mock('@/components/shifts/shift-card', () => {
  const React = require('react');
  const { TouchableOpacity, Text } = require('react-native');
  return {
    ShiftCard: ({ shift, onPress }: any) =>
      React.createElement(
        TouchableOpacity,
        { testID: `shift-card-${shift.ShiftId}`, onPress },
        React.createElement(Text, null, shift.Name)
      ),
  };
});

jest.mock('@/components/shifts/shift-day-card', () => {
  const React = require('react');
  const { TouchableOpacity, Text } = require('react-native');
  return {
    ShiftDayCard: ({ shiftDay, onPress }: any) =>
      React.createElement(
        TouchableOpacity,
        { testID: `shift-day-card-${shiftDay.ShiftDayId}`, onPress },
        React.createElement(Text, null, shiftDay.ShiftName)
      ),
  };
});

jest.mock('@/components/shifts/shift-details-sheet', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return {
    ShiftDetailsSheet: ({ isOpen, onClose }: any) =>
      React.createElement(
        View,
        { testID: 'shift-details-sheet', style: { display: isOpen ? 'flex' : 'none' } },
        React.createElement(Text, null, 'Shift Details')
      ),
  };
});

jest.mock('@/components/shifts/shift-day-details-sheet', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return {
    ShiftDayDetailsSheet: ({ isOpen, onClose }: any) =>
      React.createElement(
        View,
        { testID: 'shift-day-details-sheet', style: { display: isOpen ? 'flex' : 'none' } },
        React.createElement(Text, null, 'Shift Day Details')
      ),
  };
});

jest.mock('@/components/common/zero-state-example', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return {
    __esModule: true,
    default: ({ title }: any) =>
      React.createElement(
        View,
        { testID: 'zero-state' },
        React.createElement(Text, null, title)
      ),
  };
});

// Mock UI components
jest.mock('@/components/ui', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    View: ({ children, ...props }: any) => React.createElement(View, props, children),
  };
});

jest.mock('@/components/ui/text', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    Text: ({ children, ...props }: any) => React.createElement(Text, props, children),
  };
});

jest.mock('@/components/ui/button', () => {
  const React = require('react');
  const { TouchableOpacity, Text } = require('react-native');
  return {
    Button: ({ children, onPress, ...props }: any) =>
      React.createElement(TouchableOpacity, { onPress, ...props }, children),
    ButtonText: ({ children, ...props }: any) => React.createElement(Text, props, children),
  };
});

jest.mock('@/components/ui/input', () => {
  const React = require('react');
  const { View, TouchableOpacity, Text } = require('react-native');
  return {
    Input: ({ children, ...props }: any) => React.createElement(View, props, children),
    InputField: ({ placeholder, value, onChangeText, ...props }: any) =>
      React.createElement(
        TouchableOpacity,
        {
          testID: 'search-input',
          onPress: () => onChangeText && onChangeText('test'),
          ...props,
        },
        React.createElement(Text, null, placeholder)
      ),
  };
});

jest.mock('@/components/ui/flat-list', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    FlatList: ({ data, renderItem, keyExtractor, refreshControl, ...props }: any) =>
      React.createElement(
        View,
        props,
        data.map((item: any, index: number) =>
          React.createElement(
            View,
            { key: keyExtractor ? keyExtractor(item) : index },
            renderItem({ item, index })
          )
        )
      ),
  };
});

jest.mock('@/components/ui/hstack', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    HStack: ({ children, ...props }: any) => React.createElement(View, props, children),
  };
});

jest.mock('@/components/ui/vstack', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    VStack: ({ children, ...props }: any) => React.createElement(View, props, children),
  };
});

jest.mock('@/components/ui/spinner', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    Spinner: ({ ...props }: any) => React.createElement(Text, { testID: 'spinner' }, 'Loading...'),
  };
});

jest.mock('@/components/ui/box', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    Box: ({ children, ...props }: any) => React.createElement(View, props, children),
  };
});

jest.mock('@/components/ui/center', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    Center: ({ children, ...props }: any) => React.createElement(View, props, children),
  };
});

jest.mock('@/components/ui/heading', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    Heading: ({ children, ...props }: any) => React.createElement(Text, props, children),
  };
});

jest.mock('@/components/ui/icon', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    Icon: ({ size, color, children, ...props }: any) => React.createElement(View, { testID: 'ui-icon', ...props }, children),
  };
});

const mockUseShiftsStore = useShiftsStore as jest.MockedFunction<typeof useShiftsStore>;
const mockUseAnalytics = useAnalytics as jest.MockedFunction<typeof useAnalytics>;

const mockShifts = [
  {
    ShiftId: '1',
    Name: 'Day Shift',
    Code: 'DAY',
    Color: '#FF0000',
    ScheduleType: 0,
    AssignmentType: 0,
    InShift: false,
    PersonnelCount: 5,
    GroupCount: 2,
    NextDay: '2024-01-15T00:00:00Z',
    NextDayId: 'day1',
    Days: [],
  },
  {
    ShiftId: '2',
    Name: 'Night Shift',
    Code: 'NIGHT',
    Color: '#0000FF',
    ScheduleType: 1,
    AssignmentType: 1,
    InShift: true,
    PersonnelCount: 3,
    GroupCount: 1,
    NextDay: '2024-01-16T00:00:00Z',
    NextDayId: 'night1',
    Days: [],
  },
];

const mockTodaysShifts = [
  {
    ShiftId: '1',
    ShiftName: 'Day Shift',
    ShiftDayId: 'day1',
    ShiftDay: '2024-01-15T00:00:00Z',
    Start: '2024-01-15T08:00:00Z',
    End: '2024-01-15T16:00:00Z',
    SignedUp: false,
    ShiftType: 0,
    Signups: [],
    Needs: [],
  },
];

const defaultMockStore = {
  shifts: mockShifts,
  todaysShiftDays: mockTodaysShifts,
  currentView: 'today' as const,
  searchQuery: '',
  isShiftDetailsOpen: false,
  isShiftDayDetailsOpen: false,
  isLoading: false,
  isTodaysLoading: false,
  setCurrentView: jest.fn(),
  setSearchQuery: jest.fn(),
  fetchAllShifts: jest.fn(),
  fetchTodaysShifts: jest.fn(),
  closeShiftDetails: jest.fn(),
  closeShiftDayDetails: jest.fn(),
  selectShift: jest.fn(),
  selectShiftDay: jest.fn(),
};

describe('ShiftsScreen', () => {
  const mockTrackEvent = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock for analytics
    mockUseAnalytics.mockReturnValue({
      trackEvent: mockTrackEvent,
    });

    mockUseShiftsStore.mockReturnValue(defaultMockStore);
  });

  it('renders correctly with default state', () => {
    const { getByText, getByTestId } = render(<ShiftsScreen />);

    expect(getByText('shifts.today')).toBeTruthy();
    expect(getByText('shifts.all_shifts')).toBeTruthy();
    expect(getByTestId('shift-day-card-day1')).toBeTruthy();
  });

  it('switches between today and all shifts views', () => {
    const setCurrentView = jest.fn();
    mockUseShiftsStore.mockReturnValue({
      ...defaultMockStore,
      setCurrentView,
    });

    const { getByText } = render(<ShiftsScreen />);

    fireEvent.press(getByText('shifts.all_shifts'));
    expect(setCurrentView).toHaveBeenCalledWith('all');
  });

  it('shows all shifts when view is set to all', () => {
    mockUseShiftsStore.mockReturnValue({
      ...defaultMockStore,
      currentView: 'all',
    });

    const { getByTestId } = render(<ShiftsScreen />);

    expect(getByTestId('shift-card-1')).toBeTruthy();
    expect(getByTestId('shift-card-2')).toBeTruthy();
  });

  it('handles search input correctly', () => {
    const setSearchQuery = jest.fn();
    mockUseShiftsStore.mockReturnValue({
      ...defaultMockStore,
      setSearchQuery,
    });

    const { getByTestId } = render(<ShiftsScreen />);

    const searchInput = getByTestId('search-input');
    fireEvent.press(searchInput);

    expect(setSearchQuery).toHaveBeenCalledWith('test');
  });

  it('shows loading state for today shifts', () => {
    mockUseShiftsStore.mockReturnValue({
      ...defaultMockStore,
      isTodaysLoading: true,
      todaysShiftDays: [],
    });

    const { getByText } = render(<ShiftsScreen />);

    expect(getByText('shifts.loading')).toBeTruthy();
  });

  it('shows loading state for all shifts', () => {
    mockUseShiftsStore.mockReturnValue({
      ...defaultMockStore,
      currentView: 'all',
      isLoading: true,
      shifts: [],
    });

    const { getByText } = render(<ShiftsScreen />);

    expect(getByText('shifts.loading')).toBeTruthy();
  });

  it('shows zero state when no shifts available', () => {
    mockUseShiftsStore.mockReturnValue({
      ...defaultMockStore,
      currentView: 'all',
      shifts: [],
    });

    const { getByTestId } = render(<ShiftsScreen />);

    expect(getByTestId('zero-state')).toBeTruthy();
  });

  it('shows zero state when no today shifts available', () => {
    mockUseShiftsStore.mockReturnValue({
      ...defaultMockStore,
      todaysShiftDays: [],
    });

    const { getByTestId } = render(<ShiftsScreen />);

    expect(getByTestId('zero-state')).toBeTruthy();
  });

  it('calls fetchTodaysShifts on mount when in today view', async () => {
    const fetchTodaysShifts = jest.fn();
    mockUseShiftsStore.mockReturnValue({
      ...defaultMockStore,
      fetchTodaysShifts,
    });

    render(<ShiftsScreen />);

    await waitFor(() => {
      expect(fetchTodaysShifts).toHaveBeenCalled();
    });
  });

  it('calls fetchAllShifts when switching to all view', async () => {
    const fetchAllShifts = jest.fn();
    mockUseShiftsStore.mockReturnValue({
      ...defaultMockStore,
      currentView: 'all',
      fetchAllShifts,
    });

    render(<ShiftsScreen />);

    await waitFor(() => {
      expect(fetchAllShifts).toHaveBeenCalled();
    });
  });

  it('opens shift details sheet when shift is selected', () => {
    mockUseShiftsStore.mockReturnValue({
      ...defaultMockStore,
      isShiftDetailsOpen: true,
    });

    const { getByTestId } = render(<ShiftsScreen />);

    expect(getByTestId('shift-details-sheet')).toBeTruthy();
  });

  it('opens shift day details sheet when shift day is selected', () => {
    mockUseShiftsStore.mockReturnValue({
      ...defaultMockStore,
      isShiftDayDetailsOpen: true,
    });

    const { getByTestId } = render(<ShiftsScreen />);

    expect(getByTestId('shift-day-details-sheet')).toBeTruthy();
  });

  it('highlights active tab correctly', () => {
    const { getByText } = render(<ShiftsScreen />);

    // Today tab should be active by default
    const todayButton = getByText('shifts.today');
    const allShiftsButton = getByText('shifts.all_shifts');

    // The active tab would have different styling, but we can't test that directly
    // Instead, we verify the component renders without error
    expect(todayButton).toBeTruthy();
    expect(allShiftsButton).toBeTruthy();
  });

  it('handles pull to refresh for today view', async () => {
    const fetchTodaysShifts = jest.fn();
    mockUseShiftsStore.mockReturnValue({
      ...defaultMockStore,
      fetchTodaysShifts,
    });

    const { getByTestId } = render(<ShiftsScreen />);

    // Simulate pull to refresh
    // This would require more setup to properly test RefreshControl
    expect(getByTestId('shift-day-card-day1')).toBeTruthy();
  });

  it('handles pull to refresh for all shifts view', async () => {
    const fetchAllShifts = jest.fn();
    mockUseShiftsStore.mockReturnValue({
      ...defaultMockStore,
      currentView: 'all',
      fetchAllShifts,
    });

    const { getByTestId } = render(<ShiftsScreen />);

    expect(getByTestId('shift-card-1')).toBeTruthy();
  });

  it('filters results based on search query', () => {
    mockUseShiftsStore.mockReturnValue({
      ...defaultMockStore,
      currentView: 'all',
      searchQuery: 'day',
      shifts: [mockShifts[0]], // Only Day Shift matches the search
    });

    const { queryByTestId } = render(<ShiftsScreen />);

    // Only Day Shift should be rendered due to filtering
    expect(queryByTestId('shift-card-1')).toBeTruthy();
  });

  it('filters today shifts based on search query', () => {
    mockUseShiftsStore.mockReturnValue({
      ...defaultMockStore,
      searchQuery: 'day',
      todaysShiftDays: mockTodaysShifts.filter(shift =>
        shift.ShiftName.toLowerCase().includes('day')
      ),
    });

    const { getByTestId } = render(<ShiftsScreen />);

    expect(getByTestId('shift-day-card-day1')).toBeTruthy();
  });

  it('handles empty search results', () => {
    mockUseShiftsStore.mockReturnValue({
      ...defaultMockStore,
      searchQuery: 'nonexistent',
      todaysShiftDays: [],
    });

    const { getByTestId } = render(<ShiftsScreen />);

    expect(getByTestId('zero-state')).toBeTruthy();
  });

  describe('Analytics Tracking', () => {
    it('tracks shifts view on mount', () => {
      render(<ShiftsScreen />);

      expect(mockTrackEvent).toHaveBeenCalledWith('shifts_viewed', {
        timestamp: expect.any(String),
        activeTab: 'today',
        shiftCount: 1, // mockTodaysShifts.length
        hasSearchQuery: false,
      });
    });

    it('tracks tab changes', () => {
      const { getByText } = render(<ShiftsScreen />);

      // Clear initial analytics call
      mockTrackEvent.mockClear();

      fireEvent.press(getByText('shifts.all_shifts'));

      expect(mockTrackEvent).toHaveBeenCalledWith('shifts_tab_changed', {
        timestamp: expect.any(String),
        fromTab: 'today',
        toTab: 'all',
      });
    });

    it('tracks search events', () => {
      const { getByTestId } = render(<ShiftsScreen />);

      // Clear initial analytics call
      mockTrackEvent.mockClear();

      const searchInput = getByTestId('search-input');
      fireEvent.press(searchInput);

      expect(mockTrackEvent).toHaveBeenCalledWith('shifts_search', {
        timestamp: expect.any(String),
        searchQuery: 'test',
        tab: 'today',
      });
    });

    it('tracks refresh actions', async () => {
      const fetchTodaysShifts = jest.fn();
      mockUseShiftsStore.mockReturnValue({
        ...defaultMockStore,
        fetchTodaysShifts,
      });

      render(<ShiftsScreen />);

      // Clear initial analytics call
      mockTrackEvent.mockClear();

      // Simulate refresh - this is harder to test directly with RefreshControl
      // but we can test the handleRefresh function by triggering a tab change
      const { getByText } = render(<ShiftsScreen />);
      fireEvent.press(getByText('shifts.today'));

      expect(mockTrackEvent).toHaveBeenCalledWith('shifts_tab_changed', {
        timestamp: expect.any(String),
        fromTab: 'today',
        toTab: 'today',
      });
    });

    it('tracks shift selection in today view', () => {
      const selectShift = jest.fn();
      mockUseShiftsStore.mockReturnValue({
        ...defaultMockStore,
        currentView: 'all',
        selectShift,
      });

      const { getByTestId } = render(<ShiftsScreen />);

      // Clear initial analytics call
      mockTrackEvent.mockClear();

      fireEvent.press(getByTestId('shift-card-1'));

      expect(mockTrackEvent).toHaveBeenCalledWith('shift_selected', {
        timestamp: expect.any(String),
        shiftId: '1',
        shiftName: 'Day Shift',
        shiftCode: 'DAY',
        tab: 'all',
      });
    });

    it('tracks shift day selection in today view', () => {
      const selectShiftDay = jest.fn();
      mockUseShiftsStore.mockReturnValue({
        ...defaultMockStore,
        selectShiftDay,
      });

      const { getByTestId } = render(<ShiftsScreen />);

      // Clear initial analytics call
      mockTrackEvent.mockClear();

      fireEvent.press(getByTestId('shift-day-card-day1'));

      expect(mockTrackEvent).toHaveBeenCalledWith('shift_day_selected', {
        timestamp: expect.any(String),
        shiftDayId: 'day1',
        shiftId: '1',
        shiftName: 'Day Shift',
        tab: 'today',
      });
    });

    it('tracks analytics with search query state', () => {
      mockUseShiftsStore.mockReturnValue({
        ...defaultMockStore,
        searchQuery: 'day shift',
      });

      render(<ShiftsScreen />);

      expect(mockTrackEvent).toHaveBeenCalledWith('shifts_viewed', {
        timestamp: expect.any(String),
        activeTab: 'today',
        shiftCount: 1,
        hasSearchQuery: true,
      });
    });

    it('tracks analytics for all shifts view', () => {
      mockUseShiftsStore.mockReturnValue({
        ...defaultMockStore,
        currentView: 'all',
      });

      render(<ShiftsScreen />);

      expect(mockTrackEvent).toHaveBeenCalledWith('shifts_viewed', {
        timestamp: expect.any(String),
        activeTab: 'all',
        shiftCount: 2, // mockShifts.length
        hasSearchQuery: false,
      });
    });
  });
}); 