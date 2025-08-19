import { CheckCircle, Headphones, Mic, Speaker } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView } from 'react-native';

import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { HStack } from '@/components/ui/hstack';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { type AudioDeviceInfo, useBluetoothAudioStore } from '@/stores/app/bluetooth-audio-store';

interface AudioDeviceSelectionProps {
  showTitle?: boolean;
}

export const AudioDeviceSelection: React.FC<AudioDeviceSelectionProps> = ({ showTitle = true }) => {
  const { t } = useTranslation();
  const { availableAudioDevices, selectedAudioDevices, setSelectedMicrophone, setSelectedSpeaker } = useBluetoothAudioStore();

  const renderDeviceIcon = (device: AudioDeviceInfo) => {
    switch (device.type) {
      case 'bluetooth':
        return <Headphones size={20} className="text-gray-600 dark:text-gray-400" />;
      case 'wired':
        return <Headphones size={20} className="text-gray-600 dark:text-gray-400" />;
      case 'speaker':
        return <Speaker size={20} className="text-gray-600 dark:text-gray-400" />;
      default:
        return <Mic size={20} className="text-gray-600 dark:text-gray-400" />;
    }
  };

  const getDeviceTypeLabel = (deviceType: string) => {
    switch (deviceType) {
      case 'bluetooth':
        return t('settings.audio_device_selection.bluetooth_device');
      case 'wired':
        return t('settings.audio_device_selection.wired_device');
      case 'speaker':
        return t('settings.audio_device_selection.speaker_device');
      default:
        return deviceType.charAt(0).toUpperCase() + deviceType.slice(1) + ' Device';
    }
  };

  const renderDeviceItem = (device: AudioDeviceInfo, isSelected: boolean, onSelect: () => void, deviceType: 'microphone' | 'speaker') => {
    const deviceTypeLabel = getDeviceTypeLabel(device.type);
    const unavailableText = !device.isAvailable ? ` (${t('settings.audio_device_selection.unavailable')})` : '';

    return (
      <Pressable key={`${deviceType}-${device.id}`} onPress={onSelect}>
        <Card className={`mb-2 p-4 ${isSelected ? 'border-blue-600 bg-blue-50 dark:border-blue-400 dark:bg-blue-950/30' : 'border-gray-200 dark:border-gray-700'}`}>
          <HStack className="items-center justify-between">
            <HStack className="flex-1 items-center" space="md">
              {renderDeviceIcon(device)}
              <VStack className="flex-1">
                <Text className={`font-medium ${isSelected ? 'text-blue-900 dark:text-blue-100' : 'text-gray-900 dark:text-gray-100'}`}>{device.name}</Text>
                <Text className={`text-sm ${isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-gray-500 dark:text-gray-400'}`}>
                  {deviceTypeLabel}
                  {unavailableText}
                </Text>
              </VStack>
            </HStack>
            {isSelected && <CheckCircle size={20} className="text-blue-600 dark:text-blue-400" />}
          </HStack>
        </Card>
      </Pressable>
    );
  };

  const availableMicrophones = availableAudioDevices.filter((device) => (device.type === 'bluetooth' ? device.isAvailable : true));

  const availableSpeakers = availableAudioDevices.filter((device) => device.isAvailable);

  return (
    <ScrollView className="flex-1">
      <VStack space="lg" className="p-4">
        {showTitle && (
          <Heading size="lg" className="text-gray-900 dark:text-gray-100">
            <Text>{t('settings.audio_device_selection.title')}</Text>
          </Heading>
        )}

        {/* Current Selection Summary */}
        <Card className="border-blue-200 bg-blue-50 p-4 dark:border-blue-700 dark:bg-blue-950/30">
          <VStack space="sm">
            <Heading size="sm" className="text-blue-900 dark:text-blue-100">
              <Text>{t('settings.audio_device_selection.current_selection')}</Text>
            </Heading>

            <HStack className="items-center justify-between">
              <Text className="text-blue-800 dark:text-blue-200">{t('settings.audio_device_selection.microphone')}:</Text>
              <Text className="font-medium text-blue-900 dark:text-blue-100">{selectedAudioDevices.microphone?.name || t('settings.audio_device_selection.none_selected')}</Text>
            </HStack>

            <HStack className="items-center justify-between">
              <Text className="text-blue-800 dark:text-blue-200">{t('settings.audio_device_selection.speaker')}:</Text>
              <Text className="font-medium text-blue-900 dark:text-blue-100">{selectedAudioDevices.speaker?.name || t('settings.audio_device_selection.none_selected')}</Text>
            </HStack>
          </VStack>
        </Card>

        {/* Microphone Selection */}
        <VStack space="md">
          <HStack className="items-center" space="sm">
            <Mic size={24} className="text-gray-700 dark:text-gray-300" />
            <Heading size="md" className="text-gray-800 dark:text-gray-200">
              <Text>{t('settings.audio_device_selection.microphone')}</Text>
            </Heading>
          </HStack>

          {availableMicrophones.length > 0 ? (
            availableMicrophones.map((device) => renderDeviceItem(device, selectedAudioDevices.microphone?.id === device.id, () => setSelectedMicrophone(device), 'microphone'))
          ) : (
            <Card className="border-gray-200 p-4 dark:border-gray-700">
              <Text className="text-center text-gray-500 dark:text-gray-400">{t('settings.audio_device_selection.no_microphones_available')}</Text>
            </Card>
          )}
        </VStack>

        {/* Speaker Selection */}
        <VStack space="md">
          <HStack className="items-center" space="sm">
            <Speaker size={24} className="text-gray-700 dark:text-gray-300" />
            <Heading size="md" className="text-gray-800 dark:text-gray-200">
              <Text>{t('settings.audio_device_selection.speaker')}</Text>
            </Heading>
          </HStack>

          {availableSpeakers.length > 0 ? (
            availableSpeakers.map((device) => renderDeviceItem(device, selectedAudioDevices.speaker?.id === device.id, () => setSelectedSpeaker(device), 'speaker'))
          ) : (
            <Card className="border-gray-200 p-4 dark:border-gray-700">
              <Text className="text-center text-gray-500 dark:text-gray-400">{t('settings.audio_device_selection.no_speakers_available')}</Text>
            </Card>
          )}
        </VStack>
      </VStack>
    </ScrollView>
  );
};
