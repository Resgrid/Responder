import { act, renderHook } from '@testing-library/react-native';
import * as Notifications from 'expo-notifications';

import { registerDevice } from '@/api/devices/push';

jest.mock('expo-device', () => ({
  isDevice: true,
}));

jest.mock('expo-notifications', () => ({
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  getLastNotificationResponseAsync: jest.fn(() => Promise.resolve(null)),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getDevicePushTokenAsync: jest.fn(),
  AndroidImportance: { MAX: 5 },
  AndroidNotificationVisibility: { PUBLIC: 1 },
}));

// Session state the service and hook read; each test sets what it needs.
const mockAuthState: { status: string; userId: string | null } = { status: 'signedIn', userId: 'user-1' };
const mockSecurityState: { rights: { DepartmentCode: string } | null } = { rights: { DepartmentCode: 'EU1' } };
const mockLifecycleState = { isActive: true };
let mockBaseUrl = 'https://api.eu.example/api/v4';

// A zustand-style hook (callable with a selector, plus getState) over state the test mutates.
function mockSelectorHook(getState: () => object) {
  const hook: any = jest.fn((selector?: (s: object) => unknown) => (selector ? selector(getState()) : getState()));
  hook.getState = getState;
  return hook;
}

jest.mock('@/lib/auth', () => ({ useAuthStore: mockSelectorHook(() => mockAuthState) }));
jest.mock('@/stores/security/store', () => ({ securityStore: mockSelectorHook(() => mockSecurityState) }));
jest.mock('@/stores/app/app-lifecycle', () => ({ useAppLifecycleStore: mockSelectorHook(() => mockLifecycleState) }));

jest.mock('@/lib/storage/app', () => ({
  getBaseApiUrl: () => mockBaseUrl,
  getDeviceUuid: () => 'device-uuid',
}));

const mockStoreResets = new Map<string, () => void>();
jest.mock('@/lib/storage/clear-all-data', () => ({
  registerStoreReset: (name: string, reset: () => void) => mockStoreResets.set(name, reset),
}));

jest.mock('@/api/devices/push', () => ({
  registerDevice: jest.fn(),
}));

jest.mock('@/lib/logging', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/navigation', () => ({
  routerPushWithRetry: jest.fn(() => Promise.resolve()),
}));

jest.mock('@/components/weather-alerts/weather-alert-navigation', () => ({
  openWeatherAlertDetail: jest.fn(() => Promise.resolve()),
}));

jest.mock('@/stores/push-notification/store', () => ({
  ...jest.requireActual('@/stores/push-notification/store'),
  usePushNotificationModalStore: { getState: jest.fn(() => ({ showNotificationModal: jest.fn() })) },
}));

// Required, not imported: the module registers its sign-out reset as it loads, which needs the map above to exist.
const { pushNotificationService, usePushNotifications } = require('../push-notification') as typeof import('../push-notification');

const mockRegisterDevice = registerDevice as jest.Mock;
const mockGetPermissions = Notifications.getPermissionsAsync as jest.Mock;
const mockRequestPermissions = Notifications.requestPermissionsAsync as jest.Mock;
const mockGetDevicePushToken = Notifications.getDevicePushTokenAsync as jest.Mock;

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
};

const signOut = () => mockStoreResets.get('push-notification')?.();

describe('push registration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    signOut();
    mockAuthState.userId = 'user-1';
    mockSecurityState.rights = { DepartmentCode: 'EU1' };
    mockLifecycleState.isActive = true;
    mockBaseUrl = 'https://api.eu.example/api/v4';
    mockGetPermissions.mockResolvedValue({ status: 'granted' });
    mockRequestPermissions.mockResolvedValue({ status: 'granted' });
    mockGetDevicePushToken.mockResolvedValue({ data: 'apns-token-1' });
    mockRegisterDevice.mockResolvedValue({ Status: 'Queued' });
  });

  describe('registerForPushNotifications', () => {
    it('registers the token under the department code at the server the app points at', async () => {
      await expect(pushNotificationService.registerForPushNotifications('user-1', 'EU1')).resolves.toBe('apns-token-1');

      expect(mockRegisterDevice).toHaveBeenCalledTimes(1);
      expect(mockRegisterDevice).toHaveBeenCalledWith({ UserId: 'user-1', Token: 'apns-token-1', Platform: 1, DeviceUuid: 'device-uuid', Prefix: 'EU1' });
    });

    it('does not register the same server, user, department and token twice', async () => {
      await pushNotificationService.registerForPushNotifications('user-1', 'EU1');
      await pushNotificationService.registerForPushNotifications('user-1', 'EU1');

      expect(mockRegisterDevice).toHaveBeenCalledTimes(1);
    });

    it('registers again when the department code changes', async () => {
      mockSecurityState.rights = { DepartmentCode: 'OLD' };
      await pushNotificationService.registerForPushNotifications('user-1', 'OLD');

      mockSecurityState.rights = { DepartmentCode: 'EU1' };
      await pushNotificationService.registerForPushNotifications('user-1', 'EU1');

      expect(mockRegisterDevice).toHaveBeenCalledTimes(2);
      expect(mockRegisterDevice).toHaveBeenLastCalledWith(expect.objectContaining({ Prefix: 'EU1' }));
    });

    it('registers again when the server changes', async () => {
      mockBaseUrl = 'https://api.us.example/api/v4';
      await pushNotificationService.registerForPushNotifications('user-1', 'EU1');

      mockBaseUrl = 'https://api.eu.example/api/v4';
      await pushNotificationService.registerForPushNotifications('user-1', 'EU1');

      expect(mockRegisterDevice).toHaveBeenCalledTimes(2);
    });

    it('registers again when the token rotates', async () => {
      await pushNotificationService.registerForPushNotifications('user-1', 'EU1');

      mockGetDevicePushToken.mockResolvedValue({ data: 'apns-token-2' });
      await pushNotificationService.registerForPushNotifications('user-1', 'EU1');

      expect(mockRegisterDevice).toHaveBeenCalledTimes(2);
      expect(mockRegisterDevice).toHaveBeenLastCalledWith(expect.objectContaining({ Token: 'apns-token-2' }));
    });

    it('does not register a department code that is no longer the session\'s', async () => {
      // Queued with the previous session's code; the session's own rights have since loaded.
      mockSecurityState.rights = { DepartmentCode: 'EU1' };

      await expect(pushNotificationService.registerForPushNotifications('user-1', 'US1')).resolves.toBeNull();

      expect(mockRegisterDevice).not.toHaveBeenCalled();
    });

    it('does not register a user who has signed out', async () => {
      mockAuthState.userId = null;

      await pushNotificationService.registerForPushNotifications('user-1', 'EU1');

      expect(mockRegisterDevice).not.toHaveBeenCalled();
    });

    it('retries a registration the server did not accept', async () => {
      mockRegisterDevice.mockResolvedValueOnce({ Status: 'Failure' });

      await expect(pushNotificationService.registerForPushNotifications('user-1', 'EU1')).resolves.toBeNull();
      await expect(pushNotificationService.registerForPushNotifications('user-1', 'EU1')).resolves.toBe('apns-token-1');
      await pushNotificationService.registerForPushNotifications('user-1', 'EU1');

      expect(mockRegisterDevice).toHaveBeenCalledTimes(2);
    });

    it('retries a registration that failed to reach the server', async () => {
      mockRegisterDevice.mockRejectedValueOnce(new Error('timeout of 15000ms exceeded'));

      await expect(pushNotificationService.registerForPushNotifications('user-1', 'EU1')).resolves.toBeNull();
      await pushNotificationService.registerForPushNotifications('user-1', 'EU1');

      expect(mockRegisterDevice).toHaveBeenCalledTimes(2);
    });

    it('asks for permission by default', async () => {
      mockGetPermissions.mockResolvedValue({ status: 'undetermined' });

      await pushNotificationService.registerForPushNotifications('user-1', 'EU1');

      expect(mockRequestPermissions).toHaveBeenCalledTimes(1);
      expect(mockRegisterDevice).toHaveBeenCalledTimes(1);
    });

    it('never prompts when asked not to', async () => {
      mockGetPermissions.mockResolvedValue({ status: 'denied' });

      await expect(pushNotificationService.registerForPushNotifications('user-1', 'EU1', { requestPermission: false })).resolves.toBeNull();

      expect(mockRequestPermissions).not.toHaveBeenCalled();
      expect(mockRegisterDevice).not.toHaveBeenCalled();
    });

    it('registers again after sign-out', async () => {
      await pushNotificationService.registerForPushNotifications('user-1', 'EU1');
      signOut();
      await pushNotificationService.registerForPushNotifications('user-1', 'EU1');

      expect(mockRegisterDevice).toHaveBeenCalledTimes(2);
    });

    it('does not let a registration in flight at sign-out count for the next session', async () => {
      const response = deferred<{ Status: string }>();
      mockRegisterDevice.mockReturnValueOnce(response.promise);

      const inFlight = pushNotificationService.registerForPushNotifications('user-1', 'EU1');
      await act(async () => {});
      signOut();
      response.resolve({ Status: 'Queued' });
      await inFlight;

      await pushNotificationService.registerForPushNotifications('user-1', 'EU1');

      expect(mockRegisterDevice).toHaveBeenCalledTimes(2);
    });

    it('runs registrations one at a time', async () => {
      const response = deferred<{ Status: string }>();
      mockRegisterDevice.mockReturnValueOnce(response.promise);

      const first = pushNotificationService.registerForPushNotifications('user-1', 'EU1');
      const second = pushNotificationService.registerForPushNotifications('user-1', 'EU1');
      await act(async () => {});

      expect(mockRegisterDevice).toHaveBeenCalledTimes(1);

      response.resolve({ Status: 'Queued' });
      await Promise.all([first, second]);

      // The second call waited for the first and found the server already had this token.
      expect(mockRegisterDevice).toHaveBeenCalledTimes(1);
    });
  });

  describe('usePushNotifications', () => {
    let registerSpy: jest.SpyInstance;

    beforeEach(() => {
      registerSpy = jest.spyOn(pushNotificationService, 'registerForPushNotifications').mockResolvedValue(null);
    });

    afterEach(() => {
      registerSpy.mockRestore();
    });

    it('waits for the session\'s department code, then registers under it', () => {
      mockSecurityState.rights = null;
      const { rerender } = renderHook(() => usePushNotifications());

      expect(registerSpy).not.toHaveBeenCalled();

      mockSecurityState.rights = { DepartmentCode: 'EU1' };
      rerender({});

      expect(registerSpy).toHaveBeenCalledTimes(1);
      expect(registerSpy).toHaveBeenCalledWith('user-1', 'EU1', { requestPermission: true });
    });

    it('registers again when the department code changes for the same user', () => {
      mockSecurityState.rights = { DepartmentCode: 'OLD' };
      const { rerender } = renderHook(() => usePushNotifications());

      mockSecurityState.rights = { DepartmentCode: 'EU1' };
      rerender({});

      expect(registerSpy).toHaveBeenCalledTimes(2);
      expect(registerSpy).toHaveBeenLastCalledWith('user-1', 'EU1', { requestPermission: true });
    });

    it('checks again without prompting when the app comes back to the foreground', () => {
      const { rerender } = renderHook(() => usePushNotifications());
      expect(registerSpy).toHaveBeenCalledTimes(1);

      mockLifecycleState.isActive = false;
      rerender({});
      expect(registerSpy).toHaveBeenCalledTimes(1);

      mockLifecycleState.isActive = true;
      rerender({});

      expect(registerSpy).toHaveBeenCalledTimes(2);
      expect(registerSpy).toHaveBeenLastCalledWith('user-1', 'EU1', { requestPermission: false });
    });

    it('does nothing while signed out', () => {
      mockAuthState.userId = null;
      const { rerender } = renderHook(() => usePushNotifications());

      mockLifecycleState.isActive = false;
      rerender({});
      mockLifecycleState.isActive = true;
      rerender({});

      expect(registerSpy).not.toHaveBeenCalled();
    });
  });
});
