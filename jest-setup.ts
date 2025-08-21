import '@testing-library/react-native/extend-expect';

// react-hook form setup for testing
// @ts-ignore
global.window = {};
// @ts-ignore
global.window = global;

// Mock React Native Appearance for NativeWind
jest.mock('react-native/Libraries/Utilities/Appearance', () => ({
  getColorScheme: jest.fn(() => 'light'),
  addChangeListener: jest.fn(),
  removeChangeListener: jest.fn(),
}));

// Mock NativeWind
jest.mock('nativewind', () => ({
  cssInterop: jest.fn(),
  styled: jest.fn(() => (Component: any) => Component),
}));

// Mock react-native-css-interop
jest.mock('react-native-css-interop', () => ({
  getColorScheme: jest.fn(() => 'light'),
  appearanceObservables: {
    getColorScheme: jest.fn(() => 'light'),
  },
}));

jest.mock('react-native-css-interop/src/runtime/native/appearance-observables', () => ({
  getColorScheme: jest.fn(() => 'light'),
}));

// Mock expo-audio globally
jest.mock('expo-audio', () => ({
  createAudioPlayer: jest.fn(() => ({
    play: jest.fn(),
    pause: jest.fn(),
    remove: jest.fn(),
    replace: jest.fn(),
    seekTo: jest.fn(),
    playing: false,
    paused: false,
    isLoaded: true,
    duration: 0,
    currentTime: 0,
    volume: 1,
    muted: false,
    loop: false,
    playbackRate: 1,
    id: 1,
    isAudioSamplingSupported: false,
    isBuffering: false,
    shouldCorrectPitch: false,
  })),
  useAudioPlayer: jest.fn(),
  useAudioPlayerStatus: jest.fn(),
  setAudioModeAsync: jest.fn(),
  setIsAudioActiveAsync: jest.fn(),
}));

// Mock Platform.OS for React Native
jest.mock('react-native/Libraries/Utilities/Platform', () => ({
  OS: 'ios',
  select: jest.fn().mockImplementation((obj) => obj.ios || obj.default),
}));

// Mock useFocusEffect from react-navigation
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (callback: () => void) => callback(),
}));

// Global mocks for common problematic modules
jest.mock('@notifee/react-native', () => {
  const mockNotifee = {
    createChannel: jest.fn().mockResolvedValue('mock-channel-id'),
    displayNotification: jest.fn().mockResolvedValue('mock-notification-id'),
    requestPermission: jest.fn().mockResolvedValue({ authorizationStatus: 1 }),
    getPermissionSettings: jest.fn().mockResolvedValue({ authorizationStatus: 1 }),
    setBadgeCount: jest.fn().mockResolvedValue(undefined),
    decrementBadgeCount: jest.fn().mockResolvedValue(undefined),
    incrementBadgeCount: jest.fn().mockResolvedValue(undefined),
    getBadgeCount: jest.fn().mockResolvedValue(0),
    cancelNotification: jest.fn().mockResolvedValue(undefined),
    cancelAllNotifications: jest.fn().mockResolvedValue(undefined),
    onForegroundEvent: jest.fn(),
    onBackgroundEvent: jest.fn(),
    getInitialNotification: jest.fn().mockResolvedValue(null),
    getDisplayedNotifications: jest.fn().mockResolvedValue([]),
    getTriggerNotifications: jest.fn().mockResolvedValue([]),
    openBatteryOptimizationSettings: jest.fn().mockResolvedValue(undefined),
    openNotificationSettings: jest.fn().mockResolvedValue(undefined),
    openPowerManagerSettings: jest.fn().mockResolvedValue(undefined),
    getPowerManagerInfo: jest.fn().mockResolvedValue({}),
    isBatteryOptimizationEnabled: jest.fn().mockResolvedValue(false),
    registerForegroundService: jest.fn().mockResolvedValue(undefined),
    stopForegroundService: jest.fn().mockResolvedValue(undefined),
  };

  const AndroidImportance = {
    DEFAULT: 'default',
    HIGH: 'high',
    LOW: 'low',
    MIN: 'min',
    NONE: 'none',
    UNSPECIFIED: 'unspecified',
  };

  return {
    __esModule: true,
    default: mockNotifee,
    AndroidImportance,
  };
});

jest.mock('livekit-client', () => ({
  Room: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    off: jest.fn(),
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    localParticipant: {
      setMicrophoneEnabled: jest.fn().mockResolvedValue(undefined),
    },
    participants: new Map(),
    state: 'disconnected',
    name: 'test-room',
  })),
  RoomEvent: {
    Connected: 'connected',
    Disconnected: 'disconnected',
    ParticipantConnected: 'participantConnected',
    ParticipantDisconnected: 'participantDisconnected',
    TrackSubscribed: 'trackSubscribed',
    TrackUnsubscribed: 'trackUnsubscribed',
    LocalTrackPublished: 'localTrackPublished',
    LocalTrackUnpublished: 'localTrackUnpublished',
  },
  ConnectionState: {
    Connected: 'connected',
    Connecting: 'connecting',
    Disconnected: 'disconnected',
    Reconnecting: 'reconnecting',
  },
}));

jest.mock('react-native-permissions', () => ({
  PERMISSIONS: {
    ANDROID: {
      RECORD_AUDIO: 'android.permission.RECORD_AUDIO',
      CAMERA: 'android.permission.CAMERA',
    },
    IOS: {
      MICROPHONE: 'ios.permission.MICROPHONE',
      CAMERA: 'ios.permission.CAMERA',
    },
  },
  RESULTS: {
    UNAVAILABLE: 'unavailable',
    DENIED: 'denied',
    LIMITED: 'limited',
    GRANTED: 'granted',
    BLOCKED: 'blocked',
  },
  check: jest.fn().mockResolvedValue('granted'),
  request: jest.fn().mockResolvedValue('granted'),
  requestMultiple: jest.fn().mockResolvedValue({}),
  openSettings: jest.fn().mockResolvedValue(undefined),
  checkNotifications: jest.fn().mockResolvedValue({
    status: 'granted',
    settings: {},
  }),
  requestNotifications: jest.fn().mockResolvedValue({
    status: 'granted',
    settings: {},
  }),
}));
// Mock expo-secure-store to avoid requireNativeModule errors
jest.mock('expo-secure-store', () => ({
  __esModule: true,
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));
// Mock expo-constants to prevent NativeModulesProxy errors in tests
jest.mock('expo-constants', () => ({
  expoConfig: { extra: {} },
}));
// Mock expo-modules-core for NativeUnimoduleProxy
jest.mock('expo-modules-core', () => ({
  NativeUnimoduleProxy: {},
  // Mock requireOptionalNativeModule to prevent errors in expo-asset and expo-av
  requireOptionalNativeModule: jest.fn(() => null),
}));
// Mock NativeModulesProxy native module in expo-modules-core
jest.mock('expo-modules-core/src/NativeModulesProxy.native', () => ({
  NativeUnimoduleProxy: {},
}));

// Mock expo-asset to avoid import issues
jest.mock('expo-asset', () => ({
  Asset: {
    loadAsync: jest.fn().mockResolvedValue([]),
    fromModule: jest.fn().mockReturnValue({
      downloadAsync: jest.fn().mockResolvedValue(undefined),
      localUri: 'mock-uri',
      uri: 'mock-uri',
    }),
  },
}));

// Mock expo-av to avoid import issues
jest.mock('expo-av', () => ({
  Audio: {
    setAudioModeAsync: jest.fn().mockResolvedValue(undefined),
    Sound: {
      createAsync: jest.fn().mockResolvedValue({ sound: { setPositionAsync: jest.fn(), playAsync: jest.fn(), unloadAsync: jest.fn() } }),
    },
  },
  InterruptionModeAndroid: { DuckOthers: 0 },
  InterruptionModeIOS: { DoNotMix: 0 },
}));
