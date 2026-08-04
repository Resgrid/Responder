jest.mock('react-native', () => ({
  NativeModules: {},
  Platform: { OS: 'ios' },
}));

jest.mock('expo-audio', () => ({
  createAudioPlayer: jest.fn(),
  setAudioModeAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../lib/logging', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

import { createAudioPlayer } from 'expo-audio';

import { logger } from '../../lib/logging';
import { inCallAudio } from '../InCallAudio';

const mockCreateAudioPlayer = createAudioPlayer as jest.MockedFunction<typeof createAudioPlayer>;
const mockLogger = logger as jest.Mocked<typeof logger>;

describe('InCallAudio', () => {
  it('releases the subscription and player when play throws', async () => {
    const playError = new Error('Play failed');
    const removeSubscription = jest.fn();
    const removePlayer = jest.fn();
    const player = {
      addListener: jest.fn(() => ({ remove: removeSubscription })),
      play: jest.fn(() => {
        throw playError;
      }),
      remove: removePlayer,
    } as any;
    mockCreateAudioPlayer.mockReturnValue(player);

    await inCallAudio.playSound('connected');

    expect(removeSubscription).toHaveBeenCalledTimes(1);
    expect(removePlayer).toHaveBeenCalledTimes(1);
    expect(mockLogger.warn).toHaveBeenCalledWith({
      message: 'Failed to play in-call sound',
      context: { name: 'connected', error: playError },
    });
  });
});
