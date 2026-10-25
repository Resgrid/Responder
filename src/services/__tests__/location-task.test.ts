jest.mock('@/api/personnel/personnelLocation', () => ({
  setPersonLocation: jest.fn(),
}));
jest.mock('@/lib/logging', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));
jest.mock('@/lib/storage/background-geolocation', () => ({
  loadBackgroundGeolocationState: jest.fn(),
}));
jest.mock('@/lib/storage/realtime-geolocation', () => ({
  loadRealtimeGeolocationState: jest.fn(),
}));

const mockAuthState = { userId: 'user-123' as string | null };
const mockSetLocation = jest.fn();

jest.mock('@/lib/auth', () => ({
  useAuthStore: { getState: jest.fn(() => mockAuthState) },
}));
jest.mock('@/stores/app/location-store', () => ({
  useLocationStore: { getState: jest.fn(() => ({ setLocation: mockSetLocation })) },
}));

const registeredTasks: Record<string, (body: unknown) => Promise<void>> = {};

jest.mock('expo-task-manager', () => ({
  defineTask: jest.fn((name: string, handler: (body: unknown) => Promise<void>) => {
    registeredTasks[name] = handler;
  }),
}));
jest.mock('react-native', () => ({
  AppState: { currentState: 'background', addEventListener: jest.fn() },
}));

import type * as Location from 'expo-location';
import { AppState } from 'react-native';

import { setPersonLocation } from '@/api/personnel/personnelLocation';
import { loadBackgroundGeolocationState } from '@/lib/storage/background-geolocation';
import { loadRealtimeGeolocationState } from '@/lib/storage/realtime-geolocation';

import { LOCATION_HEARTBEAT_INTERVAL_MS, LOCATION_SEND_INTERVAL_MS, LOCATION_TASK_NAME, resetLocationUploadState, submitLocationUpdate } from '../location-task';

const mockSetPersonLocation = setPersonLocation as jest.MockedFunction<typeof setPersonLocation>;
const mockLoadBackgroundGeolocationState = loadBackgroundGeolocationState as jest.MockedFunction<typeof loadBackgroundGeolocationState>;
const mockLoadRealtimeGeolocationState = loadRealtimeGeolocationState as jest.MockedFunction<typeof loadRealtimeGeolocationState>;

const START = 1_700_000_000_000;
// One thousandth of a degree of latitude is ~111 m; 0.00004 is ~4.5 m.
const BASE_LATITUDE = 37.7749;
const BASE_LONGITUDE = -122.4194;

const fixAt = (latitude: number, timestamp: number = Date.now(), accuracy: number | null = 10): Location.LocationObject => ({
  coords: {
    latitude,
    longitude: BASE_LONGITUDE,
    altitude: 10,
    accuracy,
    altitudeAccuracy: 2,
    heading: 90,
    speed: 12,
  },
  timestamp,
});

const postedLatitudes = (): string[] => mockSetPersonLocation.mock.calls.map(([input]) => input.Latitude);

describe('location uploader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers({ now: START });
    resetLocationUploadState();
    (AppState as { currentState: string }).currentState = 'active';
    mockLoadBackgroundGeolocationState.mockResolvedValue(false);
    mockAuthState.userId = 'user-123';
    mockSetPersonLocation.mockResolvedValue({ Id: 'location-1' } as Awaited<ReturnType<typeof setPersonLocation>>);
  });

  afterEach(() => {
    resetLocationUploadState();
    jest.useRealTimers();
  });

  it('posts the first fix immediately', async () => {
    await submitLocationUpdate(fixAt(BASE_LATITUDE), true);

    expect(postedLatitudes()).toEqual([String(BASE_LATITUDE)]);
  });

  it('holds a fix that lands inside the send interval and posts it when the interval ends', async () => {
    await submitLocationUpdate(fixAt(BASE_LATITUDE), true);

    await jest.advanceTimersByTimeAsync(5000);
    await submitLocationUpdate(fixAt(BASE_LATITUDE + 0.001), true);
    expect(mockSetPersonLocation).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(LOCATION_SEND_INTERVAL_MS - 5000);
    expect(postedLatitudes()).toEqual([String(BASE_LATITUDE), String(BASE_LATITUDE + 0.001)]);
  });

  it('posts only the newest of several held fixes', async () => {
    await submitLocationUpdate(fixAt(BASE_LATITUDE), true);

    await jest.advanceTimersByTimeAsync(3000);
    await submitLocationUpdate(fixAt(BASE_LATITUDE + 0.001), true);
    await jest.advanceTimersByTimeAsync(3000);
    await submitLocationUpdate(fixAt(BASE_LATITUDE + 0.002), true);

    await jest.advanceTimersByTimeAsync(LOCATION_SEND_INTERVAL_MS);
    expect(postedLatitudes()).toEqual([String(BASE_LATITUDE), String(BASE_LATITUDE + 0.002)]);
  });

  it('does not re-post a responder who has not moved until the heartbeat is due', async () => {
    await submitLocationUpdate(fixAt(BASE_LATITUDE), true);

    await jest.advanceTimersByTimeAsync(LOCATION_SEND_INTERVAL_MS * 2);
    await submitLocationUpdate(fixAt(BASE_LATITUDE + 0.00004), true);
    expect(mockSetPersonLocation).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(LOCATION_HEARTBEAT_INTERVAL_MS);
    await submitLocationUpdate(fixAt(BASE_LATITUDE + 0.00004), true);
    expect(mockSetPersonLocation).toHaveBeenCalledTimes(2);
  });

  it('drops a held fix once a newer one shows the responder back where they were posted', async () => {
    await submitLocationUpdate(fixAt(BASE_LATITUDE), true);

    await jest.advanceTimersByTimeAsync(2000);
    await submitLocationUpdate(fixAt(BASE_LATITUDE + 0.001), true);
    await jest.advanceTimersByTimeAsync(2000);
    await submitLocationUpdate(fixAt(BASE_LATITUDE), true);

    await jest.advanceTimersByTimeAsync(LOCATION_SEND_INTERVAL_MS);
    expect(mockSetPersonLocation).toHaveBeenCalledTimes(1);
  });

  it('retries the same position after a failed post instead of treating it as delivered', async () => {
    mockSetPersonLocation.mockRejectedValueOnce(new Error('offline'));
    await submitLocationUpdate(fixAt(BASE_LATITUDE), true);

    await jest.advanceTimersByTimeAsync(LOCATION_SEND_INTERVAL_MS);
    await submitLocationUpdate(fixAt(BASE_LATITUDE), true);

    expect(mockSetPersonLocation).toHaveBeenCalledTimes(2);
  });

  it('does not spend the send interval on a fix rejected before any request', async () => {
    mockAuthState.userId = null;
    await submitLocationUpdate(fixAt(BASE_LATITUDE), true);
    expect(mockSetPersonLocation).not.toHaveBeenCalled();

    mockAuthState.userId = 'user-123';
    await submitLocationUpdate(fixAt(BASE_LATITUDE), true);
    expect(mockSetPersonLocation).toHaveBeenCalledTimes(1);
  });

  it('never holds a low-accuracy fix or one whose transmission is disabled', async () => {
    await submitLocationUpdate(fixAt(BASE_LATITUDE), true);

    await submitLocationUpdate(fixAt(BASE_LATITUDE + 0.001, Date.now(), 250), true);
    await submitLocationUpdate(fixAt(BASE_LATITUDE + 0.002), false);

    await jest.advanceTimersByTimeAsync(LOCATION_SEND_INTERVAL_MS);
    expect(mockSetPersonLocation).toHaveBeenCalledTimes(1);
  });

  it('discards a held fix on reset, so it is never posted for the next user', async () => {
    await submitLocationUpdate(fixAt(BASE_LATITUDE), true);
    await submitLocationUpdate(fixAt(BASE_LATITUDE + 0.001), true);

    resetLocationUploadState();
    await jest.advanceTimersByTimeAsync(LOCATION_SEND_INTERVAL_MS);

    expect(mockSetPersonLocation).toHaveBeenCalledTimes(1);
  });
});

/**
 * A stationary device produces no fixes, so the heartbeat cannot wait for one: a responder who is
 * trapped or unresponsive must not age off the map, which drops markers by timestamp.
 */
describe('location heartbeat', () => {
  const postedTimestamps = (): string[] => mockSetPersonLocation.mock.calls.map(([input]) => input.Timestamp);

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers({ now: START });
    resetLocationUploadState();
    (AppState as { currentState: string }).currentState = 'active';
    mockLoadBackgroundGeolocationState.mockResolvedValue(false);
    mockAuthState.userId = 'user-123';
    mockSetPersonLocation.mockResolvedValue({ Id: 'location-1' } as Awaited<ReturnType<typeof setPersonLocation>>);
  });

  afterEach(() => {
    resetLocationUploadState();
    jest.useRealTimers();
  });

  it('re-posts the latest position with a fresh timestamp every interval while no fix arrives', async () => {
    await submitLocationUpdate(fixAt(BASE_LATITUDE, START), true);

    await jest.advanceTimersByTimeAsync(LOCATION_HEARTBEAT_INTERVAL_MS);
    await jest.advanceTimersByTimeAsync(LOCATION_HEARTBEAT_INTERVAL_MS);

    expect(postedLatitudes()).toEqual([String(BASE_LATITUDE), String(BASE_LATITUDE), String(BASE_LATITUDE)]);
    expect(postedTimestamps()).toEqual([
      new Date(START).toISOString(),
      new Date(START + LOCATION_HEARTBEAT_INTERVAL_MS).toISOString(),
      new Date(START + LOCATION_HEARTBEAT_INTERVAL_MS * 2).toISOString(),
    ]);
  });

  it('reports the newest accepted fix, even one skipped as not moved', async () => {
    await submitLocationUpdate(fixAt(BASE_LATITUDE), true);
    await jest.advanceTimersByTimeAsync(60000);
    await submitLocationUpdate(fixAt(BASE_LATITUDE + 0.00004), true);
    expect(mockSetPersonLocation).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(LOCATION_HEARTBEAT_INTERVAL_MS - 60000);

    expect(postedLatitudes()).toEqual([String(BASE_LATITUDE), String(BASE_LATITUDE + 0.00004)]);
  });

  it('restarts the countdown on every post, so a moving responder gets no extra posts', async () => {
    await submitLocationUpdate(fixAt(BASE_LATITUDE), true);

    await jest.advanceTimersByTimeAsync(4 * 60 * 1000);
    await submitLocationUpdate(fixAt(BASE_LATITUDE + 0.001), true);
    expect(mockSetPersonLocation).toHaveBeenCalledTimes(2);

    // Five minutes after the first post, but only one after the second.
    await jest.advanceTimersByTimeAsync(60 * 1000);
    expect(mockSetPersonLocation).toHaveBeenCalledTimes(2);

    await jest.advanceTimersByTimeAsync(4 * 60 * 1000);
    expect(mockSetPersonLocation).toHaveBeenCalledTimes(3);
  });

  it('posts in the background under Background Geolocation', async () => {
    await submitLocationUpdate(fixAt(BASE_LATITUDE), true);
    (AppState as { currentState: string }).currentState = 'background';
    mockLoadBackgroundGeolocationState.mockResolvedValue(true);

    await jest.advanceTimersByTimeAsync(LOCATION_HEARTBEAT_INTERVAL_MS);

    expect(mockSetPersonLocation).toHaveBeenCalledTimes(2);
  });

  it('does not post in the background without Background Geolocation, and stops until the next post', async () => {
    await submitLocationUpdate(fixAt(BASE_LATITUDE), true);
    (AppState as { currentState: string }).currentState = 'background';

    await jest.advanceTimersByTimeAsync(LOCATION_HEARTBEAT_INTERVAL_MS * 3);

    expect(mockSetPersonLocation).toHaveBeenCalledTimes(1);
  });

  it('keeps beating after a failed heartbeat', async () => {
    await submitLocationUpdate(fixAt(BASE_LATITUDE), true);
    mockSetPersonLocation.mockRejectedValueOnce(new Error('offline'));

    await jest.advanceTimersByTimeAsync(LOCATION_HEARTBEAT_INTERVAL_MS);
    await jest.advanceTimersByTimeAsync(LOCATION_HEARTBEAT_INTERVAL_MS);

    expect(mockSetPersonLocation).toHaveBeenCalledTimes(3);
  });

  it('stops on reset, so nothing is posted after sign-out', async () => {
    await submitLocationUpdate(fixAt(BASE_LATITUDE), true);

    resetLocationUploadState();
    await jest.advanceTimersByTimeAsync(LOCATION_HEARTBEAT_INTERVAL_MS * 2);

    expect(mockSetPersonLocation).toHaveBeenCalledTimes(1);
  });

  it('goes out on a fix when timers are paused, as Android does in the background', async () => {
    // No timer advance: only the clock moves, as when Android holds JS timers while backgrounded
    // and the OS task's 30 s batches keep arriving.
    await submitLocationUpdate(fixAt(BASE_LATITUDE), true);

    jest.setSystemTime(START + LOCATION_HEARTBEAT_INTERVAL_MS - 30000);
    await submitLocationUpdate(fixAt(BASE_LATITUDE + 0.00004), true);
    expect(mockSetPersonLocation).toHaveBeenCalledTimes(1);

    jest.setSystemTime(START + LOCATION_HEARTBEAT_INTERVAL_MS);
    await submitLocationUpdate(fixAt(BASE_LATITUDE + 0.00004), true);
    expect(mockSetPersonLocation).toHaveBeenCalledTimes(2);
  });
});

describe('background location task', () => {
  const runTask = async (body: unknown) => {
    const handler = registeredTasks[LOCATION_TASK_NAME];
    expect(handler).toBeDefined();
    await handler(body);
  };

  beforeEach(() => {
    jest.clearAllMocks();
    resetLocationUploadState();
    (AppState as { currentState: string }).currentState = 'background';
    mockLoadBackgroundGeolocationState.mockResolvedValue(true);
    mockLoadRealtimeGeolocationState.mockResolvedValue(false);
    mockSetPersonLocation.mockResolvedValue({ Id: 'location-1' } as Awaited<ReturnType<typeof setPersonLocation>>);
  });

  afterEach(() => {
    resetLocationUploadState();
  });

  it('reports the newest fix of a deferred batch, not the oldest', async () => {
    const oldest = fixAt(BASE_LATITUDE, START);
    const newest = fixAt(BASE_LATITUDE + 0.002, START + 30000);

    await runTask({ data: { locations: [oldest, fixAt(BASE_LATITUDE + 0.001, START + 15000), newest] }, error: null });

    expect(mockSetLocation).toHaveBeenCalledTimes(1);
    expect(mockSetLocation).toHaveBeenCalledWith(newest);
    expect(postedLatitudes()).toEqual([String(BASE_LATITUDE + 0.002)]);
  });

  it('posts a foregrounded fix with both settings off', async () => {
    (AppState as { currentState: string }).currentState = 'active';
    mockLoadBackgroundGeolocationState.mockResolvedValue(false);

    await runTask({ data: { locations: [fixAt(BASE_LATITUDE)] }, error: null });

    expect(mockSetPersonLocation).toHaveBeenCalledTimes(1);
    expect(mockLoadRealtimeGeolocationState).not.toHaveBeenCalled();
  });

  it('does not post a backgrounded fix without Background Geolocation', async () => {
    mockLoadBackgroundGeolocationState.mockResolvedValue(false);

    await runTask({ data: { locations: [fixAt(BASE_LATITUDE)] }, error: null });

    expect(mockSetLocation).toHaveBeenCalledTimes(1);
    expect(mockSetPersonLocation).not.toHaveBeenCalled();
  });

  it('ignores an empty batch', async () => {
    await runTask({ data: { locations: [] }, error: null });

    expect(mockSetLocation).not.toHaveBeenCalled();
    expect(mockSetPersonLocation).not.toHaveBeenCalled();
  });

  it('ignores a task error without posting', async () => {
    await runTask({ data: null, error: new Error('denied') });

    expect(mockSetLocation).not.toHaveBeenCalled();
    expect(mockSetPersonLocation).not.toHaveBeenCalled();
  });
});
