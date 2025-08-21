import React from 'react';
import { render } from '@testing-library/react-native';

import { useAnalytics } from '@/hooks/use-analytics';
import { useDispatchStore } from '@/stores/dispatch/store';
import { useMessagesStore } from '@/stores/messages/store';

import { ComposeMessageSheet } from '../compose-message-sheet';

// Mock lucide icons
jest.mock('lucide-react-native', () => ({
  CalendarDays: 'CalendarDays',
  Check: 'Check',
  ChevronDown: 'ChevronDown',
  Plus: 'Plus',
  Send: 'Send',
  Users: 'Users',
  X: 'X',
}));

// Mock analytics
const mockTrackEvent = jest.fn();
jest.mock('@/hooks/use-analytics', () => ({
  useAnalytics: jest.fn(),
}));

// Mock stores
jest.mock('@/stores/messages/store', () => ({
  useMessagesStore: jest.fn(),
}));

jest.mock('@/stores/dispatch/store', () => ({
  useDispatchStore: jest.fn(),
}));

// Mock translations
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Mock UI components
jest.mock('../../ui/actionsheet', () => ({
  Actionsheet: ({ children, isOpen }: any) =>
    isOpen ? <div data-testid="actionsheet">{children}</div> : null,
  ActionsheetBackdrop: ({ children }: any) => <div>{children}</div>,
  ActionsheetContent: ({ children }: any) => <div>{children}</div>,
  ActionsheetDragIndicator: () => <div />,
  ActionsheetDragIndicatorWrapper: ({ children }: any) => <div>{children}</div>,
}));

jest.mock('../../ui/vstack', () => ({
  VStack: ({ children }: any) => <div>{children}</div>,
}));

jest.mock('../../ui/hstack', () => ({
  HStack: ({ children }: any) => <div>{children}</div>,
}));

jest.mock('../../ui/text', () => ({
  Text: ({ children }: any) => <span>{children}</span>,
}));

jest.mock('../../ui/button', () => ({
  Button: ({ children, onPress, testID }: any) => (
    <button onClick={onPress} data-testid={testID}>
      {children}
    </button>
  ),
  ButtonText: ({ children }: any) => <span>{children}</span>,
}));

jest.mock('../../ui/input', () => ({
  Input: ({ children }: any) => <div>{children}</div>,
  InputField: ({ placeholder }: any) => <input placeholder={placeholder} />,
}));

jest.mock('../../ui/textarea', () => ({
  Textarea: ({ children }: any) => <div>{children}</div>,
  TextareaInput: ({ placeholder }: any) => <textarea placeholder={placeholder} />,
}));

jest.mock('../../ui/select', () => ({
  Select: ({ children }: any) => <div>{children}</div>,
  SelectTrigger: ({ children }: any) => <div>{children}</div>,
  SelectInput: ({ placeholder }: any) => <div>{placeholder}</div>,
  SelectPortal: ({ children }: any) => <div>{children}</div>,
  SelectBackdrop: () => <div />,
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectDragIndicatorWrapper: ({ children }: any) => <div>{children}</div>,
  SelectDragIndicator: () => <div />,
  SelectItem: ({ label }: any) => <div>{label}</div>,
}));

jest.mock('../../ui/pressable', () => ({
  Pressable: ({ children, onPress }: any) => (
    <button onClick={onPress}>{children}</button>
  ),
}));

jest.mock('../../ui/avatar', () => ({
  Avatar: ({ children }: any) => <div>{children}</div>,
  AvatarFallbackText: ({ children }: any) => <span>{children}</span>,
}));

jest.mock('../../ui/divider', () => ({
  Divider: () => <div />,
}));

jest.mock('../../ui/box', () => ({
  Box: ({ children }: any) => <div>{children}</div>,
}));

jest.mock('../../ui/badge', () => ({
  Badge: ({ children }: any) => <div>{children}</div>,
}));

jest.mock('../../ui/checkbox', () => ({
  Checkbox: ({ children }: any) => <div>{children}</div>,
  CheckboxIcon: ({ children }: any) => <div>{children}</div>,
  CheckboxIndicator: ({ children }: any) => <div>{children}</div>,
}));

const mockUseAnalytics = useAnalytics as jest.MockedFunction<typeof useAnalytics>;
const mockUseMessagesStore = useMessagesStore as jest.MockedFunction<typeof useMessagesStore>;
const mockUseDispatchStore = useDispatchStore as jest.MockedFunction<typeof useDispatchStore>;

describe('ComposeMessageSheet Analytics', () => {
  const defaultMockDispatchStore = {
    data: {
      users: [{ Id: 'user1', Name: 'John Doe', Type: 'Personnel', Selected: false }],
      groups: [],
      roles: [],
      units: [],
    },
    fetchDispatchData: jest.fn(),
    selection: { everyone: false, users: [], groups: [], roles: [], units: [] },
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

  const defaultMockMessagesStore = {
    recipients: [],
    isComposeOpen: false,
    isSending: false,
    isRecipientsLoading: false,
    closeCompose: jest.fn(),
    sendNewMessage: jest.fn(),
    fetchRecipients: jest.fn(),
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

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseAnalytics.mockReturnValue({
      trackEvent: mockTrackEvent,
    });

    mockUseMessagesStore.mockReturnValue(defaultMockMessagesStore);
    mockUseDispatchStore.mockReturnValue(defaultMockDispatchStore);
  });

  it('should track analytics when compose sheet becomes visible', () => {
    mockUseMessagesStore.mockReturnValue({
      ...defaultMockMessagesStore,
      isComposeOpen: true,
    });

    render(<ComposeMessageSheet />);

    expect(mockTrackEvent).toHaveBeenCalledWith('compose_message_sheet_viewed', {
      timestamp: expect.any(String),
      hasRecipients: false,
      recipientCount: 0,
      hasDispatchUsers: true,
      hasDispatchGroups: false,
      hasDispatchRoles: false,
      hasDispatchUnits: false,
      userCount: 1,
      groupCount: 0,
      roleCount: 0,
      unitCount: 0,
      isLoading: false,
      currentMessageType: 0,
      currentTab: 'personnel',
    });
  });

  it('should not render when compose sheet is closed', () => {
    mockUseMessagesStore.mockReturnValue({
      ...defaultMockMessagesStore,
      isComposeOpen: false,
    });

    const { queryByTestId } = render(<ComposeMessageSheet />);

    expect(queryByTestId('actionsheet')).toBeNull();
    expect(mockTrackEvent).not.toHaveBeenCalled();
  });

  it('should render correctly when compose sheet is open', () => {
    mockUseMessagesStore.mockReturnValue({
      ...defaultMockMessagesStore,
      isComposeOpen: true,
    });

    const { getByTestId } = render(<ComposeMessageSheet />);

    expect(getByTestId('actionsheet')).toBeTruthy();
    expect(mockTrackEvent).toHaveBeenCalledWith('compose_message_sheet_viewed', expect.any(Object));
  });
});
