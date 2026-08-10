import { useCallback, useEffect, useMemo, useRef } from 'react';

import { logger } from '@/lib/logging';

// A failed startup leaves the app signed in but inert — no feature flags, no chat
// hub, no calls — so it retries on a backoff instead of stranding the whole session.
export const INIT_RETRY_BASE_DELAY_MS = 5000;
export const INIT_RETRY_MAX_DELAY_MS = 60000;
export const INIT_MAX_ATTEMPTS = 5;

/** Backoff for the retry that follows `attempt`, doubling up to the ceiling. */
export function getInitRetryDelay(attempt: number): number {
  const exponent = Math.max(attempt - 1, 0);
  return Math.min(INIT_RETRY_BASE_DELAY_MS * Math.pow(2, exponent), INIT_RETRY_MAX_DELAY_MS);
}

export interface AppInitRetry {
  /** Counts an attempt as started, cancels any pending retry, returns the attempt number. */
  recordAttempt: () => number;
  /** Queues another run on a backoff. No-op once the attempt budget is spent. */
  scheduleRetry: (run: () => void) => void;
  /** Cancels a pending retry and restores the full budget (success, or sign-out). */
  reset: () => void;
}

/**
 * Owns the attempt budget and backoff timer for app initialization.
 *
 * Kept out of the layout so the policy is testable on its own, and so the pending
 * timer is always cancelled on unmount.
 */
export function useAppInitRetry(): AppInitRetry {
  const attempts = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancel = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  const recordAttempt = useCallback(() => {
    cancel();
    attempts.current += 1;
    return attempts.current;
  }, [cancel]);

  const reset = useCallback(() => {
    cancel();
    attempts.current = 0;
  }, [cancel]);

  const scheduleRetry = useCallback(
    (run: () => void) => {
      if (attempts.current >= INIT_MAX_ATTEMPTS) {
        logger.error({
          message: 'App initialization failed repeatedly, giving up until next sign-in',
          context: { attempts: attempts.current },
        });
        return;
      }

      const delay = getInitRetryDelay(attempts.current);
      logger.info({
        message: 'Scheduling app initialization retry',
        context: { attempt: attempts.current, maxAttempts: INIT_MAX_ATTEMPTS, delay },
      });

      cancel();
      timer.current = setTimeout(() => {
        timer.current = null;
        run();
      }, delay);
    },
    [cancel]
  );

  useEffect(() => cancel, [cancel]);

  // Stable identity so callers can list it as a dependency without re-running on
  // every render.
  return useMemo(() => ({ recordAttempt, scheduleRetry, reset }), [recordAttempt, scheduleRetry, reset]);
}
