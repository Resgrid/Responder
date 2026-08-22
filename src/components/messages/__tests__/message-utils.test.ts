import { describe, expect, it, jest } from '@jest/globals';

import { parseDateISOString } from '@/lib/utils';

import { isMessageExpired } from '../message-utils';

jest.mock('@/lib/utils', () => {
  const actual = jest.requireActual('@/lib/utils') as typeof import('@/lib/utils');
  return {
    ...actual,
    parseDateISOString: jest.fn(actual.parseDateISOString),
  };
});

const mockParseDateISOString = parseDateISOString as jest.MockedFunction<typeof parseDateISOString>;

describe('isMessageExpired', () => {
  it('should treat a missing expiration as not expired', () => {
    expect(isMessageExpired(undefined)).toBe(false);
    expect(isMessageExpired(null)).toBe(false);
    expect(isMessageExpired('')).toBe(false);
  });

  it('should parse the timestamp with parseDateISOString rather than the bare Date constructor', () => {
    mockParseDateISOString.mockClear();

    isMessageExpired('2020-01-01 08:30:00');

    expect(mockParseDateISOString).toHaveBeenCalledWith('2020-01-01 08:30:00');
  });

  it('should treat an offsetless server timestamp as local time', () => {
    // Built from local clock parts so the assertion holds in any device timezone. A bare
    // `new Date(...)` on an offsetless, space-separated stamp shifts by the UTC offset (or
    // yields Invalid Date on Hermes), which would flip these results.
    const pad = (value: number) => value.toString().padStart(2, '0');
    const format = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000);

    expect(isMessageExpired(format(oneHourAgo))).toBe(true);
    expect(isMessageExpired(format(oneHourFromNow))).toBe(false);
  });

  it('should honour an explicit UTC offset on the timestamp', () => {
    expect(isMessageExpired(new Date(Date.now() - 60 * 60 * 1000).toISOString())).toBe(true);
    expect(isMessageExpired(new Date(Date.now() + 60 * 60 * 1000).toISOString())).toBe(false);
  });

  it('should not expire a message when the timestamp cannot be parsed', () => {
    expect(isMessageExpired('not-a-date')).toBe(false);
  });
});
