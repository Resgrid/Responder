import { type GetSetUnitStateResult } from '@/models/v4/dispatch/getSetUnitStateResult';
import { type NewCallFormResult } from '@/models/v4/dispatch/newCallFormResult';

import { createApiEndpoint } from '../common/client';

const getNewCallDataApi = createApiEndpoint('/Dispatch/GetNewCallData');
const getSetUnitStatusDataApi = createApiEndpoint('/Dispatch/GetSetUnitStatusData');

export const getNewCallData = async (signal?: AbortSignal) => {
  const response = await getNewCallDataApi.get<NewCallFormResult>(undefined, signal);
  return response.data;
};

export const getSetUnitStatusData = async (unitId: string, signal?: AbortSignal) => {
  const response = await getSetUnitStatusDataApi.get<GetSetUnitStateResult>(
    {
      unitId: unitId,
    },
    signal
  );
  return response.data;
};
