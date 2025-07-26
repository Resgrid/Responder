import notifee, { AndroidImportance } from '@notifee/react-native';
import { Room, RoomEvent } from 'livekit-client';
import { Platform } from 'react-native';
import { check, type Permission, PERMISSIONS, request, requestMultiple, RESULTS } from 'react-native-permissions';
import { set } from 'zod';
import { create } from 'zustand';

import { getCanConnectToVoiceSession, getDepartmentVoiceSettings } from '../../api/voice';
import { type DepartmentVoiceChannelResultData } from '../../models/v4/voice/departmentVoiceResultData';
import { audioService } from '../../services/audio.service';
import { useBluetoothAudioStore } from './bluetooth-audio-store';

// Helper function to setup audio routing based on selected devices
const setupAudioRouting = async (room: Room): Promise<void> => {
  try {
    const bluetoothStore = useBluetoothAudioStore.getState();
    const { selectedAudioDevices, connectedDevice } = bluetoothStore;

    // If we have a connected Bluetooth device, prioritize it
    if (connectedDevice && connectedDevice.hasAudioCapability) {
      console.log('Using Bluetooth device for audio routing:', connectedDevice.name);

      // Update selected devices to use Bluetooth
      const deviceName = connectedDevice.name || 'Bluetooth Device';
      const bluetoothMicrophone = connectedDevice.supportsMicrophoneControl ? { id: connectedDevice.id, name: deviceName, type: 'bluetooth' as const, isAvailable: true } : selectedAudioDevices.microphone;

      const bluetoothSpeaker = {
        id: connectedDevice.id,
        name: deviceName,
        type: 'bluetooth' as const,
        isAvailable: true,
      };

      bluetoothStore.setSelectedMicrophone(bluetoothMicrophone);
      bluetoothStore.setSelectedSpeaker(bluetoothSpeaker);

      // Note: Actual audio routing would be implemented via native modules
      // This is a placeholder for the audio routing logic
      console.log('Audio routing configured for Bluetooth device');
    } else {
      // Use default audio devices (selected devices or default)
      console.log('Using default audio devices:', selectedAudioDevices);
    }
  } catch (error) {
    console.error('Failed to setup audio routing:', error);
  }
};

interface LiveKitState {
  // Connection state
  isConnected: boolean;
  isConnecting: boolean;
  currentRoom: Room | null;
  currentRoomInfo: DepartmentVoiceChannelResultData | null;
  isTalking: boolean;
  isMicrophoneEnabled: boolean;
  isVoiceEnabled: boolean;
  voipServerWebsocketSslAddress: string;
  callerIdName: string;
  canConnectApiToken: string;
  canConnectToVoiceSession: boolean;
  // Available rooms
  availableRooms: DepartmentVoiceChannelResultData[];

  // UI state
  isBottomSheetVisible: boolean;

  // Actions
  setIsConnected: (isConnected: boolean) => void;
  setIsConnecting: (isConnecting: boolean) => void;
  setCurrentRoom: (room: Room | null) => void;
  setCurrentRoomInfo: (roomInfo: DepartmentVoiceChannelResultData | null) => void;
  setIsTalking: (isTalking: boolean) => void;
  setIsMicrophoneEnabled: (enabled: boolean) => void;
  setAvailableRooms: (rooms: DepartmentVoiceChannelResultData[]) => void;
  setIsBottomSheetVisible: (visible: boolean) => void;

  // Room operations
  connectToRoom: (roomInfo: DepartmentVoiceChannelResultData, token: string) => Promise<void>;
  disconnectFromRoom: () => void;
  toggleMicrophone: () => Promise<void>;
  fetchVoiceSettings: () => Promise<void>;
  fetchCanConnectToVoice: () => Promise<void>;
  requestPermissions: () => Promise<void>;
}

export const useLiveKitStore = create<LiveKitState>((set, get) => ({
  isConnected: false,
  isConnecting: false,
  currentRoom: null,
  currentRoomInfo: null,
  isTalking: false,
  isMicrophoneEnabled: false,
  availableRooms: [],
  isBottomSheetVisible: false,
  isVoiceEnabled: false,
  voipServerWebsocketSslAddress: '',
  callerIdName: '',
  canConnectApiToken: '',
  canConnectToVoiceSession: false,
  setIsConnected: (isConnected) => set({ isConnected }),
  setIsConnecting: (isConnecting) => set({ isConnecting }),
  setCurrentRoom: (room) => set({ currentRoom: room }),
  setCurrentRoomInfo: (roomInfo) => set({ currentRoomInfo: roomInfo }),
  setIsTalking: (isTalking) => set({ isTalking }),
  setIsMicrophoneEnabled: (enabled) => set({ isMicrophoneEnabled: enabled }),
  setAvailableRooms: (rooms) => set({ availableRooms: rooms }),
  setIsBottomSheetVisible: (visible) => set({ isBottomSheetVisible: visible }),

  requestPermissions: async () => {
    try {
      if (Platform.OS === 'android') {
        const permissions: Permission[] = [PERMISSIONS.ANDROID.RECORD_AUDIO];

        // Request the available permissions through react-native-permissions
        const result = await requestMultiple(permissions);
        const allGranted = permissions.every((permission) => result[permission] === RESULTS.GRANTED);

        if (!allGranted) {
          console.error('Permissions not granted', result);
          return;
        }

        console.log('Audio recording permission granted successfully');

        // Note: Foreground service permissions are typically handled at the manifest level
        // and don't require runtime permission requests. They are automatically granted
        // when the app is installed if declared in AndroidManifest.xml
        console.log('Foreground service permissions are handled at manifest level');
      } else if (Platform.OS === 'ios') {
        // Request microphone permission for iOS
        const micPermission = await check(PERMISSIONS.IOS.MICROPHONE);

        if (micPermission !== RESULTS.GRANTED) {
          const result = await request(PERMISSIONS.IOS.MICROPHONE);
          if (result !== RESULTS.GRANTED) {
            console.error('Microphone permission not granted on iOS');
            return;
          }
        }

        console.log('iOS microphone permission granted');
      }
    } catch (error) {
      console.error('Failed to request permissions:', error);
    }
  },

  connectToRoom: async (roomInfo, token) => {
    try {
      const { currentRoom, voipServerWebsocketSslAddress } = get();

      // Disconnect from current room if connected
      if (currentRoom) {
        currentRoom.disconnect();
      }

      set({ isConnecting: true });

      // Create a new room
      const room = new Room();

      // Setup room event listeners
      room.on(RoomEvent.ParticipantConnected, (participant) => {
        console.log('A participant connected', participant.identity);
        // Play connection sound when others join
        if (participant.identity !== room.localParticipant.identity) {
          //audioService.playConnectToAudioRoomSound();
        }
      });

      room.on(RoomEvent.ParticipantDisconnected, (participant) => {
        console.log('A participant disconnected', participant.identity);
        // Play disconnection sound when others leave
        //audioService.playDisconnectedFromAudioRoomSound();
      });

      room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
        // Check if local participant is speaking
        const localParticipant = room.localParticipant;
        const isTalking = speakers.some((speaker) => speaker.sid === localParticipant.sid);
        set({ isTalking });
      });

      // Connect to the room
      await room.connect(voipServerWebsocketSslAddress, token);

      // Set microphone to muted by default, camera to disabled (audio-only call)
      await room.localParticipant.setMicrophoneEnabled(false);
      await room.localParticipant.setCameraEnabled(false);

      // Setup audio routing based on selected devices
      await setupAudioRouting(room);

      await audioService.playConnectToAudioRoomSound();

      try {
        const startForegroundService = async () => {
          notifee.registerForegroundService(async () => {
            // Minimal function with no interval or tasks to reduce strain on the main thread
            return new Promise(() => {
              console.log('Foreground service registered.');
            });
          });

          // Step 3: Display the notification as a foreground service
          await notifee.displayNotification({
            title: 'Active PTT Call',
            body: 'There is an active PTT call in progress.',
            android: {
              channelId: 'notif',
              asForegroundService: true,
              smallIcon: 'ic_launcher', // Ensure this icon exists in res/drawable
            },
          });
        };

        await startForegroundService();
      } catch (error) {
        console.error('Failed to register foreground service:', error);
      }
      set({
        currentRoom: room,
        currentRoomInfo: roomInfo,
        isConnected: true,
        isConnecting: false,
        isMicrophoneEnabled: false,
      });
    } catch (error) {
      console.error('Failed to connect to room:', error);
      set({ isConnecting: false });
    }
  },

  disconnectFromRoom: async () => {
    const { currentRoom } = get();
    if (currentRoom) {
      await currentRoom.disconnect();
      await audioService.playDisconnectedFromAudioRoomSound();

      try {
        await notifee.stopForegroundService();
      } catch (error) {
        console.error('Failed to stop foreground service:', error);
      }
      set({
        currentRoom: null,
        currentRoomInfo: null,
        isConnected: false,
        isMicrophoneEnabled: false,
      });
    }
  },

  toggleMicrophone: async () => {
    const { currentRoom, isMicrophoneEnabled } = get();

    if (!currentRoom) {
      console.warn('Cannot toggle microphone: not connected to a room');
      return;
    }

    try {
      const newMicState = !isMicrophoneEnabled;
      await currentRoom.localParticipant.setMicrophoneEnabled(newMicState);
      set({ isMicrophoneEnabled: newMicState });

      console.log(`Microphone ${newMicState ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('Failed to toggle microphone:', error);
    }
  },

  fetchVoiceSettings: async () => {
    try {
      const response = await getDepartmentVoiceSettings();

      let rooms: DepartmentVoiceChannelResultData[] = [];
      if (response.Data.VoiceEnabled && response.Data?.Channels) {
        //rooms.push({
        //  id: '0',
        //  name: 'No Channel Selected',
        //});

        rooms.push(...response.Data.Channels);
      } //else {
      //  rooms.push({
      //    id: '0',
      //    name: 'No Channel Selected',
      //  });
      //}

      set({
        isVoiceEnabled: response.Data.VoiceEnabled,
        voipServerWebsocketSslAddress: response.Data.VoipServerWebsocketSslAddress,
        callerIdName: response.Data.CallerIdName,
        canConnectApiToken: response.Data.CanConnectApiToken,
        availableRooms: rooms,
      });
    } catch (error) {
      console.error('Failed to fetch rooms:', error);
    }
  },

  fetchCanConnectToVoice: async () => {
    try {
      const { canConnectApiToken } = get();
      const response = await getCanConnectToVoiceSession(canConnectApiToken);

      if (response && response.Data && response.Data.CanConnect) {
        set({
          canConnectToVoiceSession: response.Data.CanConnect,
        });
      } else {
        set({ canConnectToVoiceSession: false });
      }
    } catch (error) {
      console.error('Failed to fetch can connect to voice:', error);
    }
  },
}));
