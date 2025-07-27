import { describe, expect, it, jest, beforeEach, afterEach } from '@jest/globals';
import { act, renderHook, waitFor } from '@testing-library/react-native';

import { getAllGroups } from '@/api/groups/groups';
import { savePersonnelStatus } from '@/api/personnel/personnelStatuses';
import { useAuthStore } from '@/lib/auth';
import { useHomeStore } from '@/stores/home/home-store';
import { useLocationStore } from '@/stores/app/location-store';
import { useToastStore } from '@/stores/toast/store';
import { usePersonnelStatusBottomSheetStore } from '../personnel-status-store';

// Mock the API calls
jest.mock('@/api/groups/groups');
jest.mock('@/api/personnel/personnelStatuses');
jest.mock('@/lib/auth');
jest.mock('@/stores/home/home-store');
jest.mock('@/stores/app/location-store');
jest.mock('@/stores/toast/store');

const mockGetAllGroups = getAllGroups as jest.MockedFunction<typeof getAllGroups>;
const mockSavePersonnelStatus = savePersonnelStatus as jest.MockedFunction<typeof savePersonnelStatus>;

describe('usePersonnelStatusBottomSheetStore', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		// Reset store state
		usePersonnelStatusBottomSheetStore.setState({
			isOpen: false,
			currentStep: 'select-responding-to',
			selectedCall: null,
			selectedGroup: null,
			selectedStatus: null,
			responseType: 'none',
			selectedTab: 'calls',
			note: '',
			respondingTo: '',
			isLoading: false,
			groups: [],
			isLoadingGroups: false,
		});

		// Setup default mocks
		(useAuthStore as any).getState = jest.fn().mockReturnValue({ userId: 'user123' });
		(useHomeStore as any).getState = jest.fn().mockReturnValue({ fetchCurrentUserInfo: jest.fn(() => Promise.resolve()) });
		(useToastStore as any).getState = jest.fn().mockReturnValue({ showToast: jest.fn() });
		(useLocationStore as any).getState = jest.fn().mockReturnValue({ 
			latitude: null, 
			longitude: null, 
			accuracy: null, 
			altitude: null, 
			speed: null, 
			heading: null 
		});
	});

	afterEach(async () => {
		// Wait for any pending async operations to complete
		await act(async () => {
			await new Promise(resolve => setTimeout(resolve, 0));
		});
		
		// Reset store state completely to ensure clean state for next test
		act(() => {
			usePersonnelStatusBottomSheetStore.setState({
				isOpen: false,
				currentStep: 'select-responding-to',
				selectedCall: null,
				selectedGroup: null,
				selectedStatus: null,
				responseType: 'none',
				selectedTab: 'calls',
				note: '',
				respondingTo: '',
				isLoading: false,
				groups: [],
				isLoadingGroups: false,
			});
		});
	});

	describe('initial state', () => {
		it('should have correct initial state', () => {
			const { result } = renderHook(() => usePersonnelStatusBottomSheetStore());

			expect(result.current.isOpen).toBe(false);
			expect(result.current.currentStep).toBe('select-responding-to');
			expect(result.current.selectedCall).toBe(null);
			expect(result.current.selectedGroup).toBe(null);
			expect(result.current.selectedStatus).toBe(null);
			expect(result.current.responseType).toBe('none');
			expect(result.current.selectedTab).toBe('calls');
			expect(result.current.note).toBe('');
			expect(result.current.respondingTo).toBe('');
			expect(result.current.isLoading).toBe(false);
			expect(result.current.groups).toEqual([]);
			expect(result.current.isLoadingGroups).toBe(false);
		});
	});

	describe('setIsOpen', () => {
		it('should open the bottom sheet with status', () => {
			const { result } = renderHook(() => usePersonnelStatusBottomSheetStore());
			const mockStatus = { 
				Id: 1, 
				Text: 'Available', 
				BColor: '#00FF00', 
				Type: 1, 
				StateId: 1, 
				Color: '#00FF00', 
				Gps: false, 
				Note: 0, 
				Detail: 0 
			};

			act(() => {
				result.current.setIsOpen(true, mockStatus as any);
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
		it('should set selected call correctly and update related state', () => {
			const { result } = renderHook(() => usePersonnelStatusBottomSheetStore());
			const mockCall = { 
				CallId: '123', 
				Number: 'CALL-001', 
				Name: 'Test Call', 
				Address: '123 Test St',
				Priority: 'High',
				Nature: 'Fire',
				Note: '',
				Geolocation: null,
				LoggedOn: '',
				Latitude: 0,
				Longitude: 0,
				Type: '',
				What3Word: '',
				LocationName: '',
				IncidentNumber: '',
				W3W: '',
				Dispatches: [],
				Units: [],
				Groups: [],
				Logs: [],
				Images: [],
				Files: [],
				Protocols: [],
				Notes: [],
				Recordings: []
			};

			act(() => {
				result.current.setSelectedCall(mockCall as any);
			});

			expect(result.current.selectedCall).toEqual(mockCall);
			expect(result.current.selectedGroup).toBe(null);
			expect(result.current.responseType).toBe('call');
			expect(result.current.respondingTo).toBe('123');
		});

		it('should clear call selection when null is passed', () => {
			const { result } = renderHook(() => usePersonnelStatusBottomSheetStore());
			const mockCall = { 
				CallId: '123', 
				Number: 'CALL-001', 
				Name: 'Test Call', 
				Address: '123 Test St',
				Priority: 'High',
				Nature: 'Fire',
				Note: '',
				Geolocation: null,
				LoggedOn: '',
				Latitude: 0,
				Longitude: 0,
				Type: '',
				What3Word: '',
				LocationName: '',
				IncidentNumber: '',
				W3W: '',
				Dispatches: [],
				Units: [],
				Groups: [],
				Logs: [],
				Images: [],
				Files: [],
				Protocols: [],
				Notes: [],
				Recordings: []
			};

			// First set a call
			act(() => {
				result.current.setSelectedCall(mockCall as any);
			});

			// Then clear it
			act(() => {
				result.current.setSelectedCall(null);
			});

			expect(result.current.selectedCall).toBe(null);
			expect(result.current.responseType).toBe('none');
			expect(result.current.respondingTo).toBe('');
		});

		it('should set selected group correctly and update related state', () => {
			const { result } = renderHook(() => usePersonnelStatusBottomSheetStore());
			const mockGroup = { GroupId: '456', Name: 'Station 1', Address: '100 Fire Station Rd', GroupType: 'Fire Station', TypeId: 1 };

			act(() => {
				result.current.setSelectedGroup(mockGroup as any);
			});

			expect(result.current.selectedGroup).toEqual(mockGroup);
			expect(result.current.selectedCall).toBe(null);
			expect(result.current.responseType).toBe('station');
			expect(result.current.respondingTo).toBe('456');
		});

		it('should clear group selection when null is passed', () => {
			const { result } = renderHook(() => usePersonnelStatusBottomSheetStore());
			const mockGroup = { GroupId: '456', Name: 'Station 1', Address: '100 Fire Station Rd', GroupType: 'Fire Station', TypeId: 1 };

			// First set a group
			act(() => {
				result.current.setSelectedGroup(mockGroup as any);
			});

			// Then clear it
			act(() => {
				result.current.setSelectedGroup(null);
			});

			expect(result.current.selectedGroup).toBe(null);
			expect(result.current.responseType).toBe('none');
			expect(result.current.respondingTo).toBe('');
		});

		it('should set response type to none and clear selections', () => {
			const { result } = renderHook(() => usePersonnelStatusBottomSheetStore());
			const mockCall = { 
				CallId: '123', 
				Number: 'CALL-001', 
				Name: 'Test Call', 
				Address: '123 Test St',
				Priority: 'High',
				Nature: 'Fire',
				Note: '',
				Geolocation: null,
				LoggedOn: '',
				Latitude: 0,
				Longitude: 0,
				Type: '',
				What3Word: '',
				LocationName: '',
				IncidentNumber: '',
				W3W: '',
				Dispatches: [],
				Units: [],
				Groups: [],
				Logs: [],
				Images: [],
				Files: [],
				Protocols: [],
				Notes: [],
				Recordings: []
			};

			// First set a call
			act(() => {
				result.current.setSelectedCall(mockCall as any);
			});

			// Then set response type to none
			act(() => {
				result.current.setResponseType('none');
			});

			expect(result.current.responseType).toBe('none');
			expect(result.current.selectedCall).toBe(null);
			expect(result.current.selectedGroup).toBe(null);
			expect(result.current.respondingTo).toBe('');
		});

		it('should set response type without clearing selections for non-none types', () => {
			const { result } = renderHook(() => usePersonnelStatusBottomSheetStore());

			act(() => {
				result.current.setResponseType('call');
			});

			expect(result.current.responseType).toBe('call');
		});

		it('should set selected tab correctly', () => {
			const { result } = renderHook(() => usePersonnelStatusBottomSheetStore());

			act(() => {
				result.current.setSelectedTab('stations');
			});

			expect(result.current.selectedTab).toBe('stations');
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

	describe('fetchGroups', () => {
		it('should fetch groups successfully', async () => {
			const mockGroups = [
				{ GroupId: '1', Name: 'Station 1', Address: '100 Fire Station Rd', GroupType: 'Fire Station', TypeId: 1 },
				{ GroupId: '2', Name: 'Station 2', Address: '200 Fire Station Ave', GroupType: 'Fire Station', TypeId: 1 },
			];
			mockGetAllGroups.mockResolvedValue({ Data: mockGroups } as any);

			const { result } = renderHook(() => usePersonnelStatusBottomSheetStore());

			await act(async () => {
				await result.current.fetchGroups();
			});

			expect(mockGetAllGroups).toHaveBeenCalled();
			expect(result.current.groups).toEqual(mockGroups);
			expect(result.current.isLoadingGroups).toBe(false);
		});

		it('should handle fetchGroups error', async () => {
			mockGetAllGroups.mockRejectedValue(new Error('API Error'));

			const { result } = renderHook(() => usePersonnelStatusBottomSheetStore());

			await act(async () => {
				await result.current.fetchGroups();
			});

			expect(result.current.groups).toEqual([]);
			expect(result.current.isLoadingGroups).toBe(false);
		});

		it('should handle loading state correctly during fetchGroups', async () => {
			let resolvePromise: (value: any) => void;
			const fetchPromise = new Promise((resolve) => {
				resolvePromise = resolve;
			});
			mockGetAllGroups.mockReturnValue(fetchPromise as any);

			const { result } = renderHook(() => usePersonnelStatusBottomSheetStore());

			// Start fetch
			const fetchGroupsPromise = act(async () => {
				return result.current.fetchGroups();
			});

			// Check loading state is true
			expect(result.current.isLoadingGroups).toBe(true);

			// Resolve the promise
			await act(async () => {
				resolvePromise({ Data: [] });
				await fetchGroupsPromise;
			});

			// Check loading state is false
			expect(result.current.isLoadingGroups).toBe(false);
		});
	});

	describe('reset', () => {
		it('should reset all state to initial values', () => {
			const { result } = renderHook(() => usePersonnelStatusBottomSheetStore());
			const mockStatus = { 
				Id: 1, 
				Text: 'Available', 
				BColor: '#00FF00', 
				Type: 1, 
				StateId: 1, 
				Color: '#00FF00', 
				Gps: false, 
				Note: 0, 
				Detail: 0 
			};
			const mockCall = { 
				CallId: '123', 
				Number: 'CALL-001', 
				Name: 'Test Call', 
				Address: '123 Test St',
				Priority: 'High',
				Nature: 'Fire',
				Note: '',
				Geolocation: null,
				LoggedOn: '',
				Latitude: 0,
				Longitude: 0,
				Type: '',
				What3Word: '',
				LocationName: '',
				IncidentNumber: '',
				W3W: '',
				Dispatches: [],
				Units: [],
				Groups: [],
				Logs: [],
				Images: [],
				Files: [],
				Protocols: [],
				Notes: [],
				Recordings: []
			};
			const mockGroup = { GroupId: '456', Name: 'Station 1', Address: '100 Fire Station Rd', GroupType: 'Fire Station', TypeId: 1 };

			// Set some state
			act(() => {
				result.current.setIsOpen(true, mockStatus as any);
				result.current.setCurrentStep('confirm');
				result.current.setSelectedCall(mockCall as any);
				result.current.setSelectedGroup(mockGroup as any);
				result.current.setResponseType('call');
				result.current.setSelectedTab('stations');
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
			expect(result.current.selectedGroup).toBe(null);
			expect(result.current.selectedStatus).toBe(null);
			expect(result.current.responseType).toBe('none');
			expect(result.current.selectedTab).toBe('calls');
			expect(result.current.note).toBe('');
			expect(result.current.respondingTo).toBe('');
			expect(result.current.isLoading).toBe(false);
			expect(result.current.groups).toEqual([]);
			expect(result.current.isLoadingGroups).toBe(false);
		});
	});

	describe('submitStatus', () => {
		beforeEach(() => {
			// Setup mock store functions
			const mockShowToast = jest.fn();
			const mockFetchCurrentUserInfo = jest.fn();
			
			(useAuthStore as any).getState = jest.fn().mockReturnValue({ userId: 'user123' });
			(useHomeStore as any).getState = jest.fn().mockReturnValue({ fetchCurrentUserInfo: mockFetchCurrentUserInfo });
			(useToastStore as any).getState = jest.fn().mockReturnValue({ showToast: mockShowToast });
			(useLocationStore as any).getState = jest.fn().mockReturnValue({ 
				latitude: null, 
				longitude: null, 
				accuracy: null, 
				altitude: null, 
				speed: null, 
				heading: null 
			});
		});

		it('should submit status successfully with call', async () => {
			const mockStatus = { 
				Id: 1, 
				Text: 'Available', 
				BColor: '#00FF00', 
				Type: 1, 
				StateId: 1, 
				Color: '#00FF00', 
				Gps: false, 
				Note: 0, 
				Detail: 0 
			};
			const mockCall = { 
				CallId: '123', 
				Number: 'CALL-001', 
				Name: 'Test Call', 
				Address: '123 Test St',
				Priority: 'High',
				Nature: 'Fire',
				Note: '',
				Geolocation: null,
				LoggedOn: '',
				Latitude: 0,
				Longitude: 0,
				Type: '',
				What3Word: '',
				LocationName: '',
				IncidentNumber: '',
				W3W: '',
				Dispatches: [],
				Units: [],
				Groups: [],
				Logs: [],
				Images: [],
				Files: [],
				Protocols: [],
				Notes: [],
				Recordings: []
			};
			
			mockSavePersonnelStatus.mockResolvedValue({} as any);

			const { result } = renderHook(() => usePersonnelStatusBottomSheetStore());

			// Set up state
			act(() => {
				result.current.setIsOpen(true, mockStatus as any);
				result.current.setSelectedCall(mockCall as any);
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
			expect(result.current.isOpen).toBe(false);
		});

		it('should submit status successfully with station', async () => {
			const mockStatus = { 
				Id: 1, 
				Text: 'Available', 
				BColor: '#00FF00', 
				Type: 1, 
				StateId: 1, 
				Color: '#00FF00', 
				Gps: false, 
				Note: 0, 
				Detail: 0 
			};
			const mockGroup = { GroupId: '456', Name: 'Station 1', Address: '100 Fire Station Rd', GroupType: 'Fire Station', TypeId: 1 };
			
			mockSavePersonnelStatus.mockResolvedValue({} as any);

			const { result } = renderHook(() => usePersonnelStatusBottomSheetStore());

			// Set up state
			act(() => {
				result.current.setIsOpen(true, mockStatus as any);
				result.current.setSelectedGroup(mockGroup as any);
				result.current.setNote('Test note');
				result.current.setRespondingTo('STATION-456');
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
					RespondingTo: 'STATION-456',
					EventId: '456',
				})
			);
			expect(result.current.isOpen).toBe(false);
		});

		it('should submit status successfully with no destination', async () => {
			const mockStatus = { 
				Id: 1, 
				Text: 'Available', 
				BColor: '#00FF00', 
				Type: 1, 
				StateId: 1, 
				Color: '#00FF00', 
				Gps: false, 
				Note: 0, 
				Detail: 0 
			};
			
			mockSavePersonnelStatus.mockResolvedValue({} as any);

			const { result } = renderHook(() => usePersonnelStatusBottomSheetStore());

			// Set up state
			act(() => {
				result.current.setIsOpen(true, mockStatus as any);
				result.current.setResponseType('none');
				result.current.setNote('Test note');
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
					RespondingTo: '',
					EventId: '',
				})
			);
			expect(result.current.isOpen).toBe(false);
		});

		it('should handle missing userId', async () => {
			const mockShowToast = jest.fn();
			(useToastStore as any).getState = jest.fn().mockReturnValue({ showToast: mockShowToast });
			(useAuthStore as any).getState = jest.fn().mockReturnValue({ userId: null });

			const { result } = renderHook(() => usePersonnelStatusBottomSheetStore());

			await act(async () => {
				await result.current.submitStatus();
			});

			expect(mockShowToast).toHaveBeenCalledWith('error', 'Missing required information');
			expect(mockSavePersonnelStatus).not.toHaveBeenCalled();
		});

		it('should handle missing status', async () => {
			const mockShowToast = jest.fn();
			(useToastStore as any).getState = jest.fn().mockReturnValue({ showToast: mockShowToast });
			(useAuthStore as any).getState = jest.fn().mockReturnValue({ userId: 'user123' });

			const { result } = renderHook(() => usePersonnelStatusBottomSheetStore());

			await act(async () => {
				await result.current.submitStatus();
			});

			expect(mockShowToast).toHaveBeenCalledWith('error', 'Missing required information');
			expect(mockSavePersonnelStatus).not.toHaveBeenCalled();
		});

		it('should handle submission error', async () => {
			const mockStatus = { 
				Id: 1, 
				Text: 'Available', 
				BColor: '#00FF00', 
				Type: 1, 
				StateId: 1, 
				Color: '#00FF00', 
				Gps: false, 
				Note: 0, 
				Detail: 0 
			};
			const mockShowToast = jest.fn();
			const mockFetchCurrentUserInfo = jest.fn(() => Promise.resolve());
			
			(useToastStore as any).getState = jest.fn().mockReturnValue({ showToast: mockShowToast });
			(useHomeStore as any).getState = jest.fn().mockReturnValue({ fetchCurrentUserInfo: mockFetchCurrentUserInfo });
			
			// Make sure the auth store returns a valid userId
			(useAuthStore as any).getState = jest.fn().mockReturnValue({ userId: 'test-user-id' });
			
			// Make savePersonnelStatus reject with an error
			const testError = new Error('API Error');
			mockSavePersonnelStatus.mockRejectedValue(testError);

			const { result } = renderHook(() => usePersonnelStatusBottomSheetStore());

			// Set up state with required data
			act(() => {
				result.current.setIsOpen(true, mockStatus as any);
			});

			// Verify initial loading state
			expect(result.current.isLoading).toBe(false);

			// Submit status and verify error handling
			await act(async () => {
				try {
					await result.current.submitStatus();
				} catch (error) {
					// The error should be caught internally, not thrown
				}
			});

			// Wait for all async operations to complete and verify final state
			await waitFor(() => {
				expect(result.current.isLoading).toBe(false);
			}, { timeout: 2000 });

			// Verify error handling occurred
			expect(mockSavePersonnelStatus).toHaveBeenCalled();
			expect(mockShowToast).toHaveBeenCalledWith('error', 'Failed to update status');
			
			// Verify fetchCurrentUserInfo was NOT called due to the error
			expect(mockFetchCurrentUserInfo).not.toHaveBeenCalled();
		});

		it('should handle loading state correctly', async () => {
			const mockStatus = { 
				Id: 1, 
				Text: 'Available', 
				BColor: '#00FF00', 
				Type: 1, 
				StateId: 1, 
				Color: '#00FF00', 
				Gps: false, 
				Note: 0, 
				Detail: 0 
			};

			// Create a promise that we can control
			let resolvePromise: (value: any) => void;
			const submitPromise = new Promise((resolve) => {
				resolvePromise = resolve;
			});
			mockSavePersonnelStatus.mockReturnValue(submitPromise as any);

			const { result } = renderHook(() => usePersonnelStatusBottomSheetStore());

			// Set up state
			act(() => {
				result.current.setIsOpen(true, mockStatus as any);
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
