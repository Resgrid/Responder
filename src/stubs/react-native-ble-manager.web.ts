export type BleState = 'on' | 'off' | 'turning_on' | 'turning_off' | 'unknown' | 'unauthorized' | 'resetting' | 'unsupported';

export interface Peripheral {
  id: string;
  name?: string | null;
  rssi?: number;
  advertising?: {
    isConnectable?: boolean;
    serviceUUIDs?: string[];
    manufacturerData?: any;
    serviceData?: any;
    [key: string]: any;
  };
  [key: string]: any;
}

export interface BleManagerDidUpdateValueForCharacteristicEvent {
  value: number[];
  peripheral: string;
  service: string;
  characteristic: string;
}

export enum BleScanCallbackType {
  AllMatches = 1,
  FirstMatch = 2,
  MatchLost = 4,
}

export enum BleScanMatchMode {
  Aggressive = 1,
  Sticky = 2,
}

export enum BleScanMode {
  Opportunistic = -1,
  LowPower = 0,
  Balanced = 1,
  LowLatency = 2,
}

const notSupported = () => Promise.reject(new Error('Bluetooth is not supported on web'));
const noopAsync = () => Promise.resolve();
const emptyListener = { remove: () => {} };

const BleManager = {
  start: noopAsync,
  checkState: () => Promise.resolve('unknown' as BleState),
  scan: noopAsync,
  stopScan: noopAsync,
  connect: notSupported,
  disconnect: noopAsync,
  getConnectedPeripherals: () => Promise.resolve([] as Peripheral[]),
  getDiscoveredPeripherals: () => Promise.resolve([] as Peripheral[]),
  retrieveServices: notSupported,
  startNotification: notSupported,
  stopNotification: notSupported,
  read: notSupported,
  write: notSupported,
  writeWithoutResponse: notSupported,
  onDidUpdateState: () => emptyListener,
  onDidUpdateValueForCharacteristic: () => emptyListener,
  onDisconnectPeripheral: () => emptyListener,
  onDiscoverPeripheral: () => emptyListener,
  onStopScan: () => emptyListener,
};

export default BleManager;
