import { getPoiSelectionLabel } from '@/lib/poi';
import { type CallResultData } from '@/models/v4/calls/callResultData';
import { type GroupResultData } from '@/models/v4/groups/groupsResultData';
import { type PoiResultData } from '@/models/v4/mapping/poiResultData';
import { type GetCurrentStatusResultData } from '@/models/v4/personnelStatuses/getCurrentStatusResultData';
import { CALL_DESTINATION_DETAIL_TYPES, CustomStateDetailTypes, POI_DESTINATION_DETAIL_TYPES, STATION_DESTINATION_DETAIL_TYPES } from '@/models/v4/statuses/customStateDetailTypes';
import { DestinationEntityTypes } from '@/models/v4/statuses/destinationEntityTypes';
import { type StatusesResultData } from '@/models/v4/statuses/statusesResultData';

export type StatusDestinationType = 'none' | 'call' | 'station' | 'poi';
export type StatusDestinationTab = 'calls' | 'stations' | 'pois';
export type PersonnelStatusStep = 'select-status' | 'select-responding-to' | 'add-note';

// Server CustomStateNoteTypes: None = 0, Optional = 1, Required = 2.
const NOTE_TYPE_REQUIRED = 2;

export interface StatusDestinationPayload {
  respondingTo: string;
  respondingToType: DestinationEntityTypes | null;
  eventId: string;
}

// Pre-computed set of valid CustomStateDetailTypes numeric values used to
// guard against unknown future enum members arriving from the server.
const KNOWN_DETAIL_TYPES = new Set<number>((Object.values(CustomStateDetailTypes) as (string | number)[]).filter((v): v is number => typeof v === 'number'));

const toDetailType = (detail?: number | null): CustomStateDetailTypes => {
  if (detail == null) {
    return CustomStateDetailTypes.None;
  }
  return KNOWN_DETAIL_TYPES.has(detail) ? (detail as CustomStateDetailTypes) : CustomStateDetailTypes.None;
};

export const isDestinationRequiredForDetail = (detail?: number | null) => {
  return toDetailType(detail) !== CustomStateDetailTypes.None;
};

export const areCallsAllowedForDetail = (detail?: number | null) => {
  return CALL_DESTINATION_DETAIL_TYPES.includes(toDetailType(detail));
};

export const areStationsAllowedForDetail = (detail?: number | null) => {
  return STATION_DESTINATION_DETAIL_TYPES.includes(toDetailType(detail));
};

export const arePoisAllowedForDetail = (detail?: number | null) => {
  return POI_DESTINATION_DETAIL_TYPES.includes(toDetailType(detail));
};

export const arePoisAllowedForStatus = (detail?: number | null) => {
  if (arePoisAllowedForDetail(detail)) {
    return true;
  }

  // Some departments still expose destination-capable personnel statuses using the
  // older call/station Detail values even though POIs are valid destinations there.
  return areCallsAllowedForDetail(detail) || areStationsAllowedForDetail(detail);
};

export const getAllowedDestinationTabsForDetail = (detail?: number | null): StatusDestinationTab[] => {
  const allowedTabs: StatusDestinationTab[] = [];

  if (areCallsAllowedForDetail(detail)) {
    allowedTabs.push('calls');
  }

  if (areStationsAllowedForDetail(detail)) {
    allowedTabs.push('stations');
  }

  if (arePoisAllowedForDetail(detail)) {
    allowedTabs.push('pois');
  }

  return allowedTabs;
};

export const getDefaultDestinationTabForDetail = (detail?: number | null): StatusDestinationTab => {
  return getAllowedDestinationTabsForDetail(detail)[0] ?? 'calls';
};

/** Whether the status offers any destination to pick (a Detail of 0 offers none). */
export const hasDestinationChoicesForDetail = (detail?: number | null) => {
  return areCallsAllowedForDetail(detail) || areStationsAllowedForDetail(detail) || arePoisAllowedForStatus(detail);
};

export const getStatusNoteType = (status?: Pick<StatusesResultData, 'Note'> | null): number => {
  const noteType = Number(status?.Note);
  return Number.isFinite(noteType) ? noteType : 0;
};

export const hasNoteStepForStatus = (status?: Pick<StatusesResultData, 'Note'> | null) => {
  return getStatusNoteType(status) > 0;
};

export const isNoteRequiredForStatus = (status?: Pick<StatusesResultData, 'Note'> | null) => {
  return getStatusNoteType(status) === NOTE_TYPE_REQUIRED;
};

interface PersonnelStatusStepOptions {
  requiresStatusSelection: boolean;
  hasStatus: boolean;
  hasDestinationChoices: boolean;
  hasNoteStep: boolean;
}

/**
 * The steps the personnel status sheet walks through, in order. The last one carries Save.
 * A status with no destination to pick skips the destination step, and one with a note type
 * of None skips the note step; when both are skipped the destination step stays on as the
 * single screen to save from.
 */
export const getPersonnelStatusSteps = ({ requiresStatusSelection, hasStatus, hasDestinationChoices, hasNoteStep }: PersonnelStatusStepOptions): PersonnelStatusStep[] => {
  const steps: PersonnelStatusStep[] = requiresStatusSelection ? ['select-status'] : [];

  if (!hasStatus) {
    // Until a status is picked its destination and note options are unknown.
    steps.push('select-responding-to', 'add-note');
    return steps;
  }

  if (hasDestinationChoices || !hasNoteStep) {
    steps.push('select-responding-to');
  }

  if (hasNoteStep) {
    steps.push('add-note');
  }

  return steps;
};

type CurrentStatusDestination = Pick<GetCurrentStatusResultData, 'DestinationId' | 'DestinationType'>;

const isCallStatusDestination = (currentStatus: CurrentStatusDestination) => {
  const rawType = currentStatus.DestinationType;

  // Untyped rows predate DestinationType -- the server's dispatch auto-status still writes
  // them with only a DestinationId -- so they count as a call only when that id is an open
  // call (checked by the caller).
  if (rawType == null || `${rawType}`.trim() === '') {
    return true;
  }

  const destinationType = Number(rawType);
  return destinationType === 0 || destinationType === DestinationEntityTypes.Call;
};

/**
 * The call a new personnel status should default to: the call the user set active (call
 * detail "Set Active Call" / Home Active Call tab), otherwise the call their current status
 * already points at. Either one only counts while it is still in the open calls list; the
 * returned object is the list's copy, so it matches what the sheet renders.
 */
export const getDefaultStatusCall = (
  openCalls: CallResultData[] | null | undefined,
  activeCall: Pick<CallResultData, 'CallId'> | null | undefined,
  currentStatus: CurrentStatusDestination | null | undefined
): CallResultData | null => {
  const calls = openCalls ?? [];

  const findOpenCall = (callId: unknown): CallResultData | null => {
    const id = `${callId ?? ''}`.trim();

    if (!id || id === '0') {
      return null;
    }

    return calls.find((call) => `${call.CallId}` === id) ?? null;
  };

  const openActiveCall = activeCall ? findOpenCall(activeCall.CallId) : null;

  if (openActiveCall) {
    return openActiveCall;
  }

  if (currentStatus && isCallStatusDestination(currentStatus)) {
    return findOpenCall(currentStatus.DestinationId);
  }

  return null;
};

export const getCallDestinationDisplay = (call: CallResultData) => {
  const callNumber = call.Number?.trim() ?? '';
  const callName = call.Name?.trim() ?? '';

  if (callNumber && callName) {
    return `${callNumber} - ${callName}`;
  }

  return callNumber || callName || call.Address?.trim() || '';
};

export const getStationDestinationDisplay = (group: GroupResultData) => {
  return group.Name?.trim() || group.Address?.trim() || '';
};

export const getPoiDestinationDisplay = (poi: PoiResultData) => {
  const poiLabel = getPoiSelectionLabel(poi);
  return poi.PoiTypeName ? `${poi.PoiTypeName} - ${poiLabel}` : poiLabel;
};

export const getNoneDestinationPayload = (): StatusDestinationPayload => ({
  respondingTo: '',
  respondingToType: null,
  eventId: '',
});

export const getCallDestinationPayload = (call: CallResultData): StatusDestinationPayload => ({
  respondingTo: call.CallId,
  respondingToType: DestinationEntityTypes.Call,
  eventId: call.CallId,
});

export const getStationDestinationPayload = (group: GroupResultData): StatusDestinationPayload => ({
  respondingTo: group.GroupId,
  respondingToType: DestinationEntityTypes.Station,
  eventId: group.GroupId,
});

export const getPoiDestinationPayload = (poi: PoiResultData): StatusDestinationPayload => ({
  respondingTo: poi.PoiId.toString(),
  respondingToType: DestinationEntityTypes.Poi,
  eventId: '',
});
