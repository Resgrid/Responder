import { isSameDate, isToday } from '../utils';

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
