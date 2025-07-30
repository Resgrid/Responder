import { Buffer } from 'buffer';
import { Alert, PermissionsAndroid, Platform } from 'react-native';
import { BleError, BleManager, Characteristic, Device, DeviceId, Service, State, Subscription } from 'react-native-ble-plx';

// Mock dependencies first, before any imports
jest.mock('react-native-ble-plx');
jest.mock('@/lib/logging');
jest.mock('@/lib/storage');
jest.mock('@/stores/app/livekit-store', () => ({
  useLiveKitStore: {
    getState: jest.fn(() => ({
      currentRoom: null,
      isMuted: false,
      setMuted: jest.fn(),
    })),
  },
}));

// Mock the store module with a factory function
jest.mock('@/stores/app/bluetooth-audio-store', () => {
  const mockSetPreferredDevice = jest.fn();
  const mockSetBluetoothState = jest.fn();
  const mockAddButtonEvent = jest.fn();
  const mockSetLastButtonAction = jest.fn();
  const mockSetIsScanning = jest.fn();
  const mockClearDevices = jest.fn();
  const mockAddDevice = jest.fn();
  const mockSetConnectedDevice = jest.fn();
  const mockSetIsConnecting = jest.fn();
  const mockSetConnectionError = jest.fn();
  const mockSetAudioRoutingActive = jest.fn();
  const mockClearConnectionError = jest.fn();

  const mockGetState = jest.fn(() => ({
    preferredDevice: null,
    connectedDevice: null,
    setPreferredDevice: mockSetPreferredDevice,
    setBluetoothState: mockSetBluetoothState,
    addButtonEvent: mockAddButtonEvent,
    setLastButtonAction: mockSetLastButtonAction,
    setIsScanning: mockSetIsScanning,
    clearDevices: mockClearDevices,
    addDevice: mockAddDevice,
    setConnectedDevice: mockSetConnectedDevice,
    setIsConnecting: mockSetIsConnecting,
    setConnectionError: mockSetConnectionError,
    setAudioRoutingActive: mockSetAudioRoutingActive,
    clearConnectionError: mockClearConnectionError,
  }));

  return {
    useBluetoothAudioStore: {
      getState: mockGetState,
    },
    // Export the mocks so we can access them in tests
    __mocks: {
      mockSetPreferredDevice,
      mockSetBluetoothState,
      mockAddButtonEvent,
      mockSetLastButtonAction,
      mockSetIsScanning,
      mockClearDevices,
      mockAddDevice,
      mockSetConnectedDevice,
      mockSetIsConnecting,
      mockSetConnectionError,
      mockSetAudioRoutingActive,
      mockClearConnectionError,
      mockGetState,
    },
  };
});

// Import service after mocks are set up
import { bluetoothAudioService } from '../bluetooth-audio.service';
import { useBluetoothAudioStore } from '@/stores/app/bluetooth-audio-store';

// Get the mocks from the module
const { __mocks } = require('@/stores/app/bluetooth-audio-store');
const {
  mockSetPreferredDevice,
  mockSetBluetoothState,
  mockAddButtonEvent,
  mockSetLastButtonAction,
  mockSetIsScanning,
  mockClearDevices,
  mockAddDevice,
  mockSetConnectedDevice,
  mockSetIsConnecting,
  mockSetConnectionError,
  mockSetAudioRoutingActive,
  mockClearConnectionError,
  mockGetState,
} = __mocks;

const mockBleManager = BleManager as jest.MockedClass<typeof BleManager>;

describe('BluetoothAudioService - HYS Headset', () => {
  let mockDevice: jest.Mocked<Device>;
  let mockService: jest.Mocked<Service>;
  let mockCharacteristic: jest.Mocked<Characteristic>;

    beforeEach(() => {
      jest.clearAllMocks();

      // Reset mock functions
      mockSetPreferredDevice.mockClear();
      mockSetBluetoothState.mockClear();
      mockAddButtonEvent.mockClear();
      mockSetLastButtonAction.mockClear();
      mockSetIsScanning.mockClear();
      mockClearDevices.mockClear();
      mockAddDevice.mockClear();
      mockSetConnectedDevice.mockClear();
      mockSetIsConnecting.mockClear();
      mockSetConnectionError.mockClear();
      mockSetAudioRoutingActive.mockClear();
      mockClearConnectionError.mockClear();

      // Mock characteristic
      mockCharacteristic = {
        uuid: '6E400003-B5A3-F393-E0A9-E50E24DCCA9E',
        isNotifiable: true,
        isIndicatable: false,
        monitor: jest.fn().mockReturnValue({ remove: jest.fn() }),
        value: null,
      } as any;

      // Mock service
      mockService = {
        uuid: '6E400001-B5A3-F393-E0A9-E50E24DCCA9E',
        characteristics: jest.fn().mockResolvedValue([mockCharacteristic]),
      } as any;

      // Mock device
      mockDevice = {
        id: 'hys-test-device',
        name: 'HYS Test Headset',
        rssi: -50,
        serviceUUIDs: ['6E400001-B5A3-F393-E0A9-E50E24DCCA9E'],
        isConnected: jest.fn().mockResolvedValue(true),
        connect: jest.fn().mockResolvedValue(mockDevice),
        cancelConnection: jest.fn().mockResolvedValue(undefined),
        discoverAllServicesAndCharacteristics: jest.fn().mockResolvedValue(mockDevice),
        services: jest.fn().mockResolvedValue([mockService]),
        onDisconnected: jest.fn(),
      } as any;
    });  describe('HYS Device Detection', () => {
    it('should detect HYS headset by service UUID', () => {
      const service = bluetoothAudioService as any;
      
      const hysDevice = {
        ...mockDevice,
        serviceUUIDs: ['6E400001-B5A3-F393-E0A9-E50E24DCCA9E'],
      };

      const result = service.isAudioDevice(hysDevice);
      expect(result).toBe(true);
    });

    it('should detect HYS headset by name keyword', () => {
      const service = bluetoothAudioService as any;
      
      const hysDevice = {
        ...mockDevice,
        name: 'HYS Bluetooth Headset',
        serviceUUIDs: [],
      };

      const result = service.isAudioDevice(hysDevice);
      expect(result).toBe(true);
    });
  });

  describe('HYS Button Event Parsing', () => {
    it('should parse PTT start button event', () => {
      const service = bluetoothAudioService as any;
      const buffer = Buffer.from([0x01]);
      
      const result = service.parseHYSButtonData(buffer);
      
      expect(result).toEqual({
        type: 'press',
        button: 'ptt_start',
        timestamp: expect.any(Number),
      });
    });

    it('should parse PTT stop button event', () => {
      const service = bluetoothAudioService as any;
      const buffer = Buffer.from([0x00]);
      
      const result = service.parseHYSButtonData(buffer);
      
      expect(result).toEqual({
        type: 'press',
        button: 'ptt_stop',
        timestamp: expect.any(Number),
      });
    });

    it('should parse mute button event', () => {
      const service = bluetoothAudioService as any;
      const buffer = Buffer.from([0x02]);
      
      const result = service.parseHYSButtonData(buffer);
      
      expect(result).toEqual({
        type: 'press',
        button: 'mute',
        timestamp: expect.any(Number),
      });
    });

    it('should parse volume up button event', () => {
      const service = bluetoothAudioService as any;
      const buffer = Buffer.from([0x03]);
      
      const result = service.parseHYSButtonData(buffer);
      
      expect(result).toEqual({
        type: 'press',
        button: 'volume_up',
        timestamp: expect.any(Number),
      });
    });

    it('should parse volume down button event', () => {
      const service = bluetoothAudioService as any;
      const buffer = Buffer.from([0x04]);
      
      const result = service.parseHYSButtonData(buffer);
      
      expect(result).toEqual({
        type: 'press',
        button: 'volume_down',
        timestamp: expect.any(Number),
      });
    });

    it('should parse long press event', () => {
      const service = bluetoothAudioService as any;
      const buffer = Buffer.from([0x01, 0x01]); // PTT start with long press indicator
      
      const result = service.parseHYSButtonData(buffer);
      
      expect(result).toEqual({
        type: 'long_press',
        button: 'ptt_start',
        timestamp: expect.any(Number),
      });
    });

    it('should parse double press event', () => {
      const service = bluetoothAudioService as any;
      const buffer = Buffer.from([0x02, 0x02]); // Mute with double press indicator
      
      const result = service.parseHYSButtonData(buffer);
      
      expect(result).toEqual({
        type: 'double_press',
        button: 'mute',
        timestamp: expect.any(Number),
      });
    });

    it('should handle unknown button codes', () => {
      const service = bluetoothAudioService as any;
      const buffer = Buffer.from([0xFF]); // Unknown button code
      
      const result = service.parseHYSButtonData(buffer);
      
      expect(result).toEqual({
        type: 'press',
        button: 'unknown',
        timestamp: expect.any(Number),
      });
    });

    it('should handle empty buffer', () => {
      const service = bluetoothAudioService as any;
      const buffer = Buffer.from([]);
      
      const result = service.parseHYSButtonData(buffer);
      
      expect(result).toBeNull();
    });
  });

  describe('HYS Button Monitoring Setup', () => {
    it('should successfully set up HYS button monitoring', async () => {
      const service = bluetoothAudioService as any;
      
      // Test the actual UUIDs to ensure they match
      expect(mockService.uuid.toUpperCase()).toBe('6E400001-B5A3-F393-E0A9-E50E24DCCA9E');
      expect(mockCharacteristic.uuid.toUpperCase()).toBe('6E400003-B5A3-F393-E0A9-E50E24DCCA9E');
      expect(mockCharacteristic.isNotifiable).toBe(true);
      
      const result = await service.setupHYSButtonMonitoring(mockDevice, [mockService]);
      
      expect(result).toBe(true);
      expect(mockService.characteristics).toHaveBeenCalled();
      expect(mockCharacteristic.monitor).toHaveBeenCalled();
    });

    it('should fail when HYS service is not found', async () => {
      const service = bluetoothAudioService as any;
      const nonHysService = {
        ...mockService,
        uuid: 'different-service-uuid',
      };
      
      const result = await service.setupHYSButtonMonitoring(mockDevice, [nonHysService]);
      
      expect(result).toBe(false);
    });

    it('should fail when button characteristic is not found', async () => {
      const service = bluetoothAudioService as any;
      const nonButtonChar = {
        ...mockCharacteristic,
        uuid: 'different-char-uuid',
      };
      
      mockService.characteristics.mockResolvedValue([nonButtonChar]);
      
      const result = await service.setupHYSButtonMonitoring(mockDevice, [mockService]);
      
      expect(result).toBe(false);
    });

    it('should fail when characteristic is not notifiable', async () => {
      const service = bluetoothAudioService as any;
      const nonNotifiableChar = {
        ...mockCharacteristic,
        isNotifiable: false,
        isIndicatable: false,
      };
      
      mockService.characteristics.mockResolvedValue([nonNotifiableChar]);
      
      const result = await service.setupHYSButtonMonitoring(mockDevice, [mockService]);
      
      expect(result).toBe(false);
    });
  });

  describe('HYS Button Event Handling', () => {
    it('should handle HYS button events and process them', () => {
      const service = bluetoothAudioService as any;
      const base64Data = Buffer.from([0x01]).toString('base64'); // PTT start
      
      service.handleHYSButtonEvent(base64Data);
      
      expect(mockAddButtonEvent).toHaveBeenCalledWith({
        type: 'press',
        button: 'ptt_start',
        timestamp: expect.any(Number),
      });
    });

    it('should handle invalid base64 data gracefully', () => {
      const service = bluetoothAudioService as any;
      const invalidData = 'invalid-base64-data';
      
      // Should not throw
      expect(() => service.handleHYSButtonEvent(invalidData)).not.toThrow();
    });
  });
});
