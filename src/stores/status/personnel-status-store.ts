import { create } from 'zustand';

import { getAllGroups } from '@/api/groups/groups';
import { getPois, getPoiTypes } from '@/api/mapping/mapping';
import { savePersonnelStatus } from '@/api/personnel/personnelStatuses';
import { useAuthStore } from '@/lib/auth';
import { translate } from '@/lib/i18n/utils';
import {
  areCallsAllowedForDetail,
  arePoisAllowedForStatus,
  areStationsAllowedForDetail,
  getCallDestinationPayload,
  getDefaultDestinationTabForDetail,
  getNoneDestinationPayload,
  getPoiDestinationPayload,
  getStationDestinationPayload,
  isDestinationRequiredForDetail,
  type StatusDestinationTab,
  type StatusDestinationType,
} from '@/lib/status-destinations';
import { type CallResultData } from '@/models/v4/calls/callResultData';
import { type GroupResultData } from '@/models/v4/groups/groupsResultData';
import { type PoiResultData } from '@/models/v4/mapping/poiResultData';
import { type PoiTypeResultData } from '@/models/v4/mapping/poiTypeResultData';
import { SavePersonStatusInput } from '@/models/v4/personnelStatuses/savePersonStatusInput';
import { type StatusesResultData } from '@/models/v4/statuses/statusesResultData';
import { offlineQueueProcessor } from '@/services/offline-queue-processor';
import { useLocationStore } from '@/stores/app/location-store';
import { useHomeStore } from '@/stores/home/home-store';
import { useToastStore } from '@/stores/toast/store';

export type PersonnelStatusStep = 'select-status' | 'select-responding-to' | 'add-note' | 'confirm';
export type ResponseTab = StatusDestinationTab;
export type ResponseType = StatusDestinationType;

interface PersonnelStatusOpenOptions {
  preselectedPoi?: PoiResultData | null;
}

interface DestinationSelectionState {
  selectedCall: CallResultData | null;
  selectedGroup: GroupResultData | null;
  selectedPoi: PoiResultData | null;
  responseType: ResponseType;
  selectedTab: ResponseTab;
  respondingTo: string;
}

interface PersonnelStatusBottomSheetStore {
  isOpen: boolean;
  requiresStatusSelection: boolean;
  currentStep: PersonnelStatusStep;
  selectedCall: CallResultData | null;
  selectedGroup: GroupResultData | null;
  selectedPoi: PoiResultData | null;
  selectedStatus: StatusesResultData | null;
  responseType: ResponseType;
  selectedTab: ResponseTab;
  note: string;
  respondingTo: string;
  isLoading: boolean;
  groups: GroupResultData[];
  isLoadingGroups: boolean;
  pois: PoiResultData[];
  poiTypes: PoiTypeResultData[];
  isLoadingPois: boolean;
  setIsOpen: (isOpen: boolean, status?: StatusesResultData, options?: PersonnelStatusOpenOptions) => void;
  setCurrentStep: (step: PersonnelStatusStep) => void;
  setSelectedCall: (call: CallResultData | null) => void;
  setSelectedGroup: (group: GroupResultData | null) => void;
  setSelectedPoi: (poi: PoiResultData | null) => void;
  setResponseType: (type: ResponseType) => void;
  setSelectedStatus: (status: StatusesResultData | null) => void;
  setSelectedTab: (tab: ResponseTab) => void;
  setNote: (note: string) => void;
  setRespondingTo: (respondingTo: string) => void;
  setIsLoading: (isLoading: boolean) => void;
  fetchGroups: () => Promise<void>;
  fetchDestinationPois: () => Promise<void>;
  nextStep: () => void;
  goToNextStep: () => void;
  previousStep: () => void;
  submitStatus: () => Promise<void>;
  reset: () => void;
  isDestinationRequired: () => boolean;
  areCallsAllowed: () => boolean;
  areStationsAllowed: () => boolean;
  arePoisAllowed: () => boolean;
  getRequiredGpsAccuracy: () => boolean;
}

const getTranslatedMessage = (key: Parameters<typeof translate>[0], fallback: string) => {
  const message = translate(key);
  return typeof message === 'string' && message.length > 0 && message !== key ? message : fallback;
};

const isStationGroup = (group: GroupResultData) => {
  return `${group.TypeId ?? ''}` === '1';
};

const getClearedDestinationState = (selectedTab: ResponseTab = 'calls'): DestinationSelectionState => ({
  selectedCall: null,
  selectedGroup: null,
  selectedPoi: null,
  responseType: 'none',
  selectedTab,
  respondingTo: '',
});

const getDestinationStateForStatus = (selectedStatus: StatusesResultData | null, destinationState: DestinationSelectionState): DestinationSelectionState => {
  if (!selectedStatus) {
    return {
      ...destinationState,
      selectedTab: destinationState.selectedPoi ? 'pois' : destinationState.selectedTab,
    };
  }

  if (destinationState.selectedPoi && arePoisAllowedForStatus(selectedStatus.Detail)) {
    return {
      selectedCall: null,
      selectedGroup: null,
      selectedPoi: destinationState.selectedPoi,
      responseType: 'poi',
      selectedTab: 'pois',
      respondingTo: destinationState.selectedPoi.PoiId.toString(),
    };
  }

  if (destinationState.selectedCall && areCallsAllowedForDetail(selectedStatus.Detail)) {
    return {
      selectedCall: destinationState.selectedCall,
      selectedGroup: null,
      selectedPoi: null,
      responseType: 'call',
      selectedTab: 'calls',
      respondingTo: destinationState.selectedCall.CallId,
    };
  }

  if (destinationState.selectedGroup && areStationsAllowedForDetail(selectedStatus.Detail)) {
    return {
      selectedCall: null,
      selectedGroup: destinationState.selectedGroup,
      selectedPoi: null,
      responseType: 'station',
      selectedTab: 'stations',
      respondingTo: destinationState.selectedGroup.GroupId,
    };
  }

  return getClearedDestinationState(getDefaultDestinationTabForDetail(selectedStatus.Detail));
};

export const usePersonnelStatusBottomSheetStore = create<PersonnelStatusBottomSheetStore>((set, get) => ({
  isOpen: false,
  requiresStatusSelection: false,
  currentStep: 'select-responding-to',
  selectedCall: null,
  selectedGroup: null,
  selectedPoi: null,
  selectedStatus: null,
  responseType: 'none',
  selectedTab: 'calls',
  note: '',
  respondingTo: '',
  isLoading: false,
  groups: [],
  isLoadingGroups: false,
  pois: [],
  poiTypes: [],
  isLoadingPois: false,
  setIsOpen: (isOpen, status, options) => {
    if (!isOpen) {
      set({ isOpen: false });
      return;
    }

    const preselectedPoi = options?.preselectedPoi ?? null;
    const destinationState = getDestinationStateForStatus(
      status || null,
      preselectedPoi
        ? {
            selectedCall: null,
            selectedGroup: null,
            selectedPoi: preselectedPoi,
            responseType: 'poi',
            selectedTab: 'pois',
            respondingTo: preselectedPoi.PoiId.toString(),
          }
        : getClearedDestinationState()
    );

    set({
      isOpen: true,
      requiresStatusSelection: !status && preselectedPoi != null,
      currentStep: status || preselectedPoi == null ? 'select-responding-to' : 'select-status',
      selectedStatus: status || null,
      note: '',
      ...destinationState,
    });
  },
  setCurrentStep: (step) => set({ currentStep: step }),
  setSelectedCall: (call) => {
    set({
      selectedCall: call,
      selectedGroup: null,
      selectedPoi: null,
      responseType: call ? 'call' : 'none',
      selectedTab: 'calls',
      respondingTo: call ? call.CallId : '',
    });
  },
  setSelectedGroup: (group) => {
    set({
      selectedGroup: group,
      selectedCall: null,
      selectedPoi: null,
      responseType: group ? 'station' : 'none',
      selectedTab: 'stations',
      respondingTo: group ? group.GroupId : '',
    });
  },
  setSelectedPoi: (poi) => {
    set({
      selectedPoi: poi,
      selectedCall: null,
      selectedGroup: null,
      responseType: poi ? 'poi' : 'none',
      selectedTab: 'pois',
      respondingTo: poi ? poi.PoiId.toString() : '',
    });
  },
  setResponseType: (type) => {
    if (type === 'none') {
      set(getClearedDestinationState(get().selectedTab));
      return;
    }

    set({
      responseType: type,
      selectedTab: type === 'call' ? 'calls' : type === 'station' ? 'stations' : 'pois',
    });
  },
  setSelectedStatus: (selectedStatus) => {
    const { selectedCall, selectedGroup, selectedPoi, responseType, selectedTab } = get();
    const nextDestinationState = getDestinationStateForStatus(selectedStatus, {
      selectedCall,
      selectedGroup,
      selectedPoi,
      responseType,
      selectedTab,
      respondingTo: '',
    });

    set({
      selectedStatus,
      ...nextDestinationState,
    });
  },
  setSelectedTab: (selectedTab) => {
    const { selectedStatus } = get();

    if (selectedStatus) {
      const allowedTabs = [
        ...(areCallsAllowedForDetail(selectedStatus.Detail) ? (['calls'] as ResponseTab[]) : []),
        ...(areStationsAllowedForDetail(selectedStatus.Detail) ? (['stations'] as ResponseTab[]) : []),
        ...(arePoisAllowedForStatus(selectedStatus.Detail) ? (['pois'] as ResponseTab[]) : []),
      ];

      if (allowedTabs.length > 0 && !allowedTabs.includes(selectedTab)) {
        return;
      }
    }

    set({ selectedTab });
  },
  setNote: (note) => set({ note }),
  setRespondingTo: (respondingTo) => set({ respondingTo }),
  setIsLoading: (isLoading) => set({ isLoading }),
  fetchGroups: async () => {
    set({ isLoadingGroups: true });

    try {
      const groupsResult = await getAllGroups();
      const stationGroups = (groupsResult.Data || []).filter(isStationGroup);
      set({ groups: stationGroups, isLoadingGroups: false });
    } catch (error) {
      set({ groups: [], isLoadingGroups: false });
    }
  },
  fetchDestinationPois: async () => {
    set({ isLoadingPois: true });

    try {
      const [poiTypesResult, poisResult] = await Promise.all([getPoiTypes(), getPois({ destinationOnly: true })]);
      set({
        poiTypes: poiTypesResult.Data || [],
        pois: poisResult.Data || [],
        isLoadingPois: false,
      });
    } catch (error) {
      set({
        poiTypes: [],
        pois: [],
        isLoadingPois: false,
      });
    }
  },
  nextStep: () => {
    const { currentStep } = get();

    switch (currentStep) {
      case 'select-status':
        set({ currentStep: 'select-responding-to' });
        break;
      case 'select-responding-to':
        set({ currentStep: 'add-note' });
        break;
      case 'add-note':
        set({ currentStep: 'confirm' });
        break;
    }
  },
  goToNextStep: () => {
    return get().nextStep();
  },
  previousStep: () => {
    const { currentStep, requiresStatusSelection } = get();

    switch (currentStep) {
      case 'select-responding-to':
        set({ currentStep: requiresStatusSelection ? 'select-status' : 'select-responding-to' });
        break;
      case 'add-note':
        set({ currentStep: 'select-responding-to' });
        break;
      case 'confirm':
        set({ currentStep: 'add-note' });
        break;
    }
  },
  submitStatus: async () => {
    const { selectedStatus, note, selectedCall, selectedGroup, selectedPoi, responseType, respondingTo, getRequiredGpsAccuracy } = get();
    const showToast = useToastStore.getState().showToast;
    const { userId } = useAuthStore.getState();
    const { fetchCurrentUserInfo } = useHomeStore.getState();
    const locationState = useLocationStore.getState();

    if (!userId || !selectedStatus) {
      showToast('error', getTranslatedMessage('personnel.status.missing_required_info', 'Missing required information'));
      return;
    }

    if (isDestinationRequiredForDetail(selectedStatus.Detail)) {
      const hasDestination = (responseType === 'call' && selectedCall != null) || (responseType === 'station' && selectedGroup != null) || (responseType === 'poi' && selectedPoi != null);

      if (!hasDestination) {
        showToast('error', getTranslatedMessage('personnel.status.destination_required', 'A destination is required for this status'));
        return;
      }
    }

    const requiresGps = getRequiredGpsAccuracy();
    if (requiresGps && (locationState.latitude == null || locationState.longitude == null)) {
      showToast('error', getTranslatedMessage('personnel.status.gps_required', 'GPS location is required for this status but not available'));
      return;
    }

    set({ isLoading: true });

    try {
      const status = new SavePersonStatusInput();
      const date = new Date();
      const destinationPayload =
        responseType === 'call' && selectedCall
          ? getCallDestinationPayload(selectedCall)
          : responseType === 'station' && selectedGroup
            ? getStationDestinationPayload(selectedGroup)
            : responseType === 'poi' && selectedPoi
              ? getPoiDestinationPayload(selectedPoi)
              : getNoneDestinationPayload();

      status.UserId = userId;
      status.Type = selectedStatus.Id.toString();
      status.Timestamp = date.toISOString();
      status.TimestampUtc = date.toUTCString().replace('UTC', 'GMT');
      status.Note = note;
      status.RespondingTo = respondingTo || destinationPayload.respondingTo;
      status.RespondingToType = destinationPayload.respondingToType;
      status.EventId = destinationPayload.eventId;
      status.Latitude = locationState.latitude != null ? locationState.latitude.toString() : '';
      status.Longitude = locationState.longitude != null ? locationState.longitude.toString() : '';
      status.Accuracy = locationState.accuracy != null ? locationState.accuracy.toString() : '';
      status.Altitude = locationState.altitude != null ? locationState.altitude.toString() : '';
      status.AltitudeAccuracy = '';
      status.Speed = locationState.speed != null ? locationState.speed.toString() : '';
      status.Heading = locationState.heading != null ? locationState.heading.toString() : '';

      try {
        await savePersonnelStatus(status);
        await fetchCurrentUserInfo();
        showToast('success', getTranslatedMessage('home.status.updated_successfully', 'Status updated successfully'));
        get().reset();
      } catch (error) {
        offlineQueueProcessor.addPersonnelStatusToQueue(status);
        showToast('info', getTranslatedMessage('personnel.status.saved_offline', 'Status saved offline and will be submitted when connection is restored'));
        get().reset();
      }
    } catch (error) {
      showToast('error', getTranslatedMessage('home.status.update_failed', 'Failed to update status'));
    } finally {
      set({ isLoading: false });
    }
  },
  reset: () =>
    set({
      isOpen: false,
      requiresStatusSelection: false,
      currentStep: 'select-responding-to',
      selectedStatus: null,
      note: '',
      isLoading: false,
      groups: [],
      isLoadingGroups: false,
      pois: [],
      poiTypes: [],
      isLoadingPois: false,
      ...getClearedDestinationState(),
    }),
  isDestinationRequired: () => {
    return isDestinationRequiredForDetail(get().selectedStatus?.Detail);
  },
  areCallsAllowed: () => {
    return areCallsAllowedForDetail(get().selectedStatus?.Detail);
  },
  areStationsAllowed: () => {
    return areStationsAllowedForDetail(get().selectedStatus?.Detail);
  },
  arePoisAllowed: () => {
    return arePoisAllowedForStatus(get().selectedStatus?.Detail);
  },
  getRequiredGpsAccuracy: () => {
    return get().selectedStatus?.Gps ?? false;
  },
}));
