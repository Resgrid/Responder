import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

import { deleteMessage, getInboxMessages, getMessage, getRecipients, getSentMessages, respondToMessage, type RespondToMessageRequest, sendMessage, type SendMessageRequest } from '@/api/messaging/messages';
import { logger } from '@/lib/logging';
import { type MessageResultData } from '@/models/v4/messages/messageResultData';
import { type RecipientsResultData } from '@/models/v4/messages/recipientsResultData';

export type MessageFilter = 'all' | 'inbox' | 'sent';

interface MessagesState {
  inboxMessages: MessageResultData[];
  sentMessages: MessageResultData[];
  recipients: RecipientsResultData[];
  selectedMessageId: string | null;
  selectedMessage: MessageResultData | null;
  isDetailsOpen: boolean;
  isComposeOpen: boolean;
  isLoading: boolean;
  isRecipientsLoading: boolean;
  isSending: boolean;
  isDeleting: boolean;
  error: string | null;
  searchQuery: string;
  currentFilter: MessageFilter;
  selectedForDeletion: Set<string>;
  lastFetchTime: number | null;

  // Actions
  fetchInboxMessages: () => Promise<void>;
  fetchSentMessages: () => Promise<void>;
  fetchRecipients: () => Promise<void>;
  fetchMessageDetails: (messageId: string) => Promise<void>;
  sendNewMessage: (messageData: SendMessageRequest) => Promise<void>;
  deleteMessages: (messageIds: string[]) => Promise<void>;
  respondToMessage: (responseData: RespondToMessageRequest) => Promise<void>;

  // UI Actions
  setSearchQuery: (query: string) => void;
  setCurrentFilter: (filter: MessageFilter) => void;
  selectMessage: (messageId: string) => void;
  closeDetails: () => void;
  openCompose: () => void;
  closeCompose: () => void;
  toggleMessageSelection: (messageId: string) => void;
  clearSelection: () => void;
  selectAllVisibleMessages: () => void;
  clearError: () => void;

  // Computed properties helpers
  getFilteredMessages: () => MessageResultData[];
  getSelectedMessages: () => MessageResultData[];
  hasSelectedMessages: () => boolean;
}

export const useMessagesStore = create<MessagesState>()(
  subscribeWithSelector((set, get) => ({
    inboxMessages: [],
    sentMessages: [],
    recipients: [],
    selectedMessageId: null,
    selectedMessage: null,
    isDetailsOpen: false,
    isComposeOpen: false,
    isLoading: false,
    isRecipientsLoading: false,
    isSending: false,
    isDeleting: false,
    error: null,
    searchQuery: '',
    currentFilter: 'inbox',
    selectedForDeletion: new Set(),
    lastFetchTime: null,

    fetchInboxMessages: async () => {
      set({ isLoading: true, error: null });
      try {
        const response = await getInboxMessages();
        set({
          inboxMessages: response.Data || [],
          isLoading: false,
          lastFetchTime: Date.now(),
        });
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : 'Failed to fetch messages',
          isLoading: false,
        });
      }
    },

    fetchSentMessages: async () => {
      set({ isLoading: true, error: null });
      try {
        const response = await getSentMessages();
        set({
          sentMessages: response.Data || [],
          isLoading: false,
          lastFetchTime: Date.now(),
        });
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : 'Failed to fetch messages',
          isLoading: false,
        });
      }
    },

    fetchRecipients: async () => {
      set({ isRecipientsLoading: true, error: null });
      try {
        const response = await getRecipients(false, true);
        set({
          recipients: response.Data || [],
          isRecipientsLoading: false,
        });
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : 'Failed to fetch recipients',
          isRecipientsLoading: false,
        });
      }
    },

    fetchMessageDetails: async (messageId: string) => {
      set({ isLoading: true, error: null });
      try {
        const response = await getMessage(messageId);
        set({
          selectedMessage: response.Data,
          selectedMessageId: messageId,
          isDetailsOpen: true,
          isLoading: false,
        });
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : 'Failed to fetch message details',
          isLoading: false,
        });
      }
    },

    sendNewMessage: async (messageData: SendMessageRequest) => {
      set({ isSending: true, error: null });
      try {
        const response = await sendMessage(messageData);
        set({ isSending: false, isComposeOpen: false });
        // Refresh messages after sending
        await get().fetchInboxMessages();
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : 'Failed to send message',
          isSending: false,
        });
      }
    },

    deleteMessages: async (messageIds: string[]) => {
      set({ isDeleting: true, error: null });
      try {
        await Promise.all(messageIds.map((id) => deleteMessage(id)));

        // Remove deleted messages from local state
        const { inboxMessages, sentMessages } = get();
        const updatedInboxMessages = inboxMessages.filter((msg) => !messageIds.includes(msg.MessageId));
        const updatedSentMessages = sentMessages.filter((msg) => !messageIds.includes(msg.MessageId));

        set({
          inboxMessages: updatedInboxMessages,
          sentMessages: updatedSentMessages,
          isDeleting: false,
          selectedForDeletion: new Set(),
          // Close details if current message was deleted
          isDetailsOpen: messageIds.includes(get().selectedMessageId || '') ? false : get().isDetailsOpen,
          selectedMessage: messageIds.includes(get().selectedMessageId || '') ? null : get().selectedMessage,
          selectedMessageId: messageIds.includes(get().selectedMessageId || '') ? null : get().selectedMessageId,
        });
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : 'Failed to delete messages',
          isDeleting: false,
        });
      }
    },

    respondToMessage: async (responseData: RespondToMessageRequest) => {
      set({ isLoading: true, error: null });
      try {
        await respondToMessage(responseData);
        set({ isLoading: false });
        // Refresh messages after responding
        await get().fetchInboxMessages();
        await get().fetchSentMessages();
        // Refresh message details if it's currently open
        if (get().selectedMessageId === responseData.messageId) {
          await get().fetchMessageDetails(responseData.messageId);
        }
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : 'Failed to respond to message',
          isLoading: false,
        });
      }
    },

    setSearchQuery: (query: string) => set({ searchQuery: query }),

    setCurrentFilter: (filter: MessageFilter) => set({ currentFilter: filter }),

    selectMessage: (messageId: string) => {
      const { inboxMessages, sentMessages } = get();
      const allMessages = [...inboxMessages, ...sentMessages];
      const message = allMessages.find((msg) => msg.MessageId === messageId);
      set({
        selectedMessageId: messageId,
        selectedMessage: message || null,
        isDetailsOpen: true,
      });
    },

    closeDetails: () =>
      set({
        isDetailsOpen: false,
        selectedMessageId: null,
        selectedMessage: null,
      }),

    openCompose: () => set({ isComposeOpen: true }),

    closeCompose: () => set({ isComposeOpen: false }),

    toggleMessageSelection: (messageId: string) => {
      const { selectedForDeletion } = get();
      const newSelection = new Set(selectedForDeletion);

      if (newSelection.has(messageId)) {
        newSelection.delete(messageId);
      } else {
        newSelection.add(messageId);
      }

      set({ selectedForDeletion: newSelection });
    },

    clearSelection: () => set({ selectedForDeletion: new Set() }),

    selectAllVisibleMessages: () => {
      const filteredMessages = get().getFilteredMessages();
      const allIds = new Set(filteredMessages.map((msg) => msg.MessageId));
      set({ selectedForDeletion: allIds });
    },

    clearError: () => set({ error: null }),

    getFilteredMessages: () => {
      const { inboxMessages, sentMessages, searchQuery, currentFilter } = get();
      let filtered: MessageResultData[] = [];

      // Apply filter
      if (currentFilter === 'inbox') {
        filtered = [...inboxMessages];
      } else if (currentFilter === 'sent') {
        filtered = [...sentMessages];
      } else {
        // 'all' - combine both and deduplicate by MessageId
        const combinedMessages = [...inboxMessages, ...sentMessages];
        const uniqueMessages = new Map<string, MessageResultData>();

        combinedMessages.forEach((msg) => {
          if (!uniqueMessages.has(msg.MessageId)) {
            uniqueMessages.set(msg.MessageId, msg);
          }
        });

        filtered = Array.from(uniqueMessages.values());
      }

      // Apply search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter((msg) => msg.Subject.toLowerCase().includes(query) || msg.Body.toLowerCase().includes(query) || msg.SendingName.toLowerCase().includes(query));
      }

      // Sort by date (newest first)
      return filtered.sort((a, b) => {
        const dateA = new Date(a.SentOnUtc || a.SentOn).getTime();
        const dateB = new Date(b.SentOnUtc || b.SentOn).getTime();
        return dateB - dateA;
      });
    },

    getSelectedMessages: () => {
      const { inboxMessages, sentMessages, selectedForDeletion } = get();
      const combinedMessages = [...inboxMessages, ...sentMessages];

      // Deduplicate by MessageId
      const uniqueMessages = new Map<string, MessageResultData>();
      combinedMessages.forEach((msg) => {
        if (!uniqueMessages.has(msg.MessageId)) {
          uniqueMessages.set(msg.MessageId, msg);
        }
      });

      const allMessages = Array.from(uniqueMessages.values());
      return allMessages.filter((msg) => selectedForDeletion.has(msg.MessageId));
    },

    hasSelectedMessages: () => {
      return get().selectedForDeletion.size > 0;
    },
  }))
);
