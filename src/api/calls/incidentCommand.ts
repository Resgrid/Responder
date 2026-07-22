import { type ResourceIncidentViewResult } from '@/models/v4/incidentCommand/resourceIncidentViewResult';

import { createApiEndpoint } from '../common/client';

export const getResourceIncidentView = async (callId: string | number) => {
  // RPC-style route with a path parameter, so the endpoint is created per-call
  const getResourceIncidentViewApi = createApiEndpoint(`/IncidentCommand/GetResourceIncidentView/${encodeURIComponent(callId)}`);
  const response = await getResourceIncidentViewApi.get<ResourceIncidentViewResult>();
  return response.data;
};
