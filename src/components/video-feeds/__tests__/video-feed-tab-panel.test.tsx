import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { render } from '@testing-library/react-native';
import React from 'react';

import { useVideoFeedStore } from '@/stores/calls/video-feed-store';
import { VideoFeedTabPanel } from '../video-feed-tab-panel';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('nativewind', () => ({
  useColorScheme: () => ({ colorScheme: 'light' }),
}));

jest.mock('lucide-react-native', () => ({
  CameraIcon: () => 'CameraIcon',
  CircleDotIcon: () => 'CircleDotIcon',
  CopyIcon: () => 'CopyIcon',
  EyeIcon: () => 'EyeIcon',
  PencilIcon: () => 'PencilIcon',
  PlusIcon: () => 'PlusIcon',
  RadioIcon: () => 'RadioIcon',
  TrashIcon: () => 'TrashIcon',
  VideoIcon: () => 'VideoIcon',
  XIcon: () => 'XIcon',
}));

jest.mock('@/stores/calls/video-feed-store');
jest.mock('@/stores/toast/store', () => ({
  useToastStore: () => jest.fn(),
}));

const mockUseVideoFeedStore = useVideoFeedStore as unknown as jest.Mock;

describe('VideoFeedTabPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseVideoFeedStore.mockReturnValue({
      videoFeeds: [],
      isLoading: false,
      isSaving: false,
      fetchVideoFeeds: jest.fn(),
      saveVideoFeed: jest.fn(),
      editVideoFeed: jest.fn(),
      deleteVideoFeed: jest.fn(),
      reset: jest.fn(),
    });
  });

  it('should render empty state when no feeds', () => {
    const { getByText } = render(
      <VideoFeedTabPanel callId={100} canEdit={true} />
    );

    expect(getByText('video_feeds.no_feeds')).toBeTruthy();
  });

  it('should render add button when canEdit is true', () => {
    const { getByTestId } = render(
      <VideoFeedTabPanel callId={100} canEdit={true} />
    );

    expect(getByTestId('add-video-feed-button')).toBeTruthy();
  });

  it('should not render add button when canEdit is false', () => {
    const { queryByTestId } = render(
      <VideoFeedTabPanel callId={100} canEdit={false} />
    );

    expect(queryByTestId('add-video-feed-button')).toBeNull();
  });

  it('should render loading state', () => {
    mockUseVideoFeedStore.mockReturnValue({
      videoFeeds: [],
      isLoading: true,
      isSaving: false,
      fetchVideoFeeds: jest.fn(),
      saveVideoFeed: jest.fn(),
      editVideoFeed: jest.fn(),
      deleteVideoFeed: jest.fn(),
      reset: jest.fn(),
    });

    const { getByText } = render(
      <VideoFeedTabPanel callId={100} canEdit={true} />
    );

    expect(getByText('common.loading')).toBeTruthy();
  });

  it('should call fetchVideoFeeds on mount', () => {
    const fetchVideoFeeds = jest.fn();
    mockUseVideoFeedStore.mockReturnValue({
      videoFeeds: [],
      isLoading: false,
      isSaving: false,
      fetchVideoFeeds,
      saveVideoFeed: jest.fn(),
      editVideoFeed: jest.fn(),
      deleteVideoFeed: jest.fn(),
      reset: jest.fn(),
    });

    render(<VideoFeedTabPanel callId={100} canEdit={true} />);

    expect(fetchVideoFeeds).toHaveBeenCalledWith(100);
  });

  it('should render feed cards when feeds exist', () => {
    const mockFeed = {
      CallVideoFeedId: '1',
      CallId: '100',
      Name: 'Test Feed',
      Url: 'https://example.com/stream.m3u8',
      FeedType: 0,
      FeedFormat: 1,
      Description: 'Test',
      Status: 0,
      Latitude: null,
      Longitude: null,
      AddedByUserId: 'user1',
      AddedOnFormatted: '2026-04-15',
      AddedOnUtc: '2026-04-15T00:00:00Z',
      SortOrder: 0,
      FullName: 'User',
    };

    mockUseVideoFeedStore.mockReturnValue({
      videoFeeds: [mockFeed],
      isLoading: false,
      isSaving: false,
      fetchVideoFeeds: jest.fn(),
      saveVideoFeed: jest.fn(),
      editVideoFeed: jest.fn(),
      deleteVideoFeed: jest.fn(),
      reset: jest.fn(),
    });

    const { getByText } = render(
      <VideoFeedTabPanel callId={100} canEdit={true} />
    );

    expect(getByText('Test Feed')).toBeTruthy();
  });
});
