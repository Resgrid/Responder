import { type GetMapDataAndMarkersResult } from '@/models/v4/mapping/getMapDataAndMarkersResult';
import { type GetMapLayersResult } from '@/models/v4/mapping/getMapLayersResult';

import { createApiEndpoint } from '../common/client';

const getMayLayersApi = createApiEndpoint('/Mapping/GetMayLayers');

const getMapDataAndMarkersApi = createApiEndpoint('/Mapping/GetMapDataAndMarkers');

export const getMapDataAndMarkers = async () => {
  const response = await getMapDataAndMarkersApi.get<GetMapDataAndMarkersResult>();
  return response.data;
};

export const getMayLayers = async (type: number) => {
  const response = await getMayLayersApi.get<GetMapLayersResult>({
    type: encodeURIComponent(type),
  });
  return response.data;
};
