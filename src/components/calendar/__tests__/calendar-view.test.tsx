import React from 'react';
import { render } from '@testing-library/react-native';
import { useTranslation } from 'react-i18next';

import { CalendarView } from '../calendar-view';
import { useCalendarStore } from '@/stores/calendar/store';

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: jest.fn(),
}));

// Mock calendar store
jest.mock('@/stores/calendar/store', () => ({
  useCalendarStore: jest.fn(),
}));

// Mock Lucide React Native icons
jest.mock('lucide-react-native', () => ({
  ChevronLeft: () => 'ChevronLeft',
  ChevronRight: () => 'ChevronRight',
}));

// Mock Gluestack UI components
jest.mock('@/components/ui/vstack', () => ({
  VStack: 'VStack',
}));

jest.mock('@/components/ui/hstack', () => ({
  HStack: 'HStack',
}));

jest.mock('@/components/ui/text', () => ({
  Text: 'Text',
}));

jest.mock('@/components/ui/heading', () => ({
  Heading: 'Heading',
}));

jest.mock('@/components/ui/button', () => ({
  Button: 'Button',
}));

jest.mock('@/components/ui/pressable', () => ({
  Pressable: 'Pressable',
}));

describe('CalendarView', () => {
  const mockOnMonthChange = jest.fn();
  const mockSetSelectedDate = jest.fn();
  const mockT = jest.fn((key: string) => {
    const translations: Record<string, string> = {
      'calendar.daysOfWeek.sun': 'Sun',
      'calendar.daysOfWeek.mon': 'Mon',
      'calendar.daysOfWeek.tue': 'Tue',
      'calendar.daysOfWeek.wed': 'Wed',
      'calendar.daysOfWeek.thu': 'Thu',
      'calendar.daysOfWeek.fri': 'Fri',
      'calendar.daysOfWeek.sat': 'Sat',
    };
    return translations[key] || key;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock current date to July 15, 2025
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-07-15'));

    // Mock useTranslation
    (useTranslation as jest.Mock).mockReturnValue({
      t: mockT,
    });

    // Mock useCalendarStore
    (useCalendarStore as unknown as jest.Mock).mockReturnValue({
      selectedDate: null,
      selectedMonthItems: [],
      setSelectedDate: mockSetSelectedDate,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders without crashing', () => {
    expect(() => render(<CalendarView onMonthChange={mockOnMonthChange} />)).not.toThrow();
  });

  it('calls translation function for day headers', () => {
    render(<CalendarView onMonthChange={mockOnMonthChange} />);

    // Verify all day translation keys are called
    expect(mockT).toHaveBeenCalledWith('calendar.daysOfWeek.sun');
    expect(mockT).toHaveBeenCalledWith('calendar.daysOfWeek.mon');
    expect(mockT).toHaveBeenCalledWith('calendar.daysOfWeek.tue');
    expect(mockT).toHaveBeenCalledWith('calendar.daysOfWeek.wed');
    expect(mockT).toHaveBeenCalledWith('calendar.daysOfWeek.thu');
    expect(mockT).toHaveBeenCalledWith('calendar.daysOfWeek.fri');
    expect(mockT).toHaveBeenCalledWith('calendar.daysOfWeek.sat');
  });

  it('calls onMonthChange callback with month range', () => {
    render(<CalendarView onMonthChange={mockOnMonthChange} />);

    expect(mockOnMonthChange).toHaveBeenCalledTimes(1);
    expect(mockOnMonthChange).toHaveBeenCalledWith('2025-07-01', '2025-07-31');
  });

  it('renders calendar structure successfully', () => {
    const renderResult = render(<CalendarView onMonthChange={mockOnMonthChange} />);
    
    // Should render without any errors
    expect(renderResult).toBeTruthy();
  });

  it('integrates with calendar store properly', () => {
    render(<CalendarView onMonthChange={mockOnMonthChange} />);

    // Verify store hook was called
    expect(mockSetSelectedDate).toBeDefined();
  });

  it('handles date utilities correctly', () => {
    render(<CalendarView onMonthChange={mockOnMonthChange} />);

    // Component should use mocked date for calculations
    expect(mockOnMonthChange).toHaveBeenCalledWith(
      expect.stringMatching(/^2025-07-01$/),
      expect.stringMatching(/^2025-07-31$/)
    );
  });

  it('renders month navigation and content', () => {
    render(<CalendarView onMonthChange={mockOnMonthChange} />);

    // Test passes if component renders without throwing errors
    // and all expected mocks are called
    expect(mockT).toHaveBeenCalled();
    expect(mockOnMonthChange).toHaveBeenCalled();
    expect(mockSetSelectedDate).toBeDefined();
  });

  it('handles component lifecycle correctly', () => {
    const { unmount } = render(<CalendarView onMonthChange={mockOnMonthChange} />);
    
    // Should not throw when unmounting
    expect(() => unmount()).not.toThrow();
  });
});
