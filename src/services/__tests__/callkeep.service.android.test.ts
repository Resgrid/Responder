import { Platform } from 'react-native';

// Mock Platform to simulate Android
jest.mock('react-native', () => ({
  Platform: {
    OS: 'android',
  },
}));

// Mock logger
jest.mock('../../lib/logging', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
  },
}));

import { logger } from '../../lib/logging';
import { callKeepService, CallKeepService } from '../callkeep.service.android';

const mockLogger = logger as jest.Mocked<typeof logger>;

describe('CallKeepService Android Implementation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = CallKeepService.getInstance();
      const instance2 = CallKeepService.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should export the same instance as callKeepService', () => {
      const instance = CallKeepService.getInstance();
      expect(callKeepService).toBe(instance);
    });
  });

  describe('setup method', () => {
    it('should be a no-op and log debug message', async () => {
      const config = {
        appName: 'Test App',
        maximumCallGroups: 1,
        maximumCallsPerCallGroup: 1,
        includesCallsInRecents: false,
        supportsVideo: false,
      };

      await callKeepService.setup(config);

      expect(mockLogger.debug).toHaveBeenCalledWith({
        message: 'CallKeep setup skipped - Android platform does not require CallKeep',
        context: { platform: 'android' },
      });
    });
  });

  describe('startCall method', () => {
    it('should return empty string and log debug message', async () => {
      const result = await callKeepService.startCall('test-room', 'test-handle');

      expect(result).toBe('');
      expect(mockLogger.debug).toHaveBeenCalledWith({
        message: 'CallKeep startCall skipped - Android platform does not require CallKeep',
        context: { platform: 'android', roomName: 'test-room', handle: 'test-handle' },
      });
    });
  });

  describe('endCall method', () => {
    it('should be a no-op and log debug message', async () => {
      await callKeepService.endCall();

      expect(mockLogger.debug).toHaveBeenCalledWith({
        message: 'CallKeep endCall skipped - Android platform does not require CallKeep',
        context: { platform: 'android' },
      });
    });
  });

  describe('setMuteStateCallback method', () => {
    it('should be a no-op and log debug message', () => {
      const mockCallback = jest.fn();
      callKeepService.setMuteStateCallback(mockCallback);

      expect(mockLogger.debug).toHaveBeenCalledWith({
        message: 'CallKeep setMuteStateCallback skipped - Android platform does not require CallKeep',
        context: { platform: 'android' },
      });
    });
  });

  describe('isCallActiveNow method', () => {
    it('should always return false', () => {
      expect(callKeepService.isCallActiveNow()).toBe(false);
    });
  });

  describe('getCurrentCallUUID method', () => {
    it('should always return null', () => {
      expect(callKeepService.getCurrentCallUUID()).toBeNull();
    });
  });

  describe('cleanup method', () => {
    it('should be a no-op and log debug message', async () => {
      await callKeepService.cleanup();

      expect(mockLogger.debug).toHaveBeenCalledWith({
        message: 'CallKeep cleanup skipped - Android platform does not require CallKeep',
        context: { platform: 'android' },
      });
    });
  });
});
