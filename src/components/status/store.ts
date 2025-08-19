import { create } from 'zustand';

import { getCalls } from '@/api/calls/calls';
import { getAllGroups } from '@/api/groups/groups';
import { saveUnitStatus } from '@/api/units/unitStatuses';
import { logger } from '@/lib/logging';
import { type CallResultData } from '@/models/v4/calls/callResultData';
import { type CustomStatusResultData } from '@/models/v4/customStatuses/customStatusResultData';
import { type GroupResultData } from '@/models/v4/groups/groupsResultData';
import { type StatusesResultData } from '@/models/v4/statuses/statusesResultData';
import { type SaveUnitStatusInput, type SaveUnitStatusRoleInput } from '@/models/v4/unitStatus/saveUnitStatusInput';
import { offlineEventManager } from '@/services/offline-event-manager.service';
import { useCoreStore } from '@/stores/app/core-store';
import { useLocationStore } from '@/stores/app/location-store';

type StatusStep = 'select-status' | 'select-destination' | 'add-note';
type DestinationType = 'none' | 'call' | 'station';

// Status type that can accept both custom statuses and regular statuses
type StatusType = CustomStatusResultData | StatusesResultData;

interface StatusBottomSheetStore {
  isOpen: boolean;
  currentStep: StatusStep;
  selectedCall: CallResultData | null;
  selectedStation: GroupResultData | null;
  selectedDestinationType: DestinationType;
  selectedStatus: StatusType | null;
  cameFromStatusSelection: boolean; // Track whether we came from status selection flow
  note: string;
  availableCalls: CallResultData[];
  availableStations: GroupResultData[];
  isLoading: boolean;
  error: string | null;
  setIsOpen: (isOpen: boolean, status?: StatusType) => void;
  setCurrentStep: (step: StatusStep) => void;
  setSelectedCall: (call: CallResultData | null) => void;
  setSelectedStation: (station: GroupResultData | null) => void;
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
  selectedDestinationType: 'none',
  selectedStatus: null,
  cameFromStatusSelection: false,
  note: '',
  availableCalls: [],
  availableStations: [],
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
  setSelectedCall: (call) => set({ selectedCall: call }),
  setSelectedStation: (station) => set({ selectedStation: station }),
  setSelectedDestinationType: (type) => set({ selectedDestinationType: type }),
  setSelectedStatus: (status) => set({ selectedStatus: status }),
  setNote: (note) => set({ note }),
  fetchDestinationData: async (unitId: string) => {
    set({ isLoading: true, error: null });
    try {
      // Fetch calls and groups (stations) in parallel
      const [callsResponse, groupsResponse] = await Promise.all([getCalls(), getAllGroups()]);

      set({
        availableCalls: callsResponse.Data || [],
        availableStations: groupsResponse.Data || [],
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
      selectedDestinationType: 'none',
      selectedStatus: null,
      cameFromStatusSelection: false,
      note: '',
      availableCalls: [],
      availableStations: [],
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
      const date = new Date();
      input.Timestamp = date.toISOString();
      input.TimestampUtc = date.toUTCString().replace('UTC', 'GMT');

      // Ensure empty strings when no GPS data
      input.Latitude = '';
      input.Longitude = '';
      input.Accuracy = '';
      input.Altitude = '';
      input.Speed = '';
      input.Heading = '';

      try {
        // Try to save directly first
        await saveUnitStatus(input);

        logger.info({
          message: 'Unit status saved successfully',
          context: { unitId: input.Id, statusType: input.Type },
        });

        set({ isLoading: false });
      } catch (error) {
        // If direct save fails, queue for offline processing
        logger.warn({
          message: 'Direct unit status save failed, queuing for offline processing',
          context: { unitId: input.Id, statusType: input.Type, error },
        });

        // Extract role data for queuing
        const roles = input.Roles?.map((role) => ({
          roleId: role.RoleId,
          userId: role.UserId,
        }));

        // Extract GPS data for queuing - use location store if input doesn't have GPS data
        let gpsData = undefined;

        if (input.Latitude && input.Longitude) {
          gpsData = {
            latitude: input.Latitude,
            longitude: input.Longitude,
            accuracy: input.Accuracy,
            altitude: input.Altitude,
            altitudeAccuracy: input.AltitudeAccuracy,
            speed: input.Speed,
            heading: input.Heading,
          };
        } else {
          // Try to get GPS data from location store
          const locationState = useLocationStore.getState();
          if (locationState.latitude !== null && locationState.longitude !== null) {
            gpsData = {
              latitude: locationState.latitude.toString(),
              longitude: locationState.longitude.toString(),
              accuracy: locationState.accuracy?.toString(),
              altitude: locationState.altitude?.toString(),
              altitudeAccuracy: undefined, // Not available in location store
              speed: locationState.speed?.toString(),
              heading: locationState.heading?.toString(),
            };
          }
        }

        // Queue the event
        const eventId = offlineEventManager.queueUnitStatusEvent(input.Id, input.Type, input.Note, input.RespondingTo, roles, gpsData);

        logger.info({
          message: 'Unit status queued for offline processing',
          context: { unitId: input.Id, statusType: input.Type, eventId },
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
