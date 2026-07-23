import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

jest.mock('expo-notifications', () => ({
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  removeNotificationSubscription: jest.fn(),
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  deleteNotificationChannelAsync: jest.fn(),
  getDevicePushTokenAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getPermissionsAsync: jest.fn(),
  getLastNotificationResponseAsync: jest.fn(() => Promise.resolve(null)),
  AndroidImportance: { MAX: 5 },
  AndroidNotificationVisibility: { PUBLIC: 1 },
}));

jest.mock('@/lib/logging', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));
jest.mock('@/lib/auth', () => ({ useAuthStore: { getState: jest.fn() } }));
jest.mock('@/lib/storage/app', () => ({ getDeviceUuid: jest.fn() }));
jest.mock('@/api/devices/push', () => ({ registerDevice: jest.fn(), registerUnitDevice: jest.fn() }));
jest.mock('@/stores/push-notification/store', () => ({
  usePushNotificationModalStore: { getState: jest.fn(() => ({ showNotificationModal: jest.fn() })) },
  parseNotificationData: jest.fn(() => ({ type: 'unknown', id: '', eventCode: '' })),
}));
jest.mock('@/stores/security/store', () => ({ securityStore: { getState: jest.fn(() => ({})) } }));
jest.mock('@/components/weather-alerts/weather-alert-navigation', () => ({ openWeatherAlertDetail: jest.fn() }));

const setChannelMock = Notifications.setNotificationChannelAsync as jest.Mock;
const deleteChannelMock = Notifications.deleteNotificationChannelAsync as jest.Mock;

describe('Core-controlled Android notification channels', () => {
  let channelConfigs: Record<string, Record<string, unknown>>;

  beforeAll(async () => {
    (Platform as { OS: string }).OS = 'android';
    require('../push-notification');

    // Flush the singleton's asynchronous initialization.
    for (let i = 0; i < 100; i++) {
      await Promise.resolve();
    }

    channelConfigs = {};
    setChannelMock.mock.calls.forEach(([id, config]) => {
      channelConfigs[id] = config;
    });
  });

  afterAll(() => {
    (Platform as { OS: string }).OS = 'ios';
  });

  it('keeps the standard channel ids Core targets', () => {
    expect(Object.keys(channelConfigs)).toEqual(expect.arrayContaining(['calls', '0', '1', '2', '3', 'notif', 'message']));
  });

  it('uses the established channel sound contract without a client preference', () => {
    expect(channelConfigs['calls']?.sound).toBeUndefined();
    expect(channelConfigs['0']?.sound).toBe('callemergency');
    expect(channelConfigs['1']?.sound).toBe('callhigh');
    expect(channelConfigs['2']?.sound).toBe('callmedium');
    expect(channelConfigs['3']?.sound).toBe('calllow');
    expect(channelConfigs['notif']?.sound).toBeUndefined();
    expect(channelConfigs['message']?.sound).toBeUndefined();
  });

  it('does not delete and recreate channels based on a local sound choice', () => {
    expect(deleteChannelMock).not.toHaveBeenCalled();
  });

  it('keeps all custom call-tone channels available for Core', () => {
    for (let i = 1; i <= 25; i++) {
      expect(channelConfigs[`c${i}`]?.sound).toBe(`c${i}`);
    }
  });
});
