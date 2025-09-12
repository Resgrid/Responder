import { analyticsService } from '../analytics.service';
import { logger } from '../../lib/logging';

jest.mock('countly-sdk-react-native-bridge', () => ({
  __esModule: true,
  default: {
    initWithConfig: jest.fn(),
    events: {
      recordEvent: jest.fn(),
    },
    setUserData: jest.fn(),
    endSession: jest.fn(),
  },
}));

jest.mock('countly-sdk-react-native-bridge/CountlyConfig', () => {
  return jest.fn().mockImplementation(() => ({
    setLoggingEnabled: jest.fn().mockReturnThis(),
    enableCrashReporting: jest.fn().mockReturnThis(),
    setRequiresConsent: jest.fn().mockReturnThis(),
  }));
});

jest.mock('../../lib/logging', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('AnalyticsService', () => {
  const mockLogger = logger as jest.Mocked<typeof logger>;
  let mockCountly: any;
  let MockCountlyConfig: any;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useFakeTimers();
    
    mockCountly = require('countly-sdk-react-native-bridge').default;
    MockCountlyConfig = require('countly-sdk-react-native-bridge/CountlyConfig');
    
    // Reset the service state
    analyticsService.reset();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('initialization', () => {
    it('should initialize Countly with correct config', async () => {
      mockCountly.initWithConfig.mockResolvedValue(undefined);

      await analyticsService.initialize('test-app-key', 'https://test.countly.com');

      expect(MockCountlyConfig).toHaveBeenCalledWith('https://test.countly.com', 'test-app-key');
      expect(mockCountly.initWithConfig).toHaveBeenCalledTimes(1);
      expect(mockLogger.info).toHaveBeenCalledWith({
        message: 'Analytics service initialized with Countly',
        context: { serverUrl: 'https://test.countly.com' },
      });
    });

    it('should not initialize twice', async () => {
      mockCountly.initWithConfig.mockResolvedValue(undefined);

      await analyticsService.initialize('test-app-key', 'https://test.countly.com');
      await analyticsService.initialize('test-app-key', 'https://test.countly.com');

      expect(mockCountly.initWithConfig).toHaveBeenCalledTimes(1);
      expect(mockLogger.debug).toHaveBeenCalledWith({
        message: 'Analytics service already initialized',
      });
    });

    it('should handle initialization errors', async () => {
      const error = new Error('Initialization failed');
      mockCountly.initWithConfig.mockRejectedValue(error);

      await expect(
        analyticsService.initialize('test-app-key', 'https://test.countly.com')
      ).rejects.toThrow('Initialization failed');

      expect(mockLogger.error).toHaveBeenCalledWith({
        message: 'Failed to initialize analytics service',
        context: { error: 'Initialization failed' },
      });
    });
  });

  describe('event tracking', () => {
    beforeEach(async () => {
      mockCountly.initWithConfig.mockResolvedValue(undefined);
      await analyticsService.initialize('test-app-key', 'https://test.countly.com');
      jest.clearAllMocks(); // Clear initialization logs
    });

    it('should track events when initialized', () => {
      analyticsService.trackEvent('test_event', { prop1: 'value1', prop2: 42, prop3: true });

      expect(mockCountly.events.recordEvent).toHaveBeenCalledWith('test_event', {
        prop1: 'value1',
        prop2: '42',
        prop3: 'true',
      });
      expect(mockLogger.debug).toHaveBeenCalledWith({
        message: 'Analytics event tracked',
        context: { eventName: 'test_event', properties: { prop1: 'value1', prop2: 42, prop3: true } },
      });
    });

    it('should not track events when not initialized', () => {
      analyticsService.reset(); // Reset to uninitialized state
      
      analyticsService.trackEvent('test_event', { prop1: 'value1' });

      expect(mockCountly.events.recordEvent).not.toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalledWith({
        message: 'Analytics event skipped - service not initialized',
        context: { eventName: 'test_event', properties: { prop1: 'value1' } },
      });
    });

    it('should not track events when disabled', () => {
      // Manually disable the service
      analyticsService['isDisabled'] = true;

      analyticsService.trackEvent('test_event', { prop1: 'value1' });

      expect(mockCountly.events.recordEvent).not.toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith({
        message: 'Analytics event skipped - service is disabled',
        context: { eventName: 'test_event', properties: { prop1: 'value1' } },
      });
    });

    it('should handle tracking errors gracefully', () => {
      mockCountly.events.recordEvent.mockImplementation(() => {
        throw new Error('Network error');
      });

      analyticsService.trackEvent('test_event');

      expect(mockLogger.error).toHaveBeenCalledWith({
        message: 'Analytics tracking error',
        context: {
          error: 'Network error',
          eventName: 'test_event',
          properties: {},
          retryCount: 1,
          maxRetries: 2,
          willDisable: false,
        },
      });
    });

    it('should disable service after max retries', () => {
      mockCountly.events.recordEvent.mockImplementation(() => {
        throw new Error('Network error');
      });

      // Trigger multiple errors to exceed max retries
      analyticsService.trackEvent('test_event');
      analyticsService.trackEvent('test_event');

      expect(mockLogger.info).toHaveBeenCalledWith({
        message: 'Analytics temporarily disabled due to errors',
        context: {
          retryCount: 2,
          disableTimeoutMinutes: 10,
        },
      });

      expect(analyticsService.isAnalyticsDisabled()).toBe(true);
    });
  });

  describe('user properties', () => {
    beforeEach(async () => {
      mockCountly.initWithConfig.mockResolvedValue(undefined);
      await analyticsService.initialize('test-app-key', 'https://test.countly.com');
      jest.clearAllMocks();
    });

    it('should set user properties when initialized', () => {
      const properties = { userId: 'test123', role: 'admin', isActive: true };
      
      analyticsService.setUserProperties(properties);

      expect(mockCountly.setUserData).toHaveBeenCalledWith({
        userId: 'test123',
        role: 'admin',
        isActive: 'true',
      });
      expect(mockLogger.debug).toHaveBeenCalledWith({
        message: 'User properties set',
        context: { properties },
      });
    });

    it('should not set user properties when not initialized', () => {
      analyticsService.reset();
      const properties = { userId: 'test123' };
      
      analyticsService.setUserProperties(properties);

      expect(mockCountly.setUserData).not.toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalledWith({
        message: 'User properties not set - service not initialized',
        context: { properties },
      });
    });

    it('should handle user properties errors', () => {
      mockCountly.setUserData.mockImplementation(() => {
        throw new Error('Network error');
      });
      
      const properties = { userId: 'test123' };
      analyticsService.setUserProperties(properties);

      expect(mockLogger.error).toHaveBeenCalledWith({
        message: 'Failed to set user properties',
        context: { error: 'Network error', properties },
      });
    });
  });

  describe('session management', () => {
    beforeEach(async () => {
      mockCountly.initWithConfig.mockResolvedValue(undefined);
      await analyticsService.initialize('test-app-key', 'https://test.countly.com');
      jest.clearAllMocks();
    });

    it('should end session when initialized', () => {
      analyticsService.endSession();

      expect(mockCountly.endSession).toHaveBeenCalledTimes(1);
      expect(mockLogger.debug).toHaveBeenCalledWith({
        message: 'Analytics session ended',
      });
    });

    it('should not end session when not initialized', () => {
      analyticsService.reset();
      
      analyticsService.endSession();

      expect(mockCountly.endSession).not.toHaveBeenCalled();
    });

    it('should handle session end errors', () => {
      mockCountly.endSession.mockImplementation(() => {
        throw new Error('Network error');
      });
      
      analyticsService.endSession();

      expect(mockLogger.error).toHaveBeenCalledWith({
        message: 'Failed to end analytics session',
        context: { error: 'Network error' },
      });
    });
  });

  describe('service status', () => {
    it('should return correct status', () => {
      const status = analyticsService.getStatus();
      
      expect(status).toEqual({
        retryCount: 0,
        isDisabled: false,
        maxRetries: 2,
        disableTimeoutMinutes: 10,
        isInitialized: false,
      });
    });

    it('should update status after initialization', async () => {
      mockCountly.initWithConfig.mockResolvedValue(undefined);
      await analyticsService.initialize('test-app-key', 'https://test.countly.com');
      
      const status = analyticsService.getStatus();
      
      expect(status.isInitialized).toBe(true);
    });

    it('should update status after errors', async () => {
      mockCountly.initWithConfig.mockResolvedValue(undefined);
      await analyticsService.initialize('test-app-key', 'https://test.countly.com');
      
      mockCountly.events.recordEvent.mockImplementation(() => {
        throw new Error('Network error');
      });

      analyticsService.trackEvent('test_event');
      
      const status = analyticsService.getStatus();
      
      expect(status.retryCount).toBe(1);
      expect(status.isDisabled).toBe(false);
    });
  });

  describe('recovery after disable', () => {
    beforeEach(async () => {
      mockCountly.initWithConfig.mockResolvedValue(undefined);
      await analyticsService.initialize('test-app-key', 'https://test.countly.com');
    });

    it('should re-enable after timeout', () => {
      mockCountly.events.recordEvent.mockImplementation(() => {
        throw new Error('Network error');
      });

      // Trigger max retries to disable service
      analyticsService.trackEvent('test_event');
      analyticsService.trackEvent('test_event');

      expect(analyticsService.isAnalyticsDisabled()).toBe(true);

      // Fast-forward time to trigger re-enable
      jest.advanceTimersByTime(10 * 60 * 1000);

      expect(mockLogger.info).toHaveBeenCalledWith({
        message: 'Analytics re-enabled after recovery',
        context: {
          note: 'Analytics service has been restored and is ready for use',
        },
      });

      expect(analyticsService.isAnalyticsDisabled()).toBe(false);
    });
  });

  describe('reset functionality', () => {
    it('should reset service state', async () => {
      mockCountly.initWithConfig.mockResolvedValue(undefined);
      await analyticsService.initialize('test-app-key', 'https://test.countly.com');
      
      mockCountly.events.recordEvent.mockImplementation(() => {
        throw new Error('Network error');
      });

      // Cause some errors first
      analyticsService.trackEvent('test_event');
      analyticsService.trackEvent('test_event');
      
      expect(analyticsService.isAnalyticsDisabled()).toBe(true);
      expect(analyticsService.isServiceInitialized()).toBe(true);
      
      // Reset should clear the state
      analyticsService.reset();
      
      expect(analyticsService.isAnalyticsDisabled()).toBe(false);
      expect(analyticsService.isServiceInitialized()).toBe(false);
      expect(analyticsService.getStatus().retryCount).toBe(0);
    });
  });
});
