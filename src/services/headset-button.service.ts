/**
 * Headset Button Service
 *
 * This service handles media button events from AirPods, standard Bluetooth earbuds,
 * and wired headsets for Push-to-Talk (PTT) functionality with LiveKit.
 *
 * AirPods and standard Bluetooth earbuds use AVRCP (Audio/Video Remote Control Profile)
 * which sends media button events through the system's audio session, not through BLE
 * characteristics like specialized PTT devices (Aina, B01 Inrico, HYS).
 *
 * This service listens for media button events and translates them into PTT actions.
 */

import { AppState, DeviceEventEmitter, NativeEventEmitter, NativeModules, Platform } from 'react-native';

import { logger } from '@/lib/logging';
import { useBluetoothAudioStore } from '@/stores/app/bluetooth-audio-store';

// Import livekit store lazily to avoid circular dependency
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let liveKitStoreModule: any = null;
const getLiveKitStore = () => {
  if (!liveKitStoreModule) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    liveKitStoreModule = require('@/stores/app/livekit-store');
  }
  return liveKitStoreModule.useLiveKitStore;
};

// Import audioService dynamically to avoid expo module import errors in tests
let audioService: any;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  audioService = require('@/services/audio.service').audioService;
} catch {
  audioService = {};
}

// Types for headset button events
export type HeadsetButtonType = 'play_pause' | 'next' | 'previous' | 'stop' | 'hook' | 'unknown';

export interface HeadsetButtonEvent {
  type: HeadsetButtonType;
  timestamp: number;
  source: 'airpods' | 'bluetooth_headset' | 'wired_headset' | 'unknown';
}

export type PttMode = 'toggle' | 'push_to_talk' | 'disabled';

export interface HeadsetButtonConfig {
  pttMode: PttMode;
  playPauseAction: 'toggle_mute' | 'none';
  doubleClickAction: 'toggle_mute' | 'none';
  longPressAction: 'toggle_mute' | 'none';
  soundFeedback: boolean;
}

const DEFAULT_CONFIG: HeadsetButtonConfig = {
  pttMode: 'toggle',
  playPauseAction: 'toggle_mute',
  doubleClickAction: 'none',
  longPressAction: 'none',
  soundFeedback: true,
};

class HeadsetButtonService {
  private static instance: HeadsetButtonService;
  private isInitialized: boolean = false;
  private isMonitoring: boolean = false;
  private config: HeadsetButtonConfig = DEFAULT_CONFIG;

  // Event tracking for double-click and long-press detection
  private lastButtonPressTime: number = 0;
  private buttonPressCount: number = 0;
  private buttonPressTimer: ReturnType<typeof setTimeout> | null = null;
  private longPressTimer: ReturnType<typeof setTimeout> | null = null;
  private isButtonHeld: boolean = false;

  // Timing constants (in milliseconds)
  private readonly DOUBLE_CLICK_THRESHOLD = 500;
  private readonly LONG_PRESS_THRESHOLD = 800;

  // Event emitter subscriptions
  private subscriptions: { remove: () => void }[] = [];
  private appStateSubscription: { remove: () => void } | null = null;

  static getInstance(): HeadsetButtonService {
    if (!HeadsetButtonService.instance) {
      HeadsetButtonService.instance = new HeadsetButtonService();
    }
    return HeadsetButtonService.instance;
  }

  /**
   * Initialize the headset button service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.debug({ message: 'HeadsetButtonService already initialized' });
      return;
    }

    try {
      logger.info({ message: 'Initializing HeadsetButtonService' });

      // Setup app state listener to pause/resume monitoring
      this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange);

      // Setup platform-specific listeners
      await this.setupPlatformListeners();

      this.isInitialized = true;
      logger.info({ message: 'HeadsetButtonService initialized successfully' });
    } catch (error) {
      logger.error({
        message: 'Failed to initialize HeadsetButtonService',
        context: { error },
      });
    }
  }

  /**
   * Set up platform-specific media button listeners
   */
  private async setupPlatformListeners(): Promise<void> {
    if (Platform.OS === 'ios') {
      await this.setupIOSListeners();
    } else if (Platform.OS === 'android') {
      await this.setupAndroidListeners();
    }
  }

  /**
   * Setup iOS-specific listeners for remote control events
   *
   * On iOS, media button events from AirPods are received through:
   * 1. Remote control events (AVAudioSession)
   * 2. Now Playing Info Center
   *
   * Since React Native doesn't expose these directly, we use DeviceEventEmitter
   * to listen for events that may be bridged from native modules.
   */
  private async setupIOSListeners(): Promise<void> {
    logger.debug({ message: 'Setting up iOS headset button listeners' });

    // Listen for headset button events via DeviceEventEmitter
    // These events can be emitted by native modules that handle remote control events
    const headsetButtonSubscription = DeviceEventEmitter.addListener('HeadsetButtonEvent', (event) => {
      this.handleHeadsetButtonEvent(event);
    });
    this.subscriptions.push(headsetButtonSubscription);

    // Listen for audio route changes which may indicate headset connection
    const audioRouteSubscription = DeviceEventEmitter.addListener('AudioRouteChange', (event) => {
      this.handleAudioRouteChange(event);
    });
    this.subscriptions.push(audioRouteSubscription);

    // Listen for remote command center events
    const remoteControlSubscription = DeviceEventEmitter.addListener('RemoteControlEvent', (event) => {
      this.handleRemoteControlEvent(event);
    });
    this.subscriptions.push(remoteControlSubscription);
  }

  /**
   * Setup Android-specific listeners for media button events
   *
   * On Android, media button events are handled through:
   * 1. MediaSession API
   * 2. AudioManager's ACTION_MEDIA_BUTTON broadcast
   */
  private async setupAndroidListeners(): Promise<void> {
    logger.debug({ message: 'Setting up Android headset button listeners' });

    // Listen for headset button events via DeviceEventEmitter
    const headsetButtonSubscription = DeviceEventEmitter.addListener('HeadsetButtonEvent', (event) => {
      this.handleHeadsetButtonEvent(event);
    });
    this.subscriptions.push(headsetButtonSubscription);

    // Listen for media button events
    const mediaButtonSubscription = DeviceEventEmitter.addListener('MediaButtonEvent', (event) => {
      this.handleMediaButtonEvent(event);
    });
    this.subscriptions.push(mediaButtonSubscription);

    // Listen for headset connection changes
    const headsetConnectionSubscription = DeviceEventEmitter.addListener('HeadsetConnectionChange', (event) => {
      this.handleHeadsetConnectionChange(event);
    });
    this.subscriptions.push(headsetConnectionSubscription);
  }

  /**
   * Handle headset button events
   */
  private handleHeadsetButtonEvent(event: any): void {
    if (!this.isMonitoring) return;

    logger.debug({
      message: 'Headset button event received',
      context: { event },
    });

    const buttonEvent: HeadsetButtonEvent = {
      type: this.mapButtonType(event?.type || event?.keyCode),
      timestamp: Date.now(),
      source: this.detectSource(event),
    };

    this.processButtonEvent(buttonEvent);
  }

  /**
   * Handle remote control events (iOS)
   */
  private handleRemoteControlEvent(event: any): void {
    if (!this.isMonitoring) return;

    logger.debug({
      message: 'Remote control event received',
      context: { event },
    });

    const buttonType = this.mapRemoteControlType(event?.command || event?.type);
    if (buttonType !== 'unknown') {
      const buttonEvent: HeadsetButtonEvent = {
        type: buttonType,
        timestamp: Date.now(),
        source: 'airpods',
      };
      this.processButtonEvent(buttonEvent);
    }
  }

  /**
   * Handle media button events (Android)
   */
  private handleMediaButtonEvent(event: any): void {
    if (!this.isMonitoring) return;

    logger.debug({
      message: 'Media button event received',
      context: { event },
    });

    const buttonType = this.mapMediaButtonType(event?.keyCode);
    if (buttonType !== 'unknown') {
      const buttonEvent: HeadsetButtonEvent = {
        type: buttonType,
        timestamp: Date.now(),
        source: 'bluetooth_headset',
      };
      this.processButtonEvent(buttonEvent);
    }
  }

  /**
   * Handle audio route changes
   */
  private handleAudioRouteChange(event: any): void {
    logger.debug({
      message: 'Audio route changed',
      context: { event },
    });

    // Update bluetooth audio store with new route info if needed
    const bluetoothStore = useBluetoothAudioStore.getState();
    if (event?.newRoute?.includes('Bluetooth') || event?.newRoute?.includes('AirPods')) {
      bluetoothStore.setAudioRoutingActive(true);
    }
  }

  /**
   * Handle headset connection changes
   */
  private handleHeadsetConnectionChange(event: any): void {
    logger.debug({
      message: 'Headset connection changed',
      context: { event },
    });
  }

  /**
   * Handle app state changes
   */
  private handleAppStateChange = (nextAppState: string): void => {
    if (nextAppState === 'active' && this.isMonitoring) {
      logger.debug({ message: 'App became active, ensuring headset monitoring is active' });
    } else if (nextAppState === 'background') {
      logger.debug({ message: 'App went to background' });
    }
  };

  /**
   * Map button type from event data
   */
  private mapButtonType(type: string | number | undefined): HeadsetButtonType {
    if (typeof type === 'string') {
      switch (type.toLowerCase()) {
        case 'play':
        case 'pause':
        case 'play_pause':
        case 'playpause':
          return 'play_pause';
        case 'next':
        case 'skip_forward':
        case 'skipforward':
          return 'next';
        case 'previous':
        case 'skip_backward':
        case 'skipbackward':
          return 'previous';
        case 'stop':
          return 'stop';
        case 'hook':
        case 'headsethook':
          return 'hook';
        default:
          return 'unknown';
      }
    }

    // Android KeyEvent codes
    if (typeof type === 'number') {
      switch (type) {
        case 85: // KEYCODE_MEDIA_PLAY_PAUSE
        case 126: // KEYCODE_MEDIA_PLAY
        case 127: // KEYCODE_MEDIA_PAUSE
          return 'play_pause';
        case 87: // KEYCODE_MEDIA_NEXT
          return 'next';
        case 88: // KEYCODE_MEDIA_PREVIOUS
          return 'previous';
        case 86: // KEYCODE_MEDIA_STOP
          return 'stop';
        case 79: // KEYCODE_HEADSETHOOK
          return 'hook';
        default:
          return 'unknown';
      }
    }

    return 'unknown';
  }

  /**
   * Map iOS remote control command types
   */
  private mapRemoteControlType(command: string | undefined): HeadsetButtonType {
    if (!command) return 'unknown';

    switch (command.toLowerCase()) {
      case 'toggleplaypause':
      case 'play':
      case 'pause':
        return 'play_pause';
      case 'nexttrack':
        return 'next';
      case 'previoustrack':
        return 'previous';
      case 'stop':
        return 'stop';
      default:
        return 'unknown';
    }
  }

  /**
   * Map Android media button key codes
   */
  private mapMediaButtonType(keyCode: number | undefined): HeadsetButtonType {
    if (keyCode === undefined) return 'unknown';

    switch (keyCode) {
      case 85: // KEYCODE_MEDIA_PLAY_PAUSE
      case 126: // KEYCODE_MEDIA_PLAY
      case 127: // KEYCODE_MEDIA_PAUSE
        return 'play_pause';
      case 87: // KEYCODE_MEDIA_NEXT
        return 'next';
      case 88: // KEYCODE_MEDIA_PREVIOUS
        return 'previous';
      case 86: // KEYCODE_MEDIA_STOP
        return 'stop';
      case 79: // KEYCODE_HEADSETHOOK
        return 'hook';
      default:
        return 'unknown';
    }
  }

  /**
   * Detect the source of the button event
   */
  private detectSource(event: any): HeadsetButtonEvent['source'] {
    if (!event) return 'unknown';

    const sourceName = event.source?.toLowerCase() || event.deviceName?.toLowerCase() || '';

    if (sourceName.includes('airpod')) return 'airpods';
    if (sourceName.includes('bluetooth') || sourceName.includes('bt')) return 'bluetooth_headset';
    if (sourceName.includes('wired') || sourceName.includes('headphone')) return 'wired_headset';

    // Default based on platform
    return Platform.OS === 'ios' ? 'airpods' : 'bluetooth_headset';
  }

  /**
   * Process the button event based on configuration
   */
  private processButtonEvent(event: HeadsetButtonEvent): void {
    const now = Date.now();

    // Add event to store for tracking
    useBluetoothAudioStore.getState().addButtonEvent({
      type: 'press',
      button: this.mapToStoreButtonType(event.type),
      timestamp: now,
    });

    // Check for double-click
    if (now - this.lastButtonPressTime < this.DOUBLE_CLICK_THRESHOLD) {
      this.buttonPressCount++;
    } else {
      this.buttonPressCount = 1;
    }
    this.lastButtonPressTime = now;

    // Clear any existing timers
    if (this.buttonPressTimer) {
      clearTimeout(this.buttonPressTimer);
    }

    // Set timer to process the final action
    this.buttonPressTimer = setTimeout(() => {
      (async () => {
        try {
          await this.executeButtonAction(event, this.buttonPressCount);
        } catch (error) {
          console.error('Error executing button action:', error);
        } finally {
          this.buttonPressCount = 0;
        }
      })();
    }, this.DOUBLE_CLICK_THRESHOLD);
  }

  /**
   * Map button type to store button type
   */
  private mapToStoreButtonType(type: HeadsetButtonType): 'ptt_start' | 'ptt_stop' | 'volume_up' | 'volume_down' | 'mute' | 'unknown' {
    switch (type) {
      case 'play_pause':
      case 'hook':
        return 'mute'; // Play/pause maps to mute toggle
      default:
        return 'unknown';
    }
  }

  /**
   * Execute the appropriate action based on button event and click count
   */
  private async executeButtonAction(event: HeadsetButtonEvent, clickCount: number): Promise<void> {
    const liveKitStore = getLiveKitStore().getState();

    // Only process if we have an active LiveKit connection
    if (!liveKitStore.currentRoom || !liveKitStore.isConnected) {
      logger.debug({
        message: 'No active LiveKit room, ignoring headset button',
        context: { event, clickCount },
      });
      return;
    }

    // Handle based on button type and click count
    if ((event.type === 'play_pause' || event.type === 'hook') && clickCount === 1) {
      // Single click - toggle mute based on config
      if (this.config.playPauseAction === 'toggle_mute') {
        await this.toggleMicrophone();
      }
    } else if ((event.type === 'play_pause' || event.type === 'hook') && clickCount === 2) {
      // Double click
      if (this.config.doubleClickAction === 'toggle_mute') {
        await this.toggleMicrophone();
      }
    }

    logger.info({
      message: 'Headset button action executed',
      context: { event, clickCount, action: 'toggle_mute' },
    });
  }

  /**
   * Toggle the microphone on/off
   */
  async toggleMicrophone(): Promise<void> {
    const liveKitStore = getLiveKitStore().getState();
    // Import toggleMicrophone dynamically to avoid circular dependency
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { toggleMicrophone: sharedToggle } = require('@/utils/microphone-toggle');

    await sharedToggle(liveKitStore.currentRoom, {
      soundFeedback: this.config.soundFeedback,
      logContext: 'via headset button',
    });
  }

  /**
   * Enable microphone (unmute)
   */
  async enableMicrophone(): Promise<void> {
    const liveKitStore = getLiveKitStore().getState();

    if (!liveKitStore.currentRoom) {
      logger.warn({ message: 'Cannot enable microphone - no active room' });
      return;
    }

    try {
      if (!liveKitStore.currentRoom.localParticipant.isMicrophoneEnabled) {
        await liveKitStore.currentRoom.localParticipant.setMicrophoneEnabled(true);

        logger.info({ message: 'Microphone enabled via headset button' });

        useBluetoothAudioStore.getState().setLastButtonAction({
          action: 'unmute',
          timestamp: Date.now(),
        });

        if (this.config.soundFeedback && audioService?.playStartTransmittingSound) {
          await audioService.playStartTransmittingSound();
        }
      }
    } catch (error) {
      logger.error({
        message: 'Failed to enable microphone via headset button',
        context: { error },
      });
    }
  }

  /**
   * Disable microphone (mute)
   */
  async disableMicrophone(): Promise<void> {
    const liveKitStore = getLiveKitStore().getState();

    if (!liveKitStore.currentRoom) {
      logger.warn({ message: 'Cannot disable microphone - no active room' });
      return;
    }

    try {
      if (liveKitStore.currentRoom.localParticipant.isMicrophoneEnabled) {
        await liveKitStore.currentRoom.localParticipant.setMicrophoneEnabled(false);

        logger.info({ message: 'Microphone disabled via headset button' });

        useBluetoothAudioStore.getState().setLastButtonAction({
          action: 'mute',
          timestamp: Date.now(),
        });

        if (this.config.soundFeedback && audioService?.playStopTransmittingSound) {
          await audioService.playStopTransmittingSound();
        }
      }
    } catch (error) {
      logger.error({
        message: 'Failed to disable microphone via headset button',
        context: { error },
      });
    }
  }

  /**
   * Start monitoring headset button events
   */
  startMonitoring(): void {
    if (this.isMonitoring) {
      logger.debug({ message: 'Headset button monitoring already active' });
      return;
    }

    this.isMonitoring = true;

    logger.info({ message: 'Started headset button monitoring for PTT' });

    // Emit event for native modules to start capturing media buttons
    try {
      DeviceEventEmitter.emit('StartHeadsetButtonMonitoring', { pttMode: this.config.pttMode });
    } catch {
      // Emit may fail in test environment
    }
  }

  /**
   * Stop monitoring headset button events
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) {
      logger.debug({ message: 'Headset button monitoring not active' });
      return;
    }

    this.isMonitoring = false;

    // Clear any pending timers
    if (this.buttonPressTimer) {
      clearTimeout(this.buttonPressTimer);
      this.buttonPressTimer = null;
    }
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }

    logger.info({ message: 'Stopped headset button monitoring' });

    // Emit event for native modules to stop capturing media buttons
    try {
      DeviceEventEmitter.emit('StopHeadsetButtonMonitoring', {});
    } catch {
      // Emit may fail in test environment
    }
  }

  /**
   * Check if monitoring is active
   */
  isMonitoringActive(): boolean {
    return this.isMonitoring;
  }

  /**
   * Update the service configuration
   */
  setConfig(config: Partial<HeadsetButtonConfig>): void {
    this.config = { ...this.config, ...config };

    logger.info({
      message: 'HeadsetButtonService config updated',
      context: { config: this.config },
    });
  }

  /**
   * Get current configuration
   */
  getConfig(): HeadsetButtonConfig {
    return { ...this.config };
  }

  /**
   * Simulate a button press (for testing)
   */
  simulateButtonPress(type: HeadsetButtonType = 'play_pause'): void {
    if (!this.isMonitoring) {
      logger.warn({ message: 'Cannot simulate button press - monitoring not active' });
      return;
    }

    const event: HeadsetButtonEvent = {
      type,
      timestamp: Date.now(),
      source: 'unknown',
    };

    this.processButtonEvent(event);
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.stopMonitoring();

    // Remove all subscriptions
    this.subscriptions.forEach((subscription) => {
      subscription.remove();
    });
    this.subscriptions = [];

    // Remove app state subscription
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }

    this.isInitialized = false;

    logger.info({ message: 'HeadsetButtonService destroyed' });
  }
}

export const headsetButtonService = HeadsetButtonService.getInstance();
