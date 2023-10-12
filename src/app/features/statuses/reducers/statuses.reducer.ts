import * as _ from 'lodash';
import { initialState, StatusesState } from '../store/statuses.store';
import {
	StatusesActionsUnion,
	StatusesActionTypes,
} from '../actions/statuses.actions';
import { dataViewToHexString } from '@capacitor-community/bluetooth-le';
import { SetPersonStatusPayload } from '../models/setPersonStatusPayload';
import { SetPersonStaffingPayload } from '../models/setPersonStaffingPayload';

export function reducer(
	state: StatusesState = initialState,
	action: StatusesActionsUnion
): StatusesState {
	switch (action.type) {
		case StatusesActionTypes.SUBMIT_PERSON_STATUS_START:
			let setStatusType = 0;
			let pendingStatus: SetPersonStatusPayload = new SetPersonStatusPayload();

			if (action.status) {
				//None = 0,
				//Stations = 1,
				//Calls = 2,
				//CallsAndStations = 3
				setStatusType = action.status.Detail;
				pendingStatus.stateType = action.status.Id.toString();
			}
			pendingStatus.userId = action.userId;
			pendingStatus.destination = '';
			pendingStatus.destinationType = -1;
			pendingStatus.note = '';
			pendingStatus.date = new Date();

			return {
				...state,
				submittingPersonStatus: action.status,
				submittingPersonStatusModalDisplay: setStatusType,
				pendingSetPersonStatus: pendingStatus,
			};
		case StatusesActionTypes.SUBMIT_PERSON_STATUS_DESTINATION:
			return {
				...state,
				submitStatusDestinations: action.destinations,
			};
		case StatusesActionTypes.SUBMIT_PERSON_STATUS_NOTE_SET:
			return {
				...state,
				submittingPersonStatusNote: action.note,
				pendingSetPersonStatus: action.payload,
			};
		case StatusesActionTypes.SUBMIT_PERSON_STATUS_DESTINATION_SET:
			return {
				...state,
				submitStatusDestination: action.destination,
				pendingSetPersonStatus: action.payload,
			};
		case StatusesActionTypes.SUBMIT_PERSON_STATUS_SET:
			return {
				...state,
				pendingSetPersonStatus: action.payload,
			};
		case StatusesActionTypes.SUBMIT_PERSON_STATUS_SET_DONE:
			return {
				...state,
				submittingPersonStatus: null,
				//submittingUnitStatusUnitId: null,
				submittingPersonStatusModalDisplay: 0,
				submitStatusDestinations: null,
				submittingPersonStatusNote: null,
				submitStatusDestination: null,
			};
		case StatusesActionTypes.SUBMIT_PERSON_STAFFING_START:
			let pendingStaffing: SetPersonStaffingPayload =
				new SetPersonStaffingPayload();

			if (action.status) {
				pendingStaffing.staffingType = action.status.Id.toString();
			}
			pendingStaffing.userId = action.userId;
			pendingStaffing.note = '';
			pendingStaffing.date = new Date();

			return {
				...state,
				submittingPersonStaffing: action.status,
				pendingSetPersonStaffing: pendingStaffing,
			};
		case StatusesActionTypes.SUBMIT_PERSON_STAFFING_SET_DONE:
			return {
				...state,
				submittingPersonStaffing: null,
				pendingSetPersonStaffing: null,
				submittingPersonStaffingNote: null,
			};
		case StatusesActionTypes.SUBMIT_PERSON_STAFFING_NOTE_SET:
			return {
				...state,
				submittingPersonStaffingNote: action.note,
				pendingSetPersonStaffing: action.payload,
			};
		case StatusesActionTypes.SUBMIT_PERSON_STAFFING_SET:
			return {
				...state,
				pendingSetPersonStaffing: action.payload,
			};
		default:
			return state;
	}
}
