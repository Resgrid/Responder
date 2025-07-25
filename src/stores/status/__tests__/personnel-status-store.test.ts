import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { act, renderHook, waitFor } from '@testing-library/react-native';

import { savePersonnelStatus } from '@/api/personnel/personnelStatuses';
import { useAuthStore } from '@/lib/auth';
import { useHomeStore } from '@/stores/home/home-store';
import { useToastStore } from '@/stores/toast/store';
import { usePersonnelStatusBottomSheetStore } from '../personnel-status-store';

// Mock the API calls
jest.mock('@/api/personnel/personnelStatuses');
jest.mock('@/lib/auth');
jest.mock('@/stores/home/home-store');
jest.mock('@/stores/toast/store');

const mockSavePersonnelStatus = savePersonnelStatus as jest.MockedFunction<typeof savePersonnelStatus>;
const mockUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>;
const mockUseHomeStore = useHomeStore as jest.MockedFunction<typeof useHomeStore>;
const mockUseToastStore = useToastStore as jest.MockedFunction<typeof useToastStore>;

describe('usePersonnelStatusBottomSheetStore', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		// Reset store state
		usePersonnelStatusBottomSheetStore.setState({
			isOpen: false,
			currentStep: 'select-responding-to',
			selectedCall: null,
			selectedStatus: null,
			note: '',
			respondingTo: '',
			isLoading: false,
		});
	});

	describe('initial state', () => {
		it('should have correct initial state', () => {
			const { result } = renderHook(() => usePersonnelStatusBottomSheetStore());

			expect(result.current.isOpen).toBe(false);
			expect(result.current.currentStep).toBe('select-responding-to');
			expect(result.current.selectedCall).toBe(null);
			expect(result.current.selectedStatus).toBe(null);
			expect(result.current.note).toBe('');
			expect(result.current.respondingTo).toBe('');
			expect(result.current.isLoading).toBe(false);
		});
	});

	describe('setIsOpen', () => {
		it('should open the bottom sheet with status', () => {
			const { result } = renderHook(() => usePersonnelStatusBottomSheetStore());
			const mockStatus = { Id: 1, Text: 'Available', BColor: '#00FF00' };

			act(() => {
				result.current.setIsOpen(true, mockStatus);
			});

			expect(result.current.isOpen).toBe(true);
			expect(result.current.selectedStatus).toEqual(mockStatus);
			expect(result.current.currentStep).toBe('select-responding-to');
		});

		it('should open the bottom sheet without status', () => {
			const { result } = renderHook(() => usePersonnelStatusBottomSheetStore());

			act(() => {
				result.current.setIsOpen(true);
			});

			expect(result.current.isOpen).toBe(true);
			expect(result.current.selectedStatus).toBe(null);
		});

		it('should close the bottom sheet', () => {
			const { result } = renderHook(() => usePersonnelStatusBottomSheetStore());

			// First open it
			act(() => {
				result.current.setIsOpen(true);
			});

			// Then close it
			act(() => {
				result.current.setIsOpen(false);
			});

			expect(result.current.isOpen).toBe(false);
		});
	});

	describe('step navigation', () => {
		it('should navigate to next step correctly', () => {
			const { result } = renderHook(() => usePersonnelStatusBottomSheetStore());

			// Test progression through all steps
			act(() => {
				result.current.nextStep(); // select-responding-to -> add-note
			});
			expect(result.current.currentStep).toBe('add-note');

			act(() => {
				result.current.nextStep(); // add-note -> confirm
			});
			expect(result.current.currentStep).toBe('confirm');

			// Should not progress beyond confirm
			act(() => {
				result.current.nextStep();
			});
			expect(result.current.currentStep).toBe('confirm');
		});

		it('should navigate to previous step correctly', () => {
			const { result } = renderHook(() => usePersonnelStatusBottomSheetStore());

			// Start at confirm step
			act(() => {
				result.current.setCurrentStep('confirm');
			});

			act(() => {
				result.current.previousStep(); // confirm -> add-note
			});
			expect(result.current.currentStep).toBe('add-note');

			act(() => {
				result.current.previousStep(); // add-note -> select-responding-to
			});
			expect(result.current.currentStep).toBe('select-responding-to');

			// Should not go beyond first step
			act(() => {
				result.current.previousStep();
			});
			expect(result.current.currentStep).toBe('select-responding-to');
		});
	});

	describe('state setters', () => {
		it('should set selected call correctly', () => {
			const { result } = renderHook(() => usePersonnelStatusBottomSheetStore());
			const mockCall = { CallId: '123', Number: 'CALL-001', Name: 'Test Call', Address: '123 Test St' };

			act(() => {
				result.current.setSelectedCall(mockCall);
			});

			expect(result.current.selectedCall).toEqual(mockCall);
		});

		it('should set note correctly', () => {
			const { result } = renderHook(() => usePersonnelStatusBottomSheetStore());

			act(() => {
				result.current.setNote('Test note');
			});

			expect(result.current.note).toBe('Test note');
		});

		it('should set responding to correctly', () => {
			const { result } = renderHook(() => usePersonnelStatusBottomSheetStore());

			act(() => {
				result.current.setRespondingTo('CALL-123');
			});

			expect(result.current.respondingTo).toBe('CALL-123');
		});

		it('should set loading state correctly', () => {
			const { result } = renderHook(() => usePersonnelStatusBottomSheetStore());

			act(() => {
				result.current.setIsLoading(true);
			});

			expect(result.current.isLoading).toBe(true);
		});
	});

	describe('reset', () => {
		it('should reset all state to initial values', () => {
			const { result } = renderHook(() => usePersonnelStatusBottomSheetStore());
			const mockStatus = { Id: 1, Text: 'Available', BColor: '#00FF00' };
			const mockCall = { CallId: '123', Number: 'CALL-001', Name: 'Test Call', Address: '123 Test St' };

			// Set some state
			act(() => {
				result.current.setIsOpen(true, mockStatus);
				result.current.setCurrentStep('confirm');
				result.current.setSelectedCall(mockCall);
				result.current.setNote('Test note');
				result.current.setRespondingTo('CALL-123');
				result.current.setIsLoading(true);
			});

			// Reset
			act(() => {
				result.current.reset();
			});

			expect(result.current.isOpen).toBe(false);
			expect(result.current.currentStep).toBe('select-responding-to');
			expect(result.current.selectedCall).toBe(null);
			expect(result.current.selectedStatus).toBe(null);
			expect(result.current.note).toBe('');
			expect(result.current.respondingTo).toBe('');
			expect(result.current.isLoading).toBe(false);
		});
	});

	describe('submitStatus', () => {
		beforeEach(() => {
			// Mock the store dependencies
			mockUseAuthStore.mockReturnValue({ userId: 'user123' });
			mockUseHomeStore.mockReturnValue({ fetchCurrentUserInfo: jest.fn() });
			mockUseToastStore.mockReturnValue({ showToast: jest.fn() });
		});

		it('should submit status successfully', async () => {
			const mockStatus = { Id: 1, Text: 'Available', BColor: '#00FF00' };
			const mockCall = { CallId: '123', Number: 'CALL-001', Name: 'Test Call', Address: '123 Test St' };
			const mockShowToast = jest.fn();
			const mockFetchCurrentUserInfo = jest.fn();

			mockUseToastStore.getState = jest.fn().mockReturnValue({ showToast: mockShowToast });
			mockUseAuthStore.getState = jest.fn().mockReturnValue({ userId: 'user123' });
			mockUseHomeStore.getState = jest.fn().mockReturnValue({ fetchCurrentUserInfo: mockFetchCurrentUserInfo });
			mockSavePersonnelStatus.mockResolvedValue({} as any);

			const { result } = renderHook(() => usePersonnelStatusBottomSheetStore());

			// Set up state
			act(() => {
				result.current.setIsOpen(true, mockStatus);
				result.current.setSelectedCall(mockCall);
				result.current.setNote('Test note');
				result.current.setRespondingTo('CALL-123');
			});

			// Submit
			await act(async () => {
				await result.current.submitStatus();
			});

			expect(mockSavePersonnelStatus).toHaveBeenCalledWith(
				expect.objectContaining({
					UserId: 'user123',
					Type: '1',
					Note: 'Test note',
					RespondingTo: 'CALL-123',
					EventId: '123',
				})
			);
			expect(mockFetchCurrentUserInfo).toHaveBeenCalled();
			expect(mockShowToast).toHaveBeenCalledWith('success', 'Status updated successfully');
			expect(result.current.isOpen).toBe(false);
		});

		it('should handle missing userId', async () => {
			const mockShowToast = jest.fn();
			mockUseToastStore.getState = jest.fn().mockReturnValue({ showToast: mockShowToast });
			mockUseAuthStore.getState = jest.fn().mockReturnValue({ userId: null });

			const { result } = renderHook(() => usePersonnelStatusBottomSheetStore());

			await act(async () => {
				await result.current.submitStatus();
			});

			expect(mockShowToast).toHaveBeenCalledWith('error', 'Missing required information');
			expect(mockSavePersonnelStatus).not.toHaveBeenCalled();
		});

		it('should handle missing status', async () => {
			const mockShowToast = jest.fn();
			mockUseToastStore.getState = jest.fn().mockReturnValue({ showToast: mockShowToast });
			mockUseAuthStore.getState = jest.fn().mockReturnValue({ userId: 'user123' });

			const { result } = renderHook(() => usePersonnelStatusBottomSheetStore());

			await act(async () => {
				await result.current.submitStatus();
			});

			expect(mockShowToast).toHaveBeenCalledWith('error', 'Missing required information');
			expect(mockSavePersonnelStatus).not.toHaveBeenCalled();
		});

		it('should handle submission error', async () => {
			const mockStatus = { Id: 1, Text: 'Available', BColor: '#00FF00' };
			const mockShowToast = jest.fn();
			const mockFetchCurrentUserInfo = jest.fn();

			mockUseToastStore.getState = jest.fn().mockReturnValue({ showToast: mockShowToast });
			mockUseAuthStore.getState = jest.fn().mockReturnValue({ userId: 'user123' });
			mockUseHomeStore.getState = jest.fn().mockReturnValue({ fetchCurrentUserInfo: mockFetchCurrentUserInfo });
			mockSavePersonnelStatus.mockRejectedValue(new Error('API Error'));

			const { result } = renderHook(() => usePersonnelStatusBottomSheetStore());

			// Set up state
			act(() => {
				result.current.setIsOpen(true, mockStatus);
			});

			await act(async () => {
				await result.current.submitStatus();
			});

			expect(mockShowToast).toHaveBeenCalledWith('error', 'Failed to update status');
			expect(result.current.isLoading).toBe(false);
		});

		it('should handle loading state correctly', async () => {
			const mockStatus = { Id: 1, Text: 'Available', BColor: '#00FF00' };
			const mockShowToast = jest.fn();
			const mockFetchCurrentUserInfo = jest.fn();

			mockUseToastStore.getState = jest.fn().mockReturnValue({ showToast: mockShowToast });
			mockUseAuthStore.getState = jest.fn().mockReturnValue({ userId: 'user123' });
			mockUseHomeStore.getState = jest.fn().mockReturnValue({ fetchCurrentUserInfo: mockFetchCurrentUserInfo });

			// Create a promise that we can control
			let resolvePromise: (value: any) => void;
			const submitPromise = new Promise((resolve) => {
				resolvePromise = resolve;
			});
			mockSavePersonnelStatus.mockReturnValue(submitPromise as any);

			const { result } = renderHook(() => usePersonnelStatusBottomSheetStore());

			// Set up state
			act(() => {
				result.current.setIsOpen(true, mockStatus);
			});

			// Start submission
			const submissionPromise = act(async () => {
				return result.current.submitStatus();
			});

			// Check loading state is true
			expect(result.current.isLoading).toBe(true);

			// Resolve the promise
			await act(async () => {
				resolvePromise({});
				await submissionPromise;
			});

			// Check loading state is false
			expect(result.current.isLoading).toBe(false);
		});
	});
});
