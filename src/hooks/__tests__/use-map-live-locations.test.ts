import { act, renderHook } from '@testing-library/react-native';
import { useState } from 'react';

import { type LiveLocation, type LiveLocations, mergeLiveLocation } from '@/lib/live-locations';
import { type MapMakerInfoData } from '@/models/v4/mapping/getMapDataAndMarkersData';
import { useSignalRStore } from '@/stores/signalr/signalr-store';

import { LIVE_LOCATION_REFRESH_DELAY_MS, UNKNOWN_PIN_REFRESH_COOLDOWN_MS, useMapLiveLocations } from '../use-map-live-locations';

// A real (tiny) zustand store, so subscribe/getState behave exactly like the app's.
jest.mock('@/stores/signalr/signalr-store', () => {
  const { create } = require('zustand');
  return {
    useSignalRStore: create(() => ({ liveLocations: {}, geolocationHubJoinedAt: 0 })),
  };
});

jest.mock('@/lib/logging', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const GUID = '0A1B2C3D-4E5F-6071-8293-A4B5C6D7E8F9';

const pin = (overrides: Partial<MapMakerInfoData>): MapMakerInfoData => ({
  Id: 'x',
  Title: 'Pin',
  Latitude: 10,
  Longitude: 20,
  zIndex: '1',
  ImagePath: '',
  InfoWindowContent: '',
  Color: '',
  Type: 0,
  ...overrides,
});

const callPin = pin({ Id: 'c1', Type: 0, Latitude: 1, Longitude: 1 });
const unitPin = pin({ Id: 'u12', Type: 1, Latitude: 10, Longitude: 20 });
const personnelPin = pin({ Id: `p${GUID}`, Type: 3, Latitude: 30, Longitude: 40 });
const snapshotPins = [callPin, unitPin, personnelPin];

type TestStoreState = { liveLocations: LiveLocations; geolocationHubJoinedAt: number };
const testStore = useSignalRStore as unknown as {
  setState: (partial: Partial<TestStoreState> | ((state: TestStoreState) => Partial<TestStoreState>)) => void;
};

const push = (pinId: string, latitude: number, longitude: number, receivedAt: number = Date.now()): void => {
  const location: LiveLocation = { pinId, latitude, longitude, timestamp: null, receivedAt };
  testStore.setState((state) => ({ liveLocations: mergeLiveLocation(state.liveLocations, location) }));
};

const renderLiveMap = () =>
  renderHook(() => {
    const [pins, setPins] = useState<MapMakerInfoData[]>([]);
    const live = useMapLiveLocations(setPins);
    return { pins, ...live };
  });

describe('useMapLiveLocations', () => {
  let now: number;

  beforeEach(() => {
    jest.useFakeTimers();
    now = 1_000_000;
    jest.spyOn(Date, 'now').mockImplementation(() => now);
    testStore.setState({ liveLocations: {}, geolocationHubJoinedAt: 0 });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('snapshots', () => {
    it('re-applies live positions received after the fetch started', () => {
      const { result } = renderLiveMap();

      // Arrives while the REST request is in flight; the snapshot may predate it.
      push('u12', 11, 21, 5000);
      act(() => {
        result.current.applySnapshot(snapshotPins, 4000);
      });

      expect(result.current.pins[1]).toMatchObject({ Id: 'u12', Latitude: 11, Longitude: 21 });
    });

    it('does not roll a fresh snapshot back to an older live position', () => {
      const { result } = renderLiveMap();

      push('u12', 11, 21, 3000);
      act(() => {
        result.current.applySnapshot(snapshotPins, 4000);
      });

      expect(result.current.pins).toBe(snapshotPins);
    });
  });

  describe('pushes', () => {
    it('moves an existing pin in place without touching the others', () => {
      const { result } = renderLiveMap();
      act(() => {
        result.current.applySnapshot(snapshotPins, 0);
      });

      act(() => {
        push('u12', 11, 21);
      });

      expect(result.current.pins).toHaveLength(3);
      expect(result.current.pins[1]).toMatchObject({ Id: 'u12', Latitude: 11, Longitude: 21 });
      expect(result.current.pins[0]).toBe(callPin);
      expect(result.current.pins[2]).toBe(personnelPin);
    });

    it('matches personnel pins case-insensitively', () => {
      const { result } = renderLiveMap();
      act(() => {
        result.current.applySnapshot(snapshotPins, 0);
      });

      act(() => {
        push(`p${GUID.toLowerCase()}`, 31, 41);
      });

      expect(result.current.pins[2]).toMatchObject({ Id: `p${GUID}`, Latitude: 31, Longitude: 41 });
    });

    it('applies every push of a burst delivered in one frame', () => {
      const { result } = renderLiveMap();
      act(() => {
        result.current.applySnapshot(snapshotPins, 0);
      });

      act(() => {
        push('u12', 11, 21);
        push(`p${GUID.toLowerCase()}`, 31, 41);
      });

      expect(result.current.pins[1]).toMatchObject({ Latitude: 11, Longitude: 21 });
      expect(result.current.pins[2]).toMatchObject({ Latitude: 31, Longitude: 41 });
    });

    it('keeps the same pins array when a push leaves every pin where it was', () => {
      const { result } = renderLiveMap();
      act(() => {
        result.current.applySnapshot(snapshotPins, 0);
      });
      const pinsBefore = result.current.pins;

      act(() => {
        push('u12', 10, 20);
      });

      // Same reference: the memoized MapPins (and every marker) skip re-rendering entirely.
      expect(result.current.pins).toBe(pinsBefore);
    });

    it('never creates a pin from a push', () => {
      const { result } = renderLiveMap();
      act(() => {
        result.current.applySnapshot(snapshotPins, 0);
      });

      act(() => {
        push('u99', 5, 5);
      });

      expect(result.current.pins).toBe(snapshotPins);
    });

    it('stops listening once unmounted', () => {
      const { result, unmount } = renderLiveMap();
      act(() => {
        result.current.applySnapshot(snapshotPins, 0);
      });
      unmount();

      expect(() => push('u12', 11, 21)).not.toThrow();
    });
  });

  describe('unknown pins', () => {
    it('requests one coalesced refetch for several unknown pins', () => {
      const { result } = renderLiveMap();
      act(() => {
        result.current.applySnapshot(snapshotPins, 0);
      });

      act(() => {
        push('u98', 1, 1);
        push('u99', 2, 2);
      });
      expect(result.current.refreshRequestedAt).toBe(0);

      act(() => {
        jest.advanceTimersByTime(LIVE_LOCATION_REFRESH_DELAY_MS - 1);
      });
      expect(result.current.refreshRequestedAt).toBe(0);

      act(() => {
        jest.advanceTimersByTime(1);
      });
      const firstRefresh = result.current.refreshRequestedAt;
      expect(firstRefresh).toBeGreaterThan(0);

      act(() => {
        jest.advanceTimersByTime(LIVE_LOCATION_REFRESH_DELAY_MS * 3);
      });
      expect(result.current.refreshRequestedAt).toBe(firstRefresh);
    });

    it('lets each unknown pin trigger at most one refetch per cooldown window', () => {
      const { result } = renderLiveMap();
      act(() => {
        result.current.applySnapshot(snapshotPins, 0);
      });

      act(() => {
        push('u99', 1, 1);
        jest.advanceTimersByTime(LIVE_LOCATION_REFRESH_DELAY_MS);
      });
      const firstRefresh = result.current.refreshRequestedAt;
      expect(firstRefresh).toBeGreaterThan(0);

      // The viewer may simply not be allowed to see it: more pushes must not keep refetching.
      act(() => {
        now += 60_000;
        push('u99', 1.5, 1.5);
        jest.advanceTimersByTime(LIVE_LOCATION_REFRESH_DELAY_MS);
      });
      expect(result.current.refreshRequestedAt).toBe(firstRefresh);

      act(() => {
        now += UNKNOWN_PIN_REFRESH_COOLDOWN_MS;
        push('u99', 2, 2);
        jest.advanceTimersByTime(LIVE_LOCATION_REFRESH_DELAY_MS);
      });
      expect(result.current.refreshRequestedAt).toBeGreaterThan(firstRefresh);
    });

    it('does not treat pushes before the first snapshot as unknown', () => {
      const { result } = renderLiveMap();

      act(() => {
        push('u12', 11, 21);
        jest.advanceTimersByTime(LIVE_LOCATION_REFRESH_DELAY_MS * 2);
      });

      expect(result.current.refreshRequestedAt).toBe(0);
    });

    it('does not refetch for pins the snapshot already has', () => {
      const { result } = renderLiveMap();
      act(() => {
        result.current.applySnapshot(snapshotPins, 0);
      });

      act(() => {
        push('u12', 11, 21);
        push(`p${GUID.toLowerCase()}`, 31, 41);
        jest.advanceTimersByTime(LIVE_LOCATION_REFRESH_DELAY_MS * 2);
      });

      expect(result.current.refreshRequestedAt).toBe(0);
    });
  });

  describe('reconnect catch-up', () => {
    it('requests a refetch as soon as the geolocation hub rejoins', () => {
      const { result } = renderLiveMap();
      act(() => {
        result.current.applySnapshot(snapshotPins, 0);
      });

      act(() => {
        testStore.setState({ geolocationHubJoinedAt: now });
      });
      const firstRefresh = result.current.refreshRequestedAt;
      expect(firstRefresh).toBeGreaterThan(0);

      act(() => {
        now += 30_000;
        testStore.setState({ geolocationHubJoinedAt: now });
      });
      expect(result.current.refreshRequestedAt).toBeGreaterThan(firstRefresh);
    });

    it('folds a pending unknown-pin refetch into the catch-up', () => {
      const { result } = renderLiveMap();
      act(() => {
        result.current.applySnapshot(snapshotPins, 0);
      });

      act(() => {
        push('u99', 1, 1);
        testStore.setState({ geolocationHubJoinedAt: now });
      });
      const catchUp = result.current.refreshRequestedAt;

      act(() => {
        jest.advanceTimersByTime(LIVE_LOCATION_REFRESH_DELAY_MS * 2);
      });
      expect(result.current.refreshRequestedAt).toBe(catchUp);
    });
  });
});
