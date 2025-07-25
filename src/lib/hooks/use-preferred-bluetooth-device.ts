import { useEffect } from 'react';

import { getItem, removeItem, setItem } from '@/lib/storage';
import { useBluetoothAudioStore } from '@/stores/app/bluetooth-audio-store';

const PREFERRED_BLUETOOTH_DEVICE_KEY = 'preferredBluetoothDevice';

export interface PreferredBluetoothDevice {
  id: string;
  name: string;
}

export const usePreferredBluetoothDevice = () => {
  const { preferredDevice, setPreferredDevice } = useBluetoothAudioStore();

  // Load preferred device from storage on mount
  useEffect(() => {
    const loadPreferredDevice = async () => {
      try {
        const storedDevice = getItem<PreferredBluetoothDevice>(PREFERRED_BLUETOOTH_DEVICE_KEY);
        if (storedDevice) {
          setPreferredDevice(storedDevice);
        }
      } catch (error) {
        console.warn('Failed to load preferred Bluetooth device:', error);
      }
    };

    loadPreferredDevice();
  }, [setPreferredDevice]);

  const setPreferredDeviceWithPersistence = async (device: PreferredBluetoothDevice | null) => {
    try {
      if (device) {
        await setItem(PREFERRED_BLUETOOTH_DEVICE_KEY, device);
      } else {
        await removeItem(PREFERRED_BLUETOOTH_DEVICE_KEY);
      }
      setPreferredDevice(device);
    } catch (error) {
      console.error('Failed to save preferred Bluetooth device:', error);
      // Still update the store even if persistence fails
      setPreferredDevice(device);
    }
  };

  return {
    preferredDevice,
    setPreferredDevice: setPreferredDeviceWithPersistence,
  };
};
