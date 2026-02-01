import { AudioSession } from '@livekit/react-native';
import notifee, { AndroidImportance } from '@notifee/react-native';
import { getRecordingPermissionsAsync, requestRecordingPermissionsAsync } from 'expo-audio';
import { Audio } from 'expo-av';
import { ConnectionState, Room, RoomEvent } from 'livekit-client';
import { Platform } from 'react-native';
import { set } from 'zod';
import { create } from 'zustand';

import { getCanConnectToVoiceSession, getDepartmentVoiceSettings } from '../../api/voice';
import { logger } from '../../lib/logging';
import { type DepartmentVoiceChannelResultData } from '../../models/v4/voice/departmentVoiceResultData';
import { audioService } from '../../services/audio.service';
import { callKeepService } from '../../services/callkeep.service';
import { headsetButtonService } from '../../services/headset-button.service';
import { toggleMicrophone } from '../../utils/microphone-toggle';
import { useBluetoothAudioStore } from './bluetooth-audio-store';

// Module level timestamp for debounce
let lastLocalMuteChangeTimestamp = 0;

// Helper function to setup audio routing based on selected devices
const setupAudioRouting = async (room: Room): Promise<void> => {
  try {
    const bluetoothStore = useBluetoothAudioStore.getState();
    const { selectedAudioDevices } = bluetoothStore;
    const speaker = selectedAudioDevices.speaker;

    logger.info({
      message: 'Setting up audio routing',
      context: {
        speakerType: speaker?.type,
        speakerName: speaker?.name,
        platform: Platform.OS,
      },
    });

    if (Platform.OS === 'android') {
      let outputType = 'speaker'; // default

      if (speaker?.type === 'bluetooth') {
        outputType = 'bluetooth';
      } else if (speaker?.type === 'wired') {
        outputType = 'headset';
      } else if (speaker?.type === 'speaker') {
        outputType = 'speaker';
      } else {
        outputType = 'earpiece';
      }

      logger.debug({ message: `Routing audio to ${outputType} on Android` });

      try {
        // Ensure we are in a call-compatible mode
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          staysActiveInBackground: true,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: outputType !== 'speaker',
        });

        if (outputType === 'bluetooth') {
          await AudioSession.startAudioSession();
        }

        await AudioSession.selectAudioOutput(outputType);
      } catch (e) {
        logger.warn({ message: 'Failed to select audio output via AudioSession', context: { error: e } });
      }
    } else if (Platform.OS === 'ios') {
      // AudioSession.startAudioSession(); // Handled by CallKeep - DO NOT call this here for iOS

      if (speaker?.type === 'bluetooth') {
        // Bluetooth preferred
        await AudioSession.setAppleAudioConfiguration({
          audioCategory: 'playAndRecord',
          audioCategoryOptions: ['allowBluetooth', 'allowBluetoothA2DP', 'mixWithOthers'],
          audioMode: 'voiceChat',
        });
      } else if (speaker?.type === 'speaker') {
        // Force speaker
        await AudioSession.setAppleAudioConfiguration({
          audioCategory: 'playAndRecord',
          audioCategoryOptions: ['defaultToSpeaker', 'mixWithOthers'],
          audioMode: 'videoChat',
        });
      } else {
        // Earpiece / Default
        await AudioSession.setAppleAudioConfiguration({
          audioCategory: 'playAndRecord',
          audioCategoryOptions: ['mixWithOthers'],
          audioMode: 'voiceChat',
        });
      }
    }
  } catch (error) {
    logger.error({
      message: 'Failed to setup audio routing',
      context: { error },
    });
  }
};

interface LiveKitState {
  // Connection state
  isConnected: boolean;
  isConnecting: boolean;
  currentRoom: Room | null;
  currentRoomInfo: DepartmentVoiceChannelResultData | null;
  isTalking: boolean;
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
  setAvailableRooms: (rooms: DepartmentVoiceChannelResultData[]) => void;
  setIsBottomSheetVisible: (visible: boolean) => void;

  // Room operations
  connectToRoom: (roomInfo: DepartmentVoiceChannelResultData, token: string) => Promise<void>;
  disconnectFromRoom: () => void;
  fetchVoiceSettings: () => Promise<void>;
  fetchCanConnectToVoice: () => Promise<void>;
  requestPermissions: () => Promise<void>;

  // Microphone control
  toggleMicrophone: () => Promise<void>;
  setMicrophoneEnabled: (enabled: boolean) => Promise<void>;

  // Headset button PTT
  startHeadsetButtonMonitoring: () => Promise<void>;
  stopHeadsetButtonMonitoring: () => void;
}

export const useLiveKitStore = create<LiveKitState>((set, get) => ({
  isConnected: false,
  isConnecting: false,
  currentRoom: null,
  currentRoomInfo: null,
  isTalking: false,
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
  setAvailableRooms: (rooms) => set({ availableRooms: rooms }),
  setIsBottomSheetVisible: (visible) => set({ isBottomSheetVisible: visible }),

  requestPermissions: async () => {
    try {
      if (Platform.OS === 'android' || Platform.OS === 'ios') {
        // Use expo-audio for both Android and iOS microphone permissions
        const micPermission = await getRecordingPermissionsAsync();

        if (!micPermission.granted) {
          const result = await requestRecordingPermissionsAsync();
          if (!result.granted) {
            logger.error({
              message: 'Microphone permission not granted',
              context: { platform: Platform.OS },
            });
            return;
          }
        }

        logger.info({
          message: 'Microphone permission granted successfully',
          context: { platform: Platform.OS },
        });

        // Note: Foreground service permissions are typically handled at the manifest level
        // and don't require runtime permission requests. They are automatically granted
        // when the app is installed if declared in AndroidManifest.xml
        if (Platform.OS === 'android') {
          logger.debug({
            message: 'Foreground service permissions are handled at manifest level',
          });
        }
      }
    } catch (error) {
      logger.error({
        message: 'Failed to request permissions',
        context: { error, platform: Platform.OS },
      });
    }
  },

  connectToRoom: async (roomInfo, token) => {
    try {
      const { currentRoom, voipServerWebsocketSslAddress } = get();

      // On Android 14+ (SDK 34+), we MUST have RECORD_AUDIO permission granted
      // BEFORE starting a foreground service with microphone type.
      // This is a security requirement - the app must be "eligible" to use the microphone.
      if (Platform.OS === 'android') {
        const micPermission = await getRecordingPermissionsAsync();
        if (!micPermission.granted) {
          const result = await requestRecordingPermissionsAsync();
          if (!result.granted) {
            logger.error({
              message: 'Cannot connect to room - microphone permission denied',
              context: { platform: Platform.OS },
            });
            throw new Error('Microphone permission is required to join a voice channel');
          }
        }
        logger.info({
          message: 'Microphone permission verified before starting foreground service',
        });
      }

      // Disconnect from current room if connected
      if (currentRoom) {
        currentRoom.disconnect();
      }

      set({ isConnecting: true });

      // Create a new room with default options to ensure no auto-publish if possible
      const room = new Room({
        // Prevent auto-publishing if that's a default behavior (though usually it isn't)
        publishDefaults: {
          // Additional config can go here
        },
      });

      // Setup room event listeners
      room.on(RoomEvent.ParticipantConnected, (participant) => {
        logger.info({
          message: 'A participant connected',
          context: { participantIdentity: participant.identity },
        });
        // Play connection sound when others join
        if (participant.identity !== room.localParticipant.identity) {
          //audioService.playConnectToAudioRoomSound();
        }
      });

      // Register CallKeep listeners for iOS & Android
      if (Platform.OS !== 'web') {
        // Sync mute state from CallKeep to LiveKit
        // Sync mute state from CallKeep to LiveKit
        callKeepService.setMuteStateCallback((muted: boolean) => {
          // DEBOUNCE: Ignore CallKeep events if they happen too close to a local action
          // This prevents the "Oscillation Loop" (Device -> CallKeep -> App -> CallKeep -> Device)
          const now = Date.now();
          if (now - lastLocalMuteChangeTimestamp < 500) {
            logger.debug({
              message: 'Ignoring CallKeep mute event (Debounce)',
              context: { muted, timeSinceLastAction: now - lastLocalMuteChangeTimestamp },
            });
            return;
          }

          const { selectedAudioDevices, connectedDevice } = useBluetoothAudioStore.getState();
          logger.debug({
            message: 'CallKeep mute callback received',
            context: { muted, connectedDeviceId: connectedDevice?.id },
          });

          const currentState = get();
          if (currentState.isConnected && currentState.currentRoom) {
            const shouldBeEnabled = !muted;
            const isEnabled = currentState.currentRoom.localParticipant.isMicrophoneEnabled;

            if (isEnabled !== shouldBeEnabled) {
              logger.info({ message: 'Syncing mute state from CallKit', context: { muted, shouldBeEnabled } });
              currentState.setMicrophoneEnabled(shouldBeEnabled);
            } else {
              logger.debug({ message: 'Ignoring duplicate CallKeep mute state' });
            }
          }
        });

        // Handle end call (double tap on Airpods)
        callKeepService.setEndCallCallback(() => {
          const currentState = get();
          if (currentState.isConnected) {
            logger.info({ message: 'CallKeep Triggered End Call' });
            currentState.disconnectFromRoom();
          }
        });
      }

      room.on(RoomEvent.ParticipantDisconnected, (participant) => {
        logger.info({
          message: 'A participant disconnected',
          context: { participantIdentity: participant.identity },
        });
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

      set({
        currentRoom: room,
        currentRoomInfo: roomInfo,
        isConnected: true,
        isConnecting: false,
      });

      // Set microphone to muted by default, camera to disabled (audio-only call)
      // This ensures we start in a known state.
      logger.info({ message: 'Setting initial microphone state to MUTED (False)' });
      await room.localParticipant.setMicrophoneEnabled(false);
      await room.localParticipant.setCameraEnabled(false);

      // Setup audio routing based on selected devices
      await setupAudioRouting(room);

      await audioService.playConnectToAudioRoomSound();

      // Start CallKeep call (iOS & Android)
      if (Platform.OS !== 'web') {
        // Using a generic handle or room name
        const roomName = roomInfo?.Name || 'Voice Channel';
        callKeepService
          .startCall(roomName)
          .then(async () => {
            // Simple initialization: Sync Mute State
            // We start muted.
            try {
              await callKeepService.setMuted(true);
              logger.info({ message: 'CallKeep initial mute state set to TRUE' });
            } catch (error) {
              logger.warn({ message: 'Failed to set initial CallKeep mute', context: { error } });
            }

            // We now handle mute events from CallKeep even for PTT devices,
            // relying on debounce logic to prevent loops.
            logger.info({ message: 'CallKeep started' });
          })
          .catch((e) => logger.warn({ message: 'Failed to start CallKeep', context: { error: e } }));
      }

      try {
        const startForegroundService = async () => {
          notifee.registerForegroundService(async () => {
            // Minimal function with no interval or tasks to reduce strain on the main thread
            return new Promise(() => {
              logger.debug({
                message: 'Foreground service registered',
              });
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

        if (Platform.OS === 'android') {
          await startForegroundService();
        }
      } catch (error) {
        logger.error({
          message: 'Failed to register foreground service',
          context: { error },
        });
      }

      // Start headset button monitoring for PTT
      try {
        await headsetButtonService.initialize();
        headsetButtonService.startMonitoring();
        useBluetoothAudioStore.getState().setIsHeadsetButtonMonitoring(true);

        logger.info({
          message: 'Headset button monitoring started for PTT (AirPods/Bluetooth earbuds)',
        });
      } catch (error) {
        logger.error({
          message: 'Failed to start headset button monitoring',
          context: { error },
        });
      }
    } catch (error) {
      logger.error({
        message: 'Failed to connect to room',
        context: { error },
      });
      set({ isConnecting: false });
    }
  },

  disconnectFromRoom: async () => {
    const { currentRoom } = get();
    if (currentRoom) {
      // Stop headset button monitoring
      try {
        headsetButtonService.stopMonitoring();
        useBluetoothAudioStore.getState().setIsHeadsetButtonMonitoring(false);

        logger.info({
          message: 'Headset button monitoring stopped',
        });
      } catch (error) {
        logger.error({
          message: 'Failed to stop headset button monitoring',
          context: { error },
        });
      }

      await currentRoom.disconnect();
      await audioService.playDisconnectedFromAudioRoomSound();

      // Small delay on iOS to allow sound to play before CallKeep potentially kills audio session
      if (Platform.OS === 'ios') {
        await new Promise((resolve) => setTimeout(resolve, 800));
      }

      // End CallKeep call (iOS & Android)
      if (Platform.OS !== 'web') {
        callKeepService.endCall().catch((e) => logger.warn({ message: 'Failed to end CallKeep', context: { error: e } }));
        callKeepService.setMuteStateCallback(null);
        callKeepService.setEndCallCallback(null);
      }

      try {
        await notifee.stopForegroundService();
      } catch (error) {
        logger.error({
          message: 'Failed to stop foreground service',
          context: { error },
        });
      }
      set({
        currentRoom: null,
        currentRoomInfo: null,
        isConnected: false,
      });
    }
  },

  fetchVoiceSettings: async () => {
    try {
      const response = await getDepartmentVoiceSettings();

      let rooms: DepartmentVoiceChannelResultData[] = [];
      if (response.Data.VoiceEnabled && response.Data?.Channels) {
        rooms.push(...response.Data.Channels);
      }

      set({
        isVoiceEnabled: response.Data.VoiceEnabled,
        voipServerWebsocketSslAddress: response.Data.VoipServerWebsocketSslAddress,
        callerIdName: response.Data.CallerIdName,
        canConnectApiToken: response.Data.CanConnectApiToken,
        availableRooms: rooms,
      });
    } catch (error) {
      logger.error({
        message: 'Failed to fetch rooms',
        context: { error },
      });
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
      logger.error({
        message: 'Failed to fetch can connect to voice',
        context: { error },
      });
    }
  },

  toggleMicrophone: async () => {
    const { currentRoom } = get();
    await toggleMicrophone(currentRoom);
  },

  setMicrophoneEnabled: async (enabled: boolean) => {
    const { currentRoom } = get();
    if (!currentRoom) {
      logger.warn({ message: 'Cannot set microphone state - no active room' });
      return;
    }

    // Safeguard: Do not attempt to publish/unpublish if room is not connected
    if (currentRoom.state !== ConnectionState.Connected) {
      logger.warn({
        message: 'Ignored microphone state change - room not connected',
        context: { state: currentRoom.state, desiredEnabled: enabled },
      });
      return;
    }

    try {
      const currentState = currentRoom.localParticipant.isMicrophoneEnabled;
      if (currentState === enabled) return; // Already in desired state

      await currentRoom.localParticipant.setMicrophoneEnabled(enabled);

      logger.info({
        message: 'Microphone state set',
        context: { enabled },
      });

      // Update bluetooth audio store with the action
      useBluetoothAudioStore.getState().setLastButtonAction({
        action: enabled ? 'unmute' : 'mute',
        timestamp: Date.now(),
      });

      // Update timestamp for debounce
      lastLocalMuteChangeTimestamp = Date.now();

      // Sync headset state
      headsetButtonService.setMicrophoneState(enabled);

      // Sync CallKeep state (iOS & Android)
      if (Platform.OS !== 'web') {
        callKeepService.setMuted(!enabled);
      }

      // Play sound feedback
      if (enabled) {
        await audioService.playStartTransmittingSound();
      } else {
        await audioService.playStopTransmittingSound();
      }
    } catch (error) {
      logger.error({
        message: 'Failed to set microphone state',
        context: { error },
      });
    }
  },

  startHeadsetButtonMonitoring: async () => {
    try {
      // Initialize and start headset button service
      await headsetButtonService.initialize();
      headsetButtonService.startMonitoring();
      useBluetoothAudioStore.getState().setIsHeadsetButtonMonitoring(true);

      logger.info({
        message: 'Headset button monitoring started for PTT',
      });
    } catch (error) {
      logger.error({
        message: 'Failed to start headset button monitoring',
        context: { error },
      });
    }
  },

  stopHeadsetButtonMonitoring: () => {
    try {
      headsetButtonService.stopMonitoring();
      useBluetoothAudioStore.getState().setIsHeadsetButtonMonitoring(false);

      logger.info({
        message: 'Headset button monitoring stopped',
      });
    } catch (error) {
      logger.error({
        message: 'Failed to stop headset button monitoring',
        context: { error },
      });
    }
  },
}));

// Subscribe to bluetooth store changes to trigger audio routing updates
useBluetoothAudioStore.subscribe((state, prevState) => {
  if (state.selectedAudioDevices !== prevState.selectedAudioDevices) {
    const room = useLiveKitStore.getState().currentRoom;
    if (room) {
      setupAudioRouting(room);
    }
  }
});
