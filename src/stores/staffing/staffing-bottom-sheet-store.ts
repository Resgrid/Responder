import { create } from 'zustand';

import { savePersonnelStaffing } from '@/api/personnel/personnelStaffing';
import { useAuthStore } from '@/lib/auth';
import { translate } from '@/lib/i18n/utils';
import { logger } from '@/lib/logging';
import { isNoteRequiredForStatus } from '@/lib/status-destinations';
import { SavePersonStaffingInput } from '@/models/v4/personnelStaffing/savePersonStaffingInput';
import { type StatusesResultData } from '@/models/v4/statuses/statusesResultData';
import { useHomeStore } from '@/stores/home/home-store';
import { useToastStore } from '@/stores/toast/store';

type StaffingStep = 'select-staffing' | 'add-note' | 'confirm';

/** What a one-tap staffing press did. */
export type QuickStaffingResult = 'submitted' | 'failed' | 'opened-sheet' | 'busy';

interface StaffingBottomSheetStore {
  // UI State
  isOpen: boolean;
  currentStep: StaffingStep;
  isLoading: boolean;
  /** Id of the staffing level a one-tap press is saving, so only that button shows progress. */
  quickSubmittingId: number | null;

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
  /**
   * One tap on a Home staffing button. A level whose note is Required opens the sheet at the note
   * step; any other level (note None or Optional) is saved straight away with no note.
   */
  quickSubmitStaffing: (staffing: StatusesResultData) => Promise<QuickStaffingResult>;
  reset: () => void;
}

const buildStaffingInput = (userId: string, staffingId: number, note: string): SavePersonStaffingInput => {
  const staffing = new SavePersonStaffingInput();
  const date = new Date();

  staffing.UserId = userId;
  staffing.Type = staffingId.toString();
  staffing.Timestamp = date.toISOString();
  staffing.TimestampUtc = date.toUTCString().replace('UTC', 'GMT');
  staffing.Note = note;
  staffing.EventId = '';
  return staffing;
};

export const useStaffingBottomSheetStore = create<StaffingBottomSheetStore>((set, get) => ({
  isOpen: false,
  currentStep: 'select-staffing',
  isLoading: false,
  quickSubmittingId: null,
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
      showToast('error', translate('home.staffing.missing_required_info'));
      return;
    }

    set({ isLoading: true });

    // Staffing deliberately takes no location fix and enforces no GPS gate. Staffing levels come
    // from the same CustomStateDetail rows as statuses and do carry the same `Gps` flag, but
    // SavePersonStaffing has no coordinate fields on the server, so there is nothing to transmit
    // and no reason to make a responder wait on a fix. Status is where the gate lives.
    try {
      const staffing = buildStaffingInput(userId, selectedStaffing.Id, note);

      await savePersonnelStaffing(staffing);
      await fetchCurrentUserInfo();

      showToast('success', translate('home.staffing.updated_successfully'));
      get().reset();
    } catch (error) {
      showToast('error', translate('home.staffing.update_failed'));
    } finally {
      set({ isLoading: false });
    }
  },

  quickSubmitStaffing: async (staffing) => {
    if (get().quickSubmittingId !== null) {
      return 'busy';
    }

    if (isNoteRequiredForStatus(staffing)) {
      get().setIsOpen(true, staffing);
      return 'opened-sheet';
    }

    const showToast = useToastStore.getState().showToast;
    const { userId } = useAuthStore.getState();

    if (!userId) {
      showToast('error', translate('home.staffing.missing_required_info'));
      return 'failed';
    }

    set({ quickSubmittingId: staffing.Id });

    try {
      await savePersonnelStaffing(buildStaffingInput(userId, staffing.Id, ''));
    } catch (error) {
      logger.error({ message: 'One-tap staffing update failed', context: { error, staffingId: staffing.Id } });
      showToast('error', translate('home.staffing.update_failed'));
      set({ quickSubmittingId: null });
      return 'failed';
    }

    showToast('success', translate('home.staffing.updated_successfully'));

    // The save already landed; a failed refresh only delays the card, it is not a failed update.
    try {
      await useHomeStore.getState().fetchCurrentUserInfo();
    } catch (error) {
      logger.warn({ message: 'Staffing saved but refreshing the current user failed', context: { error } });
    } finally {
      set({ quickSubmittingId: null });
    }

    return 'submitted';
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
