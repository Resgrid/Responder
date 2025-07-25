import { create } from 'zustand';

import { savePersonnelStatus } from '@/api/personnel/personnelStatuses';
import { type CallResultData } from '@/models/v4/calls/callResultData';
import { type StatusesResultData } from '@/models/v4/statuses/statusesResultData';
import { SavePersonStatusInput } from '@/models/v4/personnelStatuses/savePersonStatusInput';
import { useAuthStore } from '@/lib/auth';
import { useHomeStore } from '@/stores/home/home-store';
import { useToastStore } from '@/stores/toast/store';

type PersonnelStatusStep = 'select-responding-to' | 'add-note' | 'confirm';

interface PersonnelStatusBottomSheetStore {
	isOpen: boolean;
	currentStep: PersonnelStatusStep;
	selectedCall: CallResultData | null;
	selectedStatus: StatusesResultData | null;
	note: string;
	respondingTo: string;
	isLoading: boolean;
	setIsOpen: (isOpen: boolean, status?: StatusesResultData) => void;
	setCurrentStep: (step: PersonnelStatusStep) => void;
	setSelectedCall: (call: CallResultData | null) => void;
	setNote: (note: string) => void;
	setRespondingTo: (respondingTo: string) => void;
	setIsLoading: (isLoading: boolean) => void;
	nextStep: () => void;
	previousStep: () => void;
	submitStatus: () => Promise<void>;
	reset: () => void;
}

export const usePersonnelStatusBottomSheetStore = create<PersonnelStatusBottomSheetStore>((set, get) => ({
	isOpen: false,
	currentStep: 'select-responding-to',
	selectedCall: null,
	selectedStatus: null,
	note: '',
	respondingTo: '',
	isLoading: false,
	setIsOpen: (isOpen, status) => {
		set({
			isOpen,
			selectedStatus: status || null,
			currentStep: status ? 'select-responding-to' : 'select-responding-to',
		});
	},
	setCurrentStep: (step) => set({ currentStep: step }),
	setSelectedCall: (call) => set({ selectedCall: call }),
	setNote: (note) => set({ note }),
	setRespondingTo: (respondingTo) => set({ respondingTo }),
	setIsLoading: (isLoading) => set({ isLoading }),
	nextStep: () => {
		const { currentStep } = get();
		switch (currentStep) {
			case 'select-responding-to':
				set({ currentStep: 'add-note' });
				break;
			case 'add-note':
				set({ currentStep: 'confirm' });
				break;
		}
	},
	previousStep: () => {
		const { currentStep } = get();
		switch (currentStep) {
			case 'add-note':
				set({ currentStep: 'select-responding-to' });
				break;
			case 'confirm':
				set({ currentStep: 'add-note' });
				break;
		}
	},
	submitStatus: async () => {
		const { selectedStatus, note, respondingTo, selectedCall } = get();
		const showToast = useToastStore.getState().showToast;
		const { userId } = useAuthStore.getState();
		const { fetchCurrentUserInfo } = useHomeStore.getState();

		if (!userId || !selectedStatus) {
			showToast('error', 'Missing required information');
			return;
		}

		set({ isLoading: true });
		try {
			const status = new SavePersonStatusInput();
			const date = new Date();

			status.UserId = userId;
			status.Type = selectedStatus.Id.toString();
			status.Timestamp = date.toISOString();
			status.TimestampUtc = date.toUTCString().replace('UTC', 'GMT');
			status.Note = note;
			status.RespondingTo = respondingTo;
			status.Latitude = '';
			status.Longitude = '';
			status.Accuracy = '';
			status.Altitude = '';
			status.AltitudeAccuracy = '';
			status.Speed = '';
			status.Heading = '';
			status.EventId = selectedCall?.CallId || '';

			await savePersonnelStatus(status);
			await fetchCurrentUserInfo();

			showToast('success', 'Status updated successfully');
			get().reset();
		} catch (error) {
			showToast('error', 'Failed to update status');
		} finally {
			set({ isLoading: false });
		}
	},
	reset: () =>
		set({
			isOpen: false,
			currentStep: 'select-responding-to',
			selectedCall: null,
			selectedStatus: null,
			note: '',
			respondingTo: '',
			isLoading: false,
		}),
}));
