import { type ShiftDayResult } from '@/models/v4/shifts/shiftDayResult';
import { type ShiftDaysResult } from '@/models/v4/shifts/shiftDaysResult';
import { type ShiftResult } from '@/models/v4/shifts/shiftResult';
import { type ShiftsResult } from '@/models/v4/shifts/shiftsResult';
import { type SignupShiftDayResult } from '@/models/v4/shifts/signupShiftDayResult';

import { createCachedApiEndpoint } from '../common/cached-client';
import { createApiEndpoint } from '../common/client';

// Define API endpoints with caching for data that doesn't change frequently
const getAllShiftsApi = createCachedApiEndpoint('/Shifts/GetShifts', {
  ttl: 60 * 1000 * 60, // Cache for 1 hour
  enabled: false,
});

const getTodaysShiftsApi = createApiEndpoint('/Shifts/GetTodaysShifts');
const getShiftApi = createApiEndpoint('/Shifts/GetShift');
const getShiftDayApi = createApiEndpoint('/Shifts/GetShiftDay');
//const getShiftDaysForDateRangeApi = createApiEndpoint('/Shifts/GetShiftDaysForDateRange');
const signupForShiftDayApi = createApiEndpoint('/Shifts/SignupForShiftDay');
//const withdrawFromShiftDayApi = createApiEndpoint('/Shifts/WithdrawFromShiftDay');

/**
 * Fetch all shifts for the department
 */
export const getAllShifts = async () => {
  const response = await getAllShiftsApi.get<ShiftsResult>();
  return response.data;
};

/**
 * Fetch today's shift days
 */
export const getTodaysShifts = async () => {
  const response = await getTodaysShiftsApi.get<ShiftDaysResult>();
  return response.data;
};

/**
 * Fetch a specific shift by ID
 */
export const getShift = async (shiftId: string) => {
  const response = await getShiftApi.get<ShiftResult>({
    shiftId: shiftId,
  });
  return response.data;
};

/**
 * Fetch a specific shift day by ID
 */
export const getShiftDay = async (shiftDayId: string) => {
  const response = await getShiftDayApi.get<ShiftDayResult>({
    shiftDayId: shiftDayId,
  });
  return response.data;
};

/**
 * Fetch shift days for a date range
 */
//export const getShiftDaysForDateRange = async (shiftId: string, startDate: string, endDate: string) => {
//  const response = await getShiftDaysForDateRangeApi.get<ShiftDaysResult>({
//    shiftId: shiftId,
//    startDate: startDate,
//    endDate: endDate,
//  });
//  return response.data;
//};

/**
 * Sign up for a shift day
 */
export const signupForShiftDay = async (shiftDayId: string, userId: string) => {
  const response = await signupForShiftDayApi.post<SignupShiftDayResult>({
    shiftDayId: shiftDayId,
    userId: userId,
  });
  return response.data;
};

/**
 * Withdraw from a shift day
 */
//export const withdrawFromShiftDay = async (shiftDayId: string, userId: string) => {
//  const response = await withdrawFromShiftDayApi.post<SignupShiftDayResult>({
//    shiftDayId: shiftDayId,
//    userId: userId,
//  });
//  return response.data;
//};
