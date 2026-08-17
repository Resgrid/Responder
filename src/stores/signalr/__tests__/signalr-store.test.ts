import { act, renderHook } from '@testing-library/react-native';

// Create the mock before any imports
const mockCoreStoreGetState = jest.fn(() => ({
  config: {
    EventingUrl: 'https://eventing.example.com/',
  },
}));

const mockSecurityStore = {
  getState: jest.fn(() => ({
    rights: {
      DepartmentId: '123',
    },
  })),
};

// Mock all dependencies before importing anything
jest.mock('@/services/signalr.service', () => {
  const mockInstance = {
    connectToHubWithEventingUrl: jest.fn().mockResolvedValue(undefined),
    disconnectFromHub: jest.fn().mockResolvedValue(undefined),
    invoke: jest.fn().mockResolvedValue(undefined),
    on: jest.fn(),
    off: jest.fn(),
    connectToHub: jest.fn().mockResolvedValue(undefined),
    disconnectAll: jest.fn().mockResolvedValue(undefined),
  };
  return {
    signalRService: mockInstance,
    // The store keys its hub lifecycle listeners by these; without them the handlers register under
    // `undefined` and the subscription set cannot be asserted meaningfully.
    HUB_CONNECTED_EVENT: 'hubConnected',
    HUB_DISCONNECTED_EVENT: 'hubDisconnected',
    default: mockInstance,
  };
});

// Mock the core store module directly - mock as a function that behaves like a Zustand store
jest.mock('../../app/core-store', () => {
  const createMockStore = () => {
    const mockStore = () => mockCoreStoreGetState();
    // Ensure getState always calls the current mock function
    mockStore.getState = () => mockCoreStoreGetState();
    mockStore.subscribe = jest.fn();
    mockStore.setState = jest.fn();
    mockStore.destroy = jest.fn();
    
    return mockStore;
  };
  
  return {
    useCoreStore: createMockStore(),
  };
});

// The factories run while the hoisted store imports are being required, before
// `mockSecurityStore` above is initialized — snapshotting the variable here would
// freeze `securityStore: undefined`. Deferring the access to call time keeps the
// export wired to the live mock.
jest.mock('@/stores/security/store', () => ({
  securityStore: { getState: () => mockSecurityStore.getState() },
}));

jest.mock('../../security/store', () => ({
  securityStore: { getState: () => mockSecurityStore.getState() },
  useSecurityStore: { getState: () => mockSecurityStore.getState() },
}));

jest.mock('@/lib/logging', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    trace: jest.fn(),
    fatal: jest.fn(),
  },
}));

jest.mock('@/lib/env', () => ({
  Env: {
    CHANNEL_HUB_NAME: 'eventingHub',
    REALTIME_GEO_HUB_NAME: 'geolocationHub',
  },
}));

jest.mock('@/lib', () => ({
  useAuthStore: {
    getState: jest.fn(() => ({
      accessToken: 'mock-token',
    })),
  },
}));

// Import the store after all mocks are set up
import { useSignalRStore } from '../signalr-store';
import { logger } from '@/lib/logging';
import { signalRService } from '@/services/signalr.service';

describe('useSignalRStore', () => {
  const mockEventingUrl = 'https://eventing.example.com/';
  const mockDepartmentId = '123';

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset the mock function to default behavior
    mockCoreStoreGetState.mockReturnValue({
      config: {
        EventingUrl: mockEventingUrl,
      },
    });

    // Mock security store
    mockSecurityStore.getState.mockReturnValue({
      rights: {
        DepartmentId: mockDepartmentId,
      },
    } as any);

    // Mock SignalR service methods
    (signalRService.connectToHubWithEventingUrl as jest.Mock).mockResolvedValue(undefined);
    (signalRService.disconnectFromHub as jest.Mock).mockResolvedValue(undefined);
    (signalRService.invoke as jest.Mock).mockResolvedValue(undefined);
    (signalRService.on as jest.Mock).mockImplementation(() => {});
  });

  describe('Basic Store Functionality', () => {
    it('should create a store instance with correct initial state', () => {
      const { result } = renderHook(() => useSignalRStore());

      expect(result.current).toBeDefined();
      expect(typeof result.current.connectUpdateHub).toBe('function');
      expect(typeof result.current.disconnectUpdateHub).toBe('function');
      expect(typeof result.current.connectGeolocationHub).toBe('function');
      expect(typeof result.current.disconnectGeolocationHub).toBe('function');
      
      expect(result.current.isUpdateHubConnected).toBe(false);
      expect(result.current.isGeolocationHubConnected).toBe(false);
      expect(result.current.lastUpdateMessage).toBeNull();
      expect(result.current.lastGeolocationMessage).toBeNull();
      expect(result.current.lastUpdateTimestamp).toBe(0);
      expect(result.current.lastGeolocationTimestamp).toBe(0);
      expect(result.current.error).toBeNull();
    });
  });

  describe('connectUpdateHub', () => {
    it('should handle missing EventingUrl', async () => {
      // Mock core store without EventingUrl
      mockCoreStoreGetState.mockReturnValue({
        config: {
          EventingUrl: undefined,
        } as any,
      });

      const { result } = renderHook(() => useSignalRStore());

      await act(async () => {
        await result.current.connectUpdateHub();
      });

      expect(signalRService.connectToHubWithEventingUrl).not.toHaveBeenCalled();
      expect(result.current.error).toEqual(
        new Error('EventingUrl not available in config. Please ensure config is loaded first.')
      );

      expect(logger.error).toHaveBeenCalledWith({
        message: 'EventingUrl not available in config. Please ensure config is loaded first.',
      });
    });

    it('should handle missing config', async () => {
      // Mock core store without config
      mockCoreStoreGetState.mockReturnValue({
        config: null as any,
      });

      const { result } = renderHook(() => useSignalRStore());

      await act(async () => {
        await result.current.connectUpdateHub();
      });

      expect(signalRService.connectToHubWithEventingUrl).not.toHaveBeenCalled();
      expect(result.current.error).toEqual(
        new Error('EventingUrl not available in config. Please ensure config is loaded first.')
      );
    });

    it('should handle connection errors', async () => {
      const connectionError = new Error('Connection failed');
      (signalRService.connectToHubWithEventingUrl as jest.Mock).mockRejectedValue(connectionError);

      const { result } = renderHook(() => useSignalRStore());

      await act(async () => {
        await result.current.connectUpdateHub();
      });

      expect(result.current.error).toEqual(connectionError);
      expect(logger.error).toHaveBeenCalledWith({
        message: 'Failed to connect to SignalR hubs',
        context: { error: connectionError },
      });
    });
  });

  describe('disconnectUpdateHub', () => {
    it('unsubscribes update hub handlers using their registered references', async () => {
      const { result } = renderHook(() => useSignalRStore());

      await act(async () => {
        await result.current.connectUpdateHub();
      });

      const registrations = (signalRService.on as jest.Mock).mock.calls.filter(([event]) => event !== 'onPersonnelLocationUpdated' && event !== 'onUnitLocationUpdated' && event !== 'onGeolocationConnect');

      await act(async () => {
        await result.current.disconnectUpdateHub();
      });

      // Every update hub subscription must be torn down by its own reference; the set includes the
      // incident command feed and the hub-connected listener that rejoins the department group.
      expect(registrations).toHaveLength(13);
      expect(registrations.map(([event]) => event)).toEqual(expect.arrayContaining(['incidentCommandUpdated', 'hubConnected', 'hubDisconnected']));
      registrations.forEach(([event, handler]) => {
        expect(signalRService.off).toHaveBeenCalledWith(event, handler);
      });
    });

    it('contains update handler errors and logs them', async () => {
      const handlerError = new Error('handler failed');
      const { result } = renderHook(() => useSignalRStore());

      await act(async () => {
        await result.current.connectUpdateHub();
      });

      const personnelStatusHandler = (signalRService.on as jest.Mock).mock.calls.find(([event]) => event === 'personnelStatusUpdated')?.[1];
      (logger.info as jest.Mock).mockImplementationOnce(() => {
        throw handlerError;
      });

      expect(() => personnelStatusHandler({ UserId: 'user-1' })).not.toThrow();
      expect(logger.error).toHaveBeenCalledWith({
        message: 'Failed to handle SignalR event: personnelStatusUpdated',
        context: { error: handlerError },
      });

      await act(async () => {
        await result.current.disconnectUpdateHub();
      });
    });

    it('should disconnect from update hub successfully', async () => {
      const { result } = renderHook(() => useSignalRStore());

      await act(async () => {
        await result.current.disconnectUpdateHub();
      });

      expect(signalRService.disconnectFromHub).toHaveBeenCalledWith('eventingHub');
      expect(result.current.isUpdateHubConnected).toBe(false);
      expect(result.current.lastUpdateMessage).toBeNull();
    });

    it('should handle disconnect errors', async () => {
      const disconnectError = new Error('Disconnect failed');
      const { result } = renderHook(() => useSignalRStore());

      await act(async () => {
        await result.current.connectUpdateHub();
      });

      (signalRService.disconnectFromHub as jest.Mock).mockRejectedValue(disconnectError);

      await act(async () => {
        await result.current.disconnectUpdateHub();
      });

      expect(result.current.error).toEqual(disconnectError);
      expect(signalRService.off).toHaveBeenCalledTimes(13);
      expect(logger.error).toHaveBeenCalledWith({
        message: 'Failed to disconnect from SignalR hubs',
        context: { error: disconnectError },
      });
    });
  });

  describe('update hub rejoin', () => {
    const connectInvokeCalls = () => (signalRService.invoke as jest.Mock).mock.calls.filter(([hub, method]) => hub === 'eventingHub' && method === 'connect');

    it('ignores a rejoin that resolves after disconnectUpdateHub tore the session down', async () => {
      const { result } = renderHook(() => useSignalRStore());

      let resolveInvoke!: () => void;
      (signalRService.invoke as jest.Mock).mockImplementation(
        () =>
          new Promise<void>((resolve) => {
            resolveInvoke = resolve;
          })
      );

      let connectPromise!: Promise<void>;
      await act(async () => {
        connectPromise = result.current.connectUpdateHub();
        await Promise.resolve();
      });

      await act(async () => {
        await result.current.disconnectUpdateHub();
      });

      // The announce from the torn-down connection resolves late; it must not resurrect the flag.
      await act(async () => {
        resolveInvoke();
        await connectPromise;
      });

      expect(result.current.isUpdateHubConnected).toBe(false);
    });

    it('shares one announce between the hubConnected event and connectUpdateHub', async () => {
      const { result } = renderHook(() => useSignalRStore());

      // Simulate the service raising hubConnected for a fresh socket mid-connect, as the
      // real transport does; the fallback announce in connectUpdateHub must join it.
      (signalRService.connectToHubWithEventingUrl as jest.Mock).mockImplementation(async () => {
        const handler = (signalRService.on as jest.Mock).mock.calls.find(([event]) => event === 'hubConnected')?.[1];
        handler({ hubName: 'eventingHub' });
      });

      await act(async () => {
        await result.current.connectUpdateHub();
      });

      expect(connectInvokeCalls()).toHaveLength(1);
      expect(result.current.isUpdateHubConnected).toBe(true);

      await act(async () => {
        await result.current.disconnectUpdateHub();
      });
    });

    it('does not schedule retries for a rejoin that fails after teardown', async () => {
      jest.useFakeTimers();
      try {
        const { result } = renderHook(() => useSignalRStore());

        let rejectInvoke!: (error: Error) => void;
        (signalRService.invoke as jest.Mock).mockImplementation(
          () =>
            new Promise<void>((resolve, reject) => {
              rejectInvoke = reject;
            })
        );

        let connectPromise!: Promise<void>;
        await act(async () => {
          connectPromise = result.current.connectUpdateHub();
          await Promise.resolve();
        });

        await act(async () => {
          await result.current.disconnectUpdateHub();
        });

        (signalRService.invoke as jest.Mock).mockClear();
        await act(async () => {
          rejectInvoke(new Error('announce failed'));
          await connectPromise;
        });

        await act(async () => {
          jest.advanceTimersByTime(20000);
        });

        expect(connectInvokeCalls()).toHaveLength(0);
        expect(result.current.isUpdateHubConnected).toBe(false);
      } finally {
        jest.useRealTimers();
      }
    });
  });

  describe('connectGeolocationHub', () => {
    it('should handle missing EventingUrl', async () => {
      // Mock core store without EventingUrl
      mockCoreStoreGetState.mockReturnValue({
        config: {
          EventingUrl: undefined,
        } as any,
      });

      const { result } = renderHook(() => useSignalRStore());

      await act(async () => {
        await result.current.connectGeolocationHub();
      });

      expect(signalRService.connectToHubWithEventingUrl).not.toHaveBeenCalled();
      expect(result.current.error).toEqual(
        new Error('EventingUrl not available in config. Please ensure config is loaded first.')
      );
    });
  });

  describe('disconnectGeolocationHub', () => {
    it('should disconnect from geolocation hub successfully', async () => {
      const { result } = renderHook(() => useSignalRStore());

      await act(async () => {
        await result.current.disconnectGeolocationHub();
      });

      expect(signalRService.disconnectFromHub).toHaveBeenCalledWith('geolocationHub');
      expect(result.current.isGeolocationHubConnected).toBe(false);
      expect(result.current.lastGeolocationMessage).toBeNull();
    });

    it('should handle disconnect errors', async () => {
      const disconnectError = new Error('Geolocation disconnect failed');
      (signalRService.disconnectFromHub as jest.Mock).mockRejectedValue(disconnectError);

      const { result } = renderHook(() => useSignalRStore());

      await act(async () => {
        await result.current.disconnectGeolocationHub();
      });

      expect(result.current.error).toEqual(disconnectError);
      expect(logger.error).toHaveBeenCalledWith({
        message: 'Failed to disconnect from SignalR hubs',
        context: { error: disconnectError },
      });
    });
  });
});
