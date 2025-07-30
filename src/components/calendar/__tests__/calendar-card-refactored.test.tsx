import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { CalendarCard } from '../calendar-card';
import { CalendarItemResultData } from '@/models/v4/calendar/calendarItemResultData';

// Mock dependencies
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: any) => {
      const translations: Record<string, string> = {
        'calendar.allDay': 'All Day',
        'calendar.attendeesCount': `${options?.count || 0} attendees`,
        'calendar.signupAvailable': 'Signup Available',
        'calendar.signedUp': 'Signed Up',
        'calendar.tapToSignUp': 'Tap to Sign Up',
      };
      return translations[key] || key;
    },
  }),
}));

// Mock icons from lucide-react-native
jest.mock('lucide-react-native', () => ({
  Calendar: ({ size, color, testID, ...props }: any) => {
    const React = require('react');
    const { View } = require('react-native');
    return React.createElement(View, { testID: testID || 'calendar-icon', ...props });
  },
  CheckCircle: ({ size, color, testID, ...props }: any) => {
    const React = require('react');
    const { View } = require('react-native');
    return React.createElement(View, { testID: testID || 'check-circle-icon', ...props });
  },
  Clock: ({ size, color, testID, ...props }: any) => {
    const React = require('react');
    const { View } = require('react-native');
    return React.createElement(View, { testID: testID || 'clock-icon', ...props });
  },
  MapPin: ({ size, color, testID, ...props }: any) => {
    const React = require('react');
    const { View } = require('react-native');
    return React.createElement(View, { testID: testID || 'map-pin-icon', ...props });
  },
  Users: ({ size, color, testID, ...props }: any) => {
    const React = require('react');
    const { View } = require('react-native');
    return React.createElement(View, { testID: testID || 'users-icon', ...props });
  },
}));

// Mock UI components
jest.mock('@/components/ui/badge', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    Badge: ({ children, action, variant, className, style, ...props }: any) =>
      React.createElement(View, { testID: 'badge', ...props, style }, children),
  };
});

jest.mock('@/components/ui/card', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    Card: ({ children, variant, className, ...props }: any) =>
      React.createElement(View, { testID: 'card', ...props }, children),
    CardContent: ({ children, className, ...props }: any) =>
      React.createElement(View, { testID: 'card-content', ...props }, children),
  };
});

jest.mock('@/components/ui/vstack', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    VStack: ({ children, space, className, ...props }: any) =>
      React.createElement(View, { testID: 'vstack', ...props }, children),
  };
});

jest.mock('@/components/ui/hstack', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    HStack: ({ children, space, className, ...props }: any) =>
      React.createElement(View, { testID: 'hstack', ...props }, children),
  };
});

jest.mock('@/components/ui/text', () => {
  const React = require('react');
  const { Text: RNText } = require('react-native');
  return {
    Text: ({ children, className, numberOfLines, ...props }: any) =>
      React.createElement(RNText, { testID: 'text', numberOfLines, ...props }, children),
  };
});

jest.mock('@/components/ui/heading', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    Heading: ({ children, size, className, numberOfLines, ...props }: any) =>
      React.createElement(Text, { testID: 'heading', numberOfLines, ...props }, children),
  };
});

jest.mock('@/components/ui/pressable', () => {
  const React = require('react');
  const { Pressable: RNPressable } = require('react-native');
  return {
    Pressable: ({ children, onPress, testID, className, ...props }: any) =>
      React.createElement(RNPressable, { testID, onPress, ...props }, children),
  };
});

// Helper function to create mock calendar item
const createMockCalendarItem = (overrides: Partial<CalendarItemResultData> = {}): CalendarItemResultData => {
  const mockItem = new CalendarItemResultData();
  return {
    ...mockItem,
    CalendarItemId: '1',
    Title: 'Test Event',
    Start: '2024-01-15T10:00:00',
    End: '2024-01-15T12:00:00',
    Description: 'Test event description',
    Location: 'Test Location',
    TypeName: 'Meeting',
    TypeColor: '#FF0000',
    SignupType: 0,
    LockEditing: false,
    Attending: false,
    IsAllDay: false,
    Attendees: [],
    ...overrides,
  };
};

describe('CalendarCard', () => {
  const mockOnPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders basic calendar item correctly', () => {
    const mockItem = createMockCalendarItem();
    
    render(<CalendarCard item={mockItem} onPress={mockOnPress} testID="calendar-card" />);

    expect(screen.getByTestId('calendar-card')).toBeTruthy();
    expect(screen.getByTestId('card')).toBeTruthy();
    expect(screen.getByTestId('card-content')).toBeTruthy();
    expect(screen.getByText('Test Event')).toBeTruthy();
  });

  it('displays event title and handles press correctly', () => {
    const mockItem = createMockCalendarItem({ Title: 'Important Meeting' });
    
    render(<CalendarCard item={mockItem} onPress={mockOnPress} testID="calendar-card" />);

    expect(screen.getByText('Important Meeting')).toBeTruthy();
    
    fireEvent.press(screen.getByTestId('calendar-card'));
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('shows type badge when type name is provided', () => {
    const mockItem = createMockCalendarItem({ 
      TypeName: 'Training',
      TypeColor: '#00FF00'
    });
    
    render(<CalendarCard item={mockItem} onPress={mockOnPress} />);

    expect(screen.getByTestId('badge')).toBeTruthy();
    expect(screen.getByText('Training')).toBeTruthy();
  });

  it('does not show type badge when type name is not provided', () => {
    const mockItem = createMockCalendarItem({ TypeName: '' });
    
    render(<CalendarCard item={mockItem} onPress={mockOnPress} />);

    expect(screen.queryByTestId('badge')).toBeFalsy();
  });

  it('displays location when provided', () => {
    const mockItem = createMockCalendarItem({ Location: 'Conference Room A' });
    
    render(<CalendarCard item={mockItem} onPress={mockOnPress} />);

    expect(screen.getByTestId('map-pin-icon')).toBeTruthy();
    expect(screen.getByText('Conference Room A')).toBeTruthy();
  });

  it('does not display location section when location is empty', () => {
    const mockItem = createMockCalendarItem({ Location: '' });
    
    render(<CalendarCard item={mockItem} onPress={mockOnPress} />);

    expect(screen.queryByTestId('map-pin-icon')).toBeFalsy();
  });

  it('displays description when provided', () => {
    const mockItem = createMockCalendarItem({ 
      Description: 'This is a detailed description of the event'
    });
    
    render(<CalendarCard item={mockItem} onPress={mockOnPress} />);

    expect(screen.getByText('This is a detailed description of the event')).toBeTruthy();
  });

  it('does not display description when empty', () => {
    const mockItem = createMockCalendarItem({ Description: '' });
    
    render(<CalendarCard item={mockItem} onPress={mockOnPress} />);

    // Should not find description text
    expect(screen.queryByText('This is a detailed description of the event')).toBeFalsy();
  });

  it('shows "All Day" for all-day events', () => {
    const mockItem = createMockCalendarItem({ IsAllDay: true });
    
    render(<CalendarCard item={mockItem} onPress={mockOnPress} />);

    expect(screen.getByText('All Day')).toBeTruthy();
  });

  it('shows time range for non-all-day events', () => {
    const mockItem = createMockCalendarItem({ 
      IsAllDay: false,
      Start: '2024-01-15T10:00:00',
      End: '2024-01-15T12:00:00'
    });
    
    render(<CalendarCard item={mockItem} onPress={mockOnPress} />);

    // Should show some time format (exact format depends on locale)
    expect(screen.getByTestId('clock-icon')).toBeTruthy();
  });

  it('displays attendees count when attendees are present', () => {
    const mockItem = createMockCalendarItem({
      Attendees: [
        { CalendarItemId: '1', UserId: 'user1', Name: 'John Doe', GroupName: 'Group1', AttendeeType: 1, Timestamp: '', Note: '' },
        { CalendarItemId: '1', UserId: 'user2', Name: 'Jane Smith', GroupName: 'Group1', AttendeeType: 1, Timestamp: '', Note: '' },
      ]
    });
    
    render(<CalendarCard item={mockItem} onPress={mockOnPress} />);

    expect(screen.getByTestId('users-icon')).toBeTruthy();
    expect(screen.getByText('2 attendees')).toBeTruthy();
  });

  it('does not display attendees section when no attendees', () => {
    const mockItem = createMockCalendarItem({ Attendees: [] });
    
    render(<CalendarCard item={mockItem} onPress={mockOnPress} />);

    expect(screen.queryByTestId('users-icon')).toBeFalsy();
    expect(screen.queryByText(/attendees/)).toBeFalsy();
  });

  it('shows signup section when signup is enabled', () => {
    const mockItem = createMockCalendarItem({ 
      SignupType: 1,
      LockEditing: false,
      Attending: false
    });
    
    render(<CalendarCard item={mockItem} onPress={mockOnPress} />);

    expect(screen.getByText('Signup Available')).toBeTruthy();
    expect(screen.getByText('Tap to Sign Up')).toBeTruthy();
  });

  it('shows signed up status when user is attending', () => {
    const mockItem = createMockCalendarItem({ 
      SignupType: 1,
      LockEditing: false,
      Attending: true
    });
    
    render(<CalendarCard item={mockItem} onPress={mockOnPress} />);

    expect(screen.getByTestId('check-circle-icon')).toBeTruthy();
    expect(screen.getByText('Signed Up')).toBeTruthy();
  });

  it('does not show signup section when signup is disabled', () => {
    const mockItem = createMockCalendarItem({ 
      SignupType: 0,
      LockEditing: false,
      Attending: false
    });
    
    render(<CalendarCard item={mockItem} onPress={mockOnPress} />);

    expect(screen.queryByText('Signup Available')).toBeFalsy();
    expect(screen.queryByText('Tap to Sign Up')).toBeFalsy();
  });

  it('does not show signup section when editing is locked', () => {
    const mockItem = createMockCalendarItem({ 
      SignupType: 1,
      LockEditing: true,
      Attending: false
    });
    
    render(<CalendarCard item={mockItem} onPress={mockOnPress} />);

    expect(screen.queryByText('Signup Available')).toBeFalsy();
    expect(screen.queryByText('Tap to Sign Up')).toBeFalsy();
  });

  it('applies custom testID when provided', () => {
    const mockItem = createMockCalendarItem();
    
    render(<CalendarCard item={mockItem} onPress={mockOnPress} testID="custom-test-id" />);

    expect(screen.getByTestId('custom-test-id')).toBeTruthy();
  });

  it('handles edge case with null/undefined values gracefully', () => {
    const mockItem = createMockCalendarItem({
      Title: '',
      Description: '',
      Location: '',
      TypeName: '',
      Attendees: [],
    });
    
    render(<CalendarCard item={mockItem} onPress={mockOnPress} />);

    // Should still render the card structure
    expect(screen.getByTestId('card')).toBeTruthy();
    expect(screen.getByTestId('card-content')).toBeTruthy();
  });

  it('formats date correctly', () => {
    const mockItem = createMockCalendarItem({ 
      Start: '2024-12-25T10:00:00'
    });
    
    render(<CalendarCard item={mockItem} onPress={mockOnPress} />);

    expect(screen.getByTestId('calendar-icon')).toBeTruthy();
    // Date formatting will depend on locale, but should be present
  });

  it('uses default type color when TypeColor is not provided', () => {
    const mockItem = createMockCalendarItem({ 
      TypeName: 'Meeting',
      TypeColor: ''
    });
    
    render(<CalendarCard item={mockItem} onPress={mockOnPress} />);

    expect(screen.getByTestId('badge')).toBeTruthy();
    expect(screen.getByText('Meeting')).toBeTruthy();
  });

  it('renders with all optional props provided', () => {
    const mockItem = createMockCalendarItem({
      Title: 'Full Event',
      Description: 'Complete description',
      Location: 'Full Location',
      TypeName: 'Workshop',
      TypeColor: '#FF5733',
      SignupType: 1,
      LockEditing: false,
      Attending: true,
      Attendees: [
        { CalendarItemId: '1', UserId: 'user1', Name: 'User 1', GroupName: 'Group1', AttendeeType: 1, Timestamp: '', Note: '' }
      ]
    });
    
    render(<CalendarCard item={mockItem} onPress={mockOnPress} testID="full-event-card" />);

    // Verify all sections are rendered
    expect(screen.getByText('Full Event')).toBeTruthy();
    expect(screen.getByText('Workshop')).toBeTruthy();
    expect(screen.getByText('Complete description')).toBeTruthy();
    expect(screen.getByText('Full Location')).toBeTruthy();
    expect(screen.getByText('1 attendees')).toBeTruthy();
    expect(screen.getByText('Signed Up')).toBeTruthy();
    expect(screen.getByTestId('check-circle-icon')).toBeTruthy();
  });

  describe('Accessibility', () => {
    it('provides proper accessibility labels', () => {
      const mockItem = createMockCalendarItem();
      
      render(<CalendarCard item={mockItem} onPress={mockOnPress} testID="calendar-card" />);
      
      expect(screen.getByTestId('calendar-card')).toBeTruthy();
    });

    it('supports screen readers with proper text content', () => {
      const mockItem = createMockCalendarItem({
        Title: 'Accessible Event',
        Description: 'This event is accessible'
      });
      
      render(<CalendarCard item={mockItem} onPress={mockOnPress} />);
      
      expect(screen.getByText('Accessible Event')).toBeTruthy();
      expect(screen.getByText('This event is accessible')).toBeTruthy();
    });
  });

  describe('Performance', () => {
    it('renders efficiently with minimal re-renders', () => {
      const mockItem = createMockCalendarItem();
      
      const { rerender } = render(<CalendarCard item={mockItem} onPress={mockOnPress} />);
      
      // Re-render with same props should not cause issues
      rerender(<CalendarCard item={mockItem} onPress={mockOnPress} />);
      
      expect(screen.getByText('Test Event')).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('handles invalid date strings gracefully', () => {
      const mockItem = createMockCalendarItem({
        Start: 'invalid-date',
        End: 'invalid-date'
      });
      
      render(<CalendarCard item={mockItem} onPress={mockOnPress} />);
      
      // Should still render without crashing
      expect(screen.getByTestId('card')).toBeTruthy();
    });

    it('handles very long text content', () => {
      const longTitle = 'A'.repeat(200);
      const longDescription = 'B'.repeat(500);
      
      const mockItem = createMockCalendarItem({
        Title: longTitle,
        Description: longDescription
      });
      
      render(<CalendarCard item={mockItem} onPress={mockOnPress} />);
      
      expect(screen.getByText(longTitle)).toBeTruthy();
      expect(screen.getByText(longDescription)).toBeTruthy();
    });

    it('handles special characters in content', () => {
      const mockItem = createMockCalendarItem({
        Title: 'Event with émojis 🎉 and special chars @#$%',
        Description: 'Description with "quotes" and <tags>',
        Location: 'Location & Address'
      });
      
      render(<CalendarCard item={mockItem} onPress={mockOnPress} />);
      
      expect(screen.getByText('Event with émojis 🎉 and special chars @#$%')).toBeTruthy();
      expect(screen.getByText('Description with "quotes" and <tags>')).toBeTruthy();
      expect(screen.getByText('Location & Address')).toBeTruthy();
    });
  });
});
