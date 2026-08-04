// Mock for expo-audio to understand the PermissionStatus structure
export const getRecordingPermissionsAsync = jest.fn();
export const requestRecordingPermissionsAsync = jest.fn();
export const setAudioModeAsync = jest.fn().mockResolvedValue(undefined);

const createMockAudioPlayer = () => ({
  id: 'mock-audio-player',
  isLoaded: true,
  isBuffering: false,
  playing: false,
  muted: false,
  loop: false,
  volume: 1,
  currentStatus: {
    isLoaded: true,
    isBuffering: false,
    playing: false,
    didJustFinish: false,
    error: null,
  },
  play: jest.fn(),
  pause: jest.fn(),
  seekTo: jest.fn().mockResolvedValue(undefined),
  remove: jest.fn(),
  addListener: jest.fn(() => ({ remove: jest.fn() })),
});

export const createAudioPlayer = jest.fn(createMockAudioPlayer);

// Default mock implementation
getRecordingPermissionsAsync.mockResolvedValue({
  granted: false,
  canAskAgain: true,
  expires: 'never',
  status: 'undetermined',
});

requestRecordingPermissionsAsync.mockResolvedValue({
  granted: true,
  canAskAgain: true,
  expires: 'never',
  status: 'granted',
});
// Default export for convenience
export default {
  createAudioPlayer,
  getRecordingPermissionsAsync,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
};
