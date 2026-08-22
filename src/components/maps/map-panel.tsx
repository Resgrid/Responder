import Mapbox from '@rnmapbox/maps';
import { useFocusEffect, useRouter } from 'expo-router';
import { NavigationIcon } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, StyleSheet, TouchableOpacity, View } from 'react-native';

import { getMapDataAndMarkers } from '@/api/mapping/mapping';
import { Loading } from '@/components/common/loading';
import { useAnalytics } from '@/hooks/use-analytics';
import { useMapSignalRUpdates } from '@/hooks/use-map-signalr-updates';
import { logger } from '@/lib/logging';
import { isPoiMarker } from '@/lib/poi';
import { onSortOptions } from '@/lib/utils';
import { type MapMakerInfoData } from '@/models/v4/mapping/getMapDataAndMarkersData';
import { type PoiResultData } from '@/models/v4/mapping/poiResultData';
import { useCoreStore } from '@/stores/app/core-store';
import { useLocationStore } from '@/stores/app/location-store';
import { useToastStore } from '@/stores/toast/store';

import MapPins from './map-pins';
import PinDetailModal from './pin-detail-modal';

interface MapPanelProps {
  focusedPoi: PoiResultData | null;
}

export const MapPanel: React.FC<MapPanelProps> = ({ focusedPoi }) => {
  const { t } = useTranslation();
  const router = useRouter();
  const { trackEvent } = useAnalytics();
  const mapRef = useRef<Mapbox.MapView>(null);
  const cameraRef = useRef<Mapbox.Camera>(null);
  const lastFocusedPoiId = useRef<number | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  // Tracks navigation focus so we can quiesce the camera when leaving the map screen.
  // rnmapbox (Fabric/New Arch) can dispatch a cameraChanged event into a freed native
  // event emitter during teardown, causing an EXC_BAD_ACCESS crash. Keeping the camera
  // idle while blurred shrinks that race window.
  const [isScreenFocused, setIsScreenFocused] = useState(true);
  const [hasUserMovedMap, setHasUserMovedMap] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [mapPins, setMapPins] = useState<MapMakerInfoData[]>([]);
  const [selectedPin, setSelectedPin] = useState<MapMakerInfoData | null>(null);
  const [isPinDetailModalOpen, setIsPinDetailModalOpen] = useState(false);
  const latitude = useLocationStore((state) => state.latitude);
  const longitude = useLocationStore((state) => state.longitude);
  const heading = useLocationStore((state) => state.heading);
  const isMapLocked = useLocationStore((state) => state.isMapLocked);

  const mapOptions = useMemo(() => {
    return Object.keys(Mapbox.StyleURL)
      .map((key) => ({
        label: key,
        data: (Mapbox.StyleURL as Record<string, string>)[key],
      }))
      .sort(onSortOptions);
  }, []);

  const styleURL = mapOptions[0]?.data;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const isFollowingUser = isScreenFocused && isMapLocked && focusedPoi == null;
  const isInteractionLocked = isMapLocked && focusedPoi == null;
  const showRecenterButton = !isFollowingUser && hasUserMovedMap && latitude != null && longitude != null;

  useMapSignalRUpdates(setMapPins);

  // Keep isScreenFocused in sync with navigation focus. Stable callback so it only
  // fires on real focus/blur transitions, not on every dependency change.
  useFocusEffect(
    useCallback(() => {
      setIsScreenFocused(true);
      return () => setIsScreenFocused(false);
    }, [])
  );

  // Live snapshot for the focus effect below. The location service writes to the store
  // every 15s/10m, so these values must never appear in that effect's dependency list.
  const focusSnapshotRef = useRef({ focusedPoi, isMapLocked, latitude, longitude, trackEvent });
  focusSnapshotRef.current = { focusedPoi, isMapLocked, latitude, longitude, trackEvent };

  useFocusEffect(
    // Deps MUST stay empty so this only runs on real focus transitions. Camera follow is
    // owned by the location-driven effect below; clearing hasUserMovedMap re-arms it so
    // the map recenters once on focus instead of snapping back on every location tick.
    useCallback(() => {
      const snapshot = focusSnapshotRef.current;

      snapshot.trackEvent('map_viewed', {
        timestamp: new Date().toISOString(),
        isMapLocked: snapshot.isMapLocked,
        hasLocation: snapshot.latitude != null && snapshot.longitude != null,
      });

      if (snapshot.focusedPoi == null) {
        setHasUserMovedMap(false);
      }
    }, [])
  );

  useEffect(() => {
    if (focusedPoi != null && isMapReady && lastFocusedPoiId.current !== focusedPoi.PoiId) {
      cameraRef.current?.setCamera({
        centerCoordinate: [focusedPoi.Longitude, focusedPoi.Latitude],
        zoomLevel: 15,
        animationDuration: 1000,
      });
      setHasUserMovedMap(true);
      lastFocusedPoiId.current = focusedPoi.PoiId;

      trackEvent('map_poi_focused', {
        timestamp: new Date().toISOString(),
        poiId: focusedPoi.PoiId,
        poiTypeId: focusedPoi.PoiTypeId,
      });
    } else if (focusedPoi == null) {
      lastFocusedPoiId.current = null;
    }
  }, [focusedPoi, isMapReady, trackEvent]);

  useEffect(() => {
    // Skip while blurred so background location updates don't animate the camera
    // (and emit cameraChanged events) after navigating off the map screen.
    if (!isScreenFocused || focusedPoi != null) {
      return;
    }

    if (isMapReady && latitude != null && longitude != null) {
      if (isFollowingUser || !hasUserMovedMap) {
        const cameraConfig: {
          centerCoordinate: [number, number];
          zoomLevel: number;
          animationDuration: number;
          heading?: number;
          pitch?: number;
        } = {
          centerCoordinate: [longitude, latitude],
          zoomLevel: isMapLocked ? 16 : 12,
          animationDuration: isMapLocked ? 500 : 1000,
        };

        if (isMapLocked && heading != null) {
          cameraConfig.heading = heading;
          cameraConfig.pitch = 45;
        }

        cameraRef.current?.setCamera(cameraConfig);
      }
    }
  }, [focusedPoi, hasUserMovedMap, isFollowingUser, isMapReady, isScreenFocused, heading, isMapLocked, latitude, longitude]);

  useEffect(() => {
    if (focusedPoi != null) {
      return;
    }

    if (isMapLocked) {
      setHasUserMovedMap(false);
      return;
    }

    setHasUserMovedMap(false);

    // Only drive the camera while focused — see isScreenFocused note above.
    if (isScreenFocused && isMapReady && latitude != null && longitude != null) {
      cameraRef.current?.setCamera({
        centerCoordinate: [longitude, latitude],
        zoomLevel: 12,
        heading: 0,
        pitch: 0,
        animationDuration: 1000,
      });
    }
  }, [focusedPoi, isMapReady, isScreenFocused, isMapLocked, latitude, longitude]);

  useEffect(() => {
    let isMounted = true;

    const fetchMapDataAndMarkers = async () => {
      try {
        const mapDataAndMarkers = await getMapDataAndMarkers();

        if (isMounted && mapDataAndMarkers?.Data) {
          setMapPins(mapDataAndMarkers.Data.MapMakerInfos);
        }
      } catch (error) {
        logger.error({
          message: 'Failed to fetch initial map markers',
          context: { error },
        });
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void fetchMapDataAndMarkers();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  const onCameraChanged = useCallback(
    (event: any) => {
      if (event.properties?.isUserInteraction && !isInteractionLocked) {
        setHasUserMovedMap(true);
      }
    },
    [isInteractionLocked]
  );

  const handleRecenterMap = useCallback(() => {
    if (latitude != null && longitude != null) {
      const cameraConfig: {
        centerCoordinate: [number, number];
        zoomLevel: number;
        animationDuration: number;
        heading?: number;
        pitch?: number;
      } = {
        centerCoordinate: [longitude, latitude],
        zoomLevel: isMapLocked ? 16 : 12,
        animationDuration: 1000,
      };

      if (isMapLocked && heading != null) {
        cameraConfig.heading = heading;
        cameraConfig.pitch = 45;
      }

      cameraRef.current?.setCamera(cameraConfig);
      setHasUserMovedMap(false);

      trackEvent('map_recentered', {
        timestamp: new Date().toISOString(),
        isMapLocked: isMapLocked,
        zoomLevel: isMapLocked ? 16 : 12,
      });
    }
  }, [heading, isMapLocked, latitude, longitude, trackEvent]);

  const handlePinPress = useCallback(
    (pin: MapMakerInfoData) => {
      trackEvent('map_pin_pressed', {
        timestamp: new Date().toISOString(),
        pinId: pin.Id,
        pinTitle: pin.Title,
        pinType: pin.Type,
      });

      if (isPoiMarker(pin)) {
        router.push(`/poi/${pin.Id}`);
        return;
      }

      setSelectedPin(pin);
      setIsPinDetailModalOpen(true);
    },
    [router, trackEvent]
  );

  const handleSetAsCurrentCall = useCallback(
    async (pin: MapMakerInfoData) => {
      try {
        await useCoreStore.getState().setActiveCall(pin.Id);
        useToastStore.getState().showToast('success', t('map.call_set_as_current'));

        trackEvent('map_pin_set_as_current_call', {
          timestamp: new Date().toISOString(),
          pinId: pin.Id,
          pinTitle: pin.Title,
          pinType: pin.Type,
        });
      } catch (error) {
        logger.error({
          message: 'Failed to set call as current call',
          context: {
            error,
            callId: pin.Id,
            callTitle: pin.Title,
          },
        });

        useToastStore.getState().showToast('error', t('map.failed_to_set_current_call'));
      }
    },
    [t, trackEvent]
  );

  const handleClosePinDetail = useCallback(() => {
    setIsPinDetailModalOpen(false);
    setSelectedPin(null);
  }, []);

  return (
    <View className="flex-1">
      <Mapbox.MapView
        ref={mapRef}
        styleURL={styleURL}
        style={styles.map}
        onCameraChanged={onCameraChanged}
        onDidFinishLoadingMap={() => setIsMapReady(true)}
        testID="home-map-view"
        scrollEnabled={!isInteractionLocked}
        zoomEnabled={!isInteractionLocked}
        rotateEnabled={!isInteractionLocked}
        pitchEnabled={!isInteractionLocked}
      >
        <Mapbox.Camera
          ref={cameraRef}
          followZoomLevel={isMapLocked ? 16 : 12}
          followUserLocation={isFollowingUser}
          {...(isFollowingUser ? { followUserMode: Mapbox.UserTrackingMode.FollowWithHeading } : {})}
          {...(isFollowingUser ? { followPitch: 45 } : {})}
        />

        {latitude != null && longitude != null ? (
          <Mapbox.PointAnnotation id="userLocation" coordinate={[longitude, latitude]} anchor={{ x: 0.5, y: 0.5 }}>
            <Animated.View
              style={[
                styles.markerContainer,
                {
                  transform: [{ scale: pulseAnim }],
                },
              ]}
            >
              <View style={styles.markerOuterRing} />
              <View style={styles.markerInnerContainer}>
                <View style={styles.markerDot} />
                {heading != null ? (
                  <View
                    style={[
                      styles.directionIndicator,
                      {
                        transform: [{ rotate: `${heading}deg` }],
                      },
                    ]}
                  />
                ) : null}
              </View>
            </Animated.View>
          </Mapbox.PointAnnotation>
        ) : null}
        <MapPins pins={mapPins} onPinPress={handlePinPress} />
      </Mapbox.MapView>

      {showRecenterButton ? (
        <TouchableOpacity style={styles.recenterButton} onPress={handleRecenterMap} testID="recenter-button">
          <NavigationIcon size={20} color="#ffffff" />
        </TouchableOpacity>
      ) : null}

      {isLoading ? <Loading text={t('map.loading_markers')} transparent={true} fullscreen={true} /> : null}

      <PinDetailModal pin={selectedPin} isOpen={isPinDetailModalOpen} onClose={handleClosePinDetail} onSetAsCurrentCall={handleSetAsCurrentCall} />
    </View>
  );
};

const styles = StyleSheet.create({
  map: {
    flex: 1,
  },
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
    height: 60,
    position: 'relative',
  },
  markerOuterRing: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderWidth: 2,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  markerInnerContainer: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    borderWidth: 3,
    borderColor: '#ffffff',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  markerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ffffff',
  },
  directionIndicator: {
    position: 'absolute',
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 24,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#3b82f6',
    top: -36,
  },
  recenterButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
});

export default MapPanel;
