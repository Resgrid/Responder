import Mapbox from '@rnmapbox/maps';
import * as Location from 'expo-location';
import { AlertTriangle } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, TouchableOpacity } from 'react-native';

import { Box } from '@/components/ui/box';
import { Button, ButtonText } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Env } from '@/lib/env';

interface LocationPickerProps {
  initialLocation?:
  | {
    latitude: number;
    longitude: number;
    address?: string;
  }
  | undefined;
  onLocationSelected: (location: { latitude: number; longitude: number; address?: string }) => void;
  height?: number;
}

const LocationPicker: React.FC<LocationPickerProps> = ({ initialLocation, onLocationSelected, height = 200 }) => {
  const { t } = useTranslation();
  const mapRef = useRef<Mapbox.MapView>(null);
  const cameraRef = useRef<Mapbox.Camera>(null);
  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(initialLocation || null);
  const [isLoading, setIsLoading] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [hasAttemptedLocationFetch, setHasAttemptedLocationFetch] = useState(false);

  // Check if Mapbox is properly configured
  const isMapboxConfigured = Boolean(Env.RESPOND_MAPBOX_PUBKEY && Env.RESPOND_MAPBOX_PUBKEY.trim() !== '');

  useEffect(() => {
    if (!isMapboxConfigured) {
      setMapError(t('maps.mapbox_not_configured', 'Mapbox is not configured. Please contact your administrator.'));
      return;
    }
  }, [isMapboxConfigured, t]);

  const getUserLocation = React.useCallback(async () => {
    setIsLoading(true);
    setHasAttemptedLocationFetch(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.error('Location permission not granted');
        setIsLoading(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const newLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      setCurrentLocation(newLocation);

      // Move camera to user location
      if (cameraRef.current) {
        cameraRef.current.setCamera({
          centerCoordinate: [location.coords.longitude, location.coords.latitude],
          zoomLevel: 15,
          animationDuration: 1000,
        });
      }
    } catch (error) {
      console.error('Error getting location:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // If Mapbox is not configured, don't try to get location
    if (!isMapboxConfigured) {
      return;
    }

    // Treat 0,0 coordinates as "no initial location" to recover user position
    // This prevents the picker from accepting Null Island as a real initial value
    if (initialLocation && !(initialLocation.latitude === 0 && initialLocation.longitude === 0)) {
      setCurrentLocation(initialLocation);
      setHasAttemptedLocationFetch(true);
    } else if (!hasAttemptedLocationFetch) {
      getUserLocation().catch((error) => {
        console.error('Failed to get user location:', error);
        setIsLoading(false);
      });
    }
  }, [initialLocation, getUserLocation, isMapboxConfigured, hasAttemptedLocationFetch]);

  const handleMapPress = (event: any) => {
    if (mapError || !isMapboxConfigured) return;

    const { coordinates } = event.geometry;
    setCurrentLocation({
      latitude: coordinates[1],
      longitude: coordinates[0],
    });
  };

  const handleConfirmLocation = () => {
    if (currentLocation) {
      onLocationSelected(currentLocation);
    }
  };

  // Show error state if Mapbox is not configured
  if (mapError || !isMapboxConfigured) {
    return (
      <Box style={[styles.container, { height }]} className="items-center justify-center bg-red-50 dark:bg-red-900/20">
        <AlertTriangle size={32} color="#ef4444" />
        <Text className="mt-2 text-center text-red-600 dark:text-red-400">{mapError || t('maps.mapbox_not_configured', 'Mapbox is not configured')}</Text>
        <Text className="mt-1 text-center text-sm text-red-500 dark:text-red-300">{t('maps.contact_administrator', 'Please contact your administrator to configure mapping services.')}</Text>
      </Box>
    );
  }

  // Show loading state only when actively fetching location
  if (isLoading && !currentLocation) {
    return (
      <Box style={[styles.container, { height }]} className="items-center justify-center bg-gray-200 dark:bg-gray-800">
        <Text className="text-gray-500 dark:text-gray-400">{t('common.loading')}</Text>
      </Box>
    );
  }

  return (
    <Box style={[styles.container, { height }]}>
      {currentLocation ? (
        <Mapbox.MapView
          ref={mapRef}
          style={styles.map}
          logoEnabled={false}
          attributionEnabled={false}
          compassEnabled={true}
          zoomEnabled={true}
          rotateEnabled={true}
          onPress={handleMapPress}
          onDidFailLoadingMap={() => {
            console.error('Map failed to load');
            setMapError(t('maps.failed_to_load', 'Failed to load map. Please check your internet connection.'));
          }}
        >
          <Mapbox.Camera ref={cameraRef} zoomLevel={15} centerCoordinate={[currentLocation.longitude, currentLocation.latitude]} animationMode="flyTo" animationDuration={1000} />
          {/* Marker for the selected location */}
          <Mapbox.PointAnnotation id="selectedLocation" coordinate={[currentLocation.longitude, currentLocation.latitude]} title="Selected Location">
            <Box />
          </Mapbox.PointAnnotation>
        </Mapbox.MapView>
      ) : (
        // Default map view with fallback coordinates (center of USA)
        <Mapbox.MapView
          ref={mapRef}
          style={styles.map}
          logoEnabled={false}
          attributionEnabled={false}
          compassEnabled={true}
          zoomEnabled={true}
          rotateEnabled={true}
          onPress={handleMapPress}
          onDidFailLoadingMap={() => {
            console.error('Map failed to load');
            setMapError(t('maps.failed_to_load', 'Failed to load map. Please check your internet connection.'));
          }}
        >
          <Mapbox.Camera ref={cameraRef} zoomLevel={4} centerCoordinate={[-98.5795, 39.8283]} animationMode="flyTo" animationDuration={1000} />
          {/* Overlay with location prompt */}
          <Box className="absolute inset-0 flex-1 items-center justify-center bg-black/20">
            <Box className="items-center rounded-lg bg-white/90 p-4 dark:bg-gray-800/90">
              <Text className="mb-2 text-center text-gray-700 dark:text-gray-300">{t('common.no_location')}</Text>
              <TouchableOpacity onPress={getUserLocation} disabled={isLoading}>
                <Text className={`text-center ${isLoading ? 'text-gray-400' : 'text-blue-500'}`}>{isLoading ? t('common.loading') : t('common.get_my_location')}</Text>
              </TouchableOpacity>
            </Box>
          </Box>
        </Mapbox.MapView>
      )}

      <Box className="absolute inset-x-4 bottom-4">
        <Button onPress={handleConfirmLocation} disabled={!currentLocation}>
          <ButtonText>{t('common.confirm_location')}</ButtonText>
        </Button>
      </Box>
    </Box>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 8,
  },
  map: {
    flex: 1,
  },
});

export default LocationPicker;
