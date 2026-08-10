import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { AlertTriangle, Check, ImagePlus, MapPin, Plus, Send, Smile, Sparkles } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { type NativeSyntheticEvent, type TextInputContentSizeChangeEventData } from 'react-native';
import { useKeyboardState } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Actionsheet, ActionsheetBackdrop, ActionsheetContent, ActionsheetDragIndicator, ActionsheetDragIndicatorWrapper, ActionsheetItem, ActionsheetItemText } from '@/components/ui/actionsheet';
import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { Textarea, TextareaInput } from '@/components/ui/textarea';
import { logger } from '@/lib/logging';
import { useToastStore } from '@/stores/toast/store';

const QUICK_EMOJIS = ['👍', '❤️', '😂', '🎉', '🙏', '🔥', '😮', '😢', '👏', '✅', '🚒', '🚑', '👀', '💯', '🆗', '⚠️'];
const TYPING_IDLE_MS = 3000;
// The composer keeps a single-line footprint at rest and grows with the draft up
// to a few lines; the gluestack Textarea otherwise renders a fixed 100px block.
const MIN_INPUT_HEIGHT = 40;
const MAX_INPUT_HEIGHT = 120;
const INPUT_VERTICAL_PADDING = 16;

interface MessageComposerProps {
  onSendText: (body: string, urgent: boolean) => void;
  onSendImage: (uri: string, urgent: boolean, mimeType?: string) => void;
  onSendLocation: (latitude: number, longitude: number, urgent: boolean) => void;
  onOpenGif: () => void;
  onTyping: (isTyping: boolean) => void;
  disabled?: boolean;
  placeholder?: string;
  /** Urgent priority is channel-level only; thread replies pass false to hide the toggle. */
  allowUrgent?: boolean;
}

export function MessageComposer({ onSendText, onSendImage, onSendLocation, onOpenGif, onTyping, disabled, placeholder, allowUrgent = true }: MessageComposerProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  // The keyboard covers the home indicator, so its inset would only add dead space.
  const isKeyboardVisible = useKeyboardState((state) => state.isVisible);
  const [text, setText] = useState('');
  const [urgent, setUrgent] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);
  const [inputHeight, setInputHeight] = useState(MIN_INPUT_HEIGHT);
  const typingActive = useRef(false);
  const typingIdleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopTyping = useCallback(() => {
    if (typingIdleTimer.current) {
      clearTimeout(typingIdleTimer.current);
      typingIdleTimer.current = null;
    }
    if (typingActive.current) {
      typingActive.current = false;
      onTyping(false);
    }
  }, [onTyping]);

  const handleChange = useCallback(
    (value: string) => {
      setText(value);
      if (value.length > 0) {
        if (!typingActive.current) {
          typingActive.current = true;
          onTyping(true);
        }
        if (typingIdleTimer.current) clearTimeout(typingIdleTimer.current);
        typingIdleTimer.current = setTimeout(stopTyping, TYPING_IDLE_MS);
      } else {
        stopTyping();
      }
    },
    [onTyping, stopTyping]
  );

  const handleContentSizeChange = useCallback((event: NativeSyntheticEvent<TextInputContentSizeChangeEventData>) => {
    const measured = event.nativeEvent.contentSize.height + INPUT_VERTICAL_PADDING;
    setInputHeight(Math.min(Math.max(measured, MIN_INPUT_HEIGHT), MAX_INPUT_HEIGHT));
  }, []);

  useEffect(() => {
    return () => {
      if (typingIdleTimer.current) clearTimeout(typingIdleTimer.current);
    };
  }, []);

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSendText(trimmed, urgent);
    setText('');
    setUrgent(false);
    setInputHeight(MIN_INPUT_HEIGHT);
    stopTyping();
  }, [text, urgent, onSendText, stopTyping]);

  const handlePickImage = useCallback(async () => {
    setAttachOpen(false);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        useToastStore.getState().showToast('error', t('chat.permission_photos_denied'));
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
      if (!result.canceled && result.assets[0]?.uri) {
        onSendImage(result.assets[0].uri, urgent, result.assets[0].mimeType ?? undefined);
        setUrgent(false);
      }
    } catch (error) {
      logger.error({ message: 'chat: image pick failed', context: { error } });
    }
  }, [onSendImage, urgent, t]);

  const handleShareLocation = useCallback(async () => {
    setAttachOpen(false);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        useToastStore.getState().showToast('error', t('chat.permission_location_denied'));
        return;
      }
      const position = await Location.getCurrentPositionAsync({});
      onSendLocation(position.coords.latitude, position.coords.longitude, urgent);
      setUrgent(false);
    } catch (error) {
      logger.error({ message: 'chat: location share failed', context: { error } });
    }
  }, [onSendLocation, urgent, t]);

  const handleOpenGif = useCallback(() => {
    setAttachOpen(false);
    onOpenGif();
  }, [onOpenGif]);

  const handleOpenEmoji = useCallback(() => {
    setAttachOpen(false);
    setEmojiOpen(true);
  }, []);

  const handleToggleUrgent = useCallback(() => {
    setAttachOpen(false);
    setUrgent((prev) => !prev);
  }, []);

  const canSend = text.trim().length > 0 && !disabled;

  return (
    <Box className="border-t border-outline-200 bg-background-0 px-2 pt-1" style={{ paddingBottom: isKeyboardVisible ? 8 : Math.max(insets.bottom, 8) }}>
      <HStack className="items-end" space="xs">
        <Pressable className="p-2" onPress={() => setAttachOpen(true)} disabled={disabled} accessibilityRole="button" accessibilityLabel={t('chat.attach')}>
          <Plus size={22} color={disabled ? '#d1d5db' : '#6b7280'} />
        </Pressable>

        <Box className="flex-1">
          <Textarea size="md" className="h-auto max-h-[120px] min-h-[40px] rounded-2xl border-0 bg-background-100" style={{ height: inputHeight }}>
            <TextareaInput
              placeholder={placeholder ?? t('chat.type_a_message')}
              value={text}
              onChangeText={handleChange}
              onContentSizeChange={handleContentSizeChange}
              onBlur={stopTyping}
              multiline
              editable={!disabled}
            />
          </Textarea>
        </Box>

        <Pressable className={`rounded-full p-2 ${canSend ? 'bg-primary-600' : 'bg-background-300'}`} onPress={handleSend} disabled={!canSend} accessibilityRole="button" accessibilityLabel={t('chat.send')}>
          <Send size={20} color="#ffffff" />
        </Pressable>
      </HStack>

      {allowUrgent && urgent ? (
        <HStack className="mt-1 items-center px-2" space="xs">
          <AlertTriangle size={12} color="#dc2626" />
          <Text className="text-xs text-error-600">{t('chat.urgent_will_send')}</Text>
        </HStack>
      ) : null}

      {/* Attachment menu keeps the composer row to input + send so the draft has room. */}
      <Actionsheet isOpen={attachOpen} onClose={() => setAttachOpen(false)}>
        <ActionsheetBackdrop />
        <ActionsheetContent>
          <ActionsheetDragIndicatorWrapper>
            <ActionsheetDragIndicator />
          </ActionsheetDragIndicatorWrapper>
          <ActionsheetItem onPress={handleOpenEmoji}>
            <Smile size={18} color="#6b7280" />
            <ActionsheetItemText>{t('chat.emoji')}</ActionsheetItemText>
          </ActionsheetItem>
          <ActionsheetItem onPress={handlePickImage}>
            <ImagePlus size={18} color="#6b7280" />
            <ActionsheetItemText>{t('chat.add_image')}</ActionsheetItemText>
          </ActionsheetItem>
          <ActionsheetItem onPress={handleOpenGif}>
            <Sparkles size={18} color="#6b7280" />
            <ActionsheetItemText>{t('chat.add_gif')}</ActionsheetItemText>
          </ActionsheetItem>
          <ActionsheetItem onPress={handleShareLocation}>
            <MapPin size={18} color="#6b7280" />
            <ActionsheetItemText>{t('chat.share_location')}</ActionsheetItemText>
          </ActionsheetItem>
          {allowUrgent ? (
            <ActionsheetItem onPress={handleToggleUrgent}>
              <AlertTriangle size={18} color={urgent ? '#dc2626' : '#6b7280'} />
              <ActionsheetItemText>{t('chat.urgent')}</ActionsheetItemText>
              {urgent ? <Check size={18} color="#dc2626" /> : null}
            </ActionsheetItem>
          ) : null}
        </ActionsheetContent>
      </Actionsheet>

      <Actionsheet isOpen={emojiOpen} onClose={() => setEmojiOpen(false)}>
        <ActionsheetBackdrop />
        <ActionsheetContent>
          <ActionsheetDragIndicatorWrapper>
            <ActionsheetDragIndicator />
          </ActionsheetDragIndicatorWrapper>
          <HStack className="flex-wrap justify-center p-2" space="md">
            {QUICK_EMOJIS.map((emoji) => (
              <Pressable
                key={emoji}
                className="p-2"
                onPress={() => {
                  setText((prev) => prev + emoji);
                  setEmojiOpen(false);
                }}
              >
                <Text className="text-2xl">{emoji}</Text>
              </Pressable>
            ))}
          </HStack>
        </ActionsheetContent>
      </Actionsheet>
    </Box>
  );
}
