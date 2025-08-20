import { Check, Clock, Mail, MailOpen, Reply, Trash2, User, X } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, ScrollView, useWindowDimensions } from 'react-native';

import { useAnalytics } from '@/hooks/use-analytics';
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
  const { trackEvent } = useAnalytics();

  const [isResponding, setIsResponding] = useState(false);
  const [responseText, setResponseText] = useState('');
  const [responseNote, setResponseNote] = useState('');

  const { selectedMessage, isDetailsOpen, isLoading, closeDetails, deleteMessages, respondToMessage } = useMessagesStore();

  const formatMessageDate = (dateString: string) => {
    if (!dateString) return t('messages.date_unknown');
    try {
      const date = parseDateISOString(dateString);
      return formatDateForDisplay(date, 'MMM dd, yyyy h:mm tt');
    } catch {
      return dateString;
    }
  };

  const getMessageTypeLabel = useCallback(
    (type: number) => {
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
    },
    [t]
  );

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

  // Track analytics when sheet becomes visible
  const trackViewAnalytics = useCallback(() => {
    if (!selectedMessage) return;

    try {
      const hasRecipients = selectedMessage.Recipients && selectedMessage.Recipients.length > 0;
      const hasResponsedRecipients = hasRecipients && selectedMessage.Recipients.some((r) => r.RespondedOn);
      const hasExpiration = !!selectedMessage.ExpiredOn;
      const isExpired = hasExpiration && new Date(selectedMessage.ExpiredOn) < new Date();
      const canRespond = !selectedMessage.Responded && !isExpired && selectedMessage.Type !== 0;

      trackEvent('message_details_sheet_viewed', {
        timestamp: new Date().toISOString(),
        messageId: selectedMessage.MessageId,
        messageType: selectedMessage.Type,
        messageTypeLabel: getMessageTypeLabel(selectedMessage.Type),
        hasSubject: !!selectedMessage.Subject,
        hasBody: !!selectedMessage.Body,
        hasExpiration,
        isExpired,
        hasRecipients,
        recipientCount: selectedMessage.Recipients?.length || 0,
        hasResponsedRecipients,
        isSystemMessage: selectedMessage.IsSystem,
        userHasResponded: selectedMessage.Responded,
        canRespond,
        sendingUserId: selectedMessage.SendingUserId,
      });
    } catch (error) {
      // Analytics errors should not break the component
      console.warn('Failed to track message details sheet view analytics:', error);
    }
  }, [trackEvent, selectedMessage, getMessageTypeLabel]);

  // Track analytics when sheet becomes visible
  useEffect(() => {
    if (isDetailsOpen && selectedMessage) {
      trackViewAnalytics();
    }
  }, [isDetailsOpen, selectedMessage, trackViewAnalytics]);

  if (!selectedMessage) return null;

  const handleDelete = () => {
    Alert.alert(t('messages.delete_confirmation_title'), t('messages.delete_single_confirmation_message'), [
      {
        text: t('common.cancel'),
        style: 'cancel',
        onPress: () => {
          try {
            trackEvent('message_details_delete_cancelled', {
              timestamp: new Date().toISOString(),
              messageId: selectedMessage.MessageId,
              messageType: selectedMessage.Type,
            });
          } catch (error) {
            console.warn('Failed to track message delete cancel analytics:', error);
          }
        },
      },
      {
        text: t('common.confirm'),
        style: 'destructive',
        onPress: async () => {
          try {
            trackEvent('message_details_delete_confirmed', {
              timestamp: new Date().toISOString(),
              messageId: selectedMessage.MessageId,
              messageType: selectedMessage.Type,
              messageTypeLabel: getMessageTypeLabel(selectedMessage.Type),
            });
          } catch (error) {
            console.warn('Failed to track message delete confirm analytics:', error);
          }
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
      trackEvent('message_details_response_sent', {
        timestamp: new Date().toISOString(),
        messageId: selectedMessage.MessageId,
        messageType: selectedMessage.Type,
        messageTypeLabel: getMessageTypeLabel(selectedMessage.Type),
        hasNote: !!responseNote.trim(),
        responseLength: responseText.trim().length,
      });
    } catch (error) {
      console.warn('Failed to track message response analytics:', error);
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
        <VStack space="md" className="w-full border-b border-gray-200 px-6 py-4 dark:border-gray-700">
          <HStack space="md" className="w-full items-start justify-between">
            <HStack space="md" className="flex-1 items-start">
              <Box className="rounded-full bg-primary-100 p-3 dark:bg-primary-900">{selectedMessage.Responded ? <MailOpen size={24} color="#6366F1" /> : <Mail size={24} color="#6366F1" />}</Box>

              <VStack space="xs" className="flex-1">
                <Text className="text-lg font-bold leading-tight">{selectedMessage.Subject || t('messages.no_subject')}</Text>
                <Text className="text-sm text-gray-600 dark:text-gray-300">
                  {t('messages.from')}: {selectedMessage.SendingName || t('common.unknown_user')}
                </Text>
              </VStack>
            </HStack>

            <HStack space="sm" className="items-center">
              {canRespond && !isResponding && (
                <Pressable
                  className="rounded-lg bg-blue-100 p-3 dark:bg-blue-900"
                  onPress={() => {
                    try {
                      trackEvent('message_details_respond_started', {
                        timestamp: new Date().toISOString(),
                        messageId: selectedMessage.MessageId,
                        messageType: selectedMessage.Type,
                        messageTypeLabel: getMessageTypeLabel(selectedMessage.Type),
                      });
                    } catch (error) {
                      console.warn('Failed to track message respond start analytics:', error);
                    }
                    setIsResponding(true);
                  }}
                >
                  <Reply size={20} color="#3B82F6" />
                </Pressable>
              )}

              <Pressable className="rounded-lg bg-red-100 p-3 dark:bg-red-900" onPress={handleDelete}>
                <Trash2 size={20} color="#EF4444" />
              </Pressable>

              <Button variant="link" onPress={closeDetails} className="p-1" testID="close-button">
                <X size={24} className="text-gray-600 dark:text-gray-400" />
              </Button>
            </HStack>
          </HStack>

          {/* Message Metadata */}
          <HStack space="md" className="w-full items-center justify-between">
            <HStack space="sm" className="flex-1 items-center">
              <Badge variant="solid" className={getMessageTypeBadgeColor(selectedMessage.Type)}>
                <Text className="text-xs font-medium text-white">{getMessageTypeLabel(selectedMessage.Type)}</Text>
              </Badge>

              {selectedMessage.Responded && (
                <Badge variant="outline" className="border-green-500">
                  <Text className="text-xs font-medium text-green-600">{t('messages.responded')}</Text>
                </Badge>
              )}

              {isExpired && (
                <Badge variant="outline" className="border-red-500">
                  <Text className="text-xs font-medium text-red-600">{t('messages.expired')}</Text>
                </Badge>
              )}
            </HStack>

            <HStack space="xs" className="items-center">
              <Clock size={14} color="#6B7280" />
              <Text className="text-xs text-gray-500">{formatMessageDate(selectedMessage.SentOnUtc || selectedMessage.SentOn)}</Text>
            </HStack>
          </HStack>
        </VStack>

        <VStack className="w-full flex-1" space="md">
          {/* Message Body - Takes up remaining vertical space */}
          <VStack space="sm" className="flex-1 px-2">
            <Text className="text-base font-semibold text-gray-900 dark:text-gray-100">{t('messages.message_content')}</Text>
            <Box className="w-full flex-1 rounded-lg bg-gray-50 p-4 dark:bg-gray-700">
              <ScrollView className="flex-1" showsVerticalScrollIndicator={true} contentContainerStyle={{ flexGrow: 1 }} nestedScrollEnabled={true}>
                <Text className="leading-relaxed text-gray-800 dark:text-gray-200">{selectedMessage.Body || t('messages.no_content')}</Text>
              </ScrollView>
            </Box>
          </VStack>

          {/* Other sections in a separate scrollable area */}
          <ScrollView className="max-h-40" showsVerticalScrollIndicator={false}>
            <VStack space="lg" className="w-full px-6 pb-4">
              {/* Expiration Date */}
              {selectedMessage.ExpiredOn && (
                <VStack space="sm" className="w-full">
                  <Text className="text-base font-semibold text-gray-900 dark:text-gray-100">{t('messages.expires_on')}</Text>
                  <Text className="text-gray-600 dark:text-gray-300">{formatMessageDate(selectedMessage.ExpiredOn)}</Text>
                </VStack>
              )}

              {/* Recipients */}
              {selectedMessage.Recipients && selectedMessage.Recipients.length > 0 && (
                <VStack space="sm" className="w-full">
                  <Text className="text-base font-semibold text-gray-900 dark:text-gray-100">
                    {t('messages.recipients')} ({selectedMessage.Recipients.length})
                  </Text>
                  <VStack space="xs" className="w-full">
                    {selectedMessage.Recipients.map((recipient, index) => (
                      <HStack key={index} space="sm" className="w-full items-center rounded-lg bg-gray-50 p-3 dark:bg-gray-700">
                        <Avatar size="sm">
                          <AvatarFallbackText>{recipient.Name?.charAt(0) || 'U'}</AvatarFallbackText>
                        </Avatar>

                        <VStack space="xs" className="flex-1">
                          <Text className="font-medium text-gray-900 dark:text-gray-100">{recipient.Name || t('common.unknown_user')}</Text>
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
                <VStack space="md" className="w-full">
                  <Divider className="my-2" />
                  <Text className="text-base font-semibold text-gray-900 dark:text-gray-100">{t('messages.respond_to_message')}</Text>

                  <VStack space="sm" className="w-full">
                    <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('messages.response')}</Text>
                    <Input variant="outline" className="w-full">
                      <InputField placeholder={t('messages.enter_response')} value={responseText} onChangeText={setResponseText} />
                    </Input>
                  </VStack>

                  <VStack space="sm" className="w-full">
                    <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('messages.note_optional')}</Text>
                    <Textarea className="w-full">
                      <TextareaInput placeholder={t('messages.enter_note')} value={responseNote} onChangeText={setResponseNote} />
                    </Textarea>
                  </VStack>

                  <HStack space="sm" className="w-full justify-end pt-2">
                    <Button
                      variant="outline"
                      onPress={() => {
                        try {
                          trackEvent('message_details_respond_cancelled', {
                            timestamp: new Date().toISOString(),
                            messageId: selectedMessage.MessageId,
                            messageType: selectedMessage.Type,
                            messageTypeLabel: getMessageTypeLabel(selectedMessage.Type),
                            hadResponse: !!responseText.trim(),
                            hadNote: !!responseNote.trim(),
                          });
                        } catch (error) {
                          console.warn('Failed to track message respond cancel analytics:', error);
                        }
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
        </VStack>
      </ActionsheetContent>
    </Actionsheet>
  );
};
