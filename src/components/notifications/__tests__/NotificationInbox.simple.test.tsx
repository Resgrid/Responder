import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';

// Mock dependencies first
jest.mock('@novu/react-native', () => ({
  useNotifications: jest.fn(),
}));

jest.mock('@/stores/app/core-store', () => ({
  useCoreStore: jest.fn(),
}));

jest.mock('@/stores/toast/store', () => ({
  useToastStore: jest.fn(),
}));

jest.mock('@/api/novu/inbox', () => ({
  deleteMessage: jest.fn(),
}));

jest.mock('nativewind', () => ({
  colorScheme: {
    get: jest.fn(() => 'light'),
    set: jest.fn(),
    toggle: jest.fn(),
    watch: jest.fn(),
  },
  cssInterop: jest.fn(),
}));

// Simple mock for UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onPress, testID }: any) => {
    const React = require('react');
    const { Pressable, Text } = require('react-native');
    return React.createElement(
      Pressable,
      { onPress, testID },
      React.createElement(Text, {}, children)
    );
  },
}));

jest.mock('@/components/ui/modal', () => ({
  Modal: ({ children, isOpen }: any) => isOpen ? children : null,
  ModalBackdrop: ({ children }: any) => children,
  ModalBody: ({ children }: any) => children,
  ModalContent: ({ children }: any) => children,
  ModalFooter: ({ children }: any) => children,
  ModalHeader: ({ children }: any) => children,
}));

jest.mock('@/components/ui/text', () => ({
  Text: ({ children, ...props }: any) => {
    const React = require('react');
    const { Text: RNText } = require('react-native');
    return React.createElement(RNText, props, children);
  },
}));

// Mock icons as simple text components
jest.mock('lucide-react-native', () => ({
  CheckCircle: ({ size, color }: any) => {
    const React = require('react');
    const { Text } = require('react-native');
    return React.createElement(Text, {}, 'CheckCircle-Icon');
  },
  ChevronRight: ({ size, color }: any) => {
    const React = require('react');
    const { Text } = require('react-native');
    return React.createElement(Text, {}, 'ChevronRight-Icon');
  },
  Circle: ({ size, color }: any) => {
    const React = require('react');
    const { Text } = require('react-native');
    return React.createElement(Text, {}, 'Circle-Icon');
  },
  ExternalLink: ({ size, color }: any) => {
    const React = require('react');
    const { Text } = require('react-native');
    return React.createElement(Text, {}, 'ExternalLink-Icon');
  },
  MoreVertical: ({ size, color }: any) => {
    const React = require('react');
    const { Text } = require('react-native');
    return React.createElement(Text, {}, 'MoreVertical-Icon');
  },
  Trash2: ({ size, color }: any) => {
    const React = require('react');
    const { Text } = require('react-native');
    return React.createElement(Text, {}, 'Trash2-Icon');
  },
  X: ({ size, color }: any) => {
    const React = require('react');
    const { Text } = require('react-native');
    return React.createElement(Text, {}, 'X-Icon');
  },
  ArrowLeft: ({ size, color }: any) => {
    const React = require('react');
    const { Text } = require('react-native');
    return React.createElement(Text, {}, 'ArrowLeft-Icon');
  },
  Calendar: ({ size, color }: any) => {
    const React = require('react');
    const { Text } = require('react-native');
    return React.createElement(Text, {}, 'Calendar-Icon');
  },
}));

// Import after mocks
import { useNotifications } from '@novu/react-native';
import { NotificationInbox } from '../NotificationInbox';
import { useCoreStore } from '@/stores/app/core-store';
import { useToastStore } from '@/stores/toast/store';
import { deleteMessage } from '@/api/novu/inbox';

const mockUseNotifications = useNotifications as jest.MockedFunction<typeof useNotifications>;
const mockUseCoreStore = useCoreStore as unknown as jest.MockedFunction<any>;
const mockUseToastStore = useToastStore as unknown as jest.MockedFunction<any>;
const mockDeleteMessage = deleteMessage as jest.MockedFunction<typeof deleteMessage>;

describe('NotificationInbox', () => {
  const mockOnClose = jest.fn();
  const mockShowToast = jest.fn();
  const mockRefetch = jest.fn();
  const mockFetchMore = jest.fn();

  const mockNotifications = [
    {
      id: '1',
      title: 'Test Notification 1',
      body: 'This is a test notification',
      createdAt: '2024-01-01T10:00:00Z',
      read: false,
      type: 'info',
      payload: {
        referenceId: 'ref-1',
        referenceType: 'call',
        metadata: {},
      },
    },
    {
      id: '2',
      title: 'Test Notification 2',
      body: 'This is another test notification',
      createdAt: '2024-01-01T11:00:00Z',
      read: true,
      type: 'info',
      payload: {
        referenceId: 'ref-2',
        referenceType: 'message',
        metadata: {},
      },
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseNotifications.mockReturnValue({
      notifications: mockNotifications as any,
      isLoading: false,
      fetchMore: mockFetchMore,
      hasMore: false,
      refetch: mockRefetch,
      isFetching: false,
      readAll: jest.fn(),
      archiveAll: jest.fn(),
      archiveAllRead: jest.fn(),
    });

    mockUseCoreStore.mockImplementation((selector: any) => {
      const state = {
        activeUnitId: 'unit-1',
        config: { apiUrl: 'test-url' },
      };
      return selector(state);
    });

    mockUseToastStore.mockImplementation((selector: any) => {
      const state = {
        showToast: mockShowToast,
        toasts: [],
        removeToast: jest.fn(),
      };
      return selector(state);
    });

    mockDeleteMessage.mockResolvedValue(undefined);
  });

  it('renders correctly when closed', () => {
    const { queryByText } = render(
      <NotificationInbox isOpen={false} onClose={mockOnClose} />
    );

    expect(queryByText('Notifications')).toBeNull();
  });

  it('renders notifications when open', () => {
    const { getByText } = render(
      <NotificationInbox isOpen={true} onClose={mockOnClose} />
    );

    expect(getByText('Notifications')).toBeTruthy();
    expect(getByText('This is a test notification')).toBeTruthy();
    expect(getByText('This is another test notification')).toBeTruthy();
  });

  it('handles empty notifications state', () => {
    mockUseNotifications.mockReturnValue({
      notifications: [] as any,
      isLoading: false,
      fetchMore: mockFetchMore,
      hasMore: false,
      refetch: mockRefetch,
      isFetching: false,
      readAll: jest.fn(),
      archiveAll: jest.fn(),
      archiveAllRead: jest.fn(),
    });

    const { getByText } = render(
      <NotificationInbox isOpen={true} onClose={mockOnClose} />
    );

    expect(getByText('No updates available')).toBeTruthy();
  });

  it('handles loading state', () => {
    mockUseNotifications.mockReturnValue({
      notifications: undefined as any,
      isLoading: true,
      fetchMore: mockFetchMore,
      hasMore: false,
      refetch: mockRefetch,
      isFetching: false,
      readAll: jest.fn(),
      archiveAll: jest.fn(),
      archiveAllRead: jest.fn(),
    });

    const { getByText } = render(
      <NotificationInbox isOpen={true} onClose={mockOnClose} />
    );

    expect(getByText('Notifications')).toBeTruthy();
  });
});
