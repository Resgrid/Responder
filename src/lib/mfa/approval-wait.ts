import type { ApprovalState, ApprovalStatusData } from './types';

export const APPROVAL_POLL_MS = 2000;

export type ApprovalWaitResult = ApprovalState | 'aborted' | 'unavailable';

const TERMINAL: readonly ApprovalState[] = ['approved', 'denied', 'expired', 'canceled', 'consumed'];

// Each pause removes its own abort listener, so a long wait does not pile one up per poll on the caller's signal.
const wait = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve) => {
    const onAbort = () => {
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    signal?.addEventListener('abort', onAbort, { once: true });
  });

/**
 * Waits for the member's Responder to decide (plan section 7.9): polls every 2 seconds until the request is decided,
 * expires or is canceled, or `signal` aborts. A sign-in has no realtime connection, so polling is the only way here.
 */
export const waitForApproval = async (status: () => Promise<ApprovalStatusData>, signal?: AbortSignal, intervalMs = APPROVAL_POLL_MS): Promise<ApprovalWaitResult> => {
  for (;;) {
    if (signal?.aborted) {
      return 'aborted';
    }
    let state: ApprovalState;
    try {
      state = (await status()).State;
    } catch {
      return 'unavailable';
    }
    if (TERMINAL.includes(state)) {
      return state;
    }
    await wait(intervalMs, signal);
  }
};
