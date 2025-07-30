import { BluetoothIcon, RefreshCwIcon, WifiIcon } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, useWindowDimensions } from 'react-native';

import { Box } from '@/components/ui/box';
import { Button, ButtonIcon, ButtonText } from '@/components/ui/button';
import { FlatList } from '@/components/ui/flat-list';
import { Heading } from '@/components/ui/heading';
import { HStack } from '@/components/ui/hstack';
import { Pressable } from '@/components/ui/pressable';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { usePreferredBluetoothDevice } from '@/lib/hooks/use-preferred-bluetooth-device';
import { logger } from '@/lib/logging';
import { bluetoothAudioService } from '@/services/bluetooth-audio.service';
import { type BluetoothAudioDevice, useBluetoothAudioStore } from '@/stores/app/bluetooth-audio-store';

import { CustomBottomSheet } from '../ui/bottom-sheet';

interface BluetoothDeviceSelectionBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BluetoothDeviceSelectionBottomSheet({ isOpen, onClose }: BluetoothDeviceSelectionBottomSheetProps) {
  const { t } = useTranslation();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const { preferredDevice, setPreferredDevice } = usePreferredBluetoothDevice();
  const { availableDevices, isScanning, bluetoothState, connectedDevice } = useBluetoothAudioStore();
  const [hasScanned, setHasScanned] = useState(false);

  // Start scanning when sheet opens
  useEffect(() => {
    if (isOpen && !hasScanned) {
      startScan();
    }
  }, [isOpen, hasScanned]);

  const startScan = React.useCallback(async () => {
    try {
      setHasScanned(true);
      await bluetoothAudioService.startScanning(10000); // 10 second scan
    } catch (error) {
      logger.error({
        message: 'Failed to start Bluetooth scan',
        context: { error },
      });

      Alert.alert(t('bluetooth.scan_error_title'), error instanceof Error ? error.message : t('bluetooth.scan_error_message'), [{ text: t('common.ok') }]);
    }
  }, [t]);

  const handleDeviceSelect = React.useCallback(
    async (device: BluetoothAudioDevice) => {
      try {
        const selectedDevice = {
          id: device.id,
          name: device.name || t('bluetooth.unknown_device'),
        };

        await setPreferredDevice(selectedDevice);

        logger.info({
          message: 'Preferred Bluetooth device selected',
          context: { deviceId: device.id, deviceName: device.name },
        });

        onClose();
      } catch (error) {
        logger.error({
          message: 'Failed to set preferred Bluetooth device',
          context: { error },
        });

        Alert.alert(t('bluetooth.selection_error_title'), t('bluetooth.selection_error_message'), [{ text: t('common.ok') }]);
      }
    },
    [setPreferredDevice, onClose, t]
  );

  const handleClearSelection = React.useCallback(async () => {
    try {
      await setPreferredDevice(null);
      onClose();
    } catch (error) {
      logger.error({
        message: 'Failed to clear preferred Bluetooth device',
        context: { error },
      });
    }
  }, [setPreferredDevice, onClose]);

  const renderDeviceItem = useCallback(
    ({ item }: { item: BluetoothAudioDevice }) => {
      const isSelected = preferredDevice?.id === item.id;
      const isConnected = connectedDevice?.id === item.id;

      return (
        <Pressable
          onPress={() => handleDeviceSelect(item)}
          className={`mb-2 rounded-lg border p-4 ${isSelected ? 'border-primary-500 bg-primary-50 dark:bg-primary-950' : 'border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800'}`}
        >
          <HStack className="items-center justify-between">
            <VStack className="flex-1">
              <HStack className="items-center">
                <BluetoothIcon size={16} className="mr-2 text-primary-600" />
                <Text className={`font-medium ${isSelected ? 'text-primary-700 dark:text-primary-300' : 'text-neutral-900 dark:text-neutral-100'}`}>{item.name || t('bluetooth.unknown_device')}</Text>
                {isConnected && <WifiIcon size={14} className="ml-2 text-green-600" />}
              </HStack>
              <HStack className="mt-1 items-center">
                {item.rssi && <Text className="text-xs text-neutral-600 dark:text-neutral-400">RSSI: {item.rssi}dBm</Text>}
                {item.supportsMicrophoneControl && <Text className="ml-2 text-xs text-blue-600 dark:text-blue-400">{t('bluetooth.supports_mic_control')}</Text>}
              </HStack>
            </VStack>
            {isSelected && (
              <VStack className="items-end">
                <Text className="text-sm font-medium text-primary-600 dark:text-primary-400">{t('bluetooth.selected')}</Text>
              </VStack>
            )}
          </HStack>
        </Pressable>
      );
    },
    [preferredDevice, connectedDevice, handleDeviceSelect, t]
  );

  const renderEmptyState = useCallback(() => {
    if (isScanning) {
      return (
        <VStack className="items-center py-8">
          <Spinner size="large" />
          <Text className="mt-4 text-center text-neutral-600 dark:text-neutral-400">{t('bluetooth.scanning')}</Text>
        </VStack>
      );
    }

    return (
      <VStack className="items-center py-8">
        <BluetoothIcon size={48} className="text-neutral-400" />
        <Text className="mt-4 text-center text-neutral-600 dark:text-neutral-400">{hasScanned ? t('bluetooth.no_devices_found') : t('bluetooth.tap_scan_to_find_devices')}</Text>
        <Button onPress={startScan} className="mt-4" variant="outline">
          <ButtonIcon as={RefreshCwIcon} />
          <ButtonText>{t('bluetooth.scan_again')}</ButtonText>
        </Button>
      </VStack>
    );
  }, [isScanning, hasScanned, startScan, t]);

  return (
    <CustomBottomSheet isOpen={isOpen} onClose={onClose}>
      <VStack className="flex-1 p-4">
        <Heading className="mb-4 text-lg">{t('bluetooth.select_device')}</Heading>

        {/* Current Selection */}
        {preferredDevice && (
          <Box className="mb-4 rounded-lg border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-700 dark:bg-neutral-800">
            <HStack className="items-center justify-between">
              <VStack>
                <Text className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{t('bluetooth.current_selection')}</Text>
                <Text className="text-sm text-neutral-600 dark:text-neutral-400">{preferredDevice.name}</Text>
              </VStack>
              <Button onPress={handleClearSelection} size={isLandscape ? 'sm' : 'xs'} variant="outline">
                <ButtonText className={isLandscape ? '' : 'text-2xs'}>{t('bluetooth.clear')}</ButtonText>
              </Button>
            </HStack>
          </Box>
        )}

        {/* Scan Button */}
        <HStack className="mb-4 w-full items-center justify-between">
          <Text className="text-sm text-neutral-600 dark:text-neutral-400">{t('bluetooth.available_devices')}</Text>
          <Button onPress={startScan} disabled={isScanning} size={isLandscape ? 'sm' : 'xs'} variant="outline">
            <ButtonIcon as={RefreshCwIcon} />
            <ButtonText className={isLandscape ? '' : 'text-2xs'}>{isScanning ? t('bluetooth.scanning') : t('bluetooth.scan')}</ButtonText>
          </Button>
        </HStack>

        {/* Device List */}
        <FlatList data={availableDevices} renderItem={renderDeviceItem} keyExtractor={(item) => item.id} ListEmptyComponent={renderEmptyState} className="flex-1" showsVerticalScrollIndicator={false} />

        {/* Bluetooth State Info */}
        {bluetoothState !== 'PoweredOn' && (
          <Box className="mt-4 rounded-lg border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-700 dark:bg-yellow-900">
            <Text className="text-sm text-yellow-800 dark:text-yellow-200">{t('bluetooth.bluetooth_not_ready', { state: bluetoothState })}</Text>
          </Box>
        )}
      </VStack>
    </CustomBottomSheet>
  );
}
