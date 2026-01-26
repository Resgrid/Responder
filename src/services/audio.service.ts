import { Asset } from 'expo-asset';
import { Audio, type AVPlaybackSource, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';
import { Platform } from 'react-native';

import { logger } from '@/lib/logging';

class AudioService {
  private static instance: AudioService;
  private startTransmittingSound: Audio.Sound | null = null;
  private stopTransmittingSound: Audio.Sound | null = null;
  private connectedDeviceSound: Audio.Sound | null = null;
  private connectToAudioRoomSound: Audio.Sound | null = null;
  private disconnectedFromAudioRoomSound: Audio.Sound | null = null;
  private isInitialized = false;
  private isPlayingSound: Set<string> = new Set();

  private constructor() {
    this.initializeAudio();
  }

  static getInstance(): AudioService {
    if (!AudioService.instance) {
      AudioService.instance = new AudioService();
    }
    return AudioService.instance;
  }

  public async initialize(): Promise<void> {
    await this.initializeAudio();
  }

  private async initializeAudio(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Configure audio mode for production builds
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: true,
        interruptionModeIOS: InterruptionModeIOS.DoNotMix,
        interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
      });

      // Pre-load audio assets for production builds
      await this.preloadAudioAssets();

      // Load audio files
      await this.loadAudioFiles();

      this.isInitialized = true;

      logger.info({
        message: 'Audio service initialized successfully',
      });
    } catch (error) {
      logger.error({
        message: 'Failed to initialize audio service',
        context: { error },
      });
    }
  }

  public async preloadAudioAssets(): Promise<void> {
    try {
      await Promise.all([
        Asset.loadAsync(require('@assets/audio/ui/space_notification1.mp3')),
        Asset.loadAsync(require('@assets/audio/ui/space_notification2.mp3')),
        Asset.loadAsync(require('@assets/audio/ui/positive_interface_beep.mp3')),
        Asset.loadAsync(require('@assets/audio/ui/software_interface_start.mp3')),
        Asset.loadAsync(require('@assets/audio/ui/software_interface_back.mp3')),
      ]);

      logger.debug({
        message: 'Audio assets preloaded successfully',
      });
    } catch (error) {
      logger.error({
        message: 'Error preloading audio assets',
        context: { error },
      });
    }
  }

  private async loadAudioFiles(): Promise<void> {
    try {
      // Load start transmitting sound
      const startTransmittingSoundAsset = Asset.fromModule(require('@assets/audio/ui/space_notification1.mp3'));
      await startTransmittingSoundAsset.downloadAsync();

      const { sound: startSound } = await Audio.Sound.createAsync({ uri: startTransmittingSoundAsset.localUri || startTransmittingSoundAsset.uri } as AVPlaybackSource, {
        shouldPlay: false,
        isLooping: false,
        volume: 1.0,
      });
      this.startTransmittingSound = startSound;

      // Load stop transmitting sound
      const stopTransmittingSoundAsset = Asset.fromModule(require('@assets/audio/ui/space_notification2.mp3'));
      await stopTransmittingSoundAsset.downloadAsync();

      const { sound: stopSound } = await Audio.Sound.createAsync({ uri: stopTransmittingSoundAsset.localUri || stopTransmittingSoundAsset.uri } as AVPlaybackSource, {
        shouldPlay: false,
        isLooping: false,
        volume: 1.0,
      });
      this.stopTransmittingSound = stopSound;

      // Load connected device sound
      const connectedDeviceSoundAsset = Asset.fromModule(require('@assets/audio/ui/positive_interface_beep.mp3'));
      await connectedDeviceSoundAsset.downloadAsync();

      const { sound: connectedSound } = await Audio.Sound.createAsync({ uri: connectedDeviceSoundAsset.localUri || connectedDeviceSoundAsset.uri } as AVPlaybackSource, {
        shouldPlay: false,
        isLooping: false,
        volume: 1.0,
      });
      this.connectedDeviceSound = connectedSound;

      // Load connect to audio room sound
      const connectToAudioRoomSoundAsset = Asset.fromModule(require('@assets/audio/ui/software_interface_start.mp3'));
      await connectToAudioRoomSoundAsset.downloadAsync();

      const { sound: connectToRoomSound } = await Audio.Sound.createAsync({ uri: connectToAudioRoomSoundAsset.localUri || connectToAudioRoomSoundAsset.uri } as AVPlaybackSource, {
        shouldPlay: false,
        isLooping: false,
        volume: 1.0,
      });
      this.connectToAudioRoomSound = connectToRoomSound;

      // Load disconnect from audio room sound
      const disconnectedFromAudioRoomSoundAsset = Asset.fromModule(require('@assets/audio/ui/software_interface_back.mp3'));
      await disconnectedFromAudioRoomSoundAsset.downloadAsync();

      const { sound: disconnectFromRoomSound } = await Audio.Sound.createAsync({ uri: disconnectedFromAudioRoomSoundAsset.localUri || disconnectedFromAudioRoomSoundAsset.uri } as AVPlaybackSource, {
        shouldPlay: false,
        isLooping: false,
        volume: 1.0,
      });
      this.disconnectedFromAudioRoomSound = disconnectFromRoomSound;

      logger.debug({
        message: 'Audio files loaded successfully',
      });
    } catch (error) {
      logger.error({
        message: 'Failed to load audio files',
        context: { error },
      });
    }
  }

  private async playSound(sound: Audio.Sound | null, soundName: string): Promise<void> {
    if (!sound) {
      logger.warn({
        message: `Sound not loaded: ${soundName}`,
      });
      return;
    }

    // Check if this sound is already playing and mark as playing atomically
    // This must be done before any await to prevent race conditions
    if (this.isPlayingSound.has(soundName)) {
      logger.debug({
        message: `Sound already playing, skipping: ${soundName}`,
      });
      return;
    }

    // Mark as playing immediately after the check, before any async operations
    this.isPlayingSound.add(soundName);

    try {
      // Ensure audio service is initialized
      if (!this.isInitialized) {
        await this.initializeAudio();
      }

      // Verify the sound object is still valid before playing
      try {
        const status = await sound.getStatusAsync();
        if (!status.isLoaded) {
          logger.warn({
            message: `Sound not in loaded state: ${soundName}`,
            context: { status },
          });
          this.isPlayingSound.delete(soundName);
          return;
        }
      } catch (statusError) {
        logger.warn({
          message: `Failed to get sound status: ${soundName}`,
          context: { error: statusError },
        });
        this.isPlayingSound.delete(soundName);
        return;
      }

      // Reset to start and play
      await sound.setPositionAsync(0);
      await sound.playAsync();

      logger.debug({
        message: 'Sound played successfully',
        context: { soundName },
      });

      // Remove from playing set after a short delay
      // Most UI sounds are < 500ms, so this is safe
      setTimeout(() => {
        this.isPlayingSound.delete(soundName);
      }, 500);
    } catch (playError) {
      // Remove from playing set on error
      this.isPlayingSound.delete(soundName);
      // Re-throw the error so the caller can handle it
      throw playError;
    }
  }

  async playStartTransmittingSound(): Promise<void> {
    try {
      await this.playSound(this.startTransmittingSound, 'startTransmitting');
    } catch (error) {
      logger.error({
        message: 'Failed to play start transmitting sound',
        context: { error },
      });
    }
  }

  async playStopTransmittingSound(): Promise<void> {
    try {
      await this.playSound(this.stopTransmittingSound, 'stopTransmitting');
    } catch (error) {
      logger.error({
        message: 'Failed to play stop transmitting sound',
        context: { error },
      });
    }
  }

  async playConnectedDeviceSound(): Promise<void> {
    try {
      await this.playSound(this.connectedDeviceSound, 'connectedDevice');
    } catch (error) {
      logger.error({
        message: 'Failed to play connected device sound',
        context: { error },
      });
    }
  }

  async playConnectToAudioRoomSound(): Promise<void> {
    try {
      await this.playSound(this.connectToAudioRoomSound, 'connectedToAudioRoom');
    } catch (error) {
      logger.error({
        message: 'Failed to play connected to audio room sound',
        context: { error },
      });
    }
  }

  async playDisconnectedFromAudioRoomSound(): Promise<void> {
    try {
      await this.playSound(this.disconnectedFromAudioRoomSound, 'disconnectedFromAudioRoom');
    } catch (error) {
      logger.error({
        message: 'Failed to play disconnected from audio room sound',
        context: { error },
      });
    }
  }

  async cleanup(): Promise<void> {
    try {
      // Clear the playing sound set
      this.isPlayingSound.clear();

      // Unload start transmitting sound
      if (this.startTransmittingSound) {
        await this.startTransmittingSound.unloadAsync();
        this.startTransmittingSound = null;
      }

      // Unload stop transmitting sound
      if (this.stopTransmittingSound) {
        await this.stopTransmittingSound.unloadAsync();
        this.stopTransmittingSound = null;
      }

      // Unload connected device sound
      if (this.connectedDeviceSound) {
        await this.connectedDeviceSound.unloadAsync();
        this.connectedDeviceSound = null;
      }

      // Unload connect to audio room sound
      if (this.connectToAudioRoomSound) {
        await this.connectToAudioRoomSound.unloadAsync();
        this.connectToAudioRoomSound = null;
      }

      // Unload disconnect from audio room sound
      if (this.disconnectedFromAudioRoomSound) {
        await this.disconnectedFromAudioRoomSound.unloadAsync();
        this.disconnectedFromAudioRoomSound = null;
      }

      this.isInitialized = false;

      logger.info({
        message: 'Audio service cleaned up',
      });
    } catch (error) {
      logger.error({
        message: 'Error during audio service cleanup',
        context: { error },
      });
    }
  }
}

export const audioService = AudioService.getInstance();
