import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { type MessageResultData } from '@/models/v4/messages/messageResultData';
import { useMessagesStore } from '@/stores/messages/store';
import { securityStore, useSecurityStore } from '@/stores/security/store';

import MessagesScreen from '../messages';

// Mock components (reuse from main test file)
jest.mock('@/components/common/loading', () => ({
  Loading: () => {
    const React = require('react');
    const { Text } = require('react-native');
    return React.createElement(Text, {}, 'Loading');
  },
}));

jest.mock('@/components/common/zero-state', () => ({
  __esModule: true,
  default: ({ heading, description, children }: { heading: string; description: string; children?: React.ReactNode }) => {
    const React = require('react');
    const { View, Text } = require('react-native');
    return React.createElement(
      View,
      { testID: 'zero-state' },
      React.createElement(Text, {}, `ZeroState: ${heading}`),
      React.createElement(Text, {}, description),
      children
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
      React.createElement(Text, {}, message.Subject)
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

// Mock stores
jest.mock('@/stores/messages/store');
jest.mock('@/stores/security/store');

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

jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: jest.fn(() => ({ width: 375, height: 812 })),
}));

jest.mock('react-native/Libraries/Alert/Alert', () => ({
  __esModule: true,
  default: { alert: jest.fn() },
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: any) => {
      const translations: Record<string, string> = {
        'messages.title': 'Messages',
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

// Mock API and storage
jest.mock('@/api/security/security', () => ({
  getCurrentUsersRights: jest.fn(),
}));

jest.mock('@/lib/storage', () => ({
  zustandStorage: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

const mockMessages: MessageResultData[] = [
  {
    MessageId: '1',
    Subject: 'Test Message 1',
    SendingName: 'John Doe',
    SendingUserId: 'user1',
    Body: 'Test body',
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
];

const mockStore = {
  isLoading: false,
  error: null,
  searchQuery: '',
  currentFilter: 'inbox' as const,
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

describe('Messages and Security Integration', () => {
  const mockedUseMessagesStore = useMessagesStore as jest.MockedFunction<typeof useMessagesStore>;
  const mockedUseSecurityStore = useSecurityStore as jest.MockedFunction<typeof useSecurityStore>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset stores
    securityStore.setState({
      error: null,
      rights: null,
    });

    mockedUseMessagesStore.mockReturnValue(mockStore);
    (mockedUseMessagesStore as any).getState = jest.fn(() => mockStore);
  });

  it('shows FAB and compose button when user has CanCreateMessage permission', () => {
    // Set security store with permission
    securityStore.setState({
      rights: {
        DepartmentName: 'Test Department',
        DepartmentCode: 'TEST',
        FullName: 'Test User',
        EmailAddress: 'test@test.com',
        DepartmentId: '1',
        IsAdmin: false,
        CanViewPII: false,
        CanCreateCalls: false,
        CanAddNote: false,
        CanCreateMessage: true, // User CAN create messages
        Groups: [],
      },
    });

    // Mock the useSecurityStore to return the permission
    mockedUseSecurityStore.mockReturnValue({
      canUserCreateMessages: true,
      isUserDepartmentAdmin: false,
      canUserCreateCalls: false,
      canUserCreateNotes: false,
      canUserViewPII: false,
      departmentCode: 'TEST',
      isUserGroupAdmin: jest.fn(() => false),
      getRights: jest.fn(),
    });

    render(<MessagesScreen />);

    // Verify FAB is visible
    expect(screen.getByTestId('messages-compose-fab')).toBeTruthy();
  });

  it('hides FAB and compose button when user lacks CanCreateMessage permission', () => {
    // Set security store without permission
    securityStore.setState({
      rights: {
        DepartmentName: 'Test Department',
        DepartmentCode: 'TEST',
        FullName: 'Test User',
        EmailAddress: 'test@test.com',
        DepartmentId: '1',
        IsAdmin: false,
        CanViewPII: false,
        CanCreateCalls: false,
        CanAddNote: false,
        CanCreateMessage: false, // User CANNOT create messages
        Groups: [],
      },
    });

    // Mock the useSecurityStore to return no permission
    mockedUseSecurityStore.mockReturnValue({
      canUserCreateMessages: false,
      isUserDepartmentAdmin: false,
      canUserCreateCalls: false,
      canUserCreateNotes: false,
      canUserViewPII: false,
      departmentCode: 'TEST',
      isUserGroupAdmin: jest.fn(() => false),
      getRights: jest.fn(),
    });

    render(<MessagesScreen />);

    // Verify FAB is hidden
    expect(screen.queryByTestId('messages-compose-fab')).toBeNull();
  });

  it('shows compose button in zero state when user has permission but hides when no permission', () => {
    // Set messages store to return no messages (zero state)
    mockedUseMessagesStore.mockReturnValue({
      ...mockStore,
      getFilteredMessages: jest.fn(() => []), // No messages
    });

    // Test with permission
    securityStore.setState({
      rights: {
        DepartmentName: 'Test Department',
        DepartmentCode: 'TEST',
        FullName: 'Test User',
        EmailAddress: 'test@test.com',
        DepartmentId: '1',
        IsAdmin: false,
        CanViewPII: false,
        CanCreateCalls: false,
        CanAddNote: false,
        CanCreateMessage: true,
        Groups: [],
      },
    });

    mockedUseSecurityStore.mockReturnValue({
      canUserCreateMessages: true,
      isUserDepartmentAdmin: false,
      canUserCreateCalls: false,
      canUserCreateNotes: false,
      canUserViewPII: false,
      departmentCode: 'TEST',
      isUserGroupAdmin: jest.fn(() => false),
      getRights: jest.fn(),
    });

    const { rerender } = render(<MessagesScreen />);

    // Should show the send first message button
    expect(screen.getByText('Send First Message')).toBeTruthy();

    // Now test without permission
    mockedUseSecurityStore.mockReturnValue({
      canUserCreateMessages: false,
      isUserDepartmentAdmin: false,
      canUserCreateCalls: false,
      canUserCreateNotes: false,
      canUserViewPII: false,
      departmentCode: 'TEST',
      isUserGroupAdmin: jest.fn(() => false),
      getRights: jest.fn(),
    });

    rerender(<MessagesScreen />);

    // Should NOT show the send first message button
    expect(screen.queryByText('Send First Message')).toBeNull();
  });

  it('calls openCompose when FAB is pressed (user has permission)', () => {
    mockedUseSecurityStore.mockReturnValue({
      canUserCreateMessages: true,
      isUserDepartmentAdmin: false,
      canUserCreateCalls: false,
      canUserCreateNotes: false,
      canUserViewPII: false,
      departmentCode: 'TEST',
      isUserGroupAdmin: jest.fn(() => false),
      getRights: jest.fn(),
    });

    render(<MessagesScreen />);

    const fab = screen.getByTestId('messages-compose-fab');
    fireEvent.press(fab);

    expect(mockStore.openCompose).toHaveBeenCalledTimes(1);
  });

  it('admin user still needs explicit CanCreateMessage permission', () => {
    // Set admin user without CanCreateMessage permission
    securityStore.setState({
      rights: {
        DepartmentName: 'Test Department',
        DepartmentCode: 'TEST',
        FullName: 'Admin User',
        EmailAddress: 'admin@test.com',
        DepartmentId: '1',
        IsAdmin: true, // User is admin
        CanViewPII: true,
        CanCreateCalls: true,
        CanAddNote: true,
        CanCreateMessage: false, // But CANNOT create messages
        Groups: [],
      },
    });

    mockedUseSecurityStore.mockReturnValue({
      canUserCreateMessages: false, // Based on CanCreateMessage field
      isUserDepartmentAdmin: true,
      canUserCreateCalls: true,
      canUserCreateNotes: true,
      canUserViewPII: true,
      departmentCode: 'TEST',
      isUserGroupAdmin: jest.fn(() => false),
      getRights: jest.fn(),
    });

    render(<MessagesScreen />);

    // Even admin should not see FAB without CanCreateMessage permission
    expect(screen.queryByTestId('messages-compose-fab')).toBeNull();
  });
});
