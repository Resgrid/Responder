import { trackEvent } from '@aptabase/react-native';

import { logger } from '@/lib/logging';

interface AnalyticsEventProperties {
  [key: string]: string | number | boolean;
}

interface AptabaseServiceOptions {
  maxRetries?: number;
  retryDelay?: number;
  enableLogging?: boolean;
  disableTimeout?: number;
}

class AptabaseService {
  private retryCount = 0;
  private maxRetries = 2;
  private retryDelay = 2000;
  private enableLogging = true;
  private isDisabled = false;
  private disableTimeout = 10 * 60 * 1000;
  private lastErrorTime = 0;
  private errorThrottleMs = 30000;

  constructor(options: AptabaseServiceOptions = {}) {
    this.maxRetries = options.maxRetries ?? 2;
    this.retryDelay = options.retryDelay ?? 2000;
    this.enableLogging = options.enableLogging ?? true;
    this.disableTimeout = options.disableTimeout ?? 10 * 60 * 1000;
  }

  /**
   * Track an analytics event
   */
  public trackEvent(eventName: string, properties: AnalyticsEventProperties = {}): void {
    if (this.isDisabled) {
      if (this.enableLogging) {
        logger.debug({
          message: 'Analytics event skipped - service is disabled',
          context: { eventName, properties },
        });
      }
      return;
    }

    // Invoke the external tracking
    try {
      const result = trackEvent(eventName, properties);
      // Log event tracking immediately
      if (this.enableLogging) {
        logger.debug({
          message: 'Analytics event tracked',
          context: { eventName, properties },
        });
      }
      // Handle any promise rejection from trackEvent
      Promise.resolve(result).catch((error: any) => {
        this.handleAnalyticsError(error, eventName, properties);
      });
    } catch (error: any) {
      this.handleAnalyticsError(error, eventName, properties);
    }
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
   * Reset the service state (primarily for testing)
   */
  public reset(): void {
    this.retryCount = 0;
    this.isDisabled = false;
    this.lastErrorTime = 0;
  }

  /**
   * Get current service status
   */
  public getStatus(): {
    retryCount: number;
    isDisabled: boolean;
    maxRetries: number;
    disableTimeoutMinutes: number;
  } {
    return {
      retryCount: this.retryCount,
      isDisabled: this.isDisabled,
      maxRetries: this.maxRetries,
      disableTimeoutMinutes: this.disableTimeout / 60000,
    };
  }
}

export const aptabaseService = new AptabaseService();
