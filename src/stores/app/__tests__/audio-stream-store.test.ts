// Mock dependencies first
jest.mock('@/api/voice', () => ({
  getDepartmentAudioStreams: jest.fn(),
}));

jest.mock('@/lib/logging', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('expo-audio', () => ({
  createAudioPlayer: jest.fn(),
  setAudioModeAsync: jest.fn(),
}));

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import base64 from 'react-native-base64';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { getDepartmentAudioStreams } from '@/api/voice';
import { logger } from '@/lib/logging';
import { type DepartmentAudioResultStreamData } from '@/models/v4/voice/departmentAudioResultStreamData';
import { redactStreamUrl, resolveStreamSource, useAudioStreamStore } from '../audio-stream-store';

const mockGetDepartmentAudioStreams = getDepartmentAudioStreams as jest.MockedFunction<typeof getDepartmentAudioStreams>;
const mockCreateAudioPlayer = createAudioPlayer as jest.MockedFunction<typeof createAudioPlayer>;
const mockSetAudioModeAsync = setAudioModeAsync as jest.MockedFunction<typeof setAudioModeAsync>;
const mockLogger = logger as jest.Mocked<typeof logger>;

describe('AudioStreamStore', () => {
  const mockStream: DepartmentAudioResultStreamData = {
    Id: '1',
    Name: 'Test Stream',
    Type: 'mp3',
    Url: 'https://example.com/stream.mp3',
  };

  const mockSoundObject = {
    loop: false,
    volume: 1,
    muted: false,
    play: jest.fn(),
    pause: jest.fn(),
    replace: jest.fn(),
    remove: jest.fn(),
    seekTo: jest.fn(() => Promise.resolve()),
    addListener: jest.fn(() => ({ remove: jest.fn() })),
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset store state
    useAudioStreamStore.setState({
      availableStreams: [],
      isLoadingStreams: false,
      currentStream: null,
      soundObject: null,
      isPlaying: false,
      isLoading: false,
      isBuffering: false,
      isBottomSheetVisible: false,
    });

    // Reset mock implementations
    mockSoundObject.play.mockImplementation(() => undefined);
    mockSoundObject.pause.mockImplementation(() => undefined);
    mockSoundObject.remove.mockImplementation(() => undefined);
    mockSoundObject.seekTo.mockImplementation(() => Promise.resolve());
    mockSoundObject.addListener.mockImplementation(() => ({ remove: jest.fn() }));

    // Mock expo-audio methods
    mockSetAudioModeAsync.mockResolvedValue(undefined);
    mockCreateAudioPlayer.mockReturnValue(mockSoundObject);
  });

  describe('initial state', () => {
    it('should have the correct initial state', () => {
      const state = useAudioStreamStore.getState();

      expect(state.availableStreams).toEqual([]);
      expect(state.isLoadingStreams).toBe(false);
      expect(state.currentStream).toBeNull();
      expect(state.soundObject).toBeNull();
      expect(state.isPlaying).toBe(false);
      expect(state.isLoading).toBe(false);
      expect(state.isBuffering).toBe(false);
      expect(state.isBottomSheetVisible).toBe(false);
    });
  });

  describe('state setters', () => {
    it('should set available streams', () => {
      const streams = [mockStream];
      useAudioStreamStore.getState().setAvailableStreams(streams);

      expect(useAudioStreamStore.getState().availableStreams).toEqual(streams);
    });

    it('should set loading streams state', () => {
      useAudioStreamStore.getState().setIsLoadingStreams(true);

      expect(useAudioStreamStore.getState().isLoadingStreams).toBe(true);
    });

    it('should set current stream', () => {
      useAudioStreamStore.getState().setCurrentStream(mockStream);

      expect(useAudioStreamStore.getState().currentStream).toEqual(mockStream);
    });

    it('should set playing state', () => {
      useAudioStreamStore.getState().setIsPlaying(true);

      expect(useAudioStreamStore.getState().isPlaying).toBe(true);
    });

    it('should set loading state', () => {
      useAudioStreamStore.getState().setIsLoading(true);

      expect(useAudioStreamStore.getState().isLoading).toBe(true);
    });

    it('should set buffering state', () => {
      useAudioStreamStore.getState().setIsBuffering(true);

      expect(useAudioStreamStore.getState().isBuffering).toBe(true);
    });

    it('should set bottom sheet visibility', () => {
      useAudioStreamStore.getState().setIsBottomSheetVisible(true);

      expect(useAudioStreamStore.getState().isBottomSheetVisible).toBe(true);
    });
  });

  describe('fetchAvailableStreams', () => {
    it('should fetch streams successfully', async () => {
      const mockResponse = {
        PageSize: 0,
        Timestamp: '',
        Version: '',
        Node: '',
        RequestId: '',
        Status: '',
        Environment: '',
        Data: [mockStream],
      };

      mockGetDepartmentAudioStreams.mockResolvedValue(mockResponse);

      await useAudioStreamStore.getState().fetchAvailableStreams();

      const state = useAudioStreamStore.getState();
      expect(state.availableStreams).toEqual([mockStream]);
      expect(state.isLoadingStreams).toBe(false);
      expect(mockLogger.debug).toHaveBeenCalledWith({
        message: 'Audio streams fetched successfully',
        context: { count: 1 },
      });
    });

    it('should handle fetch error', async () => {
      const mockError = new Error('Fetch failed');
      mockGetDepartmentAudioStreams.mockRejectedValue(mockError);

      await useAudioStreamStore.getState().fetchAvailableStreams();

      const state = useAudioStreamStore.getState();
      expect(state.availableStreams).toEqual([]);
      expect(state.isLoadingStreams).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith({
        message: 'Failed to fetch audio streams',
        context: { error: mockError },
      });
    });

    it('should handle empty response', async () => {
      const mockResponse = {
        PageSize: 0,
        Timestamp: '',
        Version: '',
        Node: '',
        RequestId: '',
        Status: '',
        Environment: '',
        Data: null,
      };

      mockGetDepartmentAudioStreams.mockResolvedValue(mockResponse as any);

      await useAudioStreamStore.getState().fetchAvailableStreams();

      const state = useAudioStreamStore.getState();
      expect(state.availableStreams).toEqual([]);
      expect(mockLogger.debug).toHaveBeenCalledWith({
        message: 'Audio streams fetched successfully',
        context: { count: 0 },
      });
    });
  });

  describe('playStream', () => {
    it('should reject a missing URL without disrupting the current stream', async () => {
      const invalidStream = { ...mockStream, Id: 'invalid', Name: 'Invalid Stream', Url: ' ' };
      useAudioStreamStore.setState({
        soundObject: mockSoundObject,
        currentStream: mockStream,
        isPlaying: true,
      });

      await useAudioStreamStore.getState().playStream(invalidStream);

      const state = useAudioStreamStore.getState();
      expect(state.soundObject).toBe(mockSoundObject);
      expect(state.currentStream).toEqual(mockStream);
      expect(state.isPlaying).toBe(true);
      expect(mockSetAudioModeAsync).not.toHaveBeenCalled();
      expect(mockCreateAudioPlayer).not.toHaveBeenCalled();
      expect(mockSoundObject.remove).not.toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith({
        message: 'Cannot play audio stream without a URL',
        context: { streamId: invalidStream.Id, streamName: invalidStream.Name },
      });
    });

    it('should play stream successfully', async () => {
      await useAudioStreamStore.getState().playStream(mockStream);

      const state = useAudioStreamStore.getState();
      expect(state.currentStream).toEqual(mockStream);
      expect(state.soundObject).toEqual(mockSoundObject);
      expect(state.isPlaying).toBe(true);
      expect(state.isLoading).toBe(false);
      expect(state.isBuffering).toBe(false);

      expect(mockSetAudioModeAsync).toHaveBeenCalledWith({
        allowsRecording: false,
        shouldPlayInBackground: true,
        playsInSilentMode: true,
        interruptionMode: 'duckOthers',
        shouldRouteThroughEarpiece: false,
      });

      expect(mockCreateAudioPlayer).toHaveBeenCalledWith(
        { uri: mockStream.Url },
        {
          updateInterval: 1000,
          keepAudioSessionActive: true,
          preferredForwardBufferDuration: 5,
        }
      );
      expect(mockSoundObject.addListener).toHaveBeenCalledWith('playbackStatusUpdate', expect.any(Function));

      expect(mockSoundObject.play).toHaveBeenCalled();

      expect(mockLogger.debug).toHaveBeenCalledWith({
        message: 'Starting audio stream',
        context: { streamName: mockStream.Name, streamUrl: mockStream.Url },
      });

      expect(mockLogger.info).toHaveBeenCalledWith({
        message: 'Audio stream started successfully',
        context: { streamName: mockStream.Name },
      });
    });

    it('should stop current stream before playing new one', async () => {
      // Set up existing stream
      useAudioStreamStore.setState({
        soundObject: mockSoundObject,
        currentStream: mockStream,
        isPlaying: true,
      });

      const newStream = { ...mockStream, Id: '2', Name: 'New Stream' };

      await useAudioStreamStore.getState().playStream(newStream);

      expect(mockSoundObject.pause).toHaveBeenCalled();
      expect(mockSoundObject.remove).toHaveBeenCalled();
    });

    it('should handle play stream error', async () => {
      const mockError = new Error('Play failed');
      mockCreateAudioPlayer.mockImplementationOnce(() => {
        throw mockError;
      });

      await useAudioStreamStore.getState().playStream(mockStream);

      const state = useAudioStreamStore.getState();
      expect(state.soundObject).toBeNull();
      expect(state.currentStream).toBeNull();
      expect(state.isPlaying).toBe(false);
      expect(state.isLoading).toBe(false);
      expect(state.isBuffering).toBe(false);

      expect(mockLogger.error).toHaveBeenCalledWith({
        message: 'Failed to play audio stream',
        context: { error: mockError, streamName: mockStream.Name },
      });
    });

    it('should not clear a newer stream when an older setup rejects', async () => {
      const olderStream = { ...mockStream, Id: 'older', Name: 'Older Stream' };
      const newerStream = { ...mockStream, Id: 'newer', Name: 'Newer Stream' };
      const olderError = new Error('Older setup failed');
      let rejectOlderSetup!: (error: Error) => void;
      const olderSetup = new Promise<void>((_resolve, reject) => {
        rejectOlderSetup = reject;
      });

      mockSetAudioModeAsync.mockImplementationOnce(() => olderSetup).mockResolvedValueOnce(undefined);

      const olderRequest = useAudioStreamStore.getState().playStream(olderStream);
      await Promise.resolve();
      expect(mockSetAudioModeAsync).toHaveBeenCalledTimes(1);

      await useAudioStreamStore.getState().playStream(newerStream);
      rejectOlderSetup(olderError);
      await olderRequest;

      const state = useAudioStreamStore.getState();
      expect(state.soundObject).toBe(mockSoundObject);
      expect(state.currentStream).toEqual(newerStream);
      expect(state.isPlaying).toBe(true);
      expect(state.isLoading).toBe(false);
      expect(state.isBuffering).toBe(false);
      expect(mockSoundObject.remove).not.toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith({
        message: 'Failed to play audio stream',
        context: { error: olderError, streamName: olderStream.Name },
      });
    });

    it('should release an older player when its setup resolves after a newer stream', async () => {
      const olderStream = { ...mockStream, Id: 'older', Name: 'Older Stream' };
      const newerStream = { ...mockStream, Id: 'newer', Name: 'Newer Stream' };
      const newerSound = {
        ...mockSoundObject,
        play: jest.fn(),
        remove: jest.fn(),
        addListener: jest.fn(() => ({ remove: jest.fn() })),
      } as any;
      const olderSound = {
        ...mockSoundObject,
        play: jest.fn(),
        remove: jest.fn(),
        addListener: jest.fn(() => ({ remove: jest.fn() })),
      } as any;
      let resolveOlderSetup!: () => void;
      const olderSetup = new Promise<void>((resolve) => {
        resolveOlderSetup = resolve;
      });

      mockSetAudioModeAsync.mockImplementationOnce(() => olderSetup).mockResolvedValueOnce(undefined);
      mockCreateAudioPlayer.mockReturnValueOnce(newerSound).mockReturnValueOnce(olderSound);

      const olderRequest = useAudioStreamStore.getState().playStream(olderStream);
      await Promise.resolve();
      expect(mockSetAudioModeAsync).toHaveBeenCalledTimes(1);

      await useAudioStreamStore.getState().playStream(newerStream);
      resolveOlderSetup();
      await olderRequest;

      const state = useAudioStreamStore.getState();
      expect(state.soundObject).toBe(newerSound);
      expect(state.currentStream).toEqual(newerStream);
      expect(state.isPlaying).toBe(true);
      expect(newerSound.play).toHaveBeenCalledTimes(1);
      expect(newerSound.remove).not.toHaveBeenCalled();
      expect(olderSound.play).not.toHaveBeenCalled();
      expect(olderSound.remove).toHaveBeenCalledTimes(1);
    });
  });

  describe('stopStream', () => {
    it('should stop stream successfully', async () => {
      // Set up playing stream
      useAudioStreamStore.setState({
        soundObject: mockSoundObject,
        currentStream: mockStream,
        isPlaying: true,
      });

      await useAudioStreamStore.getState().stopStream();

      const state = useAudioStreamStore.getState();
      expect(state.soundObject).toBeNull();
      expect(state.currentStream).toBeNull();
      expect(state.isPlaying).toBe(false);
      expect(state.isLoading).toBe(false);
      expect(state.isBuffering).toBe(false);

      expect(mockSoundObject.pause).toHaveBeenCalled();
      expect(mockSoundObject.remove).toHaveBeenCalled();

      expect(mockLogger.info).toHaveBeenCalledWith({
        message: 'Audio stream stopped',
        context: { streamName: mockStream.Name },
      });
    });

    it('should handle stop stream error', async () => {
      const mockError = new Error('Stop failed');
      mockSoundObject.pause.mockImplementationOnce(() => {
        throw mockError;
      });

      useAudioStreamStore.setState({
        soundObject: mockSoundObject,
        currentStream: mockStream,
        isPlaying: true,
      });

      await useAudioStreamStore.getState().stopStream();

      expect(mockLogger.error).toHaveBeenCalledWith({
        message: 'Failed to stop audio stream',
        context: { error: mockError },
      });
      expect(mockSoundObject.remove).toHaveBeenCalled();

      const state = useAudioStreamStore.getState();
      expect(state.soundObject).toBeNull();
      expect(state.currentStream).toBeNull();
      expect(state.isPlaying).toBe(false);
      expect(state.isLoading).toBe(false);
      expect(state.isBuffering).toBe(false);
    });

    it('should handle null sound object', async () => {
      useAudioStreamStore.setState({
        soundObject: null,
        currentStream: mockStream,
        isPlaying: true,
      });

      await useAudioStreamStore.getState().stopStream();

      const state = useAudioStreamStore.getState();
      expect(state.soundObject).toBeNull();
      expect(state.currentStream).toBeNull();
      expect(state.isPlaying).toBe(false);

      expect(mockSoundObject.pause).not.toHaveBeenCalled();
      expect(mockSoundObject.remove).not.toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('should cleanup successfully', async () => {
      useAudioStreamStore.setState({
        soundObject: mockSoundObject,
        currentStream: mockStream,
        isPlaying: true,
      });

      await useAudioStreamStore.getState().cleanup();

      const state = useAudioStreamStore.getState();
      expect(state.soundObject).toBeNull();
      expect(state.currentStream).toBeNull();
      expect(state.isPlaying).toBe(false);

      expect(mockSoundObject.pause).toHaveBeenCalled();
      expect(mockSoundObject.remove).toHaveBeenCalled();

      expect(mockLogger.debug).toHaveBeenCalledWith({
        message: 'Audio stream store cleaned up',
      });
    });

    it('should handle cleanup error', async () => {
      const mockError = new Error('Cleanup failed');
      mockSoundObject.pause.mockImplementationOnce(() => {
        throw mockError;
      });

      useAudioStreamStore.setState({
        soundObject: mockSoundObject,
        currentStream: mockStream,
        isPlaying: true,
      });

      await useAudioStreamStore.getState().cleanup();

      // The cleanup method calls stopStream, which catches its own errors
      // So we expect the stopStream error message, not the cleanup error message
      expect(mockLogger.error).toHaveBeenCalledWith({
        message: 'Failed to stop audio stream',
        context: { error: mockError },
      });
    });
  });
});

describe('resolveStreamSource', () => {
  it('leaves a credential-free URL untouched', () => {
    expect(resolveStreamSource('https://audio.broadcastify.com/12345.mp3')).toEqual({
      uri: 'https://audio.broadcastify.com/12345.mp3',
    });
  });

  it('hoists inline credentials into an Authorization header', () => {
    expect(resolveStreamSource('https://scanner:s3cret@audio.broadcastify.com/12345.mp3')).toEqual({
      uri: 'https://audio.broadcastify.com/12345.mp3',
      headers: { Authorization: `Basic ${base64.encode('scanner:s3cret')}` },
    });
  });

  it('percent-decodes credentials before encoding them', () => {
    expect(resolveStreamSource('http://user%40dept.org:p%40ss@relay.example.com/live')).toEqual({
      uri: 'http://relay.example.com/live',
      headers: { Authorization: `Basic ${base64.encode('user@dept.org:p@ss')}` },
    });
  });

  it('treats a username without a password as an empty password', () => {
    expect(resolveStreamSource('https://token@relay.example.com/live')).toEqual({
      uri: 'https://relay.example.com/live',
      headers: { Authorization: `Basic ${base64.encode('token:')}` },
    });
  });

  it('splits at the last @ so an unencoded @ in the password survives', () => {
    // RFC 3986 wants that @ percent-encoded, but departments paste raw passwords. Splitting at
    // the first @ sent 'scanner:p' as the credentials and left 'ss@relay...' in the playback URI.
    expect(resolveStreamSource('https://scanner:p@ss@relay.example.com/live')).toEqual({
      uri: 'https://relay.example.com/live',
      headers: { Authorization: `Basic ${base64.encode('scanner:p@ss')}` },
    });
  });

  it('does not treat an @ in the path as credentials', () => {
    expect(resolveStreamSource('https://relay.example.com/live@2x.mp3')).toEqual({ uri: 'https://relay.example.com/live@2x.mp3' });
  });
});

describe('redactStreamUrl', () => {
  it('returns a credential-free URL unchanged', () => {
    expect(redactStreamUrl('https://audio.broadcastify.com/12345.mp3')).toBe('https://audio.broadcastify.com/12345.mp3');
  });

  it('masks inline credentials', () => {
    expect(redactStreamUrl('https://scanner:s3cret@audio.broadcastify.com/12345.mp3')).toBe('https://***@audio.broadcastify.com/12345.mp3');
  });

  it('masks a password containing an unencoded @ without leaking its tail', () => {
    // Splitting at the FIRST @ used to leave 'ss@relay...' in the redacted output, publishing
    // part of the password to the log.
    expect(redactStreamUrl('https://scanner:p@ss@relay.example.com/live')).toBe('https://***@relay.example.com/live');
  });

  it('leaves an @ in the path alone', () => {
    expect(redactStreamUrl('https://relay.example.com/live@2x.mp3')).toBe('https://relay.example.com/live@2x.mp3');
  });
});
