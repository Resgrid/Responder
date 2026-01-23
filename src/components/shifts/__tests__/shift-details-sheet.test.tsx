import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { ScrollView } from 'react-native';
import { ShiftDetailsSheet } from '../shift-details-sheet';
import { useShiftsStore } from '@/stores/shifts/store';
import { type ShiftResultData } from '@/models/v4/shifts/shiftResultData';

// Mock analytics hook
const mockTrackEvent = jest.fn();
jest.mock('@/hooks/use-analytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
  }),
}));

// Mock react-native hooks - use the global mock from jest-setup.ts
// Get reference to the mocked useWindowDimensions from react-native
const mockReactNative = jest.requireMock('react-native');
const mockUseWindowDimensions = mockReactNative.useWindowDimensions;

// Mock nativewind
jest.mock('nativewind', () => ({
  useColorScheme: jest.fn(() => ({
    colorScheme: 'light',
    setColorScheme: jest.fn(),
  })),
}));

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'shifts.details': 'Shift Details',
        'shifts.shift_code': 'Shift Code',
        'shifts.in_shift': 'In Shift',
        'shifts.personnel_count': 'Personnel',
        'shifts.groups': 'Groups',
        'shifts.next_day': 'Next Day',
        'shifts.shift_type': 'Shift Type',
        'shifts.calendar': 'Calendar',
        'shifts.loading': 'Loading...',
        'shifts.no_shifts': 'No shifts available',
        'shifts.upcoming_shift_days': 'Upcoming Shift Days',
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
    if (formatStr === 'yyyy-MM-dd') {
      return '2024-01-15';
    }
    return date;
  }),
  parseISO: jest.fn((dateStr) => {
    // Simulate invalid date parsing by throwing an error for invalid dates
    if (dateStr === 'invalid-date') {
      throw new Error('Invalid date string');
    }
    return new Date(dateStr);
  }),
  startOfMonth: jest.fn(() => new Date('2024-01-01')),
  endOfMonth: jest.fn(() => new Date('2024-01-31')),
  startOfDay: jest.fn((date) => {
    // Return the date as-is for filtering comparison (future dates will pass the filter)
    if (date instanceof Date) {
      return new Date(date.getFullYear(), date.getMonth(), date.getDate());
    }
    return new Date();
  }),
}));

// Mock lucide-react-native
jest.mock('lucide-react-native', () => ({
  Clock: ({ size, className, ...props }: any) => 'Clock-Icon',
  Users: ({ size, className, ...props }: any) => 'Users-Icon',
  Calendar: ({ size, className, ...props }: any) => 'Calendar-Icon',
  Info: ({ size, className, ...props }: any) => 'Info-Icon',
}));

// Mock UI components
jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, action, size, className, ...props }: any) => {
    const React = require('react');
    return React.createElement('badge', { 'data-action': action, 'data-size': size, 'data-class': className, ...props }, children);
  },
  BadgeText: ({ children, ...props }: any) => {
    const React = require('react');
    return React.createElement('badge-text', props, children);
  },
}));

jest.mock('@/components/ui/box', () => ({
  Box: ({ children, className, ...props }: any) => {
    const React = require('react');
    return React.createElement('box', { 'data-class': className, ...props }, children);
  },
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onPress, variant, action, className, ...props }: any) => {
    const React = require('react');
    return React.createElement(
      'button',
      {
        onPress,
        role: 'button',
        'data-variant': variant,
        'data-action': action,
        'data-class': className,
        ...props,
      },
      children
    );
  },
  ButtonText: ({ children, className, ...props }: any) => {
    const React = require('react');
    return React.createElement('button-text', { 'data-class': className, ...props }, children);
  },
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({ children, size, variant, className, ...props }: any) => {
    const React = require('react');
    return React.createElement(
      'card',
      {
        'data-size': size,
        'data-variant': variant,
        'data-class': className,
        ...props,
      },
      children
    );
  },
}));

jest.mock('@/components/ui/text', () => ({
  Text: ({ children, size, className, ...props }: any) => {
    const React = require('react');
    return React.createElement('text', { 'data-size': size, 'data-class': className, ...props }, children);
  },
}));

jest.mock('@/components/ui/vstack', () => ({
  VStack: ({ children, space, className, ...props }: any) => {
    const React = require('react');
    return React.createElement('vstack', { 'data-space': space, 'data-class': className, ...props }, children);
  },
}));

jest.mock('@/components/ui/hstack', () => ({
  HStack: ({ children, space, className, ...props }: any) => {
    const React = require('react');
    return React.createElement('hstack', { 'data-space': space, 'data-class': className, ...props }, children);
  },
}));

jest.mock('@/components/ui/spinner', () => ({
  Spinner: ({ size, ...props }: any) => {
    const React = require('react');
    return React.createElement('spinner', { 'data-size': size, ...props });
  },
}));

jest.mock('@/components/ui/bottom-sheet', () => ({
  CustomBottomSheet: ({ children, isOpen, onClose, testID, ...props }: any) => {
    const React = require('react');
    if (!isOpen) return null;
    return React.createElement(
      'bottom-sheet',
      {
        testID,
        onClose,
        ...props,
      },
      children
    );
  },
}));

// Mock shift calendar view and day card
jest.mock('../shift-calendar-view', () => ({
  ShiftCalendarView: ({ shift, shiftDays, isLoading, onShiftDayPress, onDateRangeChange, ...props }: any) => {
    const React = require('react');
    return React.createElement('shift-calendar-view', {
      'data-shift-id': shift?.ShiftId,
      'data-loading': isLoading,
      role: 'shift-calendar-view',
      ...props,
    });
  },
}));

jest.mock('../shift-day-card', () => ({
  ShiftDayCard: ({ shiftDay, onPress, ...props }: any) => {
    const React = require('react');
    return React.createElement(
      'shift-day-card',
      {
        'data-shift-day-id': shiftDay?.ShiftDayId,
        role: 'shift-day-card',
        onPress,
        ...props,
      },
      `Shift Day ${shiftDay?.ShiftDayId}`
    );
  },
}));

// Mock the shifts store
const mockUseShiftsStore = jest.mocked(useShiftsStore);

jest.mock('@/stores/shifts/store', () => ({
  useShiftsStore: jest.fn(),
}));

describe('ShiftDetailsSheet', () => {
  const mockShift: ShiftResultData = {
    ShiftId: 'shift-1',
    Name: 'Test Shift',
    Code: 'TS001',
    InShift: true,
    PersonnelCount: 10,
    GroupCount: 3,
    NextDay: '2027-01-15T10:00:00Z',
    NextDayId: 'next-day-1',
    ScheduleType: 1, // Automatic
    AssignmentType: 0, // Optional
    Color: '#FF0000',
    Days: [
      {
        ShiftDayId: 'day-1',
        ShiftId: 'shift-1',
        ShiftName: 'Test Shift',
        ShiftDay: '2027-01-15',
        Start: '08:00:00',
        End: '16:00:00',
        SignedUp: false,
        ShiftType: 0,
        Signups: [],
        Needs: [],
      },
      {
        ShiftDayId: 'day-2',
        ShiftId: 'shift-1',
        ShiftName: 'Test Shift',
        ShiftDay: '2027-01-16',
        Start: '08:00:00',
        End: '16:00:00',
        SignedUp: false,
        ShiftType: 0,
        Signups: [],
        Needs: [],
      },
    ],
  };

  const defaultStoreState = {
    selectedShift: mockShift,
    shiftCalendarData: {},
    isShiftLoading: false,
    isCalendarLoading: false,
    selectShiftDay: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseShiftsStore.mockReturnValue(defaultStoreState);
    mockTrackEvent.mockClear();

    // Reset useWindowDimensions to default portrait mode
    mockUseWindowDimensions.mockReturnValue({
      width: 375,
      height: 812,
      scale: 2,
      fontScale: 1,
    });
  });

  describe('Component Rendering', () => {
    it('should render the shift details sheet when open', () => {
      const { getByTestId } = render(<ShiftDetailsSheet isOpen={true} onClose={jest.fn()} />);

      expect(getByTestId('shift-details-sheet')).toBeTruthy();
    });

    it('should not render anything when closed', () => {
      const { queryByTestId } = render(<ShiftDetailsSheet isOpen={false} onClose={jest.fn()} />);

      expect(queryByTestId('shift-details-sheet')).toBeNull();
    });

    it('should not render when no shift is selected', () => {
      mockUseShiftsStore.mockReturnValue({
        ...defaultStoreState,
        selectedShift: null,
      });

      const { queryByTestId } = render(<ShiftDetailsSheet isOpen={true} onClose={jest.fn()} />);

      expect(queryByTestId('shift-details-sheet')).toBeNull();
    });
  });

  describe('Shift Information Display', () => {
    it('should display shift name', () => {
      const component = render(<ShiftDetailsSheet isOpen={true} onClose={jest.fn()} />);
      const { root } = component;

      // Check for shift name in text elements
      const textElements = root.findAllByType('text');
      const hasShiftName = textElements.some((el: any) => el.props.children === 'Test Shift');
      expect(hasShiftName).toBe(true);
    });

    it('should display shift code when available', () => {
      const component = render(<ShiftDetailsSheet isOpen={true} onClose={jest.fn()} />);
      const { root } = component;

      // Check for shift code components in text elements
      const textElements = root.findAllByType('text');
      const hasShiftCodeLabel = textElements.some((el: any) =>
        Array.isArray(el.props.children) &&
        el.props.children.includes('Shift Code') &&
        el.props.children.includes(': ') &&
        el.props.children.includes('TS001')
      );
      expect(hasShiftCodeLabel).toBe(true);
    });

    it('should display in-shift badge when user is in shift', () => {
      const component = render(<ShiftDetailsSheet isOpen={true} onClose={jest.fn()} />);
      const { root } = component;

      // Check for "In Shift" in badge text elements
      const badgeTextElements = root.findAllByType('badge-text');
      const hasInShiftBadge = badgeTextElements.some((element: any) => element.props.children === 'In Shift');
      expect(hasInShiftBadge).toBe(true);
    });

    it('should not display in-shift badge when user is not in shift', () => {
      mockUseShiftsStore.mockReturnValue({
        ...defaultStoreState,
        selectedShift: { ...mockShift, InShift: false },
      });

      const { queryByText } = render(<ShiftDetailsSheet isOpen={true} onClose={jest.fn()} />);

      expect(queryByText('In Shift')).toBeNull();
    });

    it('should display personnel count', () => {
      const component = render(<ShiftDetailsSheet isOpen={true} onClose={jest.fn()} />);
      const { root } = component;

      // Check for personnel count in text elements
      const textElements = root.findAllByType('text');
      const hasPersonnelCount = textElements.some((el: any) => el.props.children === 10 || el.props.children === '10');
      const hasPersonnelLabel = textElements.some((el: any) => el.props.children === 'Personnel');

      expect(hasPersonnelCount).toBe(true);
      expect(hasPersonnelLabel).toBe(true);
    });

    it('should display group count', () => {
      const component = render(<ShiftDetailsSheet isOpen={true} onClose={jest.fn()} />);
      const { root } = component;

      // Check for group count in text elements
      const textElements = root.findAllByType('text');
      const hasGroupCount = textElements.some((el: any) => el.props.children === 3 || el.props.children === '3');
      const hasGroupsLabel = textElements.some((el: any) => el.props.children === 'Groups');

      expect(hasGroupCount).toBe(true);
      expect(hasGroupsLabel).toBe(true);
    });

    it('should display next day information when available', () => {
      const component = render(<ShiftDetailsSheet isOpen={true} onClose={jest.fn()} />);
      const { root } = component;

      // Check for next day information in text elements
      const textElements = root.findAllByType('text');
      const hasNextDayLabel = textElements.some((el: any) => el.props.children === 'Next Day');
      const hasNextDayDate = textElements.some((el: any) => el.props.children === 'Jan 15, 2024');

      expect(hasNextDayLabel).toBe(true);
      expect(hasNextDayDate).toBe(true);
    });

    it('should display schedule type', () => {
      const component = render(<ShiftDetailsSheet isOpen={true} onClose={jest.fn()} />);
      const { root } = component;

      // Check for "Automatic" in badge text elements
      const badgeTextElements = root.findAllByType('badge-text');
      const hasAutomatic = badgeTextElements.some((element: any) => element.props.children === 'Automatic');
      expect(hasAutomatic).toBe(true);
    });

    it('should display assignment type', () => {
      const component = render(<ShiftDetailsSheet isOpen={true} onClose={jest.fn()} />);
      const { root } = component;

      // Check for "Optional" in badge text elements
      const badgeTextElements = root.findAllByType('badge-text');
      const hasOptional = badgeTextElements.some((element: any) => element.props.children === 'Optional');
      expect(hasOptional).toBe(true);
    });
  });

  describe('Tab Navigation', () => {
    it('should display info tab by default', () => {
      const component = render(<ShiftDetailsSheet isOpen={true} onClose={jest.fn()} />);
      const { root } = component;

      // Check for shift name in text elements 
      const textElements = root.findAllByType('text');
      const hasShiftName = textElements.some((el: any) => el.props.children === 'Test Shift');
      expect(hasShiftName).toBe(true);
    });

    it('should switch to calendar tab when clicked', () => {
      const component = render(<ShiftDetailsSheet isOpen={true} onClose={jest.fn()} />);
      const { root } = component;

      // Clear analytics calls for this test
      mockTrackEvent.mockClear();

      // Find buttons by type and click the calendar one
      const buttonElements = root.findAllByType('button');

      // Find calendar button by looking for button-text with "Calendar"
      let calendarButton: any = null;
      for (const button of buttonElements) {
        const buttonTextElements = button.findAllByType('button-text');
        const hasCalendarText = buttonTextElements.some((textEl: any) => textEl.props.children === 'Calendar');
        if (hasCalendarText && button.props.onPress) {
          calendarButton = button;
          break;
        }
      }

      expect(calendarButton).toBeTruthy();

      if (calendarButton && calendarButton.props.onPress) {
        act(() => {
          calendarButton.props.onPress();
        });
      }

      // Should render calendar view
      const calendarViews = root.findAllByType('shift-calendar-view');
      expect(calendarViews.length).toBeGreaterThan(0);
    });
  });

  describe('Loading States', () => {
    it('should display loading spinner when shift is loading', () => {
      mockUseShiftsStore.mockReturnValue({
        ...defaultStoreState,
        isShiftLoading: true,
      });

      const component = render(<ShiftDetailsSheet isOpen={true} onClose={jest.fn()} />);
      const { root } = component;

      // Check for spinner element
      const spinners = root.findAllByType('spinner');
      expect(spinners.length).toBeGreaterThan(0);

      // Check for loading text
      const textElements = root.findAllByType('text');
      const hasLoadingText = textElements.some((el: any) => el.props.children === 'Loading...');
      expect(hasLoadingText).toBe(true);
    });
  });

  describe('Upcoming Shift Days', () => {
    it('should display all shift days when available', () => {
      const component = render(<ShiftDetailsSheet isOpen={true} onClose={jest.fn()} />);
      const { root } = component;

      // Check for "Upcoming Shift Days" text
      const textElements = root.findAllByType('text');
      const hasUpcomingShiftDaysText = textElements.some((el: any) => el.props.children === 'Upcoming Shift Days');
      expect(hasUpcomingShiftDaysText).toBe(true);

      // Check for shift day cards - should display all available days
      const shiftDayCards = root.findAllByType('shift-day-card');
      expect(shiftDayCards.length).toBe(2);
      expect(shiftDayCards[0].props.children).toBe('Shift Day day-1');
      expect(shiftDayCards[1].props.children).toBe('Shift Day day-2');
    });

    it('should not display upcoming shift days section when no days available', () => {
      mockUseShiftsStore.mockReturnValue({
        ...defaultStoreState,
        selectedShift: { ...mockShift, Days: [] },
      });

      const component = render(<ShiftDetailsSheet isOpen={true} onClose={jest.fn()} />);
      const { root } = component;

      // Should not find "Upcoming Shift Days" text
      const textElements = root.findAllByType('text');
      const hasUpcomingShiftDaysText = textElements.some((el: any) => el.props.children === 'Upcoming Shift Days');
      expect(hasUpcomingShiftDaysText).toBe(false);
    });

    it('should display all shift days when scrolling is enabled', () => {
      // Create a shift with many days to test scrolling (using future dates)
      const manyDays = Array.from({ length: 10 }, (_, i) => ({
        ShiftDayId: `day-${i + 1}`,
        ShiftId: 'shift-1',
        ShiftName: 'Test Shift',
        ShiftDay: `2027-01-${String(i + 15).padStart(2, '0')}`,
        Start: '08:00:00',
        End: '16:00:00',
        SignedUp: false,
        ShiftType: 0,
        Signups: [],
        Needs: [],
      }));

      mockUseShiftsStore.mockReturnValue({
        ...defaultStoreState,
        selectedShift: { ...mockShift, Days: manyDays },
      });

      const component = render(<ShiftDetailsSheet isOpen={true} onClose={jest.fn()} />);
      const { root } = component;

      // Should render shift day cards but limited to 7 due to slice(0, 7)
      const shiftDayCards = root.findAllByType('shift-day-card');
      expect(shiftDayCards.length).toBe(7);

      // Verify first and last cards are present
      expect(shiftDayCards[0].props.children).toBe('Shift Day day-1');
      expect(shiftDayCards[6].props.children).toBe('Shift Day day-7');
    });

    it('should render content within a ScrollView for scrollability', () => {
      const component = render(<ShiftDetailsSheet isOpen={true} onClose={jest.fn()} />);
      const { root } = component;

      // Should find ScrollView component
      const scrollViews = root.findAllByType(ScrollView);
      expect(scrollViews.length).toBeGreaterThan(0);

      // ScrollView should have proper props for mobile optimization
      const scrollView = scrollViews[0];
      expect(scrollView.props.showsVerticalScrollIndicator).toBe(true);
      expect(scrollView.props.contentContainerStyle).toEqual({ paddingBottom: 40, flexGrow: 1 });
    });
  });

  describe('Date Formatting', () => {
    it('should handle invalid next day date gracefully', () => {
      mockUseShiftsStore.mockReturnValue({
        ...defaultStoreState,
        selectedShift: { ...mockShift, NextDay: 'invalid-date' },
      });

      const component = render(<ShiftDetailsSheet isOpen={true} onClose={jest.fn()} />);
      const { root } = component;

      const textElements = root.findAllByType('text');
      const hasNextDay = textElements.some((el: any) => el.props.children === 'Next Day');
      // The component returns the invalid date as-is when parsing fails
      const hasInvalidDate = textElements.some((el: any) => el.props.children === 'invalid-date');

      expect(hasNextDay).toBe(true);
      expect(hasInvalidDate).toBe(true);
    });

    it('should handle empty next day', () => {
      mockUseShiftsStore.mockReturnValue({
        ...defaultStoreState,
        selectedShift: { ...mockShift, NextDay: '' },
      });

      const component = render(<ShiftDetailsSheet isOpen={true} onClose={jest.fn()} />);
      const { root } = component;

      const textElements = root.findAllByType('text');
      const hasNextDay = textElements.some((el: any) => el.props.children === 'Next Day');

      expect(hasNextDay).toBe(false);
    });
  });

  describe('Schedule and Assignment Types', () => {
    it('should display manual schedule type', () => {
      mockUseShiftsStore.mockReturnValue({
        ...defaultStoreState,
        selectedShift: { ...mockShift, ScheduleType: 0 }, // Manual
      });

      const component = render(<ShiftDetailsSheet isOpen={true} onClose={jest.fn()} />);
      const { root } = component;

      const badgeTextElements = root.findAllByType('badge-text');
      const hasManual = badgeTextElements.some((element: any) => element.props.children === 'Manual');
      expect(hasManual).toBe(true);
    });

    it('should display required assignment type', () => {
      mockUseShiftsStore.mockReturnValue({
        ...defaultStoreState,
        selectedShift: { ...mockShift, AssignmentType: 1 }, // Required
      });

      const component = render(<ShiftDetailsSheet isOpen={true} onClose={jest.fn()} />);
      const { root } = component;

      const badgeTextElements = root.findAllByType('badge-text');
      const hasRequired = badgeTextElements.some((element: any) => element.props.children === 'Required');
      expect(hasRequired).toBe(true);
    });

    it('should display unknown for invalid schedule type', () => {
      mockUseShiftsStore.mockReturnValue({
        ...defaultStoreState,
        selectedShift: { ...mockShift, ScheduleType: 999 }, // Invalid -> Unknown
      });

      const component = render(<ShiftDetailsSheet isOpen={true} onClose={jest.fn()} />);
      const { root } = component;

      const badgeTextElements = root.findAllByType('badge-text');
      const hasUnknown = badgeTextElements.some((element: any) => element.props.children === 'Unknown');
      expect(hasUnknown).toBe(true);
    });

    it('should display unknown for invalid assignment type', () => {
      mockUseShiftsStore.mockReturnValue({
        ...defaultStoreState,
        selectedShift: { ...mockShift, AssignmentType: 999 }, // Invalid -> Unknown
      });

      const component = render(<ShiftDetailsSheet isOpen={true} onClose={jest.fn()} />);
      const { root } = component;

      const badgeTextElements = root.findAllByType('badge-text');
      const hasUnknown = badgeTextElements.some((element: any) => element.props.children === 'Unknown');
      expect(hasUnknown).toBe(true);
    });
  });

  describe('Interaction', () => {
    it('should call onClose when close is triggered', () => {
      const onCloseMock = jest.fn();
      const { getByTestId } = render(<ShiftDetailsSheet isOpen={true} onClose={onCloseMock} />);

      const bottomSheet = getByTestId('shift-details-sheet');
      if (bottomSheet.props.onClose) {
        bottomSheet.props.onClose();
      }

      expect(onCloseMock).toHaveBeenCalled();
    });

    it('should call selectShiftDay when shift day card is pressed', () => {
      const selectShiftDayMock = jest.fn();
      // Create mock shift with future dates to ensure days are displayed
      const futureMockShift = {
        ...mockShift,
        Days: [
          {
            ShiftDayId: 'day-1',
            ShiftId: 'shift-1',
            ShiftName: 'Test Shift',
            ShiftDay: '2027-01-15',
            Start: '08:00:00',
            End: '16:00:00',
            SignedUp: false,
            ShiftType: 0,
            Signups: [],
            Needs: [],
          },
        ],
      };
      mockUseShiftsStore.mockReturnValue({
        ...defaultStoreState,
        selectedShift: futureMockShift,
        selectShiftDay: selectShiftDayMock,
      });

      const component = render(<ShiftDetailsSheet isOpen={true} onClose={jest.fn()} />);

      // Find shift day cards by their test output content
      const { root } = component;
      const shiftDayElements = root.findAllByType('shift-day-card');
      expect(shiftDayElements.length).toBeGreaterThan(0);

      const firstCard = shiftDayElements[0];
      if (firstCard && firstCard.props.onPress) {
        firstCard.props.onPress();
      }

      expect(selectShiftDayMock).toHaveBeenCalledWith(futureMockShift.Days[0]);
    });
  });

  describe('Analytics Tracking', () => {
    it('should track analytics when sheet is opened', async () => {
      render(<ShiftDetailsSheet isOpen={true} onClose={jest.fn()} />);

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith('shift_details_sheet_viewed', {
          timestamp: expect.any(String),
          shiftId: 'shift-1',
          shiftName: 'Test Shift',
          activeTab: 'info',
          isLandscape: false,
          colorScheme: 'light',
          hasNextDay: true,
          personnelCount: 10,
          groupCount: 3,
          inShift: true,
          scheduleType: 1,
          assignmentType: 0,
          hasRecentDays: true,
        });
      });
    });

    it('should not track analytics when sheet is not open', () => {
      render(<ShiftDetailsSheet isOpen={false} onClose={jest.fn()} />);

      expect(mockTrackEvent).not.toHaveBeenCalled();
    });

    it('should track analytics when tab is changed', async () => {
      const component = render(<ShiftDetailsSheet isOpen={true} onClose={jest.fn()} />);

      // Clear the initial view analytics call
      mockTrackEvent.mockClear();

      const { root } = component;
      const buttonElements = root.findAllByType('button');

      // Find calendar button by looking for button-text with "Calendar"
      let calendarButton: any = null;
      for (const button of buttonElements) {
        const buttonTextElements = button.findAllByType('button-text');
        const hasCalendarText = buttonTextElements.some((textEl: any) => textEl.props.children === 'Calendar');
        if (hasCalendarText && button.props.onPress) {
          calendarButton = button;
          break;
        }
      }

      expect(calendarButton).toBeTruthy();

      if (calendarButton && calendarButton.props.onPress) {
        act(() => {
          calendarButton.props.onPress();
        });
      }

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith('shift_details_tab_changed', {
          timestamp: expect.any(String),
          shiftId: 'shift-1',
          shiftName: 'Test Shift',
          fromTab: 'info',
          toTab: 'calendar',
          isLandscape: false,
          colorScheme: 'light',
        });
      });
    });

    it('should track analytics when sheet is closed', () => {
      const onCloseMock = jest.fn();
      const { getByTestId } = render(<ShiftDetailsSheet isOpen={true} onClose={onCloseMock} />);

      // Clear the initial view analytics call
      mockTrackEvent.mockClear();

      const bottomSheet = getByTestId('shift-details-sheet');
      if (bottomSheet.props.onClose) {
        bottomSheet.props.onClose();
      }

      expect(mockTrackEvent).toHaveBeenCalledWith('shift_details_sheet_closed', {
        timestamp: expect.any(String),
        shiftId: 'shift-1',
        shiftName: 'Test Shift',
        activeTab: 'info',
        isLandscape: false,
        colorScheme: 'light',
      });

      expect(onCloseMock).toHaveBeenCalled();
    });

    it('should handle analytics with missing shift data', async () => {
      mockUseShiftsStore.mockReturnValue({
        ...defaultStoreState,
        selectedShift: {
          ShiftId: 'test-shift',
          Name: '',
          Code: '',
          InShift: false,
          PersonnelCount: 0,
          GroupCount: 0,
          NextDay: '',
          NextDayId: '',
          ScheduleType: 0,
          AssignmentType: 0,
          Color: '',
          Days: [],
        },
      });

      render(<ShiftDetailsSheet isOpen={true} onClose={jest.fn()} />);

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith('shift_details_sheet_viewed', {
          timestamp: expect.any(String),
          shiftId: 'test-shift',
          shiftName: '',
          activeTab: 'info',
          isLandscape: false,
          colorScheme: 'light',
          hasNextDay: false,
          personnelCount: 0,
          groupCount: 0,
          inShift: false,
          scheduleType: 0,
          assignmentType: 0,
          hasRecentDays: false,
        });
      });
    });

    it('should handle analytics errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => { });
      mockTrackEvent.mockImplementation(() => {
        throw new Error('Analytics error');
      });

      // Should not break component functionality
      expect(() => {
        render(<ShiftDetailsSheet isOpen={true} onClose={jest.fn()} />);
      }).not.toThrow();

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'Failed to track shift details sheet view analytics:',
          expect.any(Error)
        );
      });

      consoleSpy.mockRestore();
    });

    it('should track correct landscape orientation', async () => {
      // Mock window dimensions for landscape orientation
      mockUseWindowDimensions.mockReturnValue({
        width: 812,
        height: 375,
        scale: 2,
        fontScale: 1,
      });

      // Clear previous analytics calls
      mockTrackEvent.mockClear();

      // Create a wrapper component to force re-evaluation of the hook
      const TestWrapper: React.FC = () => {
        return <ShiftDetailsSheet isOpen={true} onClose={jest.fn()} />;
      };

      render(<TestWrapper />);

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith('shift_details_sheet_viewed',
          expect.objectContaining({
            isLandscape: true,
          })
        );
      });
    });

    it('should track correct color scheme', async () => {
      const { useColorScheme } = require('nativewind');
      useColorScheme.mockReturnValue({
        colorScheme: 'dark',
        setColorScheme: jest.fn(),
      });

      render(<ShiftDetailsSheet isOpen={true} onClose={jest.fn()} />);

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith('shift_details_sheet_viewed',
          expect.objectContaining({
            colorScheme: 'dark',
          })
        );
      });
    });
  });

  describe('Interaction', () => {
  });

  describe('Calendar Tab', () => {
    it('should render calendar view when calendar tab is active', () => {
      const component = render(<ShiftDetailsSheet isOpen={true} onClose={jest.fn()} />);

      // Clear analytics calls for this test
      mockTrackEvent.mockClear();

      // Find buttons by type and click the calendar one
      const { root } = component;
      const buttonElements = root.findAllByType('button');

      // Find calendar button by looking for button-text with "Calendar"
      let calendarButton: any = null;
      for (const button of buttonElements) {
        const buttonTextElements = button.findAllByType('button-text');
        const hasCalendarText = buttonTextElements.some((textEl: any) => textEl.props.children === 'Calendar');
        if (hasCalendarText && button.props.onPress) {
          calendarButton = button;
          break;
        }
      }

      expect(calendarButton).toBeTruthy();

      if (calendarButton && calendarButton.props.onPress) {
        act(() => {
          calendarButton.props.onPress();
        });
      }

      // Should find the calendar view component by type
      const calendarViews = root.findAllByType('shift-calendar-view');
      expect(calendarViews.length).toBeGreaterThan(0);
      expect(calendarViews[0].props['data-shift-id']).toBe('shift-1');
    });
  });

  describe('Edge Cases', () => {
    it('should handle shift without code', () => {
      mockUseShiftsStore.mockReturnValue({
        ...defaultStoreState,
        selectedShift: { ...mockShift, Code: '' },
      });

      const { queryByText } = render(<ShiftDetailsSheet isOpen={true} onClose={jest.fn()} />);

      expect(queryByText(/Shift Code:/)).toBeNull();
    });

    it('should handle zero personnel count', () => {
      mockUseShiftsStore.mockReturnValue({
        ...defaultStoreState,
        selectedShift: { ...mockShift, PersonnelCount: 0 },
      });

      const component = render(<ShiftDetailsSheet isOpen={true} onClose={jest.fn()} />);

      // Check for zero in the rendered content by examining text elements
      const { root } = component;
      const textElements = root.findAllByType('text');
      const hasZero = textElements.some((element: any) => element.props.children === 0 || element.props.children === '0');
      expect(hasZero).toBe(true);
    });

    it('should handle zero group count', () => {
      mockUseShiftsStore.mockReturnValue({
        ...defaultStoreState,
        selectedShift: { ...mockShift, GroupCount: 0 },
      });

      const component = render(<ShiftDetailsSheet isOpen={true} onClose={jest.fn()} />);

      // Check for zero in the rendered content by examining text elements
      const { root } = component;
      const textElements = root.findAllByType('text');
      const hasZero = textElements.some((element: any) => element.props.children === 0 || element.props.children === '0');
      expect(hasZero).toBe(true);
    });
  });
});
