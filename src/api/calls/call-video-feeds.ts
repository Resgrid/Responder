import { type CallVideoFeedResult } from '@/models/v4/videoFeeds/callVideoFeedResult';

import { createApiEndpoint } from '../common/client';

const getCallVideoFeedsApi = createApiEndpoint('/CallVideoFeeds/GetCallVideoFeeds');
const saveCallVideoFeedApi = createApiEndpoint('/CallVideoFeeds/SaveCallVideoFeed');
const editCallVideoFeedApi = createApiEndpoint('/CallVideoFeeds/EditCallVideoFeed');
const deleteCallVideoFeedApi = createApiEndpoint('/CallVideoFeeds/DeleteCallVideoFeed');

export interface SaveCallVideoFeedInput {
  CallId: number;
  Name: string;
  Url: string;
  FeedType: number | null;
  FeedFormat: number | null;
  Description: string;
  SortOrder: number;
}

export interface EditCallVideoFeedInput {
  CallVideoFeedId: string;
  CallId: number;
  Name: string;
  Url: string;
  FeedType: number | null;
  FeedFormat: number | null;
  Description: string;
  Status: number;
  SortOrder: number;
}

export const getCallVideoFeeds = async (callId: number) => {
  const response = await getCallVideoFeedsApi.get<CallVideoFeedResult>({
    callId: callId,
  });
  return response.data;
};

export const saveCallVideoFeed = async (input: SaveCallVideoFeedInput) => {
  const response = await saveCallVideoFeedApi.post<CallVideoFeedResult>({
    CallId: input.CallId,
    Name: input.Name,
    Url: input.Url,
    FeedType: input.FeedType,
    FeedFormat: input.FeedFormat,
    Description: input.Description,
    SortOrder: input.SortOrder,
  });
  return response.data;
};

export const editCallVideoFeed = async (input: EditCallVideoFeedInput) => {
  const response = await editCallVideoFeedApi.put<CallVideoFeedResult>({
    CallVideoFeedId: input.CallVideoFeedId,
    CallId: input.CallId,
    Name: input.Name,
    Url: input.Url,
    FeedType: input.FeedType,
    FeedFormat: input.FeedFormat,
    Description: input.Description,
    Status: input.Status,
    SortOrder: input.SortOrder,
  });
  return response.data;
};

export const deleteCallVideoFeed = async (feedId: string) => {
  const response = await deleteCallVideoFeedApi.delete<CallVideoFeedResult>({
    callVideoFeedId: feedId,
  });
  return response.data;
};
