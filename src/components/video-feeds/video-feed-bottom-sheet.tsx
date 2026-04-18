import { useColorScheme } from 'nativewind';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { type EditCallVideoFeedInput, type SaveCallVideoFeedInput } from '@/api/calls/call-video-feeds';
import { CustomBottomSheet } from '@/components/ui/bottom-sheet';
import { Box } from '@/components/ui/box';
import { Button, ButtonText } from '@/components/ui/button';
import { Heading } from '@/components/ui/heading';
import { HStack } from '@/components/ui/hstack';
import { Input, InputField } from '@/components/ui/input';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { CallVideoFeedFormat, CallVideoFeedStatus, CallVideoFeedType } from '@/models/v4/videoFeeds/callVideoFeedEnums';
import { type CallVideoFeedResultData } from '@/models/v4/videoFeeds/callVideoFeedResultData';

interface VideoFeedBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  callId: number;
  existingFeed?: CallVideoFeedResultData;
  onSubmit: (input: SaveCallVideoFeedInput | EditCallVideoFeedInput) => Promise<void>;
  isLoading: boolean;
}

interface SelectOption {
  value: number;
  labelKey: string;
}

const FEED_TYPE_OPTIONS: SelectOption[] = [
  { value: CallVideoFeedType.Drone, labelKey: 'video_feeds.type_drone' },
  { value: CallVideoFeedType.FixedCamera, labelKey: 'video_feeds.type_fixed_camera' },
  { value: CallVideoFeedType.BodyCam, labelKey: 'video_feeds.type_body_cam' },
  { value: CallVideoFeedType.TrafficCam, labelKey: 'video_feeds.type_traffic_cam' },
  { value: CallVideoFeedType.WeatherCam, labelKey: 'video_feeds.type_weather_cam' },
  { value: CallVideoFeedType.SatelliteFeed, labelKey: 'video_feeds.type_satellite' },
  { value: CallVideoFeedType.WebCam, labelKey: 'video_feeds.type_webcam' },
  { value: CallVideoFeedType.Other, labelKey: 'video_feeds.type_other' },
];

const FEED_FORMAT_OPTIONS: SelectOption[] = [
  { value: CallVideoFeedFormat.RTSP, labelKey: 'video_feeds.format_rtsp' },
  { value: CallVideoFeedFormat.HLS, labelKey: 'video_feeds.format_hls' },
  { value: CallVideoFeedFormat.MJPEG, labelKey: 'video_feeds.format_mjpeg' },
  { value: CallVideoFeedFormat.YouTubeLive, labelKey: 'video_feeds.format_youtube' },
  { value: CallVideoFeedFormat.WebRTC, labelKey: 'video_feeds.format_webrtc' },
  { value: CallVideoFeedFormat.DASH, labelKey: 'video_feeds.format_dash' },
  { value: CallVideoFeedFormat.Embed, labelKey: 'video_feeds.format_embed' },
  { value: CallVideoFeedFormat.Other, labelKey: 'video_feeds.format_other' },
];

const STATUS_OPTIONS: SelectOption[] = [
  { value: CallVideoFeedStatus.Active, labelKey: 'video_feeds.status_active' },
  { value: CallVideoFeedStatus.Inactive, labelKey: 'video_feeds.status_inactive' },
  { value: CallVideoFeedStatus.Error, labelKey: 'video_feeds.status_error' },
];

const detectFormat = (url: string): number | null => {
  const lower = url.toLowerCase();
  if (lower.includes('.m3u8')) return CallVideoFeedFormat.HLS;
  if (lower.startsWith('rtsp://')) return CallVideoFeedFormat.RTSP;
  if (lower.includes('youtube.com') || lower.includes('youtu.be')) return CallVideoFeedFormat.YouTubeLive;
  if (lower.includes('.mpd')) return CallVideoFeedFormat.DASH;
  if (lower.includes('mjpeg') || lower.includes('mjpg')) return CallVideoFeedFormat.MJPEG;
  return null;
};

export const VideoFeedBottomSheet: React.FC<VideoFeedBottomSheetProps> = ({ isOpen, onClose, callId, existingFeed, onSubmit, isLoading }) => {
  const { t } = useTranslation();
  const { colorScheme } = useColorScheme();
  const isEditing = !!existingFeed;

  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [feedType, setFeedType] = useState<number>(CallVideoFeedType.Other);
  const [feedFormat, setFeedFormat] = useState<number>(CallVideoFeedFormat.Other);
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<number>(CallVideoFeedStatus.Active);
  const [sortOrder, setSortOrder] = useState('0');

  useEffect(() => {
    if (isOpen) {
      if (existingFeed) {
        setName(existingFeed.Name);
        setUrl(existingFeed.Url);
        setFeedType(existingFeed.FeedType ?? CallVideoFeedType.Other);
        setFeedFormat(existingFeed.FeedFormat ?? CallVideoFeedFormat.Other);
        setDescription(existingFeed.Description);
        setStatus(existingFeed.Status);
        setSortOrder(existingFeed.SortOrder.toString());
      } else {
        setName('');
        setUrl('');
        setFeedType(CallVideoFeedType.Other);
        setFeedFormat(CallVideoFeedFormat.Other);
        setDescription('');
        setStatus(CallVideoFeedStatus.Active);
        setSortOrder('0');
      }
    }
  }, [isOpen, existingFeed]);

  const handleUrlChange = useCallback((text: string) => {
    setUrl(text);
    const detected = detectFormat(text);
    if (detected !== null) {
      setFeedFormat(detected);
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!name.trim() || !url.trim()) return;

    if (isEditing && existingFeed) {
      const input: EditCallVideoFeedInput = {
        CallVideoFeedId: existingFeed.CallVideoFeedId,
        CallId: callId,
        Name: name.trim(),
        Url: url.trim(),
        FeedType: feedType,
        FeedFormat: feedFormat,
        Description: description.trim(),
        Status: status,
        SortOrder: parseInt(sortOrder, 10) || 0,
      };
      await onSubmit(input);
    } else {
      const input: SaveCallVideoFeedInput = {
        CallId: callId,
        Name: name.trim(),
        Url: url.trim(),
        FeedType: feedType,
        FeedFormat: feedFormat,
        Description: description.trim(),
        SortOrder: parseInt(sortOrder, 10) || 0,
      };
      await onSubmit(input);
    }
    onClose();
  }, [name, url, feedType, feedFormat, description, status, sortOrder, callId, existingFeed, isEditing, onSubmit, onClose]);

  const activeBg = colorScheme === 'dark' ? 'bg-primary-700' : 'bg-primary-100';
  const inactiveBg = colorScheme === 'dark' ? 'bg-neutral-800' : 'bg-gray-100';
  const isValid = name.trim().length > 0 && url.trim().length > 0;

  const renderOptionSelect = (label: string, options: SelectOption[], selectedValue: number, onSelect: (value: number) => void) => (
    <VStack space="xs">
      <Text className="text-sm text-gray-500">{label}</Text>
      <Box className="flex-row flex-wrap gap-2">
        {options.map((option) => (
          <Pressable key={option.value} onPress={() => onSelect(option.value)} className={`rounded-lg px-3 py-1.5 ${selectedValue === option.value ? activeBg : inactiveBg}`}>
            <Text className={`text-xs ${selectedValue === option.value ? 'font-semibold' : ''}`}>{t(option.labelKey)}</Text>
          </Pressable>
        ))}
      </Box>
    </VStack>
  );

  return (
    <CustomBottomSheet isOpen={isOpen} onClose={onClose} isLoading={isLoading} loadingText={isEditing ? t('video_feeds.edit_feed') : t('video_feeds.add_feed')} testID="video-feed-bottom-sheet">
      <VStack space="md" className="w-full">
        <Heading size="md">{isEditing ? t('video_feeds.edit_feed') : t('video_feeds.add_feed')}</Heading>

        <VStack space="xs">
          <Text className="text-sm text-gray-500">{t('video_feeds.form_name')}</Text>
          <Input variant="outline" size="md">
            <InputField placeholder={t('video_feeds.form_name')} value={name} onChangeText={setName} testID="feed-name-input" />
          </Input>
        </VStack>

        <VStack space="xs">
          <Text className="text-sm text-gray-500">{t('video_feeds.form_url')}</Text>
          <Input variant="outline" size="md">
            <InputField placeholder={t('video_feeds.form_url')} value={url} onChangeText={handleUrlChange} keyboardType="url" autoCapitalize="none" testID="feed-url-input" />
          </Input>
        </VStack>

        {renderOptionSelect(t('video_feeds.form_feed_type'), FEED_TYPE_OPTIONS, feedType, setFeedType)}

        {renderOptionSelect(t('video_feeds.form_feed_format'), FEED_FORMAT_OPTIONS, feedFormat, setFeedFormat)}

        <VStack space="xs">
          <Text className="text-sm text-gray-500">{t('video_feeds.form_description')}</Text>
          <Input variant="outline" size="md">
            <InputField placeholder={t('video_feeds.form_description')} value={description} onChangeText={setDescription} multiline numberOfLines={2} testID="feed-description-input" />
          </Input>
        </VStack>

        {isEditing ? renderOptionSelect(t('video_feeds.form_status'), STATUS_OPTIONS, status, setStatus) : null}

        <VStack space="xs">
          <Text className="text-sm text-gray-500">{t('video_feeds.form_sort_order')}</Text>
          <Input variant="outline" size="md">
            <InputField placeholder="0" value={sortOrder} onChangeText={setSortOrder} keyboardType="numeric" testID="feed-sort-order-input" />
          </Input>
        </VStack>

        <Button size="lg" onPress={handleSubmit} isDisabled={isLoading || !isValid} testID="submit-feed-button">
          <ButtonText>{isEditing ? t('video_feeds.edit_feed') : t('video_feeds.add_feed')}</ButtonText>
        </Button>
      </VStack>
    </CustomBottomSheet>
  );
};
