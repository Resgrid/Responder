import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';

import { VideoFeedCard } from '../video-feed-card';

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
  EyeIcon: () => 'EyeIcon',
  PencilIcon: () => 'PencilIcon',
  RadioIcon: () => 'RadioIcon',
  TrashIcon: () => 'TrashIcon',
  VideoIcon: () => 'VideoIcon',
}));

const mockFeed = {
  CallVideoFeedId: '1',
  CallId: '100',
  Name: 'Drone Camera 1',
  Url: 'https://example.com/stream.m3u8',
  FeedType: 0,
  FeedFormat: 1,
  Description: 'Main drone feed',
  Status: 0,
  Latitude: null,
  Longitude: null,
  AddedByUserId: 'user1',
  AddedOnFormatted: '2026-04-15',
  AddedOnUtc: '2026-04-15T00:00:00Z',
  SortOrder: 0,
  FullName: 'Test User',
};

describe('VideoFeedCard', () => {
  it('should render feed name and description', () => {
    const { getByText } = render(
      <VideoFeedCard feed={mockFeed} onWatch={jest.fn()} onEdit={jest.fn()} onDelete={jest.fn()} canEdit={true} />
    );

    expect(getByText('Drone Camera 1')).toBeTruthy();
    expect(getByText('Main drone feed')).toBeTruthy();
  });

  it('should render added by info', () => {
    const { getByText } = render(
      <VideoFeedCard feed={mockFeed} onWatch={jest.fn()} onEdit={jest.fn()} onDelete={jest.fn()} canEdit={true} />
    );

    expect(getByText('Test User - 2026-04-15')).toBeTruthy();
  });

  it('should show watch button', () => {
    const { getByTestId } = render(
      <VideoFeedCard feed={mockFeed} onWatch={jest.fn()} onEdit={jest.fn()} onDelete={jest.fn()} canEdit={true} />
    );

    expect(getByTestId('watch-button')).toBeTruthy();
  });

  it('should call onWatch when watch button is pressed', () => {
    const onWatch = jest.fn();
    const { getByTestId } = render(
      <VideoFeedCard feed={mockFeed} onWatch={onWatch} onEdit={jest.fn()} onDelete={jest.fn()} canEdit={true} />
    );

    fireEvent.press(getByTestId('watch-button'));
    expect(onWatch).toHaveBeenCalledWith(mockFeed);
  });

  it('should show edit and delete buttons when canEdit is true', () => {
    const { getByTestId } = render(
      <VideoFeedCard feed={mockFeed} onWatch={jest.fn()} onEdit={jest.fn()} onDelete={jest.fn()} canEdit={true} />
    );

    expect(getByTestId('edit-button')).toBeTruthy();
    expect(getByTestId('delete-button')).toBeTruthy();
  });

  it('should hide edit and delete buttons when canEdit is false', () => {
    const { queryByTestId } = render(
      <VideoFeedCard feed={mockFeed} onWatch={jest.fn()} onEdit={jest.fn()} onDelete={jest.fn()} canEdit={false} />
    );

    expect(queryByTestId('edit-button')).toBeNull();
    expect(queryByTestId('delete-button')).toBeNull();
  });

  it('should call onEdit when edit button is pressed', () => {
    const onEdit = jest.fn();
    const { getByTestId } = render(
      <VideoFeedCard feed={mockFeed} onWatch={jest.fn()} onEdit={onEdit} onDelete={jest.fn()} canEdit={true} />
    );

    fireEvent.press(getByTestId('edit-button'));
    expect(onEdit).toHaveBeenCalledWith(mockFeed);
  });
});
