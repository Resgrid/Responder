import { useEffect } from 'react';

import { useCheckInStore } from '@/stores/calls/check-in-store';

interface PollingSubscriber {
  id: number;
  callId: number;
}

// The check-in store drives a SINGLE shared interval and its stopPolling() clears it
// unconditionally. More than one screen wants that timer at the same time — the home
// Active Call tab stays mounted while the call detail screen (and its check-in tab) is
// pushed — so the first component to unmount would silently kill polling the other one
// still relies on. Refcount the subscribers here and only stop when the last one leaves.
const subscribers: PollingSubscriber[] = [];
let nextSubscriberId = 0;

/**
 * Keeps the shared check-in timer poll running for as long as at least one mounted
 * component asks for it. Pass `null` to opt out (feature disabled, no active call).
 */
export function useCheckInPolling(callId: number | null): void {
  useEffect(() => {
    if (callId === null || Number.isNaN(callId)) {
      return;
    }

    const id = nextSubscriberId++;
    subscribers.push({ id, callId });
    useCheckInStore.getState().startPolling(callId);

    return () => {
      const index = subscribers.findIndex((subscriber) => subscriber.id === id);
      if (index !== -1) {
        subscribers.splice(index, 1);
      }

      const remaining = subscribers[subscribers.length - 1];
      if (remaining) {
        // Someone else still needs the timer — re-point the single interval at their
        // call instead of tearing it down.
        useCheckInStore.getState().startPolling(remaining.callId);
        return;
      }

      useCheckInStore.getState().stopPolling();
    };
  }, [callId]);
}

/** Test-only: clears the module-level refcount between cases. */
export function resetCheckInPollingSubscribers(): void {
  subscribers.length = 0;
  nextSubscriberId = 0;
}
