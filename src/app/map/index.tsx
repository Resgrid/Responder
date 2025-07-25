import Mapbox from '@rnmapbox/maps';
import { Stack, useFocusEffect } from 'expo-router';
import { NavigationIcon } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, StyleSheet, TouchableOpacity, View } from 'react-native';

import { getMapDataAndMarkers } from '@/api/mapping/mapping';
import MapPins from '@/components/maps/map-pins';
import PinDetailModal from '@/components/maps/pin-detail-modal';
import { FocusAwareStatusBar } from '@/components/ui/focus-aware-status-bar';
import { useAppLifecycle } from '@/hooks/use-app-lifecycle';
import { useMapSignalRUpdates } from '@/hooks/use-map-signalr-updates';
import { Env } from '@/lib/env';
import { logger } from '@/lib/logging';
import { onSortOptions } from '@/lib/utils';
import { type MapMakerInfoData } from '@/models/v4/mapping/getMapDataAndMarkersData';
import { locationService } from '@/services/location';
import { useCoreStore } from '@/stores/app/core-store';
import { useLocationStore } from '@/stores/app/location-store';
import { useToastStore } from '@/stores/toast/store';

Mapbox.setAccessToken(Env.UNIT_MAPBOX_PUBKEY);

export default function Map() {
  const { t } = useTranslation();
  const mapRef = useRef<Mapbox.MapView>(null);
  const cameraRef = useRef<Mapbox.Camera>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [hasUserMovedMap, setHasUserMovedMap] = useState(false);
  const [mapPins, setMapPins] = useState<MapMakerInfoData[]>([]);
  const [selectedPin, setSelectedPin] = useState<MapMakerInfoData | null>(null);
  const [isPinDetailModalOpen, setIsPinDetailModalOpen] = useState(false);
  const { isActive } = useAppLifecycle();
  const location = useLocationStore((state) => ({
    latitude: state.latitude,
    longitude: state.longitude,
    heading: state.heading,
    isMapLocked: state.isMapLocked,
  }));

  const _mapOptions = Object.keys(Mapbox.StyleURL)
    .map((key) => {
      return {
        label: key,
        data: (Mapbox.StyleURL as any)[key],
      };
    })
    .sort(onSortOptions);

  const [styleURL] = useState({ styleURL: _mapOptions[0].data });

  const pulseAnim = useRef(new Animated.Value(1)).current;
  useMapSignalRUpdates(setMapPins);

  // Handle navigation focus - reset map state when user navigates back to map page
  useFocusEffect(
    useCallback(() => {
      // Reset hasUserMovedMap when navigating back to map
      setHasUserMovedMap(false);

      // Reset camera to current location when navigating back to map
      if (isMapReady && location.latitude && location.longitude) {
        const cameraConfig: any = {
          centerCoordinate: [location.longitude, location.latitude],
          zoomLevel: location.isMapLocked ? 16 : 12,
          animationDuration: 1000,
          heading: 0,
          pitch: 0,
        };

        // Add heading and pitch for navigation mode when locked
        if (location.isMapLocked && location.heading !== null && location.heading !== undefined) {
          cameraConfig.heading = location.heading;
          cameraConfig.pitch = 45;
        }

        cameraRef.current?.setCamera(cameraConfig);

        logger.info({
          message: 'Map focused, resetting camera to current location',
          context: {
            latitude: location.latitude,
            longitude: location.longitude,
            isMapLocked: location.isMapLocked,
          },
        });
      }
    }, [isMapReady, location.latitude, location.longitude, location.isMapLocked, location.heading])
  );

  useEffect(() => {
    const startLocationTracking = async () => {
      try {
        await locationService.startLocationUpdates();
        logger.info({
          message: 'Location tracking started successfully',
        });
      } catch (error) {
        logger.error({
          message: 'MapPage: Failed to start location tracking. ' + JSON.stringify(error),
          context: {
            error,
          },
        });

        useToastStore.getState().showToast('error', 'Failed to start location tracking');
      }
    };

    startLocationTracking();

    return () => {
      locationService.stopLocationUpdates();
    };
  }, []);

  useEffect(() => {
    if (isMapReady && location.latitude && location.longitude) {
      logger.info({
        message: 'Location updated and map is ready',
        context: {
          latitude: location.latitude,
          longitude: location.longitude,
          heading: location.heading,
          isMapLocked: location.isMapLocked,
        },
      });

      // When map is locked, always follow the location
      // When map is unlocked, only follow if user hasn't moved the map
      if (location.isMapLocked || !hasUserMovedMap) {
        const cameraConfig: any = {
          centerCoordinate: [location.longitude, location.latitude],
          zoomLevel: location.isMapLocked ? 16 : 12,
          animationDuration: location.isMapLocked ? 500 : 1000,
        };

        // Add heading and pitch for navigation mode when locked
        if (location.isMapLocked && location.heading !== null && location.heading !== undefined) {
          cameraConfig.heading = location.heading;
          cameraConfig.pitch = 45;
        }

        cameraRef.current?.setCamera(cameraConfig);
      }
    }
  }, [isMapReady, location.latitude, location.longitude, location.heading, location.isMapLocked, hasUserMovedMap]);

  // Reset hasUserMovedMap when map gets locked and reset camera when unlocked
  useEffect(() => {
    if (location.isMapLocked) {
      setHasUserMovedMap(false);
    } else {
      // When exiting locked mode, reset camera to normal view and reset user interaction state
      setHasUserMovedMap(false);

      if (isMapReady && location.latitude && location.longitude) {
        cameraRef.current?.setCamera({
          centerCoordinate: [location.longitude, location.latitude],
          zoomLevel: 12,
          heading: 0,
          pitch: 0,
          animationDuration: 1000,
        });
        logger.info({
          message: 'Map unlocked, resetting camera to normal view and user interaction state',
          context: {
            latitude: location.latitude,
            longitude: location.longitude,
          },
        });
      }
    }
  }, [isMapReady, location.isMapLocked, location.latitude, location.longitude]);

  useEffect(() => {
    const fetchMapDataAndMarkers = async () => {
      const mapDataAndMarkers = await getMapDataAndMarkers();

      if (mapDataAndMarkers && mapDataAndMarkers.Data) {
        setMapPins(mapDataAndMarkers.Data.MapMakerInfos);
      }
    };

    fetchMapDataAndMarkers();
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

  const onCameraChanged = (event: any) => {
    // Only register user interaction if map is not locked
    if (event.properties.isUserInteraction && !location.isMapLocked) {
      setHasUserMovedMap(true);
    }
  };

  const handleRecenterMap = () => {
    if (location.latitude && location.longitude) {
      const cameraConfig: any = {
        centerCoordinate: [location.longitude, location.latitude],
        zoomLevel: location.isMapLocked ? 16 : 12,
        animationDuration: 1000,
      };

      // Add heading and pitch for navigation mode when locked
      if (location.isMapLocked && location.heading !== null && location.heading !== undefined) {
        cameraConfig.heading = location.heading;
        cameraConfig.pitch = 45;
      }

      cameraRef.current?.setCamera(cameraConfig);
      setHasUserMovedMap(false);
    }
  };

  const handlePinPress = (pin: MapMakerInfoData) => {
    setSelectedPin(pin);
    setIsPinDetailModalOpen(true);
  };

  const handleSetAsCurrentCall = async (pin: MapMakerInfoData) => {
    try {
      logger.info({
        message: 'Setting call as current call',
        context: {
          callId: pin.Id,
          callTitle: pin.Title,
        },
      });

      await useCoreStore.getState().setActiveCall(pin.Id);
      useToastStore.getState().showToast('success', t('map.call_set_as_current'));
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
  };

  const handleClosePinDetail = () => {
    setIsPinDetailModalOpen(false);
    setSelectedPin(null);
  };

  // Show recenter button only when map is not locked and user has moved the map
  const showRecenterButton = !location.isMapLocked && hasUserMovedMap && location.latitude && location.longitude;

  return (
    <>
      <Stack.Screen
        options={{
          title: t('tabs.map'),
          headerTitle: t('app.title'),
          headerShown: true,
        }}
      />
      <View className="size-full flex-1" testID="map-container">
        <FocusAwareStatusBar />
        <Mapbox.MapView
          ref={mapRef}
          styleURL={styleURL.styleURL}
          style={styles.map}
          onCameraChanged={onCameraChanged}
          onDidFinishLoadingMap={() => setIsMapReady(true)}
          testID="map-view"
          scrollEnabled={!location.isMapLocked}
          zoomEnabled={!location.isMapLocked}
          rotateEnabled={!location.isMapLocked}
          pitchEnabled={!location.isMapLocked}
        >
          <Mapbox.Camera
            ref={cameraRef}
            followZoomLevel={location.isMapLocked ? 16 : 12}
            followUserLocation={location.isMapLocked}
            followUserMode={location.isMapLocked ? Mapbox.UserTrackingMode.FollowWithHeading : undefined}
            followPitch={location.isMapLocked ? 45 : undefined}
          />

          {location.latitude && location.longitude && (
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
                  {location.heading !== null && location.heading !== undefined && (
                    <View
                      style={[
                        styles.directionIndicator,
                        {
                          transform: [{ rotate: `${location.heading}deg` }],
                        },
                      ]}
                    />
                  )}
                </View>
              </Animated.View>
            </Mapbox.PointAnnotation>
          )}
          <MapPins pins={mapPins} onPinPress={handlePinPress} />
        </Mapbox.MapView>

        {/* Recenter Button - only show when map is not locked and user has moved the map */}
        {showRecenterButton && (
          <TouchableOpacity style={styles.recenterButton} onPress={handleRecenterMap} testID="recenter-button">
            <NavigationIcon size={20} color="#ffffff" />
          </TouchableOpacity>
        )}
      </View>

      {/* Pin Detail Modal */}
      <PinDetailModal pin={selectedPin} isOpen={isPinDetailModalOpen} onClose={handleClosePinDetail} onSetAsCurrentCall={handleSetAsCurrentCall} />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
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
