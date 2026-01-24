/**
 * Tests for useHeadsetButtonPTT hook
 *
 * Validates:
 * - Initialization behavior
 * - Configuration updates
 * - Auto-start/stop on LiveKit connection changes
 * - No race conditions with store-level monitoring
 * - Proper cleanup
 */

import { renderHook, waitFor } from '@testing-library/react-native';

import { headsetButtonService, type PttMode } from '@/services/headset-button.service';
import { useBluetoothAudioStore } from '@/stores/app/bluetooth-audio-store';
import { useLiveKitStore } from '@/stores/app/livekit-store';

import { useHeadsetButtonPTT } from '../use-headset-button-ptt';

// Mock the services and stores
jest.mock('@/services/headset-button.service', () => ({
  headsetButtonService: {
    initialize: jest.fn(),
    setConfig: jest.fn(),
    startMonitoring: jest.fn(),
    stopMonitoring: jest.fn(),
    simulateButtonPress: jest.fn(),
  },
}));

jest.mock('@/stores/app/livekit-store', () => ({
  useLiveKitStore: jest.fn(),
}));

jest.mock('@/stores/app/bluetooth-audio-store', () => ({
  useBluetoothAudioStore: jest.fn(),
}));

const mockedHeadsetButtonService = headsetButtonService as jest.Mocked<typeof headsetButtonService>;
const mockedUseLiveKitStore = useLiveKitStore as jest.MockedFunction<typeof useLiveKitStore>;
const mockedUseBluetoothAudioStore = useBluetoothAudioStore as jest.MockedFunction<typeof useBluetoothAudioStore>;

describe('useHeadsetButtonPTT', () => {
  // Default mock implementations
  const mockToggleMicrophone = jest.fn();
  const mockSetMicrophoneEnabled = jest.fn();
  const mockStartHeadsetButtonMonitoring = jest.fn().mockResolvedValue(undefined);
  const mockStopHeadsetButtonMonitoring = jest.fn();
  const mockSetHeadsetButtonConfig = jest.fn();

  const mockLocalParticipant = {
    isMicrophoneEnabled: true,
  };

  const mockRoom = {
    localParticipant: mockLocalParticipant,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Default LiveKit store state
    mockedUseLiveKitStore.mockReturnValue({
      isConnected: false,
      currentRoom: null,
      toggleMicrophone: mockToggleMicrophone,
      setMicrophoneEnabled: mockSetMicrophoneEnabled,
      startHeadsetButtonMonitoring: mockStartHeadsetButtonMonitoring,
      stopHeadsetButtonMonitoring: mockStopHeadsetButtonMonitoring,
    } as any);

    // Default Bluetooth audio store state
    mockedUseBluetoothAudioStore.mockReturnValue({
      isHeadsetButtonMonitoring: false,
      headsetButtonConfig: {
        pttMode: 'toggle',
        soundFeedback: true,
      },
      lastButtonAction: null,
      setHeadsetButtonConfig: mockSetHeadsetButtonConfig,
    } as any);
  });

  describe('Initialization', () => {
    it('should initialize service on mount', () => {
      renderHook(() => useHeadsetButtonPTT());

      expect(mockedHeadsetButtonService.initialize).toHaveBeenCalledTimes(1);
    });

    it('should set initial configuration on mount', () => {
      renderHook(() => useHeadsetButtonPTT({ pttMode: 'push_to_talk', soundFeedback: false }));

      expect(mockedHeadsetButtonService.setConfig).toHaveBeenCalledWith({
        pttMode: 'push_to_talk',
        soundFeedback: false,
      });
    });

    it('should use default options when none provided', () => {
      renderHook(() => useHeadsetButtonPTT());

      expect(mockedHeadsetButtonService.setConfig).toHaveBeenCalledWith({
        pttMode: 'toggle',
        soundFeedback: true,
      });
    });

    it('should not re-initialize service when re-rendered', () => {
      const { rerender } = renderHook(() => useHeadsetButtonPTT());

      expect(mockedHeadsetButtonService.initialize).toHaveBeenCalledTimes(1);

      rerender({});

      expect(mockedHeadsetButtonService.initialize).toHaveBeenCalledTimes(1);
    });
  });

  describe('Configuration Updates', () => {
    it('should update configuration when pttMode changes', async () => {
      const { rerender } = renderHook(({ pttMode }) => useHeadsetButtonPTT({ pttMode }), {
        initialProps: { pttMode: 'toggle' as PttMode },
      });

      // Clear the initial setConfig call
      jest.clearAllMocks();

      // Change pttMode
      rerender({ pttMode: 'push_to_talk' as const });

      await waitFor(() => {
        expect(mockedHeadsetButtonService.setConfig).toHaveBeenCalledWith({
          pttMode: 'push_to_talk',
          soundFeedback: true,
        });
      });
    });

    it('should update configuration when soundFeedback changes', async () => {
      const { rerender } = renderHook(({ soundFeedback }) => useHeadsetButtonPTT({ soundFeedback }), {
        initialProps: { soundFeedback: true },
      });

      // Clear the initial setConfig call
      jest.clearAllMocks();

      // Change soundFeedback
      rerender({ soundFeedback: false });

      await waitFor(() => {
        expect(mockedHeadsetButtonService.setConfig).toHaveBeenCalledWith({
          pttMode: 'toggle',
          soundFeedback: false,
        });
      });
    });

    it('should update configuration when both options change', async () => {
      const { rerender } = renderHook(
        ({ pttMode, soundFeedback }) => useHeadsetButtonPTT({ pttMode, soundFeedback }),
        {
          initialProps: { pttMode: 'toggle' as PttMode, soundFeedback: true },
        }
      );

      // Clear the initial setConfig call
      jest.clearAllMocks();

      // Change both options
      rerender({ pttMode: 'push_to_talk' as const, soundFeedback: false });

      await waitFor(() => {
        expect(mockedHeadsetButtonService.setConfig).toHaveBeenCalledWith({
          pttMode: 'push_to_talk',
          soundFeedback: false,
        });
      });
    });
  });

  describe('Auto-start on Connect', () => {
    it('should auto-start monitoring when LiveKit connects', async () => {
      const { rerender } = renderHook(() => useHeadsetButtonPTT({ autoStartOnConnect: true }));

      // Simulate LiveKit connection
      mockedUseLiveKitStore.mockReturnValue({
        isConnected: true,
        currentRoom: mockRoom,
        toggleMicrophone: mockToggleMicrophone,
        setMicrophoneEnabled: mockSetMicrophoneEnabled,
        startHeadsetButtonMonitoring: mockStartHeadsetButtonMonitoring,
        stopHeadsetButtonMonitoring: mockStopHeadsetButtonMonitoring,
      } as any);

      rerender({});

      await waitFor(() => {
        expect(mockStartHeadsetButtonMonitoring).toHaveBeenCalledTimes(1);
      });
    });

    it('should not auto-start if autoStartOnConnect is false', async () => {
      const { rerender } = renderHook(() => useHeadsetButtonPTT({ autoStartOnConnect: false }));

      // Simulate LiveKit connection
      mockedUseLiveKitStore.mockReturnValue({
        isConnected: true,
        currentRoom: mockRoom,
        toggleMicrophone: mockToggleMicrophone,
        setMicrophoneEnabled: mockSetMicrophoneEnabled,
        startHeadsetButtonMonitoring: mockStartHeadsetButtonMonitoring,
        stopHeadsetButtonMonitoring: mockStopHeadsetButtonMonitoring,
      } as any);

      rerender({});

      await waitFor(() => {
        expect(mockStartHeadsetButtonMonitoring).not.toHaveBeenCalled();
      });
    });

    it('should not auto-start if monitoring is already active (prevent race condition)', async () => {
      // Simulate scenario where store already started monitoring (e.g., from connectToRoom)
      mockedUseBluetoothAudioStore.mockReturnValue({
        isHeadsetButtonMonitoring: true,
        headsetButtonConfig: {
          pttMode: 'toggle',
          soundFeedback: true,
        },
        lastButtonAction: null,
        setHeadsetButtonConfig: mockSetHeadsetButtonConfig,
      } as any);

      const { rerender } = renderHook(() => useHeadsetButtonPTT({ autoStartOnConnect: true }));

      // Simulate LiveKit connection
      mockedUseLiveKitStore.mockReturnValue({
        isConnected: true,
        currentRoom: mockRoom,
        toggleMicrophone: mockToggleMicrophone,
        setMicrophoneEnabled: mockSetMicrophoneEnabled,
        startHeadsetButtonMonitoring: mockStartHeadsetButtonMonitoring,
        stopHeadsetButtonMonitoring: mockStopHeadsetButtonMonitoring,
      } as any);

      rerender({});

      await waitFor(() => {
        // Should not call start again since it's already monitoring
        expect(mockStartHeadsetButtonMonitoring).not.toHaveBeenCalled();
      });
    });
  });

  describe('Auto-stop on Disconnect', () => {
    it('should auto-stop monitoring when LiveKit disconnects', async () => {
      // Start with connected state and monitoring active
      mockedUseLiveKitStore.mockReturnValue({
        isConnected: true,
        currentRoom: mockRoom,
        toggleMicrophone: mockToggleMicrophone,
        setMicrophoneEnabled: mockSetMicrophoneEnabled,
        startHeadsetButtonMonitoring: mockStartHeadsetButtonMonitoring,
        stopHeadsetButtonMonitoring: mockStopHeadsetButtonMonitoring,
      } as any);

      mockedUseBluetoothAudioStore.mockReturnValue({
        isHeadsetButtonMonitoring: true,
        headsetButtonConfig: {
          pttMode: 'toggle',
          soundFeedback: true,
        },
        lastButtonAction: null,
        setHeadsetButtonConfig: mockSetHeadsetButtonConfig,
      } as any);

      const { rerender } = renderHook(() => useHeadsetButtonPTT({ autoStopOnDisconnect: true }));

      // Simulate LiveKit disconnection
      mockedUseLiveKitStore.mockReturnValue({
        isConnected: false,
        currentRoom: null,
        toggleMicrophone: mockToggleMicrophone,
        setMicrophoneEnabled: mockSetMicrophoneEnabled,
        startHeadsetButtonMonitoring: mockStartHeadsetButtonMonitoring,
        stopHeadsetButtonMonitoring: mockStopHeadsetButtonMonitoring,
      } as any);

      rerender({});

      await waitFor(() => {
        expect(mockStopHeadsetButtonMonitoring).toHaveBeenCalledTimes(1);
      });
    });

    it('should not auto-stop if autoStopOnDisconnect is false', async () => {
      // Start with connected state and monitoring active
      mockedUseLiveKitStore.mockReturnValue({
        isConnected: true,
        currentRoom: mockRoom,
        toggleMicrophone: mockToggleMicrophone,
        setMicrophoneEnabled: mockSetMicrophoneEnabled,
        startHeadsetButtonMonitoring: mockStartHeadsetButtonMonitoring,
        stopHeadsetButtonMonitoring: mockStopHeadsetButtonMonitoring,
      } as any);

      mockedUseBluetoothAudioStore.mockReturnValue({
        isHeadsetButtonMonitoring: true,
        headsetButtonConfig: {
          pttMode: 'toggle',
          soundFeedback: true,
        },
        lastButtonAction: null,
        setHeadsetButtonConfig: mockSetHeadsetButtonConfig,
      } as any);

      const { rerender } = renderHook(() => useHeadsetButtonPTT({ autoStopOnDisconnect: false }));

      // Simulate LiveKit disconnection
      mockedUseLiveKitStore.mockReturnValue({
        isConnected: false,
        currentRoom: null,
        toggleMicrophone: mockToggleMicrophone,
        setMicrophoneEnabled: mockSetMicrophoneEnabled,
        startHeadsetButtonMonitoring: mockStartHeadsetButtonMonitoring,
        stopHeadsetButtonMonitoring: mockStopHeadsetButtonMonitoring,
      } as any);

      rerender({});

      await waitFor(() => {
        expect(mockStopHeadsetButtonMonitoring).not.toHaveBeenCalled();
      });
    });
  });

  describe('Manual Controls', () => {
    it('should start monitoring when startMonitoring is called', () => {
      const { result } = renderHook(() => useHeadsetButtonPTT());

      result.current.startMonitoring();

      expect(mockStartHeadsetButtonMonitoring).toHaveBeenCalledTimes(1);
    });

    it('should stop monitoring when stopMonitoring is called', () => {
      const { result } = renderHook(() => useHeadsetButtonPTT());

      result.current.stopMonitoring();

      expect(mockStopHeadsetButtonMonitoring).toHaveBeenCalledTimes(1);
    });

    it('should toggle monitoring on/off', () => {
      mockedUseBluetoothAudioStore.mockReturnValue({
        isHeadsetButtonMonitoring: false,
        headsetButtonConfig: {
          pttMode: 'toggle',
          soundFeedback: true,
        },
        lastButtonAction: null,
        setHeadsetButtonConfig: mockSetHeadsetButtonConfig,
      } as any);

      const { result, rerender } = renderHook(() => useHeadsetButtonPTT());

      // Toggle on (not monitoring → start)
      result.current.toggleMonitoring();
      expect(mockStartHeadsetButtonMonitoring).toHaveBeenCalledTimes(1);

      // Update mock to show monitoring is now active
      mockedUseBluetoothAudioStore.mockReturnValue({
        isHeadsetButtonMonitoring: true,
        headsetButtonConfig: {
          pttMode: 'toggle',
          soundFeedback: true,
        },
        lastButtonAction: null,
        setHeadsetButtonConfig: mockSetHeadsetButtonConfig,
      } as any);

      rerender({});

      // Clear previous calls before testing toggle off
      jest.clearAllMocks();

      // Toggle off (monitoring → stop)
      result.current.toggleMonitoring();
      expect(mockStopHeadsetButtonMonitoring).toHaveBeenCalledTimes(1);
    });

    it('should toggle microphone', async () => {
      const { result } = renderHook(() => useHeadsetButtonPTT());

      await result.current.toggleMicrophone();

      expect(mockToggleMicrophone).toHaveBeenCalledTimes(1);
    });

    it('should set microphone enabled state', async () => {
      const { result } = renderHook(() => useHeadsetButtonPTT());

      await result.current.setMicrophoneEnabled(true);

      expect(mockSetMicrophoneEnabled).toHaveBeenCalledWith(true);

      await result.current.setMicrophoneEnabled(false);

      expect(mockSetMicrophoneEnabled).toHaveBeenCalledWith(false);
    });

    it('should update config via updateConfig method', () => {
      const { result } = renderHook(() => useHeadsetButtonPTT());

      const newConfig = { pttMode: 'push_to_talk' as const, soundFeedback: false };
      result.current.updateConfig(newConfig);

      expect(mockSetHeadsetButtonConfig).toHaveBeenCalledWith(newConfig);
      expect(mockedHeadsetButtonService.setConfig).toHaveBeenCalledWith(newConfig);
    });

    it('should simulate button press', () => {
      const { result } = renderHook(() => useHeadsetButtonPTT());

      result.current.simulateButtonPress();

      expect(mockedHeadsetButtonService.simulateButtonPress).toHaveBeenCalledWith('play_pause');
    });
  });

  describe('State Exposure', () => {
    it('should expose correct monitoring state', () => {
      mockedUseBluetoothAudioStore.mockReturnValue({
        isHeadsetButtonMonitoring: true,
        headsetButtonConfig: {
          pttMode: 'toggle',
          soundFeedback: true,
        },
        lastButtonAction: null,
        setHeadsetButtonConfig: mockSetHeadsetButtonConfig,
      } as any);

      const { result } = renderHook(() => useHeadsetButtonPTT());

      expect(result.current.isMonitoring).toBe(true);
    });

    it('should expose correct connection state', () => {
      mockedUseLiveKitStore.mockReturnValue({
        isConnected: true,
        currentRoom: mockRoom,
        toggleMicrophone: mockToggleMicrophone,
        setMicrophoneEnabled: mockSetMicrophoneEnabled,
        startHeadsetButtonMonitoring: mockStartHeadsetButtonMonitoring,
        stopHeadsetButtonMonitoring: mockStopHeadsetButtonMonitoring,
      } as any);

      const { result } = renderHook(() => useHeadsetButtonPTT());

      expect(result.current.isConnected).toBe(true);
    });

    it('should expose correct mute state when room is connected', () => {
      mockedUseLiveKitStore.mockReturnValue({
        isConnected: true,
        currentRoom: {
          localParticipant: {
            isMicrophoneEnabled: false, // Mic disabled = muted
          },
        },
        toggleMicrophone: mockToggleMicrophone,
        setMicrophoneEnabled: mockSetMicrophoneEnabled,
        startHeadsetButtonMonitoring: mockStartHeadsetButtonMonitoring,
        stopHeadsetButtonMonitoring: mockStopHeadsetButtonMonitoring,
      } as any);

      const { result } = renderHook(() => useHeadsetButtonPTT());

      expect(result.current.isMuted).toBe(true);
    });

    it('should expose muted state when room is not connected', () => {
      mockedUseLiveKitStore.mockReturnValue({
        isConnected: false,
        currentRoom: null,
        toggleMicrophone: mockToggleMicrophone,
        setMicrophoneEnabled: mockSetMicrophoneEnabled,
        startHeadsetButtonMonitoring: mockStartHeadsetButtonMonitoring,
        stopHeadsetButtonMonitoring: mockStopHeadsetButtonMonitoring,
      } as any);

      const { result } = renderHook(() => useHeadsetButtonPTT());

      expect(result.current.isMuted).toBe(true);
    });

    it('should expose current config', () => {
      const config = {
        pttMode: 'push' as const,
        soundFeedback: false,
      };

      mockedUseBluetoothAudioStore.mockReturnValue({
        isHeadsetButtonMonitoring: false,
        headsetButtonConfig: config,
        lastButtonAction: null,
        setHeadsetButtonConfig: mockSetHeadsetButtonConfig,
      } as any);

      const { result } = renderHook(() => useHeadsetButtonPTT());

      expect(result.current.config).toEqual(config);
    });

    it('should expose last action', () => {
      const lastAction = { action: 'play_pause', timestamp: Date.now() };

      mockedUseBluetoothAudioStore.mockReturnValue({
        isHeadsetButtonMonitoring: false,
        headsetButtonConfig: {
          pttMode: 'toggle',
          soundFeedback: true,
        },
        lastButtonAction: lastAction,
        setHeadsetButtonConfig: mockSetHeadsetButtonConfig,
      } as any);

      const { result } = renderHook(() => useHeadsetButtonPTT());

      expect(result.current.lastAction).toEqual(lastAction);
    });
  });
});
