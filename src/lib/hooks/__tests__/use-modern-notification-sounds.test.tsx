import { act, renderHook } from '@testing-library/react-native';

import { storage } from '@/lib/storage';

import { getModernNotificationSoundsEnabled, useModernNotificationSounds } from '../use-modern-notification-sounds';

// Faithful MMKV mock: unset keys read back as `undefined` (matching the real
// library) so the default-on behaviour can be verified.
jest.mock('react-native-mmkv', () => {
  const store = new Map<string, boolean>();
  return {
    MMKV: jest.fn().mockImplementation(() => ({
      contains: (key: string) => store.has(key),
      getBoolean: (key: string) => (store.has(key) ? store.get(key) : undefined),
      set: (key: string, value: boolean) => store.set(key, value),
      delete: (key: string) => store.delete(key),
      clearAll: () => store.clear(),
      getString: (key: string) => (store.has(key) ? String(store.get(key)) : null),
    })),
    useMMKVBoolean: (key: string) => {
      const value = store.has(key) ? store.get(key) : undefined;
      const setter = (next: boolean) => store.set(key, next);
      return [value, setter];
    },
    useMMKVString: () => [null, jest.fn()],
    useMMKVNumber: () => [0, jest.fn()],
  };
});

describe('modern notification sounds preference', () => {
  beforeEach(() => {
    storage.clearAll();
  });

  describe('getModernNotificationSoundsEnabled', () => {
    it('defaults to true when the preference has never been set', () => {
      expect(getModernNotificationSoundsEnabled()).toBe(true);
    });

    it('returns false when the user disabled modern sounds', () => {
      storage.set('MODERN_NOTIFICATION_SOUNDS_ENABLED', false);
      expect(getModernNotificationSoundsEnabled()).toBe(false);
    });

    it('returns true when the user enabled modern sounds', () => {
      storage.set('MODERN_NOTIFICATION_SOUNDS_ENABLED', true);
      expect(getModernNotificationSoundsEnabled()).toBe(true);
    });
  });

  describe('useModernNotificationSounds', () => {
    it('is enabled by default', () => {
      const { result } = renderHook(() => useModernNotificationSounds());
      expect(result.current.isModernNotificationSoundsEnabled).toBe(true);
    });

    it('persists the preference when toggled off', () => {
      const { result } = renderHook(() => useModernNotificationSounds());

      act(() => {
        result.current.setModernNotificationSoundsEnabled(false);
      });

      expect(getModernNotificationSoundsEnabled()).toBe(false);
    });
  });
});
