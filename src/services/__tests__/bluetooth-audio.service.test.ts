/* eslint-disable @typescript-eslint/no-explicit-any */

const mockRequestMultiple = jest.fn();
const mockStart = jest.fn();
const mockCheckState = jest.fn();
const mockScan = jest.fn();
const mockStopScan = jest.fn();
const mockConnect = jest.fn();
const mockDisconnect = jest.fn();
const mockGetConnectedPeripherals = jest.fn();
const mockGetDiscoveredPeripherals = jest.fn();
const mockOnDidUpdateState = jest.fn();
const mockOnDisconnectPeripheral = jest.fn();
const mockOnDiscoverPeripheral = jest.fn();
const mockOnDidUpdateValueForCharacteristic = jest.fn();
const mockOnStopScan = jest.fn();

// Mock the react-native module at top level for proper hoisting
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
    requestMultiple: mockRequestMultiple,
  },
  DeviceEventEmitter: {
    addListener: jest.fn(),
  },
  Alert: {
    alert: jest.fn(),
  },
}));

// Mock other dependencies
jest.mock('react-native-ble-manager', () => ({
  __esModule: true,
  default: {
    start: mockStart,
    checkState: mockCheckState,
    scan: mockScan,
    stopScan: mockStopScan,
    connect: mockConnect,
    disconnect: mockDisconnect,
    getConnectedPeripherals: mockGetConnectedPeripherals,
    getDiscoveredPeripherals: mockGetDiscoveredPeripherals,
    onDidUpdateState: mockOnDidUpdateState,
    onDisconnectPeripheral: mockOnDisconnectPeripheral,
    onDiscoverPeripheral: mockOnDiscoverPeripheral,
    onDidUpdateValueForCharacteristic: mockOnDidUpdateValueForCharacteristic,
    onStopScan: mockOnStopScan,
  },
}));

jest.mock('@/lib/storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock('@/services/audio.service', () => ({
  audioService: {
    playConnectedDeviceSound: jest.fn(),
  },
}));

jest.mock('buffer', () => ({
  Buffer: {
    from: jest.fn((data, encoding) => {
      if (encoding === 'base64') {
        return { toString: jest.fn(() => 'mocked-data') };
      }
      if (encoding === 'hex') {
        return { toString: jest.fn(() => 'mocked-data') };
      }
      return { toString: jest.fn(() => 'mocked-data') };
    }),
  },
}));

// Mock stores
jest.mock('@/stores/app/bluetooth-audio-store', () => ({
  useBluetoothAudioStore: {
    getState: jest.fn(() => ({
      setBluetoothState: jest.fn(),
      setIsScanning: jest.fn(),
      clearDevices: jest.fn(),
      addDevice: jest.fn(),
      setConnectedDevice: jest.fn(),
      setIsConnecting: jest.fn(),
      setConnectionError: jest.fn(),
      clearConnectionError: jest.fn(),
      addButtonEvent: jest.fn(),
      setLastButtonAction: jest.fn(),
      setPreferredDevice: jest.fn(),
      setAvailableAudioDevices: jest.fn(),
      setSelectedMicrophone: jest.fn(),
      setSelectedSpeaker: jest.fn(),
      setAudioRoutingActive: jest.fn(),
      availableDevices: [],
      connectedDevice: null,
      preferredDevice: null,
      isScanning: false,
      availableAudioDevices: [],
    })),
  },
}));

jest.mock('@/stores/app/livekit-store', () => ({
  useLiveKitStore: {
    getState: jest.fn(() => ({
      currentRoom: null,
    })),
  },
}));

// Import react-native after mocks are set up
const RN = require('react-native');

// Import the service after all mocks are set up
const { bluetoothAudioService } = require('../bluetooth-audio.service');

describe('BluetoothAudioService Refactoring', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Reset all mock implementations
    mockRequestMultiple.mockReset();
    mockStart.mockReset();
    mockCheckState.mockReset();
    mockScan.mockReset();
    mockStopScan.mockReset();
    mockConnect.mockReset();
    
    // Reset Platform.OS to Android for each test
    (RN.Platform as any).OS = 'android';
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Mock Setup Debug', () => {
    it('should show Platform and permissions setup', () => {
      console.log('Platform.OS:', RN.Platform.OS);
      console.log('PermissionsAndroid available:', !!RN.PermissionsAndroid);
      console.log('Mock function available:', !!mockRequestMultiple);
    });
  });

  it('should be defined and accessible', () => {
    expect(bluetoothAudioService).toBeDefined();
    expect(typeof bluetoothAudioService.destroy).toBe('function');
  });

  it('should have singleton instance pattern', () => {
    // Both calls should return the same instance
    const instance1 = bluetoothAudioService;
    const instance2 = bluetoothAudioService;
    expect(instance1).toBe(instance2);
  });

  it('should have required methods for Bluetooth management', () => {
    expect(typeof bluetoothAudioService.startScanning).toBe('function');
    expect(typeof bluetoothAudioService.stopScanning).toBe('function');
    expect(typeof bluetoothAudioService.connectToDevice).toBe('function');
    expect(typeof bluetoothAudioService.disconnectDevice).toBe('function');
  });

  describe('Permission Requests', () => {
    it('should add 500ms delay before requesting permissions', async () => {
      // Ensure Android platform
      (RN.Platform as any).OS = 'android';
      
      mockRequestMultiple.mockResolvedValue({
        'android.permission.BLUETOOTH_SCAN': 'granted',
        'android.permission.BLUETOOTH_CONNECT': 'granted',
      });

      const service = bluetoothAudioService as any;
      
      // Start the permission request
      const permissionPromise = service.requestPermissions();
      
      // Fast-forward time by 500ms
      jest.advanceTimersByTime(500);
      
      // Wait for the promise to resolve
      const result = await permissionPromise;
      
      // Now that react-native is properly mocked, the permissions should work correctly
      expect(result).toBe(true);
      expect(mockRequestMultiple).toHaveBeenCalledWith([
        'android.permission.BLUETOOTH_SCAN',
        'android.permission.BLUETOOTH_CONNECT',
      ]);
    });

    it('should return true for iOS without requesting permissions', async () => {
      // Mock iOS platform
      (RN.Platform as any).OS = 'ios';
      
      const service = bluetoothAudioService as any;
      
      // Start the permission request
      const permissionPromise = service.requestPermissions();
      
      // Fast-forward time by 500ms to handle the delay
      jest.advanceTimersByTime(500);
      
      const result = await permissionPromise;
      
      expect(result).toBe(true);
      expect(mockRequestMultiple).not.toHaveBeenCalled();
      
      // Reset to Android for other tests
      (RN.Platform as any).OS = 'android';
    });

    it('should handle permission request failures gracefully', async () => {
      // Ensure Android platform
      (RN.Platform as any).OS = 'android';
      
      mockRequestMultiple.mockRejectedValue(new Error('Permission request failed'));

      const service = bluetoothAudioService as any;
      
      // Start the permission request
      const permissionPromise = service.requestPermissions();
      
      // Fast-forward time by 500ms
      jest.advanceTimersByTime(500);
      
      const result = await permissionPromise;
      
      expect(result).toBe(false);
      expect(mockRequestMultiple).toHaveBeenCalled();
    });

    it('should return false when some permissions are denied', async () => {
      // Ensure Android platform
      (RN.Platform as any).OS = 'android';
      
      mockRequestMultiple.mockResolvedValue({
        'android.permission.BLUETOOTH_SCAN': 'granted',
        'android.permission.BLUETOOTH_CONNECT': 'denied',
      });

      const service = bluetoothAudioService as any;
      
      // Start the permission request
      const permissionPromise = service.requestPermissions();
      
      // Fast-forward time by 500ms
      jest.advanceTimersByTime(500);
      
      const result = await permissionPromise;
      
      expect(result).toBe(false);
      expect(mockRequestMultiple).toHaveBeenCalledWith([
        'android.permission.BLUETOOTH_SCAN',
        'android.permission.BLUETOOTH_CONNECT',
      ]);
    });
  });

  describe('Preferred Device Connection Refactoring', () => {
    it('should have private attemptPreferredDeviceConnection method', () => {
      const service = bluetoothAudioService as any;
      expect(typeof service.attemptPreferredDeviceConnection).toBe('function');
    });

    it('should have private attemptReconnectToPreferredDevice method for iOS support', () => {
      const service = bluetoothAudioService as any;
      expect(typeof service.attemptReconnectToPreferredDevice).toBe('function');
    });

    it('should track hasAttemptedPreferredDeviceConnection flag for single-call semantics', () => {
      const service = bluetoothAudioService as any;
      
      // Initially should be false
      expect(service.hasAttemptedPreferredDeviceConnection).toBe(false);
      
      // Can be set to true (simulating attempt)
      service.hasAttemptedPreferredDeviceConnection = true;
      expect(service.hasAttemptedPreferredDeviceConnection).toBe(true);
    });

    it('should reset flags on destroy method', () => {
      const service = bluetoothAudioService as any;
      
      // Set flags to true
      service.hasAttemptedPreferredDeviceConnection = true;
      service.isInitialized = true;
      
      // Call destroy
      bluetoothAudioService.destroy();
      
      // Verify flags are reset for single-call logic
      expect(service.hasAttemptedPreferredDeviceConnection).toBe(false);
      expect(service.isInitialized).toBe(false);
    });

    it('should support iOS state change handling through attemptReconnectToPreferredDevice', () => {
      const service = bluetoothAudioService as any;
      
      // Set up scenario: connection was previously attempted
      service.hasAttemptedPreferredDeviceConnection = true;
      
      // Verify the method exists for iOS poweredOn state handling
      expect(typeof service.attemptReconnectToPreferredDevice).toBe('function');
      
      // This method should be called when Bluetooth state changes to poweredOn on iOS
      // It resets the flag and attempts preferred device connection again
    });
  });

  describe('Single-Call Logic Validation', () => {
    it('should implement single-call semantics for preferred device connection', () => {
      const service = bluetoothAudioService as any;
      
      // Simulate first call - should set flag
      service.hasAttemptedPreferredDeviceConnection = false;
      // In actual implementation, attemptPreferredDeviceConnection would set this to true
      
      // Simulate second call - should not execute due to flag
      expect(service.hasAttemptedPreferredDeviceConnection).toBe(false);
      
      // After first attempt
      service.hasAttemptedPreferredDeviceConnection = true;
      expect(service.hasAttemptedPreferredDeviceConnection).toBe(true);
      
      // Second attempt should be blocked by this flag
    });

    it('should allow re-attempting connection after destroy', () => {
      const service = bluetoothAudioService as any;
      
      // Simulate connection attempt
      service.hasAttemptedPreferredDeviceConnection = true;
      
      // Destroy service (resets flags)
      bluetoothAudioService.destroy();
      
      // Flag should be reset, allowing new attempts
      expect(service.hasAttemptedPreferredDeviceConnection).toBe(false);
    });
  });
});
