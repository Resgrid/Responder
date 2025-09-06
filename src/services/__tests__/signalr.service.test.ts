import { HubConnection, HubConnectionBuilder, LogLevel } from '@microsoft/signalr';

import { logger } from '@/lib/logging';

// Mock the env module
jest.mock('@/lib/env', () => ({
  Env: {
    REALTIME_GEO_HUB_NAME: 'geolocationHub',
  },
}));

// Mock the auth store
jest.mock('@/stores/auth/store', () => {
  const mockRefreshAccessToken = jest.fn().mockResolvedValue(undefined);
  const mockGetState = jest.fn(() => ({ 
    accessToken: 'mock-token',
    refreshAccessToken: mockRefreshAccessToken,
  }));
  return {
    __esModule: true,
    default: {
      getState: mockGetState,
    },
  };
});

import useAuthStore from '@/stores/auth/store';
import { signalRService, SignalRHubConnectConfig, SignalRHubConfig } from '../signalr.service';

// Mock the dependencies
jest.mock('@microsoft/signalr');
jest.mock('@/lib/logging');

const mockGetState = (useAuthStore as any).getState;
const mockRefreshAccessToken = jest.fn().mockResolvedValue(undefined);

const mockHubConnectionBuilder = HubConnectionBuilder as jest.MockedClass<typeof HubConnectionBuilder>;
const mockLogger = logger as jest.Mocked<typeof logger>;

describe('SignalRService', () => {
  let mockConnection: jest.Mocked<HubConnection>;
  let mockBuilderInstance: jest.Mocked<HubConnectionBuilder>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Clear SignalR service state
    (signalRService as any).connections.clear();
    (signalRService as any).reconnectAttempts.clear();
    (signalRService as any).hubConfigs.clear();
    (signalRService as any).directHubConfigs.clear();
    (signalRService as any).connectionLocks.clear();
    (signalRService as any).reconnectingHubs.clear();
    (signalRService as any).hubStates.clear();

    // Mock HubConnection
    mockConnection = {
      start: jest.fn().mockResolvedValue(undefined),
      stop: jest.fn().mockResolvedValue(undefined),
      invoke: jest.fn().mockResolvedValue(undefined),
      on: jest.fn(),
      onclose: jest.fn(),
      onreconnecting: jest.fn(),
      onreconnected: jest.fn(),
    } as any;

    // Mock HubConnectionBuilder
    mockBuilderInstance = {
      withUrl: jest.fn().mockReturnThis(),
      withAutomaticReconnect: jest.fn().mockReturnThis(),
      configureLogging: jest.fn().mockReturnThis(),
      build: jest.fn().mockReturnValue(mockConnection),
    } as any;

    mockHubConnectionBuilder.mockImplementation(() => mockBuilderInstance);

    // Reset refresh token mock
    mockRefreshAccessToken.mockClear();
    mockRefreshAccessToken.mockResolvedValue(undefined);

    // Mock auth store
    mockGetState.mockReturnValue({ 
      accessToken: 'mock-token',
      refreshAccessToken: mockRefreshAccessToken,
    });
  });

  describe('connectToHubWithEventingUrl', () => {
    const mockConfig: SignalRHubConnectConfig = {
      name: 'testHub',
      eventingUrl: 'https://api.example.com/',
      hubName: 'eventingHub',
      methods: ['method1', 'method2'],
    };

    it('should connect to hub successfully', async () => {
      await signalRService.connectToHubWithEventingUrl(mockConfig);

      expect(mockHubConnectionBuilder).toHaveBeenCalled();
      expect(mockBuilderInstance.withUrl).toHaveBeenCalledWith(
        'https://api.example.com/eventingHub',
        expect.objectContaining({
          accessTokenFactory: expect.any(Function),
        })
      );
      expect(mockBuilderInstance.withAutomaticReconnect).toHaveBeenCalledWith([0, 2000, 5000, 10000, 30000]);
      expect(mockBuilderInstance.configureLogging).toHaveBeenCalledWith(LogLevel.Information);
      expect(mockConnection.start).toHaveBeenCalled();
    });

    it('should register all methods on connection', async () => {
      await signalRService.connectToHubWithEventingUrl(mockConfig);

      expect(mockConnection.on).toHaveBeenCalledTimes(2);
      expect(mockConnection.on).toHaveBeenCalledWith('method1', expect.any(Function));
      expect(mockConnection.on).toHaveBeenCalledWith('method2', expect.any(Function));
    });

    it('should set up connection event handlers', async () => {
      await signalRService.connectToHubWithEventingUrl(mockConfig);

      expect(mockConnection.onclose).toHaveBeenCalledWith(expect.any(Function));
      expect(mockConnection.onreconnecting).toHaveBeenCalledWith(expect.any(Function));
      expect(mockConnection.onreconnected).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should throw error if no access token is available', async () => {
      mockGetState.mockReturnValue({ 
        accessToken: '',
        refreshAccessToken: mockRefreshAccessToken,
      });

      await expect(signalRService.connectToHubWithEventingUrl(mockConfig)).rejects.toThrow(
        'No authentication token available'
      );
    });

    it('should add trailing slash to EventingUrl if missing', async () => {
      const configWithoutSlash: SignalRHubConnectConfig = {
        name: 'testHub',
        eventingUrl: 'https://api.example.com',
        hubName: 'eventingHub',
        methods: ['method1', 'method2'],
      };

      await signalRService.connectToHubWithEventingUrl(configWithoutSlash);

      expect(mockBuilderInstance.withUrl).toHaveBeenCalledWith(
        'https://api.example.com/eventingHub',
        expect.any(Object),
      );
    });

    it('should use URL parameter for geolocation hub authentication', async () => {
      // Create a geolocation config
      const geoConfig: SignalRHubConnectConfig = {
        name: 'geoHub',
        eventingUrl: 'https://api.example.com/',
        hubName: 'geolocationHub', // This should match REALTIME_GEO_HUB_NAME from env
        methods: ['onPersonnelLocationUpdated'],
      };

      await signalRService.connectToHubWithEventingUrl(geoConfig);

      // Should connect with URL parameter instead of header auth
      expect(mockBuilderInstance.withUrl).toHaveBeenCalledWith(
        'https://api.example.com/geolocationHub?access_token=mock-token',
        {}
      );
    });

    it('should use header authentication for non-geolocation hubs', async () => {
      const regularConfig: SignalRHubConnectConfig = {
        name: 'regularHub',
        eventingUrl: 'https://api.example.com/',
        hubName: 'eventingHub',
        methods: ['method1'],
      };

      await signalRService.connectToHubWithEventingUrl(regularConfig);

      // Should connect with header auth
      expect(mockBuilderInstance.withUrl).toHaveBeenCalledWith(
        'https://api.example.com/eventingHub',
        expect.objectContaining({
          accessTokenFactory: expect.any(Function),
        })
      );
    });

    it('should properly encode access token in URL for geolocation hub', async () => {
      // Set up a token that needs encoding
      mockGetState.mockReturnValue({ 
        accessToken: 'token with spaces & special chars',
        refreshAccessToken: mockRefreshAccessToken,
      });

      const geoConfig: SignalRHubConnectConfig = {
        name: 'geoHub',
        eventingUrl: 'https://api.example.com/',
        hubName: 'geolocationHub', // This should match REALTIME_GEO_HUB_NAME from env
        methods: ['onPersonnelLocationUpdated'],
      };

      await signalRService.connectToHubWithEventingUrl(geoConfig);

      // Should properly encode the token in the URL (URLSearchParams uses + encoding for spaces)
      expect(mockBuilderInstance.withUrl).toHaveBeenCalledWith(
        'https://api.example.com/geolocationHub?access_token=token+with+spaces+%26+special+chars',
        {}
      );
    });

    it('should properly URI encode complex access tokens for geolocation hub', async () => {
      // Set up a complex token with various characters that need encoding
      mockGetState.mockReturnValue({ 
        accessToken: 'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9+/=?#&',
        refreshAccessToken: mockRefreshAccessToken,
      });

      const geoConfig: SignalRHubConnectConfig = {
        name: 'geoHub',
        eventingUrl: 'https://api.example.com/',
        hubName: 'geolocationHub',
        methods: ['onPersonnelLocationUpdated'],
      };

      await signalRService.connectToHubWithEventingUrl(geoConfig);

      // Should properly encode all special characters in the token (URLSearchParams uses + encoding for spaces)
      expect(mockBuilderInstance.withUrl).toHaveBeenCalledWith(
        'https://api.example.com/geolocationHub?access_token=Bearer+eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9%2B%2F%3D%3F%23%26',
        {}
      );
    });

    it('should handle URL with existing query parameters for geolocation hub', async () => {
      const geoConfig: SignalRHubConnectConfig = {
        name: 'geoHub',
        eventingUrl: 'https://api.example.com/path?existing=param',
        hubName: 'geolocationHub', // This should match REALTIME_GEO_HUB_NAME from env
        methods: ['onPersonnelLocationUpdated'],
      };

      await signalRService.connectToHubWithEventingUrl(geoConfig);

      // Should append the hub to the path and merge access_token with existing query parameters
      expect(mockBuilderInstance.withUrl).toHaveBeenCalledWith(
        'https://api.example.com/path/geolocationHub?existing=param&access_token=mock-token',
        {}
      );
    });

    it('should not add extra trailing slash if EventingUrl already has one', async () => {
      const configWithSlash: SignalRHubConnectConfig = {
        name: 'testHub',
        eventingUrl: 'https://api.example.com/',
        hubName: 'eventingHub',
        methods: ['method1', 'method2'],
      };

      await signalRService.connectToHubWithEventingUrl(configWithSlash);

      expect(mockBuilderInstance.withUrl).toHaveBeenCalledWith(
        'https://api.example.com/eventingHub',
        expect.any(Object),
      );
    });

    it('should throw error if EventingUrl is not provided', async () => {
      const configWithoutUrl = { ...mockConfig, eventingUrl: '' };

      await expect(signalRService.connectToHubWithEventingUrl(configWithoutUrl)).rejects.toThrow(
        'EventingUrl is required for SignalR connection'
      );
    });

    it('should not connect if already connected', async () => {
      // Connect first time
      await signalRService.connectToHubWithEventingUrl(mockConfig);
      
      // Reset mocks to verify second call behavior
      jest.clearAllMocks();
      
      // Try to connect again
      await signalRService.connectToHubWithEventingUrl(mockConfig);

      expect(mockHubConnectionBuilder).not.toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith({
        message: `Already connected to hub: ${mockConfig.name}`,
      });
    });

    it('should handle connection errors gracefully', async () => {
      const error = new Error('Connection failed');
      mockConnection.start.mockRejectedValue(error);

      await expect(signalRService.connectToHubWithEventingUrl(mockConfig)).rejects.toThrow(error);

      expect(mockLogger.error).toHaveBeenCalledWith({
        message: `Failed to connect to hub: ${mockConfig.name}`,
        context: { error },
      });
    });
  });

  describe('connectToHub (legacy method)', () => {
    const mockConfig: SignalRHubConfig = {
      name: 'testHub',
      url: 'https://api.example.com/hub',
      methods: ['method1'],
    };

    it('should connect to hub successfully', async () => {
      await signalRService.connectToHub(mockConfig);

      expect(mockHubConnectionBuilder).toHaveBeenCalled();
      expect(mockBuilderInstance.withUrl).toHaveBeenCalledWith(
        mockConfig.url,
        expect.objectContaining({
          accessTokenFactory: expect.any(Function),
        })
      );
      expect(mockConnection.start).toHaveBeenCalled();
    });
  });

  describe('disconnectFromHub', () => {
    const mockConfig: SignalRHubConnectConfig = {
      name: 'testHub',
      eventingUrl: 'https://api.example.com/',
      hubName: 'eventingHub',
      methods: ['method1'],
    };

    it('should disconnect from hub successfully', async () => {
      // Connect first
      await signalRService.connectToHubWithEventingUrl(mockConfig);
      
      // Then disconnect
      await signalRService.disconnectFromHub(mockConfig.name);

      expect(mockConnection.stop).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith({
        message: `Disconnected from hub: ${mockConfig.name}`,
      });
    });

    it('should handle disconnect errors gracefully', async () => {
      const error = new Error('Disconnect failed');
      
      // Connect first
      await signalRService.connectToHubWithEventingUrl(mockConfig);
      
      // Mock stop to throw error
      mockConnection.stop.mockRejectedValue(error);

      await expect(signalRService.disconnectFromHub(mockConfig.name)).rejects.toThrow(error);

      expect(mockLogger.error).toHaveBeenCalledWith({
        message: `Error disconnecting from hub: ${mockConfig.name}`,
        context: { error },
      });
    });

    it('should do nothing if hub is not connected', async () => {
      await signalRService.disconnectFromHub('nonExistentHub');

      expect(mockConnection.stop).not.toHaveBeenCalled();
    });
  });

  describe('invoke', () => {
    const mockConfig: SignalRHubConnectConfig = {
      name: 'testHub',
      eventingUrl: 'https://api.example.com/',
      hubName: 'eventingHub',
      methods: ['method1'],
    };

    it('should invoke method on connected hub', async () => {
      const methodData = { test: 'data' };
      
      // Connect first
      await signalRService.connectToHubWithEventingUrl(mockConfig);
      
      // Invoke method
      await signalRService.invoke(mockConfig.name, 'testMethod', methodData);

      expect(mockConnection.invoke).toHaveBeenCalledWith('testMethod', methodData);
    });

    it('should handle invoke errors gracefully', async () => {
      const error = new Error('Invoke failed');
      const methodData = { test: 'data' };
      
      // Connect first
      await signalRService.connectToHubWithEventingUrl(mockConfig);
      
      // Mock invoke to throw error
      mockConnection.invoke.mockRejectedValue(error);

      await expect(signalRService.invoke(mockConfig.name, 'testMethod', methodData)).rejects.toThrow(error);

      expect(mockLogger.error).toHaveBeenCalledWith({
        message: `Error invoking method testMethod from hub: ${mockConfig.name}`,
        context: { error },
      });
    });

    it('should throw error if hub is not connected', async () => {
      await expect(signalRService.invoke('nonExistentHub', 'testMethod', {})).rejects.toThrow(
        'Cannot invoke method testMethod on hub nonExistentHub: hub is not connected'
      );

      expect(mockConnection.invoke).not.toHaveBeenCalled();
    });

    it('should return typed results from hub invocations', async () => {
      interface TestResponse {
        success: boolean;
        message: string;
        data: { id: number; name: string };
      }

      const mockResponse: TestResponse = {
        success: true,
        message: 'Operation completed',
        data: { id: 123, name: 'Test Item' }
      };

      const methodData = { action: 'getData', id: 123 };
      
      // Connect first
      await signalRService.connectToHubWithEventingUrl(mockConfig);
      
      // Mock invoke to return typed response
      mockConnection.invoke.mockResolvedValue(mockResponse);

      // Invoke method with type specification
      const result = await signalRService.invoke<TestResponse>(mockConfig.name, 'getData', methodData);

      // Verify the result has the correct type and values
      expect(result).toEqual(mockResponse);
      expect(result.success).toBe(true);
      expect(result.message).toBe('Operation completed');
      expect(result.data.id).toBe(123);
      expect(result.data.name).toBe('Test Item');

      expect(mockConnection.invoke).toHaveBeenCalledWith('getData', methodData);
    });

    it('should work with unknown return type when no type specified', async () => {
      const mockResponse = { anyData: 'test', number: 42 };
      const methodData = { test: 'data' };
      
      // Connect first
      await signalRService.connectToHubWithEventingUrl(mockConfig);
      
      // Mock invoke to return response
      mockConnection.invoke.mockResolvedValue(mockResponse);

      // Invoke method without type specification (defaults to unknown)
      const result = await signalRService.invoke(mockConfig.name, 'testMethod', methodData);

      expect(result).toEqual(mockResponse);
      expect(mockConnection.invoke).toHaveBeenCalledWith('testMethod', methodData);
    });
  });

  describe('disconnectAll', () => {
    it('should disconnect all connected hubs', async () => {
      const config1: SignalRHubConnectConfig = {
        name: 'hub1',
        eventingUrl: 'https://api.example.com/',
        hubName: 'eventingHub',
        methods: ['method1'],
      };
      const config2: SignalRHubConnectConfig = {
        name: 'hub2',
        eventingUrl: 'https://api.example.com/',
        hubName: 'geoHub',
        methods: ['method2'],
      };

      // Connect to multiple hubs
      await signalRService.connectToHubWithEventingUrl(config1);
      await signalRService.connectToHubWithEventingUrl(config2);

      // Disconnect all
      await signalRService.disconnectAll();

      // Should have called stop on both connections
      expect(mockConnection.stop).toHaveBeenCalledTimes(2);
    });
  });

  describe('event handling', () => {
    const mockConfig: SignalRHubConnectConfig = {
      name: 'testHub',
      eventingUrl: 'https://api.example.com/',
      hubName: 'eventingHub',
      methods: ['testMethod'],
    };

    it('should handle received messages and emit events', async () => {
      const eventCallback = jest.fn();
      
      // Set up event listener
      signalRService.on('testMethod', eventCallback);
      
      // Connect to hub
      await signalRService.connectToHubWithEventingUrl(mockConfig);
      
      // Get the registered callback for the method
      const registeredCallback = mockConnection.on.mock.calls.find(
        call => call[0] === 'testMethod'
      )?.[1];
      
      expect(registeredCallback).toBeDefined();
      
      // Simulate receiving a message
      const testData = { message: 'test' };
      registeredCallback!(testData);
      
      // Verify the event was emitted
      expect(eventCallback).toHaveBeenCalledWith(testData);
    });

    it('should remove event listeners', () => {
      const eventCallback = jest.fn();
      
      signalRService.on('testEvent', eventCallback);
      signalRService.off('testEvent', eventCallback);
      
      // Emit an event (this would be called internally)
      signalRService['emit']('testEvent', { test: 'data' });
      
      // Callback should not have been called
      expect(eventCallback).not.toHaveBeenCalled();
    });
  });

  describe('reconnection handling', () => {
    const mockConfig: SignalRHubConnectConfig = {
      name: 'testHub',
      eventingUrl: 'https://api.example.com/',
      hubName: 'eventingHub',
      methods: ['method1'],
    };

    it('should attempt reconnection on connection close', async () => {
      // Connect to hub
      await signalRService.connectToHubWithEventingUrl(mockConfig);
      
      // Get the onclose callback
      const onCloseCallback = mockConnection.onclose.mock.calls[0]?.[0];
      
      // Spy on the connectToHubWithEventingUrl method to track reconnection attempts
      const connectSpy = jest.spyOn(signalRService, 'connectToHubWithEventingUrl');
      connectSpy.mockResolvedValue(); // Mock the reconnection call
      
      // Use fake timers for setTimeout
      jest.useFakeTimers();
      
      // Trigger connection close
      if (onCloseCallback) {
        onCloseCallback();
      }
      
      // Fast-forward time to trigger the first reconnection attempt (base delay: 5000ms)
      jest.advanceTimersByTime(6000); // Add extra time for jitter
      
      // Wait for all promises to resolve
      await jest.runAllTicks();
      
      // Should have called refreshAccessToken
      expect(mockRefreshAccessToken).toHaveBeenCalled();
      
      // Should have called connectToHubWithEventingUrl for reconnection
      expect(connectSpy).toHaveBeenCalledWith(mockConfig);
      
      jest.useRealTimers();
      connectSpy.mockRestore();
    }, 10000);

    it('should stop reconnection attempts after max attempts', async () => {
      // This test verifies the logic exists by calling attemptReconnection directly
      // with max attempts to test the boundary condition
      
      // Spy on the attemptReconnection method to verify max attempts logic
      const attemptReconnectionSpy = jest.spyOn((signalRService as any), 'attemptReconnection');
      
      // Call attemptReconnection directly with max attempts to test the boundary condition
      await (signalRService as any).attemptReconnection(mockConfig.name, 5); // 5 = MAX_RECONNECT_ATTEMPTS
      
      // Should log max attempts reached error
      expect(mockLogger.error).toHaveBeenCalledWith({
        message: `Max reconnection attempts (5) reached for hub: ${mockConfig.name}`,
      });
      
      attemptReconnectionSpy.mockRestore();
    });

    it('should reset reconnection attempts on successful reconnection', async () => {
      // Test that successful reconnection resets the attempt counter
      
      // Set up some attempts in the counter
      (signalRService as any).reconnectAttempts.set(mockConfig.name, 3);
      
      // Connect to hub (this should reset the attempts to 0 on success)
      await signalRService.connectToHubWithEventingUrl(mockConfig);
      
      // Check that attempts were reset to 0
      const attempts = (signalRService as any).reconnectAttempts.get(mockConfig.name);
      expect(attempts).toBe(0);
    });

    it('should handle token refresh failure during reconnection', async () => {
      // Test the token refresh failure logic directly
      
      // Setup refresh token to fail
      mockRefreshAccessToken.mockRejectedValue(new Error('Token refresh failed'));
      
      // Call attemptReconnection directly to test token refresh failure
      jest.useFakeTimers();
      
      // Set up the hub config so the method can find it
      (signalRService as any).hubConfigs.set(mockConfig.name, mockConfig);
      
      // Spy on connectToHubWithEventingUrl to ensure it's not called
      const connectSpy = jest.spyOn(signalRService, 'connectToHubWithEventingUrl');
      connectSpy.mockResolvedValue();
      
      // Call attemptReconnection
      (signalRService as any).attemptReconnection(mockConfig.name, 0);
      
      // Advance time to trigger the attempt
      jest.advanceTimersByTime(6000);
      await jest.runAllTicks();
      
      // Should have attempted to refresh token
      expect(mockRefreshAccessToken).toHaveBeenCalled();
      
      // Should NOT have called connectToHubWithEventingUrl due to token refresh failure
      expect(connectSpy).not.toHaveBeenCalled();
      
      jest.useRealTimers();
      connectSpy.mockRestore();
    });
  });
});
