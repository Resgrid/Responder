import { create } from 'zustand';

import { getAllPersonnelInfos } from '@/api/personnel/personnel';
import { type PersonnelInfoResultData } from '@/models/v4/personnel/personnelInfoResultData';

interface PersonnelState {
	personnel: PersonnelInfoResultData[];
	searchQuery: string;
	selectedPersonnelId: string | null;
	isDetailsOpen: boolean;
	isLoading: boolean;
	error: string | null;

	// Actions
	fetchPersonnel: () => Promise<void>;
	setSearchQuery: (query: string) => void;
	selectPersonnel: (id: string) => void;
	closeDetails: () => void;
	init: () => Promise<void>;
}

export const usePersonnelStore = create<PersonnelState>((set, get) => ({
	personnel: [],
	searchQuery: '',
	selectedPersonnelId: null,
	isDetailsOpen: false,
	isLoading: false,
	error: null,

	fetchPersonnel: async () => {
		try {
			set({ isLoading: true, error: null });
			const response = await getAllPersonnelInfos('');
			set({ personnel: response.Data || [], isLoading: false });
		} catch (error) {
			set({
				error: error instanceof Error ? error.message : 'Failed to fetch personnel',
				isLoading: false,
			});
		}
	},

	setSearchQuery: (query: string) => {
		set({ searchQuery: query });
	},

	selectPersonnel: (id: string) => {
		set({ selectedPersonnelId: id, isDetailsOpen: true });
	},

	closeDetails: () => {
		set({ isDetailsOpen: false, selectedPersonnelId: null });
	},

	init: async () => {
		const { personnel } = get();
		if (personnel.length === 0) {
			await get().fetchPersonnel();
		}
	},
}));
