import { getPoiSelectionLabel } from '@/lib/poi';
import { type CallResultData } from '@/models/v4/calls/callResultData';
import { type GroupResultData } from '@/models/v4/groups/groupsResultData';
import { type PoiResultData } from '@/models/v4/mapping/poiResultData';
import { CALL_DESTINATION_DETAIL_TYPES, CustomStateDetailTypes, POI_DESTINATION_DETAIL_TYPES, STATION_DESTINATION_DETAIL_TYPES } from '@/models/v4/statuses/customStateDetailTypes';
import { DestinationEntityTypes } from '@/models/v4/statuses/destinationEntityTypes';

export type StatusDestinationType = 'none' | 'call' | 'station' | 'poi';
export type StatusDestinationTab = 'calls' | 'stations' | 'pois';

export interface StatusDestinationPayload {
  respondingTo: string;
  respondingToType: DestinationEntityTypes | null;
  eventId: string;
}

const toDetailType = (detail?: number | null) => {
  return (detail ?? CustomStateDetailTypes.None) as CustomStateDetailTypes;
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
