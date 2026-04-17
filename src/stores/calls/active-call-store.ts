import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { zustandStorage } from '@/lib/storage';
import { type CallResultData } from '@/models/v4/calls/callResultData';

interface ActiveCallState {
  activeCallId: string | null;
  activeCall: CallResultData | null;
  setActiveCall: (call: CallResultData) => void;
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
