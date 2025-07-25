import { type GetConfigResult } from '@/models/v4/configs/getConfigResult';

import { createCachedApiEndpoint } from '../common/cached-client';

const getConfigApi = createCachedApiEndpoint('/Config/GetConfig', {
  ttl: 60 * 1000 * 1440, // Cache for 1 days
  enabled: false,
});

export const getConfig = async (key: string) => {
  const response = await getConfigApi.get<GetConfigResult>({
    key: encodeURIComponent(key),
  });
  return response.data;
};
