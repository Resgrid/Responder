import { BluetoothAudioService } from '../bluetooth-audio.service';
import { useBluetoothAudioStore } from '../../stores/app/bluetooth-audio-store';
import { removeItem } from '../../lib/storage';

// Mock dependencies
jest.mock('../../lib/logging', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../../lib/storage', () => ({
  getItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock('../../stores/app/bluetooth-audio-store', () => ({
  useBluetoothAudioStore: {
    getState: jest.fn(),
  },
  State: {
    PoweredOn: 'poweredOn',
    PoweredOff: 'poweredOff',
  },
}));

jest.mock('../../stores/app/livekit-store', () => ({
  useLiveKitStore: {
    getState: jest.fn(),
  },
}));

jest.mock('react-native-ble-manager', () => ({
  start: jest.fn(),
  checkState: jest.fn(),
  onDidUpdateState: jest.fn(),
  onDisconnectPeripheral: jest.fn(),
  onDiscoverPeripheral: jest.fn(),
  onDidUpdateValueForCharacteristic: jest.fn(),
  onStopScan: jest.fn(),
  scan: jest.fn(),
  connect: jest.fn(),
  disconnect: jest.fn(),
}));

describe('BluetoothAudioService - forgetPreferredDevice', () => {
  let service: BluetoothAudioService;
  let mockStore: any;

  beforeEach(() => {
    jest.clearAllMocks();
    service = BluetoothAudioService.getInstance();
    
    // Setup mock store state
    mockStore = {
      preferredDevice: { id: 'test-device-id', name: 'Test Device' },
      connectedDevice: { id: 'test-device-id', name: 'Test Device' },
      selectedAudioDevices: {
        microphone: { id: 'test-device-id', name: 'Test Device', type: 'bluetooth' },
        speaker: { id: 'test-device-id', name: 'Test Device', type: 'bluetooth' },
      },
      setPreferredDevice: jest.fn(),
      setConnectedDevice: jest.fn(),
      setSelectedMicrophone: jest.fn(),
      setSelectedSpeaker: jest.fn(),
      updateDevice: jest.fn(),
      availableDevices: [],
    };
    
    (useBluetoothAudioStore.getState as jest.Mock).mockReturnValue(mockStore);
  });

  it('should remove preferred device from storage', async () => {
    await service.forgetPreferredDevice('test-device-id');
    expect(removeItem).toHaveBeenCalledWith('preferredBluetoothDevice');
  });

  it('should clear preferred device from store', async () => {
    await service.forgetPreferredDevice('test-device-id');
    expect(mockStore.setPreferredDevice).toHaveBeenCalledWith(null);
  });

  it('should not clear preferred device from store if IDs do not match', async () => {
    mockStore.preferredDevice = { id: 'other-device-id', name: 'Other Device' };
    await service.forgetPreferredDevice('test-device-id');
    expect(mockStore.setPreferredDevice).not.toHaveBeenCalled();
  });

  it('should reset microphone if it was the forgotten device', async () => {
    await service.forgetPreferredDevice('test-device-id');
    expect(mockStore.setSelectedMicrophone).toHaveBeenCalledWith({
      id: 'default-mic',
      name: 'Default Microphone',
      type: 'default',
      isAvailable: true
    });
  });

  it('should reset speaker if it was the forgotten device', async () => {
    await service.forgetPreferredDevice('test-device-id');
    expect(mockStore.setSelectedSpeaker).toHaveBeenCalledWith({
      id: 'default-speaker',
      name: 'Default Speaker',
      type: 'speaker',
      isAvailable: true
    });
  });

  it('should not reset microphone if it was NOT the forgotten device', async () => {
    mockStore.selectedAudioDevices.microphone = { id: 'other-mic', name: 'Other Mic', type: 'wired' };
    await service.forgetPreferredDevice('test-device-id');
    expect(mockStore.setSelectedMicrophone).not.toHaveBeenCalled();
  });
});
