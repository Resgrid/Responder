import { type GetConfigResult } from '@/models/v4/configs/getConfigResult';
import { type GetSystemConfigResult } from '@/models/v4/configs/getSystemConfigResult';

import { createCachedApiEndpoint } from '../common/cached-client';

const getConfigApi = createCachedApiEndpoint('/Config/GetConfig', {
  ttl: 60 * 1000 * 1440, // Cache for 1 days
  enabled: false,
});

const getSystemConfigApi = createCachedApiEndpoint('/Config/GetSystemConfig', {
  ttl: 60 * 1000 * 1440, // Cache for 1 days
  enabled: false,
});

export const getConfig = async (key: string) => {
  const response = await getConfigApi.get<GetConfigResult>({
    key: key,
  });
  return response.data;
};

export const getSystemConfig = async () => {
  const response = await getSystemConfigApi.get<GetSystemConfigResult>();
  return response.data;
};
