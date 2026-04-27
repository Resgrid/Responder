import { create } from 'zustand';

import { getCalls } from '@/api/calls/calls';
import { getSetUnitStatusData } from '@/api/dispatch';
import { getAllGroups } from '@/api/groups/groups';
import { saveUnitStatus } from '@/api/units/unitStatuses';
import { logger } from '@/lib/logging';
import { type CallResultData } from '@/models/v4/calls/callResultData';
import { type CustomStatusResultData } from '@/models/v4/customStatuses/customStatusResultData';
import { type GroupResultData } from '@/models/v4/groups/groupsResultData';
import { type PoiResultData } from '@/models/v4/mapping/poiResultData';
import { type PoiTypeResultData } from '@/models/v4/mapping/poiTypeResultData';
import { type StatusesResultData } from '@/models/v4/statuses/statusesResultData';
import { type SaveUnitStatusInput, type SaveUnitStatusRoleInput } from '@/models/v4/unitStatus/saveUnitStatusInput';
import { offlineEventManager } from '@/services/offline-event-manager.service';
import { useCoreStore } from '@/stores/app/core-store';
import { useLocationStore } from '@/stores/app/location-store';

type StatusStep = 'select-status' | 'select-destination' | 'add-note';
type DestinationType = 'none' | 'call' | 'station' | 'poi';

// Status type that can accept both custom statuses and regular statuses
type StatusType = CustomStatusResultData | StatusesResultData;

interface StatusBottomSheetStore {
  isOpen: boolean;
  currentStep: StatusStep;
  selectedCall: CallResultData | null;
  selectedStation: GroupResultData | null;
  selectedPoi: PoiResultData | null;
  selectedDestinationType: DestinationType;
  selectedStatus: StatusType | null;
  cameFromStatusSelection: boolean; // Track whether we came from status selection flow
  note: string;
  availableCalls: CallResultData[];
  availableStations: GroupResultData[];
  availablePois: PoiResultData[];
  poiTypes: PoiTypeResultData[];
  isLoading: boolean;
  error: string | null;
  setIsOpen: (isOpen: boolean, status?: StatusType) => void;
  setCurrentStep: (step: StatusStep) => void;
  setSelectedCall: (call: CallResultData | null) => void;
  setSelectedStation: (station: GroupResultData | null) => void;
  setSelectedPoi: (poi: PoiResultData | null) => void;
  setSelectedDestinationType: (type: DestinationType) => void;
  setSelectedStatus: (status: StatusType | null) => void;
  setNote: (note: string) => void;
  fetchDestinationData: (unitId: string) => Promise<void>;
  reset: () => void;
}

export const useStatusBottomSheetStore = create<StatusBottomSheetStore>((set, get) => ({
  isOpen: false,
  currentStep: 'select-destination',
  selectedCall: null,
  selectedStation: null,
  selectedPoi: null,
  selectedDestinationType: 'none',
  selectedStatus: null,
  cameFromStatusSelection: false,
  note: '',
  availableCalls: [],
  availableStations: [],
  availablePois: [],
  poiTypes: [],
  isLoading: false,
  error: null,
  setIsOpen: (isOpen, status) => {
    if (isOpen && !status) {
      // If no status is provided, start with status selection
      set({ isOpen, selectedStatus: null, currentStep: 'select-status', cameFromStatusSelection: true });
    } else {
      // If status is provided, start with destination selection
      set({ isOpen, selectedStatus: status || null, currentStep: 'select-destination', cameFromStatusSelection: false });
    }
  },
  setCurrentStep: (step) => set({ currentStep: step }),
  setSelectedCall: (call) =>
    set({
      selectedCall: call,
      selectedStation: null,
      selectedPoi: null,
      selectedDestinationType: call ? 'call' : 'none',
    }),
  setSelectedStation: (station) =>
    set({
      selectedCall: null,
      selectedStation: station,
      selectedPoi: null,
      selectedDestinationType: station ? 'station' : 'none',
    }),
  setSelectedPoi: (poi) =>
    set({
      selectedCall: null,
      selectedStation: null,
      selectedPoi: poi,
      selectedDestinationType: poi ? 'poi' : 'none',
    }),
  setSelectedDestinationType: (type) =>
    set((state) =>
      type === 'none'
        ? {
            ...state,
            selectedCall: null,
            selectedStation: null,
            selectedPoi: null,
            selectedDestinationType: 'none',
          }
        : {
            ...state,
            selectedDestinationType: type,
          }
    ),
  setSelectedStatus: (status) => set({ selectedStatus: status }),
  setNote: (note) => set({ note }),
  fetchDestinationData: async (unitId: string) => {
    set({ isLoading: true, error: null });
    try {
      const bootstrapResponse = await getSetUnitStatusData(unitId);
      const unitStatusData = bootstrapResponse.Data;

      if (unitStatusData) {
        set({
          availableCalls: unitStatusData.Calls || [],
          availableStations: unitStatusData.Stations || [],
          availablePois: unitStatusData.DestinationPois || [],
          poiTypes: unitStatusData.PoiTypes || [],
          isLoading: false,
        });
        return;
      }

      const [callsResponse, groupsResponse] = await Promise.all([getCalls(), getAllGroups()]);

      set({
        availableCalls: callsResponse.Data || [],
        availableStations: groupsResponse.Data || [],
        availablePois: [],
        poiTypes: [],
        isLoading: false,
      });
    } catch (error) {
      set({
        error: 'Failed to fetch destination data',
        isLoading: false,
      });
    }
  },
  reset: () =>
    set({
      isOpen: false,
      currentStep: 'select-destination',
      selectedCall: null,
      selectedStation: null,
      selectedPoi: null,
      selectedDestinationType: 'none',
      selectedStatus: null,
      cameFromStatusSelection: false,
      note: '',
      availableCalls: [],
      availableStations: [],
      availablePois: [],
      poiTypes: [],
      isLoading: false,
      error: null,
    }),
}));

interface StatusesState {
  isLoading: boolean;
  error: string | null;
  saveUnitStatus: (input: SaveUnitStatusInput) => Promise<void>;
}

export const useStatusesStore = create<StatusesState>((set) => ({
  isLoading: false,
  error: null,
  saveUnitStatus: async (input: SaveUnitStatusInput) => {
    set({ isLoading: true, error: null });
    try {
      // Create a shallow clone to avoid mutating the original input
      const payload = { ...input };

      const date = new Date();
      payload.Timestamp = date.toISOString();
      payload.TimestampUtc = date.toUTCString().replace('UTC', 'GMT');

      // Only default GPS fields to empty strings if they are undefined
      payload.Latitude = payload.Latitude ?? '';
      payload.Longitude = payload.Longitude ?? '';
      payload.Accuracy = payload.Accuracy ?? '';
      payload.Altitude = payload.Altitude ?? '';
      payload.Speed = payload.Speed ?? '';
      payload.Heading = payload.Heading ?? '';

      try {
        // Try to save directly first
        await saveUnitStatus(payload);

        logger.info({
          message: 'Unit status saved successfully',
          context: { unitId: payload.Id, statusType: payload.Type },
        });

        set({ isLoading: false });
      } catch (error) {
        // If direct save fails, queue for offline processing
        logger.warn({
          message: 'Direct unit status save failed, queuing for offline processing',
          context: { unitId: payload.Id, statusType: payload.Type, error },
        });

        // Extract role data for queuing
        const roles = payload.Roles?.map((role) => ({
          roleId: role.RoleId,
          userId: role.UserId,
        }));

        // Extract GPS data for queuing - use location store if payload doesn't have GPS data
        let gpsData:
          | {
              latitude?: string;
              longitude?: string;
              accuracy?: string;
              altitude?: string;
              altitudeAccuracy?: string;
              speed?: string;
              heading?: string;
            }
          | undefined = undefined;

        if (payload.Latitude && payload.Longitude) {
          gpsData = {
            latitude: payload.Latitude,
            longitude: payload.Longitude,
            accuracy: payload.Accuracy,
            altitude: payload.Altitude,
            altitudeAccuracy: payload.AltitudeAccuracy,
            speed: payload.Speed,
            heading: payload.Heading,
          };
        } else {
          // Try to get GPS data from location store
          const locationState = useLocationStore.getState();
          if (locationState.latitude !== null && locationState.longitude !== null) {
            const gpsObject: {
              latitude?: string;
              longitude?: string;
              accuracy?: string;
              altitude?: string;
              altitudeAccuracy?: string;
              speed?: string;
              heading?: string;
            } = {
              latitude: locationState.latitude.toString(),
              longitude: locationState.longitude.toString(),
            };

            if (locationState.accuracy !== null) {
              gpsObject.accuracy = locationState.accuracy.toString();
            }
            if (locationState.altitude !== null) {
              gpsObject.altitude = locationState.altitude.toString();
            }
            if (locationState.speed !== null) {
              gpsObject.speed = locationState.speed.toString();
            }
            if (locationState.heading !== null) {
              gpsObject.heading = locationState.heading.toString();
            }

            gpsData = gpsObject;
          }
        }

        // Queue the event
        const eventId = offlineEventManager.queueUnitStatusEvent(payload.Id, payload.Type, payload.Note, payload.RespondingTo, roles, gpsData, payload.RespondingToType, payload.EventId);

        logger.info({
          message: 'Unit status queued for offline processing',
          context: { unitId: payload.Id, statusType: payload.Type, eventId },
        });

        set({ isLoading: false });
      }
    } catch (error) {
      logger.error({
        message: 'Failed to process unit status update',
        context: { error },
      });
      set({ error: 'Failed to save unit status', isLoading: false });
    }
  },
}));
