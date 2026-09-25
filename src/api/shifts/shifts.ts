import { type OnDutyPersonnelResult } from '@/models/v4/shifts/onDutyPersonnelResult';
import { type PendingApprovalsResult } from '@/models/v4/shifts/pendingApprovalsResult';
import { type ShiftActionResult } from '@/models/v4/shifts/shiftActionResult';
import { type ShiftDayResult } from '@/models/v4/shifts/shiftDayResult';
import { type ShiftDaysResult } from '@/models/v4/shifts/shiftDaysResult';
import { type ShiftPersonOptionsResult } from '@/models/v4/shifts/shiftPersonOptionsResult';
import { type ShiftResult } from '@/models/v4/shifts/shiftResult';
import { type ShiftsResult } from '@/models/v4/shifts/shiftsResult';
import { type ShiftTradesResult } from '@/models/v4/shifts/shiftTradesResult';
import { type SignupShiftDayResult } from '@/models/v4/shifts/signupShiftDayResult';

import { createApiEndpoint } from '../common/client';

// Shift data is live roster state (sign-ups, trades, approvals), so nothing here is cached:
// a stale copy would show someone an open slot that was filled a minute ago.
const getShiftsApi = createApiEndpoint('/Shifts/GetShifts');
const getShiftApi = createApiEndpoint('/Shifts/GetShift');
const getTodaysShiftsApi = createApiEndpoint('/Shifts/GetTodaysShifts');
const getShiftDayApi = createApiEndpoint('/Shifts/GetShiftDay');
const getShiftDaysForDateRangeApi = createApiEndpoint('/Shifts/GetShiftDaysForDateRange');
const getMyShiftsApi = createApiEndpoint('/Shifts/GetMyShifts');
const signupForShiftDayApi = createApiEndpoint('/Shifts/SignupForShiftDay');
const withdrawFromShiftDayApi = createApiEndpoint('/Shifts/WithdrawFromShiftDay');
const getShiftTradesApi = createApiEndpoint('/Shifts/GetShiftTrades');
const getTradeCandidatesApi = createApiEndpoint('/Shifts/GetTradeCandidates');
const requestShiftTradeApi = createApiEndpoint('/Shifts/RequestShiftTrade');
const respondToShiftTradeApi = createApiEndpoint('/Shifts/RespondToShiftTrade');
const finishShiftTradeApi = createApiEndpoint('/Shifts/FinishShiftTrade');
const cancelShiftTradeApi = createApiEndpoint('/Shifts/CancelShiftTrade');
const getPendingApprovalsApi = createApiEndpoint('/Shifts/GetPendingApprovals');
const reviewShiftSignupApi = createApiEndpoint('/Shifts/ReviewShiftSignup');
const reviewShiftTradeApi = createApiEndpoint('/Shifts/ReviewShiftTrade');
const getShiftDayPersonnelOptionsApi = createApiEndpoint('/Shifts/GetShiftDayPersonnelOptions');
const assignToShiftDayApi = createApiEndpoint('/Shifts/AssignToShiftDay');
const removeFromShiftDayApi = createApiEndpoint('/Shifts/RemoveFromShiftDay');
const getOnDutyPersonnelApi = createApiEndpoint('/Shifts/GetOnDutyPersonnel');

/**
 * Result ids are strings, but the POST inputs bind numeric ids (user ids stay GUID strings).
 * Converting here keeps every call site on the string ids it got from the server.
 */
export const toNumericId = (id: string | number): number => (typeof id === 'number' ? id : Number.parseInt(id, 10));

/** GET /Shifts/GetShifts */
export const getAllShifts = async () => {
  const response = await getShiftsApi.get<ShiftsResult>();
  return response.data;
};

/** GET /Shifts/GetShift?id= */
export const getShift = async (shiftId: string) => {
  const response = await getShiftApi.get<ShiftResult>({ id: shiftId });
  return response.data;
};

/** GET /Shifts/GetTodaysShifts — full entries, including overnight days still running from yesterday. */
export const getTodaysShifts = async () => {
  const response = await getTodaysShiftsApi.get<ShiftDaysResult>();
  return response.data;
};

/** GET /Shifts/GetShiftDay?id= — full entry (Roster, Needs, Signups). */
export const getShiftDay = async (shiftDayId: string) => {
  const response = await getShiftDayApi.get<ShiftDayResult>({ id: shiftDayId });
  return response.data;
};

/**
 * GET /Shifts/GetShiftDaysForDateRange — light entries. `start` / `end` are department-local
 * `YYYY-MM-DD` dates, `end` inclusive, at most 62 days apart.
 */
export const getShiftDaysForDateRange = async (start: string, end: string, shiftId?: string) => {
  const params: Record<string, unknown> = { start, end };
  if (shiftId) {
    params.shiftId = shiftId;
  }
  const response = await getShiftDaysForDateRangeApi.get<ShiftDaysResult>(params);
  return response.data;
};

/** GET /Shifts/GetMyShifts — light entries the caller is on (or pending for). The server defaults to today .. +30 days. */
export const getMyShifts = async (start?: string, end?: string) => {
  const params: Record<string, unknown> = {};
  if (start) {
    params.start = start;
  }
  if (end) {
    params.end = end;
  }
  const response = await getMyShiftsApi.get<ShiftDaysResult>(Object.keys(params).length > 0 ? params : undefined);
  return response.data;
};

/** POST /Shifts/SignupForShiftDay — the server requires the group (team) the caller is signing up under. */
export const signupForShiftDay = async (shiftDayId: string, groupId: string) => {
  const response = await signupForShiftDayApi.post<SignupShiftDayResult>({
    ShiftDayId: toNumericId(shiftDayId),
    GroupId: toNumericId(groupId),
  });
  return response.data;
};

/** POST /Shifts/WithdrawFromShiftDay */
export const withdrawFromShiftDay = async (shiftSignupId: string) => {
  const response = await withdrawFromShiftDayApi.post<ShiftActionResult>({
    ShiftSignupId: toNumericId(shiftSignupId),
  });
  return response.data;
};

/** GET /Shifts/GetShiftTrades — the caller's outgoing and incoming trades. */
export const getShiftTrades = async () => {
  const response = await getShiftTradesApi.get<ShiftTradesResult>();
  return response.data;
};

/** GET /Shifts/GetTradeCandidates?shiftDayId= — people who could take the caller's slot on that day. */
export const getTradeCandidates = async (shiftDayId: string) => {
  const response = await getTradeCandidatesApi.get<ShiftPersonOptionsResult>({ shiftDayId });
  return response.data;
};

/** POST /Shifts/RequestShiftTrade */
export const requestShiftTrade = async (shiftDayId: string, userIds: string[], note: string) => {
  const response = await requestShiftTradeApi.post<ShiftActionResult>({
    ShiftDayId: toNumericId(shiftDayId),
    UserIds: userIds,
    Note: note,
  });
  return response.data;
};

/** POST /Shifts/RespondToShiftTrade — accept (optionally offering swap-back sign-ups) or decline. */
export const respondToShiftTrade = async (shiftSignupTradeId: string, accept: boolean, note: string, offeredShiftSignupIds: string[] = []) => {
  const response = await respondToShiftTradeApi.post<ShiftActionResult>({
    ShiftSignupTradeId: toNumericId(shiftSignupTradeId),
    Accept: accept,
    Note: note,
    OfferedShiftSignupIds: offeredShiftSignupIds.map(toNumericId),
  });
  return response.data;
};

/**
 * POST /Shifts/FinishShiftTrade — the requester picks an offer: a user taking the slot outright
 * (`targetShiftSignupId` null) or one of that user's offered swap-back sign-ups.
 */
export const finishShiftTrade = async (shiftSignupTradeId: string, acceptedUserId: string, targetShiftSignupId: string | null) => {
  const response = await finishShiftTradeApi.post<ShiftActionResult>({
    ShiftSignupTradeId: toNumericId(shiftSignupTradeId),
    AcceptedUserId: acceptedUserId,
    TargetShiftSignupId: targetShiftSignupId ? toNumericId(targetShiftSignupId) : null,
  });
  return response.data;
};

/** POST /Shifts/CancelShiftTrade — requester only, not after completion. */
export const cancelShiftTrade = async (shiftSignupTradeId: string) => {
  const response = await cancelShiftTradeApi.post<ShiftActionResult>({
    ShiftSignupTradeId: toNumericId(shiftSignupTradeId),
  });
  return response.data;
};

/** GET /Shifts/GetPendingApprovals — scoped to the groups the caller supervises. */
export const getPendingApprovals = async () => {
  const response = await getPendingApprovalsApi.get<PendingApprovalsResult>();
  return response.data;
};

/** POST /Shifts/ReviewShiftSignup */
export const reviewShiftSignup = async (shiftSignupId: string, approve: boolean, note: string) => {
  const response = await reviewShiftSignupApi.post<ShiftActionResult>({
    ShiftSignupId: toNumericId(shiftSignupId),
    Approve: approve,
    Note: note,
  });
  return response.data;
};

/** POST /Shifts/ReviewShiftTrade */
export const reviewShiftTrade = async (shiftSignupTradeId: string, approve: boolean, note: string) => {
  const response = await reviewShiftTradeApi.post<ShiftActionResult>({
    ShiftSignupTradeId: toNumericId(shiftSignupTradeId),
    Approve: approve,
    Note: note,
  });
  return response.data;
};

/** GET /Shifts/GetShiftDayPersonnelOptions?shiftDayId= — people not on that day (supervisor add picker). */
export const getShiftDayPersonnelOptions = async (shiftDayId: string) => {
  const response = await getShiftDayPersonnelOptionsApi.get<ShiftPersonOptionsResult>({ shiftDayId });
  return response.data;
};

/** POST /Shifts/AssignToShiftDay — a supervisor adds a person to a group for one day. */
export const assignToShiftDay = async (shiftDayId: string, userId: string, groupId: string) => {
  const response = await assignToShiftDayApi.post<ShiftActionResult>({
    ShiftDayId: toNumericId(shiftDayId),
    UserId: userId,
    GroupId: toNumericId(groupId),
  });
  return response.data;
};

/** POST /Shifts/RemoveFromShiftDay — a supervisor removes a person from one day. */
export const removeFromShiftDay = async (shiftDayId: string, userId: string, note: string) => {
  const response = await removeFromShiftDayApi.post<ShiftActionResult>({
    ShiftDayId: toNumericId(shiftDayId),
    UserId: userId,
    Note: note,
  });
  return response.data;
};

/** GET /Shifts/GetOnDutyPersonnel — everyone on an active shift day right now. */
export const getOnDutyPersonnel = async () => {
  const response = await getOnDutyPersonnelApi.get<OnDutyPersonnelResult>();
  return response.data;
};
