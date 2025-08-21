import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

import { useAnalytics } from '@/hooks/use-analytics';
import { useDispatchStore } from '@/stores/dispatch/store';
import { useMessagesStore } from '@/stores/messages/store';

import { ComposeMessageSheet } from '../compose-message-sheet';

// Mock analytics
const mockTrackEvent = jest.fn();
jest.mock('@/hooks/use-analytics', () => ({
  useAnalytics: jest.fn(() => ({
    trackEvent: mockTrackEvent,
  })),
}));

// Mock stores
const mockCloseCompose = jest.fn();
const mockSendNewMessage = jest.fn();
const mockFetchRecipients = jest.fn();
const mockFetchDispatchData = jest.fn();

jest.mock('@/stores/messages/store', () => ({
  useMessagesStore: jest.fn(),
}));

jest.mock('@/stores/dispatch/store', () => ({
  useDispatchStore: jest.fn(),
}));

// Mock translations
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: any) => {
      if (options && typeof options === 'object' && 'count' in options) {
        return `${key.replace('{{count}}', options.count)}`;
      }
      return key;
    },
  }),
}));

// Mock Alert
jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());

// Mock lucide icons
jest.mock('lucide-react-native', () => ({
  CalendarDays: ({ size, className }: any) => <div data-testid="calendar-days-icon" />,
  Check: ({ size, className }: any) => <div data-testid="check-icon" />,
  ChevronDown: ({ size, color }: any) => <div data-testid="chevron-down-icon" />,
  Plus: ({ size, className }: any) => <div data-testid="plus-icon" />,
  Send: ({ size, color }: any) => <div data-testid="send-icon" />,
  Users: ({ size, className }: any) => <div data-testid="users-icon" />,
  X: ({ size, className }: any) => <div data-testid="x-icon" />,
}));

// Mock UI components similar to existing test patterns
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
  ActionsheetItem: ({ children, ...props }: any) => {
    const { View } = require('react-native');
    return <View {...props}>{children}</View>;
  },
  ActionsheetItemText: ({ children, ...props }: any) => {
    const { Text } = require('react-native');
    return <Text {...props}>{children}</Text>;
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
  Button: ({ children, onPress, testID, disabled, ...props }: any) => {
    const { Pressable } = require('react-native');
    return (
      <Pressable
        onPress={onPress}
        testID={testID}
        accessibilityState={{ disabled }}
        {...props}
      >
        {children}
      </Pressable>
    );
  },
  ButtonText: ({ children, ...props }: any) => {
    const { Text } = require('react-native');
    return <Text {...props}>{children}</Text>;
  },
}));

jest.mock('../../ui/checkbox', () => ({
  Checkbox: ({ children, ...props }: any) => {
    const { View } = require('react-native');
    return <View {...props}>{children}</View>;
  },
  CheckboxIcon: ({ children, ...props }: any) => {
    const { View } = require('react-native');
    return <View {...props}>{children}</View>;
  },
  CheckboxIndicator: ({ children, ...props }: any) => {
    const { View } = require('react-native');
    return <View {...props}>{children}</View>;
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

jest.mock('../../ui/select', () => ({
  Select: ({ children, selectedValue, onValueChange, ...props }: any) => {
    const { View, Text, Pressable } = require('react-native');
    return (
      <View {...props}>
        {children}
      </View>
    );
  },
  SelectBackdrop: ({ children, ...props }: any) => {
    const { View } = require('react-native');
    return <View {...props}>{children}</View>;
  },
  SelectContent: ({ children, ...props }: any) => {
    const { View } = require('react-native');
    return <View {...props}>{children}</View>;
  },
  SelectDragIndicator: ({ ...props }: any) => {
    const { View } = require('react-native');
    return <View {...props} />;
  },
  SelectDragIndicatorWrapper: ({ children, ...props }: any) => {
    const { View } = require('react-native');
    return <View {...props}>{children}</View>;
  },
  SelectInput: ({ placeholder, value, ...props }: any) => {
    const { Text, Pressable } = require('react-native');
    return (
      <Pressable testID="select-trigger" {...props}>
        <Text>{value || placeholder}</Text>
      </Pressable>
    );
  },
  SelectItem: ({ label, value, ...props }: any) => {
    const { Text, Pressable } = require('react-native');
    return (
      <Pressable testID={`select-item-${value}`} {...props}>
        <Text>{label}</Text>
      </Pressable>
    );
  },
  SelectPortal: ({ children, ...props }: any) => {
    const { View } = require('react-native');
    return <View {...props}>{children}</View>;
  },
  SelectTrigger: ({ children, ...props }: any) => {
    const { View } = require('react-native');
    return <View {...props}>{children}</View>;
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

const mockUseAnalytics = useAnalytics as jest.MockedFunction<typeof useAnalytics>;
const mockUseMessagesStore = useMessagesStore as jest.MockedFunction<typeof useMessagesStore>;
const mockUseDispatchStore = useDispatchStore as jest.MockedFunction<typeof useDispatchStore>;

describe('ComposeMessageSheet Analytics', () => {
  const mockDispatchData = {
    users: [
      { Id: 'user1', Name: 'John Doe', Type: 'Personnel', Selected: false },
      { Id: 'user2', Name: 'Jane Smith', Type: 'Personnel', Selected: false },
    ],
    groups: [
      { Id: 'group1', Name: 'Fire Department', Type: 'Groups', Selected: false },
    ],
    roles: [
      { Id: 'role1', Name: 'Captain', Type: 'Roles', Selected: false },
    ],
    units: [
      { Id: 'unit1', Name: 'Engine 1', Type: 'Unit', Selected: false },
    ],
  };

  const defaultMockMessagesStore = {
    recipients: [],
    isComposeOpen: false,
    isSending: false,
    isRecipientsLoading: false,
    closeCompose: mockCloseCompose,
    sendNewMessage: mockSendNewMessage,
    fetchRecipients: mockFetchRecipients,
    // Other required store properties
    inboxMessages: [],
    sentMessages: [],
    selectedMessageId: null,
    selectedMessage: null,
    isDetailsOpen: false,
    isLoading: false,
    isDeleting: false,
    error: null,
    searchQuery: '',
    currentFilter: 'all' as const,
    selectedForDeletion: new Set<string>(),
    lastFetchTime: null,
    fetchInboxMessages: jest.fn(),
    fetchSentMessages: jest.fn(),
    fetchMessageDetails: jest.fn(),
    deleteMessages: jest.fn(),
    respondToMessage: jest.fn(),
    setSearchQuery: jest.fn(),
    setCurrentFilter: jest.fn(),
    selectMessage: jest.fn(),
    closeDetails: jest.fn(),
    openCompose: jest.fn(),
    toggleMessageSelection: jest.fn(),
    clearSelection: jest.fn(),
    selectAllVisibleMessages: jest.fn(),
    clearError: jest.fn(),
    getFilteredMessages: jest.fn(),
    getSelectedMessages: jest.fn(),
    hasSelectedMessages: jest.fn(),
  };

  const defaultMockDispatchStore = {
    data: mockDispatchData,
    fetchDispatchData: mockFetchDispatchData,
    selection: {
      everyone: false,
      users: [],
      groups: [],
      roles: [],
      units: [],
    },
    isLoading: false,
    error: null,
    searchQuery: '',
    setSelection: jest.fn(),
    toggleEveryone: jest.fn(),
    toggleUser: jest.fn(),
    toggleGroup: jest.fn(),
    toggleRole: jest.fn(),
    toggleUnit: jest.fn(),
    setSearchQuery: jest.fn(),
    clearSelection: jest.fn(),
    getFilteredData: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock for analytics
    mockUseAnalytics.mockReturnValue({
      trackEvent: mockTrackEvent,
    });

    // Default mock for messages store
    mockUseMessagesStore.mockReturnValue(defaultMockMessagesStore);

    // Default mock for dispatch store
    mockUseDispatchStore.mockReturnValue(defaultMockDispatchStore);
  });

  describe('Analytics Tracking', () => {
    it('should track view analytics when compose sheet becomes visible', async () => {
      mockUseMessagesStore.mockReturnValue({
        ...defaultMockMessagesStore,
        isComposeOpen: true,
        recipients: [
          { Id: 'recipient1', Name: 'Test Recipient', Type: 'Personnel', Selected: false },
        ],
      });

      render(<ComposeMessageSheet />);

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith('compose_message_sheet_viewed', {
          timestamp: expect.any(String),
          hasRecipients: true,
          recipientCount: 1,
          hasDispatchUsers: true,
          hasDispatchGroups: true,
          hasDispatchRoles: true,
          hasDispatchUnits: true,
          userCount: 2,
          groupCount: 1,
          roleCount: 1,
          unitCount: 1,
          isLoading: false,
          currentMessageType: 0,
          currentTab: 'personnel',
        });
      });
    });

    it('should not track view analytics when compose sheet is closed', () => {
      mockUseMessagesStore.mockReturnValue({
        ...defaultMockMessagesStore,
        isComposeOpen: false,
      });

      render(<ComposeMessageSheet />);

      expect(mockTrackEvent).not.toHaveBeenCalledWith(
        'compose_message_sheet_viewed',
        expect.any(Object)
      );
    });

    it('should track view analytics with loading state', async () => {
      mockUseMessagesStore.mockReturnValue({
        ...defaultMockMessagesStore,
        isComposeOpen: true,
        recipients: [],
        isRecipientsLoading: true,
      });

      mockUseDispatchStore.mockReturnValue({
        ...defaultMockDispatchStore,
        data: {
          users: [],
          groups: [],
          roles: [],
          units: [],
        },
      });

      render(<ComposeMessageSheet />);

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith('compose_message_sheet_viewed', {
          timestamp: expect.any(String),
          hasRecipients: false,
          recipientCount: 0,
          hasDispatchUsers: false,
          hasDispatchGroups: false,
          hasDispatchRoles: false,
          hasDispatchUnits: false,
          userCount: 0,
          groupCount: 0,
          roleCount: 0,
          unitCount: 0,
          isLoading: true,
          currentMessageType: 0,
          currentTab: 'personnel',
        });
      });
    });

    it('should handle analytics errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => { });
      mockTrackEvent.mockImplementation(() => {
        throw new Error('Analytics error');
      });

      mockUseMessagesStore.mockReturnValue({
        ...defaultMockMessagesStore,
        isComposeOpen: true,
      });

      // Should not throw error when analytics fails
      expect(() => {
        render(<ComposeMessageSheet />);
      }).not.toThrow();

      // Should log warning but continue functioning
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'Failed to track compose message sheet view analytics:',
          expect.any(Error)
        );
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Component Behavior', () => {
    it('should render correctly when compose sheet is closed', () => {
      mockUseMessagesStore.mockReturnValue({
        ...defaultMockMessagesStore,
        isComposeOpen: false,
      });

      const { queryByTestId } = render(<ComposeMessageSheet />);

      // Should not render the compose sheet content when closed
      expect(queryByTestId('actionsheet')).toBeNull();
    });

    it('should render correctly when compose sheet is open', () => {
      mockUseMessagesStore.mockReturnValue({
        ...defaultMockMessagesStore,
        isComposeOpen: true,
      });

      const { queryByTestId } = render(<ComposeMessageSheet />);

      // Should render the compose sheet content when open
      expect(queryByTestId('actionsheet')).toBeTruthy();
    });

    it('should fetch recipients and dispatch data when compose opens for the first time', () => {
      mockUseMessagesStore.mockReturnValue({
        ...defaultMockMessagesStore,
        isComposeOpen: true,
        recipients: [], // Empty recipients
      });

      render(<ComposeMessageSheet />);

      expect(mockFetchRecipients).toHaveBeenCalled();
      expect(mockFetchDispatchData).toHaveBeenCalled();
    });

    it('should not fetch recipients when they already exist', () => {
      mockUseMessagesStore.mockReturnValue({
        ...defaultMockMessagesStore,
        isComposeOpen: true,
        recipients: [{ Id: '1', Name: 'Test', Type: 'Personnel', Selected: false }],
      });

      render(<ComposeMessageSheet />);

      expect(mockFetchRecipients).not.toHaveBeenCalled();
      expect(mockFetchDispatchData).not.toHaveBeenCalled();
    });
  });
});
