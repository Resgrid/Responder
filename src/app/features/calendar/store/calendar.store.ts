import { CalendarItemResultData, CallProtocolsResultData } from "@resgrid/ngx-resgridlib";

export interface CalendarState {
    todayCalendarItems: CalendarItemResultData[];
    upcomingCalendarItems: CalendarItemResultData[];
    calendarItems: CalendarItemResultData[];
    viewCalendarItem: CalendarItemResultData;
    updateCalendarItems: boolean;
}

export const initialState: CalendarState = {
    todayCalendarItems: null,
    upcomingCalendarItems: null,
    calendarItems: null,
    viewCalendarItem: null,
    updateCalendarItems: false
};