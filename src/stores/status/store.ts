import { create } from 'zustand';

import { saveUnitStatus } from '@/api/units/unitStatuses';
import { type CallResultData } from '@/models/v4/calls/callResultData';
import { type StatusesResultData } from '@/models/v4/statuses/statusesResultData';
import { SaveUnitStatusInput } from '@/models/v4/unitStatus/saveUnitStatusInput';

import { useCoreStore } from '../app/core-store';

interface StatusBottomSheetStore {
  isOpen: boolean;
  currentStep: 'select-call' | 'add-note';
  selectedCall: CallResultData | null;
  selectedStatus: StatusesResultData | null;
  note: string;
  setIsOpen: (isOpen: boolean, status?: StatusesResultData) => void;
  setCurrentStep: (step: 'select-call' | 'add-note') => void;
  setSelectedCall: (call: CallResultData | null) => void;
  setNote: (note: string) => void;
  reset: () => void;
}

export const useStatusBottomSheetStore = create<StatusBottomSheetStore>((set) => ({
  isOpen: false,
  currentStep: 'select-call',
  selectedCall: null,
  selectedStatus: null,
  note: '',
  setIsOpen: (isOpen, status) => set({ isOpen, selectedStatus: status || null }),
  setCurrentStep: (step) => set({ currentStep: step }),
  setSelectedCall: (call) => set({ selectedCall: call }),
  setNote: (note) => set({ note }),
  reset: () =>
    set({
      isOpen: false,
      currentStep: 'select-call',
      selectedCall: null,
      selectedStatus: null,
      note: '',
    }),
}));

interface StatusesState {
  isLoading: boolean;
  error: string | null;
  saveUnitStatus: (type: string, note: string) => Promise<void>;
}

export const useStatusesStore = create<StatusesState>((set) => ({
  isLoading: false,
  error: null,
  saveUnitStatus: async (type: string, note: string) => {
    set({ isLoading: true, error: null });
    try {
      let status = new SaveUnitStatusInput();
      const date = new Date();

      const activeUnit = useCoreStore.getState().activeUnit;
      if (activeUnit) {
        status.Id = activeUnit?.UnitId;
        status.Type = type;
        status.Timestamp = date.toISOString();
        status.TimestampUtc = date.toUTCString().replace('UTC', 'GMT');
        status.Note = note;
        await saveUnitStatus(status);

        // Refresh the active unit status after saving
        await useCoreStore.getState().setActiveUnitWithFetch(activeUnit.UnitId);
      }
      set({ isLoading: false });
    } catch (error) {
      set({ error: 'Failed to save unit status', isLoading: false });
    }
  },
}));
