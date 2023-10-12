import { initialState, ProtocolsState } from '../store/protocols.store';
import {
	ProtocolsActionsUnion,
	ProtocolsActionTypes,
} from '../actions/protocols.actions';

import * as _ from 'lodash';

export function reducer(
	state: ProtocolsState = initialState,
	action: ProtocolsActionsUnion
): ProtocolsState {
	switch (action.type) {
		case ProtocolsActionTypes.LOAD_PROTOCOLS_SUCCESS:
			return {
				...state,
				protocols: action.payload,
			};
		case ProtocolsActionTypes.VIEW_PROTOCOL:
			return {
				...state,
				viewprotocol: action.protocol,
			};
		default:
			return state;
	}
}
