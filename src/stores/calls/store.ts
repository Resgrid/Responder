import { create } from 'zustand';

import { getCallPriorities } from '@/api/calls/callPriorities';
import { getCallExtraData, getCalls } from '@/api/calls/calls';
import { getCallTypes } from '@/api/calls/callTypes';
import { type CallPriorityResultData } from '@/models/v4/callPriorities/callPriorityResultData';
import { CallExtraDataResultData } from '@/models/v4/calls/callExtraDataResultData';
import { type CallResultData } from '@/models/v4/calls/callResultData';
import { type CallTypeResultData } from '@/models/v4/callTypes/callTypeResultData';
import type { ApiResponse } from '@/types/api';

interface CallsState {
  calls: CallResultData[];
  callPriorities: CallPriorityResultData[];
  callTypes: CallTypeResultData[];
  callExtrasById: Record<string, CallExtraDataResultData>;
  loadingCallExtraIds: Record<string, boolean>;
  isLoading: boolean;
  error: string | null;
  fetchCalls: () => Promise<void>;
  fetchCallExtraData: (callId: string, force?: boolean) => Promise<CallExtraDataResultData | null>;
  prefetchCallExtras: (callIds: string[], force?: boolean) => Promise<void>;
  fetchCallPriorities: () => Promise<void>;
  fetchCallTypes: () => Promise<void>;
  init: () => Promise<void>;
}

export const useCallsStore = create<CallsState>((set, get) => ({
  calls: [],
  callPriorities: [],
  callTypes: [],
  callExtrasById: {},
  loadingCallExtraIds: {},
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

      void get().prefetchCallExtras((callsResponse.Data ?? []).map((call) => call.CallId));
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
      void get().prefetchCallExtras((response.Data ?? []).map((call) => call.CallId));
    } catch (error) {
      set({ error: 'Failed to fetch calls', isLoading: false });
    }
  },
  fetchCallExtraData: async (callId, force = false) => {
    const { callExtrasById, loadingCallExtraIds } = get();

    if (!force && callExtrasById[callId]) {
      return callExtrasById[callId];
    }

    if (loadingCallExtraIds[callId]) {
      return callExtrasById[callId] ?? null;
    }

    set((state) => ({
      loadingCallExtraIds: {
        ...state.loadingCallExtraIds,
        [callId]: true,
      },
    }));

    try {
      const response = (await getCallExtraData(callId)) as ApiResponse<CallExtraDataResultData>;
      const callExtraData = response.Data ?? new CallExtraDataResultData();

      set((state) => {
        const nextLoadingCallExtraIds = { ...state.loadingCallExtraIds };
        delete nextLoadingCallExtraIds[callId];

        return {
          callExtrasById: {
            ...state.callExtrasById,
            [callId]: callExtraData,
          },
          loadingCallExtraIds: nextLoadingCallExtraIds,
        };
      });

      return callExtraData;
    } catch (error) {
      set((state) => {
        const nextLoadingCallExtraIds = { ...state.loadingCallExtraIds };
        delete nextLoadingCallExtraIds[callId];

        return {
          loadingCallExtraIds: nextLoadingCallExtraIds,
        };
      });

      return null;
    }
  },
  prefetchCallExtras: async (callIds, force = false) => {
    if (callIds.length === 0) {
      return;
    }

    await Promise.all(callIds.map((callId) => get().fetchCallExtraData(callId, force)));
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
