import { useFocusEffect } from '@react-navigation/native';
import { router, Stack } from 'expo-router';
import { ChevronDown, Mail, MailOpen, Menu, MessageSquarePlus, MoreVertical, Search, Trash2, X } from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, useWindowDimensions } from 'react-native';

import { Loading } from '@/components/common/loading';
import ZeroState from '@/components/common/zero-state';
import { ComposeMessageSheet } from '@/components/messages/compose-message-sheet';
import { MessageCard } from '@/components/messages/message-card';
import { MessageDetailsSheet } from '@/components/messages/message-details-sheet';
import { SideMenu } from '@/components/sidebar/side-menu';
import { FocusAwareStatusBar, View } from '@/components/ui';
import { Actionsheet, ActionsheetBackdrop, ActionsheetContent, ActionsheetItem, ActionsheetItemText } from '@/components/ui/actionsheet';
import { Badge } from '@/components/ui/badge';
import { Button, ButtonText } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Drawer, DrawerBackdrop, DrawerBody, DrawerContent, DrawerFooter } from '@/components/ui/drawer';
import { Fab, FabIcon } from '@/components/ui/fab';
import { FlatList } from '@/components/ui/flat-list';
import { HStack } from '@/components/ui/hstack';
import { Input, InputField } from '@/components/ui/input';
import { Pressable } from '@/components/ui/pressable';
import { SafeAreaView } from '@/components/ui/safe-area-view';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { useAnalytics } from '@/hooks/use-analytics';
import { type MessageResultData } from '@/models/v4/messages/messageResultData';
import { type MessageFilter, useMessagesStore } from '@/stores/messages/store';
import { useSecurityStore } from '@/stores/security/store';

export default function MessagesScreen() {
  const { t } = useTranslation();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [isSideMenuOpen, setIsSideMenuOpen] = useState(false);

  const { canUserCreateMessages } = useSecurityStore();
  const { trackEvent } = useAnalytics();

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
    fetchInboxMessages,
    fetchSentMessages,
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
      // Track analytics when view becomes visible
      trackEvent('messages_viewed', {
        timestamp: new Date().toISOString(),
        currentFilter,
        messageCount: filteredMessages.length,
      });

      if (currentFilter === 'sent') {
        fetchSentMessages();
      } else if (currentFilter === 'inbox') {
        fetchInboxMessages();
      } else {
        // For 'all', fetch both inbox and sent messages
        fetchInboxMessages();
        fetchSentMessages();
      }
    }, [fetchInboxMessages, fetchSentMessages, currentFilter, trackEvent, filteredMessages.length])
  );

  const handleMessagePress = (message: MessageResultData) => {
    if (isSelectionMode) {
      toggleMessageSelection(message.MessageId);
      trackEvent('message_selection_toggled', {
        timestamp: new Date().toISOString(),
        messageId: message.MessageId,
        isSelected: !selectedForDeletion.has(message.MessageId),
      });
    } else {
      selectMessage(message.MessageId);
      trackEvent('message_selected', {
        timestamp: new Date().toISOString(),
        messageId: message.MessageId,
        messageType: message.Type.toString(),
      });
    }
  };

  const handleLongPress = (message: MessageResultData) => {
    if (!isSelectionMode) {
      setIsSelectionMode(true);
      toggleMessageSelection(message.MessageId);
      trackEvent('message_selection_mode_entered', {
        timestamp: new Date().toISOString(),
        messageId: message.MessageId,
      });
    }
  };

  const handleDeleteSelected = () => {
    const selectedMessages = Array.from(selectedForDeletion);
    if (selectedMessages.length === 0) return;

    Alert.alert(t('messages.delete_confirmation_title'), t('messages.delete_confirmation_message', { count: selectedMessages.length }), [
      {
        text: t('common.cancel'),
        style: 'cancel',
        onPress: () => {
          trackEvent('message_delete_cancelled', {
            timestamp: new Date().toISOString(),
            messageCount: selectedMessages.length,
          });
        },
      },
      {
        text: t('common.confirm'),
        style: 'destructive',
        onPress: async () => {
          trackEvent('messages_deleted', {
            timestamp: new Date().toISOString(),
            messageCount: selectedMessages.length,
            messageIds: selectedMessages.join(','),
          });
          await deleteMessages(selectedMessages);
          setIsSelectionMode(false);
        },
      },
    ]);
  };

  const exitSelectionMode = () => {
    setIsSelectionMode(false);
    clearSelection();
    trackEvent('message_selection_mode_exited', {
      timestamp: new Date().toISOString(),
    });
  };

  const handleOpenCompose = (source: 'fab' | 'zero_state') => {
    trackEvent('message_compose_opened', {
      timestamp: new Date().toISOString(),
      source,
    });
    openCompose();
  };

  const handleSearchQueryChange = (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      trackEvent('messages_searched', {
        timestamp: new Date().toISOString(),
        searchLength: query.length,
        currentFilter,
      });
    }
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
    const { inboxMessages, sentMessages } = useMessagesStore.getState();
    switch (filter) {
      case 'inbox':
        return inboxMessages.length;
      case 'sent':
        return sentMessages.length;
      default:
        return inboxMessages.length + sentMessages.length;
    }
  };

  const renderMessage = ({ item }: { item: MessageResultData }) => (
    <MessageCard message={item} onPress={() => handleMessagePress(item)} onLongPress={() => handleLongPress(item)} isSelected={selectedForDeletion.has(item.MessageId)} showCheckbox={isSelectionMode} />
  );

  if (isLoading && filteredMessages.length === 0) {
    return <Loading />;
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: t('messages.title'),
          headerLeft: () =>
            !isLandscape ? (
              <Pressable className="p-2" onPress={() => setIsSideMenuOpen(true)} testID="messages-menu-button">
                <Menu size={24} className="text-gray-700 dark:text-gray-300" />
              </Pressable>
            ) : null,
          headerRight: () => null,
        }}
      />
      <FocusAwareStatusBar />
      <View className="flex-1 bg-gray-50 dark:bg-gray-950">
        {/* Search and Filter Bar */}
        <VStack space="sm" className="border-b border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
          <HStack space="sm" className="items-center">
            <View className="flex-1">
              <Input variant="outline" className="flex-1">
                <InputField placeholder={t('messages.search_placeholder')} value={searchQuery} onChangeText={handleSearchQueryChange} testID="messages-search-input" />
              </Input>
            </View>
            <Pressable className="rounded-lg border border-gray-300 p-2 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800" onPress={() => setIsFilterMenuOpen(true)} testID="messages-filter-button">
              <HStack space="xs" className="items-center">
                <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">{getFilterLabel(currentFilter)}</Text>
                <Badge variant="solid" className="bg-primary-500 dark:bg-primary-400">
                  <Text className="text-xs text-white dark:text-gray-900">{getFilterCount(currentFilter)}</Text>
                </Badge>
                <ChevronDown size={16} className="text-gray-700 dark:text-gray-300" />
              </HStack>
            </Pressable>
          </HStack>

          {/* Selection Mode Header */}
          {isSelectionMode ? (
            <HStack space="sm" className="items-center justify-between">
              <HStack space="sm" className="items-center">
                <Pressable onPress={exitSelectionMode} className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-800" testID="messages-exit-selection-mode">
                  <X size={20} className="text-gray-700 dark:text-gray-300" />
                </Pressable>
              </HStack>

              <HStack space="sm">
                <Button size="sm" variant="outline" onPress={selectAllVisibleMessages}>
                  <ButtonText>{t('messages.select_all')}</ButtonText>
                </Button>

                <Button size="sm" variant="solid" className="bg-red-500 hover:bg-red-600" onPress={handleDeleteSelected} disabled={!hasSelectedMessages() || isDeleting}>
                  <Trash2 size={16} className="text-white" />
                  <ButtonText className="ml-1 text-white">{isDeleting ? t('common.deleting') : t('common.delete')}</ButtonText>
                </Button>
              </HStack>
            </HStack>
          ) : (
            /* Normal Filter/Count Display */
            <HStack space="sm" className="items-center justify-between">
              <Text className="text-sm text-gray-600 dark:text-gray-400">{t('messages.showing_count', { count: filteredMessages.length })}</Text>
            </HStack>
          )}
        </VStack>

        {error ? (
          <View className="p-4">
            <Text className="text-center text-red-500">{error}</Text>
            <Button
              onPress={() => {
                trackEvent('messages_retry_pressed', {
                  timestamp: new Date().toISOString(),
                  currentFilter,
                });
                if (currentFilter === 'sent') {
                  fetchSentMessages();
                } else if (currentFilter === 'inbox') {
                  fetchInboxMessages();
                } else {
                  // For 'all', retry both inbox and sent messages
                  fetchInboxMessages();
                  fetchSentMessages();
                }
              }}
              className="mt-2"
            >
              <ButtonText>{t('common.retry')}</ButtonText>
            </Button>
          </View>
        ) : filteredMessages.length === 0 && !isLoading ? (
          <ZeroState heading={t('messages.no_messages')} description={t('messages.no_messages_description')} icon={Mail} iconSize={64} iconColor="#9CA3AF">
            {canUserCreateMessages ? (
              <Button onPress={() => handleOpenCompose('zero_state')} className="bg-primary-600">
                <ButtonText>{t('messages.send_first_message')}</ButtonText>
              </Button>
            ) : null}
          </ZeroState>
        ) : (
          <FlatList
            data={filteredMessages}
            renderItem={renderMessage}
            keyExtractor={(item, index) => item.MessageId || `message-${index}`}
            className="flex-1"
            contentContainerStyle={{ paddingBottom: 16 }}
            showsVerticalScrollIndicator={false}
            refreshing={isLoading}
            testID="messages-list"
            onRefresh={() => {
              trackEvent('messages_refreshed', {
                timestamp: new Date().toISOString(),
                currentFilter,
              });
              if (currentFilter === 'sent') {
                fetchSentMessages();
              } else if (currentFilter === 'inbox') {
                fetchInboxMessages();
              } else {
                // For 'all', refresh both inbox and sent messages
                fetchInboxMessages();
                fetchSentMessages();
              }
            }}
          />
        )}

        {isLoading && filteredMessages.length === 0 && <Loading />}

        {/* Side Menu Drawer */}
        <Drawer isOpen={isSideMenuOpen} onClose={() => setIsSideMenuOpen(false)} size={isLandscape ? 'lg' : 'md'}>
          <DrawerBackdrop />
          <DrawerContent className={isLandscape ? 'w-1/4' : 'w-4/5'}>
            <DrawerBody className="p-0">
              <SideMenu onNavigate={() => setIsSideMenuOpen(false)} />
            </DrawerBody>
          </DrawerContent>
        </Drawer>

        {/* Filter Action Sheet */}
        <Actionsheet isOpen={isFilterMenuOpen} onClose={() => setIsFilterMenuOpen(false)}>
          <ActionsheetBackdrop />
          <ActionsheetContent>
            <ActionsheetItem
              onPress={() => {
                trackEvent('messages_filter_changed', {
                  timestamp: new Date().toISOString(),
                  fromFilter: currentFilter,
                  toFilter: 'all',
                });
                setCurrentFilter('all');
                setIsFilterMenuOpen(false);
                // For 'all', fetch both inbox and sent messages
                fetchInboxMessages();
                fetchSentMessages();
              }}
            >
              <HStack space="sm" className="w-full items-center justify-between">
                <ActionsheetItemText>{t('messages.all_messages')}</ActionsheetItemText>
                <Badge variant="solid" className="bg-gray-500 dark:bg-gray-400">
                  <Text className="text-xs text-white dark:text-gray-900">{getFilterCount('all')}</Text>
                </Badge>
              </HStack>
            </ActionsheetItem>

            <ActionsheetItem
              onPress={() => {
                trackEvent('messages_filter_changed', {
                  timestamp: new Date().toISOString(),
                  fromFilter: currentFilter,
                  toFilter: 'inbox',
                });
                setCurrentFilter('inbox');
                setIsFilterMenuOpen(false);
                fetchInboxMessages();
              }}
            >
              <HStack space="sm" className="w-full items-center justify-between">
                <ActionsheetItemText>{t('messages.inbox')}</ActionsheetItemText>
                <Badge variant="solid" className="bg-blue-500 dark:bg-blue-400">
                  <Text className="text-xs text-white dark:text-gray-900">{getFilterCount('inbox')}</Text>
                </Badge>
              </HStack>
            </ActionsheetItem>

            <ActionsheetItem
              onPress={() => {
                trackEvent('messages_filter_changed', {
                  timestamp: new Date().toISOString(),
                  fromFilter: currentFilter,
                  toFilter: 'sent',
                });
                setCurrentFilter('sent');
                setIsFilterMenuOpen(false);
                fetchSentMessages();
              }}
            >
              <HStack space="sm" className="w-full items-center justify-between">
                <ActionsheetItemText>{t('messages.sent')}</ActionsheetItemText>
                <Badge variant="solid" className="bg-green-500 dark:bg-green-400">
                  <Text className="text-xs text-white dark:text-gray-900">{getFilterCount('sent')}</Text>
                </Badge>
              </HStack>
            </ActionsheetItem>
          </ActionsheetContent>
        </Actionsheet>

        {/* Message Details Sheet */}
        <MessageDetailsSheet />

        {/* Compose Message Sheet */}
        <ComposeMessageSheet />

        {/* FAB button for composing new message */}
        {!isSelectionMode && canUserCreateMessages && (
          <Fab placement="bottom right" size="lg" onPress={() => handleOpenCompose('fab')} testID="messages-compose-fab">
            <FabIcon as={MessageSquarePlus} size="lg" />
          </Fab>
        )}
      </View>
    </>
  );
}
