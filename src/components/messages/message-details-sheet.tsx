import { Check, Clock, Mail, MailOpen, Reply, Trash2, User, X } from 'lucide-react-native';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, ScrollView, useWindowDimensions } from 'react-native';

import { formatDateForDisplay, parseDateISOString } from '@/lib/utils';
import { useMessagesStore } from '@/stores/messages/store';

import { Actionsheet, ActionsheetBackdrop, ActionsheetContent, ActionsheetDragIndicator, ActionsheetDragIndicatorWrapper } from '../ui/actionsheet';
import { Avatar, AvatarFallbackText } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { Box } from '../ui/box';
import { Button, ButtonText } from '../ui/button';
import { Divider } from '../ui/divider';
import { HStack } from '../ui/hstack';
import { Input, InputField } from '../ui/input';
import { Pressable } from '../ui/pressable';
import { Text } from '../ui/text';
import { Textarea, TextareaInput } from '../ui/textarea';
import { VStack } from '../ui/vstack';

export const MessageDetailsSheet: React.FC = () => {
  const { t } = useTranslation();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  const [isResponding, setIsResponding] = useState(false);
  const [responseText, setResponseText] = useState('');
  const [responseNote, setResponseNote] = useState('');

  const { selectedMessage, isDetailsOpen, isLoading, closeDetails, deleteMessages, respondToMessage } = useMessagesStore();

  if (!selectedMessage) return null;

  const formatMessageDate = (dateString: string) => {
    if (!dateString) return t('messages.date_unknown');
    try {
      const date = parseDateISOString(dateString);
      return formatDateForDisplay(date);
    } catch {
      return dateString;
    }
  };

  const getMessageTypeLabel = (type: number) => {
    switch (type) {
      case 0:
        return t('messages.types.message');
      case 1:
        return t('messages.types.poll');
      case 2:
        return t('messages.types.alert');
      default:
        return t('messages.types.message');
    }
  };

  const getMessageTypeBadgeColor = (type: number) => {
    switch (type) {
      case 0:
        return 'bg-blue-500';
      case 1:
        return 'bg-green-500';
      case 2:
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const handleDelete = () => {
    Alert.alert(t('messages.delete_confirmation_title'), t('messages.delete_single_confirmation_message'), [
      {
        text: t('common.cancel'),
        style: 'cancel',
      },
      {
        text: t('common.confirm'),
        style: 'destructive',
        onPress: async () => {
          await deleteMessages([selectedMessage.MessageId]);
          closeDetails();
        },
      },
    ]);
  };

  const handleRespond = async () => {
    if (!responseText.trim()) {
      Alert.alert(t('messages.error'), t('messages.response_required'));
      return;
    }

    try {
      await respondToMessage({
        messageId: selectedMessage.MessageId,
        response: responseText.trim(),
        note: responseNote.trim(),
      });
      setIsResponding(false);
      setResponseText('');
      setResponseNote('');
    } catch (error) {
      Alert.alert(t('messages.error'), t('messages.respond_failed'));
    }
  };

  const isExpired = selectedMessage.ExpiredOn && new Date(selectedMessage.ExpiredOn) < new Date();
  const canRespond = !selectedMessage.Responded && !isExpired && selectedMessage.Type !== 0; // Can respond to polls and alerts

  return (
    <Actionsheet isOpen={isDetailsOpen} onClose={closeDetails} snapPoints={[85]}>
      <ActionsheetBackdrop />
      <ActionsheetContent className="w-full rounded-t-xl bg-white dark:bg-gray-800">
        <ActionsheetDragIndicatorWrapper>
          <ActionsheetDragIndicator />
        </ActionsheetDragIndicatorWrapper>

        {/* Header */}
        <VStack space="sm" className="border-b border-gray-200 p-4 dark:border-gray-700">
          <HStack space="sm" className="items-center justify-between">
            <HStack space="sm" className="flex-1 items-center">
              <Box className="rounded-full bg-primary-100 p-2 dark:bg-primary-900">{selectedMessage.Responded ? <MailOpen size={20} color="#6366F1" /> : <Mail size={20} color="#6366F1" />}</Box>

              <VStack className="flex-1">
                <Text className="text-lg font-bold">{selectedMessage.Subject || t('messages.no_subject')}</Text>
                <HStack space="xs" className="items-center">
                  <Text className="text-sm text-gray-600 dark:text-gray-300">
                    {t('messages.from')}: {selectedMessage.SendingName || t('common.unknown_user')}
                  </Text>
                </HStack>
              </VStack>
            </HStack>

            <HStack space="sm">
              {canRespond && !isResponding && (
                <Pressable className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900" onPress={() => setIsResponding(true)}>
                  <Reply size={20} color="#3B82F6" />
                </Pressable>
              )}

              <Pressable className="rounded-lg bg-red-100 p-2 dark:bg-red-900" onPress={handleDelete}>
                <Trash2 size={20} color="#EF4444" />
              </Pressable>

              <Pressable className="rounded-lg bg-gray-100 p-2 dark:bg-gray-700" onPress={closeDetails}>
                <X size={20} color="currentColor" />
              </Pressable>
            </HStack>
          </HStack>

          {/* Message Metadata */}
          <HStack space="sm" className="items-center justify-between">
            <HStack space="sm" className="items-center">
              <Badge variant="solid" className={getMessageTypeBadgeColor(selectedMessage.Type)}>
                <Text className="text-xs text-white">{getMessageTypeLabel(selectedMessage.Type)}</Text>
              </Badge>

              {selectedMessage.Responded && (
                <Badge variant="outline" className="border-green-500">
                  <Text className="text-xs text-green-600">{t('messages.responded')}</Text>
                </Badge>
              )}

              {isExpired && (
                <Badge variant="outline" className="border-red-500">
                  <Text className="text-xs text-red-600">{t('messages.expired')}</Text>
                </Badge>
              )}
            </HStack>

            <HStack space="xs" className="items-center">
              <Clock size={12} color="#6B7280" />
              <Text className="text-xs text-gray-500">{formatMessageDate(selectedMessage.SentOnUtc || selectedMessage.SentOn)}</Text>
            </HStack>
          </HStack>
        </VStack>

        <ScrollView className="flex-1">
          <VStack space="md" className="p-4">
            {/* Message Body */}
            <VStack space="sm">
              <Text className="font-semibold">{t('messages.message_content')}</Text>
              <Box className="rounded-lg bg-gray-50 p-3 dark:bg-gray-700">
                <Text className="text-gray-800 dark:text-gray-200">{selectedMessage.Body || t('messages.no_content')}</Text>
              </Box>
            </VStack>

            {/* Expiration Date */}
            {selectedMessage.ExpiredOn && (
              <VStack space="sm">
                <Text className="font-semibold">{t('messages.expires_on')}</Text>
                <Text className="text-gray-600 dark:text-gray-300">{formatMessageDate(selectedMessage.ExpiredOn)}</Text>
              </VStack>
            )}

            {/* Recipients */}
            {selectedMessage.Recipients && selectedMessage.Recipients.length > 0 && (
              <VStack space="sm">
                <Text className="font-semibold">
                  {t('messages.recipients')} ({selectedMessage.Recipients.length})
                </Text>
                <VStack space="xs">
                  {selectedMessage.Recipients.map((recipient, index) => (
                    <HStack key={index} space="sm" className="items-center rounded-lg bg-gray-50 p-2 dark:bg-gray-700">
                      <Avatar size="sm">
                        <AvatarFallbackText>{recipient.Name?.charAt(0) || 'U'}</AvatarFallbackText>
                      </Avatar>

                      <VStack className="flex-1">
                        <Text className="font-medium">{recipient.Name || t('common.unknown_user')}</Text>
                        {recipient.RespondedOn && (
                          <HStack space="xs" className="items-center">
                            <Check size={12} color="#10B981" />
                            <Text className="text-xs text-green-600">
                              {t('messages.responded_on')}: {formatMessageDate(recipient.RespondedOn)}
                            </Text>
                          </HStack>
                        )}
                        {recipient.Response && (
                          <Text className="text-sm text-gray-600 dark:text-gray-300">
                            {t('messages.response')}: {recipient.Response}
                          </Text>
                        )}
                      </VStack>
                    </HStack>
                  ))}
                </VStack>
              </VStack>
            )}

            {/* Response Section */}
            {canRespond && isResponding && (
              <VStack space="sm">
                <Divider />
                <Text className="font-semibold">{t('messages.respond_to_message')}</Text>

                <VStack space="sm">
                  <Text className="text-sm font-medium">{t('messages.response')}</Text>
                  <Input variant="outline">
                    <InputField placeholder={t('messages.enter_response')} value={responseText} onChangeText={setResponseText} />
                  </Input>
                </VStack>

                <VStack space="sm">
                  <Text className="text-sm font-medium">{t('messages.note_optional')}</Text>
                  <Textarea>
                    <TextareaInput placeholder={t('messages.enter_note')} value={responseNote} onChangeText={setResponseNote} />
                  </Textarea>
                </VStack>

                <HStack space="sm" className="justify-end">
                  <Button
                    variant="outline"
                    onPress={() => {
                      setIsResponding(false);
                      setResponseText('');
                      setResponseNote('');
                    }}
                  >
                    <ButtonText>{t('common.cancel')}</ButtonText>
                  </Button>

                  <Button variant="solid" className="bg-primary-600" onPress={handleRespond} disabled={isLoading || !responseText.trim()}>
                    <ButtonText>{isLoading ? t('messages.responding') : t('messages.send_response')}</ButtonText>
                  </Button>
                </HStack>
              </VStack>
            )}
          </VStack>
        </ScrollView>
      </ActionsheetContent>
    </Actionsheet>
  );
};
