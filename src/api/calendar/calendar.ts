import { createApiEndpoint } from '@/api/common/client';
import { type CalendarItemResult } from '@/models/v4/calendar/calendarItemResult';
import { type CalendarItemsResult } from '@/models/v4/calendar/calendarItemsResult';
import { type CalendarItemTypesResult } from '@/models/v4/calendar/calendarItemTypesResult';
import { type SetCalendarAttendingResult } from '@/models/v4/calendar/setCalendarAttendingResult';

// Define API endpoints
const getCalendarItemsApi = createApiEndpoint('/Calendar/GetDepartmentCalendarItems');
const getCalendarItemsForDateRangeApi = createApiEndpoint('/Calendar/GetDepartmentCalendarItemsInRange');
const getCalendarItemApi = createApiEndpoint('/Calendar/GetCalendarItem');
const setCalendarAttendingApi = createApiEndpoint('/Calendar/SetCalendarAttendingStatus');
const getCalendarItemTypesApi = createApiEndpoint('/Calendar/GetDepartmentCalendarItemTypes');

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
export const getCalendarItemsForDateRange = async (start: string, end: string) => {
  const response = await getCalendarItemsForDateRangeApi.get<CalendarItemsResult>({ start, end });
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
export const setCalendarAttending = async (params: { calendarItemId: string; attending: boolean; note?: string }) => {
  const response = await setCalendarAttendingApi.post<SetCalendarAttendingResult>({
    CalendarEventId: params.calendarItemId,
    Type: params.attending === true ? 1 : 4,
    Note: params.note || '',
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
