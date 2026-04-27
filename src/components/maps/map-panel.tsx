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
import { onSortOptions } from '@/lib/utils';
import { type MapMakerInfoData } from '@/models/v4/mapping/getMapDataAndMarkersData';
import { type PoiResultData } from '@/models/v4/mapping/poiResultData';
import { useCoreStore } from '@/stores/app/core-store';
import { useLocationStore } from '@/stores/app/location-store';
import { useToastStore } from '@/stores/toast/store';

import MapPins from './map-pins';
import PinDetailModal from './pin-detail-modal';

const POI_MARKER_TYPE = 4;

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
  const [hasUserMovedMap, setHasUserMovedMap] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [mapPins, setMapPins] = useState<MapMakerInfoData[]>([]);
  const [selectedPin, setSelectedPin] = useState<MapMakerInfoData | null>(null);
  const [isPinDetailModalOpen, setIsPinDetailModalOpen] = useState(false);
  const location = useLocationStore((state) => ({
    latitude: state.latitude,
    longitude: state.longitude,
    heading: state.heading,
    isMapLocked: state.isMapLocked,
  }));

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
  const isFollowingUser = location.isMapLocked && focusedPoi == null;
  const isInteractionLocked = location.isMapLocked && focusedPoi == null;
  const showRecenterButton = !isFollowingUser && hasUserMovedMap && location.latitude != null && location.longitude != null;

  useMapSignalRUpdates(setMapPins);

  useFocusEffect(
    useCallback(() => {
      trackEvent('map_viewed', {
        timestamp: new Date().toISOString(),
        isMapLocked: location.isMapLocked,
        hasLocation: location.latitude != null && location.longitude != null,
      });

      if (focusedPoi == null) {
        setHasUserMovedMap(false);
      }

      if (focusedPoi == null && isMapReady && location.latitude != null && location.longitude != null) {
        const cameraConfig: {
          centerCoordinate: [number, number];
          zoomLevel: number;
          animationDuration: number;
          heading: number;
          pitch: number;
        } = {
          centerCoordinate: [location.longitude, location.latitude],
          zoomLevel: location.isMapLocked ? 16 : 12,
          animationDuration: 1000,
          heading: 0,
          pitch: 0,
        };

        if (location.isMapLocked && location.heading != null) {
          cameraConfig.heading = location.heading;
          cameraConfig.pitch = 45;
        }

        cameraRef.current?.setCamera(cameraConfig);
      }
    }, [focusedPoi, isMapReady, location.heading, location.isMapLocked, location.latitude, location.longitude, trackEvent])
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
    if (focusedPoi != null) {
      return;
    }

    if (isMapReady && location.latitude != null && location.longitude != null) {
      if (isFollowingUser || !hasUserMovedMap) {
        const cameraConfig: {
          centerCoordinate: [number, number];
          zoomLevel: number;
          animationDuration: number;
          heading?: number;
          pitch?: number;
        } = {
          centerCoordinate: [location.longitude, location.latitude],
          zoomLevel: location.isMapLocked ? 16 : 12,
          animationDuration: location.isMapLocked ? 500 : 1000,
        };

        if (location.isMapLocked && location.heading != null) {
          cameraConfig.heading = location.heading;
          cameraConfig.pitch = 45;
        }

        cameraRef.current?.setCamera(cameraConfig);
      }
    }
  }, [focusedPoi, hasUserMovedMap, isFollowingUser, isMapReady, location.heading, location.isMapLocked, location.latitude, location.longitude]);

  useEffect(() => {
    if (focusedPoi != null) {
      return;
    }

    if (location.isMapLocked) {
      setHasUserMovedMap(false);
      return;
    }

    setHasUserMovedMap(false);

    if (isMapReady && location.latitude != null && location.longitude != null) {
      cameraRef.current?.setCamera({
        centerCoordinate: [location.longitude, location.latitude],
        zoomLevel: 12,
        heading: 0,
        pitch: 0,
        animationDuration: 1000,
      });
    }
  }, [focusedPoi, isMapReady, location.isMapLocked, location.latitude, location.longitude]);

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
    if (location.latitude != null && location.longitude != null) {
      const cameraConfig: {
        centerCoordinate: [number, number];
        zoomLevel: number;
        animationDuration: number;
        heading?: number;
        pitch?: number;
      } = {
        centerCoordinate: [location.longitude, location.latitude],
        zoomLevel: location.isMapLocked ? 16 : 12,
        animationDuration: 1000,
      };

      if (location.isMapLocked && location.heading != null) {
        cameraConfig.heading = location.heading;
        cameraConfig.pitch = 45;
      }

      cameraRef.current?.setCamera(cameraConfig);
      setHasUserMovedMap(false);

      trackEvent('map_recentered', {
        timestamp: new Date().toISOString(),
        isMapLocked: location.isMapLocked,
        zoomLevel: location.isMapLocked ? 16 : 12,
      });
    }
  }, [location.heading, location.isMapLocked, location.latitude, location.longitude, trackEvent]);

  const handlePinPress = useCallback(
    (pin: MapMakerInfoData) => {
      trackEvent('map_pin_pressed', {
        timestamp: new Date().toISOString(),
        pinId: pin.Id,
        pinTitle: pin.Title,
        pinType: pin.Type,
      });

      const isPoiPin = pin.Type === POI_MARKER_TYPE || pin.PoiTypeId != null;

      if (isPoiPin) {
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
          followZoomLevel={location.isMapLocked ? 16 : 12}
          followUserLocation={isFollowingUser}
          {...(isFollowingUser ? { followUserMode: Mapbox.UserTrackingMode.FollowWithHeading } : {})}
          {...(isFollowingUser ? { followPitch: 45 } : {})}
        />

        {location.latitude != null && location.longitude != null ? (
          <Mapbox.PointAnnotation id="userLocation" coordinate={[location.longitude, location.latitude]} anchor={{ x: 0.5, y: 0.5 }}>
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
                {location.heading != null ? (
                  <View
                    style={[
                      styles.directionIndicator,
                      {
                        transform: [{ rotate: `${location.heading}deg` }],
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
