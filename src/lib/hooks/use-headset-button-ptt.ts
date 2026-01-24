/**
 * useHeadsetButtonPTT Hook
 *
 * A custom hook that provides headset button PTT (Push-to-Talk) functionality
 * for AirPods and other Bluetooth earbuds.
 *
 * This hook:
 * - Manages headset button monitoring state
 * - Provides controls for starting/stopping monitoring
 * - Allows configuration of PTT behavior
 * - Integrates with LiveKit for mic mute/unmute
 */

import { useCallback, useEffect, useRef } from 'react';

import { type HeadsetButtonConfig, headsetButtonService, type PttMode } from '@/services/headset-button.service';
import { useBluetoothAudioStore } from '@/stores/app/bluetooth-audio-store';
import { useLiveKitStore } from '@/stores/app/livekit-store';

interface UseHeadsetButtonPTTOptions {
  /**
   * Whether to automatically start monitoring when LiveKit connects
   * @default true
   */
  autoStartOnConnect?: boolean;

  /**
   * Whether to automatically stop monitoring when LiveKit disconnects
   * @default true
   */
  autoStopOnDisconnect?: boolean;

  /**
   * Initial PTT mode
   * @default 'toggle'
   */
  pttMode?: PttMode;

  /**
   * Whether to play sound feedback when muting/unmuting
   * @default true
   */
  soundFeedback?: boolean;
}

interface UseHeadsetButtonPTTReturn {
  /**
   * Whether headset button monitoring is currently active
   */
  isMonitoring: boolean;

  /**
   * Whether a LiveKit room is currently connected
   */
  isConnected: boolean;

  /**
   * Whether the microphone is currently muted
   */
  isMuted: boolean;

  /**
   * Current headset button configuration
   */
  config: HeadsetButtonConfig;

  /**
   * The last button action that occurred
   */
  lastAction: { action: string; timestamp: number } | null;

  /**
   * Start headset button monitoring
   */
  startMonitoring: () => void;

  /**
   * Stop headset button monitoring
   */
  stopMonitoring: () => void;

  /**
   * Toggle monitoring on/off
   */
  toggleMonitoring: () => void;

  /**
   * Toggle microphone mute state
   */
  toggleMicrophone: () => Promise<void>;

  /**
   * Set microphone enabled state
   */
  setMicrophoneEnabled: (enabled: boolean) => Promise<void>;

  /**
   * Update headset button configuration
   */
  updateConfig: (config: Partial<HeadsetButtonConfig>) => void;

  /**
   * Simulate a button press (for testing)
   */
  simulateButtonPress: () => void;
}

export function useHeadsetButtonPTT(options: UseHeadsetButtonPTTOptions = {}): UseHeadsetButtonPTTReturn {
  const { autoStartOnConnect = true, autoStopOnDisconnect = true, pttMode = 'toggle', soundFeedback = true } = options;

  // Store references
  const { isConnected, currentRoom, toggleMicrophone: storeToggleMicrophone, setMicrophoneEnabled: storeSetMicrophoneEnabled, startHeadsetButtonMonitoring, stopHeadsetButtonMonitoring } = useLiveKitStore();

  const { isHeadsetButtonMonitoring, headsetButtonConfig, lastButtonAction, setHeadsetButtonConfig } = useBluetoothAudioStore();

  // Track if we've done initial setup
  const initialSetupDone = useRef(false);

  // Get current mute state from LiveKit room
  const isMuted = currentRoom ? !currentRoom.localParticipant.isMicrophoneEnabled : true;

  // Initialize service on mount
  useEffect(() => {
    if (!initialSetupDone.current) {
      headsetButtonService.initialize();
      headsetButtonService.setConfig({
        pttMode,
        soundFeedback,
      });
      initialSetupDone.current = true;
    }
  }, [pttMode, soundFeedback]);

  // Auto-start/stop based on LiveKit connection
  useEffect(() => {
    if (autoStartOnConnect && isConnected && !isHeadsetButtonMonitoring) {
      startHeadsetButtonMonitoring();
    } else if (autoStopOnDisconnect && !isConnected && isHeadsetButtonMonitoring) {
      stopHeadsetButtonMonitoring();
    }
  }, [isConnected, isHeadsetButtonMonitoring, autoStartOnConnect, autoStopOnDisconnect, startHeadsetButtonMonitoring, stopHeadsetButtonMonitoring]);

  // Start monitoring
  const startMonitoring = useCallback(() => {
    startHeadsetButtonMonitoring();
  }, [startHeadsetButtonMonitoring]);

  // Stop monitoring
  const stopMonitoring = useCallback(() => {
    stopHeadsetButtonMonitoring();
  }, [stopHeadsetButtonMonitoring]);

  // Toggle monitoring
  const toggleMonitoring = useCallback(() => {
    if (isHeadsetButtonMonitoring) {
      stopHeadsetButtonMonitoring();
    } else {
      startHeadsetButtonMonitoring();
    }
  }, [isHeadsetButtonMonitoring, startHeadsetButtonMonitoring, stopHeadsetButtonMonitoring]);

  // Toggle microphone
  const toggleMicrophone = useCallback(async () => {
    await storeToggleMicrophone();
  }, [storeToggleMicrophone]);

  // Set microphone enabled
  const setMicrophoneEnabled = useCallback(
    async (enabled: boolean) => {
      await storeSetMicrophoneEnabled(enabled);
    },
    [storeSetMicrophoneEnabled]
  );

  // Update configuration
  const updateConfig = useCallback(
    (config: Partial<HeadsetButtonConfig>) => {
      setHeadsetButtonConfig(config);
      headsetButtonService.setConfig(config);
    },
    [setHeadsetButtonConfig]
  );

  // Simulate button press (for testing)
  const simulateButtonPress = useCallback(() => {
    headsetButtonService.simulateButtonPress('play_pause');
  }, []);

  return {
    isMonitoring: isHeadsetButtonMonitoring,
    isConnected,
    isMuted,
    config: headsetButtonConfig,
    lastAction: lastButtonAction,
    startMonitoring,
    stopMonitoring,
    toggleMonitoring,
    toggleMicrophone,
    setMicrophoneEnabled,
    updateConfig,
    simulateButtonPress,
  };
}
