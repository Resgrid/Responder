import { create } from 'zustand';

import { getAllGroups } from '@/api/groups/groups';
import { savePersonnelStatus } from '@/api/personnel/personnelStatuses';
import { useAuthStore } from '@/lib/auth';
import { type CallResultData } from '@/models/v4/calls/callResultData';
import { type GroupResultData } from '@/models/v4/groups/groupsResultData';
import { SavePersonStatusInput } from '@/models/v4/personnelStatuses/savePersonStatusInput';
import { type StatusesResultData } from '@/models/v4/statuses/statusesResultData';
import { offlineQueueProcessor } from '@/services/offline-queue-processor';
import { useLocationStore } from '@/stores/app/location-store';
import { useHomeStore } from '@/stores/home/home-store';
import { useToastStore } from '@/stores/toast/store';

import { useCallsStore } from '../calls/store';

export type PersonnelStatusStep = 'select-responding-to' | 'add-note' | 'confirm';
export type ResponseTab = 'calls' | 'stations';
export type ResponseType = 'none' | 'call' | 'station';

interface PersonnelStatusBottomSheetStore {
  isOpen: boolean;
  currentStep: PersonnelStatusStep;
  selectedCall: CallResultData | null;
  selectedGroup: GroupResultData | null;
  selectedStatus: StatusesResultData | null;
  responseType: ResponseType;
  selectedTab: ResponseTab;
  note: string;
  respondingTo: string;
  isLoading: boolean;
  groups: GroupResultData[];
  isLoadingGroups: boolean;
  setIsOpen: (isOpen: boolean, status?: StatusesResultData) => void;
  setCurrentStep: (step: PersonnelStatusStep) => void;
  setSelectedCall: (call: CallResultData | null) => void;
  setSelectedGroup: (group: GroupResultData | null) => void;
  setResponseType: (type: ResponseType) => void;
  setSelectedTab: (tab: ResponseTab) => void;
  setNote: (note: string) => void;
  setRespondingTo: (respondingTo: string) => void;
  setIsLoading: (isLoading: boolean) => void;
  fetchGroups: () => Promise<void>;
  nextStep: () => void;
  previousStep: () => void;
  submitStatus: () => Promise<void>;
  reset: () => void;
  // Helper methods for Detail-based logic
  isDestinationRequired: () => boolean;
  areCallsAllowed: () => boolean;
  areStationsAllowed: () => boolean;
  getRequiredGpsAccuracy: () => boolean;
}

export const usePersonnelStatusBottomSheetStore = create<PersonnelStatusBottomSheetStore>((set, get) => ({
  isOpen: false,
  currentStep: 'select-responding-to',
  selectedCall: null,
  selectedGroup: null,
  selectedStatus: null,
  responseType: 'none',
  selectedTab: 'calls',
  note: '',
  respondingTo: '',
  isLoading: false,
  groups: [],
  isLoadingGroups: false,
  setIsOpen: async (isOpen, status) => {
    set({
      isOpen,
      selectedStatus: status || null,
      currentStep: status ? 'select-responding-to' : 'select-responding-to',
    });
  },
  setCurrentStep: (step) => set({ currentStep: step }),
  setSelectedCall: (call) => {
    set({
      selectedCall: call,
      selectedGroup: null,
      responseType: call ? 'call' : 'none',
      respondingTo: call ? call.CallId : '',
    });
  },
  setSelectedGroup: (group) => {
    set({
      selectedGroup: group,
      selectedCall: null,
      responseType: group ? 'station' : 'none',
      respondingTo: group ? group.GroupId : '',
    });
  },
  setResponseType: (type) => {
    if (type === 'none') {
      set({
        responseType: type,
        selectedCall: null,
        selectedGroup: null,
        respondingTo: '',
      });
    } else {
      set({ responseType: type });
    }
  },
  setSelectedTab: (tab) => set({ selectedTab: tab }),
  setNote: (note) => set({ note }),
  setRespondingTo: (respondingTo) => set({ respondingTo }),
  setIsLoading: (isLoading) => set({ isLoading }),
  fetchGroups: async () => {
    set({ isLoadingGroups: true });
    try {
      const groupsResult = await getAllGroups();
      set({ groups: groupsResult.Data || [], isLoadingGroups: false });
    } catch (error) {
      set({ groups: [], isLoadingGroups: false });
    }
  },
  nextStep: () => {
    const { currentStep } = get();
    switch (currentStep) {
      case 'select-responding-to':
        // "No Destination" is always valid regardless of status Detail value
        // User can always proceed with any selection (call, station, or none)
        set({ currentStep: 'add-note' });
        break;
      case 'add-note':
        set({ currentStep: 'confirm' });
        break;
    }
  },
  goToNextStep: () => {
    const { currentStep, isDestinationRequired } = get();
    switch (currentStep) {
      case 'select-responding-to':
        // Always go to note step if destination is not required
        if (!isDestinationRequired()) {
          set({ currentStep: 'add-note' });
        }
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
        // Always go back to select-responding-to step (even if skipped in some cases)
        set({ currentStep: 'select-responding-to' });
        break;
      case 'confirm':
        set({ currentStep: 'add-note' });
        break;
    }
  },
  submitStatus: async () => {
    const { selectedStatus, note, respondingTo, selectedCall, selectedGroup, responseType, getRequiredGpsAccuracy } = get();
    const showToast = useToastStore.getState().showToast;
    const { userId } = useAuthStore.getState();
    const { fetchCurrentUserInfo } = useHomeStore.getState();
    const locationState = useLocationStore.getState();

    if (!userId || !selectedStatus) {
      showToast('error', 'Missing required information');
      return;
    }

    // Check GPS requirements
    const requiresGps = getRequiredGpsAccuracy();
    if (requiresGps && (!locationState.latitude || !locationState.longitude)) {
      showToast('error', 'GPS location is required for this status but not available');
      return;
    }

    set({ isLoading: true });
    try {
      const status = new SavePersonStatusInput();
      const date = new Date();

      status.UserId = userId;
      status.Type = selectedStatus.Id.toString();
      status.Timestamp = date.toISOString();
      status.TimestampUtc = date.toUTCString().replace('UTC', 'GMT');
      status.Note = note;
      status.RespondingTo = respondingTo;

      // Always include GPS coordinates if available (regardless of requirement)
      status.Latitude = locationState.latitude ? locationState.latitude.toString() : '';
      status.Longitude = locationState.longitude ? locationState.longitude.toString() : '';
      status.Accuracy = locationState.accuracy ? locationState.accuracy.toString() : '';
      status.Altitude = locationState.altitude ? locationState.altitude.toString() : '';
      status.AltitudeAccuracy = '';
      status.Speed = locationState.speed ? locationState.speed.toString() : '';
      status.Heading = locationState.heading ? locationState.heading.toString() : '';

      // Set EventId based on response type
      if (responseType === 'call' && selectedCall) {
        status.EventId = selectedCall.CallId;
      } else if (responseType === 'station' && selectedGroup) {
        status.EventId = selectedGroup.GroupId;
      } else {
        status.EventId = '';
      }

      try {
        // Try to submit directly first
        await savePersonnelStatus(status);
        await fetchCurrentUserInfo();
        showToast('success', 'Status updated successfully');
        get().reset();
      } catch (error) {
        // If direct submission fails, add to offline queue
        console.warn('Direct status submission failed, adding to offline queue:', error);

        offlineQueueProcessor.addPersonnelStatusToQueue(status);
        showToast('info', 'Status saved offline and will be submitted when connection is restored');
        get().reset();
      }
    } catch (error) {
      showToast('error', 'Failed to update status');
    } finally {
      set({ isLoading: false });
    }
  },
  reset: () =>
    set({
      isOpen: false,
      currentStep: 'select-responding-to',
      selectedCall: null,
      selectedGroup: null,
      selectedStatus: null,
      responseType: 'none',
      selectedTab: 'calls',
      note: '',
      respondingTo: '',
      isLoading: false,
      groups: [],
      isLoadingGroups: false,
    }),

  // Helper methods for Detail-based logic
  isDestinationRequired: () => {
    const { selectedStatus } = get();
    if (!selectedStatus) return false;
    // Detail: 0 = No destination needed, 1 = Station only, 2 = Call only, 3 = Both
    return selectedStatus.Detail > 0;
  },

  areCallsAllowed: () => {
    const { selectedStatus } = get();
    if (!selectedStatus) return false;
    // Detail: 2 = Call only, 3 = Both
    return selectedStatus.Detail === 2 || selectedStatus.Detail === 3;
  },

  areStationsAllowed: () => {
    const { selectedStatus } = get();
    if (!selectedStatus) return false;
    // Detail: 1 = Station only, 3 = Both
    return selectedStatus.Detail === 1 || selectedStatus.Detail === 3;
  },

  getRequiredGpsAccuracy: () => {
    const { selectedStatus } = get();
    if (!selectedStatus) return false;
    // Use the Gps field to determine if GPS is required
    return selectedStatus.Gps;
  },
}));
