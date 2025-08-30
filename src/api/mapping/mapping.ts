import { type GetMapDataAndMarkersResult } from '@/models/v4/mapping/getMapDataAndMarkersResult';
import { type GetMapLayersResult } from '@/models/v4/mapping/getMapLayersResult';

import { createApiEndpoint } from '../common/client';

const getMayLayersApi = createApiEndpoint('/Mapping/GetMapLayers');

const getMapDataAndMarkersApi = createApiEndpoint('/Mapping/GetMapDataAndMarkers');

export const getMapDataAndMarkers = async (signal?: AbortSignal) => {
  const response = await getMapDataAndMarkersApi.get<GetMapDataAndMarkersResult>(undefined, signal);
  return response.data;
};

export const getMayLayers = async (type: number) => {
  const response = await getMayLayersApi.get<GetMapLayersResult>({
    type: encodeURIComponent(type),
  });
  return response.data;
};
