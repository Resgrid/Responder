import { isAxiosError } from 'axios';

import { isClientRejection } from '@/lib/request-errors';

/** Anything longer than this is not a reason written for a person (a stack trace, an error page). */
const MAX_SERVER_MESSAGE_LENGTH = 500;

/**
 * The reason the server gave for refusing a call close, when it gave one. The v4 controller answers a refused
 * close with a plain-text 400 body (for example "This call has an active incident command. Close the incident
 * command first, then close the call."); a JSON body's Message/detail/title is accepted too. Returns null for
 * network failures, timeouts, rate limits and server (5xx) failures, empty bodies and HTML error pages, so
 * callers fall back to their own text.
 */
export const getCallCloseErrorMessage = (error: unknown): string | null => {
  if (!isAxiosError(error) || !isClientRejection(error)) {
    return null;
  }

  const data: unknown = error.response?.data;
  let text: unknown = data;
  if (data && typeof data === 'object') {
    const body = data as Record<string, unknown>;
    text = body.Message ?? body.message ?? body.detail ?? body.title;
  }

  if (typeof text !== 'string') {
    return null;
  }

  const trimmed = text.trim();
  if (!trimmed || trimmed.startsWith('<') || trimmed.length > MAX_SERVER_MESSAGE_LENGTH) {
    return null;
  }
  return trimmed;
};
