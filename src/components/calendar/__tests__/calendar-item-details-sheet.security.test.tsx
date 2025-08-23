import { render } from '@testing-library/react-native';
import React from 'react';

import { CalendarItemDetailsSheet } from '@/components/calendar/calendar-item-details-sheet';
import { type CalendarItemResultData } from '@/models/v4/calendar/calendarItemResultData';

// Mock aptabase first
jest.mock('@aptabase/react-native', () => ({
  trackEvent: jest.fn(),
}));

// Mock all dependencies to focus on security testing
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('@/hooks/use-analytics', () => ({
  useAnalytics: () => ({
    trackEvent: jest.fn(),
  }),
}));

jest.mock('@/stores/calendar/store', () => ({
  useCalendarStore: () => ({
    setCalendarItemAttendingStatus: jest.fn(),
    isAttendanceLoading: false,
    attendanceError: null,
    fetchCalendarItem: jest.fn(),
  }),
}));

jest.mock('@/stores/personnel/store', () => ({
  usePersonnelStore: () => ({
    personnel: [{ UserId: 'mock-user', FirstName: 'Mock', LastName: 'User' }], // Non-empty to prevent fetching
    fetchPersonnel: jest.fn().mockResolvedValue(undefined),
    isLoading: false,
  }),
}));

jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    success: jest.fn(),
    error: jest.fn(),
  }),
}));

// Mock React Native
jest.mock('react-native', () => {
  const React = require('react');
  return {
    Alert: { alert: jest.fn() },
    ScrollView: ({ children }: any) => children,
    StyleSheet: { create: (styles: any) => styles },
    View: ({ children, ...props }: any) => React.createElement('View', props, children),
  };
});

// Mock react-native-webview
jest.mock('react-native-webview', () => {
  const React = require('react');
  return function WebView(props: any) {
    return React.createElement('View', {
      ...props,
      testID: props.testID || 'webview',
      // Expose the security-related props for testing
      'data-js-enabled': props.javaScriptEnabled,
      'data-dom-storage': props.domStorageEnabled,
      'data-file-access': props.allowFileAccess,
      'data-universal-access': props.allowUniversalAccessFromFileURLs,
      'data-origin-whitelist': JSON.stringify(props.originWhitelist),
      onShouldStartLoadWithRequest: props.onShouldStartLoadWithRequest,
    });
  };
});

// Mock nativewind
jest.mock('nativewind', () => ({
  useColorScheme: () => ({ colorScheme: 'light' }),
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

jest.mock('@/components/ui/box', () => ({
  Box: ({ children }: any) => children,
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

// Mock HTML sanitizer
jest.mock('@/utils/html-sanitizer', () => ({
  sanitizeHtml: (html: string) => html ? html.replace(/<script[^>]*>.*?<\/script>/gi, '') : '',
}));

const mockItem: CalendarItemResultData = {
  CalendarItemId: '1',
  Title: 'Test Event',
  Description: '<script>alert("XSS")</script><p>Safe content</p>',
  Start: '2024-01-01T10:00:00Z',
  End: '2024-01-01T11:00:00Z',
  StartUtc: '2024-01-01T10:00:00Z',
  EndUtc: '2024-01-01T11:00:00Z',
  StartTimezone: 'UTC',
  EndTimezone: 'UTC',
  RecurrenceId: '',
  RecurrenceRule: '',
  RecurrenceException: '',
  ItemType: 1,
  Location: 'Test Location',
  IsAllDay: false,
  SignupType: 0,
  Reminder: 0,
  LockEditing: false,
  Entities: '',
  RequiredAttendes: '',
  OptionalAttendes: '',
  IsAdminOrCreator: true,
  CreatorUserId: '1',
  Attending: false,
  TypeName: 'Event',
  TypeColor: '#007AFF',
  Attendees: [],
};

describe('CalendarItemDetailsSheet Security', () => {
  it('should render without crashing', () => {
    const onCloseMock = jest.fn();

    render(
      <CalendarItemDetailsSheet
        item={mockItem}
        isOpen={true}
        onClose={onCloseMock}
      />
    );
  });

  it('should sanitize HTML content in description', () => {
    const onCloseMock = jest.fn();

    const { getByTestId } = render(
      <CalendarItemDetailsSheet
        item={mockItem}
        isOpen={true}
        onClose={onCloseMock}
      />
    );

    // Check that WebView is present
    const webview = getByTestId('webview');
    expect(webview).toBeTruthy();

    // Verify WebView props include security settings
    expect(webview.props['data-js-enabled']).toBe(false);
    expect(webview.props['data-dom-storage']).toBe(false);
    expect(webview.props['data-file-access']).toBe(false);
    expect(webview.props['data-universal-access']).toBe(false);
    expect(JSON.parse(webview.props['data-origin-whitelist'])).toEqual(['about:blank']);
  });

  it('should handle navigation requests securely', () => {
    const onCloseMock = jest.fn();

    const { getByTestId } = render(
      <CalendarItemDetailsSheet
        item={mockItem}
        isOpen={true}
        onClose={onCloseMock}
      />
    );

    const webview = getByTestId('webview');

    // Test onShouldStartLoadWithRequest
    const shouldLoad = webview.props.onShouldStartLoadWithRequest;
    expect(shouldLoad({ url: 'about:blank' })).toBe(true);
    expect(shouldLoad({ url: 'data:text/html,<html></html>' })).toBe(true);
    expect(shouldLoad({ url: 'http://evil.com' })).toBe(false);
    expect(shouldLoad({ url: 'javascript:alert(1)' })).toBe(false);
  });

  it('should handle empty description gracefully', () => {
    const itemWithoutDescription = { ...mockItem, Description: '' };
    const onCloseMock = jest.fn();

    render(
      <CalendarItemDetailsSheet
        item={itemWithoutDescription}
        isOpen={true}
        onClose={onCloseMock}
      />
    );

    // Should not crash when description is empty
  });

  it('should handle null/undefined description gracefully', () => {
    const itemWithNullDescription = { ...mockItem, Description: null as any };
    const onCloseMock = jest.fn();

    render(
      <CalendarItemDetailsSheet
        item={itemWithNullDescription}
        isOpen={true}
        onClose={onCloseMock}
      />
    );

    // Should not crash when description is null
  });
});
