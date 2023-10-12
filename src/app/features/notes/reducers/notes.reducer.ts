import { initialState, NotesState } from '../store/notes.store';
import {
	NotesActionTypes
} from '../actions/notes.actions';

import * as _ from 'lodash';
import { NotesActionsUnion } from '../actions/notes.actions';

export function reducer(
	state: NotesState = initialState,
	action: NotesActionsUnion
): NotesState {
	switch (action.type) {
		case NotesActionTypes.LOAD_NOTES_SUCCESS:
			return {
				...state,
				notes: action.payload,
			};
		case NotesActionTypes.VIEW_NOTE:
			return {
				...state,
				viewNote: action.note,
			};
		default:
			return state;
	}
}
