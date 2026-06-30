import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Control the persisted "modern notification sounds" preference per test.
const mockGetModernSoundsEnabled = jest.fn();
const mockHasMigrated = jest.fn();
const mockMarkMigrated = jest.fn();
jest.mock('@/lib/hooks/use-modern-notification-sounds', () => ({
  getModernNotificationSoundsEnabled: () => mockGetModernSoundsEnabled(),
  hasMigratedNotificationChannelSounds: () => mockHasMigrated(),
  markNotificationChannelSoundsMigrated: () => mockMarkMigrated(),
}));

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
}));
jest.mock('@/stores/security/store', () => ({ securityStore: { getState: jest.fn(() => ({})) } }));

const setChannelMock = Notifications.setNotificationChannelAsync as jest.Mock;
const deleteChannelMock = Notifications.deleteNotificationChannelAsync as jest.Mock;

// Returns the channelConfig passed to setNotificationChannelAsync for a channel id.
const configFor = (channelId: string): Record<string, unknown> | undefined => {
  const call = setChannelMock.mock.calls.find((args) => args[0] === channelId);
  return call?.[1];
};

describe('Android notification channel sounds', () => {
  let pushNotificationService: { refreshNotificationChannelSounds: () => Promise<void> };

  // Snapshot of the channel work performed by the singleton's one-time init(),
  // captured before beforeEach() clears the mocks.
  let initDeletedChannelIds: string[];
  let initChannelSounds: Record<string, unknown>;
  let initMarkMigratedCalls: number;

  beforeAll(async () => {
    (Platform as { OS: string }).OS = 'android';
    mockGetModernSoundsEnabled.mockReturnValue(true);
    mockHasMigrated.mockReturnValue(false); // emulate an upgraded install that has not migrated yet
    pushNotificationService = require('../push-notification').pushNotificationService;
    // Flush the singleton's fire-and-forget initialize(), which is a chain of
    // awaited (mocked) channel calls, so it can't leak into later assertions.
    for (let i = 0; i < 100; i++) {
      await Promise.resolve();
    }
    initDeletedChannelIds = deleteChannelMock.mock.calls.map((c) => c[0]);
    initChannelSounds = {};
    setChannelMock.mock.calls.forEach((c) => {
      initChannelSounds[c[0]] = c[1]?.sound;
    });
    initMarkMigratedCalls = mockMarkMigrated.mock.calls.length;
  });

  afterAll(() => {
    (Platform as { OS: string }).OS = 'ios';
  });

  beforeEach(() => {
    setChannelMock.mockClear();
    deleteChannelMock.mockClear();
  });

  describe('when modern sounds are enabled (default)', () => {
    beforeEach(async () => {
      mockGetModernSoundsEnabled.mockReturnValue(true);
      await pushNotificationService.refreshNotificationChannelSounds();
    });

    it('uses modern sounds for the call-priority channels', () => {
      expect(configFor('0')?.sound).toBe('moderncallemergency');
      expect(configFor('1')?.sound).toBe('moderncallhigh');
      expect(configFor('2')?.sound).toBe('moderncallmedium');
      expect(configFor('3')?.sound).toBe('moderncalllow');
    });

    it('plays modern sounds on channels that were previously silent', () => {
      expect(configFor('calls')?.sound).toBe('modernnotification');
      expect(configFor('notif')?.sound).toBe('modernnotification');
      expect(configFor('message')?.sound).toBe('modernmessage');
    });

    it('recreates each channel so the new sound takes effect', () => {
      ['calls', '0', '1', '2', '3', 'notif', 'message'].forEach((id) => {
        expect(deleteChannelMock).toHaveBeenCalledWith(id);
      });
    });
  });

  describe('when modern sounds are disabled', () => {
    beforeEach(async () => {
      mockGetModernSoundsEnabled.mockReturnValue(false);
      await pushNotificationService.refreshNotificationChannelSounds();
    });

    it('falls back to the classic call sounds', () => {
      expect(configFor('0')?.sound).toBe('callemergency');
      expect(configFor('1')?.sound).toBe('callhigh');
      expect(configFor('2')?.sound).toBe('callmedium');
      expect(configFor('3')?.sound).toBe('calllow');
    });

    it('restores silence for channels that had no original sound', () => {
      expect(configFor('calls')?.sound).toBeUndefined();
      expect(configFor('notif')?.sound).toBeUndefined();
      expect(configFor('message')?.sound).toBeUndefined();
    });
  });

  // Upgraded installs already have the standard channels created with their old
  // sounds; Android locks a channel's sound at creation, so a plain
  // setNotificationChannelAsync would be ignored. init() must delete and
  // recreate them once so the modern sounds actually take effect.
  describe('first-launch migration for upgraded installs', () => {
    it('deletes the standard channels so their locked sounds can be replaced', () => {
      ['calls', '0', '1', '2', '3', 'notif', 'message'].forEach((id) => {
        expect(initDeletedChannelIds).toContain(id);
      });
    });

    it('recreates them with modern sounds and records that the migration ran', () => {
      expect(initChannelSounds['0']).toBe('moderncallemergency');
      expect(initChannelSounds['calls']).toBe('modernnotification');
      expect(initMarkMigratedCalls).toBe(1);
    });
  });
});
