import { Platform } from 'react-native';

import { logger } from '../lib/logging';

export interface CallKeepConfig {
  appName: string;
  maximumCallGroups: number;
  maximumCallsPerCallGroup: number;
  includesCallsInRecents: boolean;
  supportsVideo: boolean;
  ringtoneSound?: string;
}

/**
 * Android implementation of CallKeepService
 * This is a no-op implementation since CallKeep is iOS-specific
 * but provides the same interface for cross-platform compatibility
 */
export class CallKeepService {
  private static instance: CallKeepService | null = null;

  private constructor() {}

  static getInstance(): CallKeepService {
    if (!CallKeepService.instance) {
      CallKeepService.instance = new CallKeepService();
    }
    return CallKeepService.instance;
  }

  /**
   * Setup CallKeep - no-op on Android
   */
  async setup(config: CallKeepConfig): Promise<void> {
    logger.debug({
      message: 'CallKeep setup skipped - Android platform does not require CallKeep',
      context: { platform: Platform.OS },
    });
  }

  /**
   * Start a call - no-op on Android
   */
  async startCall(roomName: string, handle?: string): Promise<string> {
    logger.debug({
      message: 'CallKeep startCall skipped - Android platform does not require CallKeep',
      context: { platform: Platform.OS, roomName, handle },
    });
    return '';
  }

  /**
   * End a call - no-op on Android
   */
  async endCall(): Promise<void> {
    logger.debug({
      message: 'CallKeep endCall skipped - Android platform does not require CallKeep',
      context: { platform: Platform.OS },
    });
  }

  /**
   * Set mute state callback - no-op on Android
   */
  setMuteStateCallback(callback: ((muted: boolean) => void) | null): void {
    logger.debug({
      message: 'CallKeep setMuteStateCallback skipped - Android platform does not require CallKeep',
      context: { platform: Platform.OS },
    });
  }

  /**
   * Check if call is active - always false on Android
   */
  isCallActiveNow(): boolean {
    return false;
  }

  /**
   * Get current call UUID - always null on Android
   */
  getCurrentCallUUID(): string | null {
    return null;
  }

  /**
   * Clean up resources - no-op on Android
   */
  async cleanup(): Promise<void> {
    logger.debug({
      message: 'CallKeep cleanup skipped - Android platform does not require CallKeep',
      context: { platform: Platform.OS },
    });
  }
}

// Export singleton instance
export const callKeepService = CallKeepService.getInstance();
