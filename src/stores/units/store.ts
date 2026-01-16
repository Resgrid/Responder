import { create } from 'zustand';

import { getAllUnitStatuses } from '@/api/satuses';
import { getUnitsFilterOptions, getUnitsInfos } from '@/api/units/units';
import { loadUnitsFilterOptions, saveUnitsFilterOptions } from '@/lib/storage/units-filter';
import { type FilterResultData } from '@/models/v4/personnel/filterResultData';
import { type UnitTypeStatusResultData } from '@/models/v4/statuses/unitTypeStatusResultData';
import { type UnitInfoResultData } from '@/models/v4/units/unitInfoResultData';
import { type UnitResultData } from '@/models/v4/units/unitResultData';

// Union type for units data
type UnitData = UnitResultData | UnitInfoResultData;

interface UnitsState {
  units: UnitData[];
  unitTypeStatuses: UnitTypeStatusResultData[];
  searchQuery: string;
  selectedUnitId: string | null;
  isDetailsOpen: boolean;
  isLoading: boolean;
  error: string | null;

  // Filter-related state
  filterOptions: FilterResultData[];
  selectedFilters: string[];
  isFilterSheetOpen: boolean;
  isLoadingFilters: boolean;

  // Actions
  fetchUnits: () => Promise<void>;
  fetchUnitStatuses: () => Promise<void>;
  setSearchQuery: (query: string) => void;
  selectUnit: (id: string) => void;
  closeDetails: () => void;
  init: () => Promise<void>;

  // Filter actions
  fetchFilterOptions: () => Promise<void>;
  toggleFilter: (filterId: string) => void;
  openFilterSheet: () => void;
  closeFilterSheet: () => void;
  loadSavedFilters: () => Promise<void>;
}

export const useUnitsStore = create<UnitsState>((set, get) => ({
  units: [],
  unitTypeStatuses: [],
  searchQuery: '',
  selectedUnitId: null,
  isDetailsOpen: false,
  isLoading: false,
  error: null,

  // Filter-related state
  filterOptions: [],
  selectedFilters: [],
  isFilterSheetOpen: false,
  isLoadingFilters: false,

  fetchUnits: async () => {
    try {
      set({ isLoading: true, error: null });
      const { selectedFilters, fetchUnitStatuses } = get();
      const filterString = selectedFilters.length > 0 ? selectedFilters.join(',') : '';

      // Fetch units and unit statuses in parallel
      const [unitsResponse] = await Promise.all([getUnitsInfos(filterString), fetchUnitStatuses()]);

      set({ units: unitsResponse.Data || [], isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch units',
        isLoading: false,
      });
    }
  },

  fetchUnitStatuses: async () => {
    try {
      const response = await getAllUnitStatuses();
      set({ unitTypeStatuses: response.Data || [] });
    } catch (error) {
      // Silently fail - statuses are optional enhancement
      console.warn('Failed to fetch unit statuses:', error);
    }
  },

  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
  },

  selectUnit: (id: string) => {
    set({ selectedUnitId: id, isDetailsOpen: true });
  },

  closeDetails: () => {
    set({ isDetailsOpen: false, selectedUnitId: null });
  },

  init: async () => {
    const { units, loadSavedFilters } = get();
    await loadSavedFilters();
    if (units.length === 0) {
      await get().fetchUnits();
    }
  },

  // Filter actions
  fetchFilterOptions: async () => {
    try {
      set({ isLoadingFilters: true });
      const response = await getUnitsFilterOptions();
      set({ filterOptions: response.Data || [], isLoadingFilters: false });
    } catch (error) {
      set({ isLoadingFilters: false });
    }
  },

  toggleFilter: async (filterId: string) => {
    const { selectedFilters } = get();
    const newFilters = selectedFilters.includes(filterId) ? selectedFilters.filter((id) => id !== filterId) : [...selectedFilters, filterId];

    set({ selectedFilters: newFilters });
    saveUnitsFilterOptions(newFilters);

    // Refetch units with new filters
    await get().fetchUnits();
  },

  openFilterSheet: () => {
    set({ isFilterSheetOpen: true });
    get().fetchFilterOptions();
  },

  closeFilterSheet: () => {
    set({ isFilterSheetOpen: false });
  },

  loadSavedFilters: async () => {
    const savedFilters = await loadUnitsFilterOptions();
    set({ selectedFilters: savedFilters });
  },
}));
