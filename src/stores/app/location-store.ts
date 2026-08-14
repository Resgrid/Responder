import type * as Location from 'expo-location';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { zustandStorage } from '@/lib/storage';

export interface LocationState {
  latitude: number | null;
  longitude: number | null;
  heading: number | null;
  accuracy: number | null;
  speed: number | null;
  altitude: number | null;
  timestamp: number | null;
  isBackgroundEnabled: boolean;
  isMapLocked: boolean;
  setLocation: (location: Location.LocationObject) => void;
  setBackgroundEnabled: (enabled: boolean) => void;
  setMapLocked: (locked: boolean) => void;
}

export const useLocationStore = create<LocationState>()(
  persist(
    (set) => ({
      latitude: null,
      longitude: null,
      heading: null,
      accuracy: null,
      speed: null,
      altitude: null,
      timestamp: null,
      isBackgroundEnabled: false,
      isMapLocked: false,
      // iOS ignores `timeInterval` on watchPositionAsync, so a stationary device still
      // delivers fixes many times a second. Writing every one of them notified every
      // subscriber at that rate and React eventually gave up with "Maximum update depth
      // exceeded". Bail out when the fix carries nothing new — returning the current state
      // makes zustand skip the notification entirely. `timestamp` is deliberately left out
      // of the comparison: it changes on every fix and has no subscriber, so including it
      // would defeat the guard.
      setLocation: (location) =>
        set((state) => {
          const { latitude, longitude, heading, accuracy, speed, altitude } = location.coords;

          if (state.latitude === latitude && state.longitude === longitude && state.heading === heading && state.accuracy === accuracy && state.speed === speed && state.altitude === altitude) {
            return state;
          }

          return { latitude, longitude, heading, accuracy, speed, altitude, timestamp: location.timestamp };
        }),
      setBackgroundEnabled: (enabled) => set({ isBackgroundEnabled: enabled }),
      setMapLocked: (locked) => set({ isMapLocked: locked }),
    }),
    {
      name: 'location-storage',
      storage: createJSONStorage(() => zustandStorage),
      version: 1,
      migrate: (persistedState, version) => {
        if (version < 1 && persistedState && typeof persistedState === 'object') {
          const migratedState = { ...(persistedState as Partial<LocationState>) };
          delete migratedState.latitude;
          delete migratedState.longitude;
          return migratedState as LocationState;
        }
        return persistedState as LocationState;
      },
      partialize: (state) => ({
        isBackgroundEnabled: state.isBackgroundEnabled,
        isMapLocked: state.isMapLocked,
      }),
    }
  )
);
