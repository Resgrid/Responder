import { type DeleteMessageResult } from '@/models/v4/messages/deleteMessageResult';
import { type GetRecipientsResult } from '@/models/v4/messages/getRecipientsResult';
import { type MessageResult } from '@/models/v4/messages/messageResult';
import { type MessagesResult } from '@/models/v4/messages/messagesResult';
import { type RespondToMessageResult } from '@/models/v4/messages/respondToMessageResult';
import { type SendMessageResult } from '@/models/v4/messages/sendMessageResult';

import { createCachedApiEndpoint } from '../common/cached-client';
import { createApiEndpoint } from '../common/client';

const recipientsApi = createCachedApiEndpoint('/Messages/GetRecipients', {
  ttl: 60 * 1000 * 1440, // Cache for 1 day
  enabled: true,
});

//const recipientsApi = createApiEndpoint('/Messages/GetRecipients');

const getInboxMessagesApi = createApiEndpoint('/Messages/GetInboxMessages');
const getSentMessagesApi = createApiEndpoint('/Messages/GetOutboxMessages');
const getMessageApi = createApiEndpoint('/Messages/GetMessage');
const sendMessageApi = createApiEndpoint('/Messages/SendMessage');
const deleteMessageApi = createApiEndpoint('/Messages/DeleteMessage');
const respondToMessageApi = createApiEndpoint('/Messages/RespondToMessage');

export const getRecipients = async (disallowNoone: boolean, includeUnits: boolean) => {
  const response = await recipientsApi.get<GetRecipientsResult>({
    disallowNoone: disallowNoone,
    includeUnits: includeUnits,
  });
  return response.data;
};

export const getInboxMessages = async () => {
  const response = await getInboxMessagesApi.get<MessagesResult>();
  return response.data;
};

export const getSentMessages = async () => {
  const response = await getSentMessagesApi.get<MessagesResult>();
  return response.data;
};

export const getMessage = async (messageId: string) => {
  const response = await getMessageApi.get<MessageResult>({
    messageId: messageId,
  });
  return response.data;
};

export interface SendMessageRequest {
  subject: string;
  body: string;
  type: number;
  recipients: {
    id: string;
    type: number;
    name: string;
  }[];
  expireOn?: string;
}

export const sendMessage = async (messageData: SendMessageRequest) => {
  const data = {
    Title: messageData.subject,
    Body: messageData.body,
    Type: messageData.type,
    Recipients: messageData.recipients.map((recipient) => ({
      Id: recipient.id,
      Type: recipient.type,
      Name: recipient.name,
    })),
    ExpireOn: messageData.expireOn || '',
  };

  const response = await sendMessageApi.post<SendMessageResult>(data);
  return response.data;
};

export const deleteMessage = async (messageId: string) => {
  const response = await deleteMessageApi.delete<DeleteMessageResult>({
    MessageId: messageId,
  });
  return response.data;
};

export interface RespondToMessageRequest {
  messageId: string;
  response: string;
  note?: string;
}

export const respondToMessage = async (responseData: RespondToMessageRequest) => {
  const data = {
    MessageId: responseData.messageId,
    Response: responseData.response,
    Note: responseData.note || '',
  };

  const response = await respondToMessageApi.post<RespondToMessageResult>(data);
  return response.data;
};
