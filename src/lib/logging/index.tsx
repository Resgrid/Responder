import * as Sentry from '@sentry/react-native';
import { consoleTransport, logger as rnLogger } from 'react-native-logs';

import type { LogContext, LogEntry, Logger, LogLevel } from './types';

// Substring match: any context key CONTAINING one of these fragments is redacted.
// This catches camelCase/snake_case variants (accessToken, refresh_token, id_token, ...)
// without having to enumerate every possible spelling.
const SENSITIVE_KEY_PARTS = ['token', 'password', 'passwd', 'secret', 'apikey', 'api_key', 'authorization', 'cred', 'email', 'ssn', 'saml', 'cookie', 'session', 'username', 'grant'];

// Exact-match keys too short to match as fragments without redacting unrelated words (author, authority).
const SENSITIVE_EXACT_KEYS = new Set(['auth']);

const isSensitiveKey = (key: string): boolean => {
  const lower = key.toLowerCase();
  return SENSITIVE_EXACT_KEYS.has(lower) || SENSITIVE_KEY_PARTS.some((part) => lower.includes(part));
};

// Strip query string and hash — URLs can carry credentials (e.g. access_token params).
const sanitizeUrl = (url: unknown): string | undefined => {
  if (typeof url !== 'string' || url.length === 0) return undefined;
  return url.split('?')[0].split('#')[0];
};

interface AxiosErrorLike {
  isAxiosError?: boolean;
  name?: string;
  message?: string;
  code?: string;
  config?: { method?: string; url?: string; baseURL?: string };
  response?: { status?: number };
}

// Axios errors carry the full request (incl. urlencoded password/token bodies in
// config.data) and response objects with circular refs. Never forward them raw —
// reduce to a safe summary instead.
const isAxiosErrorLike = (value: unknown): value is AxiosErrorLike => typeof value === 'object' && value !== null && ((value as AxiosErrorLike).isAxiosError === true || ('config' in value && 'message' in value));

const summarizeAxiosError = (error: AxiosErrorLike): Record<string, unknown> => ({
  name: error.name,
  message: error.message,
  code: error.code,
  status: error.response?.status,
  method: error.config?.method,
  url: sanitizeUrl(error.config?.url),
  baseURL: sanitizeUrl(error.config?.baseURL),
  isAxiosError: true,
});

const sanitizeValue = (key: string, value: unknown, depth: number): unknown => {
  if (isSensitiveKey(key)) return '[REDACTED]';
  if (isAxiosErrorLike(value)) return summarizeAxiosError(value);
  // Error instances have non-enumerable props; Object.keys() would yield {}.
  if (value instanceof Error) {
    return { name: value.name, message: value.message, stack: value.stack };
  }
  if (depth > 0 && value !== null && typeof value === 'object' && !Array.isArray(value)) {
    return sanitizeObject(value as Record<string, unknown>, depth - 1);
  }
  if (typeof value === 'function' || typeof value === 'symbol') return String(value);
  return value;
};

const sanitizeObject = (obj: Record<string, unknown>, depth: number): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(obj)) {
    result[key] = sanitizeValue(key, obj[key], depth);
  }
  return result;
};

export const sanitizeLogContext = (context: LogContext | undefined): LogContext => {
  if (!context) return {};
  return sanitizeObject(context as Record<string, unknown>, 2);
};

const config = {
  levels: {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  },
  severity: __DEV__ ? 'debug' : 'warn',
  transport: consoleTransport,
  // No `colors` here on purpose: ANSI escape codes (0x1B) end up in the console
  // string that Sentry captures as a breadcrumb, and the native SentryCrash JSON
  // codec rejects control characters ("Invalid character in ...") on every log line.
  transportOptions: {},
  async: true,
  dateFormat: 'time',
  printLevel: true,
  printDate: true,
  fixedExtLvlLength: false,
  enabled: true,
};

const LEVEL_VALUES: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };
const MIN_SEVERITY: number = LEVEL_VALUES[(config.severity as LogLevel) ?? 'warn'] ?? 2;

class LogService {
  private static instance: LogService;
  private logger: any;
  private globalContext: Record<string, unknown> = {};

  private constructor() {
    this.logger = rnLogger.createLogger(config as any);
  }

  public static getInstance(): LogService {
    if (!LogService.instance) {
      LogService.instance = new LogService();
    }
    return LogService.instance;
  }

  private log(level: LogLevel, { message, context = {} }: LogEntry): void {
    // Bail before sanitizing on hot paths (SignalR messages, GPS fixes) when the level would be filtered out anyway.
    if (LEVEL_VALUES[level] < MIN_SEVERITY) return;
    // Redacted once, before both the console transport and the Sentry breadcrumb: breadcrumbs ride along on every later
    // event, and a raw AxiosError carries the urlencoded password/token body in config.data.
    const safeContext = sanitizeLogContext({ ...this.globalContext, ...context });
    this.logger[level](message, {
      ...safeContext,
      timestamp: new Date().toISOString(),
    });

    // Add log breadcrumb to Sentry for error/warn levels
    // Provides rich debugging context when errors occur
    if (level === 'error' || level === 'warn') {
      try {
        Sentry.addBreadcrumb({
          category: 'log',
          level: level === 'error' ? 'error' : 'warning',
          message: String(message),
          data: safeContext,
          timestamp: Date.now() / 1000, // Unix timestamp in seconds
        });
      } catch {
        // Sentry may not be initialized yet — silently ignore
      }
    }
  }

  public setGlobalContext(context: Record<string, unknown>): void {
    this.globalContext = { ...this.globalContext, ...context };
  }

  public clearGlobalContext(): void {
    this.globalContext = {};
  }

  public debug(entry: LogEntry): void {
    this.log('debug', entry);
  }

  public info(entry: LogEntry): void {
    this.log('info', entry);
  }

  public warn(entry: LogEntry): void {
    this.log('warn', entry);
  }

  public error(entry: LogEntry): void {
    this.log('error', entry);
  }
}

// Export singleton instance
export const logger = LogService.getInstance();

// React hook for component usage
export const useLogger = (): Logger => {
  return {
    debug: (entry: LogEntry) => logger.debug(entry),
    info: (entry: LogEntry) => logger.info(entry),
    warn: (entry: LogEntry) => logger.warn(entry),
    error: (entry: LogEntry) => logger.error(entry),
  };
};
