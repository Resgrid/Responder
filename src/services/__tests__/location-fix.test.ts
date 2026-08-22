import * as Location from 'expo-location';

import { translate } from '@/lib/i18n/utils';

import { acquireLocationFix, getLocationFixErrorMessage } from '../location-fix';

jest.mock('@/lib/logging', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/i18n/utils', () => ({
  translate: jest.fn((key: string) => key),
}));

const mockSetLocation = jest.fn();
jest.mock('@/stores/app/location-store', () => ({
  useLocationStore: { getState: jest.fn(() => ({ setLocation: mockSetLocation })) },
}));

jest.mock('expo-location', () => ({
  getForegroundPermissionsAsync: jest.fn(),
  requestForegroundPermissionsAsync: jest.fn(),
  hasServicesEnabledAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  getLastKnownPositionAsync: jest.fn(),
  Accuracy: { Balanced: 'balanced' },
}));

const mockLocation = Location as jest.Mocked<typeof Location>;

const position = {
  coords: { latitude: 1, longitude: 2, accuracy: 5, altitude: 10, altitudeAccuracy: 3, speed: 0, heading: 0 },
  timestamp: 1700000000000,
} as Location.LocationObject;

const granted = { status: 'granted', canAskAgain: true, granted: true, expires: 'never' } as Location.LocationPermissionResponse;
const denied = { status: 'denied', canAskAgain: false, granted: false, expires: 'never' } as Location.LocationPermissionResponse;
const undetermined = { status: 'undetermined', canAskAgain: true, granted: false, expires: 'never' } as Location.LocationPermissionResponse;

describe('acquireLocationFix', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocation.getForegroundPermissionsAsync.mockResolvedValue(granted);
    mockLocation.hasServicesEnabledAsync.mockResolvedValue(true);
    mockLocation.getCurrentPositionAsync.mockResolvedValue(position);
    mockLocation.getLastKnownPositionAsync.mockResolvedValue(null);
  });

  it('returns the live fix and feeds it to the location store', async () => {
    const result = await acquireLocationFix();

    expect(result).toEqual({ outcome: 'acquired', location: position });
    expect(mockSetLocation).toHaveBeenCalledWith(position);
  });

  it('prompts for permission when it has not been decided yet', async () => {
    mockLocation.getForegroundPermissionsAsync.mockResolvedValue(undetermined);
    mockLocation.requestForegroundPermissionsAsync.mockResolvedValue(granted);

    const result = await acquireLocationFix();

    expect(mockLocation.requestForegroundPermissionsAsync).toHaveBeenCalled();
    expect(result.outcome).toBe('acquired');
  });

  it('reports permission-denied without re-prompting once the user has hard-denied', async () => {
    mockLocation.getForegroundPermissionsAsync.mockResolvedValue(denied);

    const result = await acquireLocationFix();

    expect(mockLocation.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
    expect(result).toEqual({ outcome: 'permission-denied', location: null });
    expect(mockLocation.getCurrentPositionAsync).not.toHaveBeenCalled();
  });

  it('distinguishes device location services being switched off from a missing fix', async () => {
    mockLocation.hasServicesEnabledAsync.mockResolvedValue(false);

    const result = await acquireLocationFix();

    expect(result).toEqual({ outcome: 'services-disabled', location: null });
    expect(mockLocation.getCurrentPositionAsync).not.toHaveBeenCalled();
  });

  it('falls back to a recent cached fix when the live one fails', async () => {
    mockLocation.getCurrentPositionAsync.mockRejectedValue(new Error('no signal'));
    mockLocation.getLastKnownPositionAsync.mockResolvedValue(position);

    const result = await acquireLocationFix();

    expect(result).toEqual({ outcome: 'acquired', location: position });
    expect(mockLocation.getLastKnownPositionAsync).toHaveBeenCalledWith({ maxAge: 60000 });
  });

  it('reports unavailable when neither a live nor a cached fix can be had', async () => {
    mockLocation.getCurrentPositionAsync.mockRejectedValue(new Error('no signal'));

    const result = await acquireLocationFix();

    expect(result).toEqual({ outcome: 'unavailable', location: null });
    expect(mockSetLocation).not.toHaveBeenCalled();
  });

  it('gives up on a live fix that never settles rather than hanging the submission', async () => {
    jest.useFakeTimers();
    // A position request that never resolves is the realistic indoor Android case.
    mockLocation.getCurrentPositionAsync.mockReturnValue(new Promise(() => {}) as Promise<Location.LocationObject>);
    mockLocation.getLastKnownPositionAsync.mockResolvedValue(position);

    const pending = acquireLocationFix();
    // Let the permission and services awaits settle before the timer is armed.
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    jest.advanceTimersByTime(8000);

    await expect(pending).resolves.toEqual({ outcome: 'acquired', location: position });
    jest.useRealTimers();
  });

  it('still returns the acquired fix when the store write throws', async () => {
    mockSetLocation.mockImplementation(() => {
      throw new Error('store unavailable');
    });

    await expect(acquireLocationFix()).resolves.toEqual({ outcome: 'acquired', location: position });
    expect(mockSetLocation).toHaveBeenCalledWith(position);
  });

  it('treats an unanswerable permission check as denied', async () => {
    mockLocation.getForegroundPermissionsAsync.mockRejectedValue(new Error('module unavailable'));

    await expect(acquireLocationFix()).resolves.toEqual({ outcome: 'permission-denied', location: null });
  });

  it('continues past a services check that throws rather than blocking on it', async () => {
    mockLocation.hasServicesEnabledAsync.mockRejectedValue(new Error('unsupported'));

    await expect(acquireLocationFix()).resolves.toEqual({ outcome: 'acquired', location: position });
  });
});

describe('getLocationFixErrorMessage', () => {
  const mockTranslate = translate as jest.MockedFunction<typeof translate>;

  it('names the specific obstacle rather than a generic GPS failure', () => {
    mockTranslate.mockImplementation(((key: string) => `translated:${key}`) as unknown as typeof translate);

    expect(getLocationFixErrorMessage('permission-denied')).toBe('translated:location.fix_permission_denied');
    expect(getLocationFixErrorMessage('services-disabled')).toBe('translated:location.fix_services_disabled');
    expect(getLocationFixErrorMessage('unavailable')).toBe('translated:location.fix_unavailable');
  });

  it('falls back to English when the key has no translation, rather than showing the key', () => {
    // i18next echoes the key back for a missing entry; surfacing that to a responder is worse
    // than an untranslated but readable sentence.
    mockTranslate.mockImplementation(((key: string) => key) as unknown as typeof translate);

    expect(getLocationFixErrorMessage('unavailable')).toBe('Could not get a location fix. Move to an area with a clearer view of the sky and try again.');
  });
});
