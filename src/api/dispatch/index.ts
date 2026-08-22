import { type NewCallFormResult } from '@/models/v4/dispatch/newCallFormResult';

import { createApiEndpoint } from '../common/client';

const getNewCallDataApi = createApiEndpoint('/Dispatch/GetNewCallData');

export const getNewCallData = async (signal?: AbortSignal) => {
  const response = await getNewCallDataApi.get<NewCallFormResult>(undefined, signal);
  return response.data;
};
