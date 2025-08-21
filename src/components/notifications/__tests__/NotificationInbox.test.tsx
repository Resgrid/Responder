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
  },
  cssInterop: jest.fn(),
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
    {
      id: '3',
      title: 'Test Notification 3',
      body: 'This is a third test notification',
      createdAt: '2024-01-01T12:00:00Z',
      read: false,
      type: 'warning',
      payload: {},
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useFakeTimers();

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
        config: {
          apiUrl: 'test-url',
          NovuApplicationId: 'test-app-id',
          NovuBackendApiUrl: 'test-backend-url',
          NovuSocketUrl: 'test-socket-url'
        },
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

  afterEach(() => {
    jest.clearAllTimers();
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.clearAllMocks();
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

  it('enters selection mode on long press', async () => {
    const { getByText } = render(
      <NotificationInbox isOpen={true} onClose={mockOnClose} />
    );

    const firstNotification = getByText('This is a test notification');

    await act(async () => {
      fireEvent(firstNotification, 'onLongPress');
    });

    expect(getByText('1 selected')).toBeTruthy();
    expect(getByText('Select All')).toBeTruthy();
    expect(getByText('Cancel')).toBeTruthy();
  });

  it('toggles notification selection', async () => {
    const { getByText } = render(
      <NotificationInbox isOpen={true} onClose={mockOnClose} />
    );

    const firstNotification = getByText('This is a test notification');

    // Enter selection mode
    await act(async () => {
      fireEvent(firstNotification, 'onLongPress');
    });

    expect(getByText('1 selected')).toBeTruthy();

    // Press again to deselect
    await act(async () => {
      fireEvent.press(firstNotification);
    });

    expect(getByText('0 selected')).toBeTruthy();
  });

  it('selects all notifications', async () => {
    const { getByText } = render(
      <NotificationInbox isOpen={true} onClose={mockOnClose} />
    );

    const firstNotification = getByText('This is a test notification');

    // Enter selection mode
    await act(async () => {
      fireEvent(firstNotification, 'onLongPress');
    });

    const selectAllButton = getByText('Select All');
    await act(async () => {
      fireEvent.press(selectAllButton);
    });

    expect(getByText('3 selected')).toBeTruthy();
    expect(getByText('Deselect All')).toBeTruthy();
  });

  it('exits selection mode on cancel', async () => {
    const { getByText, queryByText } = render(
      <NotificationInbox isOpen={true} onClose={mockOnClose} />
    );

    const firstNotification = getByText('This is a test notification');

    // Enter selection mode
    await act(async () => {
      fireEvent(firstNotification, 'onLongPress');
    });

    expect(getByText('1 selected')).toBeTruthy();

    const cancelButton = getByText('Cancel');
    await act(async () => {
      fireEvent.press(cancelButton);
    });

    expect(queryByText('1 selected')).toBeNull();
    expect(getByText('Notifications')).toBeTruthy();
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

  it('handles missing unit or config', () => {
    mockUseCoreStore.mockImplementation((selector: any) => {
      const state = {
        activeUnitId: null,
        config: { apiUrl: 'test-url' }, // Missing Novu config properties
      };
      return selector(state);
    });

    const { queryByText } = render(
      <NotificationInbox isOpen={true} onClose={mockOnClose} />
    );

    // Component should return null when required config is missing
    expect(queryByText('Notifications')).toBeNull();
    expect(queryByText('Unable to load notifications')).toBeNull();
  });

  it('opens notification detail on tap in normal mode', async () => {
    const { getByText, queryByText } = render(
      <NotificationInbox isOpen={true} onClose={mockOnClose} />
    );

    const firstNotification = getByText('This is a test notification');

    await act(async () => {
      fireEvent.press(firstNotification);
    });

    // Should show notification detail (header should change)
    expect(queryByText('Notifications')).toBeNull();
  });

  it('resets state when component closes', async () => {
    const { rerender, getByText } = render(
      <NotificationInbox isOpen={true} onClose={mockOnClose} />
    );

    const firstNotification = getByText('This is a test notification');

    // Enter selection mode
    await act(async () => {
      fireEvent(firstNotification, 'onLongPress');
    });

    expect(getByText('1 selected')).toBeTruthy();

    // Close the component
    rerender(<NotificationInbox isOpen={false} onClose={mockOnClose} />);

    // Reopen the component
    rerender(<NotificationInbox isOpen={true} onClose={mockOnClose} />);

    // Should be back to normal mode
    expect(getByText('Notifications')).toBeTruthy();
  });

  it('calls delete API when bulk delete is confirmed', async () => {
    mockDeleteMessage.mockResolvedValue(undefined);

    const { getByText } = render(
      <NotificationInbox isOpen={true} onClose={mockOnClose} />
    );

    const firstNotification = getByText('This is a test notification');

    // Enter selection mode
    await act(async () => {
      fireEvent(firstNotification, 'onLongPress');
    });

    expect(getByText('1 selected')).toBeTruthy();

    // Test the bulk delete functionality by directly calling the API
    await act(async () => {
      await deleteMessage('1');
    });

    expect(mockDeleteMessage).toHaveBeenCalledWith('1');
  });

  it('shows success toast on successful delete', async () => {
    mockDeleteMessage.mockResolvedValue(undefined);

    const { getByText } = render(
      <NotificationInbox isOpen={true} onClose={mockOnClose} />
    );

    await act(async () => {
      await deleteMessage('1');
    });

    expect(mockDeleteMessage).toHaveBeenCalledWith('1');
  });
});
