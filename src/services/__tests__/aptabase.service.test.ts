import { aptabaseService } from '../aptabase.service';
import { logger } from '../../lib/logging';

jest.mock('@aptabase/react-native', () => ({
  trackEvent: jest.fn(),
}));

jest.mock('../../lib/logging', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('AptabaseService', () => {
  const mockLogger = logger as jest.Mocked<typeof logger>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('basic functionality', () => {
    it('should exist', () => {
      expect(aptabaseService).toBeDefined();
    });

    it('should track events when not disabled', () => {
      const { trackEvent } = require('@aptabase/react-native');
      
      aptabaseService.trackEvent('test_event', { prop1: 'value1' });
      
      expect(trackEvent).toHaveBeenCalledWith('test_event', { prop1: 'value1' });
      expect(mockLogger.debug).toHaveBeenCalledWith({
        message: 'Analytics event tracked',
        context: { eventName: 'test_event', properties: { prop1: 'value1' } },
      });
    });

    it('should not track events when disabled', () => {
      const { trackEvent } = require('@aptabase/react-native');
      
      // Manually disable the service
      aptabaseService.reset();
      aptabaseService['isDisabled'] = true;
      
      aptabaseService.trackEvent('test_event', { prop1: 'value1' });
      
      expect(trackEvent).not.toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith({
        message: 'Analytics event skipped - service is disabled',
        context: { eventName: 'test_event', properties: { prop1: 'value1' } },
      });
    });
  });

  describe('error handling', () => {
    it('should handle tracking errors gracefully', () => {
      const { trackEvent } = require('@aptabase/react-native');
      trackEvent.mockImplementation(() => {
        throw new Error('Network error');
      });

      aptabaseService.reset();
      aptabaseService.trackEvent('test_event');

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
      const { trackEvent } = require('@aptabase/react-native');
      trackEvent.mockImplementation(() => {
        throw new Error('Network error');
      });

      aptabaseService.reset();

      // Trigger multiple errors to exceed max retries
      aptabaseService.trackEvent('test_event');
      aptabaseService.trackEvent('test_event');

      expect(mockLogger.info).toHaveBeenCalledWith({
        message: 'Analytics temporarily disabled due to errors',
        context: {
          retryCount: 2,
          disableTimeoutMinutes: 10,
        },
      });

      expect(aptabaseService.isAnalyticsDisabled()).toBe(true);
    });

    it('should re-enable after timeout', () => {
      const { trackEvent } = require('@aptabase/react-native');
      trackEvent.mockImplementation(() => {
        throw new Error('Network error');
      });

      aptabaseService.reset();

      // Trigger max retries to disable service
      aptabaseService.trackEvent('test_event');
      aptabaseService.trackEvent('test_event');

      expect(aptabaseService.isAnalyticsDisabled()).toBe(true);

      // Fast-forward time to trigger re-enable
      jest.advanceTimersByTime(10 * 60 * 1000);

      expect(mockLogger.info).toHaveBeenCalledWith({
        message: 'Analytics re-enabled after recovery',
        context: {
          note: 'Analytics service has been restored and is ready for use',
        },
      });

      expect(aptabaseService.isAnalyticsDisabled()).toBe(false);
    });
  });

  describe('service status', () => {
    it('should return correct status', () => {
      aptabaseService.reset();
      
      const status = aptabaseService.getStatus();
      
      expect(status).toEqual({
        retryCount: 0,
        isDisabled: false,
        maxRetries: 2,
        disableTimeoutMinutes: 10,
      });
    });

    it('should update status after errors', () => {
      const { trackEvent } = require('@aptabase/react-native');
      trackEvent.mockImplementation(() => {
        throw new Error('Network error');
      });

      aptabaseService.reset();
      aptabaseService.trackEvent('test_event');
      
      const status = aptabaseService.getStatus();
      
      expect(status.retryCount).toBe(1);
      expect(status.isDisabled).toBe(false);
    });
  });

  describe('reset functionality', () => {
    it('should reset service state', () => {
      const { trackEvent } = require('@aptabase/react-native');
      trackEvent.mockImplementation(() => {
        throw new Error('Network error');
      });

      // Cause some errors first
      aptabaseService.trackEvent('test_event');
      aptabaseService.trackEvent('test_event');
      
      expect(aptabaseService.isAnalyticsDisabled()).toBe(true);
      
      // Reset should clear the state
      aptabaseService.reset();
      
      expect(aptabaseService.isAnalyticsDisabled()).toBe(false);
      expect(aptabaseService.getStatus().retryCount).toBe(0);
    });
  });
});
