import { PermissionsAndroid, Platform } from 'react-native';
import RNCallKeep from 'react-native-callkeep';

import { logger } from '../lib/logging';

// UUID for the CallKeep call - should be unique per session
let currentCallUUID: string | null = null;

export interface CallKeepConfig {
  appName: string;
  maximumCallGroups: number;
  maximumCallsPerCallGroup: number;
  includesCallsInRecents: boolean;
  supportsVideo: boolean;
  ringtoneSound?: string;
}

export class CallKeepService {
  private static instance: CallKeepService | null = null;
  private isSetup = false;
  private isCallActive = false;
  private muteStateCallback: ((muted: boolean) => void) | null = null;
  private endCallCallback: (() => void) | null = null;

  private constructor() {}

  static getInstance(): CallKeepService {
    if (!CallKeepService.instance) {
      CallKeepService.instance = new CallKeepService();
    }
    return CallKeepService.instance;
  }

  /**
   * Setup CallKeep with the required configuration
   * This should be called once during app initialization
   */
  async setup(config: CallKeepConfig): Promise<void> {
    if (Platform.OS !== 'android') {
      return;
    }

    if (this.isSetup) {
      logger.debug({
        message: 'CallKeep (Android) already setup',
      });
      return;
    }

    try {
      const options = {
        ios: {
          appName: config.appName,
        },
        android: {
          alertTitle: 'Permissions required',
          alertDescription: 'This application needs to access your phone accounts',
          cancelButton: 'Cancel',
          okButton: 'OK',
          additionalPermissions: [PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE, ...(Platform.Version >= 30 ? [PermissionsAndroid.PERMISSIONS.READ_PHONE_NUMBERS] : [])],
          // Important for VoIP on Android O+
          selfManaged: true,
          foregroundService: {
            channelId: 'call_channel',
            channelName: 'Active Call',
            notificationTitle: 'Call in progress',
            notificationIcon: 'ic_notification',
          },
        },
      };

      await RNCallKeep.setup(options);

      // Set available for Android 23+
      // Note: Phone permissions are now requested on-demand when connecting to a voice call
      // to avoid prompting users who don't need voice features
      if (Platform.Version >= 23) {
        RNCallKeep.setAvailable(true);
      }

      this.setupEventListeners();
      this.isSetup = true;

      logger.info({
        message: 'CallKeep (Android) setup completed successfully',
        context: { config },
      });
    } catch (error) {
      logger.error({
        message: 'Failed to setup CallKeep (Android)',
        context: { error, config },
      });
      throw error;
    }
  }

  /**
   * Request phone permissions required for CallKeep to manage calls
   * This should be called just before connecting to a voice call
   * Returns true if permissions are granted or not required
   */
  async requestPhonePermissions(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return true;
    }

    // READ_PHONE_NUMBERS is only required on Android 11+ (API 30+)
    if (Platform.Version < 30) {
      return true;
    }

    try {
      const hasPermission = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_PHONE_NUMBERS);

      if (hasPermission) {
        logger.debug({
          message: 'READ_PHONE_NUMBERS permission already granted',
        });
        return true;
      }

      const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.READ_PHONE_NUMBERS, {
        title: 'Phone Permission Required',
        message: 'This app needs phone access to manage voice calls with your headset',
        buttonPositive: 'Grant',
        buttonNegative: 'Deny',
      });

      const granted = result === PermissionsAndroid.RESULTS.GRANTED;
      logger.info({
        message: 'READ_PHONE_NUMBERS permission request result',
        context: { granted, result },
      });

      return granted;
    } catch (error) {
      logger.error({
        message: 'Failed to request phone permissions',
        context: { error },
      });
      return false;
    }
  }

  /**
   * Start a CallKit call to keep the app alive in the background
   * This should be called when connecting to a LiveKit room
   */
  async startCall(roomName: string, handle?: string): Promise<string> {
    if (Platform.OS !== 'android') {
      return '';
    }

    if (!this.isSetup) {
      // Auto-setup if not ready (fallback)
      logger.warn({ message: 'CallKeep not setup before startCall, attempting setup' });
    }

    if (currentCallUUID) {
      logger.debug({
        message: 'Existing call UUID found, ending before starting a new one',
        context: { currentCallUUID },
      });
      await this.endCall();
    }

    try {
      // Generate a new UUID for this call
      currentCallUUID = this.generateUUID();
      const callHandle = handle || 'Voice Channel';
      const contactIdentifier = `Voice Channel: ${roomName}`;

      logger.info({
        message: 'Starting CallKeep (Android) call',
        context: {
          uuid: currentCallUUID,
          handle: callHandle,
          roomName,
        },
      });

      // Start the call - Self Managed ConnectionService
      // On Android, displayIncomingCall is often used for self-managed, but startCall works for outgoing.
      // We simulate an "outgoing" call to the room.
      RNCallKeep.startCall(currentCallUUID, callHandle, contactIdentifier, 'generic', false);

      // For Android self-managed, we often need to set activity
      RNCallKeep.setCurrentCallActive(currentCallUUID);

      this.isCallActive = true;
      return currentCallUUID;
    } catch (error) {
      logger.error({
        message: 'Failed to start CallKeep (Android) call',
        context: { error, roomName, handle },
      });
      currentCallUUID = null;
      throw error;
    }
  }

  /**
   * End the active CallKit call
   * This should be called when disconnecting from a LiveKit room
   */
  async endCall(): Promise<void> {
    if (!currentCallUUID) {
      return;
    }

    try {
      logger.info({
        message: 'Ending CallKeep (Android) call',
        context: { uuid: currentCallUUID },
      });

      RNCallKeep.endCall(currentCallUUID);
      currentCallUUID = null;
      this.isCallActive = false;
    } catch (error) {
      logger.error({
        message: 'Failed to end CallKeep call',
        context: { error, uuid: currentCallUUID },
      });
      currentCallUUID = null;
      this.isCallActive = false;
    }
  }

  /**
   * Set the mute state of the current call
   */
  async setMuted(muted: boolean): Promise<void> {
    if (!currentCallUUID) {
      return;
    }

    try {
      RNCallKeep.setMutedCall(currentCallUUID, muted);
      logger.debug({
        message: 'CallKeep (Android) mute state updated',
        context: { muted, uuid: currentCallUUID },
      });
    } catch (error) {
      logger.error({
        message: 'Failed to update CallKeep mute state',
        context: { error, muted, uuid: currentCallUUID },
      });
    }
  }

  /**
   * Set a callback to handle mute state changes from CallKit
   * This should be called by the LiveKit store to sync mute state
   */
  setMuteStateCallback(callback: ((muted: boolean) => void) | null): void {
    this.muteStateCallback = callback;
  }

  /**
   * Set a callback to handle end call events from CallKit
   */
  setEndCallCallback(callback: (() => void) | null): void {
    this.endCallCallback = callback;
  }

  /**
   * Check if there's an active CallKit call
   */
  isCallActiveNow(): boolean {
    return this.isCallActive && currentCallUUID !== null;
  }

  /**
   * Get the current call UUID
   */
  getCurrentCallUUID(): string | null {
    return currentCallUUID;
  }

  /**
   * Setup event listeners for CallKeep events
   */
  private setupEventListeners(): void {
    // Android specific events if any

    // Call ended from System UI
    RNCallKeep.addEventListener('endCall', ({ callUUID }) => {
      logger.info({
        message: 'CallKeep call ended from system UI',
        context: { callUUID },
      });

      if (callUUID === currentCallUUID) {
        currentCallUUID = null;
        this.isCallActive = false;

        // Notify callback if set
        if (this.endCallCallback) {
          try {
            this.endCallCallback();
          } catch (error) {
            logger.warn({
              message: 'Failed to execute end call callback',
              context: { error, callUUID },
            });
          }
        }
      }
    });

    // Mute/unmute events
    RNCallKeep.addEventListener('didPerformSetMutedCallAction', ({ muted, callUUID }) => {
      logger.debug({
        message: 'CallKeep mute state changed',
        context: { muted, callUUID },
      });

      // Call the registered callback if available
      if (this.muteStateCallback) {
        try {
          this.muteStateCallback(muted);
        } catch (error) {
          logger.warn({
            message: 'Failed to execute mute state callback',
            context: { error, muted, callUUID },
          });
        }
      }
    });
  }

  /**
   * Generate a UUID for CallKeep calls
   */
  private generateUUID(): string {
    // RN 0.76 typically provides global crypto.randomUUID via Hermes/JSI
    const rndUUID = (global as any)?.crypto?.randomUUID?.();
    if (typeof rndUUID === 'string') return rndUUID;
    // Fallback
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * Remove the CallKeep mute listener (No-op on Android or handled differently)
   */
  removeMuteListener(): void {
    // Android implementation if needed
  }

  /**
   * Restore the CallKeep mute listener (No-op on Android or handled differently)
   */
  restoreMuteListener(): void {
    // Android implementation if needed
  }

  /**
   * Clean up resources - call this when the service is no longer needed
   */
  async cleanup(): Promise<void> {
    try {
      if (this.isCallActive) {
        await this.endCall();
      }

      // Remove event listeners
      RNCallKeep.removeEventListener('endCall');
      RNCallKeep.removeEventListener('didPerformSetMutedCallAction');

      this.isSetup = false;

      logger.debug({
        message: 'CallKeep service cleaned up',
      });
    } catch (error) {
      logger.error({
        message: 'Error during CallKeep cleanup',
        context: { error },
      });
    }
  }
}

// Export singleton instance
export const callKeepService = CallKeepService.getInstance();
