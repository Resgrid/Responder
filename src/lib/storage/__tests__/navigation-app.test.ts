const mockStore = new Map<string, string>();
jest.mock('@/lib/storage', () => ({
  storage: {
    getString: jest.fn((key: string) => mockStore.get(key)),
    set: jest.fn((key: string, value: string) => {
      mockStore.set(key, value);
    }),
  },
}));

import { storage } from '@/lib/storage';

import { getNavigationApp, getNavigationAppOptions, NAVIGATION_APP_STORAGE_KEY, normalizeNavigationApp, setNavigationApp } from '../navigation-app';

describe('navigation app preference', () => {
  beforeEach(() => {
    mockStore.clear();
    jest.clearAllMocks();
  });

  it('offers Apple Maps on iOS only and the mobile-only apps on iOS and Android only', () => {
    const mobileOnly = ['gaia_gps', 'here_wego', 'mapquest', 'onx_offroad', 'organic_maps', 'osmand'];
    expect(getNavigationAppOptions('ios')).toEqual(['default', 'google_maps', 'apple_maps', 'waze', ...mobileOnly]);
    expect(getNavigationAppOptions('android')).toEqual(['default', 'google_maps', 'waze', ...mobileOnly]);
    expect(getNavigationAppOptions('web')).toEqual(['default', 'google_maps', 'waze']);
    expect(getNavigationAppOptions('windows')).toEqual(['default', 'google_maps', 'waze']);
  });

  it('keeps a valid choice for the platform', () => {
    expect(normalizeNavigationApp('waze', 'android')).toBe('waze');
    expect(normalizeNavigationApp('google_maps', 'ios')).toBe('google_maps');
    expect(normalizeNavigationApp('apple_maps', 'ios')).toBe('apple_maps');
    expect(normalizeNavigationApp('osmand', 'android')).toBe('osmand');
    expect(normalizeNavigationApp('onx_offroad', 'ios')).toBe('onx_offroad');
  });

  it('falls back to the device default for missing, unknown or unavailable values', () => {
    expect(normalizeNavigationApp(undefined, 'ios')).toBe('default');
    expect(normalizeNavigationApp(null, 'android')).toBe('default');
    expect(normalizeNavigationApp('tomtom_go', 'android')).toBe('default');
    expect(normalizeNavigationApp('apple_maps', 'android')).toBe('default');
    expect(normalizeNavigationApp('organic_maps', 'web')).toBe('default');
  });

  it('defaults to the device default when nothing was saved', () => {
    expect(getNavigationApp()).toBe('default');
  });

  it('persists the choice under its MMKV key', () => {
    setNavigationApp('waze');

    expect(storage.set).toHaveBeenCalledWith(NAVIGATION_APP_STORAGE_KEY, 'waze');
    expect(NAVIGATION_APP_STORAGE_KEY).toBe('NAVIGATION_APP');
    expect(getNavigationApp()).toBe('waze');
  });

  it('reads as the device default when storage throws', () => {
    (storage.getString as jest.Mock).mockImplementationOnce(() => {
      throw new Error('MMKV unavailable');
    });

    expect(getNavigationApp()).toBe('default');
  });
});
