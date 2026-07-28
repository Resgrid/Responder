export const registerGlobals = () => {};

export const AudioSession = {
  startAudioSession: async () => {},
  stopAudioSession: async () => {},
  selectAudioOutput: async (_output?: unknown) => {},
  setAppleAudioConfiguration: async (_config?: unknown) => {},
  configureAudio: async (_config?: unknown) => {},
  getAudioOutputs: async () => [],
};

export const useRoomContext = () => {
  throw new Error('@livekit/react-native components are not supported on web');
};

export const LiveKitRoom = () => null;
export const VideoTrack = () => null;
export const VideoView = () => null;

export default {};
