import { CalendarDays, Check, ChevronDown, Plus, Send, Users, X } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, ScrollView, useWindowDimensions } from 'react-native';

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
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [messageType, setMessageType] = useState<number>(0); // 0 = Message, 1 = Poll, 2 = Alert
  const [expirationDate, setExpirationDate] = useState('');
  const [selectedRecipients, setSelectedRecipients] = useState<Set<string>>(new Set());
  const [isRecipientsSheetOpen, setIsRecipientsSheetOpen] = useState(false);
  const [currentRecipientTab, setCurrentRecipientTab] = useState<'personnel' | 'groups' | 'roles' | 'units'>('personnel');

  const { recipients, isComposeOpen, isSending, isRecipientsLoading, closeCompose, sendNewMessage, fetchRecipients } = useMessagesStore();

  const { data: dispatchData, fetchDispatchData } = useDispatchStore();

  // Fetch recipients when compose opens
  useEffect(() => {
    if (isComposeOpen && recipients.length === 0) {
      fetchRecipients();
      fetchDispatchData();
    }
  }, [isComposeOpen, recipients.length, fetchRecipients, fetchDispatchData]);

  const resetForm = useCallback(() => {
    setSubject('');
    setBody('');
    setMessageType(0);
    setExpirationDate('');
    setSelectedRecipients(new Set());
  }, []);

  const handleClose = () => {
    resetForm();
    closeCompose();
  };

  const handleSend = async () => {
    if (!subject.trim()) {
      Alert.alert(t('messages.error'), t('messages.subject_required'));
      return;
    }

    if (!body.trim()) {
      Alert.alert(t('messages.error'), t('messages.body_required'));
      return;
    }

    if (selectedRecipients.size === 0) {
      Alert.alert(t('messages.error'), t('messages.recipients_required'));
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
      resetForm();
    } catch (error) {
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
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedRecipients(newSelection);
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

            <HStack space="md" className="items-center">
              <Button variant="solid" className="bg-primary-600 shadow-md dark:bg-primary-100" onPress={handleSend} disabled={isSending || !subject.trim() || !body.trim() || selectedRecipients.size === 0}>
                <Send size={16} color="white" />
                <ButtonText className="ml-2 font-semibold text-white">{isSending ? t('messages.sending') : t('messages.send')}</ButtonText>
              </Button>

              <Button variant="link" onPress={handleClose} className="p-2" testID="close-button">
                <X size={24} className="text-gray-500 dark:text-gray-400" />
              </Button>
            </HStack>
          </HStack>
        </VStack>

        <ScrollView className="w-full flex-1">
          <VStack space="xs" className="w-full flex-1 p-2">
            {/* Message Type */}
            <VStack space="xs" className="w-full">
              <Text className="font-semibold">{t('messages.message_type')}</Text>
              <Select selectedValue={messageType.toString()} onValueChange={(value) => setMessageType(parseInt(value))}>
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

              <Pressable className="w-full rounded-lg border border-gray-300 bg-gray-50 p-3 dark:border-gray-600 dark:bg-gray-700" onPress={() => setIsRecipientsSheetOpen(true)}>
                <HStack space="sm" className="items-center justify-between">
                  <VStack className="flex-1">
                    <Text className="font-medium">{selectedRecipients.size > 0 ? t('messages.recipients_selected', { count: selectedRecipients.size }) : t('messages.select_recipients')}</Text>
                    {selectedRecipients.size > 0 && (
                      <Text className="text-sm text-gray-600 dark:text-gray-300" numberOfLines={2}>
                        {getSelectedRecipientsNames()}
                      </Text>
                    )}
                  </VStack>
                  <ChevronDown size={20} color="currentColor" />
                </HStack>
              </Pressable>
            </VStack>

            {/* Subject */}
            <VStack space="sm" className="w-full">
              <Text className="font-semibold">{t('messages.subject')}</Text>
              <Input variant="outline" className="w-full">
                <InputField placeholder={t('messages.enter_subject')} value={subject} onChangeText={setSubject} />
              </Input>
            </VStack>

            {/* Body */}
            <VStack space="sm" className="w-full flex-1">
              <Text className="font-semibold">{t('messages.message_body')}</Text>
              <Textarea className="min-h-32 w-full flex-1">
                <TextareaInput placeholder={t('messages.enter_message_body')} value={body} onChangeText={setBody} multiline numberOfLines={8} className="min-h-32 flex-1" textAlignVertical="top" />
              </Textarea>
            </VStack>
          </VStack>
        </ScrollView>

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
                  <Pressable key={tab} className={`flex-1 rounded-lg px-1 py-2 ${currentRecipientTab === tab ? 'bg-primary-500' : 'bg-gray-200 dark:bg-gray-600'}`} onPress={() => setCurrentRecipientTab(tab as any)}>
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
