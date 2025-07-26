import { createApiEndpoint } from '@/api/common/client';
import { type GetCurrentStatusResult } from '@/models/v4/personnelStatuses/getCurrentStatusResult';
import { type SavePersonsStatusesInput } from '@/models/v4/personnelStatuses/savePersonsStatusesInput';
import { type SavePersonsStatusesResult } from '@/models/v4/personnelStatuses/savePersonsStatusesResult';
import { type SavePersonStatusInput } from '@/models/v4/personnelStatuses/savePersonStatusInput';
import { type SavePersonStatusResult } from '@/models/v4/personnelStatuses/savePersonStatusResult';

const getCurrentPersonnelStatusApi = createApiEndpoint('/PersonnelStatuses/GetCurrentStatus');
const savePersonnelStatusApi = createApiEndpoint('/PersonnelStatuses/SavePersonStatus');
const savePersonnelStatusesApi = createApiEndpoint('/PersonnelStatuses/SavePersonsStatuses');

export const getCurrentPersonnelStatus = async (userId: string) => {
  const response = await getCurrentPersonnelStatusApi.get<GetCurrentStatusResult>({
    userId: userId,
  });
  return response.data;
};

export const savePersonnelStatus = async (data: SavePersonStatusInput) => {
  if (!data.RespondingTo) {
    data.RespondingTo = '0';
  }

  const response = await savePersonnelStatusApi.post<SavePersonStatusResult>({
    ...data,
  });
  return response.data;
};

export const savePersonsStatuses = async (data: SavePersonsStatusesInput) => {
  if (!data.RespondingTo) {
    data.RespondingTo = '0';
  }

  const response = await savePersonnelStatusesApi.post<SavePersonsStatusesResult>({
    ...data,
  });
  return response.data;
};
