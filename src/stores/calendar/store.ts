import { create } from 'zustand';

import { getCalendarItem, getCalendarItems, getCalendarItemsForDateRange, getCalendarItemTypes, getTodaysCalendarItems, getUpcomingCalendarItems, setCalendarAttending } from '@/api/calendar/calendar';
import { logger } from '@/lib/logging';
import { type CalendarItemResultData } from '@/models/v4/calendar/calendarItemResultData';
import { type GetAllCalendarItemTypesResult } from '@/models/v4/calendar/calendarItemTypeResultData';

interface CalendarState {
  // Data
  items: CalendarItemResultData[];
  todaysItems: CalendarItemResultData[];
  upcomingItems: CalendarItemResultData[];
  selectedItem: CalendarItemResultData | null;
  itemTypes: GetAllCalendarItemTypesResult[];
  selectedDate: string | null;
  selectedMonthItems: CalendarItemResultData[];

  // Loading states
  isLoading: boolean;
  isTodaysLoading: boolean;
  isUpcomingLoading: boolean;
  isItemLoading: boolean;
  isAttendanceLoading: boolean;
  isTypesLoading: boolean;

  // Error states
  error: string | null;
  attendanceError: string | null;

  // Actions
  fetchCalendarItems: () => Promise<void>;
  fetchTodaysItems: () => Promise<void>;
  fetchUpcomingItems: () => Promise<void>;
  fetchCalendarItem: (calendarItemId: string) => Promise<void>;
  fetchItemTypes: () => Promise<void>;
  fetchItemsForDateRange: (startDate: string, endDate: string) => Promise<void>;
  fetchItemsForDate: (date: string) => Promise<void>;
  setAttendance: (calendarItemId: string, attending: boolean, note?: string) => Promise<void>;
  setSelectedDate: (date: string | null) => void;
  clearSelectedItem: () => void;
  clearError: () => void;
  init: () => Promise<void>;
}

export const useCalendarStore = create<CalendarState>((set, get) => ({
  // Initial state
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

  // Actions
  fetchCalendarItems: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await getCalendarItems();
      set({ items: response.Data, isLoading: false });
      logger.info({
        message: 'Calendar items fetched successfully',
        context: { count: response.Data.length },
      });
    } catch (error) {
      logger.error({
        message: 'Failed to fetch calendar items',
        context: { error },
      });
      set({ error: 'Failed to fetch calendar items', isLoading: false });
    }
  },

  fetchTodaysItems: async () => {
    set({ isTodaysLoading: true, error: null });
    try {
      const response = await getTodaysCalendarItems();
      set({ todaysItems: response.Data, isTodaysLoading: false });
      logger.info({
        message: "Today's calendar items fetched successfully",
        context: { count: response.Data.length },
      });
    } catch (error) {
      logger.error({
        message: "Failed to fetch today's calendar items",
        context: { error },
      });
      set({ error: "Failed to fetch today's items", isTodaysLoading: false });
    }
  },

  fetchUpcomingItems: async () => {
    set({ isUpcomingLoading: true, error: null });
    try {
      const response = await getUpcomingCalendarItems();
      set({ upcomingItems: response.Data, isUpcomingLoading: false });
      logger.info({
        message: 'Upcoming calendar items fetched successfully',
        context: { count: response.Data.length },
      });
    } catch (error) {
      logger.error({
        message: 'Failed to fetch upcoming calendar items',
        context: { error },
      });
      set({ error: 'Failed to fetch upcoming items', isUpcomingLoading: false });
    }
  },

  fetchCalendarItem: async (calendarItemId: string) => {
    set({ isItemLoading: true, error: null });
    try {
      const response = await getCalendarItem(calendarItemId);
      set({ selectedItem: response.Data, isItemLoading: false });
      logger.info({
        message: 'Calendar item fetched successfully',
        context: { calendarItemId },
      });
    } catch (error) {
      logger.error({
        message: 'Failed to fetch calendar item',
        context: { error, calendarItemId },
      });
      set({ error: 'Failed to fetch calendar item', isItemLoading: false });
    }
  },

  fetchItemTypes: async () => {
    set({ isTypesLoading: true, error: null });
    try {
      const response = await getCalendarItemTypes();
      set({ itemTypes: response.Data, isTypesLoading: false });
      logger.info({
        message: 'Calendar item types fetched successfully',
        context: { count: response.Data.length },
      });
    } catch (error) {
      logger.error({
        message: 'Failed to fetch calendar item types',
        context: { error },
      });
      set({ error: 'Failed to fetch item types', isTypesLoading: false });
    }
  },

  fetchItemsForDateRange: async (startDate: string, endDate: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await getCalendarItemsForDateRange({ startDate, endDate });
      set({ selectedMonthItems: response.Data, isLoading: false });
      logger.info({
        message: 'Calendar items for date range fetched successfully',
        context: { startDate, endDate, count: response.Data.length },
      });
    } catch (error) {
      logger.error({
        message: 'Failed to fetch calendar items for date range',
        context: { error, startDate, endDate },
      });
      set({ error: 'Failed to fetch calendar items', isLoading: false });
    }
  },

  fetchItemsForDate: async (date: string) => {
    const { selectedMonthItems } = get();
    // Filter items for the specific date from already loaded month items
    const targetDate = new Date(date).toDateString();
    const dateItems = selectedMonthItems.filter((item) => {
      const itemDate = new Date(item.Start).toDateString();
      return itemDate === targetDate;
    });

    set({ selectedDate: date });
    logger.info({
      message: 'Items filtered for selected date',
      context: { date, count: dateItems.length },
    });
  },

  setAttendance: async (calendarItemId: string, attending: boolean, note?: string) => {
    set({ isAttendanceLoading: true, attendanceError: null });
    try {
      await setCalendarAttending({ calendarItemId, attending, note });

      // Update the item in all relevant arrays
      const updateItemAttendance = (item: CalendarItemResultData) => (item.CalendarItemId === calendarItemId ? { ...item, Attending: attending } : item);

      set((state) => ({
        items: state.items.map(updateItemAttendance),
        todaysItems: state.todaysItems.map(updateItemAttendance),
        upcomingItems: state.upcomingItems.map(updateItemAttendance),
        selectedMonthItems: state.selectedMonthItems.map(updateItemAttendance),
        selectedItem: state.selectedItem?.CalendarItemId === calendarItemId ? { ...state.selectedItem, Attending: attending } : state.selectedItem,
        isAttendanceLoading: false,
      }));

      logger.info({
        message: 'Calendar attendance updated successfully',
        context: { calendarItemId, attending },
      });
    } catch (error) {
      logger.error({
        message: 'Failed to update calendar attendance',
        context: { error, calendarItemId, attending },
      });
      set({
        attendanceError: 'Failed to update attendance',
        isAttendanceLoading: false,
      });
    }
  },

  setSelectedDate: (date: string | null) => {
    set({ selectedDate: date });
  },

  clearSelectedItem: () => {
    set({ selectedItem: null });
  },

  clearError: () => {
    set({ error: null, attendanceError: null });
  },

  init: async () => {
    logger.info({ message: 'Initializing calendar store' });
    await Promise.all([get().fetchItemTypes(), get().fetchTodaysItems(), get().fetchUpcomingItems()]);
  },
}));
