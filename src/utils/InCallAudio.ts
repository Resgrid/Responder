import { Audio, InterruptionModeIOS } from 'expo-av';
import { NativeModules, Platform } from 'react-native';

import { logger } from '../lib/logging';

const { InCallAudioModule } = NativeModules;

// Map logical names to resource names (Android) and require paths (iOS)
const SOUNDS = {
  connected: {
    android: 'space_notification1',
    ios: require('../../assets/audio/ui/space_notification1.mp3'),
  },
  disconnected: {
    android: 'space_notification2',
    ios: require('../../assets/audio/ui/space_notification2.mp3'),
  },
  transmit_start: {
    android: 'positive_interface_beep',
    ios: require('../../assets/audio/ui/positive_interface_beep.mp3'),
  },
  transmit_stop: {
    android: 'software_interface_back',
    ios: require('../../assets/audio/ui/software_interface_back.mp3'),
  },
} as const;

type SoundName = keyof typeof SOUNDS;

class InCallAudioService {
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;

  constructor() {
    this.initialize().catch((err) => {
      logger.error({ message: 'Initial InCallAudio initialization failed', context: { error: err } });
    });
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = (async () => {
      try {
        if (Platform.OS === 'android') {
          if (InCallAudioModule) {
            await InCallAudioModule.initializeAudio?.();
            // Preload sounds
            const preloadPromises = Object.entries(SOUNDS).map(([name, config]) => InCallAudioModule.loadSound(name, (config as any).android));
            await Promise.all(preloadPromises);

            this.isInitialized = true;
            logger.info({ message: 'InCallAudio initialized (Android)' });
          } else {
            logger.warn({ message: 'InCallAudioModule not found on Android' });
          }
        } else {
          // iOS / Web: expo-av handles loading on play or we can preload if needed,
          // but simple play usually works fine.
          await Audio.setAudioModeAsync({
            playsInSilentModeIOS: true,
            interruptionModeIOS: InterruptionModeIOS.MixWithOthers,
            staysActiveInBackground: true,
            shouldDuckAndroid: false,
          });

          this.isInitialized = true;
          logger.info({ message: 'InCallAudio initialized (iOS)' });
        }
      } catch (error) {
        logger.error({
          message: `Failed to initialize InCallAudio (${Platform.OS})`,
          context: { error },
        });
        this.initPromise = null; // Allow retry on next call
        throw error;
      }
    })();

    return this.initPromise;
  }

  public async playSound(name: SoundName) {
    try {
      await this.initialize();
    } catch (err) {
      logger.warn({ message: 'Attempting to play sound without successful initialization', context: { name, err } });
    }

    try {
      if (Platform.OS === 'android') {
        if (InCallAudioModule) {
          InCallAudioModule.playSound(name);
        }
      } else {
        // iOS
        const source = SOUNDS[name].ios;
        const { sound } = await Audio.Sound.createAsync(source, { shouldPlay: true });
        sound.setOnPlaybackStatusUpdate(async (status) => {
          if (status.isLoaded && status.didJustFinish) {
            await sound.unloadAsync();
          }
        });
      }
    } catch (error) {
      logger.warn({ message: 'Failed to play in-call sound', context: { name, error } });
    }
  }
}

export const inCallAudio = new InCallAudioService();
