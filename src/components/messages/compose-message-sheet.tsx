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
import { Checkbox } from '../ui/checkbox';
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
    <VStack space="xs">
      {recipients.map((recipient) => (
        <HStack key={recipient.Id} space="sm" className="items-center rounded-lg bg-gray-50 p-3 dark:bg-gray-700">
          <Checkbox value={selectedRecipients.has(recipient.Id)} onChange={() => toggleRecipient(recipient.Id)} aria-label={`Select ${recipient.Name}`} />

          <Avatar size="sm">
            <AvatarFallbackText>{recipient.Name?.charAt(0) || 'U'}</AvatarFallbackText>
          </Avatar>

          <VStack className="flex-1">
            <Text className="font-medium">{recipient.Name}</Text>
            <Text className="text-xs text-gray-500">{type}</Text>
          </VStack>
        </HStack>
      ))}
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
        <VStack space="sm" className="border-b border-gray-200 p-4 dark:border-gray-700">
          <HStack space="sm" className="items-center justify-between">
            <HStack space="sm" className="items-center">
              <Box className="rounded-full bg-primary-100 p-2 dark:bg-primary-900">
                <Send size={20} color="#6366F1" />
              </Box>
              <Text className="text-lg font-bold">{t('messages.compose_new_message')}</Text>
            </HStack>

            <HStack space="sm">
              <Button variant="solid" className="bg-primary-600" onPress={handleSend} disabled={isSending || !subject.trim() || !body.trim() || selectedRecipients.size === 0}>
                <Send size={16} color="white" />
                <ButtonText className="ml-1 text-white">{isSending ? t('messages.sending') : t('messages.send')}</ButtonText>
              </Button>

              <Pressable className="rounded-lg bg-gray-100 p-2 dark:bg-gray-700" onPress={handleClose}>
                <X size={20} color="currentColor" />
              </Pressable>
            </HStack>
          </HStack>
        </VStack>

        <ScrollView className="flex-1">
          <VStack space="md" className="p-4">
            {/* Message Type */}
            <VStack space="sm">
              <Text className="font-semibold">{t('messages.message_type')}</Text>
              <Select selectedValue={messageType.toString()} onValueChange={(value) => setMessageType(parseInt(value))}>
                <SelectTrigger variant="outline" size="md">
                  <SelectInput placeholder={t('messages.select_message_type')} />
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

            {/* Subject */}
            <VStack space="sm">
              <Text className="font-semibold">{t('messages.subject')}</Text>
              <Input variant="outline">
                <InputField placeholder={t('messages.enter_subject')} value={subject} onChangeText={setSubject} />
              </Input>
            </VStack>

            {/* Body */}
            <VStack space="sm">
              <Text className="font-semibold">{t('messages.message_body')}</Text>
              <Textarea>
                <TextareaInput placeholder={t('messages.enter_message_body')} value={body} onChangeText={setBody} multiline numberOfLines={6} />
              </Textarea>
            </VStack>

            {/* Expiration Date (Optional) */}
            <VStack space="sm">
              <Text className="font-semibold">{t('messages.expiration_date_optional')}</Text>
              <Input variant="outline">
                <InputField placeholder={t('messages.enter_expiration_date')} value={expirationDate} onChangeText={setExpirationDate} />
              </Input>
              <Text className="text-xs text-gray-500">{t('messages.expiration_date_format')}</Text>
            </VStack>

            {/* Recipients */}
            <VStack space="sm">
              <Text className="font-semibold">{t('messages.recipients')}</Text>

              <Pressable className="rounded-lg border border-gray-300 bg-gray-50 p-3 dark:border-gray-600 dark:bg-gray-700" onPress={() => setIsRecipientsSheetOpen(true)}>
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
            <VStack space="sm" className="border-b border-gray-200 p-4 dark:border-gray-700">
              <HStack space="sm" className="items-center justify-between">
                <Text className="text-lg font-bold">{t('messages.select_recipients')}</Text>
                <Button variant="outline" onPress={() => setIsRecipientsSheetOpen(false)}>
                  <ButtonText>{t('common.done')}</ButtonText>
                </Button>
              </HStack>

              {/* Tabs */}
              <HStack space="sm">
                {['personnel', 'groups', 'roles', 'units'].map((tab) => (
                  <Pressable key={tab} className={`rounded-lg px-3 py-2 ${currentRecipientTab === tab ? 'bg-primary-500' : 'bg-gray-200 dark:bg-gray-600'}`} onPress={() => setCurrentRecipientTab(tab as any)}>
                    <Text className={`text-sm font-medium ${currentRecipientTab === tab ? 'text-white' : 'text-gray-700 dark:text-gray-300'}`}>{t(`calls.${tab}`)}</Text>
                  </Pressable>
                ))}
              </HStack>

              {/* Selected Count */}
              <Text className="text-sm text-gray-600 dark:text-gray-300">{t('messages.recipients_selected', { count: selectedRecipients.size })}</Text>
            </VStack>

            <ScrollView className="flex-1 p-4">
              {currentRecipientTab === 'personnel' && renderRecipientList(dispatchData.users, t('calls.personnel'))}
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
