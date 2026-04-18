import { PlusIcon } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList } from 'react-native';

import { type EditCallVideoFeedInput, type SaveCallVideoFeedInput } from '@/api/calls/call-video-feeds';
import { Box } from '@/components/ui/box';
import { Button, ButtonIcon, ButtonText } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { VideoFeedBottomSheet } from '@/components/video-feeds/video-feed-bottom-sheet';
import { VideoFeedCard } from '@/components/video-feeds/video-feed-card';
import { VideoFeedPlayer } from '@/components/video-feeds/video-feed-player';
import { type CallVideoFeedResultData } from '@/models/v4/videoFeeds/callVideoFeedResultData';
import { useVideoFeedStore } from '@/stores/calls/video-feed-store';
import { useToastStore } from '@/stores/toast/store';

interface VideoFeedTabPanelProps {
  callId: number;
  canEdit: boolean;
}

const keyExtractor = (item: CallVideoFeedResultData) => item.CallVideoFeedId;

export const VideoFeedTabPanel: React.FC<VideoFeedTabPanelProps> = ({ callId, canEdit }) => {
  const { t } = useTranslation();
  const showToast = useToastStore((state) => state.showToast);
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
  const [editingFeed, setEditingFeed] = useState<CallVideoFeedResultData | undefined>(undefined);
  const [watchingFeed, setWatchingFeed] = useState<CallVideoFeedResultData | null>(null);

  const { videoFeeds, isLoading, isSaving, fetchVideoFeeds, saveVideoFeed, editVideoFeed, deleteVideoFeed, reset } = useVideoFeedStore();

  useEffect(() => {
    fetchVideoFeeds(callId);
    return () => {
      reset();
    };
  }, [callId, fetchVideoFeeds, reset]);

  const handleAddFeed = useCallback(() => {
    setEditingFeed(undefined);
    setIsBottomSheetOpen(true);
  }, []);

  const handleWatch = useCallback((feed: CallVideoFeedResultData) => {
    setWatchingFeed(feed);
  }, []);

  const handleClosePlayer = useCallback(() => {
    setWatchingFeed(null);
  }, []);

  const handleEdit = useCallback((feed: CallVideoFeedResultData) => {
    setEditingFeed(feed);
    setIsBottomSheetOpen(true);
  }, []);

  const handleDelete = useCallback(
    async (feed: CallVideoFeedResultData) => {
      const success = await deleteVideoFeed(feed.CallVideoFeedId, callId);
      if (success) {
        showToast('success', t('video_feeds.delete_success'));
      } else {
        showToast('error', t('video_feeds.save_error'));
      }
    },
    [deleteVideoFeed, callId, showToast, t]
  );

  const handleSubmit = useCallback(
    async (input: SaveCallVideoFeedInput | EditCallVideoFeedInput) => {
      const isEdit = 'CallVideoFeedId' in input;
      const success = isEdit ? await editVideoFeed(input as EditCallVideoFeedInput) : await saveVideoFeed(input as SaveCallVideoFeedInput);
      if (success) {
        showToast('success', t('video_feeds.save_success'));
      } else {
        showToast('error', t('video_feeds.save_error'));
      }
    },
    [editVideoFeed, saveVideoFeed, showToast, t]
  );

  const handleCloseBottomSheet = useCallback(() => {
    setIsBottomSheetOpen(false);
    setEditingFeed(undefined);
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: CallVideoFeedResultData }) => <VideoFeedCard feed={item} onWatch={handleWatch} onEdit={handleEdit} onDelete={handleDelete} canEdit={canEdit} />,
    [handleWatch, handleEdit, handleDelete, canEdit]
  );

  return (
    <VStack space="md" className="p-4">
      {canEdit ? (
        <Button size="lg" onPress={handleAddFeed} testID="add-video-feed-button">
          <ButtonIcon as={PlusIcon} />
          <ButtonText>{t('video_feeds.add_feed')}</ButtonText>
        </Button>
      ) : null}

      {isLoading ? (
        <Box className="items-center py-4">
          <Text className="text-sm text-gray-500">{t('common.loading')}</Text>
        </Box>
      ) : videoFeeds.length > 0 ? (
        <FlatList data={videoFeeds} renderItem={renderItem} keyExtractor={keyExtractor} scrollEnabled={false} removeClippedSubviews maxToRenderPerBatch={10} windowSize={5} />
      ) : (
        <Box className="items-center py-4">
          <Text className="text-sm text-gray-500">{t('video_feeds.no_feeds')}</Text>
        </Box>
      )}

      <VideoFeedPlayer feed={watchingFeed} visible={watchingFeed !== null} onClose={handleClosePlayer} />

      <VideoFeedBottomSheet isOpen={isBottomSheetOpen} onClose={handleCloseBottomSheet} callId={callId} existingFeed={editingFeed} onSubmit={handleSubmit} isLoading={isSaving} />
    </VStack>
  );
};
