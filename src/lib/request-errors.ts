/**
 * Classifies a failed API request by whether it ever got an HTTP answer. Axios rejects with no
 * `response` when it did not: offline, DNS or TLS failure, or the client timeout.
 */
export const getResponseStatus = (error: unknown): number | null => {
  const status = (error as { response?: { status?: unknown } } | null | undefined)?.response?.status;
  return typeof status === 'number' ? status : null;
};

// Answers that mean the API was unreachable behind its gateway or asked to be retried later,
// not that it rejected the request itself.
const TRANSIENT_HTTP_STATUSES = new Set([408, 429, 502, 503, 504]);

/** The request never reached a working API, so sending the same payload later can succeed. */
export const isConnectivityError = (error: unknown): boolean => {
  const status = getResponseStatus(error);
  return status === null || TRANSIENT_HTTP_STATUSES.has(status);
};

/** The API refused the request (4xx) and will refuse the same payload again. */
export const isClientRejection = (error: unknown): boolean => {
  const status = getResponseStatus(error);
  return status !== null && status >= 400 && status < 500 && !TRANSIENT_HTTP_STATUSES.has(status);
};
