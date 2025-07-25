import { createApiEndpoint } from '@/api/common/client';
import { type CalendarItemsResult } from '@/models/v4/calendar/calendarItemsResult';
import { type CalendarItemResult } from '@/models/v4/calendar/calendarItemResult';
import { type SetCalendarAttendingResult } from '@/models/v4/calendar/setCalendarAttendingResult';
import { type CalendarItemTypesResult } from '@/models/v4/calendar/calendarItemTypesResult';

// Define API endpoints
const getCalendarItemsApi = createApiEndpoint('/Calendar/GetCalendarItems');
const getCalendarItemsForDateRangeApi = createApiEndpoint('/Calendar/GetCalendarItemsForDateRange');
const getCalendarItemApi = createApiEndpoint('/Calendar/GetCalendarItem');
const setCalendarAttendingApi = createApiEndpoint('/Calendar/SetCalendarAttending');
const getCalendarItemTypesApi = createApiEndpoint('/Calendar/GetCalendarItemTypes');
const getTodaysCalendarItemsApi = createApiEndpoint('/Calendar/GetTodaysCalendarItems');
const getUpcomingCalendarItemsApi = createApiEndpoint('/Calendar/GetUpcomingCalendarItems');

/**
 * Fetch all calendar items for the department
 */
export const getCalendarItems = async () => {
	const response = await getCalendarItemsApi.get<CalendarItemsResult>();
	return response.data;
};

/**
 * Fetch calendar items for a specific date range
 */
export const getCalendarItemsForDateRange = async (startDate: string, endDate: string) => {
	const response = await getCalendarItemsForDateRangeApi.get<CalendarItemsResult>({ startDate, endDate });
	return response.data;
};

/**
 * Fetch a specific calendar item by ID
 */
export const getCalendarItem = async (calendarItemId: string) => {
	const response = await getCalendarItemApi.get<CalendarItemResult>({ calendarItemId });
	return response.data;
};

/**
 * Set attendance for a calendar item
 */
export const setCalendarAttending = async (calendarItemId: string, attending: boolean, note?: string) => {
	const response = await setCalendarAttendingApi.post<SetCalendarAttendingResult>({
		CalendarItemId: calendarItemId,
		Attending: attending,
		Note: note || '',
	});
	return response.data;
};

/**
 * Fetch all calendar item types
 */
export const getCalendarItemTypes = async () => {
	const response = await getCalendarItemTypesApi.get<CalendarItemTypesResult>();
	return response.data;
};

/**
 * Fetch calendar items for today
 */
export const getTodaysCalendarItems = async () => {
	const response = await getTodaysCalendarItemsApi.get<CalendarItemsResult>();
	return response.data;
};

/**
 * Fetch upcoming calendar items (next 7 days)
 */
export const getUpcomingCalendarItems = async () => {
	const response = await getUpcomingCalendarItemsApi.get<CalendarItemsResult>();
	return response.data;
};
