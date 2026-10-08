import { type ActiveCallsResult } from '@/models/v4/calls/activeCallsResult';
import { type CallExtraDataResult } from '@/models/v4/calls/callExtraDataResult';
import { type CallResult } from '@/models/v4/calls/callResult';
import { type SaveCallResult } from '@/models/v4/calls/saveCallResult';

import { createApiEndpoint } from '../common/client';

const callsApi = createApiEndpoint('/Calls/GetActiveCalls');
const getCallApi = createApiEndpoint('/Calls/GetCall');
const getCallExtraDataApi = createApiEndpoint('/Calls/GetCallExtraData');
const createCallApi = createApiEndpoint('/Calls/SaveCall');
const updateCallApi = createApiEndpoint('/Calls/EditCall');
const closeCallApi = createApiEndpoint('/Calls/CloseCall');

export const getCalls = async () => {
  const response = await callsApi.get<ActiveCallsResult>();
  return response.data;
};

export const getCallExtraData = async (callId: string) => {
  const response = await getCallExtraDataApi.get<CallExtraDataResult>({
    callId: callId,
  });
  return response.data;
};

export const getCall = async (callId: string) => {
  const response = await getCallApi.get<CallResult>({
    callId: callId,
  });
  return response.data;
};

export interface CreateCallRequest {
  name: string;
  nature: string;
  note?: string;
  address?: string;
  destinationPoiId?: number | null;
  latitude?: number;
  longitude?: number;
  priority: number;
  type?: string;
  contactName?: string;
  contactInfo?: string;
  /** External (CAD) call id. On update a blank value keeps the stored one. */
  externalId?: string;
  /** Incident id. On update a blank value keeps the stored one. */
  incidentId?: string;
  /** Reference id. On update a blank value keeps the stored one. */
  referenceId?: string;
  /**
   * Scheduled dispatch time, ISO 8601 UTC. Left out of the request when not set: on create the call goes out
   * now, on update the stored schedule is kept (the API has no way to clear it).
   */
  dispatchOnUtc?: string;
  /** Primary Contact (premises/customer record) to link; the contact must belong to the department. */
  contactId?: string | null;
  /** Additional Contacts to link. On update, supplying either list replaces the existing links; omitting both leaves them alone. */
  additionalContactIds?: string[];
  what3words?: string;
  plusCode?: string;
  dispatchUsers?: string[];
  dispatchGroups?: string[];
  dispatchRoles?: string[];
  dispatchUnits?: string[];
  dispatchEveryone?: boolean;
}

export interface UpdateCallRequest {
  callId: string;
  name: string;
  nature: string;
  note?: string;
  address?: string;
  destinationPoiId?: number | null;
  latitude?: number;
  longitude?: number;
  priority: number;
  type?: string;
  contactName?: string;
  contactInfo?: string;
  /** External (CAD) call id. On update a blank value keeps the stored one. */
  externalId?: string;
  /** Incident id. On update a blank value keeps the stored one. */
  incidentId?: string;
  /** Reference id. On update a blank value keeps the stored one. */
  referenceId?: string;
  /**
   * Scheduled dispatch time, ISO 8601 UTC. Left out of the request when not set: on create the call goes out
   * now, on update the stored schedule is kept (the API has no way to clear it).
   */
  dispatchOnUtc?: string;
  /** Primary Contact (premises/customer record) to link; the contact must belong to the department. */
  contactId?: string | null;
  /** Additional Contacts to link. On update, supplying either list replaces the existing links; omitting both leaves them alone. */
  additionalContactIds?: string[];
  what3words?: string;
  plusCode?: string;
  dispatchUsers?: string[];
  dispatchGroups?: string[];
  dispatchRoles?: string[];
  dispatchUnits?: string[];
  dispatchEveryone?: boolean;
}

export interface CloseCallRequest {
  callId: string;
  type: number;
  note?: string;
  /**
   * Alert everyone attached to the call (dispatched personnel, groups, roles, units and the incident
   * command team) that it is closed. Omitted from the request when not set, leaving the server default.
   */
  sendNotification?: boolean;
}

export const createCall = async (callData: CreateCallRequest) => {
  let dispatchList = '';

  if (callData.dispatchEveryone) {
    dispatchList = '0';
  } else {
    const dispatchEntries: string[] = [];

    if (callData.dispatchUsers) {
      dispatchEntries.push(...callData.dispatchUsers.map((user) => `P:${user}`));
    }
    if (callData.dispatchGroups) {
      dispatchEntries.push(...callData.dispatchGroups.map((group) => `G:${group}`));
    }
    if (callData.dispatchRoles) {
      dispatchEntries.push(...callData.dispatchRoles.map((role) => `R:${role}`));
    }
    if (callData.dispatchUnits) {
      dispatchEntries.push(...callData.dispatchUnits.map((unit) => `U:${unit}`));
    }

    dispatchList = dispatchEntries.join('|');
  }

  const data = {
    Name: callData.name,
    Nature: callData.nature,
    Note: callData.note || '',
    Address: callData.address || '',
    DestinationPoiId: callData.destinationPoiId ?? null,
    Geolocation: `${callData.latitude?.toString() || ''},${callData.longitude?.toString() || ''}`,
    Priority: callData.priority,
    Type: callData.type || '',
    ContactName: callData.contactName || '',
    ContactInfo: callData.contactInfo || '',
    ExternalId: callData.externalId || '',
    IncidentId: callData.incidentId || '',
    ReferenceId: callData.referenceId || '',
    ...(callData.dispatchOnUtc ? { DispatchOnUtc: callData.dispatchOnUtc } : {}),
    ...(callData.contactId !== undefined ? { ContactId: callData.contactId || '' } : {}),
    ...(callData.additionalContactIds !== undefined ? { AdditionalContactIds: callData.additionalContactIds } : {}),
    What3Words: callData.what3words || '',
    PlusCode: callData.plusCode || '',
    DispatchList: dispatchList,
  };

  const response = await createCallApi.post<SaveCallResult>(data);
  return response.data;
};

export const updateCall = async (callData: UpdateCallRequest) => {
  let dispatchList = '';

  if (callData.dispatchEveryone) {
    dispatchList = '0';
  } else {
    const dispatchEntries: string[] = [];

    if (callData.dispatchUsers) {
      dispatchEntries.push(...callData.dispatchUsers.map((user) => `P:${user}`));
    }
    if (callData.dispatchGroups) {
      dispatchEntries.push(...callData.dispatchGroups.map((group) => `G:${group}`));
    }
    if (callData.dispatchRoles) {
      dispatchEntries.push(...callData.dispatchRoles.map((role) => `R:${role}`));
    }
    if (callData.dispatchUnits) {
      dispatchEntries.push(...callData.dispatchUnits.map((unit) => `U:${unit}`));
    }

    dispatchList = dispatchEntries.join('|');
  }

  const data = {
    Id: callData.callId,
    Name: callData.name,
    Nature: callData.nature,
    Note: callData.note || '',
    Address: callData.address || '',
    DestinationPoiId: callData.destinationPoiId ?? null,
    Geolocation: `${callData.latitude?.toString() || ''},${callData.longitude?.toString() || ''}`,
    Priority: callData.priority,
    Type: callData.type || '',
    ContactName: callData.contactName || '',
    ContactInfo: callData.contactInfo || '',
    ExternalId: callData.externalId || '',
    IncidentId: callData.incidentId || '',
    ReferenceId: callData.referenceId || '',
    ...(callData.dispatchOnUtc ? { DispatchOnUtc: callData.dispatchOnUtc } : {}),
    ...(callData.contactId !== undefined ? { ContactId: callData.contactId || '' } : {}),
    ...(callData.additionalContactIds !== undefined ? { AdditionalContactIds: callData.additionalContactIds } : {}),
    What3Words: callData.what3words || '',
    DispatchList: dispatchList,
  };

  const response = await updateCallApi.put<SaveCallResult>(data);
  return response.data;
};

export const closeCall = async (callData: CloseCallRequest) => {
  const data = {
    Id: callData.callId,
    Type: callData.type,
    Notes: callData.note || '',
    ...(callData.sendNotification !== undefined ? { SendNotification: callData.sendNotification } : {}),
  };

  const response = await closeCallApi.put<SaveCallResult>(data);
  return response.data;
};
