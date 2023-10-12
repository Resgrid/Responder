import { CalendarState, initialState } from '../store/calendar.store';
import {
	CalendarActionsUnion,
	CalendarActionTypes,
} from '../actions/calendar.actions';

import * as _ from 'lodash';

export function reducer(
	state: CalendarState = initialState,
	action: CalendarActionsUnion
): CalendarState {
	switch (action.type) {
		case CalendarActionTypes.LOAD_TODAY_CALENDAR_ITEMS_SUCCESS:
			return {
				...state,
				todayCalendarItems: action.payload,
				updateCalendarItems: false,
			};
		case CalendarActionTypes.LOAD_UPCOMING_CALENDAR_ITEMS_SUCCESS:
			return {
				...state,
				upcomingCalendarItems: action.payload,
				updateCalendarItems: false,
			};
		case CalendarActionTypes.LOAD_CALENDAR_ITEMS_SUCCESS:
			return {
				...state,
				calendarItems: action.payload,
				updateCalendarItems: false,
			};
		case CalendarActionTypes.SET_CALENDAR_ITEM_ATTENDING_STATUS:
			return {
				...state,
				updateCalendarItems: true,
			};
		case CalendarActionTypes.VIEW_CALENDAR_ITEM:
			return {
				...state,
				viewCalendarItem: action.payload,
			};
		default:
			return state;
	}
}

export const getCalendarItems = (state: CalendarState) => state.calendarItems;
export const getUpdateCalendarItems = (state: CalendarState) => state.updateCalendarItems;