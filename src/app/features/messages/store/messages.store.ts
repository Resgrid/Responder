import { MessageResultData, RecipientsResultData, ShiftDaysResultData, ShiftResultData } from "@resgrid/ngx-resgridlib";


export interface MessagesState {
    inboxMessages: MessageResultData[];
    outboxMessages: MessageResultData[];
    viewMessage: MessageResultData;
    recipients: RecipientsResultData[];
}

export const initialState: MessagesState = {
    inboxMessages: null,
    outboxMessages: null,
    viewMessage: null,
    recipients: null
};