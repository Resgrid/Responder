import { create } from 'zustand';

import { savePersonnelStaffing } from '@/api/personnel/personnelStaffing';
import { useAuthStore } from '@/lib/auth';
import { SavePersonStaffingInput } from '@/models/v4/personnelStaffing/savePersonStaffingInput';
import { type StatusesResultData } from '@/models/v4/statuses/statusesResultData';
import { useHomeStore } from '@/stores/home/home-store';
import { useToastStore } from '@/stores/toast/store';

type StaffingStep = 'select-staffing' | 'add-note' | 'confirm';

interface StaffingBottomSheetStore {
  // UI State
  isOpen: boolean;
  currentStep: StaffingStep;
  isLoading: boolean;

  // Form Data
  selectedStaffing: StatusesResultData | null;
  note: string;

  // Actions
  setIsOpen: (isOpen: boolean, staffing?: StatusesResultData) => void;
  setCurrentStep: (step: StaffingStep) => void;
  setSelectedStaffing: (staffing: StatusesResultData | null) => void;
  setNote: (note: string) => void;
  setIsLoading: (isLoading: boolean) => void;

  // Navigation
  nextStep: () => void;
  previousStep: () => void;

  // Operations
  submitStaffing: () => Promise<void>;
  reset: () => void;
}

export const useStaffingBottomSheetStore = create<StaffingBottomSheetStore>((set, get) => ({
  isOpen: false,
  currentStep: 'select-staffing',
  isLoading: false,
  selectedStaffing: null,
  note: '',

  setIsOpen: (isOpen, staffing) => {
    set({
      isOpen,
      selectedStaffing: staffing || null,
      currentStep: staffing ? 'add-note' : 'select-staffing',
    });
  },

  setCurrentStep: (step) => set({ currentStep: step }),
  setSelectedStaffing: (staffing) => set({ selectedStaffing: staffing }),
  setNote: (note) => set({ note }),
  setIsLoading: (isLoading) => set({ isLoading }),

  nextStep: () => {
    const { currentStep } = get();
    switch (currentStep) {
      case 'select-staffing':
        set({ currentStep: 'add-note' });
        break;
      case 'add-note':
        set({ currentStep: 'confirm' });
        break;
    }
  },

  previousStep: () => {
    const { currentStep } = get();
    switch (currentStep) {
      case 'add-note':
        set({ currentStep: 'select-staffing' });
        break;
      case 'confirm':
        set({ currentStep: 'add-note' });
        break;
    }
  },

  submitStaffing: async () => {
    const { selectedStaffing, note } = get();
    const showToast = useToastStore.getState().showToast;
    const { userId } = useAuthStore.getState();
    const { fetchCurrentUserInfo } = useHomeStore.getState();

    if (!userId || !selectedStaffing) {
      showToast('error', 'Missing required information');
      return;
    }

    set({ isLoading: true });
    try {
      const staffing = new SavePersonStaffingInput();
      const date = new Date();

      staffing.UserId = userId;
      staffing.Type = selectedStaffing.Id.toString();
      staffing.Timestamp = date.toISOString();
      staffing.TimestampUtc = date.toUTCString().replace('UTC', 'GMT');
      staffing.Note = note;
      staffing.EventId = '';

      await savePersonnelStaffing(staffing);
      await fetchCurrentUserInfo();

      showToast('success', 'Staffing updated successfully');
      get().reset();
    } catch (error) {
      showToast('error', 'Failed to update staffing');
    } finally {
      set({ isLoading: false });
    }
  },

  reset: () =>
    set({
      isOpen: false,
      currentStep: 'select-staffing',
      selectedStaffing: null,
      note: '',
      isLoading: false,
    }),
}));
