import { useFocusEffect } from '@react-navigation/native';
import { ChevronDown, Mail, MailOpen, MessageSquarePlus, MoreVertical, Search, Trash2, X } from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';

import { MessageCard } from '@/components/messages/message-card';
import { MessageDetailsSheet } from '@/components/messages/message-details-sheet';
import { ComposeMessageSheet } from '@/components/messages/compose-message-sheet';
import ZeroState from '@/components/common/zero-state';
import { Loading } from '@/components/common/loading';
import { View } from '@/components/ui';
import { Badge } from '@/components/ui/badge';
import { Button, ButtonText } from '@/components/ui/button';
import { FlatList } from '@/components/ui/flat-list';
import { HStack } from '@/components/ui/hstack';
import { Input, InputField } from '@/components/ui/input';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { Checkbox } from '@/components/ui/checkbox';
import { Actionsheet, ActionsheetBackdrop, ActionsheetContent, ActionsheetItem, ActionsheetItemText } from '@/components/ui/actionsheet';
import { useMessagesStore, type MessageFilter } from '@/stores/messages/store';
import { type MessageResultData } from '@/models/v4/messages/messageResultData';

export default function MessagesScreen() {
  const { t } = useTranslation();
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  const {
    isLoading,
    error,
    searchQuery,
    currentFilter,
    selectedForDeletion,
    isDetailsOpen,
    isComposeOpen,
    isDeleting,
    setSearchQuery,
    setCurrentFilter,
    selectMessage,
    fetchMessages,
    getFilteredMessages,
    hasSelectedMessages,
    clearSelection,
    selectAllVisibleMessages,
    deleteMessages,
    openCompose,
    toggleMessageSelection,
  } = useMessagesStore();

  const filteredMessages = getFilteredMessages();

  // Fetch messages when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchMessages();
    }, [fetchMessages])
  );

  const handleMessagePress = (message: MessageResultData) => {
    if (isSelectionMode) {
      toggleMessageSelection(message.MessageId);
    } else {
      selectMessage(message.MessageId);
    }
  };

  const handleLongPress = (message: MessageResultData) => {
    if (!isSelectionMode) {
      setIsSelectionMode(true);
      toggleMessageSelection(message.MessageId);
    }
  };

  const handleDeleteSelected = () => {
    const selectedMessages = Array.from(selectedForDeletion);
    if (selectedMessages.length === 0) return;

    Alert.alert(
      t('messages.delete_confirmation_title'),
      t('messages.delete_confirmation_message', { count: selectedMessages.length }),
      [
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
        {
          text: t('common.confirm'),
          style: 'destructive',
          onPress: async () => {
            await deleteMessages(selectedMessages);
            setIsSelectionMode(false);
          },
        },
      ]
    );
  };

  const exitSelectionMode = () => {
    setIsSelectionMode(false);
    clearSelection();
  };

  const getFilterLabel = (filter: MessageFilter) => {
    switch (filter) {
      case 'inbox':
        return t('messages.inbox');
      case 'sent':
        return t('messages.sent');
      default:
        return t('messages.all_messages');
    }
  };

  const getFilterCount = (filter: MessageFilter) => {
    const { messages } = useMessagesStore.getState();
    switch (filter) {
      case 'inbox':
        return messages.filter(msg => !msg.IsSystem).length;
      case 'sent':
        return messages.filter(msg => msg.IsSystem).length;
      default:
        return messages.length;
    }
  };

  const renderHeader = () => (
    <VStack space="sm" className="p-4 bg-white dark:bg-gray-900">
      {/* Search Bar */}
      <HStack space="sm" className="items-center">
        <View className="flex-1">
          <Input variant="outline" className="flex-1">
            <InputField
              placeholder={t('messages.search_placeholder')}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </Input>
        </View>
        <Pressable
          className="p-2 rounded-lg border border-gray-300 dark:border-gray-600"
          onPress={() => setIsFilterMenuOpen(true)}
        >
          <HStack space="xs" className="items-center">
            <Text className="text-sm font-medium">{getFilterLabel(currentFilter)}</Text>
            <Badge variant="solid" className="bg-primary-500">
              <Text className="text-white text-xs">{getFilterCount(currentFilter)}</Text>
            </Badge>
            <ChevronDown size={16} color="currentColor" />
          </HStack>
        </Pressable>
      </HStack>

      {/* Selection Mode Header */}
      {isSelectionMode ? (
        <HStack space="sm" className="items-center justify-between">
          <HStack space="sm" className="items-center">
            <Pressable onPress={exitSelectionMode} className="p-2">
              <X size={20} color="currentColor" />
            </Pressable>
            <Text className="font-medium">
              {t('messages.selected_count', { count: selectedForDeletion.size })}
            </Text>
          </HStack>

          <HStack space="sm">
            <Button
              size="sm"
              variant="outline"
              onPress={selectAllVisibleMessages}
            >
              <ButtonText>{t('messages.select_all')}</ButtonText>
            </Button>

            <Button
              size="sm"
              variant="solid"
              className="bg-red-500"
              onPress={handleDeleteSelected}
              disabled={!hasSelectedMessages() || isDeleting}
            >
              <Trash2 size={16} color="white" />
              <ButtonText className="text-white ml-1">
                {isDeleting ? t('common.deleting') : t('common.delete')}
              </ButtonText>
            </Button>
          </HStack>
        </HStack>
      ) : (
        /* Normal Header */
        <HStack space="sm" className="items-center justify-between">
          <Text className="text-lg font-bold">
            {t('messages.title')} ({filteredMessages.length})
          </Text>

          <Button
            size="sm"
            variant="solid"
            className="bg-primary-600"
            onPress={openCompose}
          >
            <MessageSquarePlus size={16} color="white" />
            <ButtonText className="text-white ml-1">{t('messages.compose')}</ButtonText>
          </Button>
        </HStack>
      )}
    </VStack>
  );

  const renderMessage = ({ item }: { item: MessageResultData }) => (
    <MessageCard
      message={item}
      onPress={() => handleMessagePress(item)}
      onLongPress={() => handleLongPress(item)}
      isSelected={selectedForDeletion.has(item.MessageId)}
      showCheckbox={isSelectionMode}
    />
  );

  if (isLoading && filteredMessages.length === 0) {
    return <Loading />;
  }

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-950">
      {renderHeader()}

      {error ? (
        <View className="p-4">
          <Text className="text-red-500 text-center">{error}</Text>
          <Button onPress={fetchMessages} className="mt-2">
            <ButtonText>{t('common.retry')}</ButtonText>
          </Button>
        </View>
      ) : filteredMessages.length === 0 ? (
        <ZeroState
          heading={t('messages.no_messages')}
          description={t('messages.no_messages_description')}
          icon={Mail}
          iconSize={64}
          iconColor="#9CA3AF"
        >
          <Button onPress={openCompose} className="bg-primary-600">
            <ButtonText>{t('messages.send_first_message')}</ButtonText>
          </Button>
        </ZeroState>
      ) : (
        <FlatList
          data={filteredMessages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.MessageId}
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 16 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Filter Action Sheet */}
      <Actionsheet isOpen={isFilterMenuOpen} onClose={() => setIsFilterMenuOpen(false)}>
        <ActionsheetBackdrop />
        <ActionsheetContent>
          <ActionsheetItem
            onPress={() => {
              setCurrentFilter('all');
              setIsFilterMenuOpen(false);
            }}
          >
            <HStack space="sm" className="items-center justify-between w-full">
              <ActionsheetItemText>{t('messages.all_messages')}</ActionsheetItemText>
              <Badge variant="solid" className="bg-gray-500">
                <Text className="text-white text-xs">{getFilterCount('all')}</Text>
              </Badge>
            </HStack>
          </ActionsheetItem>

          <ActionsheetItem
            onPress={() => {
              setCurrentFilter('inbox');
              setIsFilterMenuOpen(false);
            }}
          >
            <HStack space="sm" className="items-center justify-between w-full">
              <ActionsheetItemText>{t('messages.inbox')}</ActionsheetItemText>
              <Badge variant="solid" className="bg-blue-500">
                <Text className="text-white text-xs">{getFilterCount('inbox')}</Text>
              </Badge>
            </HStack>
          </ActionsheetItem>

          <ActionsheetItem
            onPress={() => {
              setCurrentFilter('sent');
              setIsFilterMenuOpen(false);
            }}
          >
            <HStack space="sm" className="items-center justify-between w-full">
              <ActionsheetItemText>{t('messages.sent')}</ActionsheetItemText>
              <Badge variant="solid" className="bg-green-500">
                <Text className="text-white text-xs">{getFilterCount('sent')}</Text>
              </Badge>
            </HStack>
          </ActionsheetItem>
        </ActionsheetContent>
      </Actionsheet>

      {/* Message Details Sheet */}
      <MessageDetailsSheet />

      {/* Compose Message Sheet */}
      <ComposeMessageSheet />
    </View>
  );
} 