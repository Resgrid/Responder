import { HubConnectionState } from '@microsoft/signalr';
import { SignalRService, type SignalRHubConfig, type SignalRHubConnectConfig } from '../signalr.service';

// Mock dependencies
jest.mock('@/lib/logging', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@/stores/auth/store', () => ({
  __esModule: true,
  default: {
    getState: jest.fn(() => ({
      accessToken: 'mock-token',
      refreshAccessToken: jest.fn().mockResolvedValue(undefined),
    })),
  },
}));

jest.mock('@/lib/env', () => ({
  Env: {
    REALTIME_GEO_HUB_NAME: 'geoHub',
  },
}));

/**
 * Test for the fix to the SignalR connection locking mechanism that prevents
 * retrying when a previous connection attempt failed.
 */
describe('SignalR Lock Retry Fix', () => {
  let signalRService: SignalRService;

  beforeEach(() => {
    // Reset the singleton instance for each test
    SignalRService.resetInstance();
    signalRService = SignalRService.getInstance();
    jest.clearAllMocks();
  });

  afterEach(async () => {
    // Clean up after each test
    try {
      // Manually clean up connections to avoid async issues
      if (signalRService) {
        await (signalRService as any).disconnectAll();
      }
    } catch (error) {
      // Ignore cleanup errors
    }
    SignalRService.resetInstance();
  });

  describe('connectToHubWithEventingUrl retry logic', () => {
    it('should retry connection after a failed attempt when called by another caller', async () => {
      const config: SignalRHubConnectConfig = {
        name: 'testHub',
        eventingUrl: 'https://example.com/hub',
        hubName: 'testHub',
        methods: ['testMethod'],
      };

      // Mock the internal connection method to fail first, then succeed
      let callCount = 0;
      const originalConnect = (signalRService as any)._connectToHubWithEventingUrlInternal;
      (signalRService as any)._connectToHubWithEventingUrlInternal = jest.fn(async () => {
        callCount++;
        if (callCount === 1) {
          throw new Error('First connection attempt failed');
        }
        // Second attempt succeeds - simulate adding connection
        const mockConnection = {
          state: HubConnectionState.Connected,
          start: jest.fn(),
          stop: jest.fn(),
          on: jest.fn(),
          onclose: jest.fn(),
          onreconnecting: jest.fn(),
          onreconnected: jest.fn(),
          invoke: jest.fn(),
        };
        (signalRService as any).connections.set(config.name, mockConnection);
      });

      // First caller - should fail
      await expect(signalRService.connectToHubWithEventingUrl(config)).rejects.toThrow('First connection attempt failed');
      
      // Verify no connection was established
      expect((signalRService as any).connections.has(config.name)).toBe(false);
      
      // Second caller - should succeed because it retries instead of returning early
      await expect(signalRService.connectToHubWithEventingUrl(config)).resolves.toBeUndefined();
      
      // Verify connection was established
      expect((signalRService as any).connections.has(config.name)).toBe(true);
      
      // Verify the internal method was called twice (first failed, second succeeded)
      expect((signalRService as any)._connectToHubWithEventingUrlInternal).toHaveBeenCalledTimes(2);

      // Restore original method
      (signalRService as any)._connectToHubWithEventingUrlInternal = originalConnect;
    });

    it('should return early if connection is already established and active', async () => {
      const config: SignalRHubConnectConfig = {
        name: 'testHub',
        eventingUrl: 'https://example.com/hub',
        hubName: 'testHub',
        methods: ['testMethod'],
      };

      // Mock an existing active connection
      const mockConnection = {
        state: HubConnectionState.Connected,
        start: jest.fn(),
        stop: jest.fn(),
        on: jest.fn(),
        onclose: jest.fn(),
        onreconnecting: jest.fn(),
        onreconnected: jest.fn(),
        invoke: jest.fn(),
      };
      (signalRService as any).connections.set(config.name, mockConnection);

      // Mock the internal connection method to track if it returns early
      const connectSpy = jest.fn().mockResolvedValue(undefined);
      (signalRService as any)._connectToHubWithEventingUrlInternal = connectSpy;

      // Call connect - internal method will be called but should return early
      await signalRService.connectToHubWithEventingUrl(config);

      // Verify internal method was called (it checks for existing connections internally)
      expect(connectSpy).toHaveBeenCalledTimes(1);
      expect(connectSpy).toHaveBeenCalledWith(config);
    });

    it('should wait for existing lock and then retry if connection failed', async () => {
      const config: SignalRHubConnectConfig = {
        name: 'testHub',
        eventingUrl: 'https://example.com/hub',
        hubName: 'testHub',
        methods: ['testMethod'],
      };

      let callCount = 0;

      // Mock the internal connection method
      (signalRService as any)._connectToHubWithEventingUrlInternal = jest.fn().mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          // First call fails
          throw new Error('Connection failed');
        }
        // Second call succeeds
        const mockConnection = {
          state: HubConnectionState.Connected,
        };
        (signalRService as any).connections.set(config.name, mockConnection);
      });

      // First caller - should fail
      await expect(signalRService.connectToHubWithEventingUrl(config)).rejects.toThrow('Connection failed');
      
      // Verify no connection was established
      expect((signalRService as any).connections.has(config.name)).toBe(false);
      
      // Second caller - should succeed because it retries instead of returning early
      await expect(signalRService.connectToHubWithEventingUrl(config)).resolves.toBeUndefined();
      
      // Verify connection was established
      expect((signalRService as any).connections.has(config.name)).toBe(true);
      
      // Verify internal method was called twice
      expect((signalRService as any)._connectToHubWithEventingUrlInternal).toHaveBeenCalledTimes(2);
    });
  });

  describe('connectToHub retry logic', () => {
    it('should retry connection after a failed attempt when called by another caller', async () => {
      const config: SignalRHubConfig = {
        name: 'testHub',
        url: 'https://example.com/hub',
        methods: ['testMethod'],
      };

      // Mock the internal connection method to fail first, then succeed
      let callCount = 0;
      const originalConnect = (signalRService as any)._connectToHubInternal;
      (signalRService as any)._connectToHubInternal = jest.fn(async () => {
        callCount++;
        if (callCount === 1) {
          throw new Error('First connection attempt failed');
        }
        // Second attempt succeeds - simulate adding connection
        const mockConnection = {
          state: HubConnectionState.Connected,
          start: jest.fn(),
          stop: jest.fn(),
          on: jest.fn(),
          onclose: jest.fn(),
          onreconnecting: jest.fn(),
          onreconnected: jest.fn(),
          invoke: jest.fn(),
        };
        (signalRService as any).connections.set(config.name, mockConnection);
      });

      // First caller - should fail
      await expect(signalRService.connectToHub(config)).rejects.toThrow('First connection attempt failed');
      
      // Verify no connection was established
      expect((signalRService as any).connections.has(config.name)).toBe(false);
      
      // Second caller - should succeed because it retries instead of returning early
      await expect(signalRService.connectToHub(config)).resolves.toBeUndefined();
      
      // Verify connection was established
      expect((signalRService as any).connections.has(config.name)).toBe(true);
      
      // Verify the internal method was called twice (first failed, second succeeded)
      expect((signalRService as any)._connectToHubInternal).toHaveBeenCalledTimes(2);

      // Restore original method
      (signalRService as any)._connectToHubInternal = originalConnect;
    });

    it('should return early if connection is already established and active', async () => {
      const config: SignalRHubConfig = {
        name: 'testHub',
        url: 'https://example.com/hub',
        methods: ['testMethod'],
      };

      // Mock an existing active connection
      const mockConnection = {
        state: HubConnectionState.Connected,
        start: jest.fn(),
        stop: jest.fn(),
        on: jest.fn(),
        onclose: jest.fn(),
        onreconnecting: jest.fn(),
        onreconnected: jest.fn(),
        invoke: jest.fn(),
      };
      (signalRService as any).connections.set(config.name, mockConnection);

      // Mock the internal connection method to track if it returns early
      const connectSpy = jest.fn().mockResolvedValue(undefined);
      (signalRService as any)._connectToHubInternal = connectSpy;

      // Call connect - internal method will be called but should return early
      await signalRService.connectToHub(config);

      // Verify internal method was called (it checks for existing connections internally)
      expect(connectSpy).toHaveBeenCalledTimes(1);
      expect(connectSpy).toHaveBeenCalledWith(config);
    });
  });
});
