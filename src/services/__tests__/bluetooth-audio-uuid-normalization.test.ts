/* eslint-disable @typescript-eslint/no-explicit-any */

// Mock dependencies to prevent import errors
jest.mock('react-native', () => ({
  Platform: { OS: 'android' },
  PermissionsAndroid: {
    PERMISSIONS: {
      BLUETOOTH_SCAN: 'android.permission.BLUETOOTH_SCAN',
      BLUETOOTH_CONNECT: 'android.permission.BLUETOOTH_CONNECT',
    },
    RESULTS: {
      GRANTED: 'granted',
      DENIED: 'denied',
    },
    requestMultiple: jest.fn(),
  },
  DeviceEventEmitter: {
    addListener: jest.fn(),
  },
  Alert: {
    alert: jest.fn(),
  },
}));

jest.mock('react-native-ble-manager', () => ({
  __esModule: true,
  default: {
    start: jest.fn(),
    checkState: jest.fn(),
    scan: jest.fn(),
    stopScan: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn(),
    getConnectedPeripherals: jest.fn(),
    getDiscoveredPeripherals: jest.fn(),
  },
  BleScanCallbackType: {},
  BleScanMatchMode: {},
  BleScanMode: {},
}));

// Mock stores
jest.mock('@/stores/app/bluetooth-audio-store', () => ({
  useBluetoothAudioStore: {
    getState: () => ({
      setIsScanning: jest.fn(),
      addDevice: jest.fn(),
      setState: jest.fn(),
      setConnectedDevice: jest.fn(),
    }),
  },
  State: {
    IDLE: 'idle',
    SCANNING: 'scanning',
    CONNECTING: 'connecting',
    CONNECTED: 'connected',
    DISCONNECTED: 'disconnected',
    ERROR: 'error',
  },
}));

jest.mock('@/stores/app/livekit-store', () => ({
  useLiveKitStore: {
    getState: () => ({
      setIsMuted: jest.fn(),
    }),
  },
}));

jest.mock('@/lib/logging', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@/lib/storage', () => ({
  getItem: jest.fn(),
}));

jest.mock('@/services/audio.service', () => ({
  audioService: {
    playButtonSound: jest.fn(),
  },
}));

import { bluetoothAudioService } from '../bluetooth-audio.service';

describe('BluetoothAudioService UUID Normalization', () => {
  let service: any;

  beforeEach(() => {
    service = bluetoothAudioService as any;
  });

  describe('normalizeUuid', () => {
    it('should normalize 16-bit UUIDs to 128-bit format', () => {
      const result = service.normalizeUuid('110A');
      expect(result).toBe('0000110A-0000-1000-8000-00805F9B34FB');
    });

    it('should normalize lowercase 16-bit UUIDs to uppercase 128-bit format', () => {
      const result = service.normalizeUuid('110a');
      expect(result).toBe('0000110A-0000-1000-8000-00805F9B34FB');
    });

    it('should normalize 32-bit UUIDs to 128-bit format', () => {
      const result = service.normalizeUuid('0000110A');
      expect(result).toBe('0000110A-0000-1000-8000-00805F9B34FB');
    });

    it('should format 128-bit UUIDs without hyphens correctly', () => {
      const result = service.normalizeUuid('0000110A00001000800000805F9B34FB');
      expect(result).toBe('0000110A-0000-1000-8000-00805F9B34FB');
    });

    it('should leave properly formatted 128-bit UUIDs unchanged (uppercase)', () => {
      const input = '0000110A-0000-1000-8000-00805F9B34FB';
      const result = service.normalizeUuid(input);
      expect(result).toBe(input);
    });

    it('should convert lowercase properly formatted UUIDs to uppercase', () => {
      const result = service.normalizeUuid('0000110a-0000-1000-8000-00805f9b34fb');
      expect(result).toBe('0000110A-0000-1000-8000-00805F9B34FB');
    });

    it('should handle UUIDs with mixed case', () => {
      const result = service.normalizeUuid('127fACe1-cb21-11E5-93d0-0002A5d5C51b');
      expect(result).toBe('127FACE1-CB21-11E5-93D0-0002A5D5C51B');
    });

    it('should handle UUIDs with extra spaces or hyphens', () => {
      const result = service.normalizeUuid(' 110A - ');
      expect(result).toBe('0000110A-0000-1000-8000-00805F9B34FB');
    });
  });

  describe('isAudioDevice with UUID normalization', () => {
    it('should detect audio device using 16-bit advertised UUID', () => {
      const device = {
        id: 'test-device',
        name: 'Test Device',
        advertising: {
          serviceUUIDs: ['110A'], // 16-bit A2DP UUID
        },
      };

      const result = service.isAudioDevice(device);
      expect(result).toBe(true);
    });

    it('should detect audio device using mixed 16-bit and 128-bit UUIDs', () => {
      const device = {
        id: 'test-device',
        name: 'Test Device',
        advertising: {
          serviceUUIDs: ['110A', '0000111E-0000-1000-8000-00805F9B34FB'], // Mix of 16-bit A2DP and 128-bit HFP
        },
      };

      const result = service.isAudioDevice(device);
      expect(result).toBe(true);
    });

    it('should not detect non-audio device with random UUIDs', () => {
      const device = {
        id: 'test-device',
        name: 'Test Device',
        advertising: {
          serviceUUIDs: ['1234', '5678'], // Random UUIDs
        },
      };

      const result = service.isAudioDevice(device);
      expect(result).toBe(false);
    });

    it('should detect custom headset device using normalized UUIDs', () => {
      const device = {
        id: 'test-device',
        name: 'AINA Device',
        advertising: {
          serviceUUIDs: ['127FACE1-CB21-11E5-93D0-0002A5D5C51B'], // AINA service UUID
        },
      };

      const result = service.isAudioDevice(device);
      expect(result).toBe(true);
    });
  });

  describe('supportsMicrophoneControl with UUID normalization', () => {
    it('should detect microphone support using 16-bit HFP UUID', () => {
      const device = {
        id: 'test-device',
        name: 'Bluetooth Headset',
        advertising: {
          serviceUUIDs: ['111E'], // 16-bit HFP UUID
        },
      };

      const result = service.supportsMicrophoneControl(device);
      expect(result).toBe(true);
    });

    it('should detect microphone support using 16-bit HSP UUID', () => {
      const device = {
        id: 'test-device',
        name: 'Bluetooth Headset',
        advertising: {
          serviceUUIDs: ['1108'], // 16-bit HSP UUID
        },
      };

      const result = service.supportsMicrophoneControl(device);
      expect(result).toBe(true);
    });

    it('should not detect microphone support for A2DP only device', () => {
      const device = {
        id: 'test-device',
        name: 'Bluetooth Speaker',
        advertising: {
          serviceUUIDs: ['110A'], // 16-bit A2DP UUID only
        },
      };

      const result = service.supportsMicrophoneControl(device);
      expect(result).toBe(false);
    });
  });
});
