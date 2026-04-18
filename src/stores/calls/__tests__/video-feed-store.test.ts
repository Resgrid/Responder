import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { act, renderHook, waitFor } from '@testing-library/react-native';

import { deleteCallVideoFeed, editCallVideoFeed, getCallVideoFeeds, saveCallVideoFeed } from '@/api/calls/call-video-feeds';
import { useVideoFeedStore } from '../video-feed-store';

jest.mock('@/api/calls/call-video-feeds');
jest.mock('@/lib/logging', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

const mockGetCallVideoFeeds = getCallVideoFeeds as jest.MockedFunction<typeof getCallVideoFeeds>;
const mockSaveCallVideoFeed = saveCallVideoFeed as jest.MockedFunction<typeof saveCallVideoFeed>;
const mockEditCallVideoFeed = editCallVideoFeed as jest.MockedFunction<typeof editCallVideoFeed>;
const mockDeleteCallVideoFeed = deleteCallVideoFeed as jest.MockedFunction<typeof deleteCallVideoFeed>;

const createMockFeed = (overrides: Record<string, unknown> = {}) => ({
  CallVideoFeedId: '1',
  CallId: '100',
  Name: 'Test Feed',
  Url: 'https://example.com/stream.m3u8',
  FeedType: 0,
  FeedFormat: 1,
  Description: 'Test description',
  Status: 0,
  Latitude: null,
  Longitude: null,
  AddedByUserId: 'user1',
  AddedOnFormatted: '2026-01-01',
  AddedOnUtc: '2026-01-01T00:00:00Z',
  SortOrder: 0,
  FullName: 'Test User',
  ...overrides,
});

describe('useVideoFeedStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useVideoFeedStore.getState().reset();
  });

  describe('fetchVideoFeeds', () => {
    it('should fetch and sort video feeds by SortOrder', async () => {
      const mockFeeds = [
        createMockFeed({ CallVideoFeedId: '2', Name: 'Second', SortOrder: 2 }),
        createMockFeed({ CallVideoFeedId: '1', Name: 'First', SortOrder: 1 }),
        createMockFeed({ CallVideoFeedId: '3', Name: 'Third', SortOrder: 3 }),
      ];

      mockGetCallVideoFeeds.mockResolvedValue({ Data: mockFeeds } as any);

      const { result } = renderHook(() => useVideoFeedStore());

      await act(async () => {
        await result.current.fetchVideoFeeds(100);
      });

      await waitFor(() => {
        expect(result.current.videoFeeds).toHaveLength(3);
        expect(result.current.videoFeeds[0].Name).toBe('First');
        expect(result.current.videoFeeds[1].Name).toBe('Second');
        expect(result.current.videoFeeds[2].Name).toBe('Third');
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should handle fetch error', async () => {
      mockGetCallVideoFeeds.mockRejectedValue(new Error('Network Error'));

      const { result } = renderHook(() => useVideoFeedStore());

      await act(async () => {
        await result.current.fetchVideoFeeds(100);
      });

      await waitFor(() => {
        expect(result.current.error).toBe('Network Error');
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe('saveVideoFeed', () => {
    it('should save and refetch on success', async () => {
      mockSaveCallVideoFeed.mockResolvedValue({ Data: [] } as any);
      mockGetCallVideoFeeds.mockResolvedValue({ Data: [createMockFeed()] } as any);

      const { result } = renderHook(() => useVideoFeedStore());

      let success = false;
      await act(async () => {
        success = await result.current.saveVideoFeed({
          CallId: 100,
          Name: 'New Feed',
          Url: 'https://example.com/stream.m3u8',
          FeedType: 0,
          FeedFormat: 1,
          Description: '',
          SortOrder: 0,
        });
      });

      expect(success).toBe(true);
      expect(mockSaveCallVideoFeed).toHaveBeenCalledTimes(1);
      expect(mockGetCallVideoFeeds).toHaveBeenCalledWith(100);
    });

    it('should handle save error', async () => {
      mockSaveCallVideoFeed.mockRejectedValue(new Error('Save failed'));

      const { result } = renderHook(() => useVideoFeedStore());

      let success = false;
      await act(async () => {
        success = await result.current.saveVideoFeed({
          CallId: 100,
          Name: 'New Feed',
          Url: 'https://example.com/stream.m3u8',
          FeedType: 0,
          FeedFormat: 1,
          Description: '',
          SortOrder: 0,
        });
      });

      expect(success).toBe(false);
      expect(result.current.error).toBe('Save failed');
      expect(result.current.isSaving).toBe(false);
    });
  });

  describe('editVideoFeed', () => {
    it('should edit and refetch on success', async () => {
      mockEditCallVideoFeed.mockResolvedValue({ Data: [] } as any);
      mockGetCallVideoFeeds.mockResolvedValue({ Data: [createMockFeed({ Name: 'Updated' })] } as any);

      const { result } = renderHook(() => useVideoFeedStore());

      let success = false;
      await act(async () => {
        success = await result.current.editVideoFeed({
          CallVideoFeedId: '1',
          CallId: 100,
          Name: 'Updated',
          Url: 'https://example.com/stream.m3u8',
          FeedType: 0,
          FeedFormat: 1,
          Description: '',
          Status: 0,
          SortOrder: 0,
        });
      });

      expect(success).toBe(true);
      expect(mockEditCallVideoFeed).toHaveBeenCalledTimes(1);
      expect(mockGetCallVideoFeeds).toHaveBeenCalledWith(100);
    });

    it('should handle edit error', async () => {
      mockEditCallVideoFeed.mockRejectedValue(new Error('Edit failed'));

      const { result } = renderHook(() => useVideoFeedStore());

      let success = false;
      await act(async () => {
        success = await result.current.editVideoFeed({
          CallVideoFeedId: '1',
          CallId: 100,
          Name: 'Updated',
          Url: 'https://example.com/stream.m3u8',
          FeedType: 0,
          FeedFormat: 1,
          Description: '',
          Status: 0,
          SortOrder: 0,
        });
      });

      expect(success).toBe(false);
      expect(result.current.error).toBe('Edit failed');
    });
  });

  describe('deleteVideoFeed', () => {
    it('should optimistically remove and refetch on success', async () => {
      const feeds = [createMockFeed({ CallVideoFeedId: '1' }), createMockFeed({ CallVideoFeedId: '2', Name: 'Second' })];

      mockGetCallVideoFeeds.mockResolvedValueOnce({ Data: feeds } as any);
      mockDeleteCallVideoFeed.mockResolvedValue({ Data: [] } as any);
      mockGetCallVideoFeeds.mockResolvedValueOnce({ Data: [feeds[1]] } as any);

      const { result } = renderHook(() => useVideoFeedStore());

      await act(async () => {
        await result.current.fetchVideoFeeds(100);
      });

      expect(result.current.videoFeeds).toHaveLength(2);

      let success = false;
      await act(async () => {
        success = await result.current.deleteVideoFeed('1', 100);
      });

      expect(success).toBe(true);
      expect(mockDeleteCallVideoFeed).toHaveBeenCalledWith('1');
    });

    it('should restore feeds on delete error', async () => {
      const feeds = [createMockFeed({ CallVideoFeedId: '1' })];

      mockGetCallVideoFeeds.mockResolvedValueOnce({ Data: feeds } as any);
      mockDeleteCallVideoFeed.mockRejectedValue(new Error('Delete failed'));

      const { result } = renderHook(() => useVideoFeedStore());

      await act(async () => {
        await result.current.fetchVideoFeeds(100);
      });

      await act(async () => {
        await result.current.deleteVideoFeed('1', 100);
      });

      await waitFor(() => {
        expect(result.current.videoFeeds).toHaveLength(1);
        expect(result.current.error).toBe('Delete failed');
      });
    });
  });

  describe('reset', () => {
    it('should clear all state', async () => {
      mockGetCallVideoFeeds.mockResolvedValue({ Data: [createMockFeed()] } as any);

      const { result } = renderHook(() => useVideoFeedStore());

      await act(async () => {
        await result.current.fetchVideoFeeds(100);
      });

      expect(result.current.videoFeeds).toHaveLength(1);

      act(() => {
        result.current.reset();
      });

      expect(result.current.videoFeeds).toHaveLength(0);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isSaving).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });
});
