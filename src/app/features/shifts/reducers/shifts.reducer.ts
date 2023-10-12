import { ShiftsState, initialState } from '../store/shifts.store';

import * as _ from 'lodash';
import {
	ShiftsActionsUnion,
	ShiftsActionTypes,
} from '../actions/shifts.actions';

export function reducer(
	state: ShiftsState = initialState,
	action: ShiftsActionsUnion
): ShiftsState {
	switch (action.type) {
		case ShiftsActionTypes.LOAD_TODAY_SHIFTS_SUCCESS:
			return {
				...state,
				todayShifts: action.payload,
			};
		case ShiftsActionTypes.LOAD_SHIFTS_SUCCESS:
			return {
				...state,
				shifts: action.payload,
			};
		case ShiftsActionTypes.VIEW_SHIFT:
			return {
				...state,
				viewShift: action.shift,
			};
		case ShiftsActionTypes.VIEW_SHIFT_DAY:
			return {
				...state,
				viewShiftDay: action.shiftDay,
			};
		default:
			return state;
	}
}
