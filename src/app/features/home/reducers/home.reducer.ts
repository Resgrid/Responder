import {
	CallPriorityResultData,
	CallResultData,
	GetCurrentStaffingResultData,
	GetCurrentStatusResultData,
	StatusesResultData,
	UnitResultData,
	UnitTypeStatusResultData,
} from '@resgrid/ngx-resgridlib';
import { HomeActionsUnion, HomeActionTypes } from '../actions/home.actions';
import { HomeState, initialState } from '../store/home.store';
import * as _ from 'lodash';

export function reducer(
	state: HomeState = initialState,
	action: HomeActionsUnion
): HomeState {
	switch (action.type) {
		case HomeActionTypes.LOADING_APP_DATA_SUCCESS:
			const date = new Date();

			let statusState: StatusesResultData = null;
			let currentStatusResultData: GetCurrentStatusResultData = null;

			if (action.payload.CurrentStatus) {
				statusState = _.find(action.payload.PersonnelStatuses, [
					'Id',
					action.payload.CurrentStatus.StatusType,
				]);

				currentStatusResultData = action.payload.CurrentStatus;
			} else {
				currentStatusResultData = {
					UserId: '',
					DepartmentId: '0',
					StatusType: 0,
					TimestampUtc: date.toISOString(),
					Timestamp: date.toISOString(),
					Note: '',
					DestinationId: '',
					DestinationType: '',
					GeoLocationData: '',
				};
			}

			let staffingState: StatusesResultData = null;
			let currentStaffingResultData: GetCurrentStaffingResultData = null;

			if (action.payload.CurrentStaffing) {
				staffingState = _.find(action.payload.PersonnelStaffing, [
					'Id',
					action.payload.CurrentStaffing.StaffingType,
				]);
				currentStaffingResultData = action.payload.CurrentStaffing;
			} else {
				currentStaffingResultData = {
					UserId: '',
					DepartmentId: '0',
					StaffingType: 0,
					TimestampUtc: date.toISOString(),
					Timestamp: date.toISOString(),
					Note: ''
				};
			}

			if (!statusState) {
				statusState = {
					Id: 0,
					Type: 0,
					StateId: 0,
					Text: 'Standing By',
					BColor: '#d1dade',
					Color: '#d1dade',
					Gps: false,
					Note: 0,
					Detail: 0,
				};
			}

			if (!staffingState) {
				staffingState = {
					Id: 0,
					Type: 0,
					StateId: 0,
					Text: 'Available',
					BColor: '#d1dade',
					Color: '#d1dade',
					Gps: false,
					Note: 0,
					Detail: 0,
				};
			}

			return {
				...state,
				//units: action.payload.Units,
				calls: action.payload.Calls,
				callPriorties: action.payload.CallPriorties,
				callTypes: action.payload.CallTypes,
				currentStatus: currentStatusResultData,
				currentStaffing: currentStaffingResultData,
				activeStatuses: action.payload.PersonnelStatuses,
				activeStaffing: action.payload.PersonnelStaffing,
				currentStatusValue: statusState,
				currentStaffingValue: staffingState,
				groups: action.payload.Groups,
				isMobileApp: action.payload.IsMobileApp,
				config: action.payload.Config,
				rights: action.payload.Rights,
			};
		case HomeActionTypes.GET_CURRENT_STATUS_SET:
			let statusStateUpdate = _.find(state.activeStatuses, [
				'Id',
				action.status.StatusType,
			]);

			let staffingStateUpdate = _.find(state.activeStaffing, [
				'Id',
				action.staffing.StaffingType,
			]);

			if (!statusStateUpdate) {
				statusStateUpdate = {
					Id: 0,
					Type: 0,
					StateId: 0,
					Text: 'Standing By',
					BColor: '#d1dade',
					Color: '#d1dade',
					Gps: false,
					Note: 0,
					Detail: 0,
				};
			}

			if (!staffingStateUpdate) {
				staffingStateUpdate = {
					Id: 0,
					Type: 0,
					StateId: 0,
					Text: 'Available',
					BColor: '#222222',
					Color: '#222222',
					Gps: false,
					Note: 0,
					Detail: 0,
				};
			}

			return {
				...state,
				currentStatus: action.status,
				currentStaffing: action.staffing,
				currentStatusValue: statusStateUpdate,
				currentStaffingValue: staffingStateUpdate,
			};
		case HomeActionTypes.PUSH_CALLRECEIVED:
			return {
				...state,
				pushData: action.pushData,
			};
		default:
			return state;
	}
}

export const getCurrentUnitStatus = (state: HomeState) => state.currentStatus;
export const getPushData = (state: HomeState) => state.pushData;
export const getConfigData = (state: HomeState) => state.config;
