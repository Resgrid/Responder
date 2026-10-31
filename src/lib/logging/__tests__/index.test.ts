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

const signInAxiosError = () =>
  Object.assign(new Error('Request failed with status code 400'), {
    name: 'AxiosError',
    isAxiosError: true,
    config: { method: 'post', url: '/Connect/token?refresh_token=abc', data: 'username=jdoe&password=hunter2&grant_type=password' },
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
    expect(JSON.stringify(context)).not.toContain('hunter2');
  });

  it('redacts the Sentry breadcrumb data, which rides along on every later event', () => {
    logger.setGlobalContext({ sessionId: 'session-1', departmentId: '42' });
    logger.error({ message: 'Login failed', context: { error: signInAxiosError(), username: 'jdoe' } });

    expect(mockAddBreadcrumb).toHaveBeenCalledTimes(1);
    const breadcrumb = mockAddBreadcrumb.mock.calls[0][0];
    expect(breadcrumb).toEqual(expect.objectContaining({ category: 'log', level: 'error', message: 'Login failed' }));
    expect(breadcrumb.data).toEqual(expect.objectContaining({ username: '[REDACTED]', sessionId: '[REDACTED]', departmentId: '42', error: expect.objectContaining({ status: 400 }) }));
    const serialized = JSON.stringify(breadcrumb);
    expect(serialized).not.toContain('hunter2');
    expect(serialized).not.toContain('jdoe');
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
});
