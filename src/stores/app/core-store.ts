import { Env } from '@env';
import _ from 'lodash';
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

  /** Currently selected unit ID */
  activeUnitId: string | null;
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
      activeUnitId: null,
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

        // Don't re-initialize if already initialized
        if (state.isInitialized) {
          logger.info({
            message: 'Core store already initialized, skipping',
          });
          return;
        }

        set({ isLoading: true, isInitializing: true, error: null });

        try {
          const config = await getConfig(Env.APP_KEY);

          const personnelStatuses = await getAllPersonnelStatuses();
          const personnelStaffings = await getAllPersonnelStaffings();

          const userId = useAuthStore.getState().userId;
          if (!userId) {
            set({
              isInitialized: true,
              isLoading: false,
              isInitializing: false,
              activeStatuses: personnelStatuses.Data,
              activeStaffing: personnelStaffings.Data,
              config: config.Data,
            });

            return;
          }

          const currentStatus = await getCurrentPersonStatus(userId);
          const currentStaffing = await getCurrentPersonStaffing(userId);

          set({
            isInitialized: true,
            isLoading: false,
            isInitializing: false,
            activeStatuses: personnelStatuses.Data,
            activeStaffing: personnelStaffings.Data,
            currentStatus: currentStatus.Data,
            currentStaffing: currentStaffing.Data,
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
          const personnelStatuses = await getAllPersonnelStatuses();
          const personnelStaffings = await getAllPersonnelStaffings();

          const userId = useAuthStore.getState().userId;
          if (!userId) {
            set({
              activeStatuses: personnelStatuses.Data,
              activeStaffing: personnelStaffings.Data,
            });

            return;
          }

          const currentStatus = await getCurrentPersonStatus(userId);
          const currentStaffing = await getCurrentPersonStaffing(userId);

          set({
            activeStatuses: personnelStatuses.Data,
            activeStaffing: personnelStaffings.Data,
            currentStatus: currentStatus.Data,
            currentStaffing: currentStaffing.Data,
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
    }
  )
);
