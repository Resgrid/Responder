import { createApiEndpoint } from '@/api/common/client';
import { type SavePersonnelLocationInput } from '@/models/v4/personnelLocation/savePersonnelLocationInput';
import { type SaveUnitLocationResult } from '@/models/v4/unitLocation/saveUnitLocationResult';
import { type UnitLocationResult } from '@/models/v4/unitLocation/unitLocationResult';

const setPersonLocationApi = createApiEndpoint('/PersonnelLocation/SetPersonLocation');
const getPersonLocationApi = createApiEndpoint('/PersonnelLocation/GetLatestPersonLocation');

export const setPersonLocation = async (data: SavePersonnelLocationInput) => {
  const response = await setPersonLocationApi.post<SaveUnitLocationResult>({
    ...data,
  });
  return response.data;
};

export const getPersonLocation = async (userId: string) => {
  const response = await getPersonLocationApi.get<UnitLocationResult>({
    userId: userId,
  });
  return response.data;
};
