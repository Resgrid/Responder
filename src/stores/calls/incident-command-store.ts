import { create } from 'zustand';

import { getResourceIncidentView } from '@/api/calls/incidentCommand';
import { logger } from '@/lib/logging';
import { type ResourceIncidentView } from '@/models/v4/incidentCommand/resourceIncidentView';

interface IncidentCommandState {
  view: ResourceIncidentView | null;
  isLoading: boolean;
  error: string | null;
  /** The call whose incident view is currently loaded, so realtime updates can be matched to it. */
  callId: string | null;
  fetchIncidentView: (callId: string | number) => Promise<void>;
  /**
   * Realtime refresh for the call being viewed. Unlike fetchIncidentView this keeps the current view
   * on screen while refetching — the IC moving resources should update the panel in place, not blank
   * it and flash a spinner on every change.
   */
  handleIncidentCommandUpdated: (callId: string) => void;
  reset: () => void;
}

export const useIncidentCommandStore = create<IncidentCommandState>((set, get) => {
  // Generation counter so an out-of-order completion (an older, slower fetch or one
  // resolving after reset) can never overwrite the latest request's state.
  let requestGeneration = 0;

  return {
    view: null,
    isLoading: false,
    error: null,
    callId: null,
    fetchIncidentView: async (callId: string | number) => {
      const generation = ++requestGeneration;
      // Clear any previous call's view so navigating between calls never paints stale
      // incident command data while the new fetch is in flight.
      set({ isLoading: true, error: null, view: null, callId: String(callId) });
      try {
        const result = await getResourceIncidentView(callId);

        if (generation !== requestGeneration) {
          return;
        }

        if (result && result.Data) {
          set({ view: result.Data, isLoading: false });
        } else {
          // The server returns Status 'NotFound' with null Data when the call has
          // no incident command; treat it as an empty state, not an error.
          set({ view: null, isLoading: false });
        }
      } catch (error) {
        if (generation !== requestGeneration) {
          return;
        }

        set({
          view: null,
          error: error instanceof Error ? error.message : 'An unknown error occurred',
          isLoading: false,
        });
      }
    },
    handleIncidentCommandUpdated: (callId: string) => {
      const state = get();
      if (!state.callId || state.callId !== String(callId)) {
        return;
      }

      const generation = ++requestGeneration;
      void (async () => {
        try {
          const result = await getResourceIncidentView(callId);
          if (generation !== requestGeneration) {
            return;
          }
          set({ view: result?.Data ?? null, error: null });
        } catch (error) {
          if (generation !== requestGeneration) {
            return;
          }
          // A failed background refresh must not wipe the view the responder is reading.
          logger.warn({ message: 'IncidentCommand: realtime refresh failed', context: { callId, error } });
        }
      })();
    },
    reset: () => {
      requestGeneration++;
      set({ view: null, isLoading: false, error: null, callId: null });
    },
  };
});
