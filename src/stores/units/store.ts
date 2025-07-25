import { create } from 'zustand';

import { getAllUnitStatuses } from '@/api/satuses';
import { getUnits } from '@/api/units/units';
import { type UnitTypeStatusResultData } from '@/models/v4/statuses/unitTypeStatusResultData';
import { type UnitResultData } from '@/models/v4/units/unitResultData';

interface UnitsState {
  units: UnitResultData[];
  unitStatuses: UnitTypeStatusResultData[];
  isLoading: boolean;
  error: string | null;
  fetchUnits: () => Promise<void>;
}

export const useUnitsStore = create<UnitsState>((set) => ({
  units: [],
  unitStatuses: [],
  isLoading: false,
  error: null,
  fetchUnits: async () => {
    set({ isLoading: true, error: null });
    try {
      const unitsResponse = await getUnits();
      const unitStatusesResponse = await getAllUnitStatuses();
      set({ units: unitsResponse.Data, unitStatuses: unitStatusesResponse.Data, isLoading: false });
    } catch (error) {
      set({ error: 'Failed to fetch calls', isLoading: false });
    }
  },
}));
