import { createApiEndpoint } from '@/api/common/client';
import { type GetCurrentStaffingResult } from '@/models/v4/personnelStaffing/getCurrentStaffingResult';
import { type SavePersonsStaffingsInput } from '@/models/v4/personnelStaffing/savePersonsStaffingsInput';
import { type SavePersonsStaffingsResult } from '@/models/v4/personnelStaffing/savePersonsStaffingsResult';
import { type SavePersonStaffingInput } from '@/models/v4/personnelStaffing/savePersonStaffingInput';
import { type SavePersonStaffingResult } from '@/models/v4/personnelStaffing/savePersonStaffingResult';
import { type StatusesResult } from '@/models/v4/statuses/statusesResult';

const getCurrentPersonStaffingApi = createApiEndpoint('/PersonnelStaffing/GetCurrentStatffing');
const savePersonStaffingApi = createApiEndpoint('/PersonnelStaffing/SavePersonStaffing');
const savePersonStaffingsApi = createApiEndpoint('/PersonnelStaffing/SavePersonsStaffings');
const getAllPersonnelStaffingsApi = createApiEndpoint('/Statuses/GetAllStaffingsForPersonnel');

export const getCurrentPersonStaffing = async (userId: string) => {
  const response = await getCurrentPersonStaffingApi.get<GetCurrentStaffingResult>({
    userId: userId,
  });
  return response.data;
};

export const savePersonStaffing = async (data: SavePersonStaffingInput) => {
  const response = await savePersonStaffingApi.post<SavePersonStaffingResult>({
    ...data,
  });
  return response.data;
};

export const savePersonStaffings = async (data: SavePersonsStaffingsInput) => {
  const response = await savePersonStaffingsApi.post<SavePersonsStaffingsResult>({
    ...data,
  });
  return response.data;
};

export const getAllPersonnelStaffings = async () => {
  const response = await getAllPersonnelStaffingsApi.get<StatusesResult>();
  return response.data;
};
