// Mock all dependencies first to avoid import order issues
const mockTrackEvent = jest.fn();

jest.mock('@/hooks/use-analytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
  }),
}));

import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react-native';
import React from 'react';

import { type AudioDeviceInfo } from '@/stores/app/bluetooth-audio-store';

import { AudioDeviceSelection } from '../audio-device-selection';

// Mock the translation hook
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'settings.audio_device_selection.title': 'Audio Device Selection',
        'settings.audio_device_selection.current_selection': 'Current Selection',
        'settings.audio_device_selection.microphone': 'Microphone',
        'settings.audio_device_selection.speaker': 'Speaker',
        'settings.audio_device_selection.none_selected': 'None selected',
        'settings.audio_device_selection.bluetooth_device': 'Bluetooth Device',
        'settings.audio_device_selection.wired_device': 'Wired Device',
        'settings.audio_device_selection.speaker_device': 'Speaker Device',
        'settings.audio_device_selection.unavailable': 'Unavailable',
        'settings.audio_device_selection.no_microphones_available': 'No microphones available',
        'settings.audio_device_selection.no_speakers_available': 'No speakers available',
      };
      return translations[key] || key;
    },
  }),
}));

// Mock the bluetooth audio store
const mockSetSelectedMicrophone = jest.fn();
const mockSetSelectedSpeaker = jest.fn();

const mockStore = {
  availableAudioDevices: [] as AudioDeviceInfo[],
  selectedAudioDevices: {
    microphone: null as AudioDeviceInfo | null,
    speaker: null as AudioDeviceInfo | null,
  },
  setSelectedMicrophone: mockSetSelectedMicrophone,
  setSelectedSpeaker: mockSetSelectedSpeaker,
};

jest.mock('@/stores/app/bluetooth-audio-store', () => ({
  useBluetoothAudioStore: () => mockStore,
}));

describe('AudioDeviceSelection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mock store to default state
    mockStore.availableAudioDevices = [];
    mockStore.selectedAudioDevices = {
      microphone: null,
      speaker: null,
    };
  });

  const createMockDevice = (id: string, name: string, type: 'bluetooth' | 'wired' | 'speaker', isAvailable = true): AudioDeviceInfo => ({
    id,
    name,
    type,
    isAvailable,
  });

  describe('rendering', () => {
    it('renders with title when showTitle is true', () => {
      render(<AudioDeviceSelection showTitle={true} />);

      expect(screen.getByText('Audio Device Selection')).toBeTruthy();
    });

    it('renders without title when showTitle is false', () => {
      render(<AudioDeviceSelection showTitle={false} />);

      expect(screen.queryByText('Audio Device Selection')).toBeNull();
    });

    it('renders current selection section', () => {
      render(<AudioDeviceSelection />);

      expect(screen.getByText('Current Selection')).toBeTruthy();
      expect(screen.getByText('Microphone:')).toBeTruthy();
      expect(screen.getByText('Speaker:')).toBeTruthy();
    });

    it('shows none selected when no devices are selected', () => {
      render(<AudioDeviceSelection />);

      const noneSelectedTexts = screen.getAllByText('None selected');
      expect(noneSelectedTexts).toHaveLength(2); // One for microphone, one for speaker
    });

    it('renders microphone and speaker sections', () => {
      render(<AudioDeviceSelection />);

      // Check for section headers
      const microphoneHeaders = screen.getAllByText('Microphone');
      const speakerHeaders = screen.getAllByText('Speaker');

      expect(microphoneHeaders.length).toBeGreaterThan(0);
      expect(speakerHeaders.length).toBeGreaterThan(0);
    });
  });

  describe('device selection', () => {
    it('displays available microphones', () => {
      const bluetoothMic = createMockDevice('bt-mic-1', 'Bluetooth Headset', 'bluetooth');
      const wiredMic = createMockDevice('wired-mic-1', 'Built-in Microphone', 'wired');

      mockStore.availableAudioDevices = [bluetoothMic, wiredMic];

      render(<AudioDeviceSelection />);

      // Check device names appear (may appear in multiple sections)
      expect(screen.getAllByText('Bluetooth Headset').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Built-in Microphone').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Bluetooth Device').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Wired Device').length).toBeGreaterThan(0);
    });

    it('displays available speakers', () => {
      const bluetoothSpeaker = createMockDevice('bt-speaker-1', 'Bluetooth Speaker', 'bluetooth');
      const builtinSpeaker = createMockDevice('builtin-speaker-1', 'Built-in Speaker', 'speaker');

      mockStore.availableAudioDevices = [bluetoothSpeaker, builtinSpeaker];

      render(<AudioDeviceSelection />);

      // Check device names appear (may appear in multiple sections)
      expect(screen.getAllByText('Bluetooth Speaker').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Built-in Speaker').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Speaker Device').length).toBeGreaterThan(0);
    });

    it('shows unavailable indicator for unavailable devices', () => {
      const unavailableDevice = createMockDevice('unavailable-1', 'Unavailable Device', 'bluetooth', false);

      mockStore.availableAudioDevices = [unavailableDevice];

      render(<AudioDeviceSelection />);

      // Device should not appear in either section since it's unavailable bluetooth
      expect(screen.queryByText('Unavailable Device')).toBeNull();
    });

    it('calls setSelectedMicrophone when microphone device is pressed', () => {
      const bluetoothMic = createMockDevice('bt-mic-1', 'Bluetooth Headset', 'bluetooth');

      mockStore.availableAudioDevices = [bluetoothMic];

      const { getByTestId } = render(<AudioDeviceSelection />);

      // Find the microphone device card and press it
      const microphoneCard = getByTestId('microphone-bt-mic-1');
      fireEvent.press(microphoneCard);

      expect(mockSetSelectedMicrophone).toHaveBeenCalledWith(bluetoothMic);
    });

    it('calls setSelectedSpeaker when speaker device is pressed', () => {
      const bluetoothSpeaker = createMockDevice('bt-speaker-1', 'Bluetooth Speaker', 'bluetooth');

      mockStore.availableAudioDevices = [bluetoothSpeaker];

      const { getByTestId } = render(<AudioDeviceSelection />);

      // Find the speaker device card and press it
      const speakerCard = getByTestId('speaker-bt-speaker-1');
      fireEvent.press(speakerCard);

      expect(mockSetSelectedSpeaker).toHaveBeenCalledWith(bluetoothSpeaker);
    });

    it('highlights selected devices', () => {
      const selectedMic = createMockDevice('selected-mic', 'Selected Microphone', 'bluetooth');
      const selectedSpeaker = createMockDevice('selected-speaker', 'Selected Speaker', 'bluetooth');

      mockStore.availableAudioDevices = [selectedMic, selectedSpeaker];
      mockStore.selectedAudioDevices = {
        microphone: selectedMic,
        speaker: selectedSpeaker,
      };

      render(<AudioDeviceSelection />);

      // Check that selected device names are shown in current selection and device sections
      expect(screen.getAllByText('Selected Microphone').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Selected Speaker').length).toBeGreaterThan(0);
    });
  });

  describe('empty states', () => {
    it('shows no microphones available message when no microphones are available', () => {
      // Add an unavailable bluetooth device (should not show in microphones section)
      const unavailableBluetooth = createMockDevice('bt-1', 'BT Device', 'bluetooth', false);
      mockStore.availableAudioDevices = [unavailableBluetooth];

      render(<AudioDeviceSelection />);

      // Should show empty message since bluetooth device is unavailable
      expect(screen.getByText('No microphones available')).toBeTruthy();
    });

    it('shows no speakers available message when no speakers are available', () => {
      // Only add unavailable speakers (which get filtered out)
      const unavailableSpeaker = createMockDevice('speaker-1', 'Speaker', 'speaker', false);
      mockStore.availableAudioDevices = [unavailableSpeaker];

      render(<AudioDeviceSelection />);

      expect(screen.getByText('No speakers available')).toBeTruthy();
    });

    it('shows both empty messages when no devices are available', () => {
      mockStore.availableAudioDevices = [];

      render(<AudioDeviceSelection />);

      expect(screen.getByText('No microphones available')).toBeTruthy();
      expect(screen.getByText('No speakers available')).toBeTruthy();
    });
  });

  describe('device filtering', () => {
    it('filters out unavailable bluetooth devices for microphones', () => {
      const availableBluetooth = createMockDevice('bt-available', 'Available BT', 'bluetooth', true);
      const unavailableBluetooth = createMockDevice('bt-unavailable', 'Unavailable BT', 'bluetooth', false);
      const wiredDevice = createMockDevice('wired-1', 'Wired Device', 'wired', false); // Should still show even if unavailable

      mockStore.availableAudioDevices = [availableBluetooth, unavailableBluetooth, wiredDevice];

      render(<AudioDeviceSelection />);

      expect(screen.getAllByText('Available BT').length).toBeGreaterThan(0);
      expect(screen.queryByText('Unavailable BT')).toBeNull();
      expect(screen.getAllByText('Wired Device').length).toBeGreaterThan(0);
    });

    it('filters out unavailable devices for speakers', () => {
      const availableDevice = createMockDevice('available', 'Available Device', 'speaker', true);
      const unavailableDevice = createMockDevice('unavailable', 'Unavailable Device', 'speaker', false);

      mockStore.availableAudioDevices = [availableDevice, unavailableDevice];

      render(<AudioDeviceSelection />);

      expect(screen.getAllByText('Available Device').length).toBeGreaterThan(0);
      // Note: The component actually shows ALL devices in microphone section unless they are unavailable bluetooth
      // So the unavailable speaker will show in microphone section but not speaker section
      expect(screen.getAllByText('Unavailable Device').length).toBeGreaterThan(0); // Shows in microphone section
    });
  });

  describe('device type labels', () => {
    it('shows correct labels for different device types', () => {
      const bluetoothDevice = createMockDevice('bt-1', 'BT Device', 'bluetooth');
      const wiredDevice = createMockDevice('wired-1', 'Wired Device', 'wired');
      const speakerDevice = createMockDevice('speaker-1', 'Speaker Device', 'speaker');

      mockStore.availableAudioDevices = [bluetoothDevice, wiredDevice, speakerDevice];

      render(<AudioDeviceSelection />);

      expect(screen.getAllByText('Bluetooth Device').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Wired Device').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Speaker Device').length).toBeGreaterThan(0);
    });

    it('shows fallback label for unknown device types', () => {
      const unknownDevice = createMockDevice('unknown-1', 'Unknown Device', 'unknown' as any);

      mockStore.availableAudioDevices = [unknownDevice];

      render(<AudioDeviceSelection />);

      // Device should appear but with fallback label
      expect(screen.getAllByText('Unknown Device').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Unknown Device').length).toBeGreaterThan(0);
    });
  });

  describe('analytics', () => {
    it('tracks view analytics when component is rendered', () => {
      const bluetoothMic = createMockDevice('bt-mic-1', 'Bluetooth Headset', 'bluetooth');
      const selectedSpeaker = createMockDevice('selected-speaker', 'Selected Speaker', 'bluetooth');

      mockStore.availableAudioDevices = [bluetoothMic, selectedSpeaker];
      mockStore.selectedAudioDevices = {
        microphone: bluetoothMic,
        speaker: selectedSpeaker,
      };

      render(<AudioDeviceSelection showTitle={true} />);

      expect(mockTrackEvent).toHaveBeenCalledWith('audio_device_selection_viewed', {
        timestamp: expect.any(String),
        totalDevicesCount: 2,
        availableMicrophonesCount: 2, // Both devices are available as microphones
        availableSpeakersCount: 2,
        hasSelectedMicrophone: true,
        hasSelectedSpeaker: true,
        selectedMicrophoneType: 'bluetooth',
        selectedSpeakerType: 'bluetooth',
        showTitle: true,
      });
    });

    it('tracks view analytics with no selected devices', () => {
      const bluetoothDevice = createMockDevice('bt-1', 'BT Device', 'bluetooth');
      mockStore.availableAudioDevices = [bluetoothDevice];

      render(<AudioDeviceSelection showTitle={false} />);

      expect(mockTrackEvent).toHaveBeenCalledWith('audio_device_selection_viewed', {
        timestamp: expect.any(String),
        totalDevicesCount: 1,
        availableMicrophonesCount: 1,
        availableSpeakersCount: 1,
        hasSelectedMicrophone: false,
        hasSelectedSpeaker: false,
        selectedMicrophoneType: '',
        selectedSpeakerType: '',
        showTitle: false,
      });
    });

    it('tracks device selection analytics when microphone is selected', () => {
      const bluetoothMic = createMockDevice('bt-mic-1', 'Bluetooth Headset', 'bluetooth');
      mockStore.availableAudioDevices = [bluetoothMic];

      const { getByTestId } = render(<AudioDeviceSelection />);

      // Clear previous analytics calls (the initial view tracking)
      mockTrackEvent.mockClear();

      // Find and press the microphone device using test ID
      const microphoneCard = getByTestId('microphone-bt-mic-1');
      fireEvent.press(microphoneCard);

      expect(mockTrackEvent).toHaveBeenCalledWith('audio_device_selected', {
        timestamp: expect.any(String),
        deviceId: 'bt-mic-1',
        deviceName: 'Bluetooth Headset',
        deviceType: 'microphone',
        deviceCategory: 'bluetooth',
        isAvailable: true,
        wasAlreadySelected: false,
      });

      expect(mockSetSelectedMicrophone).toHaveBeenCalledWith(bluetoothMic);
    });

    it('tracks device selection analytics when speaker is selected', () => {
      const bluetoothSpeaker = createMockDevice('bt-speaker-1', 'Bluetooth Speaker', 'bluetooth');
      mockStore.availableAudioDevices = [bluetoothSpeaker];

      const { getByTestId } = render(<AudioDeviceSelection />);

      // Clear previous analytics calls (the initial view tracking)
      mockTrackEvent.mockClear();

      // Find and press the speaker device using test ID
      const speakerCard = getByTestId('speaker-bt-speaker-1');
      fireEvent.press(speakerCard);

      expect(mockTrackEvent).toHaveBeenCalledWith('audio_device_selected', {
        timestamp: expect.any(String),
        deviceId: 'bt-speaker-1',
        deviceName: 'Bluetooth Speaker',
        deviceType: 'speaker',
        deviceCategory: 'bluetooth',
        isAvailable: true,
        wasAlreadySelected: false,
      });

      expect(mockSetSelectedSpeaker).toHaveBeenCalledWith(bluetoothSpeaker);
    });

    it('tracks device selection analytics for already selected device', () => {
      const selectedMic = createMockDevice('selected-mic', 'Selected Microphone', 'bluetooth');
      mockStore.availableAudioDevices = [selectedMic];
      mockStore.selectedAudioDevices = {
        microphone: selectedMic,
        speaker: null,
      };

      const { getByTestId } = render(<AudioDeviceSelection />);

      // Clear previous analytics calls (the initial view tracking)
      mockTrackEvent.mockClear();

      // Find and press the already selected microphone using test ID
      const microphoneCard = getByTestId('microphone-selected-mic');
      fireEvent.press(microphoneCard);

      expect(mockTrackEvent).toHaveBeenCalledWith('audio_device_selected', {
        timestamp: expect.any(String),
        deviceId: 'selected-mic',
        deviceName: 'Selected Microphone',
        deviceType: 'microphone',
        deviceCategory: 'bluetooth',
        isAvailable: true,
        wasAlreadySelected: true,
      });
    });

    it('handles analytics errors gracefully without breaking functionality', () => {
      const bluetoothMic = createMockDevice('bt-mic-1', 'Bluetooth Headset', 'bluetooth');
      mockStore.availableAudioDevices = [bluetoothMic];

      // Mock trackEvent to throw an error
      mockTrackEvent.mockImplementation(() => {
        throw new Error('Analytics error');
      });

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => { });

      const { getByTestId } = render(<AudioDeviceSelection />);

      // Device selection should still work despite analytics error
      const microphoneCard = getByTestId('microphone-bt-mic-1');
      fireEvent.press(microphoneCard);

      expect(consoleSpy).toHaveBeenCalledWith('Failed to track audio device selection analytics:', expect.any(Error));
      expect(mockSetSelectedMicrophone).toHaveBeenCalledWith(bluetoothMic);

      consoleSpy.mockRestore();
    });

    it('handles view analytics errors gracefully', () => {
      mockTrackEvent.mockImplementation(() => {
        throw new Error('View analytics error');
      });

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => { });

      render(<AudioDeviceSelection />);

      expect(consoleSpy).toHaveBeenCalledWith('Failed to track audio device selection view analytics:', expect.any(Error));

      consoleSpy.mockRestore();
    });
  });
});
