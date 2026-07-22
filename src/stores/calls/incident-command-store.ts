import { create } from 'zustand';

import { getResourceIncidentView } from '@/api/calls/incidentCommand';
import { type ResourceIncidentView } from '@/models/v4/incidentCommand/resourceIncidentView';

interface IncidentCommandState {
  view: ResourceIncidentView | null;
  isLoading: boolean;
  error: string | null;
  fetchIncidentView: (callId: string | number) => Promise<void>;
  reset: () => void;
}

export const useIncidentCommandStore = create<IncidentCommandState>((set) => ({
  view: null,
  isLoading: false,
  error: null,
  fetchIncidentView: async (callId: string | number) => {
    // Clear any previous call's view so navigating between calls never paints stale
    // incident command data while the new fetch is in flight.
    set({ isLoading: true, error: null, view: null });
    try {
      const result = await getResourceIncidentView(callId);

      if (result && result.Data) {
        set({ view: result.Data, isLoading: false });
      } else {
        // The server returns Status 'NotFound' with null Data when the call has
        // no incident command; treat it as an empty state, not an error.
        set({ view: null, isLoading: false });
      }
    } catch (error) {
      set({
        view: null,
        error: error instanceof Error ? error.message : 'An unknown error occurred',
        isLoading: false,
      });
    }
  },
  reset: () => set({ view: null, isLoading: false, error: null }),
}));
