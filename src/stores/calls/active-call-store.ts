import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { zustandStorage } from '@/lib/storage';
import { type CallResultData } from '@/models/v4/calls/callResultData';

import { useCallsStore } from './store';

/**
 * The single source of truth for the user's active call. Call detail "Set Active Call", the
 * Home Active Call tab, the map pin "Set as current call" and the personnel status sheet's
 * default destination all read and write this store.
 */
interface ActiveCallState {
  activeCallId: string | null;
  activeCall: CallResultData | null;
  setActiveCall: (call: CallResultData) => void;
  /** Resolves a bare call id (all a map pin carries) against the open calls list. Rejects when the call is not open. */
  setActiveCallById: (callId: string | null) => Promise<void>;
  clearActiveCall: () => void;
  isActiveCall: (callId: string) => boolean;
}

export const useActiveCallStore = create<ActiveCallState>()(
  persist(
    (set, get) => ({
      activeCallId: null,
      activeCall: null,
      setActiveCall: (call: CallResultData) =>
        set({
          activeCallId: call.CallId,
          activeCall: call,
        }),
      setActiveCallById: async (callId: string | null) => {
        if (!callId) {
          get().clearActiveCall();
          return;
        }

        await useCallsStore.getState().fetchCalls();
        // Re-read after the fetch: the state captured before it still holds the old list.
        const call = useCallsStore.getState().calls.find((openCall) => openCall.CallId === callId);

        if (!call) {
          throw new Error(`Call ${callId} is not in the open calls list`);
        }

        get().setActiveCall(call);
      },
      clearActiveCall: () =>
        set({
          activeCallId: null,
          activeCall: null,
        }),
      isActiveCall: (callId: string) => get().activeCallId === callId,
    }),
    {
      name: 'active-call-storage',
      storage: createJSONStorage(() => zustandStorage),
    }
  )
);
