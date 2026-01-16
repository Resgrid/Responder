import { renderHook, act } from '@testing-library/react-native';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

// Mock environment variables
jest.mock('@env', () => ({
	Env: {
		APP_KEY: 'test-app-key',
	},
}));

// Mock lodash
jest.mock('lodash', () => ({
	default: {
		// Add any lodash methods that might be used in the core store
	},
}));

// Mock API dependencies
jest.mock('@/api/config', () => ({
	getConfig: jest.fn(),
}));

jest.mock('@/api/satuses', () => ({
	getAllPersonnelStatuses: jest.fn(),
	getCurrentPersonStatus: jest.fn(),
}));

jest.mock('@/api/staffing', () => ({
	getAllPersonnelStaffings: jest.fn(),
	getCurrentPersonStaffing: jest.fn(),
}));

jest.mock('@/lib/storage/app', () => ({
	setActiveCallId: jest.fn(),
}));

jest.mock('@/lib/auth', () => ({
	useAuthStore: {
		getState: jest.fn(() => ({
			userId: 'test-user-id',
		})),
	},
}));

jest.mock('@/lib/logging', () => ({
	logger: {
		info: jest.fn(),
		error: jest.fn(),
	},
}));

jest.mock('@/stores/calls/store', () => ({
	useCallsStore: {
		getState: jest.fn(() => ({
			fetchCalls: jest.fn(),
			fetchCallPriorities: jest.fn(),
			calls: [],
			callPriorities: [],
		})),
	},
}));

// Mock the storage layer used by zustand persist
jest.mock('@/lib/storage', () => ({
	zustandStorage: {
		getItem: jest.fn(),
		setItem: jest.fn(),
		removeItem: jest.fn(),
	},
}));

// Import after mocks
import { useCoreStore } from '../core-store';
import { getConfig } from '@/api/config';
import { getAllPersonnelStatuses, getCurrentPersonStatus } from '@/api/satuses';
import { getAllPersonnelStaffings, getCurrentPersonStaffing } from '@/api/staffing';
import { useAuthStore } from '@/lib/auth';

const mockGetConfig = getConfig as jest.MockedFunction<typeof getConfig>;
const mockGetAllPersonnelStatuses = getAllPersonnelStatuses as jest.MockedFunction<typeof getAllPersonnelStatuses>;
const mockGetCurrentPersonStatus = getCurrentPersonStatus as jest.MockedFunction<typeof getCurrentPersonStatus>;
const mockGetAllPersonnelStaffings = getAllPersonnelStaffings as jest.MockedFunction<typeof getAllPersonnelStaffings>;
const mockGetCurrentPersonStaffing = getCurrentPersonStaffing as jest.MockedFunction<typeof getCurrentPersonStaffing>;
const mockUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>;

describe('Core Store', () => {
	beforeEach(() => {
		// Clear all mocks before each test
		jest.clearAllMocks();

		// Reset store state between tests
		useCoreStore.setState({
			activeUnitId: null,
			activeCallId: null,
			activeCall: null,
			activePriority: null,
			config: null,
			isLoading: false,
			isInitialized: false,
			isInitializing: false,
			error: null,
			activeStatuses: null,
			activeStaffing: null,
			currentStatus: null,
			currentStatusValue: null,
			currentStaffing: null,
			currentStaffingValue: null,
		});

		// Setup default mock returns
		mockGetConfig.mockResolvedValue({
			Data: {
        W3WKey: 'test-w3w-key',
        GoogleMapsKey: 'test-maps-key',
        LoggingKey: 'test-logging-key',
        MapUrl: 'test-map-url',
        MapAttribution: 'test-attribution',
        OpenWeatherApiKey: 'test-weather-key',
        NovuBackendApiUrl: 'test-novu-backend',
        NovuSocketUrl: 'test-novu-socket',
        NovuApplicationId: 'test-novu-app',
        EventingUrl: '',
        DirectionsMapKey: '',
        PersonnelLocationStaleSeconds: 0,
        UnitLocationStaleSeconds: 0,
        PersonnelLocationMinMeters: 0,
        UnitLocationMinMeters: 0,
        AnalyticsApiKey: '',
        AnalyticsHost: ''
      },
			PageSize: 0,
			Timestamp: '',
			Version: '',
			Node: '',
			RequestId: '',
			Status: 'OK',
			Environment: '',
		});

		mockGetAllPersonnelStatuses.mockResolvedValue({
			Data: [
				{
					Id: 1,
					Type: 0,
					StateId: 1,
					Text: 'Available',
					BColor: '#00FF00',
					Color: '#FFFFFF',
					Gps: false,
					Note: 0,
					Detail: 0,
				},
			],
			PageSize: 0,
			Timestamp: '',
			Version: '',
			Node: '',
			RequestId: '',
			Status: 'OK',
			Environment: '',
		});

		mockGetAllPersonnelStaffings.mockResolvedValue({
			Data: [
				{
					Id: 1,
					Type: 0,
					StateId: 1,
					Text: 'On Duty',
					BColor: '#0000FF',
					Color: '#FFFFFF',
					Gps: false,
					Note: 0,
					Detail: 0,
				},
			],
			PageSize: 0,
			Timestamp: '',
			Version: '',
			Node: '',
			RequestId: '',
			Status: 'OK',
			Environment: '',
		});

		mockGetCurrentPersonStatus.mockResolvedValue({
			Data: {
				UserId: 'test-user-id',
				DepartmentId: 'test-dept-id',
				StatusType: 1,
				TimestampUtc: '2023-01-01T00:00:00Z',
				Timestamp: '2023-01-01T00:00:00',
				Note: 'Test status note',
				DestinationId: '',
				DestinationType: '',
				GeoLocationData: '',
			},
			PageSize: 0,
			Timestamp: '',
			Version: '',
			Node: '',
			RequestId: '',
			Status: 'OK',
			Environment: '',
		});

		mockGetCurrentPersonStaffing.mockResolvedValue({
			Data: {
				UserId: 'test-user-id',
				DepartmentId: 'test-dept-id',
				StaffingType: 1,
				TimestampUtc: '2023-01-01T00:00:00Z',
				Timestamp: '2023-01-01T00:00:00',
				Note: 'Test staffing note',
			},
			PageSize: 0,
			Timestamp: '',
			Version: '',
			Node: '',
			RequestId: '',
			Status: 'OK',
			Environment: '',
		});

		// Reset store state by creating a fresh instance
		useCoreStore.setState({
			activeCallId: null,
			activeCall: null,
			activePriority: null,
			config: null,
			isLoading: false,
			isInitialized: false,
			isInitializing: false,
			error: null,
			activeStatuses: null,
			activeStaffing: null,
			currentStatus: null,
			currentStatusValue: null,
			currentStaffing: null,
			currentStaffingValue: null,
		});
	});

	describe('Initialization', () => {
		it('should prevent multiple simultaneous initializations', async () => {
			const { result } = renderHook(() => useCoreStore());

			await act(async () => {
				// Start first initialization
				const firstInit = result.current.init();

				// Try to start second initialization while first is in progress
				const secondInit = result.current.init();

				// Wait for both to complete
				await Promise.all([firstInit, secondInit]);
			});

			// Should be initialized only once
			expect(result.current.isInitialized).toBe(true);
			expect(result.current.isInitializing).toBe(false);

			// API calls should have been made
			expect(mockGetConfig).toHaveBeenCalled();
			expect(mockGetAllPersonnelStatuses).toHaveBeenCalled();
			expect(mockGetAllPersonnelStaffings).toHaveBeenCalled();
		});

		it('should not skip re-initialization (store allows refresh)', async () => {
			const { result } = renderHook(() => useCoreStore());

			// First initialization
			await act(async () => {
				await result.current.init();
			});

			expect(result.current.isInitialized).toBe(true);

			// Clear mocks to check second initialization
			jest.clearAllMocks();

			// Second initialization - the store currently allows this for data refresh purposes
			await act(async () => {
				await result.current.init();
			});

			expect(result.current.isInitialized).toBe(true);
			expect(result.current.isInitializing).toBe(false);

			// Note: The store intentionally allows re-initialization to refresh data
			// It only prevents concurrent initialization (isInitializing check)
			expect(mockGetConfig).toHaveBeenCalledTimes(1);
			expect(mockGetAllPersonnelStatuses).toHaveBeenCalledTimes(1);
			expect(mockGetAllPersonnelStaffings).toHaveBeenCalledTimes(1);
		});

		it('should handle initialization with user data', async () => {
			const { result } = renderHook(() => useCoreStore());

			await act(async () => {
				await result.current.init();
			});

			expect(result.current.isInitialized).toBe(true);
			expect(result.current.isInitializing).toBe(false);
			expect(result.current.error).toBe(null);
			expect(result.current.config).toEqual({
				W3WKey: 'test-w3w-key',
				GoogleMapsKey: 'test-maps-key',
				LoggingKey: 'test-logging-key',
				MapUrl: 'test-map-url',
				MapAttribution: 'test-attribution',
				OpenWeatherApiKey: 'test-weather-key',
				NovuBackendApiUrl: 'test-novu-backend',
				NovuSocketUrl: 'test-novu-socket',
				NovuApplicationId: 'test-novu-app',
				EventingUrl: '',
				DirectionsMapKey: '',
				PersonnelLocationStaleSeconds: 0,
				UnitLocationStaleSeconds: 0,
				PersonnelLocationMinMeters: 0,
				UnitLocationMinMeters: 0,
				AnalyticsApiKey: '',
				AnalyticsHost: '',
			});
			expect(result.current.activeStatuses).toEqual([
				{
					Id: 1,
					Type: 0,
					StateId: 1,
					Text: 'Available',
					BColor: '#00FF00',
					Color: '#FFFFFF',
					Gps: false,
					Note: 0,
					Detail: 0,
				},
			]);
			expect(result.current.activeStaffing).toEqual([
				{
					Id: 1,
					Type: 0,
					StateId: 1,
					Text: 'On Duty',
					BColor: '#0000FF',
					Color: '#FFFFFF',
					Gps: false,
					Note: 0,
					Detail: 0,
				},
			]);
		});

		it('should handle initialization without user ID', async () => {
			// Mock auth store to return no user ID
			mockUseAuthStore.getState.mockReturnValue({
				accessToken: null,
				refreshToken: null,
				refreshTokenObtainedAt: null,
				status: 'signedOut',
				error: null,
				profile: null,
				userId: null,
				isFirstTime: true,
				login: jest.fn(),
				logout: jest.fn(),
				refreshAccessToken: jest.fn(),
				hydrate: jest.fn(),
				isAuthenticated: jest.fn(() => false),
				setIsOnboarding: jest.fn(),
			} as any);

			const { result } = renderHook(() => useCoreStore());

			await act(async () => {
				await result.current.init();
			});

			expect(result.current.isInitialized).toBe(true);
			expect(result.current.isInitializing).toBe(false);
			expect(result.current.error).toBe(null);
			expect(result.current.config).toEqual({
				W3WKey: 'test-w3w-key',
				GoogleMapsKey: 'test-maps-key',
				LoggingKey: 'test-logging-key',
				MapUrl: 'test-map-url',
				MapAttribution: 'test-attribution',
				OpenWeatherApiKey: 'test-weather-key',
				NovuBackendApiUrl: 'test-novu-backend',
				NovuSocketUrl: 'test-novu-socket',
				NovuApplicationId: 'test-novu-app',
				EventingUrl: '',
				DirectionsMapKey: '',
				PersonnelLocationStaleSeconds: 0,
				UnitLocationStaleSeconds: 0,
				PersonnelLocationMinMeters: 0,
				UnitLocationMinMeters: 0,
				AnalyticsApiKey: '',
				AnalyticsHost: '',
			});
			expect(result.current.currentStatus).toBe(null);
			expect(result.current.currentStaffing).toBe(null);
		});

		it('should handle initialization errors', async () => {
			// Mock API to throw error
			mockGetConfig.mockRejectedValue(new Error('API Error'));

			const { result } = renderHook(() => useCoreStore());

			await act(async () => {
				await result.current.init();
			});

			expect(result.current.isInitialized).toBe(false);
			expect(result.current.isInitializing).toBe(false);
			expect(result.current.error).toBe('Failed to init core app data');
			expect(result.current.isLoading).toBe(false);
		});
	});

	describe('Store State', () => {
		it('should have correct initial state', () => {
			const { result } = renderHook(() => useCoreStore());

			expect(result.current.activeCallId).toBe(null);
			expect(result.current.activeCall).toBe(null);
			expect(result.current.activePriority).toBe(null);
			expect(result.current.config).toBe(null);
			expect(result.current.isLoading).toBe(false);
			expect(result.current.isInitialized).toBe(false);
			expect(result.current.isInitializing).toBe(false);
			expect(result.current.error).toBe(null);
			expect(result.current.activeStatuses).toBe(null);
			expect(result.current.activeStaffing).toBe(null);
			expect(result.current.currentStatus).toBe(null);
			expect(result.current.currentStaffing).toBe(null);
		});

		it('should have all required methods', () => {
			const { result } = renderHook(() => useCoreStore());

			expect(typeof result.current.init).toBe('function');
			expect(typeof result.current.getStatusesAndStaffing).toBe('function');
			expect(typeof result.current.setActiveCall).toBe('function');
			expect(typeof result.current.fetchConfig).toBe('function');
		});
	});

	describe('Methods', () => {
		it('should fetch config successfully', async () => {
			const { result } = renderHook(() => useCoreStore());

			await act(async () => {
				await result.current.fetchConfig();
			});

			expect(mockGetConfig).toHaveBeenCalled();
			expect(result.current.config).toEqual({
				W3WKey: 'test-w3w-key',
				GoogleMapsKey: 'test-maps-key',
				LoggingKey: 'test-logging-key',
				MapUrl: 'test-map-url',
				MapAttribution: 'test-attribution',
				OpenWeatherApiKey: 'test-weather-key',
				NovuBackendApiUrl: 'test-novu-backend',
				NovuSocketUrl: 'test-novu-socket',
				NovuApplicationId: 'test-novu-app',
				EventingUrl: '',
				DirectionsMapKey: '',
				PersonnelLocationStaleSeconds: 0,
				UnitLocationStaleSeconds: 0,
				PersonnelLocationMinMeters: 0,
				UnitLocationMinMeters: 0,
				AnalyticsApiKey: '',
				AnalyticsHost: '',
			});
		});

		it('should handle config fetch errors', async () => {
			mockGetConfig.mockRejectedValue(new Error('Config Error'));

			const { result } = renderHook(() => useCoreStore());

			await act(async () => {
				await result.current.fetchConfig();
			});

			expect(result.current.error).toBe('Failed to fetch config');
		});

		it('should get statuses and staffing successfully', async () => {
			const { result } = renderHook(() => useCoreStore());

			await act(async () => {
				await result.current.getStatusesAndStaffing();
			});

			expect(mockGetAllPersonnelStatuses).toHaveBeenCalled();
			expect(mockGetAllPersonnelStaffings).toHaveBeenCalled();
			expect(result.current.activeStatuses).toEqual([
				{
					Id: 1,
					Type: 0,
					StateId: 1,
					Text: 'Available',
					BColor: '#00FF00',
					Color: '#FFFFFF',
					Gps: false,
					Note: 0,
					Detail: 0,
				},
			]);
			expect(result.current.activeStaffing).toEqual([
				{
					Id: 1,
					Type: 0,
					StateId: 1,
					Text: 'On Duty',
					BColor: '#0000FF',
					Color: '#FFFFFF',
					Gps: false,
					Note: 0,
					Detail: 0,
				},
			]);
		});

		it('should clear active call when setting null', async () => {
			const { result } = renderHook(() => useCoreStore());

			await act(async () => {
				await result.current.setActiveCall(null);
			});

			expect(result.current.activeCall).toBe(null);
			expect(result.current.activePriority).toBe(null);
			expect(result.current.activeCallId).toBe(null);
		});
	});
});
