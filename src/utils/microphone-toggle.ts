/**
 * Shared microphone toggle utility
 *
 * This module provides a centralized implementation for toggling the microphone
 * state in LiveKit rooms. It's used by both the LiveKit store and the headset
 * button service to avoid code duplication.
 */

import type { Room } from 'livekit-client';

import { logger } from '@/lib/logging';
import { audioService } from '@/services/audio.service';
import { useBluetoothAudioStore } from '@/stores/app/bluetooth-audio-store';

export interface ToggleMicrophoneOptions {
  /**
   * Whether to play sound feedback when toggling
   * @default true
   */
  soundFeedback?: boolean;
  /**
   * Additional context for logging
   */
  logContext?: string;
}

/**
 * Toggles the microphone state for the given LiveKit room
 *
 * @param room - The LiveKit room instance
 * @param options - Optional configuration for the toggle behavior
 * @returns Promise that resolves when the microphone has been toggled
 * @throws Error if the microphone toggle fails
 */
export async function toggleMicrophone(room: Room | null, options: ToggleMicrophoneOptions = {}): Promise<void> {
  const { soundFeedback = true, logContext = '' } = options;

  if (!room) {
    logger.warn({ message: 'Cannot toggle microphone - no active room' });
    return;
  }

  try {
    const currentMuteState = !room.localParticipant.isMicrophoneEnabled;
    await room.localParticipant.setMicrophoneEnabled(currentMuteState);

    const logMessage = logContext ? `Microphone toggled ${logContext}` : 'Microphone toggled';

    logger.info({
      message: logMessage,
      context: { enabled: currentMuteState },
    });

    // Update bluetooth audio store with the action
    useBluetoothAudioStore.getState().setLastButtonAction({
      action: currentMuteState ? 'unmute' : 'mute',
      timestamp: Date.now(),
    });

    // Play sound feedback if enabled
    if (soundFeedback) {
      if (currentMuteState) {
        await audioService.playStartTransmittingSound();
      } else {
        await audioService.playStopTransmittingSound();
      }
    }
  } catch (error) {
    const errorMessage = logContext ? `Failed to toggle microphone ${logContext}` : 'Failed to toggle microphone';

    logger.error({
      message: errorMessage,
      context: { error },
    });
    throw error;
  }
}
