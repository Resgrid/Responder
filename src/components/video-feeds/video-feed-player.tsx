import { ResizeMode, Video } from 'expo-av';
import { CopyIcon, XIcon } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import React, { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, Modal, Share, StyleSheet } from 'react-native';
import WebView from 'react-native-webview';

import { Box } from '@/components/ui/box';
import { Button, ButtonIcon, ButtonText } from '@/components/ui/button';
import { Heading } from '@/components/ui/heading';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { CallVideoFeedFormat } from '@/models/v4/videoFeeds/callVideoFeedEnums';
import { type CallVideoFeedResultData } from '@/models/v4/videoFeeds/callVideoFeedResultData';
interface VideoFeedPlayerProps {
  feed: CallVideoFeedResultData | null;
  visible: boolean;
  onClose: () => void;
}

const getYouTubeEmbedUrl = (url: string): string => {
  const videoIdMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|live\/)|youtu\.be\/)([a-zA-Z0-9_-]+)/);
  const videoId = videoIdMatch ? videoIdMatch[1] : '';
  return `https://www.youtube.com/embed/${videoId}?autoplay=1`;
};

export const VideoFeedPlayer: React.FC<VideoFeedPlayerProps> = ({ feed, visible, onClose }) => {
  const { t } = useTranslation();
  const { colorScheme } = useColorScheme();
  const videoRef = useRef<Video>(null);
  const [hasError, setHasError] = useState(false);
  const [mjpegKey, setMjpegKey] = useState(0);

  const handleCopyUrl = useCallback(async () => {
    if (feed) {
      await Share.share({ message: feed.Url });
    }
  }, [feed]);

  const handleError = useCallback(() => {
    setHasError(true);
  }, []);

  const handleClose = useCallback(() => {
    setHasError(false);
    setMjpegKey(0);
    onClose();
  }, [onClose]);

  if (!feed) {
    return null;
  }

  const bgColor = colorScheme === 'dark' ? '#171717' : '#ffffff';
  const format = feed.FeedFormat;

  const renderCopyFallback = (message: string) => (
    <VStack className="items-center justify-center p-6" space="md">
      <Text className="text-center text-gray-500">{message}</Text>
      <Button onPress={handleCopyUrl}>
        <ButtonIcon as={CopyIcon} />
        <ButtonText>{t('video_feeds.copy_url')}</ButtonText>
      </Button>
    </VStack>
  );

  const renderPlayer = () => {
    if (hasError) {
      return renderCopyFallback(t('video_feeds.unsupported_format'));
    }

    switch (format) {
      case CallVideoFeedFormat.HLS:
      case CallVideoFeedFormat.DASH:
        return <Video ref={videoRef} source={{ uri: feed.Url }} style={styles.video} useNativeControls resizeMode={ResizeMode.CONTAIN} shouldPlay onError={handleError} />;

      case CallVideoFeedFormat.MJPEG:
        return <Image key={mjpegKey} source={{ uri: `${feed.Url}${feed.Url.includes('?') ? '&' : '?'}t=${Date.now()}` }} style={styles.video} resizeMode="contain" onError={handleError} />;

      case CallVideoFeedFormat.YouTubeLive:
        return <WebView source={{ uri: getYouTubeEmbedUrl(feed.Url) }} style={styles.video} allowsInlineMediaPlayback mediaPlaybackRequiresUserAction={false} onError={handleError} />;

      case CallVideoFeedFormat.Embed:
        return <WebView source={{ uri: feed.Url }} style={styles.video} allowsInlineMediaPlayback mediaPlaybackRequiresUserAction={false} onError={handleError} />;

      case CallVideoFeedFormat.RTSP:
        return renderCopyFallback(t('video_feeds.unsupported_format'));

      case CallVideoFeedFormat.WebRTC:
        return renderCopyFallback(t('video_feeds.unsupported_format'));

      default:
        return <WebView source={{ uri: feed.Url }} style={styles.video} allowsInlineMediaPlayback onError={handleError} />;
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <Box className="flex-1" style={{ backgroundColor: bgColor }}>
        <Box className="flex-row items-center justify-between p-4">
          <Heading size="sm" className="flex-1" numberOfLines={1}>
            {feed.Name}
          </Heading>
          <Pressable onPress={handleClose} className="p-2" testID="close-player-button">
            <XIcon size={24} color={colorScheme === 'dark' ? '#d1d5db' : '#374151'} />
          </Pressable>
        </Box>
        <Box className="flex-1 items-center justify-center px-4">
          <Box style={styles.playerContainer}>{renderPlayer()}</Box>
        </Box>
        <Box className="items-center pb-8 pt-4">
          <Button variant="outline" onPress={handleCopyUrl}>
            <ButtonIcon as={CopyIcon} />
            <ButtonText>{t('video_feeds.copy_url')}</ButtonText>
          </Button>
        </Box>
      </Box>
    </Modal>
  );
};

const styles = StyleSheet.create({
  playerContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  video: {
    width: '100%',
    height: '100%',
  },
});
