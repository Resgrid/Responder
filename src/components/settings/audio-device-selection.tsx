import { CheckCircle, Headphones, Mic, Speaker } from 'lucide-react-native';
import React from 'react';
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
  const { availableAudioDevices, selectedAudioDevices, setSelectedMicrophone, setSelectedSpeaker } = useBluetoothAudioStore();

  const renderDeviceIcon = (device: AudioDeviceInfo) => {
    switch (device.type) {
      case 'bluetooth':
        return <Headphones size={20} color="#2563eb" />;
      case 'wired':
        return <Headphones size={20} color="#16a34a" />;
      case 'speaker':
        return <Speaker size={20} color="#dc2626" />;
      default:
        return <Mic size={20} color="#6b7280" />;
    }
  };

  const renderDeviceItem = (device: AudioDeviceInfo, isSelected: boolean, onSelect: () => void, deviceType: 'microphone' | 'speaker') => (
    <Pressable key={`${deviceType}-${device.id}`} onPress={onSelect}>
      <Card className={`mb-2 p-4 ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
        <HStack className="items-center justify-between">
          <HStack className="flex-1 items-center" space="md">
            {renderDeviceIcon(device)}
            <VStack className="flex-1">
              <Text className={`font-medium ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>{device.name}</Text>
              <Text className={`text-sm ${isSelected ? 'text-blue-700' : 'text-gray-500'}`}>
                {device.type.charAt(0).toUpperCase() + device.type.slice(1)} Device
                {!device.isAvailable ? ' (Unavailable)' : ''}
              </Text>
            </VStack>
          </HStack>
          {isSelected && <CheckCircle size={20} color="#2563eb" />}
        </HStack>
      </Card>
    </Pressable>
  );

  const availableMicrophones = availableAudioDevices.filter((device) => (device.type === 'bluetooth' ? device.isAvailable : true));

  const availableSpeakers = availableAudioDevices.filter((device) => device.isAvailable);

  return (
    <ScrollView className="flex-1">
      <VStack space="lg" className="p-4">
        {showTitle && (
          <Heading size="lg" className="text-gray-900">
            Audio Device Selection
          </Heading>
        )}

        {/* Microphone Selection */}
        <VStack space="md">
          <HStack className="items-center" space="sm">
            <Mic size={24} color="#374151" />
            <Heading size="md" className="text-gray-800">
              Microphone
            </Heading>
          </HStack>

          {availableMicrophones.length > 0 ? (
            availableMicrophones.map((device) => renderDeviceItem(device, selectedAudioDevices.microphone?.id === device.id, () => setSelectedMicrophone(device), 'microphone'))
          ) : (
            <Card className="border-gray-200 p-4">
              <Text className="text-center text-gray-500">No microphones available</Text>
            </Card>
          )}
        </VStack>

        {/* Speaker Selection */}
        <VStack space="md">
          <HStack className="items-center" space="sm">
            <Speaker size={24} color="#374151" />
            <Heading size="md" className="text-gray-800">
              Speaker
            </Heading>
          </HStack>

          {availableSpeakers.length > 0 ? (
            availableSpeakers.map((device) => renderDeviceItem(device, selectedAudioDevices.speaker?.id === device.id, () => setSelectedSpeaker(device), 'speaker'))
          ) : (
            <Card className="border-gray-200 p-4">
              <Text className="text-center text-gray-500">No speakers available</Text>
            </Card>
          )}
        </VStack>

        {/* Current Selection Summary */}
        <Card className="border-blue-200 bg-blue-50 p-4">
          <VStack space="sm">
            <Heading size="sm" className="text-blue-900">
              Current Selection
            </Heading>

            <HStack className="items-center justify-between">
              <Text className="text-blue-800">Microphone:</Text>
              <Text className="font-medium text-blue-900">{selectedAudioDevices.microphone?.name || 'None selected'}</Text>
            </HStack>

            <HStack className="items-center justify-between">
              <Text className="text-blue-800">Speaker:</Text>
              <Text className="font-medium text-blue-900">{selectedAudioDevices.speaker?.name || 'None selected'}</Text>
            </HStack>
          </VStack>
        </Card>
      </VStack>
    </ScrollView>
  );
};
