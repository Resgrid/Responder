import { create } from 'zustand';

import { getAllGroups } from '@/api/groups/groups';
import { getPois, getPoiTypes } from '@/api/mapping/mapping';
import { savePersonnelStatus } from '@/api/personnel/personnelStatuses';
import { useAuthStore } from '@/lib/auth';
import { translate } from '@/lib/i18n/utils';
import { logger } from '@/lib/logging';
import { getResponseStatus, isConnectivityError } from '@/lib/request-errors';
import {
  areCallsAllowedForDetail,
  arePoisAllowedForStatus,
  areStationsAllowedForDetail,
  getCallDestinationPayload,
  getDefaultDestinationTabForDetail,
  getDefaultStatusCall,
  getNoneDestinationPayload,
  getPersonnelStatusSteps,
  getPoiDestinationPayload,
  getStationDestinationPayload,
  hasDestinationChoicesForDetail,
  hasNoteStepForStatus,
  isDestinationRequiredForDetail,
  isNoteRequiredForStatus,
  type PersonnelStatusStep,
  type StatusDestinationTab,
  type StatusDestinationType,
} from '@/lib/status-destinations';
import { type CallResultData } from '@/models/v4/calls/callResultData';
import { type GroupResultData } from '@/models/v4/groups/groupsResultData';
import { type PoiResultData } from '@/models/v4/mapping/poiResultData';
import { type PoiTypeResultData } from '@/models/v4/mapping/poiTypeResultData';
import { SavePersonStatusInput } from '@/models/v4/personnelStatuses/savePersonStatusInput';
import { type StatusesResultData } from '@/models/v4/statuses/statusesResultData';
import { acquireLocationFix, getLocationFixErrorMessage } from '@/services/location-fix';
import { offlineQueueProcessor } from '@/services/offline-queue-processor';
import { useCoreStore } from '@/stores/app/core-store';
import { useLocationStore } from '@/stores/app/location-store';
import { useActiveCallStore } from '@/stores/calls/active-call-store';
import { useCallsStore } from '@/stores/calls/store';
import { useHomeStore } from '@/stores/home/home-store';
import { useToastStore } from '@/stores/toast/store';

export type { PersonnelStatusStep };
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
  poisError: string | null;
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
  // DepartmentGroupTypes: Orginizational = 1, Station = 2
  return `${group.TypeId ?? ''}` === '2';
};

const getStepsForStatus = (selectedStatus: StatusesResultData | null, requiresStatusSelection: boolean): PersonnelStatusStep[] =>
  getPersonnelStatusSteps({
    requiresStatusSelection,
    hasStatus: selectedStatus != null,
    hasDestinationChoices: hasDestinationChoicesForDetail(selectedStatus?.Detail),
    hasNoteStep: hasNoteStepForStatus(selectedStatus),
  });

/** Same inputs the sheet renders its default from, so what it shows is what gets sent. */
const getDefaultCallFromStores = (): CallResultData | null => {
  const currentStatus = useHomeStore.getState().currentUserStatus ?? useCoreStore.getState().currentStatus;
  return getDefaultStatusCall(useCallsStore.getState().calls, useActiveCallStore.getState().activeCall, currentStatus);
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
  poisError: null,
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
    const requiresStatusSelection = !status && preselectedPoi != null;

    set({
      isOpen: true,
      requiresStatusSelection,
      currentStep: getStepsForStatus(status || null, requiresStatusSelection)[0],
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
        poisError: null,
      });
    } catch (error) {
      set({
        isLoadingPois: false,
        poisError: error instanceof Error ? error.message : 'Failed to fetch destination POIs',
      });
    }
  },
  nextStep: () => {
    const { currentStep, selectedStatus, requiresStatusSelection } = get();
    const steps = getStepsForStatus(selectedStatus, requiresStatusSelection);
    const index = steps.indexOf(currentStep);

    // The last step saves instead of advancing.
    if (index >= 0 && index < steps.length - 1) {
      set({ currentStep: steps[index + 1] });
    }
  },
  goToNextStep: () => {
    return get().nextStep();
  },
  previousStep: () => {
    const { currentStep, selectedStatus, requiresStatusSelection } = get();
    const steps = getStepsForStatus(selectedStatus, requiresStatusSelection);
    const index = steps.indexOf(currentStep);

    if (index > 0) {
      set({ currentStep: steps[index - 1] });
    }
  },
  submitStatus: async () => {
    // When the user committed the status. Taken before the location fix (which can take
    // seconds) so the recorded time -- and the time an offline replay sends -- is the tap.
    const tappedAt = new Date();
    const { selectedStatus, note, selectedCall, selectedGroup, selectedPoi, responseType, respondingTo, getRequiredGpsAccuracy } = get();
    const showToast = useToastStore.getState().showToast;
    const { userId } = useAuthStore.getState();
    const { fetchCurrentUserInfo } = useHomeStore.getState();

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

    if (isNoteRequiredForStatus(selectedStatus) && note.trim().length === 0) {
      showToast('error', getTranslatedMessage('personnel.status.note_required', 'A note is required for this status'));
      return;
    }

    set({ isLoading: true });

    // Always ask for a fresh fix, whether or not the status demands one. The continuous watcher is
    // not a dependable source here: it only runs once sign-in has started it, its store is
    // deliberately never persisted, and permission can be revoked from the OS at any point. Asking
    // at submission time is also the only way `Gps` can be enforced honestly -- checking a cached
    // value would pass a status whose coordinates are hours old.
    const fix = await acquireLocationFix();

    if (fix.outcome !== 'acquired' && getRequiredGpsAccuracy()) {
      set({ isLoading: false });
      showToast('error', getLocationFixErrorMessage(fix.outcome));
      return;
    }

    // Fall back to the watcher's last value when the on-demand fix failed but the status does not
    // require one: a slightly stale position still helps dispatch more than an empty field.
    const coords = fix.location?.coords ?? null;
    const locationState = useLocationStore.getState();
    const latitude = coords?.latitude ?? locationState.latitude;
    const longitude = coords?.longitude ?? locationState.longitude;
    const accuracy = coords?.accuracy ?? locationState.accuracy;
    const altitude = coords?.altitude ?? locationState.altitude;
    const altitudeAccuracy = coords?.altitudeAccuracy ?? null;
    const speed = coords?.speed ?? locationState.speed;
    const heading = coords?.heading ?? locationState.heading;

    try {
      const status = new SavePersonStatusInput();
      // A status with no destination to pick still carries the default open call, so the call
      // report can show who was on scene when a department's "On Scene" has destination None.
      const implicitCall = hasDestinationChoicesForDetail(selectedStatus.Detail) ? null : getDefaultCallFromStores();
      const destinationPayload =
        responseType === 'call' && selectedCall
          ? getCallDestinationPayload(selectedCall)
          : responseType === 'station' && selectedGroup
            ? getStationDestinationPayload(selectedGroup)
            : responseType === 'poi' && selectedPoi
              ? getPoiDestinationPayload(selectedPoi)
              : implicitCall
                ? getCallDestinationPayload(implicitCall)
                : getNoneDestinationPayload();

      status.UserId = userId;
      status.Type = selectedStatus.Id.toString();
      status.Timestamp = tappedAt.toISOString();
      status.TimestampUtc = tappedAt.toUTCString().replace('UTC', 'GMT');
      status.Note = note;
      status.RespondingTo = respondingTo || destinationPayload.respondingTo;
      status.RespondingToType = destinationPayload.respondingToType;
      status.EventId = destinationPayload.eventId;
      status.Latitude = latitude != null ? latitude.toString() : '';
      status.Longitude = longitude != null ? longitude.toString() : '';
      status.Accuracy = accuracy != null ? accuracy.toString() : '';
      status.Altitude = altitude != null ? altitude.toString() : '';
      status.AltitudeAccuracy = altitudeAccuracy != null ? altitudeAccuracy.toString() : '';
      status.Speed = speed != null ? speed.toString() : '';
      status.Heading = heading != null ? heading.toString() : '';

      try {
        await savePersonnelStatus(status);
      } catch (error) {
        if (isConnectivityError(error)) {
          // Never reached a working API. The queue replays this exact payload, tap time included.
          offlineQueueProcessor.addPersonnelStatusToQueue(status);
          showToast('info', getTranslatedMessage('personnel.status.saved_offline', 'Status saved offline and will be submitted when connection is restored'));
          get().reset();
          return;
        }

        // The server answered and refused it. Queueing would only replay a request it refuses
        // again while telling the user it was saved, so say so and keep the sheet open to adjust.
        logger.warn({ message: 'Personnel status rejected by the server', context: { httpStatus: getResponseStatus(error) } });
        showToast('error', getTranslatedMessage('home.status.update_failed', 'Failed to update status'));
        return;
      }

      try {
        await fetchCurrentUserInfo();
      } catch (error) {
        // The status is saved; a failed refresh of the Home card must not report otherwise.
      }

      showToast('success', getTranslatedMessage('home.status.updated_successfully', 'Status updated successfully'));
      get().reset();
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
      poisError: null,
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
