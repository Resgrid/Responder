import { type AudioPlayer, type AudioStatus, createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { create } from 'zustand';

import { getDepartmentAudioStreams } from '@/api/voice';
import { logger } from '@/lib/logging';
import { type DepartmentAudioResultStreamData } from '@/models/v4/voice/departmentAudioResultStreamData';

interface AudioStreamState {
  // Available streams
  availableStreams: DepartmentAudioResultStreamData[];
  isLoadingStreams: boolean;

  // Current stream
  currentStream: DepartmentAudioResultStreamData | null;
  soundObject: AudioPlayer | null;
  isPlaying: boolean;
  isLoading: boolean;
  isBuffering: boolean;

  // UI state
  isBottomSheetVisible: boolean;

  // Actions
  setAvailableStreams: (streams: DepartmentAudioResultStreamData[]) => void;
  setIsLoadingStreams: (loading: boolean) => void;
  setCurrentStream: (stream: DepartmentAudioResultStreamData | null) => void;
  setIsPlaying: (playing: boolean) => void;
  setIsLoading: (loading: boolean) => void;
  setIsBuffering: (buffering: boolean) => void;
  setIsBottomSheetVisible: (visible: boolean) => void;

  // Stream operations
  fetchAvailableStreams: () => Promise<void>;
  playStream: (stream: DepartmentAudioResultStreamData) => Promise<void>;
  stopStream: (clearState?: boolean) => Promise<void>;
  cleanup: () => Promise<void>;
}

export const useAudioStreamStore = create<AudioStreamState>((set, get) => ({
  availableStreams: [],
  isLoadingStreams: false,
  currentStream: null,
  soundObject: null,
  isPlaying: false,
  isLoading: false,
  isBuffering: false,
  isBottomSheetVisible: false,

  setAvailableStreams: (streams) => set({ availableStreams: streams }),
  setIsLoadingStreams: (loading) => set({ isLoadingStreams: loading }),
  setCurrentStream: (stream) => set({ currentStream: stream }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setIsBuffering: (buffering) => set({ isBuffering: buffering }),
  setIsBottomSheetVisible: (visible) => set({ isBottomSheetVisible: visible }),

  fetchAvailableStreams: async () => {
    try {
      set({ isLoadingStreams: true });
      const response = await getDepartmentAudioStreams();
      set({ availableStreams: response.Data || [] });

      logger.debug({
        message: 'Audio streams fetched successfully',
        context: { count: response.Data?.length || 0 },
      });
    } catch (error) {
      logger.error({
        message: 'Failed to fetch audio streams',
        context: { error },
      });
      set({ availableStreams: [] });
    } finally {
      set({ isLoadingStreams: false });
    }
  },

  playStream: async (stream: DepartmentAudioResultStreamData) => {
    try {
      const { soundObject: currentSound, stopStream } = get();

      // Optimistically set the current stream and loading state
      set({
        currentStream: stream,
        isLoading: true,
        isBuffering: true,
      });

      // Stop current stream if playing, but don't clear the state since we just set it
      if (currentSound) {
        await stopStream(false);
      }

      logger.debug({
        message: 'Starting audio stream',
        context: { streamName: stream.Name, streamUrl: stream.Url },
      });

      // Configure audio mode for streaming
      await setAudioModeAsync({
        allowsRecording: false,
        shouldPlayInBackground: true,
        playsInSilentMode: true,
        interruptionMode: 'duckOthers',
        shouldRouteThroughEarpiece: false,
      });

      // Create a player and subscribe to status updates before starting playback.
      const sound = createAudioPlayer(stream.Url, {
        updateInterval: 1000,
        keepAudioSessionActive: true,
        preferredForwardBufferDuration: 5,
      });
      sound.loop = false;
      sound.volume = 1.0;
      sound.muted = false;

      set({ soundObject: sound });

      sound.addListener('playbackStatusUpdate', (status: AudioStatus) => {
        // Ignore late events from a player that has already been replaced.
        if (get().soundObject !== sound) {
          return;
        }

        if (status.error) {
          logger.error({
            message: 'Audio playback error',
            context: { error: status.error, streamName: stream.Name },
          });
          sound.remove();
          set({
            soundObject: null,
            currentStream: null,
            isPlaying: false,
            isLoading: false,
            isBuffering: false,
          });
          return;
        }

        const { isPlaying, isBuffering } = get();

        if (status.playing !== isPlaying) {
          set({ isPlaying: status.playing });
        }

        if (status.isBuffering !== isBuffering) {
          set({ isBuffering: status.isBuffering });
        }

        if (status.didJustFinish) {
          logger.info({
            message: 'Audio stream finished',
            context: { streamName: stream.Name },
          });

          // Live streams can occasionally end during a network transition. Retry
          // only if this is still the active player and stream.
          setTimeout(async () => {
            const { currentStream, soundObject } = get();
            if (currentStream?.Id !== stream.Id || soundObject !== sound) {
              return;
            }

            try {
              await sound.seekTo(0);
              sound.play();
            } catch (replayError) {
              logger.error({
                message: 'Failed to restart audio stream',
                context: { error: replayError, streamName: stream.Name },
              });
            }
          }, 1000);
        }
      });

      // Start playing
      sound.play();

      logger.info({
        message: 'Audio stream started successfully',
        context: { streamName: stream.Name },
      });

      set({
        soundObject: sound,
        currentStream: stream,
        isPlaying: true,
        isLoading: false,
        isBuffering: false,
      });
    } catch (error) {
      logger.error({
        message: 'Failed to play audio stream',
        context: { error, streamName: stream.Name },
      });

      const { soundObject } = get();
      if (soundObject) {
        try {
          soundObject.remove();
        } catch {
          // The player may already have been released by an error event.
        }
      }

      set({
        soundObject: null,
        currentStream: null,
        isPlaying: false,
        isLoading: false,
        isBuffering: false,
      });
    }
  },

  stopStream: async (clearState = true) => {
    try {
      const { soundObject, currentStream } = get();

      if (soundObject) {
        soundObject.pause();
        soundObject.remove();

        logger.info({
          message: 'Audio stream stopped',
          context: { streamName: currentStream?.Name },
        });
      }

      if (clearState) {
        set({
          soundObject: null,
          currentStream: null,
          isPlaying: false,
          isLoading: false,
          isBuffering: false,
        });
      } else {
        // If not clearing state, just clear the sound object
        set({
          soundObject: null,
          isPlaying: false,
        });
      }
    } catch (error) {
      logger.error({
        message: 'Failed to stop audio stream',
        context: { error },
      });
    }
  },

  cleanup: async () => {
    try {
      const { stopStream } = get();
      await stopStream();

      logger.debug({
        message: 'Audio stream store cleaned up',
      });
    } catch (error) {
      logger.error({
        message: 'Failed to cleanup audio stream store',
        context: { error },
      });
    }
  },
}));
