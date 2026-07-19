import Mapbox from '@rnmapbox/maps';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet } from 'react-native';

import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';

interface StaticMapProps {
  latitude: number;
  longitude: number;
  address?: string;
  zoom?: number;
  height?: number;
  showUserLocation?: boolean;
  onPress?: () => void;
}

const StaticMap: React.FC<StaticMapProps> = ({ latitude, longitude, address, zoom = 15, height = 200, showUserLocation = false, onPress }) => {
  const { t } = useTranslation();
  if (!latitude || !longitude) {
    return (
      <Box style={[styles.container, { height }]} className="items-center justify-center bg-gray-200">
        <Text className="text-gray-500">{t('call_detail.no_location')}</Text>
      </Box>
    );
  }

  return (
    <Box style={[styles.container, { height }]}>
      {/* Locked preview: all gestures disabled — the map must not fight the parent
          ScrollView. Interaction happens in the full-screen modal opened via onPress. */}
      <Mapbox.MapView style={styles.map} logoEnabled={false} attributionEnabled={false} compassEnabled={false} zoomEnabled={false} scrollEnabled={false} rotateEnabled={false} pitchEnabled={false}>
        <Mapbox.Camera zoomLevel={zoom} centerCoordinate={[longitude, latitude]} animationDuration={0} />
        {/* Marker for the location — an empty child renders an invisible annotation */}
        <Mapbox.PointAnnotation id="destinationPoint" coordinate={[longitude, latitude]} title={address || 'Location'}>
          <Box style={styles.marker} />
        </Mapbox.PointAnnotation>

        {/* Show user location if requested */}
        {showUserLocation ? <Mapbox.UserLocation visible={true} showsUserHeadingIndicator={true} /> : null}
      </Mapbox.MapView>

      {/* Transparent tap overlay above the map so taps always reach us, never the map */}
      {onPress ? <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={address || t('call_detail.title')} testID="static-map-press-overlay" style={StyleSheet.absoluteFill} /> : null}

      {/* Address overlay */}
      {address ? (
        <Box style={styles.addressContainer}>
          <Text style={styles.addressText}>{address}</Text>
        </Box>
      ) : null}
    </Box>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
  marker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ef4444',
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  addressContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 8,
  },
  addressText: {
    color: 'white',
    fontSize: 12,
  },
});

export default StaticMap;
