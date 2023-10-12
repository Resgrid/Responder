import { initialState, UnitsState } from '../store/units.store';
import { UnitsActionsUnion, UnitsActionTypes } from '../actions/units.actions';

import * as _ from 'lodash';

export function reducer(
	state: UnitsState = initialState,
	action: UnitsActionsUnion
): UnitsState {
	switch (action.type) {
		case UnitsActionTypes.GET_UNITS_LIST_SUCCESS:
			return {
				...state,
				units: action.payload,
			};
		case UnitsActionTypes.GET_SAVED_UNITS_FILTER_DONE:
			return {
				...state,
				unitFilter: action.filter,
			};
		case UnitsActionTypes.GET_UNITS_FILTERS_DONE:
			let newUnitsFilter = _.cloneDeep(action.payload);

			if (!state.unitFilter || state.unitFilter.length <= 0) {
			} else {
				newUnitsFilter.forEach((option) => {
					if (state.unitFilter && state.unitFilter.indexOf(option.Id) > -1) {
						option.Selected = true;
					}
				});
			}
			return {
				...state,
				unitFilterOptions: newUnitsFilter,
			};
		case UnitsActionTypes.UPDATE_SAVED_UNITS_FILTER_DONE:
			return {
				...state,
				unitFilterOptions: action.payload,
			};
		case UnitsActionTypes.VIEW_UNIT:
			return {
				...state,
				viewUnitInfo: action.unit,
			};
		case UnitsActionTypes.CLEAR_UNITS:
			return {
				...state,
				units: null,
			};
		default:
			return state;
	}
}
