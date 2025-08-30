import { renderHook, waitFor } from '@testing-library/react-native';

import { useAuthStore } from '@/lib/auth';
import { logger } from '@/lib/logging';
import { useHomeStore } from '@/stores/home/home-store';
import { useSignalRStore } from '@/stores/signalr/signalr-store';

import { useStatusSignalRUpdates } from '../use-status-signalr-updates';

// Mock dependencies
jest.mock('@/lib/auth');
jest.mock('@/lib/logging');
jest.mock('@/stores/home/home-store');
jest.mock('@/stores/signalr/signalr-store');

const mockedUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>;
const mockedLogger = logger as jest.Mocked<typeof logger>;
const mockedUseHomeStore = useHomeStore as jest.MockedFunction<typeof useHomeStore>;
const mockedUseSignalRStore = useSignalRStore as jest.MockedFunction<typeof useSignalRStore>;

// Create a complete mock SignalR state
const createMockSignalRState = (overrides: Partial<any> = {}) => ({
  isUpdateHubConnected: false,
  lastUpdateMessage: null,
  lastUpdateTimestamp: 0,
  isGeolocationHubConnected: false,
  lastGeolocationMessage: null,
  lastGeolocationTimestamp: 0,
  error: null,
  connectUpdateHub: jest.fn(),
  disconnectUpdateHub: jest.fn(),
  connectGeolocationHub: jest.fn(),
  disconnectGeolocationHub: jest.fn(),
  ...overrides,
});

describe('useStatusSignalRUpdates', () => {
  let mockFetchCurrentUserInfo: jest.MockedFunction<() => Promise<void>>;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    mockFetchCurrentUserInfo = jest.fn().mockResolvedValue(undefined);

    // Default mocks - mock as hook returning object with destructured properties
    mockedUseAuthStore.mockReturnValue({ userId: 'user123' } as any);
    mockedUseHomeStore.mockReturnValue({ fetchCurrentUserInfo: mockFetchCurrentUserInfo } as any);
    
    // Default SignalR store state
    mockedUseSignalRStore.mockImplementation((selector) => {
      const state = createMockSignalRState();
      return selector(state);
    });

    // Silence logger by default
    mockedLogger.info.mockImplementation(() => {});
    mockedLogger.error.mockImplementation(() => {});
  });

  describe('Basic functionality', () => {
    it('should not process updates when timestamp is 0', () => {
      mockedUseSignalRStore.mockImplementation((selector) => {
        const state = createMockSignalRState({
          lastUpdateTimestamp: 0,
          lastUpdateMessage: null,
        });
        return selector(state);
      });

      renderHook(() => useStatusSignalRUpdates());

      expect(mockFetchCurrentUserInfo).not.toHaveBeenCalled();
    });

    it('should not execute effect when user ID is null', () => {
      // Set up with user ID available initially
      mockedUseAuthStore.mockReturnValue({ userId: 'user123' } as any);
      mockedUseSignalRStore.mockImplementation((selector) => {
        const state = createMockSignalRState({
          lastUpdateTimestamp: 1000,
          lastUpdateMessage: JSON.stringify({ UserId: 'different-user' }),
        });
        return selector(state);
      });

      const { rerender } = renderHook(() => useStatusSignalRUpdates());

      // Now change to null userId but keep same timestamp (should trigger if we had a different last processed)
      // Reset the ref by using a different timestamp
      mockedUseAuthStore.mockReturnValue({ userId: null } as any);
      mockedUseSignalRStore.mockImplementation((selector) => {
        const state = createMockSignalRState({
          lastUpdateTimestamp: 2000,
          lastUpdateMessage: JSON.stringify({ UserId: 'user123' }),
        });
        return selector(state);
      });

      rerender({});

      // When userId is null, the useEffect condition prevents execution
      // So handleStatusUpdate is never called and no functions are invoked
      expect(mockFetchCurrentUserInfo).not.toHaveBeenCalled();
    });

    it('should process personnel status update for current user', async () => {
      const personnelStatusMessage = {
        UserId: 'user123',
        StatusId: 1,
        StatusText: 'Available',
      };

      mockedUseSignalRStore.mockImplementation((selector) => {
        const state = createMockSignalRState({
          lastUpdateTimestamp: 1000,
          lastUpdateMessage: JSON.stringify(personnelStatusMessage),
        });
        return selector(state);
      });

      renderHook(() => useStatusSignalRUpdates());

      await waitFor(() => {
        expect(mockFetchCurrentUserInfo).toHaveBeenCalledTimes(1);
      });

      expect(mockedLogger.info).toHaveBeenCalledWith({
        message: 'Processing personnel status/staffing update for current user',
        context: {
          userId: 'user123',
          timestamp: 1000,
          message: personnelStatusMessage,
        },
      });
    });

    it('should process personnel staffing update for current user', async () => {
      const personnelStaffingMessage = {
        UserId: 'user123',
        StaffingId: 2,
        StaffingText: 'On Duty',
      };

      mockedUseSignalRStore.mockImplementation((selector) => {
        const state = createMockSignalRState({
          lastUpdateTimestamp: 1000,
          lastUpdateMessage: JSON.stringify(personnelStaffingMessage),
        });
        return selector(state);
      });

      renderHook(() => useStatusSignalRUpdates());

      await waitFor(() => {
        expect(mockFetchCurrentUserInfo).toHaveBeenCalledTimes(1);
      });

      expect(mockedLogger.info).toHaveBeenCalledWith({
        message: 'Processing personnel status/staffing update for current user',
        context: {
          userId: 'user123',
          timestamp: 1000,
          message: personnelStaffingMessage,
        },
      });
    });

    it('should not process updates for other users', () => {
      const otherUserMessage = {
        UserId: 'other-user',
        StatusId: 1,
        StatusText: 'Available',
      };

      mockedUseSignalRStore.mockImplementation((selector) => {
        const state = createMockSignalRState({
          lastUpdateTimestamp: 1000,
          lastUpdateMessage: JSON.stringify(otherUserMessage),
        });
        return selector(state);
      });

      renderHook(() => useStatusSignalRUpdates());

      expect(mockFetchCurrentUserInfo).not.toHaveBeenCalled();
    });

    it('should not process the same timestamp twice', async () => {
      const personnelStatusMessage = {
        UserId: 'user123',
        StatusId: 1,
        StatusText: 'Available',
      };

      let timestamp = 1000;
      mockedUseSignalRStore.mockImplementation((selector) => {
        const state = createMockSignalRState({
          lastUpdateTimestamp: timestamp,
          lastUpdateMessage: JSON.stringify(personnelStatusMessage),
        });
        return selector(state);
      });

      const { rerender } = renderHook(() => useStatusSignalRUpdates());

      await waitFor(() => {
        expect(mockFetchCurrentUserInfo).toHaveBeenCalledTimes(1);
      });

      // Rerender with same timestamp
      rerender({});

      // Should not call again
      expect(mockFetchCurrentUserInfo).toHaveBeenCalledTimes(1);
    });

    it('should process new timestamp after initial processing', async () => {
      const personnelStatusMessage = {
        UserId: 'user123',
        StatusId: 1,
        StatusText: 'Available',
      };

      let timestamp = 1000;
      mockedUseSignalRStore.mockImplementation((selector) => {
        const state = createMockSignalRState({
          lastUpdateTimestamp: timestamp,
          lastUpdateMessage: JSON.stringify(personnelStatusMessage),
        });
        return selector(state);
      });

      const { rerender } = renderHook(() => useStatusSignalRUpdates());

      await waitFor(() => {
        expect(mockFetchCurrentUserInfo).toHaveBeenCalledTimes(1);
      });

      // Update timestamp
      timestamp = 2000;
      const newMessage = {
        UserId: 'user123',
        StatusId: 2,
        StatusText: 'Responding',
      };

      mockedUseSignalRStore.mockImplementation((selector) => {
        const state = createMockSignalRState({
          lastUpdateTimestamp: timestamp,
          lastUpdateMessage: JSON.stringify(newMessage),
        });
        return selector(state);
      });

      rerender({});

      await waitFor(() => {
        expect(mockFetchCurrentUserInfo).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Error handling', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      // Ensure clean state for error handling tests
      mockedUseAuthStore.mockReturnValue({ userId: 'user123' } as any);
      mockedUseHomeStore.mockReturnValue({ fetchCurrentUserInfo: mockFetchCurrentUserInfo } as any);
      mockFetchCurrentUserInfo.mockResolvedValue(undefined);
    });

    it('should handle errors during message processing gracefully', async () => {
      const fetchError = new Error('Fetch failed');
      mockFetchCurrentUserInfo.mockRejectedValue(fetchError);

      const validJsonMessage = '{"UserId":"user123","StatusId":1,"StatusText":"Available"}';

      mockedUseSignalRStore.mockImplementation((selector) => {
        const state = createMockSignalRState({
          lastUpdateTimestamp: 1000,
          lastUpdateMessage: validJsonMessage,
        });
        return selector(state);
      });

      renderHook(() => useStatusSignalRUpdates());

      // This test verifies that errors during message processing are handled gracefully
      // The specific error type may vary depending on where the failure occurs
      await waitFor(() => {
        expect(mockedLogger.error).toHaveBeenCalledWith(
          expect.objectContaining({
            message: expect.stringContaining('Failed to'),
            context: expect.objectContaining({
              error: expect.any(Error),
            }),
          })
        );
      });
    });

    it('should handle invalid JSON gracefully', () => {
      mockedUseSignalRStore.mockImplementation((selector) => {
        const state = createMockSignalRState({
          lastUpdateTimestamp: 1000,
          lastUpdateMessage: 'invalid-json',
        });
        return selector(state);
      });

      renderHook(() => useStatusSignalRUpdates());

      expect(mockedLogger.error).toHaveBeenCalledWith({
        message: 'Failed to parse SignalR message',
        context: { 
          error: expect.any(SyntaxError), 
          message: 'invalid-json' 
        },
      });
      expect(mockFetchCurrentUserInfo).not.toHaveBeenCalled();
    });

    it('should handle null message gracefully', () => {
      mockedUseSignalRStore.mockImplementation((selector) => {
        const state = createMockSignalRState({
          lastUpdateTimestamp: 1000,
          lastUpdateMessage: null,
        });
        return selector(state);
      });

      renderHook(() => useStatusSignalRUpdates());

      expect(mockFetchCurrentUserInfo).not.toHaveBeenCalled();
    });

    it('should handle non-string message gracefully', () => {
      mockedUseSignalRStore.mockImplementation((selector) => {
        const state = createMockSignalRState({
          lastUpdateTimestamp: 1000,
          lastUpdateMessage: { UserId: 'user123' }, // Non-string message
        });
        return selector(state);
      });

      renderHook(() => useStatusSignalRUpdates());

      expect(mockFetchCurrentUserInfo).not.toHaveBeenCalled();
    });
  });

  describe('Message filtering', () => {
    it('should handle messages without UserId', () => {
      const messageWithoutUserId = {
        StatusId: 1,
        StatusText: 'Available',
      };

      mockedUseSignalRStore.mockImplementation((selector) => {
        const state = createMockSignalRState({
          lastUpdateTimestamp: 1000,
          lastUpdateMessage: JSON.stringify(messageWithoutUserId),
        });
        return selector(state);
      });

      renderHook(() => useStatusSignalRUpdates());

      expect(mockFetchCurrentUserInfo).not.toHaveBeenCalled();
    });

    it('should handle empty message object', () => {
      mockedUseSignalRStore.mockImplementation((selector) => {
        const state = createMockSignalRState({
          lastUpdateTimestamp: 1000,
          lastUpdateMessage: JSON.stringify({}),
        });
        return selector(state);
      });

      renderHook(() => useStatusSignalRUpdates());

      expect(mockFetchCurrentUserInfo).not.toHaveBeenCalled();
    });

    it('should handle null parsed message', () => {
      mockedUseSignalRStore.mockImplementation((selector) => {
        const state = createMockSignalRState({
          lastUpdateTimestamp: 1000,
          lastUpdateMessage: 'null',
        });
        return selector(state);
      });

      renderHook(() => useStatusSignalRUpdates());

      expect(mockFetchCurrentUserInfo).not.toHaveBeenCalled();
    });
  });

  describe('User context changes', () => {
    it('should process update when user logs in', async () => {
      // Start with no user
      mockedUseAuthStore.mockReturnValue({ userId: null } as any);

      const personnelStatusMessage = {
        UserId: 'user123',
        StatusId: 1,
        StatusText: 'Available',
      };

      mockedUseSignalRStore.mockImplementation((selector) => {
        const state = createMockSignalRState({
          lastUpdateTimestamp: 1000,
          lastUpdateMessage: JSON.stringify(personnelStatusMessage),
        });
        return selector(state);
      });

      const { rerender } = renderHook(() => useStatusSignalRUpdates());

      expect(mockFetchCurrentUserInfo).not.toHaveBeenCalled();

      // User logs in
      mockedUseAuthStore.mockReturnValue({ userId: 'user123' } as any);
      rerender({});

      await waitFor(() => {
        expect(mockFetchCurrentUserInfo).toHaveBeenCalledTimes(1);
      });
    });

    it('should not process update when user logs out', () => {
      // Start with user logged in
      mockedUseAuthStore.mockReturnValue({ userId: 'user123' } as any);

      const personnelStatusMessage = {
        UserId: 'user123',
        StatusId: 1,
        StatusText: 'Available',
      };

      mockedUseSignalRStore.mockImplementation((selector) => {
        const state = createMockSignalRState({
          lastUpdateTimestamp: 1000,
          lastUpdateMessage: JSON.stringify(personnelStatusMessage),
        });
        return selector(state);
      });

      const { rerender } = renderHook(() => useStatusSignalRUpdates());

      // Wait for initial render to complete
      expect(mockFetchCurrentUserInfo).toHaveBeenCalledTimes(1);

      // User logs out - clear previous calls to make test clearer
      jest.clearAllMocks();
      mockedUseAuthStore.mockReturnValue({ userId: null } as any);
      
      // Update timestamp to trigger re-evaluation
      mockedUseSignalRStore.mockImplementation((selector) => {
        const state = createMockSignalRState({
          lastUpdateTimestamp: 2000,
          lastUpdateMessage: JSON.stringify(personnelStatusMessage),
        });
        return selector(state);
      });

      rerender({});

      // Since userId is now null, the effect condition won't trigger, so handleStatusUpdate is never called
      // Therefore, no log message is generated
      expect(mockFetchCurrentUserInfo).not.toHaveBeenCalled();
    });

    it('should process updates for new user after user changes', async () => {
      // Start with first user
      mockedUseAuthStore.mockReturnValue({ userId: 'user1' } as any);

      const firstUserMessage = {
        UserId: 'user1',
        StatusId: 1,
        StatusText: 'Available',
      };

      mockedUseSignalRStore.mockImplementation((selector) => {
        const state = createMockSignalRState({
          lastUpdateTimestamp: 1000,
          lastUpdateMessage: JSON.stringify(firstUserMessage),
        });
        return selector(state);
      });

      const { rerender } = renderHook(() => useStatusSignalRUpdates());

      await waitFor(() => {
        expect(mockFetchCurrentUserInfo).toHaveBeenCalledTimes(1);
      });

      // Switch to second user
      mockedUseAuthStore.mockReturnValue({ userId: 'user2' } as any);

      const secondUserMessage = {
        UserId: 'user2',
        StatusId: 2,
        StatusText: 'Responding',
      };

      mockedUseSignalRStore.mockImplementation((selector) => {
        const state = createMockSignalRState({
          lastUpdateTimestamp: 2000,
          lastUpdateMessage: JSON.stringify(secondUserMessage),
        });
        return selector(state);
      });

      rerender({});

      await waitFor(() => {
        expect(mockFetchCurrentUserInfo).toHaveBeenCalledTimes(2);
      });
    });
  });
});
