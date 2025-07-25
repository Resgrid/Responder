import { type AxiosResponse } from 'axios';

import { cacheManager } from '@/lib/cache/cache-manager';

import { createApiEndpoint } from './client';

interface CacheConfig {
  ttl?: number; // Time to live in milliseconds
  enabled?: boolean; // Whether to use cache for this endpoint
}

export const createCachedApiEndpoint = (endpoint: string, cacheConfig: CacheConfig = { enabled: true }) => {
  const api = createApiEndpoint(endpoint);
  const defaultTTL = 5 * 60 * 1000; // 5 minutes

  return {
    get: async <T>(params?: Record<string, unknown>): Promise<AxiosResponse<T>> => {
      if (!cacheConfig.enabled) {
        return api.get<T>(params);
      }

      const cached = cacheManager.get<T>(endpoint, params);
      if (cached) {
        return Promise.resolve({
          data: cached,
          status: 200,
          statusText: 'OK (cached)',
          headers: {},
          config: {},
        } as AxiosResponse<T>);
      }

      const response = await api.get<T>(params);
      cacheManager.set(endpoint, response.data, params, cacheConfig.ttl || defaultTTL);
      return response;
    },
    post: api.post,
    put: api.put,
    delete: api.delete,
  };
};
