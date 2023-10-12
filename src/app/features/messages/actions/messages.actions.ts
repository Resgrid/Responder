import { Action } from '@ngrx/store';
import { MessageRecipientInput, MessageResultData, RecipientsResultData } from '@resgrid/ngx-resgridlib';

export enum MessagesActionTypes {
  LOAD_INBOX_MESSAGES = '[MESSAGES] LOAD_TODAY_SHIFTS',
  LOAD_INBOX_MESSAGES_SUCCESS = '[MESSAGES] LOAD_INBOX_MESSAGES_SUCCESS',
  LOAD_INBOX_MESSAGES_FAIL = '[MESSAGES] LOAD_INBOX_MESSAGES_FAIL',
  LOAD_INBOX_MESSAGES_DONE = '[MESSAGES] LOAD_INBOX_MESSAGES_DONE',
  LOAD_OUTBOX_MESSAGES = '[MESSAGES] LOAD_OUTBOX_MESSAGES',
  LOAD_OUTBOX_MESSAGES_SUCCESS = '[MESSAGES] LOAD_OUTBOX_MESSAGES_SUCCESS',
  LOAD_OUTBOX_MESSAGES_FAIL = '[MESSAGES] LOAD_OUTBOX_MESSAGES_FAIL',
  LOAD_OUTBOX_MESSAGES_DONE = '[MESSAGES] LOAD_OUTBOX_MESSAGES_DONE',
  VIEW_MESSAGE = '[MESSAGES] VIEW_MESSAGE',
  VIEW_MESSAGE_SUCCESS = '[MESSAGES] VIEW_MESSAGE_SUCCESS',
  VIEW_MESSAGE_FAIL = '[MESSAGES] VIEW_MESSAGE_FAIL',
  RESPOND_TO_MESSAGE = '[MESSAGES] RESPOND_TO_MESSAGE',
  RESPOND_TO_MESSAGE_SUCCESS = '[MESSAGES] RESPOND_TO_MESSAGE_SUCCESS',
  RESPOND_TO_MESSAGE_FAIL = '[MESSAGES] RESPOND_TO_MESSAGE_FAIL',
  RESPOND_TO_MESSAGE_DONE = '[MESSAGES] RESPOND_TO_MESSAGE_DONE',
  DELETE_MESSAGE = '[MESSAGES] DELETE_MESSAGE',
  DELETE_MESSAGE_SUCCESS = '[MESSAGES] DELETE_MESSAGE_SUCCESS',
  DELETE_MESSAGE_FAIL = '[MESSAGES] DELETE_MESSAGE_FAIL',
  DELETE_MESSAGE_DONE = '[MESSAGES] DELETE_MESSAGE_DONE',
  NEW_MESSAGE = '[MESSAGES] NEW_MESSAGE',
  NEW_MESSAGE_SUCCESS = '[MESSAGES] NEW_MESSAGE_SUCCESS',
  SHOW_SELECT_RECIPIENTS = '[MESSAGES] SHOW_SELECT_RECIPIENTS',
  SHOW_SELECT_RECIPIENTS_SUCCESS = '[MESSAGES] SHOW_SELECT_RECIPIENTS_SUCCESS',
  CLOSE_SELECT_RECIPIENTS_MODAL = '[MESSAGES] CLOSE_SELECT_RECIPIENTS_MODAL',
  UPDATE_SELECTED_RECIPIENTS = '[MESSAGES] UPDATE_SELECTED_RECIPIENTS',
  CLOSE_NEW_MESSAGE_MODAL = '[MESSAGES] CLOSE_NEW_MESSAGE_MODAL',
  SEND_MESSAGE = '[MESSAGES] SEND_MESSAGE',
  SEND_MESSAGE_SUCCESS = '[MESSAGES] SEND_MESSAGE_SUCCESS',
  SEND_MESSAGE_FAIL = '[MESSAGES] SEND_MESSAGE_FAIL',
  SEND_MESSAGE_DONE = '[MESSAGES] SEND_MESSAGE_DONE',
  DISMISS_MODAL = '[MESSAGES] DISMISS_MODAL',
  CLEAR_MESSAGES = '[MESSAGES] CLEAR_MESSAGES',
}

export class LoadInboxMessages implements Action {
  readonly type = MessagesActionTypes.LOAD_INBOX_MESSAGES;
  constructor() {}
}

export class LoadInboxMessagesSuccess implements Action {
  readonly type = MessagesActionTypes.LOAD_INBOX_MESSAGES_SUCCESS;
  constructor(public payload: MessageResultData[]) {}
}

export class LoadInboxMessagesFail implements Action {
  readonly type = MessagesActionTypes.LOAD_INBOX_MESSAGES_FAIL;
  constructor() {}
}

export class LoadOutboxMessages implements Action {
  readonly type = MessagesActionTypes.LOAD_OUTBOX_MESSAGES;
  constructor() {}
}

export class LoadOutboxMessagesSuccess implements Action {
  readonly type = MessagesActionTypes.LOAD_OUTBOX_MESSAGES_SUCCESS;
  constructor(public payload: MessageResultData[]) {}
}

export class LoadOutboxMessagesFail implements Action {
  readonly type = MessagesActionTypes.LOAD_OUTBOX_MESSAGES_FAIL;
  constructor() {}
}

export class ViewMessage implements Action {
  readonly type = MessagesActionTypes.VIEW_MESSAGE;
  constructor(public message: MessageResultData) {}
}

export class ViewMessageSuccess implements Action {
  readonly type = MessagesActionTypes.VIEW_MESSAGE_SUCCESS;
  constructor() {}
}

export class ViewMessageFail implements Action {
  readonly type = MessagesActionTypes.VIEW_MESSAGE_FAIL;
  constructor() {}
}

export class RespondToMessage implements Action {
  readonly type = MessagesActionTypes.RESPOND_TO_MESSAGE;
  constructor(public messageId: string, public userId: string, public responseType: number, public note: string) {}
}

export class RespondToMessageSuccess implements Action {
  readonly type = MessagesActionTypes.RESPOND_TO_MESSAGE_SUCCESS;
  constructor() {}
}

export class RespondToMessageDone implements Action {
  readonly type = MessagesActionTypes.RESPOND_TO_MESSAGE_DONE;
  constructor(public payload: MessageResultData[]) {}
}

export class RespondToMessageFail implements Action {
  readonly type = MessagesActionTypes.RESPOND_TO_MESSAGE_FAIL;
  constructor() {}
}

export class DeleteMessage implements Action {
  readonly type = MessagesActionTypes.DELETE_MESSAGE;
  constructor(public messageId: string) {}
}

export class DeleteMessageSuccess implements Action {
  readonly type = MessagesActionTypes.DELETE_MESSAGE_SUCCESS;
  constructor() {}
}

export class DeleteMessageDone implements Action {
  readonly type = MessagesActionTypes.DELETE_MESSAGE_DONE;
  constructor(public payload: MessageResultData[]) {}
}

export class DeleteMessageFail implements Action {
  readonly type = MessagesActionTypes.DELETE_MESSAGE_FAIL;
  constructor() {}
}

export class NewMessage implements Action {
  readonly type = MessagesActionTypes.NEW_MESSAGE;
  constructor() {}
}

export class ShowSelectRecipients implements Action {
  readonly type = MessagesActionTypes.SHOW_SELECT_RECIPIENTS;
  constructor() {}
}

export class ShowSelectRecipientsSuccess implements Action {
  readonly type = MessagesActionTypes.SHOW_SELECT_RECIPIENTS_SUCCESS;
  constructor(public recipients: RecipientsResultData[]) {}
}

export class CloseSelectRecipientsModal implements Action {
  readonly type = MessagesActionTypes.CLOSE_SELECT_RECIPIENTS_MODAL;
  constructor() {}
}

export class UpdateSelectedRecipient implements Action {
  readonly type = MessagesActionTypes.UPDATE_SELECTED_RECIPIENTS;
  constructor(public id: string, public checked: boolean) {}
}

export class CloseNewMessageModal implements Action {
  readonly type = MessagesActionTypes.CLOSE_NEW_MESSAGE_MODAL;
  constructor() {}
}

export class SendMessage implements Action {
  readonly type = MessagesActionTypes.SEND_MESSAGE;
  constructor(public title: string, public body: string, public messageType: number, public recipients: MessageRecipientInput[]) {}
}

export class SendMessageSuccess implements Action {
  readonly type = MessagesActionTypes.SEND_MESSAGE_SUCCESS;
  constructor() {}
}

export class SendMessageDone implements Action {
  readonly type = MessagesActionTypes.SEND_MESSAGE_DONE;
  constructor() {}
}

export class SendMessageFail implements Action {
  readonly type = MessagesActionTypes.SEND_MESSAGE_FAIL;
  constructor() {}
}

export class DismissModal implements Action {
  readonly type = MessagesActionTypes.DISMISS_MODAL;
  constructor() {}
}

export class ClearMessages implements Action {
  readonly type = MessagesActionTypes.CLEAR_MESSAGES;
  constructor() {}
}

export type MessagesActionsUnion =
    LoadInboxMessages
  | LoadInboxMessagesSuccess
  | LoadInboxMessagesFail
  | LoadOutboxMessages
  | LoadOutboxMessagesSuccess
  | LoadOutboxMessagesFail
  | DismissModal
  | ViewMessage
  | ViewMessageSuccess
  | ViewMessageFail
  | RespondToMessage
  | RespondToMessageSuccess
  | RespondToMessageFail
  | RespondToMessageDone
  | DeleteMessage
  | DeleteMessageSuccess
  | DeleteMessageFail
  | DeleteMessageDone
  | NewMessage
  | ShowSelectRecipients
  | ShowSelectRecipientsSuccess
  | UpdateSelectedRecipient
  | CloseNewMessageModal
  | CloseSelectRecipientsModal
  | SendMessage
  | SendMessageSuccess
  | SendMessageFail
  | SendMessageDone
  | ClearMessages
  ;
