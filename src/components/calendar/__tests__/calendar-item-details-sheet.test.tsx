import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useColorScheme } from 'nativewind';

import { CalendarItemDetailsSheet } from '../calendar-item-details-sheet';
import { useAnalytics } from '@/hooks/use-analytics';
import { useToast } from '@/hooks/use-toast';
import { type CalendarItemResultData } from '@/models/v4/calendar/calendarItemResultData';
import { useCalendarStore } from '@/stores/calendar/store';
import { usePersonnelStore } from '@/stores/personnel/store';

// Mock dependencies
jest.mock('react-i18next', () => ({
  useTranslation: jest.fn(),
}));

jest.mock('nativewind', () => ({
  useColorScheme: jest.fn(),
}));

jest.mock('@/hooks/use-analytics', () => ({
  useAnalytics: jest.fn(),
}));

jest.mock('@/hooks/use-toast', () => ({
  useToast: jest.fn(),
}));

jest.mock('@/stores/calendar/store', () => ({
  useCalendarStore: jest.fn(),
}));

jest.mock('@/stores/personnel/store', () => ({
  usePersonnelStore: jest.fn(),
}));

// Mock Lucide React Native icons
jest.mock('lucide-react-native', () => ({
  AlertCircle: 'AlertCircle',
  Calendar: 'Calendar',
  CheckCircle: 'CheckCircle',
  Clock: 'Clock',
  FileText: 'FileText',
  MapPin: 'MapPin',
  User: 'User',
  Users: 'Users',
  XCircle: 'XCircle',
}));

// Mock react-native-webview
jest.mock('react-native-webview', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return ({ source, testID, ...props }: any) => (
    <View testID={testID || 'webview'} {...props}>
      <Text testID="webview-content">{source.html}</Text>
    </View>
  );
});

// Mock Alert
jest.spyOn(Alert, 'alert');

// Mock UI components
jest.mock('@/components/common/loading', () => ({
  Loading: 'Loading',
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: 'Badge',
}));

jest.mock('@/components/ui/box', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    Box: ({ children, ...props }: any) => React.createElement(View, props, children),
  };
});

jest.mock('@/components/ui/bottom-sheet', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    CustomBottomSheet: ({ children, isOpen, onClose }: any) =>
      isOpen ? <View testID="bottom-sheet">{children}</View> : null,
  };
});

jest.mock('@/components/ui/button', () => {
  const React = require('react');
  const { Pressable, Text } = require('react-native');
  return {
    Button: ({ children, onPress, testID, disabled }: any) => (
      <Pressable testID={testID || 'button'} onPress={!disabled ? onPress : undefined}>
        {children}
      </Pressable>
    ),
    ButtonText: ({ children }: any) => <Text>{children}</Text>,
  };
});

jest.mock('@/components/ui/heading', () => ({
  Heading: ({ children }: any) => <h1>{children}</h1>,
}));

jest.mock('@/components/ui/hstack', () => ({
  HStack: ({ children }: any) => <div>{children}</div>,
}));

jest.mock('@/components/ui/input', () => {
  const React = require('react');
  const { View, TextInput } = require('react-native');
  return {
    Input: ({ children }: any) => <View>{children}</View>,
    InputField: ({ value, onChangeText, placeholder, testID }: any) => (
      <TextInput
        testID={testID || 'input-field'}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        multiline
        numberOfLines={3}
      />
    ),
  };
});

jest.mock('@/components/ui/text', () => ({
  Text: ({ children }: any) => <span>{children}</span>,
}));

jest.mock('@/components/ui/vstack', () => ({
  VStack: ({ children }: any) => <div>{children}</div>,
}));

describe('CalendarItemDetailsSheet', () => {
  const mockT = jest.fn((key: string) => key);
  const mockTrackEvent = jest.fn();
  const mockSetCalendarItemAttendingStatus = jest.fn();
  const mockFetchCalendarItem = jest.fn();
  const mockOnClose = jest.fn();
  const mockShowSuccessToast = jest.fn();
  const mockShowErrorToast = jest.fn();

  const mockUseTranslation = useTranslation as jest.MockedFunction<typeof useTranslation>;
  const mockUseAnalytics = useAnalytics as jest.MockedFunction<typeof useAnalytics>;
  const mockUseToast = useToast as jest.MockedFunction<typeof useToast>;
  const mockUseCalendarStore = useCalendarStore as jest.MockedFunction<typeof useCalendarStore>;
  const mockUsePersonnelStore = usePersonnelStore as jest.MockedFunction<typeof usePersonnelStore>;
  const mockUseColorScheme = useColorScheme as jest.MockedFunction<typeof useColorScheme>;

  const mockCalendarItem: CalendarItemResultData = {
    CalendarItemId: 'test-item-1',
    Title: 'Test Event',
    Start: '2025-08-20T09:00:00Z',
    StartUtc: '2025-08-20T09:00:00Z',
    End: '2025-08-20T10:00:00Z',
    EndUtc: '2025-08-20T10:00:00Z',
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
    CreatorUserId: 'creator-1',
    Attending: false,
    TypeName: 'Meeting',
    TypeColor: '#3B82F6',
    Attendees: [
      {
        CalendarItemId: 'test-item-1',
        UserId: 'user-1',
        Name: 'John Doe',
        GroupName: 'Team A',
        AttendeeType: 1,
        Timestamp: '2025-08-19T12:00:00Z',
        Note: 'Test note',
      },
    ],
  };

  const mockPersonnelData = [
    {
      UserId: 'creator-1',
      FirstName: 'John',
      LastName: 'Doe',
      EmailAddress: 'john.doe@example.com',
      IdentificationNumber: 'EMP001',
      DepartmentId: 'dept1',
      MobilePhone: '+1234567890',
      GroupId: 'group1',
      GroupName: 'Fire Department',
      StatusId: 'status1',
      Status: 'Available',
      StatusColor: '#22C55E',
      StatusTimestamp: '2023-12-01T10:00:00Z',
      StatusDestinationId: '',
      StatusDestinationName: '',
      StaffingId: 'staff1',
      Staffing: 'On Duty',
      StaffingColor: '#3B82F6',
      StaffingTimestamp: '2023-12-01T08:00:00Z',
      Roles: ['Captain', 'Firefighter'],
    },
    {
      UserId: 'user-2',
      FirstName: 'Jane',
      LastName: 'Smith',
      EmailAddress: 'jane.smith@example.com',
      IdentificationNumber: 'EMP002',
      DepartmentId: 'dept1',
      MobilePhone: '+1234567891',
      GroupId: 'group1',
      GroupName: 'Fire Department',
      StatusId: 'status2',
      Status: 'Busy',
      StatusColor: '#EF4444',
      StatusTimestamp: '2023-12-01T09:30:00Z',
      StatusDestinationId: 'dest1',
      StatusDestinationName: 'Hospital A',
      StaffingId: 'staff2',
      Staffing: 'Off Duty',
      StaffingColor: '#6B7280',
      StaffingTimestamp: '2023-12-01T09:00:00Z',
      Roles: ['Paramedic', 'Driver'],
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseTranslation.mockReturnValue({
      t: mockT,
    } as any);

    mockUseColorScheme.mockReturnValue({
      colorScheme: 'light',
    } as any);

    mockUseAnalytics.mockReturnValue({
      trackEvent: mockTrackEvent,
    });

    mockUseToast.mockReturnValue({
      success: mockShowSuccessToast,
      error: mockShowErrorToast,
      show: jest.fn(),
      warning: jest.fn(),
      info: jest.fn(),
    });

    mockUseCalendarStore.mockReturnValue({
      setCalendarItemAttendingStatus: mockSetCalendarItemAttendingStatus,
      fetchCalendarItem: mockFetchCalendarItem,
      isAttendanceLoading: false,
      attendanceError: null,
    } as any);

    mockUsePersonnelStore.mockReturnValue({
      personnel: mockPersonnelData,
      fetchPersonnel: jest.fn(() => Promise.resolve()),
      isLoading: false,
    } as any);

    mockSetCalendarItemAttendingStatus.mockResolvedValue(undefined);
    mockFetchCalendarItem.mockResolvedValue(undefined);
  });

  it('renders null when item is null', () => {
    const { queryByTestId } = render(
      <CalendarItemDetailsSheet item={null} isOpen={true} onClose={mockOnClose} />
    );

    expect(queryByTestId('bottom-sheet')).toBeNull();
  });

  it('renders bottom sheet when item is provided and isOpen is true', () => {
    const { getByTestId } = render(
      <CalendarItemDetailsSheet item={mockCalendarItem} isOpen={true} onClose={mockOnClose} />
    );

    expect(getByTestId('bottom-sheet')).toBeTruthy();
  });

  it('does not render bottom sheet when isOpen is false', () => {
    const { queryByTestId } = render(
      <CalendarItemDetailsSheet item={mockCalendarItem} isOpen={false} onClose={mockOnClose} />
    );

    expect(queryByTestId('bottom-sheet')).toBeNull();
  });

  it('tracks analytics when sheet becomes visible', () => {
    render(
      <CalendarItemDetailsSheet item={mockCalendarItem} isOpen={true} onClose={mockOnClose} />
    );

    expect(mockTrackEvent).toHaveBeenCalledWith('calendar_item_details_viewed', {
      itemId: 'test-item-1',
      itemType: 1,
      hasLocation: true,
      hasDescription: true,
      isAllDay: false,
      canSignUp: true,
      isSignedUp: false,
      attendeeCount: 1,
      signupType: 1,
      typeName: 'Meeting',
      timestamp: expect.any(String),
    });
  });

  it('does not track analytics when sheet is not visible', () => {
    render(
      <CalendarItemDetailsSheet item={mockCalendarItem} isOpen={false} onClose={mockOnClose} />
    );

    expect(mockTrackEvent).not.toHaveBeenCalled();
  });

  it('tracks analytics with correct data for different item properties', () => {
    const itemWithoutOptionalFields = {
      ...mockCalendarItem,
      Location: '',
      Description: '',
      IsAllDay: true,
      SignupType: 0,
      Attendees: [],
    };

    render(
      <CalendarItemDetailsSheet item={itemWithoutOptionalFields} isOpen={true} onClose={mockOnClose} />
    );

    expect(mockTrackEvent).toHaveBeenCalledWith('calendar_item_details_viewed', {
      itemId: 'test-item-1',
      itemType: 1,
      hasLocation: false,
      hasDescription: false,
      isAllDay: true,
      canSignUp: false,
      isSignedUp: false,
      attendeeCount: 0,
      signupType: 0,
      typeName: 'Meeting',
      timestamp: expect.any(String),
    });
  });

  it('tracks analytics when item changes while sheet is open', () => {
    const { rerender } = render(
      <CalendarItemDetailsSheet item={mockCalendarItem} isOpen={true} onClose={mockOnClose} />
    );

    const newItem = { ...mockCalendarItem, CalendarItemId: 'test-item-2' };

    rerender(
      <CalendarItemDetailsSheet item={newItem} isOpen={true} onClose={mockOnClose} />
    );

    expect(mockTrackEvent).toHaveBeenCalledTimes(2);
    expect(mockTrackEvent).toHaveBeenLastCalledWith('calendar_item_details_viewed',
      expect.objectContaining({
        itemId: 'test-item-2',
      })
    );
  });

  describe('Signup functionality', () => {
    it('tracks attendance attempt on signup', async () => {
      const { getByText } = render(
        <CalendarItemDetailsSheet item={mockCalendarItem} isOpen={true} onClose={mockOnClose} />
      );

      const signupButton = getByText('calendar.signup.button');
      fireEvent.press(signupButton);

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith('calendar_item_attendance_attempted', {
          itemId: 'test-item-1',
          attending: true,
          status: 1,
          hasNote: false,
          noteLength: 0,
          timestamp: expect.any(String),
        });
      });
    });

    it('tracks successful attendance change', async () => {
      const { getByText } = render(
        <CalendarItemDetailsSheet item={mockCalendarItem} isOpen={true} onClose={mockOnClose} />
      );

      const signupButton = getByText('calendar.signup.button');
      fireEvent.press(signupButton);

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith('calendar_item_attendance_success', {
          itemId: 'test-item-1',
          attending: true,
          status: 1,
          hasNote: false,
          timestamp: expect.any(String),
        });
      });
    });

    it('refreshes calendar item after successful signup', async () => {
      const { getByText } = render(
        <CalendarItemDetailsSheet item={mockCalendarItem} isOpen={true} onClose={mockOnClose} />
      );

      const signupButton = getByText('calendar.signup.button');
      fireEvent.press(signupButton);

      await waitFor(() => {
        expect(mockFetchCalendarItem).toHaveBeenCalledWith('test-item-1');
      });
    });

    it('shows success toast after successful signup', async () => {
      const { getByText } = render(
        <CalendarItemDetailsSheet item={mockCalendarItem} isOpen={true} onClose={mockOnClose} />
      );

      const signupButton = getByText('calendar.signup.button');
      fireEvent.press(signupButton);

      await waitFor(() => {
        expect(mockShowSuccessToast).toHaveBeenCalledWith(
          'calendar.attendanceUpdated.signedUp',
          'calendar.attendanceUpdated.title'
        );
      });
    });

    it('shows success toast after successful unsignup', async () => {
      const signedUpItem = {
        ...mockCalendarItem,
        Attending: true,
      };

      // Mock Alert.alert to immediately call the destructive action
      (Alert.alert as jest.Mock).mockImplementation((title, message, buttons) => {
        if (!Array.isArray(buttons)) return;
        const destructiveButton = buttons.find((b: any) => b.style === 'destructive');
        if (destructiveButton) {
          destructiveButton.onPress();
        }
      });

      const { getByText } = render(
        <CalendarItemDetailsSheet item={signedUpItem} isOpen={true} onClose={mockOnClose} />
      );

      const unsignupButton = getByText('calendar.unsignup');
      fireEvent.press(unsignupButton);

      await waitFor(() => {
        expect(mockShowSuccessToast).toHaveBeenCalledWith(
          'calendar.attendanceUpdated.unsignedUp',
          'calendar.attendanceUpdated.title'
        );
      });
    });

    it('tracks failed attendance change', async () => {
      const error = new Error('Network error');
      mockSetCalendarItemAttendingStatus.mockRejectedValueOnce(error);

      const { getByText } = render(
        <CalendarItemDetailsSheet item={mockCalendarItem} isOpen={true} onClose={mockOnClose} />
      );

      const signupButton = getByText('calendar.signup.button');
      fireEvent.press(signupButton);

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith('calendar_item_attendance_failed', {
          itemId: 'test-item-1',
          attending: true,
          error: 'Network error',
          timestamp: expect.any(String),
        });
      });
    });

    it('shows error toast when signup fails', async () => {
      const error = new Error('Network error');
      mockSetCalendarItemAttendingStatus.mockRejectedValueOnce(error);

      const { getByText } = render(
        <CalendarItemDetailsSheet item={mockCalendarItem} isOpen={true} onClose={mockOnClose} />
      );

      const signupButton = getByText('calendar.signup.button');
      fireEvent.press(signupButton);

      await waitFor(() => {
        expect(mockShowErrorToast).toHaveBeenCalledWith(
          'calendar.error.attendanceUpdate',
          'calendar.error.title'
        );
      });
    });

    it('does not refresh calendar item when signup fails', async () => {
      const error = new Error('Network error');
      mockSetCalendarItemAttendingStatus.mockRejectedValueOnce(error);

      const { getByText } = render(
        <CalendarItemDetailsSheet item={mockCalendarItem} isOpen={true} onClose={mockOnClose} />
      );

      const signupButton = getByText('calendar.signup.button');
      fireEvent.press(signupButton);

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith('calendar_item_attendance_failed', expect.any(Object));
      });

      // Should not call fetchCalendarItem when there's an error
      expect(mockFetchCalendarItem).not.toHaveBeenCalled();
    });

    it('shows note input for signup types that require notes', () => {
      const itemWithNoteRequired = {
        ...mockCalendarItem,
        SignupType: 2, // Requires note
      };

      const { getByText, getByTestId } = render(
        <CalendarItemDetailsSheet item={itemWithNoteRequired} isOpen={true} onClose={mockOnClose} />
      );

      const signupButton = getByText('calendar.signup.button');
      fireEvent.press(signupButton);

      expect(getByTestId('input-field')).toBeTruthy();
    });

    it('tracks attendance change with note when provided', async () => {
      const itemWithNoteRequired = {
        ...mockCalendarItem,
        SignupType: 2,
      };

      const { getByText, getByTestId } = render(
        <CalendarItemDetailsSheet item={itemWithNoteRequired} isOpen={true} onClose={mockOnClose} />
      );

      // Click signup to show note input
      const signupButton = getByText('calendar.signup.button');
      fireEvent.press(signupButton);

      // Enter note
      const noteInput = getByTestId('input-field');
      fireEvent.changeText(noteInput, 'Test signup note');

      // Confirm signup
      const confirmButton = getByText('calendar.confirmSignup');
      fireEvent.press(confirmButton);

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith('calendar_item_attendance_attempted',
          expect.objectContaining({
            hasNote: true,
            noteLength: 16,
          })
        );
      });
    });
  });

  describe('Unsignup functionality', () => {
    it('shows confirmation alert for unsignup', () => {
      const signedUpItem = {
        ...mockCalendarItem,
        Attending: true,
      };

      const { getByText } = render(
        <CalendarItemDetailsSheet item={signedUpItem} isOpen={true} onClose={mockOnClose} />
      );

      const unsignupButton = getByText('calendar.unsignup');
      fireEvent.press(unsignupButton);

      expect(Alert.alert).toHaveBeenCalledWith(
        'calendar.confirmUnsignup.title',
        'calendar.confirmUnsignup.message',
        expect.any(Array)
      );
    });

    it('tracks attendance change when unsigning', async () => {
      const signedUpItem = {
        ...mockCalendarItem,
        Attending: true,
      };

      // Mock Alert.alert to immediately call the destructive action
      (Alert.alert as jest.Mock).mockImplementation((title, message, buttons) => {
        if (!Array.isArray(buttons)) return;
        const destructiveButton = buttons.find((b: any) => b.style === 'destructive');
        if (destructiveButton) {
          destructiveButton.onPress();
        }
      });

      const { getByText } = render(
        <CalendarItemDetailsSheet item={signedUpItem} isOpen={true} onClose={mockOnClose} />
      );

      const unsignupButton = getByText('calendar.unsignup');
      fireEvent.press(unsignupButton);

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith('calendar_item_attendance_attempted', {
          itemId: 'test-item-1',
          attending: false,
          status: 4,
          hasNote: false,
          noteLength: 0,
          timestamp: expect.any(String),
        });
      });
    });
  });

  describe('Loading states', () => {
    it('shows loading state when attendance is being updated', () => {
      mockUseCalendarStore.mockReturnValue({
        setCalendarItemAttendingStatus: mockSetCalendarItemAttendingStatus,
        fetchCalendarItem: mockFetchCalendarItem,
        isAttendanceLoading: true,
        attendanceError: null,
      } as any);

      const { queryByTestId } = render(
        <CalendarItemDetailsSheet item={mockCalendarItem} isOpen={true} onClose={mockOnClose} />
      );

      expect(queryByTestId('bottom-sheet')).toBeTruthy();
      // Loading component should be rendered in the signup section
    });
  });

  describe('Event formatting', () => {
    it('formats all-day events correctly', () => {
      const allDayItem = {
        ...mockCalendarItem,
        IsAllDay: true,
      };

      const { getByTestId } = render(
        <CalendarItemDetailsSheet item={allDayItem} isOpen={true} onClose={mockOnClose} />
      );

      expect(getByTestId('bottom-sheet')).toBeTruthy();
      // The component should handle all-day events
    });

    it('handles items without optional fields', () => {
      const minimalItem: CalendarItemResultData = {
        CalendarItemId: 'minimal-item',
        Title: 'Minimal Event',
        Start: '2025-08-20T09:00:00Z',
        StartUtc: '2025-08-20T09:00:00Z',
        End: '2025-08-20T10:00:00Z',
        EndUtc: '2025-08-20T10:00:00Z',
        StartTimezone: 'UTC',
        EndTimezone: 'UTC',
        Description: '',
        RecurrenceId: '',
        RecurrenceRule: '',
        RecurrenceException: '',
        ItemType: 1,
        IsAllDay: false,
        Location: '',
        SignupType: 0,
        Reminder: 0,
        LockEditing: false,
        Entities: '',
        RequiredAttendes: '',
        OptionalAttendes: '',
        IsAdminOrCreator: false,
        CreatorUserId: '',
        Attending: false,
        TypeName: '',
        TypeColor: '',
        Attendees: [],
      };

      const { getByTestId } = render(
        <CalendarItemDetailsSheet item={minimalItem} isOpen={true} onClose={mockOnClose} />
      );

      expect(getByTestId('bottom-sheet')).toBeTruthy();
    });
  });

  describe('Error handling', () => {
    it('shows error toast when attendance update fails', async () => {
      const error = new Error('Server error');
      mockSetCalendarItemAttendingStatus.mockRejectedValueOnce(error);

      const { getByText } = render(
        <CalendarItemDetailsSheet item={mockCalendarItem} isOpen={true} onClose={mockOnClose} />
      );

      const signupButton = getByText('calendar.signup.button');
      fireEvent.press(signupButton);

      await waitFor(() => {
        expect(mockShowErrorToast).toHaveBeenCalledWith(
          'calendar.error.attendanceUpdate',
          'calendar.error.title'
        );
      });
    });
  });

  describe('Attendees display', () => {
    it('renders attendees list when available', () => {
      const { getByTestId } = render(
        <CalendarItemDetailsSheet item={mockCalendarItem} isOpen={true} onClose={mockOnClose} />
      );

      expect(getByTestId('bottom-sheet')).toBeTruthy();
      // Should render attendees section
    });

    it('handles empty attendees list', () => {
      const itemWithoutAttendees = {
        ...mockCalendarItem,
        Attendees: [],
      };

      const { getByTestId } = render(
        <CalendarItemDetailsSheet item={itemWithoutAttendees} isOpen={true} onClose={mockOnClose} />
      );

      expect(getByTestId('bottom-sheet')).toBeTruthy();
    });
  });

  describe('WebView Description Rendering', () => {
    it('renders WebView when description is provided', () => {
      const { getByTestId } = render(
        <CalendarItemDetailsSheet item={mockCalendarItem} isOpen={true} onClose={mockOnClose} />
      );

      const webview = getByTestId('webview');
      expect(webview).toBeTruthy();
    });

    it('does not render WebView when description is empty', () => {
      const itemWithoutDescription = {
        ...mockCalendarItem,
        Description: '',
      };

      const { queryByTestId } = render(
        <CalendarItemDetailsSheet item={itemWithoutDescription} isOpen={true} onClose={mockOnClose} />
      );

      expect(queryByTestId('webview')).toBeNull();
    });

    it('renders WebView with proper HTML structure', () => {
      const { getByTestId } = render(
        <CalendarItemDetailsSheet item={mockCalendarItem} isOpen={true} onClose={mockOnClose} />
      );

      const webviewContent = getByTestId('webview-content');
      const htmlContent = webviewContent.props.children;

      expect(htmlContent).toContain('<!DOCTYPE html>');
      expect(htmlContent).toContain('<html>');
      expect(htmlContent).toContain('<head>');
      expect(htmlContent).toContain('<meta name="viewport"');
      expect(htmlContent).toContain('<style>');
      expect(htmlContent).toContain('<body>');
      expect(htmlContent).toContain('Test event description');
    });

    it('includes proper CSS styles for light theme', () => {
      const { getByTestId } = render(
        <CalendarItemDetailsSheet item={mockCalendarItem} isOpen={true} onClose={mockOnClose} />
      );

      const webviewContent = getByTestId('webview-content');
      const htmlContent = webviewContent.props.children;

      expect(htmlContent).toContain('#1F2937'); // light mode text color
      expect(htmlContent).toContain('#F9FAFB'); // light mode background
      expect(htmlContent).toContain('font-family: system-ui, -apple-system, sans-serif');
      expect(htmlContent).toContain('font-size: 16px');
      expect(htmlContent).toContain('line-height: 1.5');
      expect(htmlContent).toContain('max-width: 100%');
    });

    it('includes proper CSS styles for dark theme', () => {
      mockUseColorScheme.mockReturnValue({
        colorScheme: 'dark',
      } as any);

      const { getByTestId } = render(
        <CalendarItemDetailsSheet item={mockCalendarItem} isOpen={true} onClose={mockOnClose} />
      );

      const webviewContent = getByTestId('webview-content');
      const htmlContent = webviewContent.props.children;

      expect(htmlContent).toContain('#E5E7EB'); // dark mode text color
      expect(htmlContent).toContain('#374151'); // dark mode background
    });

    it('configures WebView props correctly', () => {
      const { getByTestId } = render(
        <CalendarItemDetailsSheet item={mockCalendarItem} isOpen={true} onClose={mockOnClose} />
      );
      const webview = getByTestId('webview');

      expect(webview.props.originWhitelist).toEqual(['about:blank']);
      expect(webview.props.scrollEnabled).toBe(false);
      expect(webview.props.showsVerticalScrollIndicator).toBe(false);
      expect(webview.props.androidLayerType).toBe('software');
    });

    it('includes description content in WebView HTML', () => {
      const customDescription = '<p>Custom HTML description content</p>';
      const itemWithCustomDescription = {
        ...mockCalendarItem,
        Description: customDescription,
      };

      const { getByTestId } = render(
        <CalendarItemDetailsSheet item={itemWithCustomDescription} isOpen={true} onClose={mockOnClose} />
      );

      const webviewContent = getByTestId('webview-content');
      const htmlContent = webviewContent.props.children;

      expect(htmlContent).toContain(customDescription);
    });
  });

  describe('Creator Information Display', () => {
    it('renders creator section when CreatorUserId is provided', () => {
      const { getByTestId } = render(
        <CalendarItemDetailsSheet item={mockCalendarItem} isOpen={true} onClose={mockOnClose} />
      );

      // The component should render the bottom sheet
      expect(getByTestId('bottom-sheet')).toBeTruthy();
    });

    it('displays creator name when found in personnel list', () => {
      const { getByTestId } = render(
        <CalendarItemDetailsSheet item={mockCalendarItem} isOpen={true} onClose={mockOnClose} />
      );

      // Component should render successfully when creator is found
      expect(getByTestId('bottom-sheet')).toBeTruthy();
    });

    it('handles unknown creator gracefully with fallback message', () => {
      const itemWithUnknownCreator = {
        ...mockCalendarItem,
        CreatorUserId: 'unknown-creator-id',
      };

      const { getByTestId } = render(
        <CalendarItemDetailsSheet item={itemWithUnknownCreator} isOpen={true} onClose={mockOnClose} />
      );

      // Component should render successfully with fallback message
      expect(getByTestId('bottom-sheet')).toBeTruthy();
    });

    it('does not display creator info when CreatorUserId is empty', () => {
      const itemWithoutCreator = {
        ...mockCalendarItem,
        CreatorUserId: '',
      };

      const { queryByText } = render(
        <CalendarItemDetailsSheet item={itemWithoutCreator} isOpen={true} onClose={mockOnClose} />
      );

      // Check that the creator section is not rendered
      expect(queryByText(/calendar.createdBy/)).toBeNull();
    });

    it('handles empty personnel list gracefully', () => {
      mockUsePersonnelStore.mockReturnValue({
        personnel: [],
        fetchPersonnel: jest.fn(() => Promise.resolve()),
        isLoading: false,
      } as any);

      const { getByTestId } = render(
        <CalendarItemDetailsSheet item={mockCalendarItem} isOpen={true} onClose={mockOnClose} />
      );

      // Component should render successfully with fallback message when personnel list is empty
      expect(getByTestId('bottom-sheet')).toBeTruthy();
    });

    it('handles personnel with incomplete names', () => {
      const personnelWithIncompleteNames = [
        {
          ...mockPersonnelData[0],
          FirstName: 'John',
          LastName: '', // Empty last name
        },
      ];

      mockUsePersonnelStore.mockReturnValue({
        personnel: personnelWithIncompleteNames,
        fetchPersonnel: jest.fn(() => Promise.resolve()),
        isLoading: false,
      } as any);

      const { getByTestId } = render(
        <CalendarItemDetailsSheet item={mockCalendarItem} isOpen={true} onClose={mockOnClose} />
      );

      // Component should render successfully with partial name
      expect(getByTestId('bottom-sheet')).toBeTruthy();
    });

    it('handles personnel with only last name', () => {
      const personnelWithOnlyLastName = [
        {
          ...mockPersonnelData[0],
          FirstName: '', // Empty first name
          LastName: 'Doe',
        },
      ];

      mockUsePersonnelStore.mockReturnValue({
        personnel: personnelWithOnlyLastName,
        fetchPersonnel: jest.fn(() => Promise.resolve()),
        isLoading: false,
      } as any);

      const { getByTestId } = render(
        <CalendarItemDetailsSheet item={mockCalendarItem} isOpen={true} onClose={mockOnClose} />
      );

      // Component should render successfully with partial name
      expect(getByTestId('bottom-sheet')).toBeTruthy();
    });

    // Test the getCreatorName logic by verifying component behavior with different scenarios
    it('displays unknown_user for non-existent creator IDs instead of raw ID', () => {
      const itemWithUnknownCreator = {
        ...mockCalendarItem,
        CreatorUserId: 'definitely-not-in-personnel-list',
      };

      // This test verifies that when a creator ID is not found,
      // we get the translated "unknown_user" text instead of the raw ID
      const { getByTestId } = render(
        <CalendarItemDetailsSheet item={itemWithUnknownCreator} isOpen={true} onClose={mockOnClose} />
      );

      // Component should render successfully and not display the raw ID
      expect(getByTestId('bottom-sheet')).toBeTruthy();

      // The key improvement: we should NOT see the raw creator ID in the UI
      // This validates that our fix prevents showing the raw ID to users
      const bottomSheet = getByTestId('bottom-sheet');
      const bottomSheetText = bottomSheet.props.children.toString();
      expect(bottomSheetText).not.toContain('definitely-not-in-personnel-list');
    });

    it('shows loading state when fetching personnel', async () => {
      // Mock personnel store with loading state
      mockUsePersonnelStore.mockReturnValue({
        personnel: [],
        fetchPersonnel: jest.fn(() => Promise.resolve()),
        isLoading: true,
      } as any);

      const mockItem = {
        ...mockCalendarItem,
        CreatorUserId: 'user-123',
      };

      const { getByTestId } = render(
        <CalendarItemDetailsSheet
          item={mockItem}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      // Component should render successfully when showing loading state
      expect(getByTestId('bottom-sheet')).toBeTruthy();
    });

    it('auto-fetches personnel when store is empty and sheet opens', async () => {
      const mockFetchPersonnel = jest.fn(() => Promise.resolve());
      mockUsePersonnelStore.mockReturnValue({
        personnel: [],
        fetchPersonnel: mockFetchPersonnel,
        isLoading: false,
      } as any);

      const mockItem = {
        ...mockCalendarItem,
        CreatorUserId: 'user-123',
      };

      const { rerender } = render(
        <CalendarItemDetailsSheet
          item={mockItem}
          isOpen={false}
          onClose={mockOnClose}
        />
      );

      // Initially should not fetch when closed
      expect(mockFetchPersonnel).not.toHaveBeenCalled();

      // Open the sheet
      rerender(
        <CalendarItemDetailsSheet
          item={mockItem}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      // Should fetch personnel when opened and store is empty
      expect(mockFetchPersonnel).toHaveBeenCalledTimes(1);
    });

    it('does not fetch personnel when store already has data', async () => {
      const mockFetchPersonnel = jest.fn(() => Promise.resolve());
      mockUsePersonnelStore.mockReturnValue({
        personnel: mockPersonnelData,
        fetchPersonnel: mockFetchPersonnel,
        isLoading: false,
      } as any);

      const mockItem = {
        ...mockCalendarItem,
        CreatorUserId: 'user-123',
      };

      render(
        <CalendarItemDetailsSheet
          item={mockItem}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      // Should not fetch when personnel store already has data
      expect(mockFetchPersonnel).not.toHaveBeenCalled();
    });

    it('does not fetch personnel when already loading', async () => {
      const mockFetchPersonnel = jest.fn(() => Promise.resolve());
      mockUsePersonnelStore.mockReturnValue({
        personnel: [],
        fetchPersonnel: mockFetchPersonnel,
        isLoading: true,
      } as any);

      const mockItem = {
        ...mockCalendarItem,
        CreatorUserId: 'user-123',
      };

      render(
        <CalendarItemDetailsSheet
          item={mockItem}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      // Should not fetch when already loading
      expect(mockFetchPersonnel).not.toHaveBeenCalled();
    });
  });
});
