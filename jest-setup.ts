import '@testing-library/react-native/extend-expect';

// react-hook form setup for testing
// @ts-ignore
global.window = {};
// @ts-ignore
global.window = global;

// Enable Jest fake timers globally for proper timer handling
jest.useFakeTimers();

// Polyfill setImmediate if needed (for React Native environment)
if (typeof global.setImmediate === 'undefined') {
  // @ts-ignore - Simple polyfill for setImmediate
  global.setImmediate = (callback: (...args: any[]) => void, ...args: any[]) => {
    return setTimeout(callback, 0, ...args);
  };
}

// Mock react-native-svg to prevent SVG-related errors
jest.mock('react-native-svg', () => {
  const React = require('react');
  const { View } = require('react-native');

  // Mock all SVG components as simple Views
  const mockSvgComponent = (props: any) => React.createElement(View, props);

  return {
    __esModule: true,
    default: mockSvgComponent,
    Svg: mockSvgComponent,
    Circle: mockSvgComponent,
    Ellipse: mockSvgComponent,
    G: mockSvgComponent,
    Text: mockSvgComponent,
    TSpan: mockSvgComponent,
    TextPath: mockSvgComponent,
    Path: mockSvgComponent,
    Polygon: mockSvgComponent,
    Polyline: mockSvgComponent,
    Line: mockSvgComponent,
    Rect: mockSvgComponent,
    Use: mockSvgComponent,
    Image: mockSvgComponent,
    Symbol: mockSvgComponent,
    Defs: mockSvgComponent,
    LinearGradient: mockSvgComponent,
    RadialGradient: mockSvgComponent,
    Stop: mockSvgComponent,
    ClipPath: mockSvgComponent,
    Pattern: mockSvgComponent,
    Mask: mockSvgComponent,
    Marker: mockSvgComponent,
    ForeignObject: mockSvgComponent,
    SvgXml: mockSvgComponent,
    SvgFromXml: mockSvgComponent,
    SvgCss: mockSvgComponent,
    SvgCssUri: mockSvgComponent,
    SvgUri: mockSvgComponent,
    // Add withLocalSvg for compatibility
    withLocalSvg: (component: any) => component,
  };
});

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
  useColorScheme: jest.fn(() => ({ colorScheme: 'light' })),
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

// Mock expo-audio manually using the __mocks__/expo-audio.ts file
jest.mock('expo-audio');

// Mock Platform.OS for React Native
jest.mock('react-native/Libraries/Utilities/Platform', () => ({
  OS: 'ios',
  select: jest.fn().mockImplementation((obj) => obj.ios || obj.default),
}));

// Enhanced React Native mock for better component support
jest.mock('react-native', () => {
  const React = require('react');

  // Create mock React components that render properly
  const mockComponent = (name: string) => {
    const Component = React.forwardRef((props: any, ref: any) => {
      return React.createElement('RN' + name, { ...props, ref });
    });
    Component.displayName = name;
    return Component;
  };

  const mockAnimatedComponent = (name: string) => {
    const Component = mockComponent(name);
    Component.createAnimatedComponent = (comp: any) => comp;
    return Component;
  };

  return {
    // Basic components
    View: mockComponent('View'),
    Text: mockComponent('Text'),
    Image: mockComponent('Image'),
    ScrollView: mockComponent('ScrollView'),
    TextInput: mockComponent('TextInput'),
    TouchableOpacity: mockComponent('TouchableOpacity'),
    TouchableHighlight: mockComponent('TouchableHighlight'),
    TouchableWithoutFeedback: mockComponent('TouchableWithoutFeedback'),
    Pressable: mockComponent('Pressable'),
    Button: mockComponent('Button'),
    Switch: mockComponent('Switch'),
    ActivityIndicator: mockComponent('ActivityIndicator'),
    FlatList: mockComponent('FlatList'),
    SectionList: mockComponent('SectionList'),
    VirtualizedList: mockComponent('VirtualizedList'),
    SafeAreaView: mockComponent('SafeAreaView'),
    KeyboardAvoidingView: mockComponent('KeyboardAvoidingView'),
    Modal: mockComponent('Modal'),
    RefreshControl: mockComponent('RefreshControl'),
    StatusBar: Object.assign(mockComponent('StatusBar'), {
      setBackgroundColor: jest.fn(),
      setTranslucent: jest.fn(),
      setBarStyle: jest.fn(),
      setHidden: jest.fn(),
      setNetworkActivityIndicatorVisible: jest.fn(),
    }),

    // Platform utilities
    Platform: {
      OS: 'ios',
      select: jest.fn().mockImplementation((obj) => obj.ios || obj.default),
    },

    // Dimensions
    Dimensions: {
      get: jest.fn().mockReturnValue({ width: 375, height: 667, scale: 2, fontScale: 1 }),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    },

    // useWindowDimensions hook
    useWindowDimensions: jest.fn().mockReturnValue({ width: 375, height: 667, scale: 2, fontScale: 1 }),

    // StyleSheet
    StyleSheet: {
      create: jest.fn().mockImplementation((styles) => styles),
      flatten: jest.fn().mockImplementation((style) => style),
      hairlineWidth: 1,
      absoluteFill: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
      absoluteFillObject: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
    },

    // Animated
    Animated: {
      View: mockAnimatedComponent('AnimatedView'),
      Text: mockAnimatedComponent('AnimatedText'),
      Image: mockAnimatedComponent('AnimatedImage'),
      ScrollView: mockAnimatedComponent('AnimatedScrollView'),
      FlatList: mockAnimatedComponent('AnimatedFlatList'),
      SectionList: mockAnimatedComponent('AnimatedSectionList'),
      Value: jest.fn().mockImplementation((value) => ({
        setValue: jest.fn(),
        addListener: jest.fn(),
        removeListener: jest.fn(),
        removeAllListeners: jest.fn(),
        interpolate: jest.fn().mockReturnValue({ interpolate: jest.fn() }),
        animate: jest.fn(),
        stopAnimation: jest.fn(),
        resetAnimation: jest.fn(),
        _value: value,
      })),
      ValueXY: jest.fn().mockImplementation(() => ({
        x: { setValue: jest.fn(), addListener: jest.fn(), removeListener: jest.fn() },
        y: { setValue: jest.fn(), addListener: jest.fn(), removeListener: jest.fn() },
        setValue: jest.fn(),
        addListener: jest.fn(),
        removeListener: jest.fn(),
        removeAllListeners: jest.fn(),
        getLayout: jest.fn().mockReturnValue({ left: 0, top: 0 }),
        getTranslateTransform: jest.fn().mockReturnValue([]),
      })),
      timing: jest.fn().mockReturnValue({ start: jest.fn(), stop: jest.fn(), reset: jest.fn() }),
      spring: jest.fn().mockReturnValue({ start: jest.fn(), stop: jest.fn(), reset: jest.fn() }),
      decay: jest.fn().mockReturnValue({ start: jest.fn(), stop: jest.fn(), reset: jest.fn() }),
      sequence: jest.fn().mockReturnValue({ start: jest.fn(), stop: jest.fn(), reset: jest.fn() }),
      parallel: jest.fn().mockReturnValue({ start: jest.fn(), stop: jest.fn(), reset: jest.fn() }),
      stagger: jest.fn().mockReturnValue({ start: jest.fn(), stop: jest.fn(), reset: jest.fn() }),
      loop: jest.fn().mockReturnValue({ start: jest.fn(), stop: jest.fn(), reset: jest.fn() }),
      delay: jest.fn().mockReturnValue({ start: jest.fn(), stop: jest.fn(), reset: jest.fn() }),
      createAnimatedComponent: jest.fn().mockImplementation((Component) => Component),
      event: jest.fn(),
      add: jest.fn(),
      subtract: jest.fn(),
      multiply: jest.fn(),
      divide: jest.fn(),
      modulo: jest.fn(),
      diffClamp: jest.fn(),
    },

    // Linking
    Linking: {
      canOpenURL: jest.fn().mockResolvedValue(true),
      openURL: jest.fn().mockResolvedValue(undefined),
      getInitialURL: jest.fn().mockResolvedValue(null),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    },

    // Alert
    Alert: {
      alert: jest.fn(),
      prompt: jest.fn(),
    },

    // Appearance
    Appearance: {
      getColorScheme: jest.fn(() => 'light'),
      addChangeListener: jest.fn(),
      removeChangeListener: jest.fn(),
    },

    // DeviceInfo mock
    DeviceInfo: {
      getDeviceId: jest.fn().mockReturnValue('mock-device-id'),
      isEmulator: jest.fn().mockResolvedValue(false),
      getSystemName: jest.fn().mockReturnValue('iOS'),
      getSystemVersion: jest.fn().mockReturnValue('14.0'),
    },

    // PixelRatio
    PixelRatio: {
      get: jest.fn().mockReturnValue(2),
      getFontScale: jest.fn().mockReturnValue(1),
      getPixelSizeForLayoutSize: jest.fn().mockImplementation((layoutSize) => layoutSize * 2),
      roundToNearestPixel: jest.fn().mockImplementation((layoutSize) => layoutSize),
    },

    // InteractionManager
    InteractionManager: {
      runAfterInteractions: jest.fn().mockImplementation((callback) => callback()),
      createInteractionHandle: jest.fn(),
      clearInteractionHandle: jest.fn(),
      setDeadline: jest.fn(),
    },

    // AppState
    AppState: {
      currentState: 'active',
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    },

    // Keyboard
    Keyboard: {
      addListener: jest.fn(),
      removeListener: jest.fn(),
      removeAllListeners: jest.fn(),
      dismiss: jest.fn(),
    },

    // BackHandler
    BackHandler: {
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      exitApp: jest.fn(),
    },

    // Vibration
    Vibration: {
      vibrate: jest.fn(),
      cancel: jest.fn(),
    },

    // Share
    Share: {
      share: jest.fn().mockResolvedValue({ action: 'sharedAction' }),
    },

    // PanResponder
    PanResponder: {
      create: jest.fn().mockReturnValue({
        panHandlers: {},
      }),
    },

    // React Native hooks
    useColorScheme: jest.fn().mockReturnValue('light'),

    // Accessibility Info
    AccessibilityInfo: {
      announceForAccessibility: jest.fn(),
      fetch: jest.fn(),
      isBoldTextEnabled: jest.fn(),
      isGrayscaleEnabled: jest.fn(),
      isInvertColorsEnabled: jest.fn(),
      isReduceMotionEnabled: jest.fn(),
      isReduceTransparencyEnabled: jest.fn(),
      isScreenReaderEnabled: jest.fn().mockResolvedValue(false),
      setAccessibilityFocus: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    },
  };
});

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
  executionEnvironment: 'storeClient',
  isDevice: true,
}));

// Mock @expo/html-elements to prevent font scaling errors
jest.mock('@expo/html-elements', () => {
  const React = require('react');
  const { Text, View } = require('react-native');

  const createMockElement = (defaultStyle = {}) => React.forwardRef((props: any, ref: any) => React.createElement(props.children ? Text : View, { ...props, style: [defaultStyle, props.style], ref }));

  return {
    H1: createMockElement({ fontSize: 32, fontWeight: 'bold' }),
    H2: createMockElement({ fontSize: 24, fontWeight: 'bold' }),
    H3: createMockElement({ fontSize: 18, fontWeight: 'bold' }),
    H4: createMockElement({ fontSize: 16, fontWeight: 'bold' }),
    H5: createMockElement({ fontSize: 14, fontWeight: 'bold' }),
    H6: createMockElement({ fontSize: 12, fontWeight: 'bold' }),
    P: createMockElement({ fontSize: 14 }),
    A: createMockElement({ color: 'blue' }),
    BR: createMockElement(),
    CODE: createMockElement({ fontFamily: 'monospace' }),
    EM: createMockElement({ fontStyle: 'italic' }),
    STRONG: createMockElement({ fontWeight: 'bold' }),
    SPAN: createMockElement(),
    ARTICLE: createMockElement(),
    ASIDE: createMockElement(),
    BLOCKQUOTE: createMockElement(),
    FOOTER: createMockElement(),
    HEADER: createMockElement(),
    MAIN: createMockElement(),
    NAV: createMockElement(),
    SECTION: createMockElement(),
    DETAILS: createMockElement(),
    MARK: createMockElement({ backgroundColor: 'yellow' }),
    PRE: createMockElement({ fontFamily: 'monospace' }),
    Q: createMockElement(),
    S: createMockElement({ textDecorationLine: 'line-through' }),
    SUB: createMockElement({ fontSize: 10 }),
    SUP: createMockElement({ fontSize: 10 }),
    TIME: createMockElement(),
    U: createMockElement({ textDecorationLine: 'underline' }),
  };
});

// Mock @legendapp/motion to prevent animation-related errors
jest.mock('@legendapp/motion', () => {
  const React = require('react');
  const { View, Text } = require('react-native');

  const createMockMotionComponent = (baseComponent: any) => React.forwardRef((props: any, ref: any) => React.createElement(baseComponent, { ...props, ref }));

  return {
    Motion: {
      View: createMockMotionComponent(View),
      Text: createMockMotionComponent(Text),
      ScrollView: createMockMotionComponent(View),
      FlatList: createMockMotionComponent(View),
      Pressable: createMockMotionComponent(View),
    },
    AnimatePresence: ({ children }: any) => children,
    createMotionAnimatedComponent: (component: any) => component,
    MotionComponentProps: {},
    // Mock easing functions
    Easing: {
      linear: jest.fn(),
      ease: jest.fn(),
      quad: jest.fn(),
      cubic: jest.fn(),
      poly: jest.fn(),
      sin: jest.fn(),
      circle: jest.fn(),
      exp: jest.fn(),
      elastic: jest.fn(),
      back: jest.fn(),
      bounce: jest.fn(),
      bezier: jest.fn(),
      steps: jest.fn(),
      in: jest.fn(),
      out: jest.fn(),
      inOut: jest.fn(),
    },
  };
});

// Mock react-native-mmkv to avoid native module errors in tests
jest.mock('react-native-mmkv', () => {
  const mockStorage = new Map();

  const MMKV = jest.fn().mockImplementation(() => ({
    getString: jest.fn().mockImplementation((key: string) => mockStorage.get(key) || null),
    set: jest.fn().mockImplementation((key: string, value: any) => mockStorage.set(key, value)),
    delete: jest.fn().mockImplementation((key: string) => mockStorage.delete(key)),
    clearAll: jest.fn().mockImplementation(() => mockStorage.clear()),
    contains: jest.fn().mockImplementation((key: string) => mockStorage.has(key)),
    getBoolean: jest.fn().mockImplementation((key: string) => {
      const value = mockStorage.get(key);
      return value === 'true' || value === true;
    }),
    getNumber: jest.fn().mockImplementation((key: string) => {
      const value = mockStorage.get(key);
      return value ? Number(value) : 0;
    }),
    getAllKeys: jest.fn().mockImplementation(() => Array.from(mockStorage.keys())),
  }));

  const useMMKVBoolean = jest.fn().mockImplementation((key: string) => {
    const value = mockStorage.get(key);
    const boolValue = value !== undefined ? value === 'true' || value === true : false;
    const setter = jest.fn().mockImplementation((newValue: boolean) => {
      mockStorage.set(key, newValue);
    });
    return [boolValue, setter];
  });

  const useMMKVString = jest.fn().mockImplementation((key: string) => {
    const value = mockStorage.get(key);
    const setter = jest.fn().mockImplementation((newValue: string) => {
      mockStorage.set(key, newValue);
    });
    return [value || null, setter];
  });

  const useMMKVNumber = jest.fn().mockImplementation((key: string) => {
    const value = mockStorage.get(key);
    const numberValue = value ? Number(value) : 0;
    const setter = jest.fn().mockImplementation((newValue: number) => {
      mockStorage.set(key, newValue);
    });
    return [numberValue, setter];
  });

  return {
    MMKV,
    useMMKVBoolean,
    useMMKVString,
    useMMKVNumber,
  };
});
// Mock expo-modules-core for NativeUnimoduleProxy
jest.mock('expo-modules-core', () => ({
  NativeUnimoduleProxy: {},
  // Mock requireOptionalNativeModule to prevent errors in expo-asset and expo-av
  requireOptionalNativeModule: jest.fn(() => null),
  // Provide EventEmitter stub for modules requiring event listeners
  EventEmitter: jest.fn().mockImplementation(() => ({
    addListener: jest.fn(),
    removeAllListeners: jest.fn(),
    removeSubscription: jest.fn(),
    emit: jest.fn(),
  })),
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

// Mock react-native-webview to avoid TurboModule errors
jest.mock('react-native-webview', () => {
  const React = require('react');
  const { View } = require('react-native');

  const WebView = (props: any) => {
    return React.createElement(View, props);
  };

  return {
    WebView,
    default: WebView,
  };
});

// Mock react-native-safe-area-context to avoid NativeModulesProxy errors
jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const { View } = require('react-native');

  const SafeAreaView = (props: any) => {
    return React.createElement(View, props);
  };

  return {
    SafeAreaView,
    SafeAreaProvider: ({ children }: any) => children,
    useSafeAreaInsets: jest.fn(() => ({ top: 0, bottom: 0, left: 0, right: 0 })),
    useSafeAreaFrame: jest.fn(() => ({ x: 0, y: 0, width: 375, height: 667 })),
    initialWindowMetrics: {
      insets: { top: 0, bottom: 0, left: 0, right: 0 },
      frame: { x: 0, y: 0, width: 375, height: 667 },
    },
  };
});

// Mock expo-navigation-bar for navigation bar controls
jest.mock('expo-navigation-bar', () => ({
  setVisibilityAsync: jest.fn().mockResolvedValue(undefined),
  getVisibilityAsync: jest.fn().mockResolvedValue('visible'),
  setBackgroundColorAsync: jest.fn().mockResolvedValue(undefined),
  getBackgroundColorAsync: jest.fn().mockResolvedValue('#ffffff'),
  setBehaviorAsync: jest.fn().mockResolvedValue(undefined),
  setPositionAsync: jest.fn().mockResolvedValue(undefined),
}));

// Mock react-native-edge-to-edge for system bars
jest.mock('react-native-edge-to-edge', () => {
  const React = require('react');

  return {
    SystemBars: (props: any) => {
      return null; // SystemBars is just for system UI styling, can return null in tests
    },
  };
});

// Mock @shopify/flash-list
jest.mock('@shopify/flash-list', () => {
  const React = require('react');
  const { FlatList } = require('react-native');

  return {
    FlashList: React.forwardRef((props: any, ref: any) => {
      return React.createElement(FlatList, { ...props, ref });
    }),
  };
});
