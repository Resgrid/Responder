import { formatDateForDisplay, isSameDate, isToday, parseDateISOString } from '../utils';

describe('parseDateISOString', () => {
  it('respects an explicit UTC timezone instead of reading the clock digits as local', () => {
    const parsed = parseDateISOString('2026-07-19T04:13:22Z');
    expect(parsed.getTime()).toBe(new Date('2026-07-19T04:13:22Z').getTime());
  });

  it('respects an explicit offset timezone', () => {
    const parsed = parseDateISOString('2026-07-19T04:13:22-04:00');
    expect(parsed.getTime()).toBe(new Date('2026-07-19T04:13:22-04:00').getTime());
  });

  it('parses date-only strings as local midnight (no UTC shift)', () => {
    const parsed = parseDateISOString('2026-07-19');
    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(6);
    expect(parsed.getDate()).toBe(19);
    expect(parsed.getHours()).toBe(0);
  });

  it('parses offset-less datetimes as local time', () => {
    const parsed = parseDateISOString('2026-07-19T09:30:00');
    expect(parsed.getHours()).toBe(9);
    expect(parsed.getMinutes()).toBe(30);
  });
});

describe('formatDateForDisplay', () => {
  it('renders the messages format with a real hour and am/pm (regression: "h" and "amt"/"pmt")', () => {
    const pm = new Date(2026, 6, 19, 14, 5, 0);
    expect(formatDateForDisplay(pm, 'MMM dd, yyyy h:mm tt')).toBe('Jul 19, 2026 2:05 pm');

    const am = new Date(2026, 6, 19, 9, 30, 0);
    expect(formatDateForDisplay(am, 'MMM dd, yyyy h:mm tt')).toBe('Jul 19, 2026 9:30 am');
  });

  it('handles midnight and noon in 12-hour format', () => {
    expect(formatDateForDisplay(new Date(2026, 0, 1, 0, 5, 0), 'h:mm tt')).toBe('12:05 am');
    expect(formatDateForDisplay(new Date(2026, 0, 1, 12, 5, 0), 'h:mm tt')).toBe('12:05 pm');
  });

  it('does not corrupt month names containing "h" (March)', () => {
    expect(formatDateForDisplay(new Date(2026, 2, 3, 8, 15, 0), 'MMMM dd, yyyy hh:mm tt')).toBe('March 03, 2026 08:15 am');
  });

  it('still supports 24-hour and padded formats', () => {
    expect(formatDateForDisplay(new Date(2026, 6, 19, 14, 5, 0), 'MM/dd/yyyy HH:mm')).toBe('07/19/2026 14:05');
  });
});

describe('Date Utilities', () => {
  beforeEach(() => {
    // Mock the current date to be consistent
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-15T10:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('isSameDate', () => {
    it('should return true for same dates with different times', () => {
      const date1 = '2024-01-15T10:00:00Z';
      const date2 = '2024-01-15T23:59:59Z';
      
      expect(isSameDate(date1, date2)).toBe(true);
    });

    it('should return true for same dates in different timezones', () => {
      const date1 = '2024-01-15T10:00:00Z';
      const date2 = '2024-01-15T02:00:00-08:00'; // Same as 10:00 UTC
      
      expect(isSameDate(date1, date2)).toBe(true);
    });

    it('should return false for different dates', () => {
      const date1 = '2024-01-15T10:00:00Z';
      const date2 = '2024-01-16T10:00:00Z';
      
      expect(isSameDate(date1, date2)).toBe(false);
    });

    it('should handle Date objects', () => {
      const date1 = new Date('2024-01-15T10:00:00Z');
      const date2 = new Date('2024-01-15T23:00:00Z');
      
      expect(isSameDate(date1, date2)).toBe(true);
    });

    it('should handle mixed string and Date objects', () => {
      const date1 = '2024-01-15T10:00:00Z';
      const date2 = new Date('2024-01-15T23:00:00Z');
      
      expect(isSameDate(date1, date2)).toBe(true);
    });

    it('should return false for dates that are actually on different days', () => {
      // This test uses dates that are clearly on different days
      const date1 = '2024-01-15T12:00:00Z'; // Jan 15 UTC 
      const date2 = '2024-01-17T12:00:00Z'; // Jan 17 UTC (different day)
      
      expect(isSameDate(date1, date2)).toBe(false);
    });
  });

  describe('isToday', () => {
    it('should return true for today with different time', () => {
      const todayDifferentTime = '2024-01-15T23:30:00Z';
      
      expect(isToday(todayDifferentTime)).toBe(true);
    });

    it('should return false for yesterday', () => {
      const yesterday = '2024-01-14T10:00:00Z';
      
      expect(isToday(yesterday)).toBe(false);
    });

    it('should return false for tomorrow', () => {
      const tomorrow = '2024-01-16T10:00:00Z';
      
      expect(isToday(tomorrow)).toBe(false);
    });

    it('should handle Date objects', () => {
      const todayDate = new Date('2024-01-15T15:30:00Z');
      
      expect(isToday(todayDate)).toBe(true);
    });

    it('should handle timezone differences correctly', () => {
      // Same date in different timezone
      const todayPST = '2024-01-15T02:00:00-08:00';
      
      expect(isToday(todayPST)).toBe(true);
    });
  });
});
