/* eslint-disable @typescript-eslint/no-explicit-any */

const mockEmit = jest.fn();
const mockAddListener = jest.fn(() => ({ remove: jest.fn() }));

// Mock dependencies
jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
  DeviceEventEmitter: {
    addListener: mockAddListener,
    emit: mockEmit,
  },
  AppState: {
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  },
  NativeModules: {},
  NativeEventEmitter: jest.fn(() => ({
    addListener: jest.fn(() => ({ remove: jest.fn() })),
  })),
}));

// Mock stores
const mockSetLastButtonAction = jest.fn();
const mockAddButtonEvent = jest.fn();
const mockSetIsHeadsetButtonMonitoring = jest.fn();

jest.mock('@/stores/app/bluetooth-audio-store', () => ({
  useBluetoothAudioStore: {
    getState: () => ({
      addButtonEvent: mockAddButtonEvent,
      setLastButtonAction: mockSetLastButtonAction,
      setAudioRoutingActive: jest.fn(),
      setIsHeadsetButtonMonitoring: mockSetIsHeadsetButtonMonitoring,
      isHeadsetButtonMonitoring: false,
      headsetButtonConfig: {
        pttMode: 'toggle',
        playPauseAction: 'toggle_mute',
        doubleClickAction: 'none',
        longPressAction: 'none',
        soundFeedback: true,
      },
    }),
  },
}));

const mockSetMicrophoneEnabled = jest.fn();
const mockIsMicrophoneEnabled = true;

jest.mock('@/stores/app/livekit-store', () => ({
  useLiveKitStore: {
    getState: () => ({
      currentRoom: {
        localParticipant: {
          isMicrophoneEnabled: mockIsMicrophoneEnabled,
          setMicrophoneEnabled: mockSetMicrophoneEnabled,
        },
      },
      isConnected: true,
    }),
  },
}));

jest.mock('@/lib/logging', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

jest.mock('@/services/audio.service', () => ({
  audioService: {
    playStartTransmittingSound: jest.fn().mockResolvedValue(undefined),
    playStopTransmittingSound: jest.fn().mockResolvedValue(undefined),
  },
}));

// Import after mocks are set up
import { headsetButtonService } from '../headset-button.service';

describe('HeadsetButtonService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should be a singleton', () => {
      const instance1 = headsetButtonService;
      const instance2 = headsetButtonService;
      expect(instance1).toBe(instance2);
    });

    it('should initialize without errors', async () => {
      await expect(headsetButtonService.initialize()).resolves.not.toThrow();
    });

    it('should not re-initialize if already initialized', async () => {
      await headsetButtonService.initialize();
      await headsetButtonService.initialize();
      // Should not throw
    });
  });

  describe('Configuration', () => {
    it('should return default configuration', () => {
      const config = headsetButtonService.getConfig();
      expect(config).toHaveProperty('pttMode');
      expect(config).toHaveProperty('playPauseAction');
      expect(config).toHaveProperty('doubleClickAction');
      expect(config).toHaveProperty('longPressAction');
      expect(config).toHaveProperty('soundFeedback');
    });

    it('should update configuration', () => {
      headsetButtonService.setConfig({ pttMode: 'push_to_talk' });
      const config = headsetButtonService.getConfig();
      expect(config.pttMode).toBe('push_to_talk');
    });

    it('should merge partial configuration', () => {
      headsetButtonService.setConfig({ soundFeedback: false });
      const config = headsetButtonService.getConfig();
      expect(config.soundFeedback).toBe(false);
      expect(config.pttMode).toBeDefined();
    });
  });

  describe('Monitoring State', () => {
    it('should start monitoring', () => {
      headsetButtonService.startMonitoring();
      expect(headsetButtonService.isMonitoringActive()).toBe(true);
    });

    it('should stop monitoring', () => {
      headsetButtonService.startMonitoring();
      headsetButtonService.stopMonitoring();
      expect(headsetButtonService.isMonitoringActive()).toBe(false);
    });

    it('should not start monitoring twice', () => {
      headsetButtonService.startMonitoring();
      headsetButtonService.startMonitoring();
      expect(headsetButtonService.isMonitoringActive()).toBe(true);
    });

    it('should not stop monitoring if not active', () => {
      headsetButtonService.stopMonitoring();
      expect(headsetButtonService.isMonitoringActive()).toBe(false);
    });
  });

  describe('Microphone Control', () => {
    beforeEach(() => {
      headsetButtonService.startMonitoring();
    });

    afterEach(() => {
      headsetButtonService.stopMonitoring();
    });

    it('should toggle microphone', async () => {
      await headsetButtonService.toggleMicrophone();
      expect(mockSetMicrophoneEnabled).toHaveBeenCalled();
    });

    it('should not enable microphone if already enabled', async () => {
      // The mock has isMicrophoneEnabled: true, so enableMicrophone should not call setMicrophoneEnabled
      await headsetButtonService.enableMicrophone();
      // setMicrophoneEnabled should not be called since mic is already enabled
      expect(mockSetMicrophoneEnabled).not.toHaveBeenCalled();
    });

    it('should disable microphone', async () => {
      await headsetButtonService.disableMicrophone();
      expect(mockSetMicrophoneEnabled).toHaveBeenCalledWith(false);
    });

    it('should update last button action when toggling microphone', async () => {
      await headsetButtonService.toggleMicrophone();
      expect(mockSetLastButtonAction).toHaveBeenCalledWith(
        expect.objectContaining({
          action: expect.stringMatching(/mute|unmute/),
          timestamp: expect.any(Number),
        })
      );
    });
  });

  describe('Button Event Simulation', () => {
    beforeEach(() => {
      headsetButtonService.startMonitoring();
    });

    afterEach(() => {
      headsetButtonService.stopMonitoring();
    });

    it('should simulate button press', () => {
      headsetButtonService.simulateButtonPress('play_pause');
      // Should add button event to store
      expect(mockAddButtonEvent).toHaveBeenCalled();
    });

    it('should not simulate button press if not monitoring', () => {
      headsetButtonService.stopMonitoring();
      headsetButtonService.simulateButtonPress('play_pause');
      // Should not have been called after stopping
      const callCount = mockAddButtonEvent.mock.calls.length;
      headsetButtonService.simulateButtonPress('play_pause');
      expect(mockAddButtonEvent.mock.calls.length).toBe(callCount);
    });
  });

  describe('Cleanup', () => {
    it('should destroy service properly', () => {
      headsetButtonService.startMonitoring();
      headsetButtonService.destroy();
      expect(headsetButtonService.isMonitoringActive()).toBe(false);
    });
  });
});

describe('Button Type Mapping', () => {
  // Test the internal button type mapping through public interface
  it('should handle play_pause button type', () => {
    headsetButtonService.startMonitoring();
    headsetButtonService.simulateButtonPress('play_pause');
    expect(mockAddButtonEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        button: 'mute',
      })
    );
    headsetButtonService.stopMonitoring();
  });

  it('should handle hook button type', () => {
    headsetButtonService.startMonitoring();
    headsetButtonService.simulateButtonPress('hook');
    expect(mockAddButtonEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        button: 'mute',
      })
    );
    headsetButtonService.stopMonitoring();
  });

  it('should handle unknown button type', () => {
    headsetButtonService.startMonitoring();
    headsetButtonService.simulateButtonPress('next');
    expect(mockAddButtonEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        button: 'unknown',
      })
    );
    headsetButtonService.stopMonitoring();
  });
});
