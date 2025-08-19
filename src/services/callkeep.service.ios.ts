import { RTCAudioSession } from '@livekit/react-native-webrtc';
import { Platform } from 'react-native';
import RNCallKeep, { AudioSessionCategoryOption, AudioSessionMode, CONSTANTS as CK_CONSTANTS } from 'react-native-callkeep';

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
    if (Platform.OS !== 'ios') {
      logger.debug({
        message: 'CallKeep setup skipped - not iOS platform',
        context: { platform: Platform.OS },
      });
      return;
    }

    if (this.isSetup) {
      logger.debug({
        message: 'CallKeep already setup',
      });
      return;
    }

    try {
      const options = {
        ios: {
          appName: config.appName,
          maximumCallGroups: config.maximumCallGroups.toString(),
          maximumCallsPerCallGroup: config.maximumCallsPerCallGroup.toString(),
          includesCallsInRecents: config.includesCallsInRecents,
          supportsVideo: config.supportsVideo,
          ringtoneSound: config.ringtoneSound,
          audioSession: {
            categoryOptions: AudioSessionCategoryOption.allowAirPlay + AudioSessionCategoryOption.allowBluetooth + AudioSessionCategoryOption.allowBluetoothA2DP + AudioSessionCategoryOption.defaultToSpeaker,
            mode: AudioSessionMode.voiceChat,
          },
        },
        android: {
          alertTitle: 'Permissions required',
          alertDescription: 'This application needs to access your phone accounts',
          cancelButton: 'Cancel',
          okButton: 'OK',
          additionalPermissions: [],
        },
      };

      await RNCallKeep.setup(options);
      this.setupEventListeners();
      this.isSetup = true;

      logger.info({
        message: 'CallKeep setup completed successfully',
        context: { config },
      });
    } catch (error) {
      logger.error({
        message: 'Failed to setup CallKeep',
        context: { error, config },
      });
      throw error;
    }
  }

  /**
   * Start a CallKit call to keep the app alive in the background
   * This should be called when connecting to a LiveKit room
   */
  async startCall(roomName: string, handle?: string): Promise<string> {
    if (Platform.OS !== 'ios') {
      logger.debug({
        message: 'CallKeep startCall skipped - not iOS platform',
        context: { platform: Platform.OS },
      });
      return '';
    }

    if (!this.isSetup) {
      throw new Error('CallKeep not setup. Call setup() first.');
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
        message: 'Starting CallKeep call',
        context: {
          uuid: currentCallUUID,
          handle: callHandle,
          roomName,
        },
      });

      // Start the call
      RNCallKeep.startCall(currentCallUUID, callHandle, contactIdentifier, 'generic', false);

      // Report connecting state
      RNCallKeep.reportConnectingOutgoingCallWithUUID(currentCallUUID);

      // Small delay to ensure proper state transition
      setTimeout(() => {
        if (currentCallUUID) {
          RNCallKeep.reportConnectedOutgoingCallWithUUID(currentCallUUID);
          this.isCallActive = true;
          logger.debug({
            message: 'CallKeep call reported as connected',
            context: { uuid: currentCallUUID },
          });
        }
      }, 100);

      return currentCallUUID;
    } catch (error) {
      logger.error({
        message: 'Failed to start CallKeep call',
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
    if (Platform.OS !== 'ios') {
      logger.debug({
        message: 'CallKeep endCall skipped - not iOS platform',
        context: { platform: Platform.OS },
      });
      return;
    }

    if (!currentCallUUID) {
      logger.debug({
        message: 'No active call to end',
      });
      return;
    }

    try {
      logger.info({
        message: 'Ending CallKeep call',
        context: { uuid: currentCallUUID },
      });

      RNCallKeep.endCall(currentCallUUID);
      currentCallUUID = null;
      this.isCallActive = false;

      logger.debug({
        message: 'CallKeep call ended successfully',
      });
    } catch (error) {
      logger.error({
        message: 'Failed to end CallKeep call',
        context: { error, uuid: currentCallUUID },
      });
      // Reset state even if ending failed
      currentCallUUID = null;
      this.isCallActive = false;
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
    // Audio session activation - crucial for background audio
    RNCallKeep.addEventListener('didActivateAudioSession', () => {
      logger.debug({
        message: 'CallKeep audio session activated',
      });
      RTCAudioSession.audioSessionDidActivate();
    });

    // Audio session deactivation
    RNCallKeep.addEventListener('didDeactivateAudioSession', () => {
      logger.debug({
        message: 'CallKeep audio session deactivated',
      });
      RTCAudioSession.audioSessionDidDeactivate();
    });

    // Call ended from CallKit UI
    RNCallKeep.addEventListener('endCall', ({ callUUID }) => {
      logger.info({
        message: 'CallKeep call ended from system UI',
        context: { callUUID },
      });

      if (callUUID === currentCallUUID) {
        currentCallUUID = null;
        this.isCallActive = false;
      }
    });

    // Call answered (not typically used for outgoing calls, but good to handle)
    RNCallKeep.addEventListener('answerCall', ({ callUUID }) => {
      logger.debug({
        message: 'CallKeep call answered',
        context: { callUUID },
      });
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
   * Clean up resources - call this when the service is no longer needed
   */
  async cleanup(): Promise<void> {
    if (Platform.OS !== 'ios') {
      return;
    }

    try {
      if (this.isCallActive) {
        await this.endCall();
      }

      // Remove event listeners
      RNCallKeep.removeEventListener('didActivateAudioSession');
      RNCallKeep.removeEventListener('didDeactivateAudioSession');
      RNCallKeep.removeEventListener('endCall');
      RNCallKeep.removeEventListener('answerCall');
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
