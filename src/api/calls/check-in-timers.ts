import { type CheckInRecordResult } from '@/models/v4/checkIn/checkInRecordResult';
import { type CheckInTimerStatusResult } from '@/models/v4/checkIn/checkInTimerStatusResult';
import { type PerformCheckInResult } from '@/models/v4/checkIn/performCheckInResult';
import { type ResolvedCheckInTimerResult } from '@/models/v4/checkIn/resolvedCheckInTimerResult';

import { createApiEndpoint } from '../common/client';

const getTimerStatusesApi = createApiEndpoint('/CheckInTimers/GetTimerStatuses');
const getTimersForCallApi = createApiEndpoint('/CheckInTimers/GetTimersForCall');
const performCheckInApi = createApiEndpoint('/CheckInTimers/PerformCheckIn');
const getCheckInHistoryApi = createApiEndpoint('/CheckInTimers/GetCheckInHistory');
const toggleCallTimersApi = createApiEndpoint('/CheckInTimers/ToggleCallTimers');

export interface PerformCheckInInput {
  CallId: number;
  CheckInType: number;
  UnitId?: number;
  Latitude?: string;
  Longitude?: string;
  Note?: string;
}

export const getTimerStatuses = async (callId: number) => {
  const response = await getTimerStatusesApi.get<CheckInTimerStatusResult>({
    callId: callId,
  });
  return response.data;
};

export const getTimersForCall = async (callId: number) => {
  const response = await getTimersForCallApi.get<ResolvedCheckInTimerResult>({
    callId: callId,
  });
  return response.data;
};

export const performCheckIn = async (input: PerformCheckInInput) => {
  const response = await performCheckInApi.post<PerformCheckInResult>({
    CallId: input.CallId,
    CheckInType: input.CheckInType,
    UnitId: input.UnitId ?? 0,
    Latitude: input.Latitude ?? '',
    Longitude: input.Longitude ?? '',
    Note: input.Note ?? '',
  });
  return response.data;
};

export const getCheckInHistory = async (callId: number) => {
  const response = await getCheckInHistoryApi.get<CheckInRecordResult>({
    callId: callId,
  });
  return response.data;
};

export const toggleCallTimers = async (callId: number, enabled: boolean) => {
  const response = await toggleCallTimersApi.put<PerformCheckInResult>({
    CallId: callId,
    Enabled: enabled,
  });
  return response.data;
};
