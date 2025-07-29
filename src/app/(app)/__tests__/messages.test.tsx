import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

import { type MessageResultData } from '@/models/v4/messages/messageResultData';
import { useMessagesStore } from '@/stores/messages/store';

import MessagesScreen from '../messages';

// Mock components
jest.mock('@/components/common/loading', () => ({
  Loading: () => {
    const React = require('react');
    const { Text } = require('react-native');

    return React.createElement(Text, {}, 'Loading');
  },
}));

jest.mock('@/components/common/zero-state', () => ({
  __esModule: true,
  default: ({ heading, description }: { heading: string; description: string }) => {
    const React = require('react');
    const { View, Text } = require('react-native');

    return React.createElement(
      View,
      { testID: 'zero-state' },
      React.createElement(Text, {}, `ZeroState: ${heading}`),
      React.createElement(Text, {}, description)
    );
  },
}));

jest.mock('@/components/messages/message-card', () => ({
  MessageCard: ({ message, onPress }: { message: MessageResultData; onPress: (message: MessageResultData) => void }) => {
    const React = require('react');
    const { Pressable, Text } = require('react-native');

    return React.createElement(
      Pressable,
      {
        testID: `message-card-${message.MessageId}`,
        onPress: () => onPress(message),
      },
      React.createElement(Text, {}, message.Subject),
      React.createElement(Text, {}, `From: ${message.SendingName}`)
    );
  },
}));

jest.mock('@/components/messages/message-details-sheet', () => ({
  MessageDetailsSheet: () => {
    const React = require('react');
    const { Text } = require('react-native');

    return React.createElement(Text, { testID: 'message-details-sheet' }, 'Message Details Sheet');
  },
}));

jest.mock('@/components/messages/compose-message-sheet', () => ({
  ComposeMessageSheet: () => {
    const React = require('react');
    const { Text } = require('react-native');

    return React.createElement(Text, { testID: 'compose-message-sheet' }, 'Compose Message Sheet');
  },
}));

jest.mock('@/components/sidebar/side-menu', () => ({
  SideMenu: ({ onNavigate }: { onNavigate: () => void }) => {
    const React = require('react');
    const { Pressable, Text } = require('react-native');

    return React.createElement(
      Pressable,
      { testID: 'side-menu', onPress: onNavigate },
      React.createElement(Text, {}, 'Side Menu')
    );
  },
}));

// Mock store
jest.mock('@/stores/messages/store', () => ({
  useMessagesStore: jest.fn(),
}));

// Mock other modules
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn() },
  Stack: {
    Screen: ({ children }: any) => {
      const React = require('react');
      return React.createElement('div', { 'data-testid': 'stack-screen' }, children);
    },
  },
  useFocusEffect: jest.fn((fn) => fn()),
}));

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn((fn) => fn()),
}));

// Mock useWindowDimensions and Alert separately to avoid module issues
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: jest.fn(() => ({ width: 375, height: 812 })),
}));

jest.mock('react-native/Libraries/Alert/Alert', () => ({
  __esModule: true,
  default: {
    alert: jest.fn(),
  },
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: any) => {
      const translations: Record<string, string> = {
        'messages.title': 'Messages',
        'messages.compose': 'Compose',
        'messages.search_placeholder': 'Search messages...',
        'messages.all_messages': 'All Messages',
        'messages.inbox': 'Inbox',
        'messages.sent': 'Sent',
        'messages.no_messages': 'No Messages',
        'messages.no_messages_description': 'You have no messages at this time.',
        'messages.send_first_message': 'Send First Message',
        'messages.showing_count': 'Showing {{count}} messages',
        'common.retry': 'Retry',
      };

      let result = translations[key] || key;

      if (options?.count !== undefined) {
        result = result.replace('{{count}}', options.count.toString());
      }

      return result;
    },
  }),
}));

// Mock UI components with simple implementations
jest.mock('@/components/ui', () => ({
  View: ({ children, ...props }: any) => {
    const React = require('react');
    const { View } = require('react-native');
    return React.createElement(View, props, children);
  },
  FocusAwareStatusBar: () => null,
}));

jest.mock('@/components/ui/safe-area-view', () => ({
  SafeAreaView: ({ children, ...props }: any) => {
    const React = require('react');
    const { View } = require('react-native');
    return React.createElement(View, props, children);
  },
}));

jest.mock('@/components/ui/text', () => ({
  Text: ({ children, ...props }: any) => {
    const React = require('react');
    const { Text } = require('react-native');
    return React.createElement(Text, props, children);
  },
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onPress, ...props }: any) => {
    const React = require('react');
    const { TouchableOpacity } = require('react-native');
    return React.createElement(TouchableOpacity, { ...props, onPress }, children);
  },
  ButtonText: ({ children, ...props }: any) => {
    const React = require('react');
    const { Text } = require('react-native');
    return React.createElement(Text, props, children);
  },
}));

jest.mock('@/components/ui/input', () => ({
  Input: ({ children, ...props }: any) => {
    const React = require('react');
    const { View } = require('react-native');
    return React.createElement(View, props, children);
  },
  InputField: ({ onChangeText, value, placeholder, ...props }: any) => {
    const React = require('react');
    const { TextInput } = require('react-native');
    return React.createElement(TextInput, { ...props, onChangeText, value, placeholder });
  },
}));

jest.mock('@/components/ui/pressable', () => ({
  Pressable: ({ children, onPress, ...props }: any) => {
    const React = require('react');
    const { TouchableOpacity } = require('react-native');
    return React.createElement(TouchableOpacity, { ...props, onPress }, children);
  },
}));

jest.mock('@/components/ui/hstack', () => ({
  HStack: ({ children, ...props }: any) => {
    const React = require('react');
    const { View } = require('react-native');
    return React.createElement(View, props, children);
  },
}));

jest.mock('@/components/ui/vstack', () => ({
  VStack: ({ children, ...props }: any) => {
    const React = require('react');
    const { View } = require('react-native');
    return React.createElement(View, props, children);
  },
}));

jest.mock('@/components/ui/flat-list', () => ({
  FlatList: ({ data, renderItem, ...props }: any) => {
    const React = require('react');
    const { FlatList } = require('react-native');
    return React.createElement(FlatList, { ...props, data, renderItem });
  },
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, ...props }: any) => {
    const React = require('react');
    const { View } = require('react-native');
    return React.createElement(View, props, children);
  },
}));

jest.mock('@/components/ui/fab', () => ({
  Fab: ({ children, onPress, ...props }: any) => {
    const React = require('react');
    const { TouchableOpacity } = require('react-native');
    return React.createElement(TouchableOpacity, { ...props, onPress }, children);
  },
  FabIcon: ({ children, ...props }: any) => {
    const React = require('react');
    const { View } = require('react-native');
    return React.createElement(View, props, children);
  },
}));

jest.mock('@/components/ui/checkbox', () => ({
  Checkbox: ({ children, ...props }: any) => {
    const React = require('react');
    const { View } = require('react-native');
    return React.createElement(View, props, children);
  },
}));

jest.mock('@/components/ui/drawer', () => ({
  Drawer: ({ children, isOpen, ...props }: any) => {
    const React = require('react');
    const { View } = require('react-native');
    return isOpen ? React.createElement(View, props, children) : null;
  },
  DrawerBackdrop: (props: any) => {
    const React = require('react');
    const { View } = require('react-native');
    return React.createElement(View, props);
  },
  DrawerContent: ({ children, ...props }: any) => {
    const React = require('react');
    const { View } = require('react-native');
    return React.createElement(View, props, children);
  },
  DrawerBody: ({ children, ...props }: any) => {
    const React = require('react');
    const { View } = require('react-native');
    return React.createElement(View, props, children);
  },
}));

jest.mock('@/components/ui/actionsheet', () => ({
  Actionsheet: ({ children, isOpen, ...props }: any) => {
    const React = require('react');
    const { View } = require('react-native');
    return isOpen ? React.createElement(View, props, children) : null;
  },
  ActionsheetBackdrop: (props: any) => {
    const React = require('react');
    const { View } = require('react-native');
    return React.createElement(View, props);
  },
  ActionsheetContent: ({ children, ...props }: any) => {
    const React = require('react');
    const { View } = require('react-native');
    return React.createElement(View, props, children);
  },
  ActionsheetItem: ({ children, onPress, ...props }: any) => {
    const React = require('react');
    const { TouchableOpacity } = require('react-native');
    return React.createElement(TouchableOpacity, { ...props, onPress }, children);
  },
  ActionsheetItemText: ({ children, ...props }: any) => {
    const React = require('react');
    const { Text } = require('react-native');
    return React.createElement(Text, props, children);
  },
}));

// Mock lucide icons
jest.mock('lucide-react-native', () => ({
  ChevronDown: () => 'ChevronDown',
  Mail: () => 'Mail',
  Menu: () => 'Menu',
  MessageSquarePlus: () => 'MessageSquarePlus',
  Trash2: () => 'Trash2',
  X: () => 'X',
}));

// Test data
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
    Recipients: [],
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

const mockStore = {
  isLoading: false,
  error: null,
  searchQuery: '',
  currentFilter: 'all' as const,
  selectedForDeletion: new Set<string>(),
  isDetailsOpen: false,
  isComposeOpen: false,
  isDeleting: false,
  inboxMessages: [],
  sentMessages: [],
  setSearchQuery: jest.fn(),
  setCurrentFilter: jest.fn(),
  selectMessage: jest.fn(),
  fetchInboxMessages: jest.fn(),
  fetchSentMessages: jest.fn(),
  getFilteredMessages: jest.fn(() => mockMessages),
  hasSelectedMessages: jest.fn(() => false),
  clearSelection: jest.fn(),
  selectAllVisibleMessages: jest.fn(),
  deleteMessages: jest.fn(),
  openCompose: jest.fn(),
  toggleMessageSelection: jest.fn(),
};

const mockedUseMessagesStore = useMessagesStore as jest.MockedFunction<typeof useMessagesStore>;
// Add getState method to the mocked store
(mockedUseMessagesStore as any).getState = jest.fn(() => mockStore);

describe('MessagesScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseMessagesStore.mockReturnValue(mockStore);
  });

  it('renders the messages screen correctly', () => {
    render(<MessagesScreen />);

    expect(screen.getByPlaceholderText('Search messages...')).toBeTruthy();
    expect(screen.getByText('All Messages')).toBeTruthy();
    expect(screen.getByTestId('messages-search-input')).toBeTruthy();
    expect(screen.getByTestId('messages-filter-button')).toBeTruthy();
  });

  it('displays messages when available', () => {
    render(<MessagesScreen />);

    expect(screen.getByText('Test Message 1')).toBeTruthy();
    expect(screen.getByText('From: John Doe')).toBeTruthy();
    expect(screen.getByText('Test Alert')).toBeTruthy();
    expect(screen.getByText('From: System')).toBeTruthy();
  });

  it('shows loading state when loading', () => {
    mockedUseMessagesStore.mockReturnValue({
      ...mockStore,
      isLoading: true,
      getFilteredMessages: jest.fn(() => []),
    });

    render(<MessagesScreen />);

    expect(screen.getByText('Loading')).toBeTruthy();
  });

  it('shows zero state when no messages', () => {
    mockedUseMessagesStore.mockReturnValue({
      ...mockStore,
      getFilteredMessages: jest.fn(() => []),
    });

    render(<MessagesScreen />);

    expect(screen.getByTestId('zero-state')).toBeTruthy();
    expect(screen.getByText('ZeroState: No Messages')).toBeTruthy();
  });

  it('shows error state when there is an error', () => {
    mockedUseMessagesStore.mockReturnValue({
      ...mockStore,
      error: 'Failed to load messages',
    });

    render(<MessagesScreen />);

    expect(screen.getByText('Failed to load messages')).toBeTruthy();
    expect(screen.getByText('Retry')).toBeTruthy();
  });

  it('handles search input correctly', () => {
    render(<MessagesScreen />);

    const searchInput = screen.getByPlaceholderText('Search messages...');
    fireEvent.changeText(searchInput, 'test query');

    expect(mockStore.setSearchQuery).toHaveBeenCalledWith('test query');
  });

  it('calls openCompose when compose FAB is pressed', () => {
    render(<MessagesScreen />);

    const composeFab = screen.getByTestId('messages-compose-fab');
    fireEvent.press(composeFab);

    expect(mockStore.openCompose).toHaveBeenCalled();
  });

  it('calls selectMessage when a message is pressed', () => {
    render(<MessagesScreen />);

    const messageCard = screen.getByTestId('message-card-1');
    fireEvent.press(messageCard);

    expect(mockStore.selectMessage).toHaveBeenCalledWith('1');
  });

  it('calls fetchInboxMessages and fetchSentMessages on component mount', () => {
    render(<MessagesScreen />);

    expect(mockStore.fetchInboxMessages).toHaveBeenCalled();
    expect(mockStore.fetchSentMessages).toHaveBeenCalled();
  });

  it('shows message count correctly', () => {
    render(<MessagesScreen />);

    expect(screen.getByText('Showing 2 messages')).toBeTruthy();
  });
});
