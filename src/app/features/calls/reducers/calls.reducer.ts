/* eslint-disable object-shorthand */
import * as _ from 'lodash';
import { initialState, CallsState } from '../store/calls.store';
import { CallActionsUnion, CallsActionTypes } from '../actions/calls.actions';
import { CallAndPriorityData } from '../models/callAndPriorityData';
import { CallPriorityResultData } from '@resgrid/ngx-resgridlib';
import { GeoLocation } from 'src/app/models/geoLocation';

// eslint-disable-next-line prefer-arrow/prefer-arrow-functions
export function reducer(state: CallsState = initialState, action: CallActionsUnion): CallsState {
	switch (action.type) {
		case CallsActionTypes.GET_CALLS_DONE:
			let activeCalls: CallAndPriorityData[] = [];

			action.calls.forEach((call) => {
				let activePriority1: CallPriorityResultData = null;
				const defaultPriority1 = _.find(action.priorities, ['Id', 0]);
				const priorityForCall1 = _.find(action.priorities, ['Id', call.Priority]);

				if (priorityForCall1) {
					activePriority1 = priorityForCall1;
				} else {
					activePriority1 = defaultPriority1;
				}

				const callData: CallAndPriorityData = {
					Call: call,
					CallPriority: activePriority1,
				};

				activeCalls.push(callData);
			});

			return {
				...state,
				activeCalls: activeCalls,
			};
		case CallsActionTypes.GET_CALL_BYID_SUCCESS:
			let activePriority: CallPriorityResultData = null;
			const defaultPriority = _.find(action.priorities, ['Id', 0]);
			const priorityForCall = _.find(action.priorities, ['Id', action.call.Priority]);

			if (priorityForCall) {
				activePriority = priorityForCall;
			} else {
				activePriority = defaultPriority;
			}

			return {
				...state,
				callToView: action.call,
				callViewData: action.data,
				callToViewPriority: activePriority,
				callFiles: [],
				callImages: [],
				callNotes: [],
				viewCallType: 'call',
			};
		case CallsActionTypes.OPEN_CALLNOTES:
			return {
				...state,
				callNotes: action.payload,
				viewCallType: 'notes',
			};
		case CallsActionTypes.SET_VIEW_CALL_MODAL:
			return {
				...state,
				viewCallType: 'call',
			};
		case CallsActionTypes.OPEN_CALLIMAGES:
			return {
				...state,
				callImages: action.payload,
				viewCallType: 'images',
			};
		case CallsActionTypes.OPEN_CALLFILESMODAL:
			return {
				...state,
				callFiles: action.payload,
				viewCallType: 'files',
			};
		case CallsActionTypes.SET_NEW_CALL_LOCATION:
			return {
				...state,
				newCallLocation: new GeoLocation(action.latitude, action.longitude),
			};
		case CallsActionTypes.SHOW_SELECT_DISPATCHS_SUCCESS:
			if (action.dispatches && action.dispatches.length > 0) {
				return {
					...state,
					newCallWhoDispatch: action.dispatches,
				};
			} else {
				return {
					...state,
				};
			}
		case CallsActionTypes.UPDATE_SELECTED_DISPTACHES:
			let recipients = _.cloneDeep(state.newCallWhoDispatch);

			if (recipients && recipients.length > 0) {
				if (action.id !== '0') {
					recipients.forEach((recipient) => {
						if (recipient.Id == action.id) {
							recipient.Selected = action.checked;
						}

						if (recipient.Id === '0' && action.id !== '0') {
							recipient.Selected = false;
						}
					});
				} else if (action.id === '0' && !action.checked) {
					recipients.forEach((recipient) => {
						recipient.Selected = false;
					});
				} else if (action.id === '0' && action.checked) {
					recipients.forEach((recipient) => {
						if (recipient.Id == action.id) {
							recipient.Selected = action.checked;
						} else {
							recipient.Selected = false;
						}
					});
				}
			}

			return {
				...state,
				newCallWhoDispatch: recipients,
			};
		case CallsActionTypes.CLOSE_NEW_CALL_MODAL:
			let whoToDispatchClear = _.cloneDeep(state.newCallWhoDispatch);

			if (whoToDispatchClear && whoToDispatchClear.length > 0) {
				whoToDispatchClear.forEach((recipient) => {
					recipient.Selected = false;
				});
			}

			return {
				...state,
				newCallWhoDispatch: whoToDispatchClear,
			};
		case CallsActionTypes.DISPATCH_CALL_SUCCESS:
			return {
				...state,
				newCallLocation: null,
				newCallWhoDispatch: null,
			};
		case CallsActionTypes.SET_EDIT_CALL_DISPATCHES:
			const editCallRecipients = _.cloneDeep(state.editCallWhoDispatch);

			if (action.dispatchEvents) {
				action.dispatchEvents.forEach((dispatch) => {
					if (dispatch.Type === 'User') {
						editCallRecipients.forEach((recipient) => {
							if (recipient.Id == `P:${dispatch.Id}`) {
								recipient.Selected = true;
							}
						});
					} else if (dispatch.Type === 'Group') {
						editCallRecipients.forEach((recipient) => {
							if (recipient.Id == `G:${dispatch.Id}`) {
								recipient.Selected = true;
							}
						});
					} else if (dispatch.Type === 'Role') {
						editCallRecipients.forEach((recipient) => {
							if (recipient.Id == `R:${dispatch.Id}`) {
								recipient.Selected = true;
							}
						});
					} else if (dispatch.Type === 'Unit') {
						editCallRecipients.forEach((recipient) => {
							if (recipient.Id == `U:${dispatch.Id}`) {
								recipient.Selected = true;
							}
						});
					}
				});
			}

			return {
				...state,
				editCallWhoDispatch: editCallRecipients,
			};
		case CallsActionTypes.GET_EDIT_CALL_DISPATCHES_SUCCESS:
			if (action.dispatches && action.dispatches.length > 0) {
				return {
					...state,
					editCallWhoDispatch: action.dispatches,
				};
			} else {
				return {
					...state,
				};
			}
		case CallsActionTypes.UPDATE_EDIT_CALL_SELECTED_DISPTACHES:
			const editCallRecipientsUpdate = _.cloneDeep(state.editCallWhoDispatch);

			if (editCallRecipientsUpdate && editCallRecipientsUpdate.length > 0) {
				if (action.id !== '0') {
					editCallRecipientsUpdate.forEach((recipient) => {
						if (recipient.Id == action.id) {
							recipient.Selected = action.checked;
						}

						if (recipient.Id === '0' && action.id !== '0') {
							recipient.Selected = false;
						}
					});
				} else if (action.id === '0' && !action.checked) {
					editCallRecipientsUpdate.forEach((recipient) => {
						recipient.Selected = false;
					});
				} else if (action.id === '0' && action.checked) {
					editCallRecipientsUpdate.forEach((recipient) => {
						if (recipient.Id == action.id) {
							recipient.Selected = action.checked;
						} else {
							recipient.Selected = false;
						}
					});
				}
			}

			return {
				...state,
				editCallWhoDispatch: editCallRecipientsUpdate,
			};
		case CallsActionTypes.CLOSE_CALL_SUCCESS:
			return {
				...state,
				viewCallType: 'call',
				callToView: null,
				callViewData: null,
				callToViewPriority: null,
				callNotes: null,
				callImages: null,
				callFiles: null,
			};
		case CallsActionTypes.UPDATE_CALL_SUCCESS:
			return {
				...state,
				editCallLocation: null,
				editCallWhoDispatch: null,
			};
		case CallsActionTypes.CLOSE_EDIT_CALL_MODAL:
			return {
				...state,
				editCallLocation: null,
				editCallWhoDispatch: null,
			};
		case CallsActionTypes.CLOSE_VIEW_CALL_MODAL:
			return {
				...state,
				viewCallType: 'call',
				callToView: null,
				callViewData: null,
				callToViewPriority: null,
				callNotes: null,
				callImages: null,
				callFiles: null,
			};
		case CallsActionTypes.CLEAR_CALLS:
			return {
				...state,
				activeCalls: null,
			};
		case CallsActionTypes.GET_COORDINATESFORADDRESS_SUCCESS:
			return {
				...state,
				newCallLocation: action.payload,
			};
		case CallsActionTypes.GET_COORDINATES_FORW3W_SUCCESS:
			return {
				...state,
				newCallLocation: action.payload,
			};
		case CallsActionTypes.GET_COORDINATES_FOR_PLUS_SUCCESS:
			return {
				...state,
				newCallLocation: action.payload,
			};
		case CallsActionTypes.EDIT_GET_COORDINATES_FOR_ADDRESS_SUCCESS:
			return {
				...state,
				editCallLocation: action.payload,
			};
		case CallsActionTypes.EDIT_GET_COORDINATES_FOR_W3W_SUCCESS:
			return {
				...state,
				editCallLocation: action.payload,
			};
		case CallsActionTypes.EDIT_GET_COORDINATES_FOR_PLUS_SUCCESS:
			return {
				...state,
				editCallLocation: action.payload,
			};
		case CallsActionTypes.SET_EDIT_CALL_LOCATION:
			return {
				...state,
				editCallLocation: new GeoLocation(action.latitude, action.longitude),
			};
		case CallsActionTypes.SHOW_SET_LOCATION_MODAL:
			return {
				...state,
				setLocationModalForNewCall: action.forNewCall,
				setLocationModalLocation: new GeoLocation(action.latitude, action.longitude),
			};
		default:
			return state;
	}
}

export const getCallImages = (state: CallsState) => state.callImages;
export const getNewCallLocation = (state: CallsState) => state.newCallLocation;
export const getNewCallDispatches = (state: CallsState) => state.newCallWhoDispatch;
export const getEditCallLocation = (state: CallsState) => state.editCallLocation;
export const getEditCallDispatches = (state: CallsState) => state.editCallWhoDispatch;
