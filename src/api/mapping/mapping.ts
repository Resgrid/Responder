import { type GetMapDataAndMarkersResult } from '@/models/v4/mapping/getMapDataAndMarkersResult';
import { type GetMapLayersResult } from '@/models/v4/mapping/getMapLayersResult';
import { type PoiResult } from '@/models/v4/mapping/poiResult';
import { type PoisResult } from '@/models/v4/mapping/poisResult';
import { type PoiTypesResult } from '@/models/v4/mapping/poiTypesResult';

import { createApiEndpoint } from '../common/client';

const getMayLayersApi = createApiEndpoint('/Mapping/GetMapLayers');

const getMapDataAndMarkersApi = createApiEndpoint('/Mapping/GetMapDataAndMarkers');
const getPoiTypesApi = createApiEndpoint('/Mapping/GetPoiTypes');
const getPoisApi = createApiEndpoint('/Mapping/GetPois');

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

export interface GetPoisOptions {
  poiTypeId?: number;
  destinationOnly?: boolean;
}

export const getPoiTypes = async (signal?: AbortSignal) => {
  const response = await getPoiTypesApi.get<PoiTypesResult>(undefined, signal);
  return response.data;
};

export const getPois = async (options: GetPoisOptions = {}, signal?: AbortSignal) => {
  const params: Record<string, unknown> = {};

  if (options.poiTypeId !== undefined) {
    params.poiTypeId = options.poiTypeId;
  }

  if (options.destinationOnly !== undefined) {
    params.destinationOnly = options.destinationOnly;
  }

  const response = await getPoisApi.get<PoisResult>(Object.keys(params).length > 0 ? params : undefined, signal);
  return response.data;
};

export const getPoi = async (poiId: number, signal?: AbortSignal) => {
  const getPoiApi = createApiEndpoint(`/Mapping/GetPoi/${encodeURIComponent(poiId)}`);
  const response = await getPoiApi.get<PoiResult>(undefined, signal);
  return response.data;
};
