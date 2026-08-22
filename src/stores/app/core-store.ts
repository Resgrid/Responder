import { Env } from '@env';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { getConfig } from '@/api/config';
import { getAllPersonnelStatuses, getCurrentPersonStatus } from '@/api/satuses';
import { getAllPersonnelStaffings, getCurrentPersonStaffing } from '@/api/staffing';
import { useAuthStore } from '@/lib/auth';
import { logger } from '@/lib/logging';
import { zustandStorage } from '@/lib/storage';
import { setActiveCallId } from '@/lib/storage/app';
import { type CallPriorityResultData } from '@/models/v4/callPriorities/callPriorityResultData';
import { type CallResultData } from '@/models/v4/calls/callResultData';
import { type GetConfigResultData } from '@/models/v4/configs/getConfigResultData';
import { type GetCurrentStaffingResultData } from '@/models/v4/personnelStaffing/getCurrentStaffingResultData';
import { type GetCurrentStatusResultData } from '@/models/v4/personnelStatuses/getCurrentStatusResultData';
import { type StatusesResultData } from '@/models/v4/statuses/statusesResultData';

import { useCallsStore } from '../calls/store';

interface CoreState {
  activeStatuses: StatusesResultData[] | null;
  activeStaffing: StatusesResultData[] | null;
  currentStatus: GetCurrentStatusResultData | null;
  currentStatusValue: StatusesResultData | null;
  currentStaffing: GetCurrentStaffingResultData | null;
  currentStaffingValue: StatusesResultData | null;

  activeCallId: string | null;
  activeCall: CallResultData | null;
  activePriority: CallPriorityResultData | null;

  config: GetConfigResultData | null;

  isLoading: boolean;
  isInitialized: boolean;
  isInitializing: boolean;
  error: string | null;
  init: () => Promise<void>;
  getStatusesAndStaffing: () => Promise<void>;
  setActiveCall: (callId: string | null) => Promise<void>;
  fetchConfig: () => Promise<void>;
}

export const useCoreStore = create<CoreState>()(
  persist(
    (set, get) => ({
      activeCallId: null,
      activeCall: null,
      activePriority: null,
      config: null,
      isLoading: false,
      isInitialized: false,
      isInitializing: false,
      error: null,
      activeStatuses: null,
      activeStaffing: null,
      currentStatus: null,
      currentStatusValue: null,
      currentStaffing: null,
      currentStaffingValue: null,
      init: async () => {
        const state = get();

        // Prevent multiple simultaneous initializations
        if (state.isInitializing) {
          logger.info({
            message: 'Core store initialization already in progress, skipping',
          });
          return;
        }

        set({ isLoading: true, isInitializing: true, error: null });

        try {
          const userId = useAuthStore.getState().userId;

          // None of these depend on one another, so they go out together: five serial round
          // trips on a flaky cellular link is the difference between a usable app and a
          // responder staring at a spinner.
          const [config, personnelStatuses, personnelStaffings, currentStatus, currentStaffing] = await Promise.all([
            getConfig(Env.APP_KEY),
            getAllPersonnelStatuses(),
            getAllPersonnelStaffings(),
            userId ? getCurrentPersonStatus(userId) : Promise.resolve(null),
            userId ? getCurrentPersonStaffing(userId) : Promise.resolve(null),
          ]);

          set({
            isInitialized: true,
            isLoading: false,
            isInitializing: false,
            activeStatuses: personnelStatuses.Data,
            activeStaffing: personnelStaffings.Data,
            currentStatus: currentStatus?.Data ?? null,
            currentStaffing: currentStaffing?.Data ?? null,
            config: config.Data,
          });

          logger.info({
            message: 'Core store initialization completed successfully',
          });
        } catch (error) {
          set({
            error: 'Failed to init core app data',
            isLoading: false,
            isInitializing: false,
          });
          logger.error({
            message: `Failed to init core app data: ${JSON.stringify(error)}`,
            context: { error },
          });
        }
      },
      getStatusesAndStaffing: async () => {
        set({ error: null });
        try {
          const userId = useAuthStore.getState().userId;

          const [personnelStatuses, personnelStaffings, currentStatus, currentStaffing] = await Promise.all([
            getAllPersonnelStatuses(),
            getAllPersonnelStaffings(),
            userId ? getCurrentPersonStatus(userId) : Promise.resolve(null),
            userId ? getCurrentPersonStaffing(userId) : Promise.resolve(null),
          ]);

          set({
            activeStatuses: personnelStatuses.Data,
            activeStaffing: personnelStaffings.Data,
            ...(userId ? { currentStatus: currentStatus?.Data ?? null, currentStaffing: currentStaffing?.Data ?? null } : {}),
          });
        } catch (error) {
          set({
            error: 'Failed to fetch and set active statuses and staffing',
            isLoading: false,
          });
          logger.error({
            message: `Failed to fetch and set active statuses and staffing: ${JSON.stringify(error)}`,
            context: { error },
          });
        }
      },
      setActiveCall: async (callId: string | null) => {
        if (!callId) {
          // Deselect the call
          set({
            activeCall: null,
            activePriority: null,
            activeCallId: null,
          });
          return;
        }

        set({ isLoading: true, error: null, activeCallId: callId });
        try {
          await setActiveCallId(callId);
          const callStore = useCallsStore.getState();
          await callStore.fetchCalls();
          await callStore.fetchCallPriorities();
          const activeCall = callStore.calls.find((call) => call.CallId === callId);
          const activePriority = callStore.callPriorities.find((priority) => priority.Id === activeCall?.Priority);
          set({
            activeCall: activeCall ?? null,
            activePriority: activePriority ?? null,
            isLoading: false,
          });
        } catch (error) {
          set({ error: 'Failed to set active call', isLoading: false });
          logger.error({
            message: `Failed to set active call: ${JSON.stringify(error)}`,
            context: { error },
          });
        }
      },
      fetchConfig: async () => {
        try {
          const config = await getConfig(Env.APP_KEY);
          set({ config: config.Data });
        } catch (error) {
          set({ error: 'Failed to fetch config', isLoading: false });
          logger.error({
            message: `Failed to fetch config: ${JSON.stringify(error)}`,
            context: { error },
          });
        }
      },
    }),
    {
      name: 'core-storage',
      storage: createJSONStorage(() => zustandStorage),
      // Transient flags describe a single run of init(), never a saved session, so they are
      // kept out of storage entirely.
      partialize: (state) => ({
        activeCallId: state.activeCallId,
        activeCall: state.activeCall,
        activePriority: state.activePriority,
        config: state.config,
        isInitialized: state.isInitialized,
        activeStatuses: state.activeStatuses,
        activeStaffing: state.activeStaffing,
        currentStatus: state.currentStatus,
        currentStatusValue: state.currentStatusValue,
        currentStaffing: state.currentStaffing,
        currentStaffingValue: state.currentStaffingValue,
      }),
      // partialize only governs what is written; blobs saved before it existed still carry the
      // flags. Forcing them back to their defaults on the way in is what rescues an install that
      // was killed mid-init() -- otherwise isInitializing rehydrates as true and init() early
      // returns forever, leaving the app permanently unable to load until the user signs out.
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...(persistedState as Partial<CoreState> | undefined),
        isLoading: false,
        isInitializing: false,
        error: null,
      }),
    }
  )
);
