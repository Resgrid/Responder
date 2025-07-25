import { renderHook, act } from '@testing-library/react-native';

import { useCalendarStore } from '../store';
import * as calendarApi from '@/api/calendar/calendar';

// Mock the API module
jest.mock('@/api/calendar/calendar', () => ({
	getCalendarItems: jest.fn(),
	getTodaysCalendarItems: jest.fn(),
	getUpcomingCalendarItems: jest.fn(),
	getCalendarItem: jest.fn(),
	getCalendarItemTypes: jest.fn(),
	getCalendarItemsForDateRange: jest.fn(),
	setCalendarAttending: jest.fn(),
}));

const mockedApi = calendarApi as jest.Mocked<typeof calendarApi>;

// Mock the logger
jest.mock('@/lib/logging', () => ({
	logger: {
		info: jest.fn(),
		error: jest.fn(),
	},
}));

// Mock storage
jest.mock('@/lib/storage', () => ({
	storage: {
		getItem: jest.fn(),
		setItem: jest.fn(),
		removeItem: jest.fn(),
	},
}));

const mockCalendarItem = {
	CalendarItemId: '123',
	Title: 'Test Event',
	Start: '2024-01-15T10:00:00Z',
	StartUtc: '2024-01-15T10:00:00Z',
	End: '2024-01-15T12:00:00Z',
	EndUtc: '2024-01-15T12:00:00Z',
	StartTimezone: 'UTC',
	EndTimezone: 'UTC',
	Description: 'Test description',
	RecurrenceId: '',
	RecurrenceRule: '',
	RecurrenceException: '',
	ItemType: 1,
	IsAllDay: false,
	Location: 'Test Location',
	SignupType: 1,
	Reminder: 0,
	LockEditing: false,
	Entities: '',
	RequiredAttendes: '',
	OptionalAttendes: '',
	IsAdminOrCreator: false,
	CreatorUserId: 'user123',
	Attending: false,
	TypeName: 'Meeting',
	TypeColor: '#3B82F6',
	Attendees: [],
};

const createMockBaseResponse = () => ({
	PageSize: 0,
	Timestamp: '2024-01-15T10:00:00Z',
	Version: '1.0',
	Node: 'test-node',
	RequestId: 'test-request',
	Status: 'success',
	Environment: 'test',
});

describe('Calendar Store', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		// Reset store state
		useCalendarStore.setState({
			items: [],
			todaysItems: [],
			upcomingItems: [],
			selectedItem: null,
			itemTypes: [],
			selectedDate: null,
			selectedMonthItems: [],
			isLoading: false,
			isTodaysLoading: false,
			isUpcomingLoading: false,
			isItemLoading: false,
			isAttendanceLoading: false,
			isTypesLoading: false,
			error: null,
			attendanceError: null,
		});
	});

	describe('fetchTodaysItems', () => {
		it("should fetch today's items successfully", async () => {
			const mockResponse = {
				Data: [mockCalendarItem],
				PageSize: 0,
				Timestamp: '2024-01-15T10:00:00Z',
				Version: '1.0',
				Node: 'test-node',
				RequestId: 'test-request',
				Status: 'success',
				Environment: 'test',
			};
			mockedApi.getTodaysCalendarItems.mockResolvedValue(mockResponse);

			const { result } = renderHook(() => useCalendarStore());

			await act(async () => {
				await result.current.fetchTodaysItems();
			});

			expect(result.current.todaysItems).toEqual([mockCalendarItem]);
			expect(result.current.isTodaysLoading).toBe(false);
			expect(result.current.error).toBeNull();
		});

		it("should handle fetch today's items error", async () => {
			mockedApi.getTodaysCalendarItems.mockRejectedValue(new Error('API Error'));

			const { result } = renderHook(() => useCalendarStore());

			await act(async () => {
				await result.current.fetchTodaysItems();
			});

			expect(result.current.todaysItems).toEqual([]);
			expect(result.current.isTodaysLoading).toBe(false);
			expect(result.current.error).toBe("Failed to fetch today's items");
		});
	});

	describe('fetchUpcomingItems', () => {
		it('should fetch upcoming items successfully', async () => {
			const mockResponse = {
				Data: [mockCalendarItem],
				...createMockBaseResponse(),
			};
			mockedApi.getUpcomingCalendarItems.mockResolvedValue(mockResponse);

			const { result } = renderHook(() => useCalendarStore());

			await act(async () => {
				await result.current.fetchUpcomingItems();
			});

			expect(result.current.upcomingItems).toEqual([mockCalendarItem]);
			expect(result.current.isUpcomingLoading).toBe(false);
			expect(result.current.error).toBeNull();
		});

		it('should handle fetch upcoming items error', async () => {
			mockedApi.getUpcomingCalendarItems.mockRejectedValue(new Error('API Error'));

			const { result } = renderHook(() => useCalendarStore());

			await act(async () => {
				await result.current.fetchUpcomingItems();
			});

			expect(result.current.upcomingItems).toEqual([]);
			expect(result.current.isUpcomingLoading).toBe(false);
			expect(result.current.error).toBe('Failed to fetch upcoming items');
		});
	});

	describe('fetchCalendarItem', () => {
		it('should fetch calendar item successfully', async () => {
			const mockResponse = {
				Data: mockCalendarItem,
				...createMockBaseResponse(),
			};
			mockedApi.getCalendarItem.mockResolvedValue(mockResponse);

			const { result } = renderHook(() => useCalendarStore());

			await act(async () => {
				await result.current.fetchCalendarItem('123');
			});

			expect(result.current.selectedItem).toEqual(mockCalendarItem);
			expect(result.current.isItemLoading).toBe(false);
			expect(result.current.error).toBeNull();
		});

		it('should handle fetch calendar item error', async () => {
			mockedApi.getCalendarItem.mockRejectedValue(new Error('API Error'));

			const { result } = renderHook(() => useCalendarStore());

			await act(async () => {
				await result.current.fetchCalendarItem('123');
			});

			expect(result.current.selectedItem).toBeNull();
			expect(result.current.isItemLoading).toBe(false);
			expect(result.current.error).toBe('Failed to fetch calendar item');
		});
	});

	describe('setAttendance', () => {
		it('should update attendance successfully', async () => {
			mockedApi.setCalendarAttending.mockResolvedValue({
				Id: '123',
				...createMockBaseResponse(),
			});

			// Set initial state with the item
			useCalendarStore.setState({
				todaysItems: [mockCalendarItem],
				upcomingItems: [mockCalendarItem],
				selectedMonthItems: [mockCalendarItem],
				selectedItem: mockCalendarItem,
			});

			const { result } = renderHook(() => useCalendarStore());

			await act(async () => {
				await result.current.setAttendance('123', true, 'Test note');
			});

			expect(result.current.isAttendanceLoading).toBe(false);
			expect(result.current.attendanceError).toBeNull();

			// Check that attendance was updated in all arrays
			expect(result.current.todaysItems[0].Attending).toBe(true);
			expect(result.current.upcomingItems[0].Attending).toBe(true);
			expect(result.current.selectedMonthItems[0].Attending).toBe(true);
			expect(result.current.selectedItem?.Attending).toBe(true);
		});

		it('should handle attendance update error', async () => {
			mockedApi.setCalendarAttending.mockRejectedValue(new Error('API Error'));

			const { result } = renderHook(() => useCalendarStore());

			await act(async () => {
				await result.current.setAttendance('123', true);
			});

			expect(result.current.isAttendanceLoading).toBe(false);
			expect(result.current.attendanceError).toBe('Failed to update attendance');
		});
	});

	describe('fetchItemsForDateRange', () => {
		it('should fetch items for date range successfully', async () => {
			const mockResponse = {
				Data: [mockCalendarItem],
				...createMockBaseResponse(),
			};
			mockedApi.getCalendarItemsForDateRange.mockResolvedValue(mockResponse);

			const { result } = renderHook(() => useCalendarStore());

			await act(async () => {
				await result.current.fetchItemsForDateRange('2024-01-01', '2024-01-31');
			});

			expect(result.current.selectedMonthItems).toEqual([mockCalendarItem]);
			expect(result.current.isLoading).toBe(false);
			expect(result.current.error).toBeNull();
		});
	});

	describe('setSelectedDate', () => {
		it('should set selected date', () => {
			const { result } = renderHook(() => useCalendarStore());

			act(() => {
				result.current.setSelectedDate('2024-01-15');
			});

			expect(result.current.selectedDate).toBe('2024-01-15');
		});

		it('should clear selected date', () => {
			useCalendarStore.setState({ selectedDate: '2024-01-15' });
			const { result } = renderHook(() => useCalendarStore());

			act(() => {
				result.current.setSelectedDate(null);
			});

			expect(result.current.selectedDate).toBeNull();
		});
	});

	describe('clearSelectedItem', () => {
		it('should clear selected item', () => {
			useCalendarStore.setState({ selectedItem: mockCalendarItem });
			const { result } = renderHook(() => useCalendarStore());

			act(() => {
				result.current.clearSelectedItem();
			});

			expect(result.current.selectedItem).toBeNull();
		});
	});

	describe('clearError', () => {
		it('should clear all errors', () => {
			useCalendarStore.setState({
				error: 'Test error',
				attendanceError: 'Attendance error',
			});
			const { result } = renderHook(() => useCalendarStore());

			act(() => {
				result.current.clearError();
			});

			expect(result.current.error).toBeNull();
			expect(result.current.attendanceError).toBeNull();
		});
	});

	describe('init', () => {
		it('should initialize store with all data', async () => {
			const mockTypesResponse = {
				Data: [{ CalendarItemTypeId: '1', Name: 'Meeting', Color: '#3B82F6' }],
				...createMockBaseResponse(),
			};
			const mockTodaysResponse = {
				Data: [mockCalendarItem],
				...createMockBaseResponse(),
			};
			const mockUpcomingResponse = {
				Data: [mockCalendarItem],
				...createMockBaseResponse(),
			};

			mockedApi.getCalendarItemTypes.mockResolvedValue(mockTypesResponse);
			mockedApi.getTodaysCalendarItems.mockResolvedValue(mockTodaysResponse);
			mockedApi.getUpcomingCalendarItems.mockResolvedValue(mockUpcomingResponse);

			const { result } = renderHook(() => useCalendarStore());

			await act(async () => {
				await result.current.init();
			});

			expect(result.current.itemTypes).toEqual(mockTypesResponse.Data);
			expect(result.current.todaysItems).toEqual([mockCalendarItem]);
			expect(result.current.upcomingItems).toEqual([mockCalendarItem]);
		});
	});
});
