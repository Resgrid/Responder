import { Buffer } from 'buffer';
import { Alert, PermissionsAndroid, Platform } from 'react-native';
import { BleError, BleManager, Characteristic, type Device, DeviceId, type Service, State, type Subscription } from 'react-native-ble-plx';

import { logger } from '@/lib/logging';
import { audioService } from '@/services/audio.service';
import { type AudioButtonEvent, type BluetoothAudioDevice, useBluetoothAudioStore } from '@/stores/app/bluetooth-audio-store';
import { useLiveKitStore } from '@/stores/app/livekit-store';

// Standard Bluetooth UUIDs for audio services
const AUDIO_SERVICE_UUID = '0000110A-0000-1000-8000-00805F9B34FB'; // Advanced Audio Distribution Profile
const A2DP_SOURCE_UUID = '0000110A-0000-1000-8000-00805F9B34FB';
const HFP_SERVICE_UUID = '0000111E-0000-1000-8000-00805F9B34FB'; // Hands-Free Profile
const HSP_SERVICE_UUID = '00001108-0000-1000-8000-00805F9B34FB'; // Headset Profile

const AINA_HEADSET = 'D11C8116-A913-434D-A79D-97AE94A529B3';
const AINA_HEADSET_SERVICE = '127FACE1-CB21-11E5-93D0-0002A5D5C51B';
const AINA_HEADSET_SVC_PROP = '127FBEEF-CB21-11E5-93D0-0002A5D5C51B';

const B01INRICO_HEADSET = '2BD21C44-0198-4B92-9110-D622D53D8E37';
//const B01INRICO_HEADSET_SERVICE = '6666';
const B01INRICO_HEADSET_SERVICE = '00006666-0000-1000-8000-00805F9B34FB';
//const B01INRICO_HEADSET_SERVICE_CHAR = '8888';
const B01INRICO_HEADSET_SERVICE_CHAR = '00008888-0000-1000-8000-00805F9B34FB';

const HYS_HEADSET = '3CD31C55-A914-435E-B80E-98AF95B630C4';
const HYS_HEADSET_SERVICE = '6E400001-B5A3-F393-E0A9-E50E24DCCA9E';
const HYS_HEADSET_SERVICE_CHAR = '6E400003-B5A3-F393-E0A9-E50E24DCCA9E';

// Common button control characteristic UUIDs (varies by manufacturer)
const BUTTON_CONTROL_UUIDS = [
  '0000FE59-0000-1000-8000-00805F9B34FB', // Common button control
  '0000180F-0000-1000-8000-00805F9B34FB', // Battery Service (often includes button data)
  '00001812-0000-1000-8000-00805F9B34FB', // Human Interface Device Service
];

class BluetoothAudioService {
  private static instance: BluetoothAudioService;
  private bleManager: BleManager;
  private connectedDevice: Device | null = null;
  private scanSubscription: Promise<void> | null = null;
  private scanTimeout: NodeJS.Timeout | null = null;
  private buttonSubscription: Subscription | null = null;
  private connectionSubscription: Promise<void> | null = null;
  private isInitialized: boolean = false;

  private constructor() {
    this.bleManager = new BleManager();
    this.setupBleStateListener();
  }

  static getInstance(): BluetoothAudioService {
    if (!BluetoothAudioService.instance) {
      BluetoothAudioService.instance = new BluetoothAudioService();
    }
    return BluetoothAudioService.instance;
  }

  /**
   * Initialize the Bluetooth service and attempt to connect to the preferred device
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      logger.info({
        message: 'Initializing Bluetooth Audio Service',
      });

      // Check if we have permissions
      const hasPermissions = await this.requestPermissions();
      if (!hasPermissions) {
        logger.warn({
          message: 'Bluetooth permissions not granted, skipping initialization',
        });
        return;
      }

      // Check Bluetooth state
      const state = await this.checkBluetoothState();
      if (state !== State.PoweredOn) {
        logger.info({
          message: 'Bluetooth not powered on, skipping initialization',
          context: { state },
        });
        return;
      }

      // Load preferred device from storage
      const { getItem } = require('@/lib/storage') as typeof import('@/lib/storage');
      const preferredDevice = getItem<{ id: string; name: string }>('preferredBluetoothDevice');

      if (preferredDevice) {
        logger.info({
          message: 'Found preferred Bluetooth device, attempting to connect',
          context: { deviceId: preferredDevice.id, deviceName: preferredDevice.name },
        });

        // Set the preferred device in the store
        useBluetoothAudioStore.getState().setPreferredDevice(preferredDevice);

        // Try to connect directly to the preferred device
        try {
          await this.connectToDevice(preferredDevice.id);
          logger.info({
            message: 'Successfully connected to preferred Bluetooth device on startup',
            context: { deviceId: preferredDevice.id },
          });
        } catch (error) {
          logger.warn({
            message: 'Failed to connect to preferred Bluetooth device on startup, will scan for it',
            context: { deviceId: preferredDevice.id, error },
          });

          // If direct connection fails, start scanning to find the device
          this.startScanning(5000); // 5 second scan
        }
      } else {
        logger.info({
          message: 'No preferred Bluetooth device found',
        });
      }

      this.isInitialized = true;
    } catch (error) {
      logger.error({
        message: 'Failed to initialize Bluetooth Audio Service',
        context: { error },
      });
    }
  }

  private setupBleStateListener(): void {
    this.bleManager.onStateChange((state) => {
      logger.info({
        message: 'Bluetooth state changed',
        context: { state },
      });

      useBluetoothAudioStore.getState().setBluetoothState(state);

      if (state === State.PoweredOff || state === State.Unauthorized) {
        this.handleBluetoothDisabled();
      } else if (state === State.PoweredOn && this.isInitialized) {
        // If Bluetooth is turned back on, try to reconnect to preferred device
        this.attemptReconnectToPreferredDevice();
      }
    }, true);
  }

  private async attemptReconnectToPreferredDevice(): Promise<void> {
    const { preferredDevice, connectedDevice } = useBluetoothAudioStore.getState();

    if (preferredDevice && !connectedDevice) {
      logger.info({
        message: 'Bluetooth turned on, attempting to reconnect to preferred device',
        context: { deviceId: preferredDevice.id },
      });

      try {
        await this.connectToDevice(preferredDevice.id);
      } catch (error) {
        logger.warn({
          message: 'Failed to reconnect to preferred device, starting scan',
          context: { deviceId: preferredDevice.id, error },
        });

        // Start a quick scan to find the device
        this.startScanning(5000);
      }
    }
  }

  private handleBluetoothDisabled(): void {
    this.stopScanning();
    this.disconnectDevice();
    useBluetoothAudioStore.getState().clearDevices();
  }

  async requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'android') {
      try {
        const permissions = [PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN, PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT, PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];

        const results = await PermissionsAndroid.requestMultiple(permissions);

        const allGranted = Object.values(results).every((result) => result === PermissionsAndroid.RESULTS.GRANTED);

        logger.info({
          message: 'Bluetooth permissions requested',
          context: { results, allGranted },
        });

        return allGranted;
      } catch (error) {
        logger.error({
          message: 'Failed to request Bluetooth permissions',
          context: { error },
        });
        return false;
      }
    }
    return true; // iOS permissions are handled via Info.plist
  }

  async checkBluetoothState(): Promise<State> {
    return await this.bleManager.state();
  }

  async startScanning(durationMs: number = 10000): Promise<void> {
    const hasPermissions = await this.requestPermissions();
    if (!hasPermissions) {
      throw new Error('Bluetooth permissions not granted');
    }

    const state = await this.checkBluetoothState();
    if (state !== State.PoweredOn) {
      throw new Error(`Bluetooth is ${state}. Please enable Bluetooth.`);
    }

    // Stop any existing scan first
    this.stopScanning();

    useBluetoothAudioStore.getState().setIsScanning(true);
    useBluetoothAudioStore.getState().clearDevices();

    logger.info({
      message: 'Starting Bluetooth audio device scan',
      context: { durationMs },
    });

    // Scan for all devices without service UUID filtering to increase discovery chances
    // Many audio devices don't advertise audio service UUIDs during discovery
    this.scanSubscription = this.bleManager.startDeviceScan(
      null, //[AUDIO_SERVICE_UUID, HFP_SERVICE_UUID, HSP_SERVICE_UUID, AINA_HEADSET_SERVICE, B01INRICO_HEADSET_SERVICE, HYS_HEADSET_SERVICE], // Scan for all devices
      {
        allowDuplicates: false,
        scanMode: 1, // Balanced scan mode
        callbackType: 1, // All matches
      },
      (error, device) => {
        if (error) {
          logger.error({
            message: 'BLE scan error',
            context: { error },
          });
          return;
        }

        if (device) {
          // Log all discovered devices for debugging
          logger.debug({
            message: 'Device discovered during scan',
            context: {
              deviceId: device.id,
              deviceName: device.name,
              rssi: device.rssi,
              serviceUUIDs: device.serviceUUIDs,
              manufacturerData: device.manufacturerData,
            },
          });

          // Check if this is an audio device
          if (this.isAudioDevice(device)) {
            this.handleDeviceFound(device);
          }
        }
      }
    );

    // Stop scanning after duration
    this.scanTimeout = setTimeout(() => {
      this.stopScanning();

      logger.info({
        message: 'Bluetooth scan completed',
        context: {
          durationMs,
          devicesFound: useBluetoothAudioStore.getState().availableDevices.length,
        },
      });
    }, durationMs);
  }

  /**
   * Debug method to scan for ALL devices with detailed logging
   * Use this for troubleshooting device discovery issues
   */
  async startDebugScanning(durationMs: number = 15000): Promise<void> {
    const hasPermissions = await this.requestPermissions();
    if (!hasPermissions) {
      throw new Error('Bluetooth permissions not granted');
    }

    const state = await this.checkBluetoothState();
    if (state !== State.PoweredOn) {
      throw new Error(`Bluetooth is ${state}. Please enable Bluetooth.`);
    }

    // Stop any existing scan first
    this.stopScanning();

    useBluetoothAudioStore.getState().setIsScanning(true);
    useBluetoothAudioStore.getState().clearDevices();

    logger.info({
      message: 'Starting DEBUG Bluetooth device scan (all devices)',
      context: { durationMs },
    });

    // Scan for ALL devices with detailed logging
    this.scanSubscription = this.bleManager.startDeviceScan(
      null, // Scan for all devices
      {
        allowDuplicates: true, // Allow duplicates for debugging
        scanMode: 1, // Balanced scan mode
        callbackType: 1, // All matches
      },
      (error, device) => {
        if (error) {
          logger.error({
            message: 'BLE debug scan error',
            context: { error },
          });
          return;
        }

        if (device) {
          // Log ALL discovered devices for debugging
          logger.info({
            message: 'DEBUG: Device discovered',
            context: {
              deviceId: device.id,
              deviceName: device.name,
              rssi: device.rssi,
              serviceUUIDs: device.serviceUUIDs,
              manufacturerData: device.manufacturerData,
              isConnectable: device.isConnectable,
              serviceData: device.serviceData,
              txPowerLevel: device.txPowerLevel,
              mtu: device.mtu,
            },
          });

          // Check if this is an audio device and add to store
          if (this.isAudioDevice(device)) {
            logger.info({
              message: 'DEBUG: Audio device identified',
              context: { deviceId: device.id, deviceName: device.name },
            });
            this.handleDeviceFound(device);
          }
        }
      }
    );

    // Stop scanning after duration
    this.scanTimeout = setTimeout(() => {
      this.stopScanning();

      logger.info({
        message: 'DEBUG: Bluetooth scan completed',
        context: {
          durationMs,
          totalDevicesFound: useBluetoothAudioStore.getState().availableDevices.length,
        },
      });
    }, durationMs);
  }

  private isAudioDevice(device: Device): boolean {
    const name = device.name?.toLowerCase() || '';
    const audioKeywords = ['speaker', 'headset', 'earbuds', 'headphone', 'audio', 'mic', 'sound', 'wireless', 'bluetooth', 'bt', 'aina', 'inrico', 'hys', 'b01'];

    // Check if device name contains audio-related keywords
    const hasAudioKeyword = audioKeywords.some((keyword) => name.includes(keyword));

    // Check if device has audio service UUIDs
    const hasAudioService = device.serviceUUIDs?.some((uuid) => {
      const upperUuid = uuid.toUpperCase();
      return [AUDIO_SERVICE_UUID, HFP_SERVICE_UUID, HSP_SERVICE_UUID, AINA_HEADSET_SERVICE, B01INRICO_HEADSET_SERVICE, HYS_HEADSET_SERVICE].includes(upperUuid);
    });

    // Check manufacturer data for known audio device manufacturers
    const hasAudioManufacturerData = device.manufacturerData ? this.hasAudioManufacturerData(device.manufacturerData) : false;

    // Log device details for debugging
    logger.debug({
      message: 'Evaluating device for audio capability',
      context: {
        deviceId: device.id,
        deviceName: device.name,
        hasAudioKeyword,
        hasAudioService,
        hasAudioManufacturerData,
        serviceUUIDs: device.serviceUUIDs,
        manufacturerData: device.manufacturerData,
      },
    });

    return hasAudioKeyword || hasAudioService || hasAudioManufacturerData;
  }

  private hasAudioManufacturerData(manufacturerData: string | { [key: string]: string }): boolean {
    // Known audio device manufacturer IDs (check manufacturer data for audio device indicators)
    // This is a simplified check - you'd need to implement device-specific logic

    if (typeof manufacturerData === 'string') {
      // Simple string check for audio-related manufacturer data
      return manufacturerData.toLowerCase().includes('audio') || manufacturerData.toLowerCase().includes('headset') || manufacturerData.toLowerCase().includes('speaker');
    }

    const audioManufacturerIds = [
      '0x004C', // Apple
      '0x001D', // Qualcomm
      '0x000F', // Broadcom
      '0x0087', // Mediatek
      '0x02E5', // Realtek
    ];

    return Object.keys(manufacturerData).some((key) => audioManufacturerIds.includes(key) || audioManufacturerIds.includes(`0x${key}`));
  }

  private handleDeviceFound(device: Device): void {
    const audioDevice: BluetoothAudioDevice = {
      id: device.id,
      name: device.name,
      rssi: device.rssi || undefined,
      isConnected: false,
      hasAudioCapability: true,
      supportsMicrophoneControl: this.supportsMicrophoneControl(device),
      device,
    };

    logger.info({
      message: 'Audio device found',
      context: {
        deviceId: device.id,
        deviceName: device.name,
        rssi: device.rssi,
        supportsMicControl: audioDevice.supportsMicrophoneControl,
      },
    });

    useBluetoothAudioStore.getState().addDevice(audioDevice);

    // Check if this is the preferred device and auto-connect
    this.checkAndAutoConnectPreferredDevice(audioDevice);
  }

  private async checkAndAutoConnectPreferredDevice(device: BluetoothAudioDevice): Promise<void> {
    const { preferredDevice, connectedDevice } = useBluetoothAudioStore.getState();

    // Only auto-connect if:
    // 1. This is the preferred device
    // 2. No device is currently connected
    // 3. We're not already in the process of connecting
    if (preferredDevice?.id === device.id && !connectedDevice && !this.connectionSubscription) {
      try {
        logger.info({
          message: 'Auto-connecting to preferred Bluetooth device',
          context: { deviceId: device.id, deviceName: device.name },
        });

        await this.connectToDevice(device.id);
      } catch (error) {
        logger.warn({
          message: 'Failed to auto-connect to preferred Bluetooth device',
          context: { deviceId: device.id, error },
        });
      }
    }
  }

  private supportsMicrophoneControl(device: Device): boolean {
    // Check if device likely supports microphone control based on service UUIDs
    const serviceUUIDs = device.serviceUUIDs || [];
    return serviceUUIDs.some((uuid) => [HFP_SERVICE_UUID, HSP_SERVICE_UUID].includes(uuid.toUpperCase()));
  }

  stopScanning(): void {
    if (this.scanSubscription) {
      // In the new API, we stop scanning via the BLE manager
      this.bleManager.stopDeviceScan();
      this.scanSubscription = null;
    }

    if (this.scanTimeout) {
      clearTimeout(this.scanTimeout);
      this.scanTimeout = null;
    }

    useBluetoothAudioStore.getState().setIsScanning(false);

    logger.info({
      message: 'Bluetooth scan stopped',
    });
  }

  async connectToDevice(deviceId: string): Promise<void> {
    try {
      useBluetoothAudioStore.getState().setIsConnecting(true);

      const device = await this.bleManager.connectToDevice(deviceId);

      logger.info({
        message: 'Connected to Bluetooth audio device',
        context: { deviceId, deviceName: device.name },
      });

      // Discover services and characteristics
      await device.discoverAllServicesAndCharacteristics();

      this.connectedDevice = device;
      useBluetoothAudioStore.getState().setConnectedDevice({
        id: device.id,
        name: device.name,
        rssi: device.rssi || undefined,
        isConnected: true,
        hasAudioCapability: true,
        supportsMicrophoneControl: this.supportsMicrophoneControl(device),
        device,
      });

      // Set up button event monitoring
      await this.setupButtonEventMonitoring(device);

      // Set up connection monitoring
      this.setupConnectionMonitoring(device);

      // Integrate with LiveKit audio routing
      await this.setupLiveKitAudioRouting(device);

      // Play connected device sound
      await audioService.playConnectedDeviceSound();

      useBluetoothAudioStore.getState().setIsConnecting(false);
    } catch (error) {
      logger.error({
        message: 'Failed to connect to Bluetooth audio device',
        context: { deviceId, error },
      });

      useBluetoothAudioStore.getState().setIsConnecting(false);
      useBluetoothAudioStore.getState().setConnectionError(error instanceof Error ? error.message : 'Unknown connection error');
      throw error;
    }
  }

  private setupConnectionMonitoring(device: Device): void {
    device.onDisconnected((error, disconnectedDevice) => {
      logger.info({
        message: 'Bluetooth audio device disconnected',
        context: {
          deviceId: disconnectedDevice?.id,
          deviceName: disconnectedDevice?.name,
          error: error?.message,
        },
      });

      this.handleDeviceDisconnected();
    });
  }

  private handleDeviceDisconnected(): void {
    this.connectedDevice = null;
    this.buttonSubscription = null;
    //if (this.buttonSubscription) {
    //  this.buttonSubscription.remove();
    //  this.buttonSubscription = null;
    //}

    useBluetoothAudioStore.getState().setConnectedDevice(null);
    useBluetoothAudioStore.getState().clearConnectionError();

    // Revert LiveKit audio routing to default
    this.revertLiveKitAudioRouting();
  }

  private async setupButtonEventMonitoring(device: Device): Promise<void> {
    try {
      const services = await device.services();
      logger.info({
        message: 'Available services for button monitoring',
        context: {
          deviceId: device.id,
          deviceName: device.name,
          serviceCount: services.length,
          serviceUUIDs: services.map((s) => s.uuid),
        },
      });

      // Handle device-specific button monitoring
      if (await this.setupAinaButtonMonitoring(device, services)) {
        return;
      }

      if (await this.setupB01InricoButtonMonitoring(device, services)) {
        return;
      }

      if (await this.setupHYSButtonMonitoring(device, services)) {
        return;
      }

      // Generic button monitoring for standard devices
      await this.setupGenericButtonMonitoring(device, services);
    } catch (error) {
      logger.warn({
        message: 'Could not set up button event monitoring',
        context: { deviceId: device.id, error },
      });
    }
  }

  private async setupAinaButtonMonitoring(device: Device, services: Service[]): Promise<boolean> {
    try {
      const ainaService = services.find((s) => s.uuid.toUpperCase() === AINA_HEADSET_SERVICE.toUpperCase());

      if (!ainaService) {
        return false;
      }

      logger.info({
        message: 'Setting up AINA headset button monitoring',
        context: { deviceId: device.id },
      });

      const characteristics = await ainaService.characteristics();
      const buttonChar = characteristics.find((char) => char.uuid.toUpperCase() === AINA_HEADSET_SVC_PROP.toUpperCase() && (char.isNotifiable || char.isIndicatable));

      if (buttonChar) {
        this.buttonSubscription = buttonChar.monitor((error, characteristic) => {
          if (error) {
            logger.error({
              message: 'AINA button monitoring error',
              context: { error },
            });
            return;
          }

          if (characteristic?.value) {
            this.handleAinaButtonEvent(characteristic.value);
          }
        });

        logger.info({
          message: 'AINA button event monitoring established',
          context: { deviceId: device.id, characteristicUuid: buttonChar.uuid },
        });

        return true;
      }
    } catch (error) {
      logger.debug({
        message: 'Failed to set up AINA button monitoring',
        context: { error },
      });
    }

    return false;
  }

  private async setupB01InricoButtonMonitoring(device: Device, services: Service[]): Promise<boolean> {
    try {
      const inricoService = services.find((s) => s.uuid.toUpperCase() === B01INRICO_HEADSET_SERVICE.toUpperCase());

      if (!inricoService) {
        return false;
      }

      logger.info({
        message: 'Setting up B01 Inrico headset button monitoring',
        context: { deviceId: device.id },
      });

      const characteristics = await inricoService.characteristics();
      const buttonChar = characteristics.find((char) => char.uuid.toUpperCase() === B01INRICO_HEADSET_SERVICE_CHAR.toUpperCase() && (char.isNotifiable || char.isIndicatable));

      if (buttonChar) {
        this.buttonSubscription = buttonChar.monitor((error, characteristic) => {
          if (error) {
            logger.error({
              message: 'B01 Inrico button monitoring error',
              context: { error },
            });
            return;
          }

          if (characteristic?.value) {
            this.handleB01InricoButtonEvent(characteristic.value);
          }
        });

        logger.info({
          message: 'B01 Inrico button event monitoring established',
          context: { deviceId: device.id, characteristicUuid: buttonChar.uuid },
        });

        return true;
      }
    } catch (error) {
      logger.debug({
        message: 'Failed to set up B01 Inrico button monitoring',
        context: { error },
      });
    }

    return false;
  }

  private async setupHYSButtonMonitoring(device: Device, services: Service[]): Promise<boolean> {
    try {
      const hysService = services.find((s) => s.uuid.toUpperCase() === HYS_HEADSET_SERVICE.toUpperCase());

      if (!hysService) {
        return false;
      }

      logger.info({
        message: 'Setting up HYS headset button monitoring',
        context: { deviceId: device.id },
      });

      const characteristics = await hysService.characteristics();
      const buttonChar = characteristics.find((char) => char.uuid.toUpperCase() === HYS_HEADSET_SERVICE_CHAR.toUpperCase() && (char.isNotifiable || char.isIndicatable));

      if (buttonChar) {
        this.buttonSubscription = buttonChar.monitor((error, characteristic) => {
          if (error) {
            logger.error({
              message: 'HYS button monitoring error',
              context: { error },
            });
            return;
          }

          if (characteristic?.value) {
            this.handleHYSButtonEvent(characteristic.value);
          }
        });

        logger.info({
          message: 'HYS button event monitoring established',
          context: { deviceId: device.id, characteristicUuid: buttonChar.uuid },
        });

        return true;
      }
    } catch (error) {
      logger.debug({
        message: 'Failed to set up HYS button monitoring',
        context: { error },
      });
    }

    return false;
  }

  private async setupGenericButtonMonitoring(device: Device, services: Service[]): Promise<void> {
    for (const service of services) {
      for (const buttonUuid of BUTTON_CONTROL_UUIDS) {
        try {
          const characteristics = await service.characteristics();
          const buttonChar = characteristics.find((char) => char.uuid.toUpperCase() === buttonUuid.toUpperCase() && (char.isNotifiable || char.isIndicatable));

          if (buttonChar) {
            this.buttonSubscription = buttonChar.monitor((error, characteristic) => {
              if (error) {
                logger.error({
                  message: 'Generic button monitoring error',
                  context: { error },
                });
                return;
              }

              if (characteristic?.value) {
                this.handleGenericButtonEvent(characteristic.value);
              }
            });

            logger.info({
              message: 'Generic button event monitoring established',
              context: { deviceId: device.id, characteristicUuid: buttonChar.uuid },
            });

            return;
          }
        } catch (charError) {
          logger.debug({
            message: 'Failed to set up button monitoring for characteristic',
            context: { uuid: buttonUuid, error: charError },
          });
        }
      }
    }
  }

  private handleAinaButtonEvent(data: string): void {
    try {
      const buffer = Buffer.from(data, 'base64');
      logger.info({
        message: 'AINA button data received',
        context: {
          dataLength: buffer.length,
          rawData: buffer.toString('hex'),
        },
      });

      // AINA-specific button parsing
      const buttonEvent = this.parseAinaButtonData(buffer);
      if (buttonEvent) {
        this.processButtonEvent(buttonEvent);
      }
    } catch (error) {
      logger.error({
        message: 'Failed to handle AINA button event',
        context: { error },
      });
    }
  }

  private handleB01InricoButtonEvent(data: string): void {
    try {
      const buffer = Buffer.from(data, 'base64');
      logger.info({
        message: 'B01 Inrico button data received',
        context: {
          dataLength: buffer.length,
          rawData: buffer.toString('hex'),
        },
      });

      // B01 Inrico-specific button parsing
      const buttonEvent = this.parseB01InricoButtonData(buffer);
      if (buttonEvent) {
        this.processButtonEvent(buttonEvent);
      }
    } catch (error) {
      logger.error({
        message: 'Failed to handle B01 Inrico button event',
        context: { error },
      });
    }
  }

  private handleHYSButtonEvent(data: string): void {
    try {
      const buffer = Buffer.from(data, 'base64');
      logger.info({
        message: 'HYS button data received',
        context: {
          dataLength: buffer.length,
          rawData: buffer.toString('hex'),
        },
      });

      // HYS-specific button parsing
      const buttonEvent = this.parseHYSButtonData(buffer);
      if (buttonEvent) {
        this.processButtonEvent(buttonEvent);
      }
    } catch (error) {
      logger.error({
        message: 'Failed to handle HYS button event',
        context: { error },
      });
    }
  }

  private handleGenericButtonEvent(data: string): void {
    try {
      const buffer = Buffer.from(data, 'base64');
      logger.info({
        message: 'Generic button data received',
        context: {
          dataLength: buffer.length,
          rawData: buffer.toString('hex'),
        },
      });

      // Generic button parsing
      const buttonEvent = this.parseGenericButtonData(buffer);
      if (buttonEvent) {
        this.processButtonEvent(buttonEvent);
      }
    } catch (error) {
      logger.error({
        message: 'Failed to handle generic button event',
        context: { error },
      });
    }
  }

  private parseAinaButtonData(buffer: Buffer): AudioButtonEvent | null {
    if (buffer.length === 0) return null;

    // AINA-specific parsing logic
    const byte = buffer[0];

    let buttonType: AudioButtonEvent['button'] = 'unknown';
    let eventType: AudioButtonEvent['type'] = 'press';

    // AINA button mapping (adjust based on actual AINA protocol)
    switch (byte) {
      case 0x00:
        buttonType = 'ptt_stop';
        break;
      case 0x01:
        buttonType = 'ptt_start';
        break;
      case 0x02:
        buttonType = 'mute';
        break;
      case 0x03:
        buttonType = 'volume_up';
        break;
      case 0x04:
        buttonType = 'volume_down';
        break;
    }

    // Check for long press (adjust based on AINA protocol)
    if (buffer.length > 1 && buffer[1] === 0xff) {
      eventType = 'long_press';
    }

    return {
      type: eventType,
      button: buttonType,
      timestamp: Date.now(),
    };
  }

  private parseB01InricoButtonData(buffer: Buffer): AudioButtonEvent | null {
    if (buffer.length === 0) return null;

    // Log all raw button data for debugging
    const rawHex = buffer.toString('hex');
    const allBytes = Array.from(buffer)
      .map((b) => `0x${b.toString(16).padStart(2, '0')}`)
      .join(', ');

    logger.info({
      message: 'B01 Inrico raw button data analysis',
      context: {
        bufferLength: buffer.length,
        rawHex,
        allBytes,
        firstByte: `0x${buffer[0].toString(16).padStart(2, '0')}`,
        secondByte: buffer.length > 1 ? `0x${buffer[1].toString(16).padStart(2, '0')}` : 'N/A',
      },
    });

    // B01 Inrico-specific parsing logic
    const byte = buffer[0];
    const byte2 = buffer[5] || 0; // Fallback to 0 if not present

    let buttonType: AudioButtonEvent['button'] = 'unknown';
    let eventType: AudioButtonEvent['type'] = 'press';

    // Updated B01 Inrico button mapping based on common protocols
    // Note: These mappings may need adjustment based on actual device protocol
    switch (byte) {
      case 0x00:
        buttonType = 'ptt_stop';
        break;
      case 0x01:
        buttonType = 'ptt_start';
        break;
      case 0x02:
        buttonType = 'mute';
        break;
      case 0x03:
        buttonType = 'volume_up';
        break;
      case 0x04:
        buttonType = 'volume_down';
        break;
      case 0x05:
        buttonType = 'unknown'; // Emergency or special button
        break;
      // Original mappings as fallback
      case 0x10:
        buttonType = 'ptt_start';
        break;
      case 0x11:
        buttonType = 'ptt_stop';
        break;
      case 0x20:
        buttonType = 'mute';
        break;
      case 0x30:
        buttonType = 'volume_up';
        break;
      case 0x40:
        buttonType = 'volume_down';
        break;
      case 43:
        if (byte2 === 80) {
          buttonType = 'ptt_start';
        } else if (byte2 === 82) {
          buttonType = 'ptt_stop';
        }
        break;
      default:
        logger.warn({
          message: 'Unknown B01 Inrico button code received',
          context: {
            byte: `0x${byte.toString(16).padStart(2, '0')}`,
            decimal: byte,
            binary: `0b${byte.toString(2).padStart(8, '0')}`,
            rawBuffer: rawHex,
          },
        });
        buttonType = 'unknown';
    }

    // Check for long press patterns
    if (buffer.length > 1) {
      const secondByte = buffer[1];
      if (secondByte === 0x01 || secondByte === 0xff) {
        eventType = 'long_press';
      } else if (secondByte === 0x02) {
        eventType = 'double_press';
      }
    }

    // Alternative long press detection using bit masking
    if ((byte & 0x80) === 0x80) {
      eventType = 'long_press';
      // Remove the long press bit to get the actual button code
      const actualButtonByte = byte & 0x7f;
      logger.info({
        message: 'B01 Inrico long press detected via bit mask',
        context: {
          originalByte: `0x${byte.toString(16).padStart(2, '0')}`,
          actualButtonByte: `0x${actualButtonByte.toString(16).padStart(2, '0')}`,
        },
      });

      // Re-check button mapping with the actual button byte (without long press flag)
      switch (actualButtonByte) {
        case 0x00:
          buttonType = 'ptt_stop';
          break;
        case 0x01:
          buttonType = 'ptt_start';
          break;
        case 0x02:
          buttonType = 'mute';
          break;
        case 0x03:
          buttonType = 'volume_up';
          break;
        case 0x04:
          buttonType = 'volume_down';
          break;
        case 0x05:
          buttonType = 'unknown'; // Emergency or special button
          break;
        // Original mappings as fallback for the masked byte
        case 0x10:
          buttonType = 'ptt_start';
          break;
        case 0x11:
          buttonType = 'ptt_stop';
          break;
        case 0x20:
          buttonType = 'mute';
          break;
        case 0x30:
          buttonType = 'volume_up';
          break;
        case 0x40:
          buttonType = 'volume_down';
          break;
      }
    }

    const result = {
      type: eventType,
      button: buttonType,
      timestamp: Date.now(),
    };

    logger.info({
      message: 'B01 Inrico button event parsed',
      context: {
        rawData: rawHex,
        parsedEvent: result,
        isKnownButton: buttonType !== 'unknown',
      },
    });

    return result;
  }

  private parseHYSButtonData(buffer: Buffer): AudioButtonEvent | null {
    if (buffer.length === 0) return null;

    // HYS-specific parsing logic
    const byte = buffer[0];

    let buttonType: AudioButtonEvent['button'] = 'unknown';
    let eventType: AudioButtonEvent['type'] = 'press';

    // HYS button mapping (adjust based on actual HYS protocol)
    switch (byte) {
      case 0x01:
        buttonType = 'ptt_start';
        break;
      case 0x00:
        buttonType = 'ptt_stop';
        break;
      case 0x02:
        buttonType = 'mute';
        break;
      case 0x03:
        buttonType = 'volume_up';
        break;
      case 0x04:
        buttonType = 'volume_down';
        break;
      case 0x05:
        buttonType = 'unknown'; // Emergency button - using unknown as placeholder
        break;
    }

    // Check for long press (adjust based on HYS protocol)
    if (buffer.length > 1 && buffer[1] === 0x01) {
      eventType = 'long_press';
    } else if (buffer.length > 1 && buffer[1] === 0x02) {
      eventType = 'double_press';
    }

    return {
      type: eventType,
      button: buttonType,
      timestamp: Date.now(),
    };
  }

  private parseGenericButtonData(buffer: Buffer): AudioButtonEvent | null {
    // This is a simplified parser - real implementation would depend on device specs
    if (buffer.length === 0) return null;

    const byte = buffer[0];

    // Example parsing logic (varies by manufacturer)
    let buttonType: AudioButtonEvent['button'] = 'unknown';
    let eventType: AudioButtonEvent['type'] = 'press';

    switch (byte & 0x0f) {
      case 0x00:
        buttonType = 'ptt_start';
        break;
      case 0x01:
        buttonType = 'ptt_stop';
        break;
      case 0x02:
        buttonType = 'volume_up';
        break;
      case 0x03:
        buttonType = 'volume_down';
        break;
      case 0x04:
        buttonType = 'mute';
        break;
    }

    if (byte & 0x80) {
      eventType = 'long_press';
    } else if (byte & 0x40) {
      eventType = 'double_press';
    }

    return {
      type: eventType,
      button: buttonType,
      timestamp: Date.now(),
    };
  }

  private processButtonEvent(buttonEvent: AudioButtonEvent): void {
    logger.info({
      message: 'Button event processed',
      context: { buttonEvent },
    });

    useBluetoothAudioStore.getState().addButtonEvent(buttonEvent);

    // Handle mute/unmute events
    if (buttonEvent.button === 'mute') {
      this.handleMuteToggle();
      return;
    }

    if (buttonEvent.button === 'ptt_start') {
      this.setMicrophoneEnabled(true);
      return;
    }

    if (buttonEvent.button === 'ptt_stop') {
      this.setMicrophoneEnabled(false);
      return;
    }

    // Handle volume events
    if (buttonEvent.button === 'volume_up' || buttonEvent.button === 'volume_down') {
      this.handleVolumeChange(buttonEvent.button);
    }
  }

  private async handleVolumeChange(direction: 'volume_up' | 'volume_down'): Promise<void> {
    logger.info({
      message: 'Volume change requested via Bluetooth button',
      context: { direction },
    });

    useBluetoothAudioStore.getState().setLastButtonAction({
      action: direction,
      timestamp: Date.now(),
    });

    // Add volume control logic here if needed
    // This would typically involve native audio controls
  }

  private handleButtonEvent(data: string): void {
    // Keep the original method for backward compatibility
    this.handleGenericButtonEvent(data);
  }

  private async handleMuteToggle(): Promise<void> {
    const liveKitStore = useLiveKitStore.getState();
    if (liveKitStore.currentRoom) {
      const currentMuteState = !liveKitStore.currentRoom.localParticipant.isMicrophoneEnabled;

      try {
        await liveKitStore.currentRoom.localParticipant.setMicrophoneEnabled(currentMuteState);

        logger.info({
          message: 'Microphone toggled via Bluetooth button',
          context: { enabled: currentMuteState },
        });

        useBluetoothAudioStore.getState().setLastButtonAction({
          action: currentMuteState ? 'unmute' : 'mute',
          timestamp: Date.now(),
        });

        if (currentMuteState) {
          await audioService.playStartTransmittingSound();
        } else {
          await audioService.playStopTransmittingSound();
        }
      } catch (error) {
        logger.error({
          message: 'Failed to toggle microphone via Bluetooth button',
          context: { error },
        });
      }
    }
  }

  private async setMicrophoneEnabled(enabled: boolean): Promise<void> {
    const liveKitStore = useLiveKitStore.getState();
    if (liveKitStore.currentRoom) {
      const currentMuteState = !liveKitStore.currentRoom.localParticipant.isMicrophoneEnabled;

      try {
        if (enabled && !currentMuteState) return; // already enabled
        if (!enabled && currentMuteState) return; // already disabled

        await liveKitStore.currentRoom.localParticipant.setMicrophoneEnabled(currentMuteState);

        logger.info({
          message: 'Microphone toggled via Bluetooth button',
          context: { enabled: currentMuteState },
        });

        useBluetoothAudioStore.getState().setLastButtonAction({
          action: enabled ? 'unmute' : 'mute',
          timestamp: Date.now(),
        });

        if (enabled) {
          await audioService.playStartTransmittingSound();
        } else {
          await audioService.playStopTransmittingSound();
        }
      } catch (error) {
        logger.error({
          message: 'Failed to toggle microphone via Bluetooth button',
          context: { error },
        });
      }
    }
  }

  private async setupLiveKitAudioRouting(device: Device): Promise<void> {
    try {
      // Note: Audio routing in React Native/LiveKit typically requires native modules
      // This is a placeholder for the integration logic

      logger.info({
        message: 'Setting up LiveKit audio routing to Bluetooth device',
        context: { deviceId: device.id, deviceName: device.name },
      });

      const bluetoothStore = useBluetoothAudioStore.getState();
      const deviceName = device.name || 'Bluetooth Device';

      // Add Bluetooth device to available audio devices
      const bluetoothAudioDevice = {
        id: device.id,
        name: deviceName,
        type: 'bluetooth' as const,
        isAvailable: true,
      };

      // Update available audio devices list
      const currentDevices = bluetoothStore.availableAudioDevices.filter((d) => d.type !== 'bluetooth');
      bluetoothStore.setAvailableAudioDevices([...currentDevices, bluetoothAudioDevice]);

      // If device supports microphone, set it as selected microphone
      if (this.supportsMicrophoneControl(device)) {
        bluetoothStore.setSelectedMicrophone(bluetoothAudioDevice);
      }

      // Set as selected speaker
      bluetoothStore.setSelectedSpeaker(bluetoothAudioDevice);

      // In a real implementation, you would:
      // 1. Use native modules to route audio to the Bluetooth device
      // 2. Configure LiveKit's audio context to use the Bluetooth device as input/output
      // 3. Set audio session category and options appropriately

      bluetoothStore.setAudioRoutingActive(true);

      // Notify LiveKit store about audio device change
      // This would trigger any necessary audio context updates
    } catch (error) {
      logger.error({
        message: 'Failed to setup LiveKit audio routing',
        context: { error },
      });
      throw error;
    }
  }

  private revertLiveKitAudioRouting(): void {
    try {
      logger.info({
        message: 'Reverting LiveKit audio routing to default',
      });

      const bluetoothStore = useBluetoothAudioStore.getState();

      // Remove Bluetooth devices from available audio devices
      const nonBluetoothDevices = bluetoothStore.availableAudioDevices.filter((d) => d.type !== 'bluetooth');
      bluetoothStore.setAvailableAudioDevices(nonBluetoothDevices);

      // Revert to default audio devices
      const defaultMic = nonBluetoothDevices.find((d) => d.type === 'default' && d.id.includes('mic'));
      const defaultSpeaker = nonBluetoothDevices.find((d) => d.type === 'default' && d.id.includes('speaker'));

      if (defaultMic) {
        bluetoothStore.setSelectedMicrophone(defaultMic);
      }
      if (defaultSpeaker) {
        bluetoothStore.setSelectedSpeaker(defaultSpeaker);
      }

      // Revert audio routing to default (phone speaker/microphone)
      bluetoothStore.setAudioRoutingActive(false);
    } catch (error) {
      logger.error({
        message: 'Failed to revert LiveKit audio routing',
        context: { error },
      });
    }
  }

  async disconnectDevice(): Promise<void> {
    if (this.connectedDevice) {
      try {
        await this.connectedDevice.cancelConnection();
        logger.info({
          message: 'Bluetooth audio device disconnected manually',
          context: { deviceId: this.connectedDevice.id },
        });
      } catch (error) {
        logger.error({
          message: 'Error disconnecting Bluetooth audio device',
          context: { error },
        });
      }

      this.handleDeviceDisconnected();
    }
  }

  async getConnectedDevice(): Promise<BluetoothAudioDevice | null> {
    return useBluetoothAudioStore.getState().connectedDevice;
  }

  async isDeviceConnected(deviceId: string): Promise<boolean> {
    if (!this.connectedDevice || this.connectedDevice.id !== deviceId) {
      return false;
    }

    try {
      const isConnected = await this.connectedDevice.isConnected();
      return isConnected;
    } catch {
      return false;
    }
  }

  /**
   * Debug method to test B01 Inrico button mappings
   * Use this method to manually test button codes and determine the correct mapping
   */
  public testB01InricoButtonMapping(hexString: string): AudioButtonEvent | null {
    try {
      // Convert hex string to buffer (e.g., "01" -> Buffer([0x01]))
      const cleanHex = hexString.replace(/[^0-9A-Fa-f]/g, '');
      const buffer = Buffer.from(cleanHex, 'hex');

      logger.info({
        message: 'Testing B01 Inrico button mapping',
        context: {
          inputHex: hexString,
          cleanHex,
          buffer: Array.from(buffer).map((b) => `0x${b.toString(16).padStart(2, '0')}`),
        },
      });

      const result = this.parseB01InricoButtonData(buffer);

      logger.info({
        message: 'B01 Inrico button mapping test result',
        context: {
          inputHex: hexString,
          parsedResult: result,
        },
      });

      return result;
    } catch (error) {
      logger.error({
        message: 'Error testing B01 Inrico button mapping',
        context: { hexString, error },
      });
      return null;
    }
  }

  destroy(): void {
    this.stopScanning();
    this.disconnectDevice();
    //if (this.connectionSubscription) {
    //  this.connectionSubscription.remove();
    //}
    this.connectionSubscription = null;
    if (this.buttonSubscription) {
      this.buttonSubscription.remove();
    }
    this.bleManager.destroy();
  }
}

export const bluetoothAudioService = BluetoothAudioService.getInstance();
