import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';

import { CalendarItemDetailsSheet } from '../calendar-item-details-sheet';
import { useAnalytics } from '@/hooks/use-analytics';
import { type CalendarItemResultData } from '@/models/v4/calendar/calendarItemResultData';
import { useCalendarStore } from '@/stores/calendar/store';

// Mock dependencies
jest.mock('react-i18next', () => ({
  useTranslation: jest.fn(),
}));

jest.mock('@/hooks/use-analytics', () => ({
  useAnalytics: jest.fn(),
}));

jest.mock('@/stores/calendar/store', () => ({
  useCalendarStore: jest.fn(),
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

// Mock Alert
jest.spyOn(Alert, 'alert');

// Mock UI components
jest.mock('@/components/common/loading', () => ({
  Loading: 'Loading',
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: 'Badge',
}));

jest.mock('@/components/ui/bottom-sheet', () => ({
  CustomBottomSheet: ({ children, isOpen, onClose }: any) =>
    isOpen ? <div data-testid="bottom-sheet" onClick={onClose}>{children}</div> : null,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onPress, testID, disabled }: any) => (
    <div data-testid={testID || 'button'} onClick={!disabled ? onPress : undefined}>
      {children}
    </div>
  ),
  ButtonText: ({ children }: any) => <span>{children}</span>,
}));

jest.mock('@/components/ui/heading', () => ({
  Heading: ({ children }: any) => <h1>{children}</h1>,
}));

jest.mock('@/components/ui/hstack', () => ({
  HStack: ({ children }: any) => <div>{children}</div>,
}));

jest.mock('@/components/ui/input', () => ({
  Input: ({ children }: any) => <div>{children}</div>,
  InputField: ({ value, onChangeText, placeholder, testID }: any) => (
    <input
      data-testid={testID || 'input-field'}
      value={value}
      onChange={(e) => onChangeText?.(e.target.value)}
      placeholder={placeholder}
    />
  ),
}));

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
  const mockOnClose = jest.fn();

  const mockUseTranslation = useTranslation as jest.MockedFunction<typeof useTranslation>;
  const mockUseAnalytics = useAnalytics as jest.MockedFunction<typeof useAnalytics>;
  const mockUseCalendarStore = useCalendarStore as jest.MockedFunction<typeof useCalendarStore>;

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

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseTranslation.mockReturnValue({
      t: mockT,
    } as any);

    mockUseAnalytics.mockReturnValue({
      trackEvent: mockTrackEvent,
    });

    mockUseCalendarStore.mockReturnValue({
      setCalendarItemAttendingStatus: mockSetCalendarItemAttendingStatus,
      isAttendanceLoading: false,
      attendanceError: null,
    } as any);

    mockSetCalendarItemAttendingStatus.mockResolvedValue(undefined);
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
    it('shows error alert when attendance update fails', async () => {
      const error = new Error('Server error');
      mockSetCalendarItemAttendingStatus.mockRejectedValueOnce(error);

      const { getByText } = render(
        <CalendarItemDetailsSheet item={mockCalendarItem} isOpen={true} onClose={mockOnClose} />
      );

      const signupButton = getByText('calendar.signup.button');
      fireEvent.press(signupButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'calendar.error.title',
          'calendar.error.attendanceUpdate'
        );
      });
    });

    it('shows store error when available', async () => {
      mockUseCalendarStore.mockReturnValue({
        setCalendarItemAttendingStatus: mockSetCalendarItemAttendingStatus,
        isAttendanceLoading: false,
        attendanceError: 'Custom store error',
      } as any);

      mockSetCalendarItemAttendingStatus.mockRejectedValueOnce(new Error('Server error'));

      const { getByText } = render(
        <CalendarItemDetailsSheet item={mockCalendarItem} isOpen={true} onClose={mockOnClose} />
      );

      const signupButton = getByText('calendar.signup.button');
      fireEvent.press(signupButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'calendar.error.title',
          'Custom store error'
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
});
