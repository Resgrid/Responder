import { type AudioPlayer, type AudioStatus, createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import base64 from 'react-native-base64';
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

export interface ResolvedStreamSource {
  uri: string;
  headers?: Record<string, string>;
}

// `scheme://user:pass@host/rest`. Icecast relays (Broadcastify and most department scanner
// feeds) put premium feeds behind HTTP Basic auth, and departments store those credentials
// inline in the stream URL.
const CREDENTIALED_URL = /^(https?:\/\/)([^/?#@]*)@([\s\S]*)$/i;

const decodeUrlComponent = (value: string): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    // Credentials that are not percent-encoded decode to themselves.
    return value;
  }
};

/**
 * Splits inline `user:pass@` credentials out of a stream URL and into an explicit
 * `Authorization` header.
 *
 * iOS plays credentialed URLs as-is because CFNetwork applies the inline credentials for us.
 * Android does not: expo-audio drives ExoPlayer through `OkHttpDataSource`, and OkHttp parses
 * the userinfo but never sends an `Authorization` header for it, so the relay answers `401`
 * and the failure reaches JS as a bare "Source error". Handing the player a clean URL plus the
 * header behaves identically on both platforms.
 */
export const resolveStreamSource = (url: string): ResolvedStreamSource => {
  const match = CREDENTIALED_URL.exec(url);
  if (!match) {
    return { uri: url };
  }

  const [, scheme, userInfo, rest] = match;
  if (!userInfo) {
    return { uri: `${scheme}${rest}` };
  }

  const separatorIndex = userInfo.indexOf(':');
  const username = decodeUrlComponent(separatorIndex < 0 ? userInfo : userInfo.slice(0, separatorIndex));
  const password = separatorIndex < 0 ? '' : decodeUrlComponent(userInfo.slice(separatorIndex + 1));

  return {
    uri: `${scheme}${rest}`,
    headers: {
      Authorization: `Basic ${base64.encode(`${username}:${password}`)}`,
    },
  };
};

/** Stream URLs can carry credentials, so never log or report one verbatim. */
export const redactStreamUrl = (url: string): string => url.replace(CREDENTIALED_URL, (_match, scheme: string, _userInfo: string, rest: string) => `${scheme}***@${rest}`);

/**
 * Reads just the response status line for a stream that failed to play. ExoPlayer collapses
 * every IO failure into "Source error", which is not actionable on its own; the status code
 * separates auth failures from dead feeds and unsupported content.
 */
const probeStreamStatus = (source: ResolvedStreamSource): Promise<number | null> =>
  new Promise((resolve) => {
    if (typeof XMLHttpRequest === 'undefined') {
      resolve(null);
      return;
    }

    const request = new XMLHttpRequest();
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const finish = (status: number | null) => {
      if (settled) {
        return;
      }
      settled = true;
      if (timer) {
        clearTimeout(timer);
      }
      try {
        // Live streams never finish on their own, so drop the connection as soon as the
        // status line is in.
        request.abort();
      } catch {
        // The request may already have been torn down.
      }
      resolve(status);
    };

    timer = setTimeout(() => finish(null), 5000);
    request.onreadystatechange = () => {
      if (request.readyState >= 2) {
        finish(request.status);
      }
    };
    request.onerror = () => finish(null);

    try {
      request.open('GET', source.uri);
      Object.entries(source.headers ?? {}).forEach(([key, value]) => {
        request.setRequestHeader(key, value);
      });
      request.send();
    } catch {
      finish(null);
    }
  });

const logStreamDiagnostics = (source: ResolvedStreamSource, stream: DepartmentAudioResultStreamData) => {
  void probeStreamStatus(source).then((status) => {
    logger.error({
      message: 'Audio stream diagnostic',
      context: {
        streamName: stream.Name,
        streamUrl: redactStreamUrl(source.uri),
        httpStatus: status,
        hasCredentials: source.headers?.Authorization !== undefined,
      },
    });
  });
};

let latestPlayRequestId = 0;

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
    const streamUrl = stream?.Url?.trim();
    if (!streamUrl) {
      logger.error({
        message: 'Cannot play audio stream without a URL',
        context: { streamId: stream?.Id, streamName: stream?.Name },
      });
      return;
    }

    const requestId = ++latestPlayRequestId;
    const source = resolveStreamSource(streamUrl);

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
        context: { streamName: stream.Name, streamUrl: redactStreamUrl(streamUrl) },
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
      const sound = createAudioPlayer(source, {
        updateInterval: 1000,
        keepAudioSessionActive: true,
        preferredForwardBufferDuration: 5,
      });
      sound.loop = false;
      sound.volume = 1.0;
      sound.muted = false;

      // A newer playStream may have started while audio mode was being set up.
      // Release this superseded player without touching shared store state.
      if (requestId !== latestPlayRequestId) {
        try {
          sound.remove();
        } catch {
          // The player may already have been released.
        }
        return;
      }

      set({ soundObject: sound });

      sound.addListener('playbackStatusUpdate', (status: AudioStatus) => {
        // Ignore late events from a player that has already been replaced.
        if (get().soundObject !== sound) {
          return;
        }

        if (status.error) {
          logger.error({
            message: 'Audio playback error',
            context: { error: status.error, streamName: stream.Name, streamUrl: redactStreamUrl(streamUrl) },
          });
          logStreamDiagnostics(source, stream);
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
              // Re-point the player at the source rather than seeking: a live stream has
              // nothing buffered to seek back into, so only a fresh connection resumes it.
              sound.replace(source);
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

      if (requestId !== latestPlayRequestId) {
        return;
      }

      logStreamDiagnostics(source, stream);

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
        try {
          soundObject.pause();
        } finally {
          soundObject.remove();
        }

        logger.info({
          message: 'Audio stream stopped',
          context: { streamName: currentStream?.Name },
        });
      }
    } catch (error) {
      logger.error({
        message: 'Failed to stop audio stream',
        context: { error },
      });
    } finally {
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
