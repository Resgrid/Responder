import { getUnits } from '@/api/units/units';
import { type UnitResultData } from '@/models/v4/units/unitResultData';
import { type UnitsResult } from '@/models/v4/units/unitsResult';

import { useUnitsStore } from '../store';

// Mock the API
jest.mock('@/api/units/units');
const mockGetUnits = getUnits as jest.MockedFunction<typeof getUnits>;

// Helper function to create mock UnitsResult
const createMockUnitsResult = (data: UnitResultData[]): UnitsResult => ({
	Data: data,
	PageSize: 0,
	Timestamp: '',
	Version: '',
	Node: '',
	RequestId: '',
	Status: '',
	Environment: '',
});

// Mock data
const mockUnits: UnitResultData[] = [
	{
		UnitId: '1',
		DepartmentId: 'dept1',
		Name: 'Engine 1',
		Type: 'Fire Engine',
		TypeId: 1,
		CustomStatusSetId: '',
		GroupId: 'group1',
		GroupName: 'Station 1',
		Vin: '1HGBH41JXMN109186',
		PlateNumber: 'FD001',
		FourWheelDrive: false,
		SpecialPermit: false,
		CurrentDestinationId: '',
		CurrentStatusId: '1',
		CurrentStatusTimestamp: '2024-01-15T10:00:00Z',
		Latitude: '40.7128',
		Longitude: '-74.0060',
		Note: 'Primary response unit for Station 1',
	},
	{
		UnitId: '2',
		DepartmentId: 'dept1',
		Name: 'Ambulance 2',
		Type: 'Ambulance',
		TypeId: 2,
		CustomStatusSetId: '',
		GroupId: 'group2',
		GroupName: 'Station 2',
		Vin: '2HGBH41JXMN109187',
		PlateNumber: 'AMB002',
		FourWheelDrive: true,
		SpecialPermit: true,
		CurrentDestinationId: '',
		CurrentStatusId: '2',
		CurrentStatusTimestamp: '2024-01-15T11:00:00Z',
		Latitude: '40.7589',
		Longitude: '-73.9851',
		Note: 'Advanced life support unit',
	},
	{
		UnitId: '3',
		DepartmentId: 'dept1',
		Name: 'Rescue 3',
		Type: 'Rescue',
		TypeId: 3,
		CustomStatusSetId: '',
		GroupId: 'group1',
		GroupName: 'Station 1',
		Vin: '',
		PlateNumber: '',
		FourWheelDrive: false,
		SpecialPermit: false,
		CurrentDestinationId: '',
		CurrentStatusId: '',
		CurrentStatusTimestamp: '',
		Latitude: '',
		Longitude: '',
		Note: '',
	},
];

describe('useUnitsStore', () => {
	beforeEach(() => {
		// Reset the store before each test
		useUnitsStore.setState({
			units: [],
			searchQuery: '',
			selectedUnitId: null,
			isDetailsOpen: false,
			isLoading: false,
			error: null,
		});

		// Clear all mocks
		jest.clearAllMocks();
	});

	describe('fetchUnits', () => {
		it('should fetch units successfully', async () => {
			mockGetUnits.mockResolvedValueOnce(createMockUnitsResult(mockUnits));

			const { fetchUnits } = useUnitsStore.getState();
			await fetchUnits();

			const state = useUnitsStore.getState();
			expect(state.units).toEqual(mockUnits);
			expect(state.isLoading).toBe(false);
			expect(state.error).toBeNull();
		});

		it('should handle fetch error', async () => {
			const errorMessage = 'Failed to fetch units';
			mockGetUnits.mockRejectedValueOnce(new Error(errorMessage));

			const { fetchUnits } = useUnitsStore.getState();
			await fetchUnits();

			const state = useUnitsStore.getState();
			expect(state.units).toEqual([]);
			expect(state.isLoading).toBe(false);
			expect(state.error).toBe(errorMessage);
		});

		it('should handle generic error', async () => {
			mockGetUnits.mockRejectedValueOnce('Generic error');

			const { fetchUnits } = useUnitsStore.getState();
			await fetchUnits();

			const state = useUnitsStore.getState();
			expect(state.error).toBe('Failed to fetch units');
		});

		it('should set loading state during fetch', async () => {
			let resolvePromise: (value: UnitsResult) => void;
			const promise = new Promise<UnitsResult>((resolve) => {
				resolvePromise = resolve;
			});
			mockGetUnits.mockReturnValueOnce(promise);

			const { fetchUnits } = useUnitsStore.getState();
			const fetchPromise = fetchUnits();

			// Check loading state
			expect(useUnitsStore.getState().isLoading).toBe(true);

			// Resolve the promise
			resolvePromise!(createMockUnitsResult(mockUnits));
			await fetchPromise;

			// Check final state
			expect(useUnitsStore.getState().isLoading).toBe(false);
		});
	});

	describe('setSearchQuery', () => {
		it('should update search query', () => {
			const { setSearchQuery } = useUnitsStore.getState();
			setSearchQuery('test query');

			expect(useUnitsStore.getState().searchQuery).toBe('test query');
		});

		it('should clear search query', () => {
			// Set initial query
			useUnitsStore.setState({ searchQuery: 'initial query' });

			const { setSearchQuery } = useUnitsStore.getState();
			setSearchQuery('');

			expect(useUnitsStore.getState().searchQuery).toBe('');
		});
	});

	describe('selectUnit', () => {
		it('should select unit and open details', () => {
			const { selectUnit } = useUnitsStore.getState();
			selectUnit('unit-123');

			const state = useUnitsStore.getState();
			expect(state.selectedUnitId).toBe('unit-123');
			expect(state.isDetailsOpen).toBe(true);
		});

		it('should select different unit', () => {
			// Initially select one unit
			useUnitsStore.setState({ selectedUnitId: 'unit-1', isDetailsOpen: true });

			const { selectUnit } = useUnitsStore.getState();
			selectUnit('unit-2');

			const state = useUnitsStore.getState();
			expect(state.selectedUnitId).toBe('unit-2');
			expect(state.isDetailsOpen).toBe(true);
		});
	});

	describe('closeDetails', () => {
		it('should close details sheet', () => {
			// Set initial state with details open
			useUnitsStore.setState({ selectedUnitId: 'unit-123', isDetailsOpen: true });

			const { closeDetails } = useUnitsStore.getState();
			closeDetails();

			expect(useUnitsStore.getState().isDetailsOpen).toBe(false);
			// selectedUnitId should be set to null when closing details
			expect(useUnitsStore.getState().selectedUnitId).toBeNull();
		});

		it('should work when details already closed', () => {
			useUnitsStore.setState({ isDetailsOpen: false });

			const { closeDetails } = useUnitsStore.getState();
			closeDetails();

			expect(useUnitsStore.getState().isDetailsOpen).toBe(false);
		});
	});

	describe('initial state', () => {
		it('should have correct initial state', () => {
			const initialState = useUnitsStore.getState();

			expect(initialState.units).toEqual([]);
			expect(initialState.searchQuery).toBe('');
			expect(initialState.selectedUnitId).toBeNull();
			expect(initialState.isDetailsOpen).toBe(false);
			expect(initialState.isLoading).toBe(false);
			expect(initialState.error).toBeNull();
		});
	});

	describe('multiple operations', () => {
		it('should handle multiple fetch operations', async () => {
			mockGetUnits.mockResolvedValue(createMockUnitsResult(mockUnits));

			const { fetchUnits } = useUnitsStore.getState();

			// First fetch
			await fetchUnits();
			expect(useUnitsStore.getState().units).toEqual(mockUnits);

			// Second fetch with different data
			const newUnits = [...mockUnits, { ...mockUnits[0], UnitId: '4', Name: 'Truck 4' }];
			mockGetUnits.mockResolvedValueOnce(createMockUnitsResult(newUnits));

			await fetchUnits();
			expect(useUnitsStore.getState().units).toEqual(newUnits);
		});

		it('should handle search and selection together', () => {
			const { setSearchQuery, selectUnit } = useUnitsStore.getState();

			setSearchQuery('search term');
			selectUnit('unit-456');

			const state = useUnitsStore.getState();
			expect(state.searchQuery).toBe('search term');
			expect(state.selectedUnitId).toBe('unit-456');
			expect(state.isDetailsOpen).toBe(true);
		});
	});

	describe('error handling', () => {
		it('should clear error on successful fetch', async () => {
			// Set initial error state
			useUnitsStore.setState({ error: 'Previous error' });

			mockGetUnits.mockResolvedValueOnce(createMockUnitsResult(mockUnits));

			const { fetchUnits } = useUnitsStore.getState();
			await fetchUnits();

			expect(useUnitsStore.getState().error).toBeNull();
		});

		it('should clear error when starting new fetch', async () => {
			// Set initial error state
			useUnitsStore.setState({ error: 'Previous error' });

			let resolvePromise: (value: UnitsResult) => void;
			const promise = new Promise<UnitsResult>((resolve) => {
				resolvePromise = resolve;
			});
			mockGetUnits.mockReturnValueOnce(promise);

			const { fetchUnits } = useUnitsStore.getState();
			fetchUnits();

			// Error should be cleared immediately when fetch starts
			expect(useUnitsStore.getState().error).toBeNull();
			expect(useUnitsStore.getState().isLoading).toBe(true);

			// Clean up
			resolvePromise!(createMockUnitsResult([]));
		});
	});
});
