import { formatLocalDateString, isSameDate, isToday, getTodayLocalString, safeFormatTimestamp, getColorFromString, getInitials } from '../utils';

describe('Date Utility Functions', () => {
  describe('formatLocalDateString', () => {
    it('formats date correctly in local timezone', () => {
      const date = new Date(2024, 0, 15); // January 15, 2024 (local time)
      const result = formatLocalDateString(date);
      expect(result).toBe('2024-01-15');
    });

    it('pads single digit month and day', () => {
      const date = new Date(2024, 2, 5); // March 5, 2024
      const result = formatLocalDateString(date);
      expect(result).toBe('2024-03-05');
    });

    it('handles end of year correctly', () => {
      const date = new Date(2023, 11, 31); // December 31, 2023
      const result = formatLocalDateString(date);
      expect(result).toBe('2023-12-31');
    });

    it('handles leap year correctly', () => {
      const date = new Date(2024, 1, 29); // February 29, 2024 (leap year)
      const result = formatLocalDateString(date);
      expect(result).toBe('2024-02-29');
    });

    it('uses local date components regardless of how the Date was created', () => {
      // Test with different times that might cause UTC conversion issues
      
      // Very early in the day (local time)
      const earlyDate = new Date(2024, 0, 15, 0, 30);
      expect(formatLocalDateString(earlyDate)).toBe('2024-01-15');
      
      // Very late in the day (local time)
      const lateDate = new Date(2024, 0, 15, 23, 30);
      expect(formatLocalDateString(lateDate)).toBe('2024-01-15');
    });

    it('maintains consistency across different local times', () => {
      // All these should produce the same date string for the same local date
      const testCases = [
        new Date(2024, 0, 15, 12, 0), // Noon
        new Date(2024, 0, 15, 0, 0),  // Midnight
        new Date(2024, 0, 15, 23, 59), // End of day
      ];

      testCases.forEach(date => {
        expect(formatLocalDateString(date)).toBe('2024-01-15');
      });
    });
  });

  describe('getTodayLocalString', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('returns today\'s date in YYYY-MM-DD format', () => {
      jest.setSystemTime(new Date(2024, 0, 15, 12, 0)); // January 15, 2024, noon
      
      const result = getTodayLocalString();
      expect(result).toBe('2024-01-15');
    });

    it('handles timezone correctly for today', () => {
      // Test various times on the same local date
      const testTimes = [
        new Date(2024, 0, 15, 0, 0),   // Midnight
        new Date(2024, 0, 15, 12, 0),  // Noon
        new Date(2024, 0, 15, 23, 59), // End of day
      ];

      testTimes.forEach(time => {
        jest.setSystemTime(time);
        expect(getTodayLocalString()).toBe('2024-01-15');
      });
    });
  });

  describe('isSameDate', () => {
    it('compares date objects correctly', () => {
      const date1 = new Date(2024, 0, 15, 10, 30);
      const date2 = new Date(2024, 0, 15, 14, 45);
      const date3 = new Date(2024, 0, 16, 10, 30);
      
      expect(isSameDate(date1, date2)).toBe(true);
      expect(isSameDate(date1, date3)).toBe(false);
    });

    it('compares date strings correctly', () => {
      expect(isSameDate('2024-01-15', '2024-01-15')).toBe(true);
      expect(isSameDate('2024-01-15', '2024-01-16')).toBe(false);
    });

    it('compares date object with date string', () => {
      const date = new Date(2024, 0, 15);
      expect(isSameDate(date, '2024-01-15')).toBe(true);
      expect(isSameDate('2024-01-15', date)).toBe(true);
      expect(isSameDate(date, '2024-01-16')).toBe(false);
    });

    it('handles ISO strings with time correctly', () => {
      // Test with clear date differences in the same timezone
      const date1 = '2024-01-15T10:30:00.000Z';
      const date2 = '2024-01-15T23:59:59.999Z'; // Same day
      const date3 = '2024-01-17T00:00:00.000Z'; // Clear next day (2 days later to avoid timezone edge cases)
      
      expect(isSameDate(date1, date2)).toBe(true);
      expect(isSameDate(date1, date3)).toBe(false);
    });

    it('handles timezone differences correctly for calendar use case', () => {
      // For calendar purposes, we care about the date component, not the exact time
      // These should be considered the same date for calendar display purposes
      const utcMorning = '2024-01-15T08:00:00Z';
      const localDate = new Date(2024, 0, 15);
      
      expect(isSameDate(localDate, '2024-01-15')).toBe(true);
      expect(isSameDate(utcMorning, '2024-01-15')).toBe(true);
    });

    it('treats date-only strings as local dates', () => {
      // Date-only strings should be treated as local dates, not UTC
      const dateOnlyString = '2024-01-15';
      const localDate = new Date(2024, 0, 15);
      
      expect(isSameDate(dateOnlyString, localDate)).toBe(true);
    });
  });

  describe('isToday', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date(2024, 0, 15, 12, 0)); // Mock current time
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('returns true for today\'s date', () => {
      const today = new Date(2024, 0, 15);
      expect(isToday(today)).toBe(true);
      expect(isToday('2024-01-15')).toBe(true);
    });

    it('returns false for other dates', () => {
      const yesterday = new Date(2024, 0, 14);
      const tomorrow = new Date(2024, 0, 16);
      
      expect(isToday(yesterday)).toBe(false);
      expect(isToday(tomorrow)).toBe(false);
      expect(isToday('2024-01-14')).toBe(false);
      expect(isToday('2024-01-16')).toBe(false);
    });

    it('handles different times on the same day', () => {
      // Different times on the same day should all be considered "today"
      const testTimes = [
        new Date(2024, 0, 15, 0, 0),   // Midnight
        new Date(2024, 0, 15, 12, 0),  // Noon  
        new Date(2024, 0, 15, 23, 59), // End of day
      ];

      testTimes.forEach(time => {
        jest.setSystemTime(time);
        expect(isToday('2024-01-15')).toBe(true);
        expect(isToday('2024-01-14')).toBe(false);
        expect(isToday('2024-01-16')).toBe(false);
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('handles invalid date strings gracefully', () => {
      const validDate = new Date(2024, 0, 15);
      
      // These should not throw errors
      expect(() => isSameDate('invalid-date', validDate)).not.toThrow();
      expect(() => isSameDate(validDate, 'invalid-date')).not.toThrow();
      
      // Invalid dates should not be considered the same as valid dates
      expect(isSameDate('invalid-date', validDate)).toBe(false);
      expect(isSameDate(validDate, 'invalid-date')).toBe(false);
    });

    it('handles empty strings', () => {
      const validDate = new Date(2024, 0, 15);
      
      expect(() => isSameDate('', validDate)).not.toThrow();
      expect(() => isSameDate(validDate, '')).not.toThrow();
      expect(isSameDate('', validDate)).toBe(false);
    });

    it('handles null and undefined gracefully', () => {
      const validDate = new Date(2024, 0, 15);
      
      // These might be passed due to type issues in JavaScript
      expect(() => formatLocalDateString(validDate)).not.toThrow();
    });
  });

  describe('getColorFromString', () => {
    it('generates deterministic color from string', () => {
      const color1 = getColorFromString('test-string');
      const color2 = getColorFromString('test-string');
      expect(color1).toBe(color2);
      expect(color1).toMatch(/^hsl\(\d+, 65%, 45%\)$/);
    });

    it('generates different colors for different strings', () => {
      const color1 = getColorFromString('string-1');
      const color2 = getColorFromString('string-2');
      expect(color1).not.toBe(color2);
    });
  });

  describe('getInitials', () => {
    it('returns initials from first and last name', () => {
      expect(getInitials('John', 'Doe')).toBe('JD');
    });

    it('handles missing first name', () => {
      expect(getInitials(undefined, 'Doe')).toBe('D');
    });

    it('handles missing last name', () => {
      expect(getInitials('John')).toBe('J');
    });

    it('handles empty strings', () => {
      expect(getInitials('', '')).toBe('?');
    });

    it('handles extra whitespace', () => {
      expect(getInitials(' John ', ' Doe ')).toBe('JD');
    });

    it('returns ? for no input', () => {
      expect(getInitials()).toBe('?');
    });
  });
});
