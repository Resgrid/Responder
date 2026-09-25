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
  /** Why the last save did not go through, shown in the sheet (toasts render beneath its modal). */
  submitError: string | null;
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

/**
 * Each opening of the sheet is one session; opening, closing or resetting it starts the next. A
 * submission only touches the sheet -- or goes on to send -- while the session it started in is
 * still current. Closing the sheet while "Submitting..." used to leave the request running: the
 * abandoned status was still sent, and when it finished its reset closed whatever sheet the user
 * had opened since and cleared that sheet's loading state mid-save.
 */
let sheetSession = 0;
/** Bumped by each submission as it sends, so a stale one can tell a newer status went out since. */
let latestSubmission = 0;

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
  submitError: null,
  groups: [],
  isLoadingGroups: false,
  pois: [],
  poiTypes: [],
  isLoadingPois: false,
  poisError: null,
  setIsOpen: (isOpen, status, options) => {
    sheetSession++;

    if (!isOpen) {
      set({ isOpen: false, isLoading: false, submitError: null });
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
      isLoading: false,
      submitError: null,
      ...destinationState,
    });
  },
  // The setters that change what Save would send clear `submitError`: it described the last attempt.
  setCurrentStep: (step) => set({ currentStep: step }),
  setSelectedCall: (call) => {
    set({
      selectedCall: call,
      selectedGroup: null,
      selectedPoi: null,
      responseType: call ? 'call' : 'none',
      selectedTab: 'calls',
      respondingTo: call ? call.CallId : '',
      submitError: null,
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
      submitError: null,
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
      submitError: null,
    });
  },
  setResponseType: (type) => {
    if (type === 'none') {
      set({ ...getClearedDestinationState(get().selectedTab), submitError: null });
      return;
    }

    set({
      responseType: type,
      selectedTab: type === 'call' ? 'calls' : type === 'station' ? 'stations' : 'pois',
      submitError: null,
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
      submitError: null,
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
  setNote: (note) => set({ note, submitError: null }),
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
      set({ currentStep: steps[index + 1], submitError: null });
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
      set({ currentStep: steps[index - 1], submitError: null });
    }
  },
  submitStatus: async () => {
    // A second tap that lands before the disabled Save re-renders must not send the status twice.
    if (get().isLoading) {
      return;
    }

    // When the user committed the status. Taken before the location fix (which can take
    // seconds) so the recorded time -- and the time an offline replay sends -- is the tap.
    const tappedAt = new Date();
    const session = sheetSession;
    const isCurrentSession = () => session === sheetSession;
    const { selectedStatus, note, selectedCall, selectedGroup, selectedPoi, responseType, respondingTo, getRequiredGpsAccuracy } = get();
    const showToast = useToastStore.getState().showToast;
    const { userId } = useAuthStore.getState();
    const { fetchCurrentUserInfo } = useHomeStore.getState();

    // The sheet is a native modal and covers the app's toast layer, so while it is open the
    // problem is shown in the sheet. A toast only reaches the user once the sheet is gone.
    const reportError = (message: string) => {
      if (isCurrentSession() && get().isOpen) {
        set({ submitError: message });
      } else {
        showToast('error', message);
      }
    };

    if (!userId || !selectedStatus) {
      reportError(getTranslatedMessage('personnel.status.missing_required_info', 'Missing required information'));
      return;
    }

    if (isDestinationRequiredForDetail(selectedStatus.Detail)) {
      const hasDestination = (responseType === 'call' && selectedCall != null) || (responseType === 'station' && selectedGroup != null) || (responseType === 'poi' && selectedPoi != null);

      if (!hasDestination) {
        reportError(getTranslatedMessage('personnel.status.destination_required', 'A destination is required for this status'));
        return;
      }
    }

    if (isNoteRequiredForStatus(selectedStatus) && note.trim().length === 0) {
      reportError(getTranslatedMessage('personnel.status.note_required', 'A note is required for this status'));
      return;
    }

    set({ isLoading: true, submitError: null });

    try {
      // Always ask for a fresh fix, whether or not the status demands one. The continuous watcher is
      // not a dependable source here: it only runs once sign-in has started it, its store is
      // deliberately never persisted, and permission can be revoked from the OS at any point. Asking
      // at submission time is also the only way `Gps` can be enforced honestly -- checking a cached
      // value would pass a status whose coordinates are hours old.
      const fix = await acquireLocationFix();

      // Closed or replaced while the fix was taken. Nothing has been sent yet, so honour that.
      if (!isCurrentSession()) {
        logger.info({ message: 'Personnel status abandoned before sending: the sheet was closed' });
        return;
      }

      if (fix.outcome !== 'acquired' && getRequiredGpsAccuracy()) {
        reportError(getLocationFixErrorMessage(fix.outcome));
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

      // From here the request is out, so closing the sheet no longer stops it: a stale submission
      // still reports its outcome, it just leaves the sheet (and any newer one) alone.
      const submission = ++latestSubmission;

      try {
        await savePersonnelStatus(status);
      } catch (error) {
        if (isConnectivityError(error)) {
          if (!isCurrentSession() && submission !== latestSubmission) {
            // Closed mid-send, and the user has sent another status since. Replaying this older
            // one later would land on top of the newer status.
            logger.warn({ message: 'Dropping a superseded personnel status instead of queueing it offline' });
            return;
          }

          // Never reached a working API. The queue replays this exact payload, tap time included.
          offlineQueueProcessor.addPersonnelStatusToQueue(status);
          showToast('info', getTranslatedMessage('personnel.status.saved_offline', 'Status saved offline and will be submitted when connection is restored'));
          if (isCurrentSession()) {
            get().reset();
          }
          return;
        }

        // The server answered and refused it. Queueing would only replay a request it refuses
        // again while telling the user it was saved, so say so and keep the sheet open to adjust.
        logger.warn({ message: 'Personnel status rejected by the server', context: { httpStatus: getResponseStatus(error) } });
        reportError(getTranslatedMessage('home.status.update_failed', 'Failed to update status'));
        return;
      }

      // Close as soon as it is saved. Refreshing the Home card can take as long as the save did,
      // and holding the sheet on "Submitting..." for it is what tempted users to close and retry.
      if (isCurrentSession()) {
        get().reset();
      }
      showToast('success', getTranslatedMessage('home.status.updated_successfully', 'Status updated successfully'));

      const refreshHomeCard = async () => {
        try {
          await fetchCurrentUserInfo();
        } catch (error) {
          // The status is saved; a failed refresh of the Home card must not report otherwise.
        }
      };
      void refreshHomeCard();
    } catch (error) {
      reportError(getTranslatedMessage('home.status.update_failed', 'Failed to update status'));
    } finally {
      // A reset or a newer sheet already set this for the session that now owns it.
      if (isCurrentSession()) {
        set({ isLoading: false });
      }
    }
  },
  reset: () => {
    sheetSession++;
    set({
      isOpen: false,
      requiresStatusSelection: false,
      currentStep: 'select-responding-to',
      selectedStatus: null,
      note: '',
      isLoading: false,
      submitError: null,
      groups: [],
      isLoadingGroups: false,
      pois: [],
      poiTypes: [],
      isLoadingPois: false,
      poisError: null,
      ...getClearedDestinationState(),
    });
  },
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
