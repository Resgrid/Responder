import React from 'react';
import { Alert } from 'react-native';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';

import { useAnalytics } from '@/hooks/use-analytics';
import { type MessageResultData } from '@/models/v4/messages/messageResultData';
import { useMessagesStore } from '@/stores/messages/store';

import { MessageDetailsSheet } from '../message-details-sheet';

// Mock analytics
const mockTrackEvent = jest.fn();
jest.mock('@/hooks/use-analytics', () => ({
  useAnalytics: jest.fn(),
}));
const mockUseAnalytics = useAnalytics as jest.MockedFunction<typeof useAnalytics>;

// Mock translation
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: any) => {
      const translations: Record<string, string> = {
        'messages.date_unknown': 'Date unknown',
        'messages.types.message': 'Message',
        'messages.types.poll': 'Poll',
        'messages.types.alert': 'Alert',
        'messages.no_subject': 'No Subject',
        'messages.no_content': 'No content',
        'messages.from': 'From',
        'messages.responded': 'Responded',
        'messages.expired': 'Expired',
        'messages.expires_on': 'Expires On',
        'messages.recipients': 'Recipients',
        'messages.response': 'Response',
        'messages.responded_on': 'Responded on',
        'messages.message_content': 'Message Content',
        'messages.respond_to_message': 'Respond to Message',
        'messages.enter_response': 'Enter your response',
        'messages.note_optional': 'Note (Optional)',
        'messages.enter_note': 'Enter an optional note',
        'messages.responding': 'Responding...',
        'messages.send_response': 'Send Response',
        'messages.error': 'Error',
        'messages.response_required': 'Response is required',
        'messages.respond_failed': 'Failed to respond to message',
        'messages.delete_confirmation_title': 'Delete Message',
        'messages.delete_single_confirmation_message': 'Are you sure you want to delete this message?',
        'common.unknown_user': 'Unknown User',
        'common.cancel': 'Cancel',
        'common.confirm': 'Confirm',
      };

      let result = translations[key] || key;

      if (options?.count !== undefined) {
        result = result.replace('{{count}}', options.count.toString());
      }

      return result;
    },
  }),
}));

// Mock Alert
jest.spyOn(Alert, 'alert');

// Mock stores
const mockCloseDetails = jest.fn();
const mockDeleteMessages = jest.fn();
const mockRespondToMessage = jest.fn();

jest.mock('@/stores/messages/store', () => ({
  useMessagesStore: jest.fn(),
}));
const mockUseMessagesStore = useMessagesStore as jest.MockedFunction<typeof useMessagesStore>;

// Mock UI components
jest.mock('../../ui/actionsheet', () => ({
  Actionsheet: ({ children, isOpen, onClose }: any) => {
    const { View } = require('react-native');
    return isOpen ? <View testID="actionsheet">{children}</View> : null;
  },
  ActionsheetBackdrop: ({ children, ...props }: any) => {
    const { View } = require('react-native');
    return <View {...props}>{children}</View>;
  },
  ActionsheetContent: ({ children, ...props }: any) => {
    const { View } = require('react-native');
    return <View {...props}>{children}</View>;
  },
  ActionsheetDragIndicator: ({ ...props }: any) => {
    const { View } = require('react-native');
    return <View {...props} />;
  },
  ActionsheetDragIndicatorWrapper: ({ children, ...props }: any) => {
    const { View } = require('react-native');
    return <View {...props}>{children}</View>;
  },
}));

jest.mock('../../ui/avatar', () => ({
  Avatar: ({ children, ...props }: any) => {
    const { View } = require('react-native');
    return <View {...props}>{children}</View>;
  },
  AvatarFallbackText: ({ children, ...props }: any) => {
    const { Text } = require('react-native');
    return <Text {...props}>{children}</Text>;
  },
}));

jest.mock('../../ui/badge', () => ({
  Badge: ({ children, ...props }: any) => {
    const { View } = require('react-native');
    return <View {...props}>{children}</View>;
  },
}));

jest.mock('../../ui/box', () => ({
  Box: ({ children, ...props }: any) => {
    const { View } = require('react-native');
    return <View {...props}>{children}</View>;
  },
}));

jest.mock('../../ui/button', () => ({
  Button: ({ children, onPress, testID, ...props }: any) => {
    const { Pressable } = require('react-native');
    return (
      <Pressable onPress={onPress} testID={testID} {...props}>
        {children}
      </Pressable>
    );
  },
  ButtonText: ({ children, ...props }: any) => {
    const { Text } = require('react-native');
    return <Text {...props}>{children}</Text>;
  },
}));

jest.mock('../../ui/divider', () => ({
  Divider: ({ ...props }: any) => {
    const { View } = require('react-native');
    return <View {...props} />;
  },
}));

jest.mock('../../ui/hstack', () => ({
  HStack: ({ children, ...props }: any) => {
    const { View } = require('react-native');
    return <View {...props}>{children}</View>;
  },
}));

jest.mock('../../ui/input', () => ({
  Input: ({ children, ...props }: any) => {
    const { View } = require('react-native');
    return <View {...props}>{children}</View>;
  },
  InputField: ({ value, onChangeText, placeholder, ...props }: any) => {
    const { TextInput } = require('react-native');
    return (
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        testID="response-input"
        {...props}
      />
    );
  },
}));

jest.mock('../../ui/pressable', () => ({
  Pressable: ({ children, onPress, testID, ...props }: any) => {
    const { Pressable: RNPressable } = require('react-native');
    return (
      <RNPressable onPress={onPress} testID={testID} {...props}>
        {children}
      </RNPressable>
    );
  },
}));

jest.mock('../../ui/text', () => ({
  Text: ({ children, ...props }: any) => {
    const { Text: RNText } = require('react-native');
    return <RNText {...props}>{children}</RNText>;
  },
}));

jest.mock('../../ui/textarea', () => ({
  Textarea: ({ children, ...props }: any) => {
    const { View } = require('react-native');
    return <View {...props}>{children}</View>;
  },
  TextareaInput: ({ value, onChangeText, placeholder, ...props }: any) => {
    const { TextInput } = require('react-native');
    return (
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        testID="note-input"
        multiline
        {...props}
      />
    );
  },
}));

jest.mock('../../ui/vstack', () => ({
  VStack: ({ children, ...props }: any) => {
    const { View } = require('react-native');
    return <View {...props}>{children}</View>;
  },
}));

// Mock utils
jest.mock('@/lib/utils', () => ({
  formatDateForDisplay: (date: Date, format: string) => {
    return date.toLocaleDateString();
  },
  parseDateISOString: (dateString: string) => {
    return new Date(dateString);
  },
}));

// Mock lucide icons
jest.mock('lucide-react-native', () => ({
  Check: ({ ...props }: any) => {
    const { View } = require('react-native');
    return <View {...props} testID="check-icon" />;
  },
  Clock: ({ ...props }: any) => {
    const { View } = require('react-native');
    return <View {...props} testID="clock-icon" />;
  },
  Mail: ({ ...props }: any) => {
    const { View } = require('react-native');
    return <View {...props} testID="mail-icon" />;
  },
  MailOpen: ({ ...props }: any) => {
    const { View } = require('react-native');
    return <View {...props} testID="mail-open-icon" />;
  },
  Reply: ({ ...props }: any) => {
    const { View } = require('react-native');
    return <View {...props} testID="reply-icon" />;
  },
  Trash2: ({ ...props }: any) => {
    const { View } = require('react-native');
    return <View {...props} testID="trash-icon" />;
  },
  User: ({ ...props }: any) => {
    const { View } = require('react-native');
    return <View {...props} testID="user-icon" />;
  },
  X: ({ ...props }: any) => {
    const { View } = require('react-native');
    return <View {...props} testID="x-icon" />;
  },
}));

describe('MessageDetailsSheet', () => {
  const mockMessage: MessageResultData = {
    MessageId: '1',
    Subject: 'Test Message Subject',
    SendingName: 'John Doe',
    SendingUserId: 'user123',
    Body: 'This is a test message body with important information.',
    SentOn: '2023-12-01T10:00:00Z',
    SentOnUtc: '2023-12-01T10:00:00Z',
    Type: 1, // Poll
    ExpiredOn: '2030-12-15T10:00:00Z', // Future date (well beyond 2026)
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
        RespondedOn: '2023-12-02T11:00:00Z',
        Response: 'Yes',
        Note: 'Test note',
      },
      {
        MessageId: '1',
        UserId: 'user3',
        Name: 'Bob Johnson',
        RespondedOn: '',
        Response: '',
        Note: '',
      },
    ],
  };

  const mockBasicMessage: MessageResultData = {
    MessageId: '2',
    Subject: '',
    SendingName: '',
    SendingUserId: 'system',
    Body: '',
    SentOn: '2023-12-01T10:00:00Z',
    SentOnUtc: '2023-12-01T10:00:00Z',
    Type: 0, // Message
    ExpiredOn: '',
    Responded: false,
    Note: '',
    RespondedOn: '',
    ResponseType: '',
    IsSystem: true,
    Recipients: [],
  };

  const mockExpiredMessage: MessageResultData = {
    ...mockMessage,
    MessageId: '3',
    Type: 2, // Alert
    ExpiredOn: '2023-11-01T10:00:00Z', // Past date
  };

  const mockRespondedMessage: MessageResultData = {
    ...mockMessage,
    MessageId: '4',
    Responded: true,
    RespondedOn: '2023-12-03T12:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock for analytics
    mockUseAnalytics.mockReturnValue({
      trackEvent: mockTrackEvent,
    });

    // Default mock for messages store
    mockUseMessagesStore.mockReturnValue({
      selectedMessage: mockMessage,
      isDetailsOpen: true,
      isLoading: false,
      closeDetails: mockCloseDetails,
      deleteMessages: mockDeleteMessages,
      respondToMessage: mockRespondToMessage,
      // Other store properties
      inboxMessages: [],
      sentMessages: [],
      selectedMessageId: '1',
      isSelectionMode: false,
      selectedForDeletion: new Set(),
      searchQuery: '',
      currentFilter: 'all',
      error: null,
      fetchInboxMessages: jest.fn(),
      fetchSentMessages: jest.fn(),
      selectMessage: jest.fn(),
      toggleMessageSelection: jest.fn(),
      setSelectionMode: jest.fn(),
      clearSelectionMode: jest.fn(),
      setSearchQuery: jest.fn(),
      setCurrentFilter: jest.fn(),
      sendNewMessage: jest.fn(),
      openCompose: jest.fn(),
      closeCompose: jest.fn(),
      isComposeOpen: false,
      getFilteredMessages: jest.fn(),
      getSelectedMessages: jest.fn(),
    });
  });

  describe('Analytics Tracking', () => {
    it('should track view analytics when sheet becomes visible', async () => {
      render(<MessageDetailsSheet />);

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith('message_details_sheet_viewed', {
          timestamp: expect.any(String),
          messageId: '1',
          messageType: 1,
          messageTypeLabel: 'Poll',
          hasSubject: true,
          hasBody: true,
          hasExpiration: true,
          isExpired: false,
          hasRecipients: true,
          recipientCount: 2,
          hasResponsedRecipients: true,
          isSystemMessage: false,
          userHasResponded: false,
          canRespond: true,
          sendingUserId: 'user123',
        });
      });
    });

    it('should track view analytics for basic message without optional fields', async () => {
      mockUseMessagesStore.mockReturnValue({
        selectedMessage: mockBasicMessage,
        isDetailsOpen: true,
        isLoading: false,
        closeDetails: mockCloseDetails,
        deleteMessages: mockDeleteMessages,
        respondToMessage: mockRespondToMessage,
        // Other store properties
        inboxMessages: [],
        sentMessages: [],
        selectedMessageId: '2',
        isSelectionMode: false,
        selectedForDeletion: new Set(),
        searchQuery: '',
        currentFilter: 'all',
        error: null,
        fetchInboxMessages: jest.fn(),
        fetchSentMessages: jest.fn(),
        selectMessage: jest.fn(),
        toggleMessageSelection: jest.fn(),
        setSelectionMode: jest.fn(),
        clearSelectionMode: jest.fn(),
        setSearchQuery: jest.fn(),
        setCurrentFilter: jest.fn(),
        sendNewMessage: jest.fn(),
        openCompose: jest.fn(),
        closeCompose: jest.fn(),
        isComposeOpen: false,
        getFilteredMessages: jest.fn(),
        getSelectedMessages: jest.fn(),
      });

      render(<MessageDetailsSheet />);

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith('message_details_sheet_viewed', {
          timestamp: expect.any(String),
          messageId: '2',
          messageType: 0,
          messageTypeLabel: 'Message',
          hasSubject: false,
          hasBody: false,
          hasExpiration: false,
          isExpired: false,
          hasRecipients: false,
          recipientCount: 0,
          hasResponsedRecipients: false,
          isSystemMessage: true,
          userHasResponded: false,
          canRespond: false, // Messages (type 0) cannot be responded to
          sendingUserId: 'system',
        });
      });
    });

    it('should track view analytics for expired message', async () => {
      mockUseMessagesStore.mockReturnValue({
        selectedMessage: mockExpiredMessage,
        isDetailsOpen: true,
        isLoading: false,
        closeDetails: mockCloseDetails,
        deleteMessages: mockDeleteMessages,
        respondToMessage: mockRespondToMessage,
        // Other store properties
        inboxMessages: [],
        sentMessages: [],
        selectedMessageId: '3',
        isSelectionMode: false,
        selectedForDeletion: new Set(),
        searchQuery: '',
        currentFilter: 'all',
        error: null,
        fetchInboxMessages: jest.fn(),
        fetchSentMessages: jest.fn(),
        selectMessage: jest.fn(),
        toggleMessageSelection: jest.fn(),
        setSelectionMode: jest.fn(),
        clearSelectionMode: jest.fn(),
        setSearchQuery: jest.fn(),
        setCurrentFilter: jest.fn(),
        sendNewMessage: jest.fn(),
        openCompose: jest.fn(),
        closeCompose: jest.fn(),
        isComposeOpen: false,
        getFilteredMessages: jest.fn(),
        getSelectedMessages: jest.fn(),
      });

      render(<MessageDetailsSheet />);

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith('message_details_sheet_viewed', {
          timestamp: expect.any(String),
          messageId: '3',
          messageType: 2,
          messageTypeLabel: 'Alert',
          hasSubject: true,
          hasBody: true,
          hasExpiration: true,
          isExpired: true,
          hasRecipients: true,
          recipientCount: 2,
          hasResponsedRecipients: true,
          isSystemMessage: false,
          userHasResponded: false,
          canRespond: false, // Expired messages cannot be responded to
          sendingUserId: 'user123',
        });
      });
    });

    it('should not track analytics when sheet is not visible', () => {
      mockUseMessagesStore.mockReturnValue({
        selectedMessage: mockMessage,
        isDetailsOpen: false,
        isLoading: false,
        closeDetails: mockCloseDetails,
        deleteMessages: mockDeleteMessages,
        respondToMessage: mockRespondToMessage,
        // Other store properties
        inboxMessages: [],
        sentMessages: [],
        selectedMessageId: '1',
        isSelectionMode: false,
        selectedForDeletion: new Set(),
        searchQuery: '',
        currentFilter: 'all',
        error: null,
        fetchInboxMessages: jest.fn(),
        fetchSentMessages: jest.fn(),
        selectMessage: jest.fn(),
        toggleMessageSelection: jest.fn(),
        setSelectionMode: jest.fn(),
        clearSelectionMode: jest.fn(),
        setSearchQuery: jest.fn(),
        setCurrentFilter: jest.fn(),
        sendNewMessage: jest.fn(),
        openCompose: jest.fn(),
        closeCompose: jest.fn(),
        isComposeOpen: false,
        getFilteredMessages: jest.fn(),
        getSelectedMessages: jest.fn(),
      });

      render(<MessageDetailsSheet />);

      expect(mockTrackEvent).not.toHaveBeenCalled();
    });

    it('should not track analytics when no message is selected', () => {
      mockUseMessagesStore.mockReturnValue({
        selectedMessage: null,
        isDetailsOpen: true,
        isLoading: false,
        closeDetails: mockCloseDetails,
        deleteMessages: mockDeleteMessages,
        respondToMessage: mockRespondToMessage,
        // Other store properties
        inboxMessages: [],
        sentMessages: [],
        selectedMessageId: null,
        isSelectionMode: false,
        selectedForDeletion: new Set(),
        searchQuery: '',
        currentFilter: 'all',
        error: null,
        fetchInboxMessages: jest.fn(),
        fetchSentMessages: jest.fn(),
        selectMessage: jest.fn(),
        toggleMessageSelection: jest.fn(),
        setSelectionMode: jest.fn(),
        clearSelectionMode: jest.fn(),
        setSearchQuery: jest.fn(),
        setCurrentFilter: jest.fn(),
        sendNewMessage: jest.fn(),
        openCompose: jest.fn(),
        closeCompose: jest.fn(),
        isComposeOpen: false,
        getFilteredMessages: jest.fn(),
        getSelectedMessages: jest.fn(),
      });

      render(<MessageDetailsSheet />);

      expect(mockTrackEvent).not.toHaveBeenCalled();
    });

    it('should handle analytics errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      mockTrackEvent.mockImplementation(() => {
        throw new Error('Analytics error');
      });

      render(<MessageDetailsSheet />);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to track message details sheet view analytics:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Response Analytics', () => {
    beforeEach(() => {
      mockUseMessagesStore.mockReturnValue({
        selectedMessage: mockMessage,
        isDetailsOpen: true,
        isLoading: false,
        closeDetails: mockCloseDetails,
        deleteMessages: mockDeleteMessages,
        respondToMessage: mockRespondToMessage,
        // Other store properties
        inboxMessages: [],
        sentMessages: [],
        selectedMessageId: '1',
        isSelectionMode: false,
        selectedForDeletion: new Set(),
        searchQuery: '',
        currentFilter: 'all',
        error: null,
        fetchInboxMessages: jest.fn(),
        fetchSentMessages: jest.fn(),
        selectMessage: jest.fn(),
        toggleMessageSelection: jest.fn(),
        setSelectionMode: jest.fn(),
        clearSelectionMode: jest.fn(),
        setSearchQuery: jest.fn(),
        setCurrentFilter: jest.fn(),
        sendNewMessage: jest.fn(),
        openCompose: jest.fn(),
        closeCompose: jest.fn(),
        isComposeOpen: false,
        getFilteredMessages: jest.fn(),
        getSelectedMessages: jest.fn(),
      });
    });

    it('should track analytics when starting to respond', async () => {
      render(<MessageDetailsSheet />);

      // Clear initial view analytics
      mockTrackEvent.mockClear();

      const replyButton = screen.getByTestId('reply-icon').parent;
      fireEvent.press(replyButton!);

      expect(mockTrackEvent).toHaveBeenCalledWith('message_details_respond_started', {
        timestamp: expect.any(String),
        messageId: '1',
        messageType: 1,
        messageTypeLabel: 'Poll',
      });
    });

    it('should track analytics when cancelling response', async () => {
      render(<MessageDetailsSheet />);

      // Start responding
      const replyButton = screen.getByTestId('reply-icon').parent;
      fireEvent.press(replyButton!);

      // Clear analytics
      mockTrackEvent.mockClear();

      // Cancel response
      const cancelButton = screen.getByText('Cancel');
      fireEvent.press(cancelButton);

      expect(mockTrackEvent).toHaveBeenCalledWith('message_details_respond_cancelled', {
        timestamp: expect.any(String),
        messageId: '1',
        messageType: 1,
        messageTypeLabel: 'Poll',
        hadResponse: false,
        hadNote: false,
      });
    });

    it('should track analytics when cancelling response with content', async () => {
      render(<MessageDetailsSheet />);

      // Start responding
      const replyButton = screen.getByTestId('reply-icon').parent;
      fireEvent.press(replyButton!);

      // Add content
      const responseInput = screen.getByTestId('response-input');
      fireEvent.changeText(responseInput, 'Test response');

      const noteInput = screen.getByTestId('note-input');
      fireEvent.changeText(noteInput, 'Test note');

      // Clear analytics
      mockTrackEvent.mockClear();

      // Cancel response
      const cancelButton = screen.getByText('Cancel');
      fireEvent.press(cancelButton);

      expect(mockTrackEvent).toHaveBeenCalledWith('message_details_respond_cancelled', {
        timestamp: expect.any(String),
        messageId: '1',
        messageType: 1,
        messageTypeLabel: 'Poll',
        hadResponse: true,
        hadNote: true,
      });
    });

    it('should track analytics when sending response', async () => {
      mockRespondToMessage.mockResolvedValue(undefined);

      render(<MessageDetailsSheet />);

      // Start responding
      const replyButton = screen.getByTestId('reply-icon').parent;
      fireEvent.press(replyButton!);

      // Add response
      const responseInput = screen.getByTestId('response-input');
      fireEvent.changeText(responseInput, 'Test response');

      const noteInput = screen.getByTestId('note-input');
      fireEvent.changeText(noteInput, 'Test note');

      // Clear analytics
      mockTrackEvent.mockClear();

      // Send response
      const sendButton = screen.getByText('Send Response');
      fireEvent.press(sendButton);

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith('message_details_response_sent', {
          timestamp: expect.any(String),
          messageId: '1',
          messageType: 1,
          messageTypeLabel: 'Poll',
          hasNote: true,
          responseLength: 13, // "Test response".length
        });
      });
    });

    it('should handle response analytics errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      mockRespondToMessage.mockResolvedValue(undefined);

      render(<MessageDetailsSheet />);

      // Start responding
      const replyButton = screen.getByTestId('reply-icon').parent;
      fireEvent.press(replyButton!);

      // Add response
      const responseInput = screen.getByTestId('response-input');
      fireEvent.changeText(responseInput, 'Test response');

      // Mock analytics error
      mockTrackEvent.mockImplementation(() => {
        throw new Error('Analytics error');
      });

      // Send response
      const sendButton = screen.getByText('Send Response');
      fireEvent.press(sendButton);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to track message response analytics:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Delete Analytics', () => {
    beforeEach(() => {
      mockUseMessagesStore.mockReturnValue({
        selectedMessage: mockMessage,
        isDetailsOpen: true,
        isLoading: false,
        closeDetails: mockCloseDetails,
        deleteMessages: mockDeleteMessages,
        respondToMessage: mockRespondToMessage,
        // Other store properties
        inboxMessages: [],
        sentMessages: [],
        selectedMessageId: '1',
        isSelectionMode: false,
        selectedForDeletion: new Set(),
        searchQuery: '',
        currentFilter: 'all',
        error: null,
        fetchInboxMessages: jest.fn(),
        fetchSentMessages: jest.fn(),
        selectMessage: jest.fn(),
        toggleMessageSelection: jest.fn(),
        setSelectionMode: jest.fn(),
        clearSelectionMode: jest.fn(),
        setSearchQuery: jest.fn(),
        setCurrentFilter: jest.fn(),
        sendNewMessage: jest.fn(),
        openCompose: jest.fn(),
        closeCompose: jest.fn(),
        isComposeOpen: false,
        getFilteredMessages: jest.fn(),
        getSelectedMessages: jest.fn(),
      });
    });

    it('should track analytics when confirming delete', async () => {
      (Alert.alert as jest.Mock).mockImplementation((title, message, buttons) => {
        const confirmButton = buttons?.find((b: any) => b.text === 'Confirm');
        if (confirmButton?.onPress) {
          confirmButton.onPress();
        }
      });

      render(<MessageDetailsSheet />);

      // Clear initial view analytics
      mockTrackEvent.mockClear();

      const deleteButton = screen.getByTestId('trash-icon').parent;
      fireEvent.press(deleteButton!);

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith('message_details_delete_confirmed', {
          timestamp: expect.any(String),
          messageId: '1',
          messageType: 1,
          messageTypeLabel: 'Poll',
        });
      });
    });

    it('should track analytics when cancelling delete', async () => {
      (Alert.alert as jest.Mock).mockImplementation((title, message, buttons) => {
        const cancelButton = buttons?.find((b: any) => b.text === 'Cancel');
        if (cancelButton?.onPress) {
          cancelButton.onPress();
        }
      });

      render(<MessageDetailsSheet />);

      // Clear initial view analytics
      mockTrackEvent.mockClear();

      const deleteButton = screen.getByTestId('trash-icon').parent;
      fireEvent.press(deleteButton!);

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith('message_details_delete_cancelled', {
          timestamp: expect.any(String),
          messageId: '1',
          messageType: 1,
        });
      });
    });

    it('should handle delete analytics errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      mockTrackEvent.mockImplementation(() => {
        throw new Error('Analytics error');
      });

      (Alert.alert as jest.Mock).mockImplementation((title, message, buttons) => {
        const confirmButton = buttons?.find((b: any) => b.text === 'Confirm');
        if (confirmButton?.onPress) {
          confirmButton.onPress();
        }
      });

      render(<MessageDetailsSheet />);

      const deleteButton = screen.getByTestId('trash-icon').parent;
      fireEvent.press(deleteButton!);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to track message delete confirm analytics:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Component Behavior', () => {
    it('should render nothing when no message is selected', () => {
      mockUseMessagesStore.mockReturnValue({
        selectedMessage: null,
        isDetailsOpen: true,
        isLoading: false,
        closeDetails: mockCloseDetails,
        deleteMessages: mockDeleteMessages,
        respondToMessage: mockRespondToMessage,
        // Other store properties
        inboxMessages: [],
        sentMessages: [],
        selectedMessageId: null,
        isSelectionMode: false,
        selectedForDeletion: new Set(),
        searchQuery: '',
        currentFilter: 'all',
        error: null,
        fetchInboxMessages: jest.fn(),
        fetchSentMessages: jest.fn(),
        selectMessage: jest.fn(),
        toggleMessageSelection: jest.fn(),
        setSelectionMode: jest.fn(),
        clearSelectionMode: jest.fn(),
        setSearchQuery: jest.fn(),
        setCurrentFilter: jest.fn(),
        sendNewMessage: jest.fn(),
        openCompose: jest.fn(),
        closeCompose: jest.fn(),
        isComposeOpen: false,
        getFilteredMessages: jest.fn(),
        getSelectedMessages: jest.fn(),
      });

      render(<MessageDetailsSheet />);

      // Should not render the actionsheet when no message is selected
      expect(screen.queryByTestId('actionsheet')).toBeNull();
    });

    it('should show actionsheet when details are open', () => {
      render(<MessageDetailsSheet />);
      expect(screen.getByTestId('actionsheet')).toBeTruthy();
    });

    it('should display message information correctly', () => {
      render(<MessageDetailsSheet />);

      expect(screen.getByText('Test Message Subject')).toBeTruthy();
      expect(screen.getByText('From: John Doe')).toBeTruthy();
      expect(screen.getByText('This is a test message body with important information.')).toBeTruthy();
      expect(screen.getByText('Poll')).toBeTruthy();
    });

    it('should show fallback text for missing information', () => {
      mockUseMessagesStore.mockReturnValue({
        selectedMessage: mockBasicMessage,
        isDetailsOpen: true,
        isLoading: false,
        closeDetails: mockCloseDetails,
        deleteMessages: mockDeleteMessages,
        respondToMessage: mockRespondToMessage,
        // Other store properties
        inboxMessages: [],
        sentMessages: [],
        selectedMessageId: '2',
        isSelectionMode: false,
        selectedForDeletion: new Set(),
        searchQuery: '',
        currentFilter: 'all',
        error: null,
        fetchInboxMessages: jest.fn(),
        fetchSentMessages: jest.fn(),
        selectMessage: jest.fn(),
        toggleMessageSelection: jest.fn(),
        setSelectionMode: jest.fn(),
        clearSelectionMode: jest.fn(),
        setSearchQuery: jest.fn(),
        setCurrentFilter: jest.fn(),
        sendNewMessage: jest.fn(),
        openCompose: jest.fn(),
        closeCompose: jest.fn(),
        isComposeOpen: false,
        getFilteredMessages: jest.fn(),
        getSelectedMessages: jest.fn(),
      });

      render(<MessageDetailsSheet />);

      expect(screen.getByText('No Subject')).toBeTruthy();
      expect(screen.getByText('From: Unknown User')).toBeTruthy();
      expect(screen.getByText('No content')).toBeTruthy();
    });

    it('should not show reply button for expired messages', () => {
      mockUseMessagesStore.mockReturnValue({
        selectedMessage: mockExpiredMessage,
        isDetailsOpen: true,
        isLoading: false,
        closeDetails: mockCloseDetails,
        deleteMessages: mockDeleteMessages,
        respondToMessage: mockRespondToMessage,
        // Other store properties
        inboxMessages: [],
        sentMessages: [],
        selectedMessageId: '3',
        isSelectionMode: false,
        selectedForDeletion: new Set(),
        searchQuery: '',
        currentFilter: 'all',
        error: null,
        fetchInboxMessages: jest.fn(),
        fetchSentMessages: jest.fn(),
        selectMessage: jest.fn(),
        toggleMessageSelection: jest.fn(),
        setSelectionMode: jest.fn(),
        clearSelectionMode: jest.fn(),
        setSearchQuery: jest.fn(),
        setCurrentFilter: jest.fn(),
        sendNewMessage: jest.fn(),
        openCompose: jest.fn(),
        closeCompose: jest.fn(),
        isComposeOpen: false,
        getFilteredMessages: jest.fn(),
        getSelectedMessages: jest.fn(),
      });

      render(<MessageDetailsSheet />);

      expect(screen.queryByTestId('reply-icon')).toBeNull();
    });

    it('should not show reply button for already responded messages', () => {
      mockUseMessagesStore.mockReturnValue({
        selectedMessage: mockRespondedMessage,
        isDetailsOpen: true,
        isLoading: false,
        closeDetails: mockCloseDetails,
        deleteMessages: mockDeleteMessages,
        respondToMessage: mockRespondToMessage,
        // Other store properties
        inboxMessages: [],
        sentMessages: [],
        selectedMessageId: '4',
        isSelectionMode: false,
        selectedForDeletion: new Set(),
        searchQuery: '',
        currentFilter: 'all',
        error: null,
        fetchInboxMessages: jest.fn(),
        fetchSentMessages: jest.fn(),
        selectMessage: jest.fn(),
        toggleMessageSelection: jest.fn(),
        setSelectionMode: jest.fn(),
        clearSelectionMode: jest.fn(),
        setSearchQuery: jest.fn(),
        setCurrentFilter: jest.fn(),
        sendNewMessage: jest.fn(),
        openCompose: jest.fn(),
        closeCompose: jest.fn(),
        isComposeOpen: false,
        getFilteredMessages: jest.fn(),
        getSelectedMessages: jest.fn(),
      });

      render(<MessageDetailsSheet />);

      expect(screen.queryByTestId('reply-icon')).toBeNull();
    });

    it('should not show reply button for basic messages (type 0)', () => {
      mockUseMessagesStore.mockReturnValue({
        selectedMessage: mockBasicMessage,
        isDetailsOpen: true,
        isLoading: false,
        closeDetails: mockCloseDetails,
        deleteMessages: mockDeleteMessages,
        respondToMessage: mockRespondToMessage,
        // Other store properties
        inboxMessages: [],
        sentMessages: [],
        selectedMessageId: '2',
        isSelectionMode: false,
        selectedForDeletion: new Set(),
        searchQuery: '',
        currentFilter: 'all',
        error: null,
        fetchInboxMessages: jest.fn(),
        fetchSentMessages: jest.fn(),
        selectMessage: jest.fn(),
        toggleMessageSelection: jest.fn(),
        setSelectionMode: jest.fn(),
        clearSelectionMode: jest.fn(),
        setSearchQuery: jest.fn(),
        setCurrentFilter: jest.fn(),
        sendNewMessage: jest.fn(),
        openCompose: jest.fn(),
        closeCompose: jest.fn(),
        isComposeOpen: false,
        getFilteredMessages: jest.fn(),
        getSelectedMessages: jest.fn(),
      });

      render(<MessageDetailsSheet />);

      expect(screen.queryByTestId('reply-icon')).toBeNull();
    });
  });

  describe('Timestamp Format', () => {
    it('should have valid ISO timestamp format in analytics', async () => {
      render(<MessageDetailsSheet />);

      await waitFor(() => {
        const trackCall = mockTrackEvent.mock.calls[0];
        const timestamp = trackCall[1].timestamp;

        // Should be valid ISO string
        expect(() => new Date(timestamp).toISOString()).not.toThrow();
        expect(typeof timestamp).toBe('string');
        expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
      });
    });
  });
});
