import React from 'react';
import { render } from '@testing-library/react-native';

import { CalendarItemDetailsSheet } from '../calendar-item-details-sheet';
import { useAnalytics } from '@/hooks/use-analytics';
import { type CalendarItemResultData } from '@/models/v4/calendar/calendarItemResultData';

// Mock aptabase first
jest.mock('@aptabase/react-native', () => ({
  trackEvent: jest.fn(),
}));

// Mock all dependencies to focus on analytics
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('@/hooks/use-analytics');
jest.mock('@/stores/calendar/store', () => ({
  useCalendarStore: () => ({
    setCalendarItemAttendingStatus: jest.fn(),
    isAttendanceLoading: false,
    attendanceError: null,
  }),
}));

// Mock React Native
jest.mock('react-native', () => ({
  Alert: { alert: jest.fn() },
  ScrollView: ({ children }: any) => children,
}));

// Mock all UI components
jest.mock('lucide-react-native', () => new Proxy({}, {
  get: () => () => 'Icon'
}));

jest.mock('@/components/common/loading', () => ({
  Loading: () => 'Loading',
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: any) => children,
}));

jest.mock('@/components/ui/bottom-sheet', () => ({
  CustomBottomSheet: ({ children, isOpen }: any) => isOpen ? children : null,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children }: any) => children,
  ButtonText: ({ children }: any) => children,
}));

jest.mock('@/components/ui/heading', () => ({
  Heading: ({ children }: any) => children,
}));

jest.mock('@/components/ui/hstack', () => ({
  HStack: ({ children }: any) => children,
}));

jest.mock('@/components/ui/input', () => ({
  Input: ({ children }: any) => children,
  InputField: () => 'InputField',
}));

jest.mock('@/components/ui/text', () => ({
  Text: ({ children }: any) => children,
}));

jest.mock('@/components/ui/vstack', () => ({
  VStack: ({ children }: any) => children,
}));

describe('CalendarItemDetailsSheet - Analytics Only', () => {
  const mockTrackEvent = jest.fn();
  const mockOnClose = jest.fn();

  const mockCalendarItem: CalendarItemResultData = {
    CalendarItemId: 'test-item-1',
    Title: 'Test Event',
    Start: '2025-08-20T09:00:00Z',
    StartUtc: '2025-08-20T09:00:00Z',
    End: '2025-08-20T10:00:00Z',
    EndUtc: '2025-08-20T10:00:00Z',
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
    CreatorUserId: 'creator-1',
    Attending: false,
    TypeName: 'Meeting',
    TypeColor: '#3B82F6',
    Attendees: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useAnalytics as jest.Mock).mockReturnValue({
      trackEvent: mockTrackEvent,
    });
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
      attendeeCount: 0,
      signupType: 1,
      typeName: 'Meeting',
      timestamp: expect.any(String),
    });
  });

  it('does not track analytics when sheet is closed', () => {
    render(
      <CalendarItemDetailsSheet item={mockCalendarItem} isOpen={false} onClose={mockOnClose} />
    );

    expect(mockTrackEvent).not.toHaveBeenCalled();
  });

  it('does not track analytics when item is null', () => {
    render(
      <CalendarItemDetailsSheet item={null} isOpen={true} onClose={mockOnClose} />
    );

    expect(mockTrackEvent).not.toHaveBeenCalled();
  });

  it('tracks analytics when item changes', () => {
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
});
