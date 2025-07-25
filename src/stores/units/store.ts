import { create } from 'zustand';

import { getUnits } from '@/api/units/units';
import { type UnitResultData } from '@/models/v4/units/unitResultData';

interface UnitsState {
	units: UnitResultData[];
	searchQuery: string;
	selectedUnitId: string | null;
	isDetailsOpen: boolean;
	isLoading: boolean;
	error: string | null;
	// Actions
	fetchUnits: () => Promise<void>;
	setSearchQuery: (query: string) => void;
	selectUnit: (id: string) => void;
	closeDetails: () => void;
}

export const useUnitsStore = create<UnitsState>((set) => ({
	units: [],
	searchQuery: '',
	selectedUnitId: null,
	isDetailsOpen: false,
	isLoading: false,
	error: null,
	fetchUnits: async () => {
		set({ isLoading: true, error: null });
		try {
			const response = await getUnits();
			set({ units: response.Data, isLoading: false });
		} catch (error) {
			set({ isLoading: false, error: error instanceof Error ? error.message : 'An unknown error occurred' });
		}
	},
	setSearchQuery: (query) => set({ searchQuery: query }),
	selectUnit: (id) => set({ selectedUnitId: id, isDetailsOpen: true }),
	closeDetails: () => set({ isDetailsOpen: false }),
}));
