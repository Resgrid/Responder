import { create } from 'zustand';

import { getCallPriorities } from '@/api/calls/callPriorities';
import { getCalls } from '@/api/calls/calls';
import { getCallTypes } from '@/api/calls/callTypes';
import { type CallPriorityResultData } from '@/models/v4/callPriorities/callPriorityResultData';
import { type CallResultData } from '@/models/v4/calls/callResultData';
import { type CallTypeResultData } from '@/models/v4/callTypes/callTypeResultData';
import type { ApiResponse } from '@/types/api';

interface CallsState {
  calls: CallResultData[];
  callPriorities: CallPriorityResultData[];
  callTypes: CallTypeResultData[];
  isLoading: boolean;
  error: string | null;
  fetchCalls: () => Promise<void>;
  fetchCallPriorities: () => Promise<void>;
  fetchCallTypes: () => Promise<void>;
  init: () => Promise<void>;
}

export const useCallsStore = create<CallsState>((set, get) => ({
  calls: [],
  callPriorities: [],
  callTypes: [],
  isLoading: false,
  error: null,
  init: async () => {
    set({ isLoading: true, error: null });
    try {
      // Parallelize API calls for better performance
      const [callsResponse, callPrioritiesResponse, callTypesResponse] = await Promise.all([
        getCalls() as Promise<ApiResponse<CallResultData[]>>,
        getCallPriorities() as Promise<ApiResponse<CallPriorityResultData[]>>,
        getCallTypes() as Promise<ApiResponse<CallTypeResultData[]>>,
      ]);

      set({
        calls: callsResponse.Data,
        callPriorities: callPrioritiesResponse.Data,
        callTypes: callTypesResponse.Data,
        error: null,
      });
    } catch (error) {
      set({
        error: 'Failed to initialize calls data',
        calls: [],
        callPriorities: [],
        callTypes: [],
      });
    } finally {
      set({ isLoading: false });
    }
  },
  fetchCalls: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = (await getCalls()) as ApiResponse<CallResultData[]>;
      set({ calls: response.Data, isLoading: false });
    } catch (error) {
      set({ error: 'Failed to fetch calls', isLoading: false });
    }
  },
  fetchCallPriorities: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await getCallPriorities();
      set({ callPriorities: response.Data, isLoading: false });
    } catch (error) {
      set({ error: 'Failed to fetch call priorities', isLoading: false });
    }
  },
  fetchCallTypes: async () => {
    // Only fetch if we don't have call types in the store
    const { callTypes } = get();
    if (callTypes.length > 0) {
      return;
    }

    set({ isLoading: true, error: null });
    try {
      const response = await getCallTypes();
      set({ callTypes: response.Data, isLoading: false });
    } catch (error) {
      set({ error: 'Failed to fetch call types', isLoading: false });
    }
  },
}));
