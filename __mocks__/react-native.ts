// Mock React Native for Jest testing environment
export const Platform = {
  OS: 'ios',
  select: jest.fn().mockImplementation((obj) => obj.ios || obj.default),
};

export const PermissionsAndroid = {
  PERMISSIONS: {
    BLUETOOTH_SCAN: 'android.permission.BLUETOOTH_SCAN',
    BLUETOOTH_CONNECT: 'android.permission.BLUETOOTH_CONNECT',
    ACCESS_FINE_LOCATION: 'android.permission.ACCESS_FINE_LOCATION',
  },
  RESULTS: {
    GRANTED: 'granted',
    DENIED: 'denied',
    NEVER_ASK_AGAIN: 'never_ask_again',
  },
  requestMultiple: jest.fn(),
  request: jest.fn(),
};

export const DeviceEventEmitter = {
  addListener: jest.fn(),
  removeAllListeners: jest.fn(),
  emit: jest.fn(),
};

export const Alert = {
  alert: jest.fn(),
};

export const Linking = {
  canOpenURL: jest.fn().mockResolvedValue(true),
  openURL: jest.fn().mockResolvedValue(undefined),
};

export const useColorScheme = jest.fn().mockReturnValue('light');

export const useWindowDimensions = jest.fn().mockReturnValue({
  width: 375,
  height: 812,
});

// Mock other commonly used React Native components
export const View = 'View';
export const Text = 'Text';
export const ScrollView = 'ScrollView';
export const StyleSheet = {
  create: jest.fn().mockImplementation((styles) => styles),
};

// Export default
export default {
  Platform,
  PermissionsAndroid,
  DeviceEventEmitter,
  Alert,
  Linking,
  View,
  Text,
  StyleSheet,
  useColorScheme,
};
