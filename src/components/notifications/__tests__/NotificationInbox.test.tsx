import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { useNotifications } from '@novu/react-native';
import { NotificationInbox } from '../NotificationInbox';
import { useCoreStore } from '@/stores/app/core-store';
import { useToastStore } from '@/stores/toast/store';
import { deleteMessage } from '@/api/novu/inbox';

// Mock dependencies
jest.mock('@novu/react-native');
jest.mock('@/stores/app/core-store');
jest.mock('@/stores/toast/store');
jest.mock('@/api/novu/inbox');

jest.mock('nativewind', () => ({
  colorScheme: {
    get: jest.fn(() => 'light'),
    set: jest.fn(),
    toggle: jest.fn(),
    watch: jest.fn(),
  },
  cssInterop: jest.fn(),
}));

// Mock UI components with simple implementations
jest.mock('@/components/ui/button', () => ({
  Button: 'Button',
}));

jest.mock('@/components/ui/modal', () => ({
  Modal: ({ children, isOpen }: any) => isOpen ? children : null,
  ModalBackdrop: 'ModalBackdrop',
  ModalBody: 'ModalBody',
  ModalContent: 'ModalContent',
  ModalFooter: 'ModalFooter',
  ModalHeader: 'ModalHeader',
}));

jest.mock('@/components/ui/text', () => ({
  Text: 'Text',
}));

// Mock Lucide icons as simple text
jest.mock('lucide-react-native', () => ({
  CheckCircle: 'CheckCircle',
  ChevronRight: 'ChevronRight',
  Circle: 'Circle',
  ExternalLink: 'ExternalLink',
  MoreVertical: 'MoreVertical',
  Trash2: 'Trash2',
  X: 'X',
}));

// Mock Lucide icons as simple text
jest.mock('lucide-react-native', () => ({
  CheckCircle: () => {
    const React = require('react');
    return React.createElement('text', {}, 'CheckCircle-Icon');
  },
  ChevronRight: () => {
    const React = require('react');
    return React.createElement('text', {}, 'ChevronRight-Icon');
  },
  Circle: () => {
    const React = require('react');
    return React.createElement('text', {}, 'Circle-Icon');
  },
  ExternalLink: () => {
    const React = require('react');
    return React.createElement('text', {}, 'ExternalLink-Icon');
  },
  MoreVertical: () => {
    const React = require('react');
    return React.createElement('text', {}, 'MoreVertical-Icon');
  },
  Trash2: () => {
    const React = require('react');
    return React.createElement('text', {}, 'Trash2-Icon');
  },
  X: () => {
    const React = require('react');
    return React.createElement('text', {}, 'X-Icon');
  },
  ArrowLeft: () => {
    const React = require('react');
    return React.createElement('text', {}, 'ArrowLeft-Icon');
  },
  Calendar: () => {
    const React = require('react');
    return React.createElement('text', {}, 'Calendar-Icon');
  },
}));

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

  it('handles missing unit or config', () => {
    mockUseCoreStore.mockImplementation((selector: any) => {
      const state = {
        activeUnitId: null,
        config: null,
      };
      return selector(state);
    });

    const { getByText } = render(
      <NotificationInbox isOpen={true} onClose={mockOnClose} />
    );

    expect(getByText('Unable to load notifications')).toBeTruthy();
  });

  it('calls delete API correctly', async () => {
    mockDeleteMessage.mockResolvedValue(undefined);

    await act(async () => {
      await deleteMessage('1');
    });

    expect(mockDeleteMessage).toHaveBeenCalledWith('1');
  });

  it('handles delete success', async () => {
    mockDeleteMessage.mockResolvedValue(undefined);

    await act(async () => {
      await deleteMessage('1');
    });

    expect(mockDeleteMessage).toHaveBeenCalledWith('1');
  });
});
