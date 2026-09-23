import { Env } from '@env';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { getConfig } from '@/api/config';
import { getAllPersonnelStatuses, getCurrentPersonStatus } from '@/api/satuses';
import { getAllPersonnelStaffings, getCurrentPersonStaffing } from '@/api/staffing';
import { useAuthStore } from '@/lib/auth';
import { logger } from '@/lib/logging';
import { zustandStorage } from '@/lib/storage';
import { type CallResultData } from '@/models/v4/calls/callResultData';
import { type GetConfigResultData } from '@/models/v4/configs/getConfigResultData';
import { type GetCurrentStaffingResultData } from '@/models/v4/personnelStaffing/getCurrentStaffingResultData';
import { type GetCurrentStatusResultData } from '@/models/v4/personnelStatuses/getCurrentStatusResultData';
import { type StatusesResultData } from '@/models/v4/statuses/statusesResultData';

import { useActiveCallStore } from '../calls/active-call-store';

// The active call lives in useActiveCallStore. Version 0 of this store kept a second copy
// (written only by the map pin) that the personnel status sheet read, so a call set from call
// detail never reached the sheet. Version 1 drops that copy.
const CORE_STORAGE_VERSION = 1;
const LEGACY_ACTIVE_CALL_KEYS = ['activeCallId', 'activeCall', 'activePriority'] as const;

interface CoreState {
  activeStatuses: StatusesResultData[] | null;
  activeStaffing: StatusesResultData[] | null;
  currentStatus: GetCurrentStatusResultData | null;
  currentStatusValue: StatusesResultData | null;
  currentStaffing: GetCurrentStaffingResultData | null;
  currentStaffingValue: StatusesResultData | null;

  config: GetConfigResultData | null;

  isLoading: boolean;
  isInitialized: boolean;
  isInitializing: boolean;
  error: string | null;
  init: () => Promise<void>;
  getStatusesAndStaffing: () => Promise<void>;
  fetchConfig: () => Promise<void>;
}

type PersistedCoreState = Pick<CoreState, 'config' | 'isInitialized' | 'activeStatuses' | 'activeStaffing' | 'currentStatus' | 'currentStatusValue' | 'currentStaffing' | 'currentStaffingValue'>;

/**
 * Moves a version-0 blob's own active call into useActiveCallStore (only when that store has
 * none, so a call set from call detail wins) and strips the legacy fields. MMKV is synchronous,
 * so the active call store has already rehydrated by the time this runs.
 */
const migrateCoreStorage = (persistedState: unknown, version: number): PersistedCoreState => {
  const state = { ...((persistedState as Record<string, unknown> | null | undefined) ?? {}) };

  if (version < 1) {
    const legacyActiveCall = state.activeCall as CallResultData | null | undefined;

    if (legacyActiveCall?.CallId && !useActiveCallStore.getState().activeCall) {
      useActiveCallStore.getState().setActiveCall(legacyActiveCall);
    }
  }

  LEGACY_ACTIVE_CALL_KEYS.forEach((key) => {
    delete state[key];
  });

  return state as unknown as PersistedCoreState;
};

export const useCoreStore = create<CoreState>()(
  persist(
    (set, get) => ({
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
      version: CORE_STORAGE_VERSION,
      migrate: migrateCoreStorage,
      // Transient flags describe a single run of init(), never a saved session, so they are
      // kept out of storage entirely.
      partialize: (state): PersistedCoreState => ({
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
