import { renderHook, act } from '@testing-library/react-native';

import { type MessageResultData } from '@/models/v4/messages/messageResultData';
import { type RecipientsResultData } from '@/models/v4/messages/recipientsResultData';

// Mock the logger
jest.mock('@/lib/logging', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock all API functions
jest.mock('@/api/messaging/messages', () => ({
  getInboxMessages: jest.fn(),
  getSentMessages: jest.fn(),
  getRecipients: jest.fn(),
  getMessage: jest.fn(),
  sendMessage: jest.fn(),
  deleteMessage: jest.fn(),
  respondToMessage: jest.fn(),
}));

import * as messagesApi from '@/api/messaging/messages';
import { useMessagesStore } from '../store';

const mockedApi = messagesApi as jest.Mocked<typeof messagesApi>;

// Mock messages test data
const mockMessages: MessageResultData[] = [
	{
		MessageId: '1',
		Subject: 'Test Message 1',
		SendingName: 'John Doe',
		SendingUserId: 'user1',
		Body: 'This is the content of test message 1',
		SentOn: '2023-12-01T10:00:00Z',
		SentOnUtc: '2023-12-01T10:00:00Z',
		Type: 0,
		ExpiredOn: '',
		Responded: false,
		Note: '',
		RespondedOn: '',
		ResponseType: '',
		IsSystem: false,
		Recipients: [
			{
				MessageId: '1',
				UserId: 'user2',
				Name: 'Jane Smith',
				RespondedOn: '',
				Response: '',
				Note: '',
			},
		],
	},
	{
		MessageId: '2',
		Subject: 'Test Alert',
		SendingName: 'System',
		SendingUserId: 'system',
		Body: 'This is an important alert message',
		SentOn: '2023-12-02T15:30:00Z',
		SentOnUtc: '2023-12-02T15:30:00Z',
		Type: 2,
		ExpiredOn: '2023-12-03T15:30:00Z',
		Responded: true,
		Note: 'Acknowledged',
		RespondedOn: '2023-12-02T16:00:00Z',
		ResponseType: 'ACK',
		IsSystem: true,
		Recipients: [],
	},
];

const mockRecipients: RecipientsResultData[] = [
	{
		Id: 'user1',
		Type: 'Personnel',
		Name: 'John Doe',
		Selected: false,
	},
	{
		Id: 'group1',
		Type: 'Groups',
		Name: 'Fire Team',
		Selected: false,
	},
];

describe('MessagesStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset store state
    useMessagesStore.setState({
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
    });
  });

  describe('fetchMessages', () => {
    it('should fetch messages successfully', async () => {
      mockedApi.getInboxMessages.mockResolvedValue({
        Data: mockMessages,
        PageSize: 0,
        Timestamp: '2023-12-01T10:00:00Z',
        Version: '1.0',
        Node: 'test-node',
        RequestId: 'test-request',
        Status: 'success',
        Environment: 'test',
      });

      const { result } = renderHook(() => useMessagesStore());

      await act(async () => {
        await result.current.fetchInboxMessages();
      });

      expect(result.current.inboxMessages).toEqual(mockMessages);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle fetch messages error', async () => {
      const errorMessage = 'Failed to fetch messages';
      mockedApi.getInboxMessages.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useMessagesStore());

      await act(async () => {
        await result.current.fetchInboxMessages();
      });

      expect(result.current.inboxMessages).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(errorMessage);
    });
  });

  describe('fetchRecipients', () => {
    it('should fetch recipients successfully', async () => {
      mockedApi.getRecipients.mockResolvedValue({
        Data: mockRecipients,
        PageSize: 0,
        Timestamp: '2023-12-01T10:00:00Z',
        Version: '1.0',
        Node: 'test-node',
        RequestId: 'test-request',
        Status: 'success',
        Environment: 'test',
      });

      const { result } = renderHook(() => useMessagesStore());

      await act(async () => {
        await result.current.fetchRecipients();
      });

      expect(result.current.recipients).toEqual(mockRecipients);
      expect(result.current.isRecipientsLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('sendNewMessage', () => {
    it('should send message successfully', async () => {
      mockedApi.sendMessage.mockResolvedValue({
        Id: 'new-message-id',
        PageSize: 0,
        Timestamp: '2023-12-01T10:00:00Z',
        Version: '1.0',
        Node: 'test-node',
        RequestId: 'test-request',
        Status: 'success',
        Environment: 'test',
      });

      mockedApi.getInboxMessages.mockResolvedValue({
        Data: mockMessages,
        PageSize: 0,
        Timestamp: '2023-12-01T10:00:00Z',
        Version: '1.0',
        Node: 'test-node',
        RequestId: 'test-request',
        Status: 'success',
        Environment: 'test',
      });

      const { result } = renderHook(() => useMessagesStore());

      const messageData = {
        subject: 'Test Subject',
        body: 'Test Body',
        type: 0,
        recipients: [{ id: 'user1', type: 1, name: 'John Doe' }],
      };

      await act(async () => {
        await result.current.sendNewMessage(messageData);
      });

      expect(mockedApi.sendMessage).toHaveBeenCalledWith(messageData);
      expect(result.current.isSending).toBe(false);
      expect(result.current.isComposeOpen).toBe(false);
    });
  });

  describe('deleteMessages', () => {
    it('should delete messages successfully', async () => {
      // Set initial messages
      useMessagesStore.setState({ inboxMessages: mockMessages });

      mockedApi.deleteMessage.mockResolvedValue({
        Id: '1',
        PageSize: 0,
        Timestamp: '2023-12-01T10:00:00Z',
        Version: '1.0',
        Node: 'test-node',
        RequestId: 'test-request',
        Status: 'success',
        Environment: 'test',
      });

      const { result } = renderHook(() => useMessagesStore());

      await act(async () => {
        await result.current.deleteMessages(['1']);
      });

      expect(mockedApi.deleteMessage).toHaveBeenCalledWith('1');
      expect(result.current.inboxMessages).toHaveLength(1);
      expect(result.current.inboxMessages[0].MessageId).toBe('2');
      expect(result.current.isDeleting).toBe(false);
    });
  });

  describe('UI Actions', () => {
    it('should handle search query updates', () => {
      const { result } = renderHook(() => useMessagesStore());

      act(() => {
        result.current.setSearchQuery('test query');
      });

      expect(result.current.searchQuery).toBe('test query');
    });

    it('should handle filter changes', () => {
      const { result } = renderHook(() => useMessagesStore());

      act(() => {
        result.current.setCurrentFilter('inbox');
      });

      expect(result.current.currentFilter).toBe('inbox');
    });

    it('should handle message selection', () => {
      useMessagesStore.setState({ inboxMessages: mockMessages });
      const { result } = renderHook(() => useMessagesStore());

      act(() => {
        result.current.selectMessage('1');
      });

      expect(result.current.selectedMessageId).toBe('1');
      expect(result.current.selectedMessage).toEqual(mockMessages[0]);
      expect(result.current.isDetailsOpen).toBe(true);
    });

    it('should handle closing details', () => {
      useMessagesStore.setState({
        selectedMessageId: '1',
        selectedMessage: mockMessages[0],
        isDetailsOpen: true,
      });

      const { result } = renderHook(() => useMessagesStore());

      act(() => {
        result.current.closeDetails();
      });

      expect(result.current.selectedMessageId).toBeNull();
      expect(result.current.selectedMessage).toBeNull();
      expect(result.current.isDetailsOpen).toBe(false);
    });

    it('should handle compose modal', () => {
      const { result } = renderHook(() => useMessagesStore());

      act(() => {
        result.current.openCompose();
      });

      expect(result.current.isComposeOpen).toBe(true);

      act(() => {
        result.current.closeCompose();
      });

      expect(result.current.isComposeOpen).toBe(false);
    });

    it('should handle message selection for deletion', () => {
      const { result } = renderHook(() => useMessagesStore());

      act(() => {
        result.current.toggleMessageSelection('1');
      });

      expect(result.current.selectedForDeletion.has('1')).toBe(true);

      act(() => {
        result.current.toggleMessageSelection('1');
      });

      expect(result.current.selectedForDeletion.has('1')).toBe(false);
    });

    it('should handle selecting all visible messages', () => {
      useMessagesStore.setState({ inboxMessages: mockMessages });
      const { result } = renderHook(() => useMessagesStore());

      act(() => {
        result.current.selectAllVisibleMessages();
      });

      expect(result.current.selectedForDeletion.size).toBe(2);
      expect(result.current.selectedForDeletion.has('1')).toBe(true);
      expect(result.current.selectedForDeletion.has('2')).toBe(true);
    });

    it('should clear selection', () => {
      useMessagesStore.setState({
        selectedForDeletion: new Set(['1', '2']),
      });

      const { result } = renderHook(() => useMessagesStore());

      act(() => {
        result.current.clearSelection();
      });

      expect(result.current.selectedForDeletion.size).toBe(0);
    });
  });

  describe('Computed Properties', () => {
    beforeEach(() => {
      useMessagesStore.setState({ inboxMessages: mockMessages });
    });

    it('should filter messages correctly', () => {
      const { result } = renderHook(() => useMessagesStore());

      // Test inbox filter (all messages in inboxMessages)
      act(() => {
        result.current.setCurrentFilter('inbox');
      });

      let filtered = result.current.getFilteredMessages();
      expect(filtered).toHaveLength(2); // Both messages are in inboxMessages
      expect(filtered.map(m => m.MessageId)).toEqual(expect.arrayContaining(['1', '2']));

      // Test sent filter (messages in sentMessages - none set in this test)
      act(() => {
        result.current.setCurrentFilter('sent');
      });

      filtered = result.current.getFilteredMessages();
      expect(filtered).toHaveLength(0); // No sent messages in sentMessages

      // Test all filter
      act(() => {
        result.current.setCurrentFilter('all');
      });

      filtered = result.current.getFilteredMessages();
      expect(filtered).toHaveLength(2); // All messages from inboxMessages
    });

    it('should search messages correctly', () => {
      const { result } = renderHook(() => useMessagesStore());

      act(() => {
        result.current.setSearchQuery('alert');
      });

      const filtered = result.current.getFilteredMessages();
      expect(filtered).toHaveLength(1);
      expect(filtered[0].MessageId).toBe('2');
    });

    it('should get selected messages correctly', () => {
      useMessagesStore.setState({
        inboxMessages: mockMessages,
        selectedForDeletion: new Set(['1']),
      });

      const { result } = renderHook(() => useMessagesStore());

      const selected = result.current.getSelectedMessages();
      expect(selected).toHaveLength(1);
      expect(selected[0].MessageId).toBe('1');
    });

    it('should check if has selected messages', () => {
      const { result } = renderHook(() => useMessagesStore());

      expect(result.current.hasSelectedMessages()).toBe(false);

      act(() => {
        result.current.toggleMessageSelection('1');
      });

      expect(result.current.hasSelectedMessages()).toBe(true);
    });

    it('should deduplicate messages when combining inbox and sent in getFilteredMessages', () => {
      const { result } = renderHook(() => useMessagesStore());

      const duplicateMessage: MessageResultData = {
        MessageId: '1',
        Subject: 'Duplicate Message',
        SendingName: 'John Doe',
        SendingUserId: 'user1',
        Body: 'This message appears in both inbox and sent',
        SentOn: '2023-01-01T10:00:00Z',
        SentOnUtc: '2023-01-01T10:00:00Z',
        Type: 0,
        ExpiredOn: '',
        Responded: false,
        Note: '',
        RespondedOn: '',
        ResponseType: '',
        IsSystem: false,
        Recipients: [],
      };

      const uniqueMessage: MessageResultData = {
        MessageId: '2',
        Subject: 'Unique Message',
        SendingName: 'Jane Doe',
        SendingUserId: 'user2',
        Body: 'This is a unique message',
        SentOn: '2023-01-02T10:00:00Z',
        SentOnUtc: '2023-01-02T10:00:00Z',
        Type: 0,
        ExpiredOn: '',
        Responded: false,
        Note: '',
        RespondedOn: '',
        ResponseType: '',
        IsSystem: false,
        Recipients: [],
      };

      act(() => {
        result.current.setCurrentFilter('all');
        useMessagesStore.setState({
          inboxMessages: [duplicateMessage, uniqueMessage],
          sentMessages: [duplicateMessage], // Same message appears in both arrays
        });
      });

      const filtered = result.current.getFilteredMessages();
      expect(filtered).toHaveLength(2); // Should only have 2 unique messages
      expect(filtered.map(m => m.MessageId)).toEqual(expect.arrayContaining(['1', '2']));
      
      // Verify no duplicates exist
      const messageIds = filtered.map(m => m.MessageId);
      const uniqueIds = [...new Set(messageIds)];
      expect(messageIds).toHaveLength(uniqueIds.length);
    });

    it('should deduplicate messages in getSelectedMessages', () => {
      const { result } = renderHook(() => useMessagesStore());

      const duplicateMessage: MessageResultData = {
        MessageId: '1',
        Subject: 'Duplicate Message',
        SendingName: 'John Doe',
        SendingUserId: 'user1',
        Body: 'This message appears in both inbox and sent',
        SentOn: '2023-01-01T10:00:00Z',
        SentOnUtc: '2023-01-01T10:00:00Z',
        Type: 0,
        ExpiredOn: '',
        Responded: false,
        Note: '',
        RespondedOn: '',
        ResponseType: '',
        IsSystem: false,
        Recipients: [],
      };

      act(() => {
        useMessagesStore.setState({
          inboxMessages: [duplicateMessage],
          sentMessages: [duplicateMessage], // Same message in both arrays
          selectedForDeletion: new Set(['1']),
        });
      });

      const selected = result.current.getSelectedMessages();
      expect(selected).toHaveLength(1); // Should only return one instance
      expect(selected[0].MessageId).toBe('1');
    });
  });
});
