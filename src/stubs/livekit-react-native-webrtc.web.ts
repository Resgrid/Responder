export const RTCAudioSession = {
  audioSessionDidActivate: () => {},
  audioSessionDidDeactivate: () => {},
  addListener: () => ({ remove: () => {} }),
  removeListeners: () => {},
};

export const RTCView = () => null;

export class MediaStream {
  id = '';
  active = false;
}

export class MediaStreamTrack {
  id = '';
  kind = '';
  enabled = true;
  stop() {}
}

export const mediaDevices = {
  getUserMedia: async () => {
    throw new Error('getUserMedia via @livekit/react-native-webrtc is not supported on web');
  },
  getDisplayMedia: async () => {
    throw new Error('getDisplayMedia via @livekit/react-native-webrtc is not supported on web');
  },
  enumerateDevices: async () => [],
};

export const registerGlobals = () => {};

export default {};
