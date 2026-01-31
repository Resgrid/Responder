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

  constructor() {
    this.initialize();
  }

  public initialize() {
    if (Platform.OS === 'android') {
      try {
        if (InCallAudioModule) {
          InCallAudioModule.initializeAudio?.();
          // Preload sounds
          Object.entries(SOUNDS).forEach(([name, config]) => {
            InCallAudioModule.loadSound(name, config.android);
          });
          this.isInitialized = true;
          logger.info({ message: 'InCallAudio initialized (Android)' });
        } else {
          logger.warn({ message: 'InCallAudioModule not found on Android' });
        }
      } catch (error) {
        logger.error({ message: 'Failed to initialize InCallAudio (Android)', context: { error } });
      }
    } else {
      // iOS / Web: expo-av handles loading on play or we can preload if needed,
      // but simple play usually works fine.
      Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        interruptionModeIOS: InterruptionModeIOS.MixWithOthers,
        staysActiveInBackground: true,
        shouldDuckAndroid: false,
      }).catch((err) => logger.warn({ message: 'Failed to set audio mode (iOS)', context: { error: err } }));

      this.isInitialized = true;
    }
  }

  public async playSound(name: SoundName) {
    if (!this.isInitialized) {
      this.initialize();
    }

    try {
      if (Platform.OS === 'android') {
        if (InCallAudioModule) {
          InCallAudioModule.playSound(name);
        }
      } else {
        // iOS
        const source = SOUNDS[name].ios;
        const { sound } = await Audio.Sound.createAsync(source);
        await sound.playAsync();
        // Unload after playback to free resources
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
