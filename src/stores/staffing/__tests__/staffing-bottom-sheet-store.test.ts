import { describe, expect, it, jest, beforeEach, afterEach } from '@jest/globals';

import { useStaffingBottomSheetStore } from '../staffing-bottom-sheet-store';

// Mock the dependencies
jest.mock('@/api/personnel/personnelStaffing');
jest.mock('@/lib/auth');
jest.mock('@/stores/home/home-store');
jest.mock('@/stores/toast/store');

const mockSavePersonnelStaffing = jest.fn();
const mockShowToast = jest.fn();
const mockFetchCurrentUserInfo = jest.fn();

// Mock the modules
beforeEach(() => {
	jest.clearAllMocks();

	// Reset store state
	useStaffingBottomSheetStore.setState({
		isOpen: false,
		currentStep: 'select-staffing',
		isLoading: false,
		selectedStaffing: null,
		note: '',
	});

	// Mock the API
	require('@/api/personnel/personnelStaffing').savePersonnelStaffing = mockSavePersonnelStaffing;

	// Mock the auth store
	require('@/lib/auth').useAuthStore = {
		getState: jest.fn(() => ({ userId: 'test-user-id' })),
	};

	// Mock the home store
	require('@/stores/home/home-store').useHomeStore = {
		getState: jest.fn(() => ({ fetchCurrentUserInfo: mockFetchCurrentUserInfo })),
	};

	// Mock the toast store
	require('@/stores/toast/store').useToastStore = {
		getState: jest.fn(() => ({ showToast: mockShowToast })),
	};
});

describe('useStaffingBottomSheetStore', () => {
	const mockStaffing = {
		Id: 1,
		Type: 1,
		StateId: 1,
		Text: 'Available',
		BColor: '#00FF00',
		Color: '#000000',
		Gps: false,
		Note: 0,
		Detail: 0,
	};

	describe('initial state', () => {
		it('should have correct initial state', () => {
			const state = useStaffingBottomSheetStore.getState();

			expect(state.isOpen).toBe(false);
			expect(state.currentStep).toBe('select-staffing');
			expect(state.isLoading).toBe(false);
			expect(state.selectedStaffing).toBeNull();
			expect(state.note).toBe('');
		});
	});

	describe('setIsOpen', () => {
		it('should open the bottom sheet without staffing', () => {
			useStaffingBottomSheetStore.getState().setIsOpen(true);
			const state = useStaffingBottomSheetStore.getState();

			expect(state.isOpen).toBe(true);
			expect(state.selectedStaffing).toBeNull();
			expect(state.currentStep).toBe('select-staffing');
		});

		it('should open the bottom sheet with pre-selected staffing', () => {
			useStaffingBottomSheetStore.getState().setIsOpen(true, mockStaffing);
			const state = useStaffingBottomSheetStore.getState();

			expect(state.isOpen).toBe(true);
			expect(state.selectedStaffing).toEqual(mockStaffing);
			expect(state.currentStep).toBe('add-note');
		});

		it('should close the bottom sheet', () => {
			useStaffingBottomSheetStore.getState().setIsOpen(true);
			expect(useStaffingBottomSheetStore.getState().isOpen).toBe(true);

			useStaffingBottomSheetStore.getState().setIsOpen(false);
			expect(useStaffingBottomSheetStore.getState().isOpen).toBe(false);
		});
	});

	describe('setCurrentStep', () => {
		it('should update current step', () => {
			useStaffingBottomSheetStore.getState().setCurrentStep('add-note');
			expect(useStaffingBottomSheetStore.getState().currentStep).toBe('add-note');
		});
	});

	describe('setSelectedStaffing', () => {
		it('should update selected staffing', () => {
			useStaffingBottomSheetStore.getState().setSelectedStaffing(mockStaffing);
			expect(useStaffingBottomSheetStore.getState().selectedStaffing).toEqual(mockStaffing);
		});

		it('should clear selected staffing', () => {
			useStaffingBottomSheetStore.getState().setSelectedStaffing(mockStaffing);
			expect(useStaffingBottomSheetStore.getState().selectedStaffing).toEqual(mockStaffing);

			useStaffingBottomSheetStore.getState().setSelectedStaffing(null);
			expect(useStaffingBottomSheetStore.getState().selectedStaffing).toBeNull();
		});
	});

	describe('setNote', () => {
		it('should update note', () => {
			useStaffingBottomSheetStore.getState().setNote('Test note');
			expect(useStaffingBottomSheetStore.getState().note).toBe('Test note');
		});

		it('should clear note', () => {
			useStaffingBottomSheetStore.getState().setNote('Test note');
			expect(useStaffingBottomSheetStore.getState().note).toBe('Test note');

			useStaffingBottomSheetStore.getState().setNote('');
			expect(useStaffingBottomSheetStore.getState().note).toBe('');
		});
	});

	describe('setIsLoading', () => {
		it('should update loading state', () => {
			useStaffingBottomSheetStore.getState().setIsLoading(true);
			expect(useStaffingBottomSheetStore.getState().isLoading).toBe(true);

			useStaffingBottomSheetStore.getState().setIsLoading(false);
			expect(useStaffingBottomSheetStore.getState().isLoading).toBe(false);
		});
	});

	describe('nextStep', () => {
		it('should advance from select-staffing to add-note', () => {
			expect(useStaffingBottomSheetStore.getState().currentStep).toBe('select-staffing');

			useStaffingBottomSheetStore.getState().nextStep();
			expect(useStaffingBottomSheetStore.getState().currentStep).toBe('add-note');
		});

		it('should advance from add-note to confirm', () => {
			useStaffingBottomSheetStore.getState().setCurrentStep('add-note');
			expect(useStaffingBottomSheetStore.getState().currentStep).toBe('add-note');

			useStaffingBottomSheetStore.getState().nextStep();
			expect(useStaffingBottomSheetStore.getState().currentStep).toBe('confirm');
		});

		it('should not advance beyond confirm step', () => {
			useStaffingBottomSheetStore.getState().setCurrentStep('confirm');
			expect(useStaffingBottomSheetStore.getState().currentStep).toBe('confirm');

			useStaffingBottomSheetStore.getState().nextStep();
			expect(useStaffingBottomSheetStore.getState().currentStep).toBe('confirm');
		});
	});

	describe('previousStep', () => {
		it('should go back from add-note to select-staffing', () => {
			useStaffingBottomSheetStore.getState().setCurrentStep('add-note');
			expect(useStaffingBottomSheetStore.getState().currentStep).toBe('add-note');

			useStaffingBottomSheetStore.getState().previousStep();
			expect(useStaffingBottomSheetStore.getState().currentStep).toBe('select-staffing');
		});

		it('should go back from confirm to add-note', () => {
			useStaffingBottomSheetStore.getState().setCurrentStep('confirm');
			expect(useStaffingBottomSheetStore.getState().currentStep).toBe('confirm');

			useStaffingBottomSheetStore.getState().previousStep();
			expect(useStaffingBottomSheetStore.getState().currentStep).toBe('add-note');
		});

		it('should not go back beyond select-staffing step', () => {
			expect(useStaffingBottomSheetStore.getState().currentStep).toBe('select-staffing');

			useStaffingBottomSheetStore.getState().previousStep();
			expect(useStaffingBottomSheetStore.getState().currentStep).toBe('select-staffing');
		});
	});

	describe('submitStaffing', () => {
		beforeEach(() => {
			jest.clearAllMocks();
			mockSavePersonnelStaffing.mockImplementation(() => Promise.resolve());
			mockFetchCurrentUserInfo.mockImplementation(() => Promise.resolve());
		});

		it('should successfully submit staffing', async () => {
			useStaffingBottomSheetStore.getState().setSelectedStaffing(mockStaffing);
			useStaffingBottomSheetStore.getState().setNote('Test note');

			await useStaffingBottomSheetStore.getState().submitStaffing();

			expect(mockSavePersonnelStaffing).toHaveBeenCalledWith(
				expect.objectContaining({
					UserId: 'test-user-id',
					Type: '1',
					Note: 'Test note',
					EventId: '',
				})
			);
			expect(mockFetchCurrentUserInfo).toHaveBeenCalled();
			expect(mockShowToast).toHaveBeenCalledWith('success', 'Staffing updated successfully');

			// Should reset after successful submission
			const state = useStaffingBottomSheetStore.getState();
			expect(state.isOpen).toBe(false);
			expect(state.selectedStaffing).toBeNull();
			expect(state.note).toBe('');
			expect(state.currentStep).toBe('select-staffing');
		});

		it('should handle submission without note', async () => {
			useStaffingBottomSheetStore.getState().setSelectedStaffing(mockStaffing);

			await useStaffingBottomSheetStore.getState().submitStaffing();

			expect(mockSavePersonnelStaffing).toHaveBeenCalledWith(
				expect.objectContaining({
					UserId: 'test-user-id',
					Type: '1',
					Note: '',
					EventId: '',
				})
			);
		});

		it('should handle missing user ID', async () => {
			// Mock no user ID
			require('@/lib/auth').useAuthStore = {
				getState: jest.fn(() => ({ userId: null })),
			};

			useStaffingBottomSheetStore.getState().setSelectedStaffing(mockStaffing);

			await useStaffingBottomSheetStore.getState().submitStaffing();

			expect(mockSavePersonnelStaffing).not.toHaveBeenCalled();
			expect(mockShowToast).toHaveBeenCalledWith('error', 'Missing required information');
		});

		it('should handle missing selected staffing', async () => {
			await useStaffingBottomSheetStore.getState().submitStaffing();

			expect(mockSavePersonnelStaffing).not.toHaveBeenCalled();
			expect(mockShowToast).toHaveBeenCalledWith('error', 'Missing required information');
		});

		it('should handle API error', async () => {
			mockSavePersonnelStaffing.mockImplementation(() => Promise.reject(new Error('API Error')));

			useStaffingBottomSheetStore.getState().setSelectedStaffing(mockStaffing);

			await useStaffingBottomSheetStore.getState().submitStaffing();

			expect(mockShowToast).toHaveBeenCalledWith('error', 'Failed to update staffing');
			expect(useStaffingBottomSheetStore.getState().isLoading).toBe(false);
		});

		it('should create correct timestamp formats', async () => {
			useStaffingBottomSheetStore.getState().setSelectedStaffing(mockStaffing);

			await useStaffingBottomSheetStore.getState().submitStaffing();

			const callArgs = mockSavePersonnelStaffing.mock.calls[0][0] as any;
			expect(callArgs.Timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/); // ISO format
			expect(callArgs.TimestampUtc).toMatch(/^\w{3}, \d{2} \w{3} \d{4} \d{2}:\d{2}:\d{2} GMT$/); // UTC format
		});
	});

	describe('reset', () => {
		it('should reset all state to initial values', () => {
			// Set some values
			useStaffingBottomSheetStore.getState().setIsOpen(true);
			useStaffingBottomSheetStore.getState().setCurrentStep('confirm');
			useStaffingBottomSheetStore.getState().setSelectedStaffing(mockStaffing);
			useStaffingBottomSheetStore.getState().setNote('Test note');
			useStaffingBottomSheetStore.getState().setIsLoading(true);

			// Verify values are set
			let state = useStaffingBottomSheetStore.getState();
			expect(state.isOpen).toBe(true);
			expect(state.currentStep).toBe('confirm');
			expect(state.selectedStaffing).toEqual(mockStaffing);
			expect(state.note).toBe('Test note');
			expect(state.isLoading).toBe(true);

			// Reset
			useStaffingBottomSheetStore.getState().reset();

			// Verify reset to initial state
			state = useStaffingBottomSheetStore.getState();
			expect(state.isOpen).toBe(false);
			expect(state.currentStep).toBe('select-staffing');
			expect(state.selectedStaffing).toBeNull();
			expect(state.note).toBe('');
			expect(state.isLoading).toBe(false);
		});
	});
});
