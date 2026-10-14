import * as Notifications from 'expo-notifications';

import { registerDevice } from '@/api/devices/push';
import { runSignOutHooks } from '@/lib/auth/sign-out-hooks';
import { logger } from '@/lib/logging';

jest.mock('expo-device', () => ({ isDevice: true }));

jest.mock('expo-notifications', () => ({
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  deleteNotificationChannelAsync: jest.fn(),
  getPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  getDevicePushTokenAsync: jest.fn(() => Promise.resolve({ data: 'native-token' })),
  getLastNotificationResponseAsync: jest.fn(() => Promise.resolve(null)),
}));

jest.mock('@/lib/auth', () => {
  const state = { status: 'signedIn', userId: 'user-1' };
  const store: any = jest.fn((selector: any) => (selector ? selector(state) : state));
  store.getState = () => state;
  return { useAuthStore: store };
});

jest.mock('@/stores/push-notification/store', () => ({
  ...jest.requireActual('@/stores/push-notification/store'),
  usePushNotificationModalStore: { getState: jest.fn(() => ({ showNotificationModal: jest.fn() })) },
}));

jest.mock('@/components/weather-alerts/weather-alert-navigation', () => ({ openWeatherAlertDetail: jest.fn() }));

jest.mock('@/lib/navigation', () => ({
  routerPushWithRetry: jest.fn(() => Promise.resolve()),
  registerNavigationReadyCheck: jest.fn(),
  isNavigationReady: jest.fn(() => true),
}));

jest.mock('@/lib/logging', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } }));

jest.mock('@/lib/mfa/client-app', () => ({ CLIENT_HEADER: 'X-Resgrid-Client', RESGRID_CLIENT: 'responder' }));

jest.mock('@/lib/storage/app', () => ({
  getDeviceUuid: jest.fn(() => 'device-uuid'),
  getBaseApiUrl: jest.fn(() => 'https://api.example/api/v4'),
}));

jest.mock('@/api/devices/push', () => ({
  registerDevice: jest.fn(() => Promise.resolve({ Status: 'queued' })),
  registerUnitDevice: jest.fn(),
}));

jest.mock('@/stores/security/store', () => ({ securityStore: { getState: jest.fn(() => ({})) } }));

describe('push notification sign-out', () => {
  const originalFetch = global.fetch;
  let fetchMock: jest.Mock;
  let pushNotificationService: { registerForPushNotifications: (userId: string, code: string) => Promise<string | null> };

  beforeAll(() => {
    ({ pushNotificationService } = require('../push-notification'));
  });

  beforeEach(async () => {
    fetchMock = jest.fn(() => Promise.resolve({ ok: true, status: 200 }));
    global.fetch = fetchMock as unknown as typeof fetch;
    // Start every test from a clean slate: nothing registered.
    await runSignOutHooks(null);
    fetchMock.mockClear();
    jest.clearAllMocks();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('takes the registered token off the server as the signing-out session', async () => {
    await pushNotificationService.registerForPushNotifications('user-1', 'DEPT');
    expect(registerDevice).toHaveBeenCalledWith(expect.objectContaining({ Token: 'native-token', Prefix: 'DEPT' }));

    await runSignOutHooks('access-token');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.example/api/v4/Devices/UnRegisterNativePush');
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual(expect.objectContaining({ Authorization: 'Bearer access-token', 'X-Resgrid-Client': 'responder' }));
    expect(JSON.parse(init.body)).toEqual({ Token: 'native-token', Prefix: 'DEPT' });
  });

  it('does not call the server when the phone never registered', async () => {
    await runSignOutHooks('access-token');

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('unregisters only once per registration', async () => {
    await pushNotificationService.registerForPushNotifications('user-1', 'DEPT');

    await runSignOutHooks('access-token');
    await runSignOutHooks('access-token');

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not call the server without an access token', async () => {
    await pushNotificationService.registerForPushNotifications('user-1', 'DEPT');

    await runSignOutHooks(null);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('lets sign-out carry on when the server refuses or is unreachable', async () => {
    await pushNotificationService.registerForPushNotifications('user-1', 'DEPT');
    fetchMock.mockImplementationOnce(() => Promise.resolve({ ok: false, status: 400 }));
    await expect(runSignOutHooks('access-token')).resolves.toBeUndefined();

    await pushNotificationService.registerForPushNotifications('user-1', 'DEPT');
    fetchMock.mockImplementationOnce(() => Promise.reject(new Error('offline')));
    await expect(runSignOutHooks('access-token')).resolves.toBeUndefined();

    expect(logger.warn).toHaveBeenCalledTimes(2);
  });

  it('does not register a token when permission is refused, so there is nothing to unregister', async () => {
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValueOnce({ status: 'denied' });
    (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValueOnce({ status: 'denied' });

    await pushNotificationService.registerForPushNotifications('user-1', 'DEPT');
    await runSignOutHooks('access-token');

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
