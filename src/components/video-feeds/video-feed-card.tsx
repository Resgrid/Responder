import { CameraIcon, CircleDotIcon, EyeIcon, PencilIcon, RadioIcon, TrashIcon, VideoIcon } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';

import { Box } from '@/components/ui/box';
import { Button, ButtonIcon, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { CallVideoFeedFormat, CallVideoFeedStatus, CallVideoFeedType } from '@/models/v4/videoFeeds/callVideoFeedEnums';
import { type CallVideoFeedResultData } from '@/models/v4/videoFeeds/callVideoFeedResultData';

interface VideoFeedCardProps {
  feed: CallVideoFeedResultData;
  onWatch: (feed: CallVideoFeedResultData) => void;
  onEdit: (feed: CallVideoFeedResultData) => void;
  onDelete: (feed: CallVideoFeedResultData) => void;
  canEdit: boolean;
}

const getFeedTypeIcon = (feedType: number | null) => {
  switch (feedType) {
    case CallVideoFeedType.Drone:
      return RadioIcon;
    case CallVideoFeedType.FixedCamera:
    case CallVideoFeedType.TrafficCam:
    case CallVideoFeedType.WeatherCam:
      return CameraIcon;
    case CallVideoFeedType.BodyCam:
    case CallVideoFeedType.WebCam:
      return CircleDotIcon;
    default:
      return VideoIcon;
  }
};

const getFormatLabel = (format: number | null, t: (key: string) => string): string => {
  switch (format) {
    case CallVideoFeedFormat.RTSP:
      return t('video_feeds.format_rtsp');
    case CallVideoFeedFormat.HLS:
      return t('video_feeds.format_hls');
    case CallVideoFeedFormat.MJPEG:
      return t('video_feeds.format_mjpeg');
    case CallVideoFeedFormat.YouTubeLive:
      return t('video_feeds.format_youtube');
    case CallVideoFeedFormat.WebRTC:
      return t('video_feeds.format_webrtc');
    case CallVideoFeedFormat.DASH:
      return t('video_feeds.format_dash');
    case CallVideoFeedFormat.Embed:
      return t('video_feeds.format_embed');
    default:
      return t('video_feeds.format_other');
  }
};

const getStatusColor = (status: number): string => {
  switch (status) {
    case CallVideoFeedStatus.Active:
      return '#22c55e';
    case CallVideoFeedStatus.Inactive:
      return '#9ca3af';
    case CallVideoFeedStatus.Error:
      return '#ef4444';
    default:
      return '#9ca3af';
  }
};

const VideoFeedCardComponent: React.FC<VideoFeedCardProps> = ({ feed, onWatch, onEdit, onDelete, canEdit }) => {
  const { t } = useTranslation();
  const { colorScheme } = useColorScheme();
  const IconComponent = getFeedTypeIcon(feed.FeedType);

  const handleWatch = useCallback(() => {
    onWatch(feed);
  }, [feed, onWatch]);

  const handleEdit = useCallback(() => {
    onEdit(feed);
  }, [feed, onEdit]);

  const handleDelete = useCallback(() => {
    Alert.alert(t('video_feeds.delete_feed'), t('video_feeds.delete_confirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: () => onDelete(feed) },
    ]);
  }, [feed, onDelete, t]);

  return (
    <Box className={`mb-3 rounded-lg p-3 ${colorScheme === 'dark' ? 'bg-neutral-800' : 'bg-white'}`} testID="video-feed-card">
      <HStack className="items-start" space="md">
        <Box className="mt-1">
          <IconComponent size={24} color={colorScheme === 'dark' ? '#d1d5db' : '#374151'} />
        </Box>
        <VStack className="flex-1" space="xs">
          <HStack className="items-center" space="sm">
            <Text className="flex-1 font-bold">{feed.Name}</Text>
            <Box className={`rounded-full px-2 py-0.5 ${colorScheme === 'dark' ? 'bg-neutral-700' : 'bg-gray-100'}`}>
              <Text className="text-xs">{getFormatLabel(feed.FeedFormat, t)}</Text>
            </Box>
            <Box className="size-2.5 rounded-full" style={{ backgroundColor: getStatusColor(feed.Status) }} />
          </HStack>
          {feed.Description ? <Text className="text-sm text-gray-500">{feed.Description}</Text> : null}
          <Text className="text-xs text-gray-400">
            {feed.FullName} - {feed.AddedOnFormatted}
          </Text>
          <HStack className="mt-1" space="sm">
            <Button size="xs" variant="outline" onPress={handleWatch} testID="watch-button">
              <ButtonIcon as={EyeIcon} size="xs" />
              <ButtonText>{t('video_feeds.watch')}</ButtonText>
            </Button>
            {canEdit ? (
              <>
                <Button size="xs" variant="outline" onPress={handleEdit} testID="edit-button">
                  <ButtonIcon as={PencilIcon} size="xs" />
                  <ButtonText>{t('common.edit')}</ButtonText>
                </Button>
                <Button size="xs" variant="outline" action="negative" onPress={handleDelete} testID="delete-button">
                  <ButtonIcon as={TrashIcon} size="xs" />
                  <ButtonText>{t('common.delete')}</ButtonText>
                </Button>
              </>
            ) : null}
          </HStack>
        </VStack>
      </HStack>
    </Box>
  );
};

export const VideoFeedCard = React.memo(VideoFeedCardComponent);
