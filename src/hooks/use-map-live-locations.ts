import { type Dispatch, type SetStateAction, useCallback, useEffect, useRef, useState } from 'react';

import { applyLiveLocations, diffLiveLocations, getLiveLocationPinIds } from '@/lib/live-locations';
import { logger } from '@/lib/logging';
import { type MapMakerInfoData } from '@/models/v4/mapping/getMapDataAndMarkersData';
import { useSignalRStore } from '@/stores/signalr/signalr-store';

/** Pushes for pins the map does not have are coalesced into one background refetch, this long after the first. */
export const LIVE_LOCATION_REFRESH_DELAY_MS = 4000;
/** Each unknown pin may trigger at most one refetch per window, so entities the viewer may not see cannot cause a refetch storm. */
export const UNKNOWN_PIN_REFRESH_COOLDOWN_MS = 5 * 60 * 1000;

export interface UseMapLiveLocationsResult {
  /**
   * Replace the pins with a REST snapshot. Live positions received at or after `fetchStartedAt` are
   * re-applied, because the snapshot can be older than a push that arrived while it was in flight;
   * older live positions are not, so they never roll a fresh snapshot back.
   */
  applySnapshot: (pins: MapMakerInfoData[], fetchStartedAt: number) => void;
  /** Epoch ms bumped whenever live locations need a background refetch; pass it to useMapSignalRUpdates. */
  refreshRequestedAt: number;
}

const nextRefreshStamp = (previous: number): number => Math.max(previous + 1, Date.now());

/**
 * Move a live map's unit and personnel pins as the geolocation hub pushes positions.
 *
 * Pushes only move pins the REST snapshot already contains: the hub skips the per-viewer visibility
 * rules the REST endpoint applies, so a push for an unknown pin asks for a (rate-limited) refetch
 * instead of creating one. Pins move by replacing only the moved pin objects, so markers keep their
 * keys and the camera is never touched.
 *
 * Route every REST snapshot through `applySnapshot`; moves go through `setPins` as functional updates.
 */
export const useMapLiveLocations = (setPins: Dispatch<SetStateAction<MapMakerInfoData[]>>): UseMapLiveLocationsResult => {
  const [refreshRequestedAt, setRefreshRequestedAt] = useState(0);
  // Membership only changes with a snapshot, so "unknown" is judged against the last one. Null until
  // the first snapshot lands: before that every push would look unknown, and the snapshot covers them.
  const knownPinIdsRef = useRef<Set<string> | null>(null);
  const unknownRefreshRequestedAtRef = useRef(new Map<string, number>());
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearRefreshTimer = useCallback(() => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  }, []);

  const requestRefreshNow = useCallback(() => {
    // One refetch covers whatever a pending coalesced one was waiting for.
    clearRefreshTimer();
    setRefreshRequestedAt(nextRefreshStamp);
  }, [clearRefreshTimer]);

  const requestCoalescedRefresh = useCallback(() => {
    if (refreshTimerRef.current) {
      return;
    }
    refreshTimerRef.current = setTimeout(() => {
      refreshTimerRef.current = null;
      setRefreshRequestedAt(nextRefreshStamp);
    }, LIVE_LOCATION_REFRESH_DELAY_MS);
  }, []);

  const handleUnknownPins = useCallback(
    (pinIds: string[]) => {
      const now = Date.now();
      const requestedAt = unknownRefreshRequestedAtRef.current;
      const due = pinIds.filter((pinId) => {
        const last = requestedAt.get(pinId);
        return last === undefined || now - last >= UNKNOWN_PIN_REFRESH_COOLDOWN_MS;
      });
      if (due.length === 0) {
        return;
      }
      due.forEach((pinId) => requestedAt.set(pinId, now));
      logger.debug({
        message: 'Live location received for pins not on the map, scheduling a refetch',
        context: { pinIds: due },
      });
      requestCoalescedRefresh();
    },
    [requestCoalescedRefresh]
  );

  const applySnapshot = useCallback(
    (pins: MapMakerInfoData[], fetchStartedAt: number) => {
      knownPinIdsRef.current = getLiveLocationPinIds(pins);
      const { liveLocations } = useSignalRStore.getState();
      setPins(applyLiveLocations(pins, liveLocations, { receivedSince: fetchStartedAt }).pins);
    },
    [setPins]
  );

  useEffect(() => {
    const unsubscribe = useSignalRStore.subscribe((state, previous) => {
      if (state.liveLocations !== previous.liveLocations) {
        const changed = diffLiveLocations(state.liveLocations, previous.liveLocations);
        if (changed) {
          setPins((current) => applyLiveLocations(current, changed).pins);

          const knownPinIds = knownPinIdsRef.current;
          if (knownPinIds) {
            const unknownPinIds = Object.keys(changed).filter((pinId) => !knownPinIds.has(pinId.toLowerCase()));
            if (unknownPinIds.length > 0) {
              handleUnknownPins(unknownPinIds);
            }
          }
        }
      }

      // Positions sent while the hub was down are never replayed; catch up once it has rejoined.
      if (state.geolocationHubJoinedAt !== previous.geolocationHubJoinedAt && state.geolocationHubJoinedAt > 0) {
        requestRefreshNow();
      }
    });

    return () => {
      unsubscribe();
      clearRefreshTimer();
    };
  }, [clearRefreshTimer, handleUnknownPins, requestRefreshNow, setPins]);

  return { applySnapshot, refreshRequestedAt };
};
