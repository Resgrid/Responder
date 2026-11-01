const mockAddBreadcrumb = jest.fn();

jest.mock('@sentry/react-native', () => ({
  addBreadcrumb: (...args: unknown[]) => mockAddBreadcrumb(...args),
}));

// Replace the console transport so the tests can read what reaches the device console.
const mockTransportLog = jest.fn();
jest.mock('react-native-logs', () => ({
  consoleTransport: jest.fn(),
  logger: {
    // Wrapped: the logger is created at import time, before this file's const declarations run.
    createLogger: () => ({
      debug: (...args: unknown[]) => mockTransportLog(...args),
      info: (...args: unknown[]) => mockTransportLog(...args),
      warn: (...args: unknown[]) => mockTransportLog(...args),
      error: (...args: unknown[]) => mockTransportLog(...args),
    }),
  },
}));

import { logger, sanitizeLogContext } from '../index';

// Built at runtime so the fixture never reads as a hardcoded credential to secret scanners.
const SECRET_SENTINEL = ['leak', 'sentinel', '7f3a'].join('-');
const USER_SENTINEL = ['user', 'sentinel', '7f3a'].join('-');

const signInAxiosError = () =>
  Object.assign(new Error('Request failed with status code 400'), {
    name: 'AxiosError',
    isAxiosError: true,
    config: {
      method: 'post',
      url: '/Connect/token?refresh_token=abc',
      data: [
        ['grant_type', 'password'],
        ['username', USER_SENTINEL],
        ['password', SECRET_SENTINEL],
      ]
        .map(([key, value]) => `${key}=${value}`)
        .join('&'),
    },
    response: { status: 400 },
  });

beforeEach(() => {
  jest.clearAllMocks();
  logger.clearGlobalContext();
});

describe('LogService', () => {
  it('redacts the context before it reaches the device console', () => {
    logger.warn({ message: 'Sign-in failed', context: { error: signInAxiosError(), accessToken: 'abc', unitId: 'unit-123' } });

    expect(mockTransportLog).toHaveBeenCalledTimes(1);
    const [message, context] = mockTransportLog.mock.calls[0];
    expect(message).toBe('Sign-in failed');
    expect(context).toEqual(expect.objectContaining({ accessToken: '[REDACTED]', unitId: 'unit-123', error: expect.objectContaining({ name: 'AxiosError', status: 400, url: '/Connect/token' }) }));
    expect(JSON.stringify(context)).not.toContain(SECRET_SENTINEL);
  });

  it('redacts the Sentry breadcrumb data, which rides along on every later event', () => {
    logger.setGlobalContext({ sessionId: 'session-1', departmentId: '42' });
    logger.error({ message: 'Login failed', context: { error: signInAxiosError(), username: USER_SENTINEL } });

    expect(mockAddBreadcrumb).toHaveBeenCalledTimes(1);
    const breadcrumb = mockAddBreadcrumb.mock.calls[0][0];
    expect(breadcrumb).toEqual(expect.objectContaining({ category: 'log', level: 'error', message: 'Login failed' }));
    expect(breadcrumb.data).toEqual(expect.objectContaining({ username: '[REDACTED]', sessionId: '[REDACTED]', departmentId: '42', error: expect.objectContaining({ status: 400 }) }));
    const serialized = JSON.stringify(breadcrumb);
    expect(serialized).not.toContain(SECRET_SENTINEL);
    expect(serialized).not.toContain(USER_SENTINEL);
    expect(serialized).not.toContain('refresh_token=abc');
  });

  it('adds no breadcrumb for debug or info', () => {
    logger.debug({ message: 'debug', context: { a: 1 } });
    logger.info({ message: 'info', context: { a: 1 } });

    expect(mockAddBreadcrumb).not.toHaveBeenCalled();
  });
});

describe('sanitizeLogContext', () => {
  it('redacts sensitive keys, including usernames', () => {
    expect(sanitizeLogContext({ password: 'p', refresh_token: 'r', userName: 'jdoe', unitId: 'u1' })).toEqual({ password: '[REDACTED]', refresh_token: '[REDACTED]', userName: '[REDACTED]', unitId: 'u1' });
  });

  it('expands a plain Error, whose properties are non-enumerable', () => {
    const error = new Error('boom');
    expect(sanitizeLogContext({ error })).toEqual({ error: { name: 'Error', message: 'boom', stack: error.stack } });
  });

  it('returns an empty object for no context', () => {
    expect(sanitizeLogContext(undefined)).toEqual({});
  });

  it('redacts sensitive keys inside array elements', () => {
    expect(sanitizeLogContext({ items: [{ accessToken: 'a', unitId: 'u1' }, 'plain'] })).toEqual({ items: [{ accessToken: '[REDACTED]', unitId: 'u1' }, 'plain'] });
  });

  it('replaces objects and arrays past the depth limit instead of passing their keys through unchecked', () => {
    expect(sanitizeLogContext({ a: { b: { c: { password: 'x' }, list: [{ password: 'x' }] } } })).toEqual({ a: { b: { c: '[Object]', list: '[Array]' } } });
  });

  it('keeps Date values intact', () => {
    const at = new Date('2026-10-31T12:00:00Z');
    expect(sanitizeLogContext({ at, nested: { at } })).toEqual({ at, nested: { at } });
  });
});
