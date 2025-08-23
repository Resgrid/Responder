import { CalendarDays, Check, ChevronDown, Plus, Send, Users, X } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, useWindowDimensions } from 'react-native';

import { useAnalytics } from '@/hooks/use-analytics';
import { type RecipientsResultData } from '@/models/v4/messages/recipientsResultData';
import { useDispatchStore } from '@/stores/dispatch/store';
import { useMessagesStore } from '@/stores/messages/store';

import { Actionsheet, ActionsheetBackdrop, ActionsheetContent, ActionsheetDragIndicator, ActionsheetDragIndicatorWrapper, ActionsheetItem, ActionsheetItemText } from '../ui/actionsheet';
import { Avatar, AvatarFallbackText } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { Box } from '../ui/box';
import { Button, ButtonText } from '../ui/button';
import { Checkbox, CheckboxIcon, CheckboxIndicator } from '../ui/checkbox';
import { Divider } from '../ui/divider';
import { HStack } from '../ui/hstack';
import { Input, InputField } from '../ui/input';
import { Pressable } from '../ui/pressable';
import { Select, SelectBackdrop, SelectContent, SelectDragIndicator, SelectDragIndicatorWrapper, SelectInput, SelectItem, SelectPortal, SelectTrigger } from '../ui/select';
import { Text } from '../ui/text';
import { Textarea, TextareaInput } from '../ui/textarea';
import { VStack } from '../ui/vstack';

export const ComposeMessageSheet: React.FC = () => {
  const { t } = useTranslation();
  const { trackEvent } = useAnalytics();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [messageType, setMessageType] = useState<number>(0); // 0 = Message, 1 = Poll, 2 = Alert
  const [expirationDate, setExpirationDate] = useState('');
  const [selectedRecipients, setSelectedRecipients] = useState<Set<string>>(new Set());
  const [isRecipientsSheetOpen, setIsRecipientsSheetOpen] = useState(false);
  const [currentRecipientTab, setCurrentRecipientTab] = useState<'personnel' | 'groups' | 'roles' | 'units'>('personnel');

  // Form validation state
  const [errors, setErrors] = useState<{
    subject?: string;
    body?: string;
    recipients?: string;
  }>({});
  const [hasFormChanges, setHasFormChanges] = useState(false);

  const { recipients, isComposeOpen, isSending, isRecipientsLoading, closeCompose, sendNewMessage, fetchRecipients } = useMessagesStore();

  const { data: dispatchData, fetchDispatchData } = useDispatchStore();

  // Analytics tracking function
  const trackViewAnalytics = useCallback(() => {
    try {
      trackEvent('compose_message_sheet_viewed', {
        timestamp: new Date().toISOString(),
        hasRecipients: recipients.length > 0,
        recipientCount: recipients.length,
        hasDispatchUsers: dispatchData.users.length > 0,
        hasDispatchGroups: dispatchData.groups.length > 0,
        hasDispatchRoles: dispatchData.roles.length > 0,
        hasDispatchUnits: dispatchData.units.length > 0,
        userCount: dispatchData.users.length,
        groupCount: dispatchData.groups.length,
        roleCount: dispatchData.roles.length,
        unitCount: dispatchData.units.length,
        isLoading: isRecipientsLoading,
        currentMessageType: messageType,
        currentTab: currentRecipientTab,
      });
    } catch (error) {
      // Analytics errors should not break the component
      console.warn('Failed to track compose message sheet view analytics:', error);
    }
  }, [trackEvent, recipients.length, dispatchData.users.length, dispatchData.groups.length, dispatchData.roles.length, dispatchData.units.length, isRecipientsLoading, messageType, currentRecipientTab]);

  // Fetch recipients when compose opens
  useEffect(() => {
    if (isComposeOpen && recipients.length === 0) {
      fetchRecipients();
      fetchDispatchData();
    }
  }, [isComposeOpen, recipients.length, fetchRecipients, fetchDispatchData]);

  // Track analytics when compose sheet becomes visible
  useEffect(() => {
    if (isComposeOpen) {
      trackViewAnalytics();
    }
  }, [isComposeOpen, trackViewAnalytics]);

  // Track form changes
  useEffect(() => {
    const hasChanges = subject.trim() !== '' || body.trim() !== '' || selectedRecipients.size > 0 || messageType !== 0;
    setHasFormChanges(hasChanges);
  }, [subject, body, selectedRecipients, messageType]);

  // Validation function
  const validateForm = useCallback(() => {
    const newErrors: typeof errors = {};

    if (!subject.trim()) {
      newErrors.subject = t('messages.validation.subject_required');
    }

    if (!body.trim()) {
      newErrors.body = t('messages.validation.body_required');
    }

    if (selectedRecipients.size === 0) {
      newErrors.recipients = t('messages.validation.recipients_required');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [subject, body, selectedRecipients, t]);

  const resetForm = useCallback(() => {
    setSubject('');
    setBody('');
    setMessageType(0);
    setExpirationDate('');
    setSelectedRecipients(new Set());
    setErrors({});
    setHasFormChanges(false);
  }, []);

  const handleClose = () => {
    if (hasFormChanges) {
      Alert.alert(t('messages.unsaved_changes'), t('messages.unsaved_changes_message'), [
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
        {
          text: t('common.discard'),
          style: 'destructive',
          onPress: () => {
            try {
              trackEvent('compose_message_cancelled', {
                timestamp: new Date().toISOString(),
                hasSubject: !!subject.trim(),
                hasBody: !!body.trim(),
                hasRecipients: selectedRecipients.size > 0,
                recipientCount: selectedRecipients.size,
                messageType,
                discardedChanges: true,
              });
            } catch (error) {
              console.warn('Failed to track compose message cancel analytics:', error);
            }
            resetForm();
            closeCompose();
          },
        },
      ]);
    } else {
      try {
        trackEvent('compose_message_cancelled', {
          timestamp: new Date().toISOString(),
          hasSubject: !!subject.trim(),
          hasBody: !!body.trim(),
          hasRecipients: selectedRecipients.size > 0,
          recipientCount: selectedRecipients.size,
          messageType,
          discardedChanges: false,
        });
      } catch (error) {
        console.warn('Failed to track compose message cancel analytics:', error);
      }
      resetForm();
      closeCompose();
    }
  };

  const handleSend = async () => {
    if (!validateForm()) {
      return;
    }

    // Convert selected recipients to API format
    const recipientsList = Array.from(selectedRecipients).map((id) => {
      // Find recipient in all categories
      const allRecipients = [...dispatchData.users, ...dispatchData.groups, ...dispatchData.roles, ...dispatchData.units];

      const recipient = allRecipients.find((r) => r.Id === id);

      return {
        id: id,
        type: getRecipientType(recipient?.Type || ''),
        name: recipient?.Name || 'Unknown',
      };
    });

    try {
      await sendNewMessage({
        subject: subject.trim(),
        body: body.trim(),
        type: messageType,
        recipients: recipientsList,
        expireOn: expirationDate || undefined,
      });

      // Track successful send analytics
      try {
        trackEvent('compose_message_sent', {
          timestamp: new Date().toISOString(),
          messageType,
          messageTypeLabel: getMessageTypeLabel(messageType),
          recipientCount: recipientsList.length,
          hasExpiration: !!expirationDate,
          subjectLength: subject.trim().length,
          bodyLength: body.trim().length,
          personnelCount: recipientsList.filter((r) => r.type === 1).length,
          groupsCount: recipientsList.filter((r) => r.type === 2).length,
          rolesCount: recipientsList.filter((r) => r.type === 3).length,
          unitsCount: recipientsList.filter((r) => r.type === 4).length,
        });
      } catch (error) {
        console.warn('Failed to track compose message sent analytics:', error);
      }

      resetForm();
    } catch (error) {
      // Track failed send analytics
      try {
        trackEvent('compose_message_send_failed', {
          timestamp: new Date().toISOString(),
          messageType,
          recipientCount: recipientsList.length,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      } catch (analyticsError) {
        console.warn('Failed to track compose message send failed analytics:', analyticsError);
      }
      // Error handled in store
    }
  };

  const getRecipientType = (typeString: string): number => {
    switch (typeString) {
      case 'Personnel':
        return 1;
      case 'Groups':
        return 2;
      case 'Roles':
        return 3;
      case 'Unit':
        return 4;
      default:
        return 1;
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

  const toggleRecipient = (id: string) => {
    const newSelection = new Set(selectedRecipients);
    const wasSelected = newSelection.has(id);

    if (wasSelected) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }

    setSelectedRecipients(newSelection);

    // Clear recipients error if user selects at least one recipient
    if (errors.recipients && newSelection.size > 0) {
      setErrors((prev) => ({ ...prev, recipients: undefined }));
    }

    // Track recipient selection analytics
    try {
      const allRecipients = [...dispatchData.users, ...dispatchData.groups, ...dispatchData.roles, ...dispatchData.units];
      const recipient = allRecipients.find((r) => r.Id === id);

      trackEvent('compose_message_recipient_toggled', {
        timestamp: new Date().toISOString(),
        recipientId: id,
        recipientName: recipient?.Name || 'Unknown',
        recipientType: recipient?.Type || 'Unknown',
        action: wasSelected ? 'removed' : 'added',
        totalSelected: newSelection.size,
        currentTab: currentRecipientTab,
      });
    } catch (error) {
      console.warn('Failed to track compose message recipient toggle analytics:', error);
    }
  };

  const getSelectedRecipientsNames = () => {
    const allRecipients = [...dispatchData.users, ...dispatchData.groups, ...dispatchData.roles, ...dispatchData.units];

    return Array.from(selectedRecipients)
      .map((id) => allRecipients.find((r) => r.Id === id)?.Name)
      .filter(Boolean)
      .join(', ');
  };

  const renderRecipientList = (recipients: any[], type: string) => (
    <VStack space="sm" className="w-full">
      {recipients.map((recipient) => {
        const isSelected = selectedRecipients.has(recipient.Id);
        return (
          <Pressable key={recipient.Id} onPress={() => toggleRecipient(recipient.Id)} className="w-full">
            <HStack
              space="md"
              className={`w-full items-center rounded-lg border-2 p-4 ${isSelected ? 'border-primary-500 bg-primary-50 dark:border-primary-400 dark:bg-primary-900/20' : 'border-transparent bg-gray-50 dark:bg-gray-700'}`}
            >
              <Avatar size="md" className="shrink-0">
                <AvatarFallbackText>{recipient.Name?.charAt(0) || 'U'}</AvatarFallbackText>
              </Avatar>

              <VStack className="min-w-0 flex-1">
                <Text className={`font-semibold ${isSelected ? 'text-primary-700 dark:text-primary-300' : 'text-gray-900 dark:text-gray-100'}`} numberOfLines={1}>
                  {recipient.Name}
                </Text>
                <Text className={`text-sm ${isSelected ? 'text-primary-600 dark:text-primary-400' : 'text-gray-600 dark:text-gray-400'}`} numberOfLines={1}>
                  {type}
                </Text>
              </VStack>

              {isSelected && <Check size={20} className="shrink-0 text-primary-600 dark:text-primary-400" />}
            </HStack>
          </Pressable>
        );
      })}
    </VStack>
  );

  return (
    <Actionsheet isOpen={isComposeOpen} onClose={handleClose} snapPoints={[90]}>
      <ActionsheetBackdrop />
      <ActionsheetContent className="w-full rounded-t-xl bg-white dark:bg-gray-800">
        <ActionsheetDragIndicatorWrapper>
          <ActionsheetDragIndicator />
        </ActionsheetDragIndicatorWrapper>

        {/* Header */}
        <VStack space="sm" className="w-full border-b border-gray-200 p-4 dark:border-gray-700">
          <HStack className="w-full items-center justify-between">
            <Text className="flex-1 text-lg font-bold">{t('messages.compose_new_message')}</Text>

            <Button variant="link" onPress={handleClose} className="p-2" testID="close-button">
              <X size={24} className="text-gray-500 dark:text-gray-400" />
            </Button>
          </HStack>
        </VStack>

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, width: '100%' }} keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 50}>
          <ScrollView className="w-full flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1, paddingBottom: 100 }}>
            <VStack space="md" className="w-full flex-1 p-4">
              {/* Message Type */}
              <VStack space="xs" className="w-full">
                <Text className="font-semibold">{t('messages.message_type')}</Text>
                <Select
                  selectedValue={messageType.toString()}
                  onValueChange={(value) => {
                    const newType = parseInt(value);
                    const oldType = messageType;
                    setMessageType(newType);

                    // Track message type change analytics
                    try {
                      trackEvent('compose_message_type_changed', {
                        timestamp: new Date().toISOString(),
                        fromType: oldType,
                        toType: newType,
                        fromTypeLabel: getMessageTypeLabel(oldType),
                        toTypeLabel: getMessageTypeLabel(newType),
                      });
                    } catch (error) {
                      console.warn('Failed to track compose message type change analytics:', error);
                    }
                  }}
                >
                  <SelectTrigger variant="outline" size="md" className="w-full">
                    <SelectInput placeholder={t('messages.select_message_type')} value={getMessageTypeLabel(messageType)} />
                  </SelectTrigger>
                  <SelectPortal>
                    <SelectBackdrop />
                    <SelectContent>
                      <SelectDragIndicatorWrapper>
                        <SelectDragIndicator />
                      </SelectDragIndicatorWrapper>
                      <SelectItem label={t('messages.types.message')} value="0" />
                      <SelectItem label={t('messages.types.poll')} value="1" />
                      <SelectItem label={t('messages.types.alert')} value="2" />
                    </SelectContent>
                  </SelectPortal>
                </Select>
              </VStack>

              {/* Recipients */}
              <VStack space="sm" className="w-full">
                <Text className="font-semibold">{t('messages.recipients')}</Text>

                <Pressable
                  className={`w-full rounded-lg border p-3 ${errors.recipients ? 'border-red-500 bg-red-50 dark:border-red-400 dark:bg-red-900/20' : 'border-gray-300 bg-gray-50 dark:border-gray-600 dark:bg-gray-700'}`}
                  onPress={() => {
                    setIsRecipientsSheetOpen(true);

                    // Track recipients sheet opened analytics
                    try {
                      trackEvent('compose_message_recipients_sheet_opened', {
                        timestamp: new Date().toISOString(),
                        currentlySelectedCount: selectedRecipients.size,
                        hasDispatchData: dispatchData.users.length > 0 || dispatchData.groups.length > 0 || dispatchData.roles.length > 0 || dispatchData.units.length > 0,
                      });
                    } catch (error) {
                      console.warn('Failed to track compose message recipients sheet opened analytics:', error);
                    }
                  }}
                >
                  <HStack space="sm" className="items-center justify-between">
                    <VStack className="flex-1">
                      <Text className={`font-medium ${errors.recipients ? 'text-red-700 dark:text-red-300' : ''}`}>
                        {selectedRecipients.size > 0 ? t('messages.recipients_selected', { count: selectedRecipients.size }) : t('messages.select_recipients')}
                      </Text>
                      {selectedRecipients.size > 0 && (
                        <Text className="text-sm text-gray-600 dark:text-gray-300" numberOfLines={2}>
                          {getSelectedRecipientsNames()}
                        </Text>
                      )}
                    </VStack>
                    <ChevronDown size={20} color={errors.recipients ? '#dc2626' : 'currentColor'} />
                  </HStack>
                </Pressable>
                {errors.recipients && <Text className="text-sm text-red-600 dark:text-red-400">{errors.recipients}</Text>}
              </VStack>

              {/* Subject */}
              <VStack space="sm" className="w-full">
                <Text className="font-semibold">{t('messages.subject')}</Text>
                <Input variant="outline" className={`w-full ${errors.subject ? 'border-red-500' : ''}`}>
                  <InputField
                    placeholder={t('messages.enter_subject')}
                    value={subject}
                    onChangeText={(text) => {
                      setSubject(text);
                      if (errors.subject && text.trim()) {
                        setErrors((prev) => ({ ...prev, subject: undefined }));
                      }
                    }}
                  />
                </Input>
                {errors.subject && <Text className="text-sm text-red-600 dark:text-red-400">{errors.subject}</Text>}
              </VStack>

              {/* Body */}
              <VStack space="sm" className="w-full flex-1">
                <Text className="font-semibold">{t('messages.message_body')}</Text>
                <Textarea className={`min-h-24 w-full flex-1 ${errors.body ? 'border-red-500' : ''}`}>
                  <TextareaInput
                    placeholder={t('messages.enter_message_body')}
                    value={body}
                    onChangeText={(text) => {
                      setBody(text);
                      if (errors.body && text.trim()) {
                        setErrors((prev) => ({ ...prev, body: undefined }));
                      }
                    }}
                    multiline
                    numberOfLines={6}
                    className="min-h-24 flex-1"
                    textAlignVertical="top"
                  />
                </Textarea>
                {errors.body && <Text className="text-sm text-red-600 dark:text-red-400">{errors.body}</Text>}
              </VStack>
            </VStack>
          </ScrollView>

          {/* Send Button - Fixed at bottom */}
          <VStack className="w-full border-t border-gray-200 p-4 dark:border-gray-700">
            <Button variant="solid" className="w-full bg-primary-600 shadow-lg dark:bg-primary-500" onPress={handleSend} disabled={isSending} size="lg">
              <Send size={18} color="white" />
              <ButtonText className="ml-2 text-lg font-semibold text-white">{isSending ? t('messages.sending') : t('messages.send')}</ButtonText>
            </Button>
          </VStack>
        </KeyboardAvoidingView>

        {/* Recipients Selection Sheet */}
        <Actionsheet isOpen={isRecipientsSheetOpen} onClose={() => setIsRecipientsSheetOpen(false)} snapPoints={[80]}>
          <ActionsheetBackdrop />
          <ActionsheetContent className="w-full rounded-t-xl bg-white dark:bg-gray-800">
            <ActionsheetDragIndicatorWrapper>
              <ActionsheetDragIndicator />
            </ActionsheetDragIndicatorWrapper>

            {/* Recipients Header */}
            <VStack space="sm" className="w-full border-b border-gray-200 p-2 dark:border-gray-700">
              <HStack className="w-full items-center justify-between">
                <Text className="flex-1 text-lg font-bold">{t('messages.select_recipients')}</Text>
                <Button variant="outline" onPress={() => setIsRecipientsSheetOpen(false)}>
                  <ButtonText>{t('common.done')}</ButtonText>
                </Button>
              </HStack>

              {/* Tabs */}
              <HStack space="xs" className="w-full">
                {['personnel', 'groups', 'roles'].map((tab) => (
                  <Pressable
                    key={tab}
                    className={`flex-1 rounded-lg px-1 py-2 ${currentRecipientTab === tab ? 'bg-primary-500' : 'bg-gray-200 dark:bg-gray-600'}`}
                    onPress={() => {
                      const oldTab = currentRecipientTab;
                      setCurrentRecipientTab(tab as any);

                      // Track tab change analytics
                      try {
                        trackEvent('compose_message_recipients_tab_changed', {
                          timestamp: new Date().toISOString(),
                          fromTab: oldTab,
                          toTab: tab,
                          selectedRecipientsCount: selectedRecipients.size,
                        });
                      } catch (error) {
                        console.warn('Failed to track compose message recipients tab change analytics:', error);
                      }
                    }}
                  >
                    <Text className={`text-center text-sm font-medium ${currentRecipientTab === tab ? 'text-white' : 'text-gray-700 dark:text-gray-300'}`}>{t(`calls.${tab}`)}</Text>
                  </Pressable>
                ))}
              </HStack>

              {/* Selected Count */}
              <Text className="text-sm text-gray-600 dark:text-gray-300">{t('messages.recipients_selected', { count: selectedRecipients.size })}</Text>
            </VStack>

            <ScrollView className="w-full flex-1 p-4">
              {currentRecipientTab === 'personnel' && renderRecipientList(dispatchData.users, t('messages.people'))}
              {currentRecipientTab === 'groups' && renderRecipientList(dispatchData.groups, t('calls.groups'))}
              {currentRecipientTab === 'roles' && renderRecipientList(dispatchData.roles, t('calls.roles'))}
              {currentRecipientTab === 'units' && renderRecipientList(dispatchData.units, t('calls.units'))}
            </ScrollView>
          </ActionsheetContent>
        </Actionsheet>
      </ActionsheetContent>
    </Actionsheet>
  );
};
