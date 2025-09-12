import { Env } from '@env';
import Countly from 'countly-sdk-react-native-bridge';
import CountlyConfig from 'countly-sdk-react-native-bridge/CountlyConfig';

import { logger } from '@/lib/logging';

interface AnalyticsEventProperties {
  [key: string]: string | number | boolean;
}

interface AnalyticsServiceOptions {
  maxRetries?: number;
  retryDelay?: number;
  enableLogging?: boolean;
  disableTimeout?: number;
}

class AnalyticsService {
  private retryCount = 0;
  private maxRetries = 2;
  private retryDelay = 2000;
  private enableLogging = true;
  private isDisabled = false;
  private disableTimeout = 10 * 60 * 1000;
  private lastErrorTime = 0;
  private errorThrottleMs = 30000;
  private isInitialized = false;

  constructor(options: AnalyticsServiceOptions = {}) {
    this.maxRetries = options.maxRetries ?? 2;
    this.retryDelay = options.retryDelay ?? 2000;
    this.enableLogging = options.enableLogging ?? true;
    this.disableTimeout = options.disableTimeout ?? 10 * 60 * 1000;
  }

  /**
   * Initialize Countly SDK
   * This should be called once during app initialization
   */
  public async initialize(appKey: string, serverUrl: string): Promise<void> {
    if (this.isInitialized) {
      if (this.enableLogging) {
        logger.debug({
          message: 'Analytics service already initialized',
        });
      }
      return;
    }

    try {
      // Configure Countly
      const config = new CountlyConfig(serverUrl, appKey);
      config.setLoggingEnabled(this.enableLogging).enableCrashReporting().setRequiresConsent(false);

      await Countly.initWithConfig(config);
      this.isInitialized = true;

      if (this.enableLogging) {
        logger.info({
          message: 'Analytics service initialized with Countly',
          context: { serverUrl },
        });
      }
    } catch (error: any) {
      logger.error({
        message: 'Failed to initialize analytics service',
        context: { error: error.message || String(error) },
      });
      throw error;
    }
  }

  /**
   * Initialize with environment variables
   * Convenience method for app startup
   */
  public async initializeWithEnv(): Promise<void> {
    const appKey = Env.COUNTLY_APP_KEY;
    const serverUrl = Env.COUNTLY_URL;

    if (!appKey || !serverUrl) {
      if (this.enableLogging) {
        logger.warn({
          message: 'Analytics environment variables not configured, skipping initialization',
          context: { hasAppKey: Boolean(appKey), hasServerUrl: Boolean(serverUrl) },
        });
      }
      return;
    }

    return this.initialize(appKey, serverUrl);
  }

  /**
   * Track an analytics event
   */
  public trackEvent(eventName: string, properties: AnalyticsEventProperties = {}): void {
    if (!this.isInitialized) {
      if (this.enableLogging) {
        logger.warn({
          message: 'Analytics event skipped - service not initialized',
          context: { eventName, properties },
        });
      }
      return;
    }

    if (this.isDisabled) {
      if (this.enableLogging) {
        logger.debug({
          message: 'Analytics event skipped - service is disabled',
          context: { eventName, properties },
        });
      }
      return;
    }

    // Convert properties to Countly format
    const segmentation = this.convertPropertiesToSegmentation(properties);

    try {
      Countly.events.recordEvent(eventName, segmentation);

      // Log event tracking immediately
      if (this.enableLogging) {
        logger.debug({
          message: 'Analytics event tracked',
          context: { eventName, properties },
        });
      }
    } catch (error: any) {
      this.handleAnalyticsError(error, eventName, properties);
    }
  }

  /**
   * Convert analytics properties to Countly segmentation format
   */
  private convertPropertiesToSegmentation(properties: AnalyticsEventProperties): Record<string, string> {
    const segmentation: Record<string, string> = {};

    for (const [key, value] of Object.entries(properties)) {
      // Countly segmentation values must be strings
      if (typeof value === 'string') {
        segmentation[key] = value;
      } else if (typeof value === 'number') {
        segmentation[key] = value.toString();
      } else if (typeof value === 'boolean') {
        segmentation[key] = value ? 'true' : 'false';
      }
    }

    return segmentation;
  }

  /**
   * Handle analytics errors gracefully
   */
  private handleAnalyticsError(error: any, eventName?: string, properties?: AnalyticsEventProperties): void {
    if (this.isDisabled) {
      return;
    }

    this.retryCount++;
    const now = Date.now();

    if (this.enableLogging && now - this.lastErrorTime > this.errorThrottleMs) {
      this.lastErrorTime = now;

      logger.error({
        message: 'Analytics tracking error',
        context: {
          error: error.message || String(error),
          eventName,
          properties,
          retryCount: this.retryCount,
          maxRetries: this.maxRetries,
          willDisable: this.retryCount >= this.maxRetries,
        },
      });
    }

    if (this.retryCount >= this.maxRetries) {
      this.disableAnalytics();
    }
  }

  /**
   * Disable analytics temporarily to prevent further errors
   */
  private disableAnalytics(): void {
    if (this.isDisabled) {
      return;
    }

    this.isDisabled = true;

    if (this.enableLogging) {
      logger.info({
        message: 'Analytics temporarily disabled due to errors',
        context: {
          retryCount: this.retryCount,
          disableTimeoutMinutes: this.disableTimeout / 60000,
        },
      });
    }

    setTimeout(() => {
      this.enableAnalytics();
    }, this.disableTimeout);
  }

  /**
   * Re-enable analytics after issues are resolved
   */
  private enableAnalytics(): void {
    this.isDisabled = false;
    this.retryCount = 0;
    this.lastErrorTime = 0;

    if (this.enableLogging) {
      logger.info({
        message: 'Analytics re-enabled after recovery',
        context: {
          note: 'Analytics service has been restored and is ready for use',
        },
      });
    }
  }

  /**
   * Check if analytics is currently disabled
   */
  public isAnalyticsDisabled(): boolean {
    return this.isDisabled;
  }

  /**
   * Check if analytics service is initialized
   */
  public isServiceInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Reset the service state (primarily for testing)
   */
  public reset(): void {
    this.retryCount = 0;
    this.isDisabled = false;
    this.lastErrorTime = 0;
    this.isInitialized = false;
  }

  /**
   * Get current service status
   */
  public getStatus(): {
    retryCount: number;
    isDisabled: boolean;
    maxRetries: number;
    disableTimeoutMinutes: number;
    isInitialized: boolean;
  } {
    return {
      retryCount: this.retryCount,
      isDisabled: this.isDisabled,
      maxRetries: this.maxRetries,
      disableTimeoutMinutes: this.disableTimeout / 60000,
      isInitialized: this.isInitialized,
    };
  }

  /**
   * Set user properties (Countly user details)
   */
  public setUserProperties(properties: Record<string, string | number | boolean>): void {
    if (!this.isInitialized) {
      if (this.enableLogging) {
        logger.warn({
          message: 'User properties not set - service not initialized',
          context: { properties },
        });
      }
      return;
    }

    try {
      const userDetails: Record<string, string> = {};

      for (const [key, value] of Object.entries(properties)) {
        if (typeof value === 'string') {
          userDetails[key] = value;
        } else if (typeof value === 'number') {
          userDetails[key] = value.toString();
        } else if (typeof value === 'boolean') {
          userDetails[key] = value ? 'true' : 'false';
        }
      }

      Countly.setUserData(userDetails);

      if (this.enableLogging) {
        logger.debug({
          message: 'User properties set',
          context: { properties },
        });
      }
    } catch (error: any) {
      logger.error({
        message: 'Failed to set user properties',
        context: { error: error.message || String(error), properties },
      });
    }
  }

  /**
   * End current session (useful for logout)
   */
  public endSession(): void {
    if (!this.isInitialized) {
      return;
    }

    try {
      Countly.endSession();

      if (this.enableLogging) {
        logger.debug({
          message: 'Analytics session ended',
        });
      }
    } catch (error: any) {
      logger.error({
        message: 'Failed to end analytics session',
        context: { error: error.message || String(error) },
      });
    }
  }
}

export const analyticsService = new AnalyticsService();
