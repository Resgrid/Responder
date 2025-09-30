import Mapbox from '@rnmapbox/maps';
import * as Location from 'expo-location';
import { AlertTriangle, MapPinIcon, XIcon } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dimensions, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Box } from '@/components/ui/box';
import { Button, ButtonText } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Env } from '@/lib/env';
import { locationService } from '@/services/location';
import { useLocationStore } from '@/stores/app/location-store';

/**
 * FullScreenLocationPicker Component
 *
 * A full-screen location picker that allows users to select a location on a map.
 *
 * Debugging steps if component gets stuck in "Loading" state:
 * 1. Check if Mapbox is configured (RESPOND_MAPBOX_PUBKEY in environment)
 * 2. Check device location permissions
 * 3. Check console logs for detailed debugging information
 * 4. Ensure device location services are enabled
 * 5. Try on a physical device if testing on simulator
 */

interface FullScreenLocationPickerProps {
  initialLocation?:
  | {
    latitude: number;
    longitude: number;
    address?: string;
  }
  | undefined;
  onLocationSelected: (location: { latitude: number; longitude: number; address?: string }) => void;
  onClose: () => void;
}

const FullScreenLocationPicker: React.FC<FullScreenLocationPickerProps> = ({ initialLocation, onLocationSelected, onClose }) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<Mapbox.MapView>(null);
  const cameraRef = useRef<Mapbox.Camera>(null);
  const locationStore = useLocationStore();
  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(initialLocation || null);
  const [isLoading, setIsLoading] = useState(false);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);
  const [address, setAddress] = useState<string | undefined>(undefined);
  const [mapError, setMapError] = useState<string | null>(null);
  const [hasAttemptedLocationFetch, setHasAttemptedLocationFetch] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);
  const isMountedRef = useRef(true);

  // Check if Mapbox is properly configured
  const isMapboxConfigured = Boolean(Env.RESPOND_MAPBOX_PUBKEY && Env.RESPOND_MAPBOX_PUBKEY.trim() !== '');

  // Helper function to get current location from device
  const getCurrentLocationFromDevice = React.useCallback(async () => {
    if (!isMountedRef.current) return null;

    try {
      // Request permissions first
      const hasPermissions = await locationService.requestPermissions();
      if (!hasPermissions) {
        console.error('Location permissions not granted');
        return null;
      }

      // Get current position with timeout
      const locationPromise = Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        mayShowUserSettingsDialog: true,
      });

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Location request timed out')), 15000);
      });

      const location = (await Promise.race([locationPromise, timeoutPromise])) as Location.LocationObject;
      if (!isMountedRef.current) return null;

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
    } catch (error) {
      console.error('Error getting current location:', error);
      return null;
    }
  }, []);

  useEffect(() => {
    if (!isMapboxConfigured) {
      setMapError(t('maps.mapbox_not_configured', 'Mapbox is not configured. Please contact your administrator.'));
      return;
    }
  }, [isMapboxConfigured, t]);

  const reverseGeocode = React.useCallback(async (latitude: number, longitude: number) => {
    if (!isMountedRef.current) return;

    setIsReverseGeocoding(true);
    try {
      const result = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      if (!isMountedRef.current) return;

      if (result && result.length > 0) {
        const locationResult = result[0];
        if (!locationResult) return;

        const { street, name, city, region, country, postalCode } = locationResult;
        let addressParts: string[] = [];

        if (street) addressParts.push(street);
        if (name && name !== street) addressParts.push(name);
        if (city) addressParts.push(city);
        if (region) addressParts.push(region);
        if (postalCode) addressParts.push(postalCode);
        if (country) addressParts.push(country);

        setAddress(addressParts.join(', '));
      } else {
        setAddress(undefined);
      }
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      if (isMountedRef.current) setAddress(undefined);
    } finally {
      if (isMountedRef.current) setIsReverseGeocoding(false);
    }
  }, []);

  const getUserLocation = React.useCallback(async () => {
    if (!isMountedRef.current) return;

    setIsLoading(true);
    setHasAttemptedLocationFetch(true);

    try {
      // First try to use stored location from location store
      const storedLocation =
        locationStore.latitude && locationStore.longitude
          ? {
            latitude: locationStore.latitude,
            longitude: locationStore.longitude,
          }
          : null;

      // If we have a valid stored location, use it
      if (storedLocation && storedLocation.latitude !== 0 && storedLocation.longitude !== 0) {
        console.log('Using stored location from location store');
        setCurrentLocation(storedLocation);
        reverseGeocode(storedLocation.latitude, storedLocation.longitude);

        // Move camera to stored location
        if (cameraRef.current && isMountedRef.current && isMapReady) {
          try {
            cameraRef.current.setCamera({
              centerCoordinate: [storedLocation.longitude, storedLocation.latitude],
              zoomLevel: 15,
              animationDuration: 1000,
            });
          } catch (error) {
            console.error('Error setting camera position:', error);
          }
        }
        return;
      }

      // If no stored location, try to get current device location
      console.log('No stored location found, getting current device location');
      const deviceLocation = await getCurrentLocationFromDevice();

      if (!isMountedRef.current) return;

      if (deviceLocation) {
        setCurrentLocation(deviceLocation);
        reverseGeocode(deviceLocation.latitude, deviceLocation.longitude);

        // Move camera to device location
        if (cameraRef.current && isMountedRef.current && isMapReady) {
          try {
            cameraRef.current.setCamera({
              centerCoordinate: [deviceLocation.longitude, deviceLocation.latitude],
              zoomLevel: 15,
              animationDuration: 1000,
            });
          } catch (error) {
            console.error('Error setting camera position:', error);
          }
        }
      } else {
        console.log('Unable to get current location');
      }
    } catch (error) {
      console.error('Error getting location:', error);
    } finally {
      if (isMountedRef.current) setIsLoading(false);
    }
  }, [isMapReady, reverseGeocode, locationStore.latitude, locationStore.longitude, getCurrentLocationFromDevice]);

  useEffect(() => {
    isMountedRef.current = true;

    // Reset attempt state on mount to ensure fresh state
    setHasAttemptedLocationFetch(false);

    // Don't attempt to get location if Mapbox is not configured
    if (!isMapboxConfigured) {
      return;
    }

    // Priority order for initial location:
    // 1. Provided initial location (if valid)
    // 2. Stored location from location store
    // 3. Current device location (called manually by user)

    // Treat 0,0 coordinates as "no initial location" to recover user position
    if (initialLocation && !(initialLocation.latitude === 0 && initialLocation.longitude === 0)) {
      console.log('Using provided initial location');
      setCurrentLocation(initialLocation);
      setHasAttemptedLocationFetch(true);
      reverseGeocode(initialLocation.latitude, initialLocation.longitude);
    } else {
      // Check for stored location from location store
      const storedLocation =
        locationStore.latitude && locationStore.longitude
          ? {
            latitude: locationStore.latitude,
            longitude: locationStore.longitude,
          }
          : null;

      if (storedLocation && !(storedLocation.latitude === 0 && storedLocation.longitude === 0)) {
        console.log('Using stored location from location store');
        setCurrentLocation(storedLocation);
        setHasAttemptedLocationFetch(true);
        reverseGeocode(storedLocation.latitude, storedLocation.longitude);
      }
      // If no initial or stored location, getUserLocation will be called when user taps the button
    }

    return () => {
      isMountedRef.current = false;
      // Clear any pending camera operations and map references
      if (cameraRef.current) {
        cameraRef.current = null;
      }
      if (mapRef.current) {
        mapRef.current = null;
      }
      // Reset map ready state
      setIsMapReady(false);
    };
  }, [initialLocation, isMapboxConfigured, reverseGeocode, locationStore.latitude, locationStore.longitude]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleMapPress = (event: any) => {
    if (mapError || !isMapboxConfigured) return;

    const { coordinates } = event.geometry;
    const newLocation = {
      latitude: coordinates[1],
      longitude: coordinates[0],
    };
    setCurrentLocation(newLocation);
    reverseGeocode(newLocation.latitude, newLocation.longitude);

    // Update location store with the new selected location
    // Note: This creates a minimal LocationObject with the essential coordinates
    const locationObject = {
      coords: {
        latitude: newLocation.latitude,
        longitude: newLocation.longitude,
        altitude: null,
        accuracy: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
      },
      timestamp: Date.now(),
    } as Location.LocationObject;

    locationStore.setLocation(locationObject);
  };

  const handleConfirmLocation = () => {
    if (currentLocation) {
      const locationData: {
        latitude: number;
        longitude: number;
        address?: string;
      } = {
        ...currentLocation,
      };

      if (address) {
        locationData.address = address;
      }

      // Update location store with the confirmed location
      const locationObject = {
        coords: {
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          altitude: null,
          accuracy: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
        },
        timestamp: Date.now(),
      } as Location.LocationObject;

      locationStore.setLocation(locationObject);

      onLocationSelected(locationData);
      onClose();
    }
  };

  // Show error state if Mapbox is not configured
  if (mapError || !isMapboxConfigured) {
    return (
      <Box style={styles.container} className="items-center justify-center bg-red-50 dark:bg-red-900/20">
        <AlertTriangle size={32} color="#ef4444" />
        <Text className="mt-2 text-center text-red-600 dark:text-red-400">{mapError || t('maps.mapbox_not_configured', 'Mapbox is not configured')}</Text>
        <Text className="mt-1 text-center text-sm text-red-500 dark:text-red-300">{t('maps.contact_administrator', 'Please contact your administrator to configure mapping services.')}</Text>

        {/* Close button for error state */}
        <TouchableOpacity style={[styles.closeButton, { top: insets.top + 10 }]} onPress={onClose}>
          <XIcon size={24} color="#000000" />
        </TouchableOpacity>
      </Box>
    );
  }

  // Show loading state only when actively fetching location and Mapbox is configured
  if (isLoading && !currentLocation && isMapboxConfigured) {
    return (
      <Box style={styles.container} className="items-center justify-center bg-gray-200">
        <Text className="text-gray-500">{t('common.loading')}</Text>
      </Box>
    );
  }

  return (
    <Box style={styles.container}>
      {currentLocation ? (
        <Mapbox.MapView
          ref={mapRef}
          style={styles.map}
          logoEnabled={false}
          attributionEnabled={true}
          compassEnabled={true}
          zoomEnabled={true}
          rotateEnabled={true}
          onPress={handleMapPress}
          onDidFinishLoadingMap={() => setIsMapReady(true)}
          onDidFailLoadingMap={() => {
            console.error('Map failed to load');
            setMapError('Map failed to load');
          }}
        >
          <Mapbox.Camera ref={cameraRef} zoomLevel={15} centerCoordinate={[currentLocation.longitude, currentLocation.latitude]} animationMode="flyTo" animationDuration={1000} />
          {/* Marker for the selected location */}
          <Mapbox.PointAnnotation id="selectedLocation" coordinate={[currentLocation.longitude, currentLocation.latitude]} title="Selected Location">
            <Box className="items-center justify-center">
              <MapPinIcon size={36} color="#FF0000" />
            </Box>
          </Mapbox.PointAnnotation>
        </Mapbox.MapView>
      ) : (
        // Default map view with fallback coordinates (center of USA) when no location is available
        <Mapbox.MapView
          ref={mapRef}
          style={styles.map}
          logoEnabled={false}
          attributionEnabled={true}
          compassEnabled={true}
          zoomEnabled={true}
          rotateEnabled={true}
          onPress={handleMapPress}
          onDidFinishLoadingMap={() => setIsMapReady(true)}
          onDidFailLoadingMap={() => {
            console.error('Map failed to load');
            setMapError('Map failed to load');
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

      {/* Close button */}
      <TouchableOpacity style={[styles.closeButton, { top: insets.top + 10 }]} onPress={onClose}>
        <XIcon size={24} color="#000000" />
      </TouchableOpacity>

      {/* Location info and confirm button */}
      <Box style={[styles.bottomPanel, { paddingBottom: insets.bottom + 16 }]} className="bg-white p-4 shadow-lg">
        {isReverseGeocoding ? (
          <Text className="mb-2 text-gray-500">{t('common.loading_address')}</Text>
        ) : address ? (
          <Text className="mb-2 text-gray-700">{address}</Text>
        ) : (
          <Text className="mb-2 text-gray-500">{t('common.no_address_found')}</Text>
        )}

        {currentLocation && (
          <Text className="mb-4 text-gray-500">
            {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
          </Text>
        )}

        <Button onPress={handleConfirmLocation} disabled={!currentLocation}>
          <ButtonText>{t('common.set_location')}</ButtonText>
        </Button>
      </Box>
    </Box>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  closeButton: {
    position: 'absolute',
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 10,
  },
  bottomPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
});

export default FullScreenLocationPicker;
