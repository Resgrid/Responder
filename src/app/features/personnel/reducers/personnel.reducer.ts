import { initialState, PersonnelState } from '../store/personnel.store';
import {
	PersonnelActionsUnion,
	PersonnelActionTypes,
} from '../actions/personnel.actions';

import * as _ from 'lodash';
import { PersonnelFilterOption } from '../models/personnelFilterOption';

export function reducer(
	state: PersonnelState = initialState,
	action: PersonnelActionsUnion
): PersonnelState {
	switch (action.type) {
		case PersonnelActionTypes.GET_PERSONNEL_LIST_SUCCESS:
			return {
				...state,
				personnel: action.payload,
			};
		case PersonnelActionTypes.GET_SAVED_PERSONNEL_FILTER_DONE:
			return {
				...state,
				personnelFilter: action.filter,
			};
		case PersonnelActionTypes.GET_PERSONNEL_FILTERS_DONE:
			let newPersonnelFilter = _.cloneDeep(action.payload);

			if (!state.personnelFilter || state.personnelFilter.length <= 0) {
			} else {
				newPersonnelFilter.forEach((option) => {
					if (
						state.personnelFilter &&
						state.personnelFilter.indexOf(option.Id) > -1
					) {
						option.Selected = true;
					}
				});
			}
			return {
				...state,
				personnelFilterOptions: newPersonnelFilter,
			};
		case PersonnelActionTypes.UPDATE_SAVED_PERSONNEL_FILTER_DONE:
			return {
				...state,
				personnelFilterOptions: action.payload,
			};
		case PersonnelActionTypes.VIEW_PERSON:
			return {
				...state,
				viewPersonInfo: action.person,
			};
		case PersonnelActionTypes.CLEAR_PERSONNEL:
			return {
				...state,
				personnel: null,
			};
		default:
			return state;
	}
}
