import { createApiEndpoint } from '@/api/common/client';
import { type GetCurrentStaffingResult } from '@/models/v4/personnelStaffing/getCurrentStaffingResult';
import { type SavePersonsStaffingsInput } from '@/models/v4/personnelStaffing/savePersonsStaffingsInput';
import { type SavePersonsStaffingsResult } from '@/models/v4/personnelStaffing/savePersonsStaffingsResult';
import { type SavePersonStaffingInput } from '@/models/v4/personnelStaffing/savePersonStaffingInput';
import { type SavePersonStaffingResult } from '@/models/v4/personnelStaffing/savePersonStaffingResult';

const getCurrentPersonnelStaffingApi = createApiEndpoint('/PersonnelStaffing/GetCurrentStatffing');
const savePersonnelStaffingApi = createApiEndpoint('/PersonnelStaffing/SavePersonStaffing');
const savePersonnelStaffingsApi = createApiEndpoint('/PersonnelStaffing/SavePersonsStaffings');

export const getCurrentPersonnelStaffing = async (userId: string) => {
  const response = await getCurrentPersonnelStaffingApi.get<GetCurrentStaffingResult>({
    userId: userId,
  });
  return response.data;
};

export const savePersonnelStaffing = async (data: SavePersonStaffingInput) => {
  const response = await savePersonnelStaffingApi.post<SavePersonStaffingResult>({
    ...data,
  });
  return response.data;
};

export const savePersonnelStaffings = async (data: SavePersonsStaffingsInput) => {
  const response = await savePersonnelStaffingsApi.post<SavePersonsStaffingsResult>({
    ...data,
  });
  return response.data;
};
