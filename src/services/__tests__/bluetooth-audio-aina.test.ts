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

jest.mock('react-native-ble-manager', () => ({
  __esModule: true,
  default: {
    start: jest.fn(),
    checkState: jest.fn(),
    scan: jest.fn(),
    stopScan: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn(),
    getConnectedPeripherals: jest.fn().mockResolvedValue([]),
    removeAllListeners: jest.fn(),
    startNotification: jest.fn().mockResolvedValue(undefined),
    read: jest.fn(),
  },
}));

jest.mock('@/lib/storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
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

import BleManager from 'react-native-ble-manager';

import { logger } from '@/lib/logging';

import { bluetoothAudioService } from '../bluetooth-audio.service';

const AINA_SERVICE = '127FACE1-CB21-11E5-93D0-0002A5D5C51B';
const AINA_BUTTON_CHAR = '127FBEEF-CB21-11E5-93D0-0002A5D5C51B';
// Another characteristic in the AINA service that emits an incrementing counter (03, 04, 05, ...)
const AINA_COUNTER_CHAR = '127FC0FF-CB21-11E5-93D0-0002A5D5C51B';
const IMMEDIATE_ALERT_SERVICE = '1802';
const ALERT_LEVEL_CHAR = '2a06';
const BLE_BUTTON_CONTROL_CHAR = '0000FE59-0000-1000-8000-00805F9B34FB';
const DEVICE_ID = '673dffb6-1287-a157-6fea-1e36117cfebb';

const ainaDevice = {
  id: DEVICE_ID,
  name: 'APTT',
  rssi: -50,
  advertising: { serviceUUIDs: [AINA_SERVICE] },
};

const notify = (service: any, serviceUuid: string, characteristicUuid: string, byte: number) => {
  service.handleCharacteristicValueUpdate({
    peripheral: DEVICE_ID,
    service: serviceUuid,
    characteristic: characteristicUuid,
    value: [byte],
  });
};

describe('BluetoothAudioService - AINA headset button handling', () => {
  let service: any;
  let processButtonEventSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    service = bluetoothAudioService as any;
    service.connectedDevice = ainaDevice;
    service.monitoredReadCharacteristics = [];
    service.hasVendorButtonCharacteristic = false;
    service.pttPressActive = false;
    processButtonEventSpy = jest.spyOn(service, 'processButtonEvent').mockImplementation(() => undefined);
  });

  afterEach(() => {
    processButtonEventSpy.mockRestore();
    service.stopReadPollingFallback();
    service.connectedDevice = null;
    service.monitoredReadCharacteristics = [];
    service.hasVendorButtonCharacteristic = false;
  });

  const dispatchedButtons = () => processButtonEventSpy.mock.calls.map(([event]) => event.button);

  describe('startNotificationsForButtonControls', () => {
    it('flags the vendor characteristic and only read-polls readable characteristics', async () => {
      await service.startNotificationsForButtonControls(DEVICE_ID, {
        services: [{ uuid: AINA_SERVICE }, { uuid: IMMEDIATE_ALERT_SERVICE }],
        characteristics: [
          { service: AINA_SERVICE, characteristic: AINA_BUTTON_CHAR, properties: { Read: 'Read', Notify: 'Notify' } },
          { service: AINA_SERVICE, characteristic: AINA_COUNTER_CHAR, properties: { Read: 'Read', Notify: 'Notify' } },
          { service: IMMEDIATE_ALERT_SERVICE, characteristic: ALERT_LEVEL_CHAR, properties: { WriteWithoutResponse: 'WriteWithoutResponse' } },
        ],
      });

      expect(service.hasVendorButtonCharacteristic).toBe(true);
      const polled = service.monitoredReadCharacteristics.map((entry: any) => entry.characteristicUuid);
      expect(polled).toEqual([AINA_BUTTON_CHAR, AINA_COUNTER_CHAR]);
      expect(polled).not.toContain(ALERT_LEVEL_CHAR);
    });
  });

  describe('characteristic routing', () => {
    it('ignores the AINA counter characteristic so it cannot toggle mute while PTT is held', () => {
      service.hasVendorButtonCharacteristic = true;

      // Sequence captured from a real AINA PTT press-and-hold
      notify(service, AINA_SERVICE, AINA_BUTTON_CHAR, 0x01);
      notify(service, AINA_SERVICE, AINA_COUNTER_CHAR, 0x03);
      notify(service, AINA_SERVICE, AINA_BUTTON_CHAR, 0x81);
      notify(service, AINA_SERVICE, AINA_COUNTER_CHAR, 0x04);
      notify(service, AINA_SERVICE, AINA_BUTTON_CHAR, 0x01);
      notify(service, AINA_SERVICE, AINA_COUNTER_CHAR, 0x05);
      notify(service, AINA_SERVICE, AINA_COUNTER_CHAR, 0x06);
      notify(service, AINA_SERVICE, AINA_BUTTON_CHAR, 0x00);

      expect(dispatchedButtons()).toEqual(['ptt_start', 'unknown', 'ptt_start', 'ptt_stop']);
      expect(dispatchedButtons()).not.toContain('mute');
    });

    it('still uses the generic parser when no vendor button characteristic is active', () => {
      service.connectedDevice = { ...ainaDevice, name: 'Generic Headset', advertising: { serviceUUIDs: [] } };

      notify(service, '0000FE59-0000-1000-8000-00805F9B34FB', BLE_BUTTON_CONTROL_CHAR, 0x04);

      expect(dispatchedButtons()).toEqual(['mute']);
    });
  });

  describe('read polling', () => {
    it('stops polling a characteristic once it delivers a notification', () => {
      service.registerReadPollingCharacteristic(AINA_SERVICE, AINA_BUTTON_CHAR);
      service.registerReadPollingCharacteristic(AINA_SERVICE, AINA_COUNTER_CHAR);

      notify(service, AINA_SERVICE, AINA_BUTTON_CHAR, 0x01);

      const confirmed = service.monitoredReadCharacteristics.filter((entry: any) => entry.notificationConfirmed).map((entry: any) => entry.characteristicUuid);
      expect(confirmed).toEqual([AINA_BUTTON_CHAR]);
    });

    it('discards an in-flight read when a notification arrives for the same characteristic', async () => {
      service.registerReadPollingCharacteristic(AINA_SERVICE, AINA_BUTTON_CHAR);
      service.monitoredReadCharacteristics[0].lastHexValue = '00';

      let resolveRead: (value: number[]) => void = () => undefined;
      (BleManager.read as jest.Mock).mockImplementationOnce(
        () =>
          new Promise<number[]>((resolve) => {
            resolveRead = resolve;
          })
      );

      const poll = service.pollReadCharacteristics(DEVICE_ID);

      // Press and release are notified while the read is still pending
      notify(service, AINA_SERVICE, AINA_BUTTON_CHAR, 0x01);
      notify(service, AINA_SERVICE, AINA_BUTTON_CHAR, 0x00);

      // The stale read resolves with the "pressed" value
      resolveRead([0x01]);
      await poll;

      expect(dispatchedButtons()).toEqual(['ptt_start', 'ptt_stop']);
    });

    it('stops polling a characteristic after repeated read failures', async () => {
      service.registerReadPollingCharacteristic(IMMEDIATE_ALERT_SERVICE, ALERT_LEVEL_CHAR);
      (BleManager.read as jest.Mock).mockRejectedValue('Reading is not permitted.');

      await service.pollReadCharacteristics(DEVICE_ID);
      await service.pollReadCharacteristics(DEVICE_ID);
      expect(service.monitoredReadCharacteristics).toHaveLength(1);

      await service.pollReadCharacteristics(DEVICE_ID);
      expect(service.monitoredReadCharacteristics).toHaveLength(0);
      expect(logger.info).toHaveBeenCalledWith(expect.objectContaining({ message: 'Stopped read polling for characteristic after repeated failures' }));

      await service.pollReadCharacteristics(DEVICE_ID);
      expect(BleManager.read).toHaveBeenCalledTimes(3);
    });

    it('resets the failure count after a successful read', async () => {
      service.registerReadPollingCharacteristic(AINA_SERVICE, AINA_BUTTON_CHAR);
      (BleManager.read as jest.Mock).mockRejectedValueOnce('busy').mockRejectedValueOnce('busy').mockResolvedValueOnce([0x00]).mockRejectedValueOnce('busy').mockRejectedValueOnce('busy');

      for (let i = 0; i < 5; i++) {
        await service.pollReadCharacteristics(DEVICE_ID);
      }

      expect(service.monitoredReadCharacteristics).toHaveLength(1);
      expect(service.monitoredReadCharacteristics[0].consecutiveFailures).toBe(2);
    });
  });
});
