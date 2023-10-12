import { MessagesState, initialState } from '../store/messages.store';

import * as _ from 'lodash';
import {
	MessagesActionsUnion,
	MessagesActionTypes,
} from '../actions/messages.actions';

export function reducer(
	state: MessagesState = initialState,
	action: MessagesActionsUnion
): MessagesState {
	switch (action.type) {
		case MessagesActionTypes.LOAD_INBOX_MESSAGES_SUCCESS:
			return {
				...state,
				inboxMessages: action.payload,
			};
		case MessagesActionTypes.LOAD_OUTBOX_MESSAGES_SUCCESS:
			return {
				...state,
				outboxMessages: action.payload,
			};
		case MessagesActionTypes.VIEW_MESSAGE:
			return {
				...state,
				viewMessage: action.message,
			};
		case MessagesActionTypes.RESPOND_TO_MESSAGE_DONE:
			return {
				...state,
				inboxMessages: action.payload,
			};
		case MessagesActionTypes.DELETE_MESSAGE_DONE:
			return {
				...state,
				inboxMessages: action.payload,
			};
		case MessagesActionTypes.SHOW_SELECT_RECIPIENTS_SUCCESS:
			if (action.recipients && action.recipients.length > 0) {
				return {
					...state,
					recipients: action.recipients,
				};
			} else {
				return {
					...state,
				};
			}
		case MessagesActionTypes.UPDATE_SELECTED_RECIPIENTS:
			let recipients = _.cloneDeep(state.recipients);

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
				recipients: recipients,
			};
		case MessagesActionTypes.CLOSE_NEW_MESSAGE_MODAL:
			let recipientsClear = _.cloneDeep(state.recipients);

			if (recipientsClear && recipientsClear.length > 0) {
				recipientsClear.forEach((recipient) => {
					recipient.Selected = false;
				});
			}

			return {
				...state,
				recipients: recipientsClear,
			};
		case MessagesActionTypes.CLEAR_MESSAGES:
			return {
				...state,
				inboxMessages: null,
				outboxMessages: null,
			};
		default:
			return state;
	}
}

export const getRecipients = (state: MessagesState) => state.recipients;
