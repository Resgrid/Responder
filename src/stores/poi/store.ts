import { create } from 'zustand';

import { getPoi, getPois, getPoiTypes } from '@/api/mapping/mapping';
import { type PoiResultData } from '@/models/v4/mapping/poiResultData';
import { type PoiTypeResultData } from '@/models/v4/mapping/poiTypeResultData';

interface PoiState {
  poiTypes: PoiTypeResultData[];
  pois: PoiResultData[];
  poiDetailsById: Record<number, PoiResultData>;
  isLoading: boolean;
  isLoadingPoi: boolean;
  error: string | null;
  fetchPoisData: (force?: boolean) => Promise<void>;
  fetchPoiDetail: (poiId: number, force?: boolean) => Promise<PoiResultData | null>;
  getPoiById: (poiId: number) => PoiResultData | null;
  reset: () => void;
}

const getPoiDetailsMap = (pois: PoiResultData[]) => {
  return pois.reduce<Record<number, PoiResultData>>((detailsById, poi) => {
    detailsById[poi.PoiId] = poi;
    return detailsById;
  }, {});
};

export const usePoiStore = create<PoiState>((set, get) => ({
  poiTypes: [],
  pois: [],
  poiDetailsById: {},
  isLoading: false,
  isLoadingPoi: false,
  error: null,
  fetchPoisData: async (force = false) => {
    const { poiTypes, pois } = get();
    if (!force && poiTypes.length > 0 && pois.length > 0) {
      return;
    }

    set({ isLoading: true, error: null });

    try {
      const [poiTypesResult, poisResult] = await Promise.all([getPoiTypes(), getPois()]);
      const nextPoiTypes = poiTypesResult.Data || [];
      const nextPois = poisResult.Data || [];

      set({
        poiTypes: nextPoiTypes,
        pois: nextPois,
        poiDetailsById: getPoiDetailsMap(nextPois),
        isLoading: false,
        error: null,
      });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch POIs',
      });
    }
  },
  fetchPoiDetail: async (poiId, force = false) => {
    const cachedPoi = get().getPoiById(poiId);
    if (cachedPoi && !force) {
      return cachedPoi;
    }

    set({ isLoadingPoi: true, error: null });

    try {
      const poiResult = await getPoi(poiId);
      const poi = poiResult.Data;

      if (!poi) {
        set({ isLoadingPoi: false });
        return null;
      }

      set((state) => {
        const hasPoiInList = state.pois.some((currentPoi) => currentPoi.PoiId === poi.PoiId);
        const nextPois = hasPoiInList ? state.pois.map((currentPoi) => (currentPoi.PoiId === poi.PoiId ? poi : currentPoi)) : [...state.pois, poi];

        return {
          pois: nextPois,
          poiDetailsById: {
            ...state.poiDetailsById,
            [poi.PoiId]: poi,
          },
          isLoadingPoi: false,
          error: null,
        };
      });

      return poi;
    } catch (error) {
      set({
        isLoadingPoi: false,
        error: error instanceof Error ? error.message : 'Failed to fetch POI details',
      });
      return null;
    }
  },
  getPoiById: (poiId) => {
    const { poiDetailsById, pois } = get();
    return poiDetailsById[poiId] || pois.find((poi) => poi.PoiId === poiId) || null;
  },
  reset: () =>
    set({
      poiTypes: [],
      pois: [],
      poiDetailsById: {},
      isLoading: false,
      isLoadingPoi: false,
      error: null,
    }),
}));
