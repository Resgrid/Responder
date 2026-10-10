/**
 * PTT (Push-to-Talk) types and settings for media button functionality.
 * Used by bluetooth-audio-store and headset-button.service.
 */

/**
 * PTT mode configuration for media buttons (AirPods/earbuds)
 * - 'toggle': Single press toggles mute state on/off
 * - 'push_to_talk': Press and hold to unmute, release to mute
 */
export type PTTMode = 'toggle' | 'push_to_talk';

/**
 * Settings for media button PTT functionality
 */
export interface MediaButtonPTTSettings {
  /** Whether media button PTT functionality is enabled */
  enabled: boolean;
  /** The PTT mode to use */
  pttMode: PTTMode;
  /**
   * Whether to use play/pause button for PTT
   * - For toggle mode: single press toggles mute state
   * - For push_to_talk mode: press to unmute, release to mute
   */
  usePlayPauseForPTT: boolean;
  /** Double tap action behavior */
  doubleTapAction: 'none' | 'toggle_mute';
  /** Timeout in milliseconds to detect double tap */
  doubleTapTimeoutMs: number;
}

/**
 * Default media button PTT settings.
 * This object is frozen to prevent accidental mutations.
 */
export const DEFAULT_MEDIA_BUTTON_PTT_SETTINGS: Readonly<MediaButtonPTTSettings> = Object.freeze({
  enabled: true,
  pttMode: 'toggle',
  usePlayPauseForPTT: true,
  doubleTapAction: 'toggle_mute',
  doubleTapTimeoutMs: 400,
});

/**
 * Creates a mutable copy of the default PTT settings.
 * Use this when initializing state that needs to be modified.
 */
export const createDefaultPTTSettings = (): MediaButtonPTTSettings => ({
  ...DEFAULT_MEDIA_BUTTON_PTT_SETTINGS,
});
