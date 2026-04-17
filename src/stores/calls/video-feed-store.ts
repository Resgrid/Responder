import { create } from 'zustand';

import { deleteCallVideoFeed, editCallVideoFeed, type EditCallVideoFeedInput, getCallVideoFeeds, saveCallVideoFeed, type SaveCallVideoFeedInput } from '@/api/calls/call-video-feeds';
import { logger } from '@/lib/logging';
import { type CallVideoFeedResultData } from '@/models/v4/videoFeeds/callVideoFeedResultData';
import type { ApiResponse } from '@/types/api';

interface VideoFeedState {
  videoFeeds: CallVideoFeedResultData[];
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;

  fetchVideoFeeds: (callId: number) => Promise<void>;
  saveVideoFeed: (input: SaveCallVideoFeedInput) => Promise<boolean>;
  editVideoFeed: (input: EditCallVideoFeedInput) => Promise<boolean>;
  deleteVideoFeed: (feedId: string, callId: number) => Promise<boolean>;
  reset: () => void;
}

export const useVideoFeedStore = create<VideoFeedState>((set, get) => ({
  videoFeeds: [],
  isLoading: false,
  isSaving: false,
  error: null,

  fetchVideoFeeds: async (callId: number) => {
    set({ isLoading: true, error: null });
    try {
      const result = (await getCallVideoFeeds(callId)) as ApiResponse<CallVideoFeedResultData[]>;
      const feeds = result.Data ?? [];
      feeds.sort((a, b) => a.SortOrder - b.SortOrder);
      set({ videoFeeds: feeds, isLoading: false });
    } catch (error) {
      logger.error({
        message: 'Failed to fetch video feeds',
        context: { error, callId },
      });
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch video feeds',
        isLoading: false,
      });
    }
  },

  saveVideoFeed: async (input: SaveCallVideoFeedInput) => {
    set({ isSaving: true, error: null });
    try {
      await saveCallVideoFeed(input);
      set({ isSaving: false });
      await get().fetchVideoFeeds(input.CallId);
      return true;
    } catch (error) {
      logger.error({
        message: 'Failed to save video feed',
        context: { error, callId: input.CallId },
      });
      set({
        error: error instanceof Error ? error.message : 'Failed to save video feed',
        isSaving: false,
      });
      return false;
    }
  },

  editVideoFeed: async (input: EditCallVideoFeedInput) => {
    set({ isSaving: true, error: null });
    try {
      await editCallVideoFeed(input);
      set({ isSaving: false });
      await get().fetchVideoFeeds(input.CallId);
      return true;
    } catch (error) {
      logger.error({
        message: 'Failed to edit video feed',
        context: { error, feedId: input.CallVideoFeedId },
      });
      set({
        error: error instanceof Error ? error.message : 'Failed to edit video feed',
        isSaving: false,
      });
      return false;
    }
  },

  deleteVideoFeed: async (feedId: string, callId: number) => {
    const previousFeeds = get().videoFeeds;
    set({ videoFeeds: previousFeeds.filter((f) => f.CallVideoFeedId !== feedId) });
    try {
      await deleteCallVideoFeed(feedId);
      await get().fetchVideoFeeds(callId);
      return true;
    } catch (error) {
      logger.error({
        message: 'Failed to delete video feed',
        context: { error, feedId },
      });
      set({
        videoFeeds: previousFeeds,
        error: error instanceof Error ? error.message : 'Failed to delete video feed',
      });
      return false;
    }
  },

  reset: () => {
    set({
      videoFeeds: [],
      isLoading: false,
      isSaving: false,
      error: null,
    });
  },
}));
