import { logger } from '@/lib/logging';

interface PostHogServiceOptions {
  maxRetries?: number;
  retryDelay?: number;
  enableLogging?: boolean;
  disableTimeout?: number;
}

class PostHogService {
  private retryCount = 0;
  private maxRetries = 2;
  private retryDelay = 2000;
  private enableLogging = true;
  private isDisabled = false;
  private navigationErrorsSuppressed = false;
  private disableTimeout = 10 * 60 * 1000;
  private lastErrorTime = 0;
  private errorThrottleMs = 30000;

  constructor(options: PostHogServiceOptions = {}) {
    this.maxRetries = options.maxRetries ?? 2;
    this.retryDelay = options.retryDelay ?? 2000;
    this.enableLogging = options.enableLogging ?? true;
    this.disableTimeout = options.disableTimeout ?? 10 * 60 * 1000;
  }

  /**
   * Handle PostHog network errors gracefully
   */
  public handleNetworkError(error: any): void {
    if (this.isDisabled) {
      return;
    }

    this.retryCount++;
    const now = Date.now();

    if (this.enableLogging && now - this.lastErrorTime > this.errorThrottleMs) {
      this.lastErrorTime = now;

      logger.error({
        message: 'PostHog network error',
        context: {
          error: error.message || String(error),
          retryCount: this.retryCount,
          maxRetries: this.maxRetries,
          willDisable: this.retryCount >= this.maxRetries,
        },
      });
    }

    if (this.retryCount >= this.maxRetries) {
      this.disablePostHog();
    }
  }

  /**
   * Handle PostHog navigation state errors
   */
  public handleNavigationError(error: any): void {
    if (!this.navigationErrorsSuppressed) {
      this.navigationErrorsSuppressed = true;

      if (this.enableLogging) {
        logger.warn({
          message: 'PostHog navigation state errors suppressed',
          context: {
            error: error.message || String(error),
            note: 'Navigation tracking has been disabled to prevent errors',
          },
        });
      }
    }
  }

  /**
   * Disable PostHog temporarily to prevent further network errors
   */
  private disablePostHog(): void {
    if (this.isDisabled) {
      return;
    }

    this.isDisabled = true;

    if (this.enableLogging) {
      logger.info({
        message: 'PostHog temporarily disabled due to network errors',
        context: {
          retryCount: this.retryCount,
          disableTimeoutMinutes: this.disableTimeout / 60000,
        },
      });
    }

    setTimeout(() => {
      this.enablePostHog();
    }, this.disableTimeout);
  }

  /**
   * Re-enable PostHog after network issues are resolved
   */
  private enablePostHog(): void {
    this.isDisabled = false;
    this.retryCount = 0;
    this.lastErrorTime = 0;

    if (this.enableLogging) {
      logger.info({
        message: 'PostHog re-enabled after network recovery',
        context: {
          note: 'PostHog service has been restored and is ready for use',
        },
      });
    }
  }

  /**
   * Check if PostHog is currently disabled
   */
  public isPostHogDisabled(): boolean {
    return this.isDisabled;
  }

  /**
   * Check if navigation errors are being suppressed
   */
  public areNavigationErrorsSuppressed(): boolean {
    return this.navigationErrorsSuppressed;
  }

  /**
   * Reset the service state (primarily for testing)
   */
  public reset(): void {
    this.retryCount = 0;
    this.isDisabled = false;
    this.navigationErrorsSuppressed = false;
    this.lastErrorTime = 0;
  }

  /**
   * Get current service status
   */
  public getStatus(): {
    retryCount: number;
    isDisabled: boolean;
    navigationErrorsSuppressed: boolean;
    maxRetries: number;
    disableTimeoutMinutes: number;
  } {
    return {
      retryCount: this.retryCount,
      isDisabled: this.isDisabled,
      navigationErrorsSuppressed: this.navigationErrorsSuppressed,
      maxRetries: this.maxRetries,
      disableTimeoutMinutes: this.disableTimeout / 60000,
    };
  }
}

export const postHogService = new PostHogService();
