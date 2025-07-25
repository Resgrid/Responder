import { Lock, Mic, Phone, Radio, Unlock } from 'lucide-react-native';
import * as React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { AudioStreamBottomSheet } from '@/components/audio-stream/audio-stream-bottom-sheet';
import { Text } from '@/components/ui/text';
import { useAudioStreamStore } from '@/stores/app/audio-stream-store';
import { useCoreStore } from '@/stores/app/core-store';
import { useLiveKitStore } from '@/stores/app/livekit-store';
import { useLocationStore } from '@/stores/app/location-store';

import { Card } from '../ui/card';

type ItemProps = {
  unitName: string;
  unitType: string;
  unitGroup: string;
  bgColor: string;
};

export const SidebarUnitCard = ({ unitName: defaultUnitName, unitType: defaultUnitType, unitGroup: defaultUnitGroup, bgColor }: ItemProps) => {
  const activeUnit = useCoreStore((state) => state.activeUnit);
  const { setIsBottomSheetVisible, currentRoomInfo, isConnected, isTalking } = useLiveKitStore();
  const { isMapLocked, setMapLocked } = useLocationStore();
  const { setIsBottomSheetVisible: setAudioStreamBottomSheetVisible, currentStream, isPlaying } = useAudioStreamStore();

  // Derive the display values from activeUnit when available, otherwise use defaults
  const displayName = activeUnit?.Name ?? defaultUnitName;
  const displayType = activeUnit?.Type ?? defaultUnitType;
  const displayGroup = activeUnit?.GroupName ?? defaultUnitGroup;

  const handleOpenLiveKit = () => {
    setIsBottomSheetVisible(true);
  };

  const handleToggleMapLock = () => {
    setMapLocked(!isMapLocked);
  };

  const handleOpenAudioStream = () => {
    setAudioStreamBottomSheetVisible(true);
  };

  return (
    <Card className={`flex-1 ${bgColor}`}>
      <Text className="text-sm text-gray-500">{displayType}</Text>
      <Text className="font-medium">{displayName}</Text>
      <Text className="text-sm text-gray-500">{displayGroup}</Text>

      {/* Call button and status */}
      <View style={styles.callContainer}>
        {isConnected && currentRoomInfo ? (
          <View style={styles.roomStatus}>
            <Text style={styles.roomName} numberOfLines={1} ellipsizeMode="tail">
              {currentRoomInfo.Name}
            </Text>
            {isTalking ? <Mic size={16} color="#22c55e" /> : null}
          </View>
        ) : null}

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={[styles.mapLockButton, isMapLocked ? styles.mapLockButtonActive : {}]} onPress={handleToggleMapLock} testID="map-lock-button">
            {isMapLocked ? <Lock size={18} color={isMapLocked ? '#fff' : '#007AFF'} /> : <Unlock size={18} color="#007AFF" />}
          </TouchableOpacity>

          <TouchableOpacity style={[styles.audioStreamButton, currentStream && isPlaying ? styles.audioStreamButtonActive : {}]} onPress={handleOpenAudioStream} testID="audio-stream-button">
            <Radio size={18} color={currentStream && isPlaying ? '#fff' : '#007AFF'} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.callButton, isConnected ? styles.activeCall : {}]} onPress={handleOpenLiveKit} testID="call-button">
            <Phone size={18} color={isConnected ? '#fff' : '#007AFF'} />
          </TouchableOpacity>
        </View>
      </View>
      <AudioStreamBottomSheet />
    </Card>
  );
};

const styles = StyleSheet.create({
  callContainer: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  buttonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  callButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 20,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeCall: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  mapLockButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 20,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapLockButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  audioStreamButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 20,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  audioStreamButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  roomStatus: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  roomName: {
    fontSize: 12,
    color: '#6b7280',
    marginRight: 4,
    flex: 1,
  },
});
