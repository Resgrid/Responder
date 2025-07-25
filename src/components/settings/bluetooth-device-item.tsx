import { BluetoothIcon, ChevronRightIcon } from 'lucide-react-native';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { HStack } from '@/components/ui/hstack';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { VStack } from '@/components/ui/vstack';
import { usePreferredBluetoothDevice } from '@/lib/hooks/use-preferred-bluetooth-device';
import { useBluetoothAudioStore } from '@/stores/app/bluetooth-audio-store';

import { BluetoothDeviceSelectionBottomSheet } from './bluetooth-device-selection-bottom-sheet';

export const BluetoothDeviceItem = () => {
  const { t } = useTranslation();
  const { preferredDevice } = usePreferredBluetoothDevice();
  const { connectedDevice } = useBluetoothAudioStore();
  const [showDeviceSelection, setShowDeviceSelection] = useState(false);

  const deviceDisplayName = React.useMemo(() => {
    if (preferredDevice) {
      return preferredDevice.name;
    }
    return t('bluetooth.no_device_selected');
  }, [preferredDevice, t]);

  const connectionStatus = React.useMemo(() => {
    if (connectedDevice && connectedDevice.id === preferredDevice?.id) {
      return t('bluetooth.connected');
    }
    if (preferredDevice) {
      return t('bluetooth.not_connected');
    }
    return null;
  }, [connectedDevice, preferredDevice, t]);

  return (
    <>
      <Pressable onPress={() => setShowDeviceSelection(true)} className="flex-1 flex-row items-center justify-between px-4 py-2">
        <HStack className="flex-row items-center">
          <VStack>
            <Text className="text-info-600">{t('bluetooth.audio_device')}</Text>
            {connectionStatus && <Text className={`text-xs ${connectedDevice?.id === preferredDevice?.id ? 'text-green-600' : 'text-neutral-500'}`}>{connectionStatus}</Text>}
          </VStack>
        </HStack>
        <HStack className="flex-row items-center">
          <Text className="text-neutral-600 dark:text-neutral-300">{deviceDisplayName}</Text>
          <View className="pl-2">
            <ChevronRightIcon size={16} className="text-neutral-400" />
          </View>
        </HStack>
      </Pressable>

      <BluetoothDeviceSelectionBottomSheet isOpen={showDeviceSelection} onClose={() => setShowDeviceSelection(false)} />
    </>
  );
};
