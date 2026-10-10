/* eslint-disable @typescript-eslint/no-explicit-any */
import 'react-native';

jest.mock('@livekit/react-native-webrtc', () => ({
  RTCAudioSession: {
    audioSessionDidActivate: jest.fn(),
    audioSessionDidDeactivate: jest.fn(),
  },
}));

jest.mock('@/services/callkeep.service', () => ({
  callKeepService: {
    ignoreMuteEvents: jest.fn(),
    removeMuteListener: jest.fn(),
    restoreMuteListener: jest.fn(),
  },
}));

jest.mock('react-native-ble-manager', () => {
  const listener = () => ({ remove: jest.fn() });
  return {
    __esModule: true,
    BleScanCallbackType: { AllMatches: 1 },
    BleScanMatchMode: { Sticky: 2 },
    BleScanMode: { LowLatency: 2 },
    default: {
      start: jest.fn().mockResolvedValue(undefined),
      checkState: jest.fn().mockResolvedValue('on'),
      scan: jest.fn().mockResolvedValue(undefined),
      stopScan: jest.fn().mockResolvedValue(undefined),
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      getConnectedPeripherals: jest.fn().mockResolvedValue([]),
      retrieveServices: jest.fn().mockResolvedValue({ services: [], characteristics: [] }),
      startNotification: jest.fn().mockResolvedValue(undefined),
      read: jest.fn(),
      onDidUpdateState: jest.fn(listener),
      onDisconnectPeripheral: jest.fn(listener),
      onDiscoverPeripheral: jest.fn(listener),
      onDidUpdateValueForCharacteristic: jest.fn(listener),
      onStopScan: jest.fn(listener),
    },
  };
});

jest.mock('@/lib/storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/logging', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@/services/audio.service', () => ({
  audioService: {
    playConnectedDeviceSound: jest.fn(),
    playStartTransmittingSound: jest.fn(),
    playStopTransmittingSound: jest.fn(),
  },
}));

jest.mock('@/stores/app/livekit-store', () => {
  const actions = {
    toggleMicrophone: jest.fn(),
    setMicrophoneEnabled: jest.fn(),
  };
  return {
    useLiveKitStore: {
      getState: jest.fn(() => actions),
    },
  };
});

import { PermissionsAndroid, Platform } from 'react-native';
import BleManager from 'react-native-ble-manager';

import { removeItem } from '@/lib/storage';
import { State, useBluetoothAudioStore } from '@/stores/app/bluetooth-audio-store';

import { bluetoothAudioService } from '../bluetooth-audio.service';

const DEVICE_ID = 'device-1';
const HFP_SERVICE_UUID = '0000111E-0000-1000-8000-00805F9B34FB';
const BATTERY_SERVICE = '0000180F-0000-1000-8000-00805F9B34FB';
const BATTERY_LEVEL_CHAR = '2a19';
const HID_SERVICE = '1812';
const HID_REPORT_CHAR = '2a4d';
const HYS_SERVICE = '0000FFE0-0000-1000-8000-00805F9B34FB';

const hysDevice = {
  id: DEVICE_ID,
  name: 'HYS PTT',
  rssi: -50,
  advertising: { serviceUUIDs: [HYS_SERVICE] },
};

describe('BluetoothAudioService - edge cases', () => {
  let service: any;

  beforeEach(() => {
    jest.clearAllMocks();
    service = bluetoothAudioService as any;
    service.connectedDevice = null;
    service.isConnecting = false;
    service.monitoredReadCharacteristics = [];
    service.hasVendorButtonCharacteristic = false;
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
    service.stopReadPollingFallback();
    service.clearConnectionTimeout();
    service.connectedDevice = null;
    service.isConnecting = false;
  });

  describe('standard GATT characteristics', () => {
    it('never treats a battery level of 100% (0x64) as a mute press', () => {
      const processButtonEventSpy = jest.spyOn(service, 'processButtonEvent').mockImplementation(() => undefined);
      service.connectedDevice = hysDevice;

      service.handleCharacteristicValueUpdate({ peripheral: DEVICE_ID, service: BATTERY_SERVICE, characteristic: BATTERY_LEVEL_CHAR, value: [0x64] });
      service.handleCharacteristicValueUpdate({ peripheral: DEVICE_ID, service: HID_SERVICE, characteristic: HID_REPORT_CHAR, value: [0x04] });

      expect(processButtonEventSpy).not.toHaveBeenCalled();
    });

    it('does not subscribe to battery or HID characteristics', async () => {
      service.connectedDevice = hysDevice;

      await service.startNotificationsForButtonControls(DEVICE_ID, {
        services: [{ uuid: BATTERY_SERVICE }, { uuid: HID_SERVICE }, { uuid: HYS_SERVICE }],
        characteristics: [
          { service: BATTERY_SERVICE, characteristic: BATTERY_LEVEL_CHAR, properties: { Read: 'Read', Notify: 'Notify' } },
          { service: HID_SERVICE, characteristic: HID_REPORT_CHAR, properties: { Read: 'Read', Notify: 'Notify' } },
          { service: HYS_SERVICE, characteristic: 'FFE1', properties: { Read: 'Read', Notify: 'Notify' } },
        ],
      });

      const subscribed = (BleManager.startNotification as jest.Mock).mock.calls.map(([, , characteristic]) => characteristic);
      expect(subscribed).toEqual(['FFE1']);
    });
  });

  describe('UUID normalization', () => {
    it('normalizes 16-bit, 32-bit and unhyphenated UUIDs to the 128-bit form', () => {
      expect(service.normalizeUuid('111e')).toBe(HFP_SERVICE_UUID);
      expect(service.normalizeUuid('0000111E')).toBe(HFP_SERVICE_UUID);
      expect(service.normalizeUuid('0000111e00001000800000805f9b34fb')).toBe(HFP_SERVICE_UUID);
      expect(service.normalizeUuid(HFP_SERVICE_UUID.toLowerCase())).toBe(HFP_SERVICE_UUID);
    });

    it('matches short advertised UUIDs against the 128-bit constants', () => {
      const device = { id: 'headset', name: 'Unnamed', advertising: { serviceUUIDs: ['111E'] } };

      expect(service.areUuidsEqual('111E', HFP_SERVICE_UUID)).toBe(true);
      expect(service.isAudioDevice(device)).toBe(true);
      expect(service.supportsMicrophoneControl(device)).toBe(true);
    });
  });

  it('detects ASCII vendor identifiers in service data', () => {
    expect(service.analyzeServiceDataForAudio(Buffer.from('AINA-PTT', 'ascii'))).toBe(true);
  });

  describe('requestPermissions', () => {
    // Assigned directly (not jest.replaceProperty) because some apps' jest setup mocks Platform without Version
    const platform = Platform as unknown as { OS: string; Version: number | string | undefined };
    const originalPlatform = { OS: platform.OS, Version: platform.Version };

    beforeAll(() => {
      // Some apps' jest setup mocks react-native without PermissionsAndroid
      const RN = require('react-native');
      if (!RN.PermissionsAndroid) {
        RN.PermissionsAndroid = {
          PERMISSIONS: {
            BLUETOOTH_SCAN: 'android.permission.BLUETOOTH_SCAN',
            BLUETOOTH_CONNECT: 'android.permission.BLUETOOTH_CONNECT',
            ACCESS_FINE_LOCATION: 'android.permission.ACCESS_FINE_LOCATION',
          },
          RESULTS: { GRANTED: 'granted', DENIED: 'denied' },
          check: jest.fn(),
          requestMultiple: jest.fn(),
        };
      }
    });

    afterEach(() => {
      platform.OS = originalPlatform.OS;
      platform.Version = originalPlatform.Version;
    });

    const setAndroidVersion = (version: number) => {
      platform.OS = 'android';
      platform.Version = version;
    };

    it('requests only BLUETOOTH_SCAN/CONNECT on Android 12+', async () => {
      setAndroidVersion(31);
      jest.spyOn(PermissionsAndroid, 'check').mockResolvedValue(false);
      const requestSpy = jest.spyOn(PermissionsAndroid, 'requestMultiple').mockResolvedValue({
        [PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN]: PermissionsAndroid.RESULTS.GRANTED,
        [PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT]: PermissionsAndroid.RESULTS.GRANTED,
      } as any);

      await expect(service.requestPermissions()).resolves.toBe(true);
      expect(requestSpy).toHaveBeenCalledWith([PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN, PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT]);
    });

    it('requests location for BLE scanning on Android 11 and lower', async () => {
      setAndroidVersion(30);
      jest.spyOn(PermissionsAndroid, 'check').mockResolvedValue(false);
      const requestSpy = jest.spyOn(PermissionsAndroid, 'requestMultiple').mockResolvedValue({
        [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION]: PermissionsAndroid.RESULTS.GRANTED,
      } as any);

      await expect(service.requestPermissions()).resolves.toBe(true);
      expect(requestSpy).toHaveBeenCalledWith([PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION]);
    });

    it('does not prompt when permissions are already granted', async () => {
      setAndroidVersion(34);
      jest.spyOn(PermissionsAndroid, 'check').mockResolvedValue(true);
      const requestSpy = jest.spyOn(PermissionsAndroid, 'requestMultiple');

      await expect(service.requestPermissions()).resolves.toBe(true);
      expect(requestSpy).not.toHaveBeenCalled();
    });
  });

  describe('connectToDevice', () => {
    it('ignores a connect request while another one is in flight', async () => {
      service.isConnecting = true;

      await service.connectToDevice(DEVICE_ID);

      expect(BleManager.connect).not.toHaveBeenCalled();
    });

    it('times out a connect that never completes and cancels it', async () => {
      jest.useFakeTimers();
      (BleManager.connect as jest.Mock).mockReturnValueOnce(new Promise(() => undefined));

      const connectAttempt = service.connectToDevice(DEVICE_ID);
      const assertion = expect(connectAttempt).rejects.toThrow('Timed out connecting to Bluetooth device');

      await jest.advanceTimersByTimeAsync(500 + 15000);
      await assertion;

      expect(BleManager.disconnect).toHaveBeenCalledWith(DEVICE_ID);
      expect(useBluetoothAudioStore.getState().connectionError).toContain('Timed out');
      expect(service.isConnecting).toBe(false);
    });
  });

  describe('Bluetooth state changes', () => {
    let reconnectSpy: jest.SpyInstance;

    beforeEach(() => {
      service.isInitialized = true;
      reconnectSpy = jest.spyOn(service, 'attemptReconnectToPreferredDevice').mockResolvedValue(undefined);
    });

    afterEach(() => {
      service.isInitialized = false;
      service.hasAttemptedPreferredDeviceConnection = false;
      useBluetoothAudioStore.getState().setBluetoothState(State.Unknown);
    });

    it('reconnects when Bluetooth is turned back on after an earlier attempt', () => {
      service.hasAttemptedPreferredDeviceConnection = true;
      useBluetoothAudioStore.getState().setBluetoothState(State.PoweredOff);

      service.handleBluetoothStateChange({ state: 'on' });

      expect(reconnectSpy).toHaveBeenCalledTimes(1);
    });

    it('retries when startup skipped the preferred device because the state was not yet known', () => {
      service.hasAttemptedPreferredDeviceConnection = false;

      service.handleBluetoothStateChange({ state: 'on' });

      expect(reconnectSpy).toHaveBeenCalledTimes(1);
    });

    it('does not reconnect on the first power-on report when startup already attempted it', () => {
      service.hasAttemptedPreferredDeviceConnection = true;

      service.handleBluetoothStateChange({ state: 'on' });

      expect(reconnectSpy).not.toHaveBeenCalled();
    });

    it('does not reconnect while a device is connected', () => {
      service.hasAttemptedPreferredDeviceConnection = true;
      service.connectedDevice = hysDevice;
      useBluetoothAudioStore.getState().setBluetoothState(State.PoweredOff);

      service.handleBluetoothStateChange({ state: 'on' });

      expect(reconnectSpy).not.toHaveBeenCalled();
    });
  });

  describe('forgetPreferredDevice', () => {
    it('clears the stored preference and moves the audio selection back to the built-in devices', async () => {
      const store = useBluetoothAudioStore.getState();
      const headset = { id: DEVICE_ID, name: 'Headset', type: 'bluetooth' as const, isAvailable: true };
      store.setPreferredDevice({ id: DEVICE_ID, name: 'Headset' });
      store.setSelectedMicrophone(headset);
      store.setSelectedSpeaker(headset);

      await service.forgetPreferredDevice(DEVICE_ID);

      const { preferredDevice, selectedAudioDevices } = useBluetoothAudioStore.getState();
      expect(removeItem).toHaveBeenCalledWith('preferredBluetoothDevice');
      expect(preferredDevice).toBeNull();
      expect(selectedAudioDevices.microphone?.id).toBe('default-mic');
      expect(selectedAudioDevices.speaker?.id).toBe('default-speaker');
    });

    it('leaves a different preferred device alone', async () => {
      useBluetoothAudioStore.getState().setPreferredDevice({ id: 'other', name: 'Other' });

      await service.forgetPreferredDevice(DEVICE_ID);

      expect(removeItem).not.toHaveBeenCalled();
      expect(useBluetoothAudioStore.getState().preferredDevice?.id).toBe('other');
      useBluetoothAudioStore.getState().setPreferredDevice(null);
    });
  });

  it('clears the pending scan timeout when the scan stops early', () => {
    jest.useFakeTimers();
    const timeoutSpy = jest.fn();
    service.scanTimeout = setTimeout(timeoutSpy, 1000);

    service.handleScanStopped();
    jest.advanceTimersByTime(1000);

    expect(timeoutSpy).not.toHaveBeenCalled();
    expect(service.scanTimeout).toBeNull();
  });

  it('resets its state synchronously on destroy so it can be initialized again', () => {
    service.isInitialized = true;
    service.isBleManagerStarted = true;
    service.hasAttemptedPreferredDeviceConnection = true;

    void service.destroy();

    expect(service.isInitialized).toBe(false);
    expect(service.isBleManagerStarted).toBe(false);
    expect(service.hasAttemptedPreferredDeviceConnection).toBe(false);
  });
});
