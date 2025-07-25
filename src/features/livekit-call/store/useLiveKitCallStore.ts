import { ConnectionState, type LocalParticipant, type Participant, type RemoteParticipant, Room, type RoomConnectOptions, RoomEvent, type RoomOptions } from 'livekit-client'; // livekit-react-native re-exports these
import create from 'zustand';

// Configuration - Replace with your actual URL and token fetching logic
const LIVEKIT_URL = 'wss://your-livekit-server-url.com'; // TODO: Replace with your LiveKit server URL

// This is a MOCK token fetching function.
// In a real app, this would involve an async call to your backend.
const fetchLiveKitToken = async (roomId: string, participantIdentity: string): Promise<string> => {
  console.log(`Fetching token for room: ${roomId}, participant: ${participantIdentity}`);
  // Simulate API call
  await new Promise((resolve) => setTimeout(resolve, 500));
  // IMPORTANT: This is a placeholder. Never hardcode tokens or generate them client-side in production.
  // Your backend should generate this token.
  // Example token structure (simplified): create a JWT with video grants
  // For testing, you can generate one from LiveKit CLI or a server SDK.
  // return "mock-token-generated-by-server-for-" + roomId + "-" + participantIdentity;
  if (!process.env.STORYBOOK_LIVEKIT_TOKEN && LIVEKIT_URL === 'wss://your-livekit-server-url.com') {
    console.warn(
      'LIVEKIT_URL is not set, and no STORYBOOK_LIVEKIT_TOKEN is available. LiveKit connection will likely fail. Please update LIVEKIT_URL in useLiveKitCallStore.ts or provide a token via environment variables for local development if your server requires it.'
    );
    // Throw an error or return a dummy token that you know will fail, to make it clear.
    // return "INVALID_TOKEN_SETUP_MISSING"; // This will cause connection to fail.
  }
  // Prioritize env var for local dev/testing if available
  return process.env.STORYBOOK_LIVEKIT_TOKEN || '';
};

export interface RoomInfo {
  id: string;
  name: string;
}

interface LiveKitCallState {
  availableRooms: RoomInfo[];
  selectedRoomForJoining: string | null;
  currentRoomId: string | null;
  isConnecting: boolean;
  isConnected: boolean;
  roomInstance: Room | null;
  participants: Participant[]; // Includes local participant
  error: string | null;
  localParticipant: LocalParticipant | null;

  actions: {
    setSelectedRoomForJoining: (roomId: string | null) => void;
    connectToRoom: (roomId: string, participantIdentity: string) => Promise<void>;
    disconnectFromRoom: () => Promise<void>;
    setMicrophoneEnabled: (enabled: boolean) => Promise<void>;
    // Internal actions - not typically called directly from UI
    _setRoomInstance: (room: Room | null) => void;
    _setIsConnected: (isConnected: boolean) => void;
    _addParticipant: (participant: Participant) => void;
    _removeParticipant: (participantId: string) => void;
    _updateParticipants: () => void;
    _clearError: () => void;
  };
}

const initialRooms: RoomInfo[] = [
  { id: 'general-chat', name: 'General Chat' },
  { id: 'dev-team-sync', name: 'Dev Team Sync' },
  { id: 'product-updates', name: 'Product Updates' },
];

export const useLiveKitCallStore = create<LiveKitCallState>((set, get) => ({
  availableRooms: initialRooms,
  selectedRoomForJoining: null,
  currentRoomId: null,
  isConnecting: false,
  isConnected: false,
  roomInstance: null,
  participants: [],
  error: null,
  localParticipant: null,

  actions: {
    setSelectedRoomForJoining: (roomId) => set({ selectedRoomForJoining: roomId, error: null }),
    _clearError: () => set({ error: null }),

    connectToRoom: async (roomId, participantIdentity) => {
      if (get().isConnecting || get().isConnected) {
        console.warn('Connection attempt while already connecting or connected.');
        return;
      }

      set({ isConnecting: true, error: null, selectedRoomForJoining: roomId });

      try {
        const token = await fetchLiveKitToken(roomId, participantIdentity);
        if (!token || token === 'INVALID_TOKEN_SETUP_MISSING') {
          throw new Error('Failed to fetch a valid connection token.');
        }

        const roomOptions: RoomOptions = {
          adaptiveStream: true,
          dynacast: true, // Enable dynamic simulcast
        };
        const newRoom = new Room(roomOptions);

        newRoom
          .on(RoomEvent.ConnectionStateChanged, (state: ConnectionState) => {
            console.log('LiveKit Connection State Changed:', state);
            if (state === ConnectionState.Connected) {
              set({
                isConnected: true,
                isConnecting: false,
                currentRoomId: roomId,
                roomInstance: newRoom,
                localParticipant: newRoom.localParticipant,
                error: null,
              });
              get().actions._updateParticipants(); // Initial participant list
              newRoom.localParticipant.setMicrophoneEnabled(true);
              newRoom.localParticipant.setCameraEnabled(false); // No video
            } else if (state === ConnectionState.Disconnected) {
              set({
                isConnected: false,
                isConnecting: false,
                currentRoomId: null,
                roomInstance: null,
                participants: [],
                localParticipant: null,
                // Keep error if there was one leading to disconnect
              });
            } else if (state === ConnectionState.Connecting) {
              set({ isConnecting: true });
            } else if (state === ConnectionState.Reconnecting) {
              set({ isConnecting: true, error: 'Connection lost, attempting to reconnect...' });
            }
          })
          .on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
            console.log('Participant connected:', participant.identity);
            get().actions._addParticipant(participant);
          })
          .on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
            console.log('Participant disconnected:', participant.identity);
            get().actions._removeParticipant(participant.sid);
          })
          .on(RoomEvent.LocalTrackPublished, (trackPublication, participant) => {
            console.log('Local track published:', trackPublication.kind, 'by', participant.identity);
            get().actions._updateParticipants(); // Ensure local participant updates reflect
          })
          .on(RoomEvent.LocalTrackUnpublished, (trackPublication, participant) => {
            console.log('Local track unpublished:', trackPublication.kind, 'by', participant.identity);
            get().actions._updateParticipants();
          })
          .on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
            console.log(`Subscribed to track ${publication.trackSid} kind ${track.kind} from ${participant.identity}`);
            // Audio tracks are usually auto-played. No specific handling needed here for audio only.
          })
          .on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
            console.log(`Unsubscribed from track ${publication.trackSid} from ${participant.identity}`);
          })
          .on(RoomEvent.Disconnected, (reason) => {
            console.log('Disconnected from room, reason:', reason);
            // DisconnectReason is an enum of strings like 'CLIENT_INITIATED', etc.
            const reasonMsg = reason ? String(reason) : 'Unknown reason';
            set({ error: `Disconnected: ${reasonMsg}` });
            // Full cleanup is also handled by ConnectionStateChanged to Disconnected
          });

        const connectOptions: RoomConnectOptions = {
          autoSubscribe: true, // Subscribe to all tracks by default
        };

        await newRoom.connect(LIVEKIT_URL, token, connectOptions);
        // Connection success is handled by the ConnectionStateChanged event listener
      } catch (err: any) {
        console.error('Failed to connect to LiveKit room:', err);
        set({
          error: err.message || 'An unknown error occurred during connection.',
          isConnecting: false,
          isConnected: false,
          roomInstance: null,
          currentRoomId: null,
        });
        // Clean up any partially initialized room
        if (get().roomInstance) {
          await get().roomInstance?.disconnect();
          set({ roomInstance: null });
        }
      }
    },

    disconnectFromRoom: async () => {
      const room = get().roomInstance;
      if (room) {
        console.log('Disconnecting from room:', room.name);
        await room.disconnect();
        // State updates (isConnected, currentRoomId, etc.) are handled by RoomEvent.Disconnected
        // and ConnectionState.Disconnected listeners.
        set({
          roomInstance: null,
          currentRoomId: null,
          isConnected: false,
          isConnecting: false,
          participants: [],
          localParticipant: null,
          selectedRoomForJoining: null, // Reset selection
        });
      }
    },

    setMicrophoneEnabled: async (enabled: boolean) => {
      const room = get().roomInstance;
      if (room && room.localParticipant) {
        try {
          await room.localParticipant.setMicrophoneEnabled(enabled);
          get().actions._updateParticipants(); // reflect change in participant state
          console.log(`Microphone ${enabled ? 'enabled' : 'disabled'}`);
        } catch (e) {
          console.error('Error setting microphone state:', e);
          set({ error: 'Could not change microphone state.' });
        }
      }
    },

    _setRoomInstance: (room) => set({ roomInstance: room }),
    _setIsConnected: (isConnected) => set({ isConnected }),

    _addParticipant: (participant) => {
      set((state) => {
        if (!state.participants.find((p) => p.sid === participant.sid)) {
          return { participants: [...state.participants, participant] };
        }
        return {}; // No change
      });
    },
    _removeParticipant: (participantSid) => {
      set((state) => ({
        participants: state.participants.filter((p) => p.sid !== participantSid),
      }));
    },
    _updateParticipants: () => {
      const room = get().roomInstance;
      if (room) {
        // Use room.remoteParticipants which is Map<ParticipantSid, RemoteParticipant>
        const remoteParticipantsArray: RemoteParticipant[] = Array.from(room.remoteParticipants.values());
        const allParticipants: Participant[] = [room.localParticipant, ...remoteParticipantsArray];
        set({
          participants: allParticipants,
          localParticipant: room.localParticipant,
        });
      }
    },
  },
}));

// Selector for convenience
export const useLiveKit = useLiveKitCallStore;

// Example on how to listen to participant's microphone status
// This would typically be in a component that renders a participant
/*
const { isMuted } = useParticipantTrack({
  participant: remoteParticipant,
  source: Track.Source.Microphone,
  publication: remoteParticipant.getTrackPublication(Track.Source.Microphone),
});
*/
