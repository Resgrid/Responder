import Mapbox from '@rnmapbox/maps';
import { XIcon } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { Env } from '@/lib/env';

interface FullScreenMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  latitude: number;
  longitude: number;
  address?: string;
  zoom?: number;
  showUserLocation?: boolean;
  // Optional impacted-area polygon ([lng, lat] ring); drawn filled + outlined in accentColor
  polygon?: [number, number][];
  accentColor?: string;
}

/**
 * Full-screen interactive map for a single location (e.g. a call) or an area
 * polygon (e.g. a weather alert). Opened from a locked inline map preview so
 * the user can pan/zoom freely.
 */
const FullScreenMapModal: React.FC<FullScreenMapModalProps> = ({ isOpen, onClose, latitude, longitude, address, zoom = 15, showUserLocation = false, polygon, accentColor = '#ef4444' }) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const isMapboxConfigured = Boolean(Env.RESPOND_MAPBOX_PUBKEY && Env.RESPOND_MAPBOX_PUBKEY.trim() !== '');

  const polygonShape = React.useMemo(() => {
    if (!polygon || polygon.length < 3) {
      return null;
    }
    // GeoJSON polygons must be closed rings
    const ring = [...polygon];
    const first = ring[0]!;
    const last = ring[ring.length - 1]!;
    if (first[0] !== last[0] || first[1] !== last[1]) {
      ring.push(first);
    }
    return {
      type: 'Feature' as const,
      geometry: { type: 'Polygon' as const, coordinates: [ring] },
      properties: {},
    };
  }, [polygon]);

  const polygonBounds = React.useMemo(() => {
    if (!polygon || polygon.length === 0) {
      return null;
    }
    const lngs = polygon.map((c) => c[0]);
    const lats = polygon.map((c) => c[1]);
    return {
      ne: [Math.max(...lngs), Math.max(...lats)] as [number, number],
      sw: [Math.min(...lngs), Math.min(...lats)] as [number, number],
      paddingTop: 48,
      paddingBottom: 48,
      paddingLeft: 48,
      paddingRight: 48,
    };
  }, [polygon]);

  return (
    <Modal visible={isOpen} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={styles.container} testID="full-screen-map-modal">
        {isMapboxConfigured ? (
          <Mapbox.MapView style={styles.map} logoEnabled={false} attributionEnabled={false} compassEnabled={true} zoomEnabled={true} scrollEnabled={true} rotateEnabled={true} pitchEnabled={true}>
            {polygonBounds ? <Mapbox.Camera bounds={polygonBounds} animationDuration={0} /> : <Mapbox.Camera zoomLevel={zoom} centerCoordinate={[longitude, latitude]} animationDuration={0} />}
            {polygonShape ? (
              <Mapbox.ShapeSource id="fullScreenAreaPolygon" shape={polygonShape as GeoJSON.Feature}>
                <Mapbox.FillLayer id="fullScreenAreaPolygonFill" style={{ fillColor: accentColor, fillOpacity: 0.2 }} />
                <Mapbox.LineLayer id="fullScreenAreaPolygonLine" style={{ lineColor: accentColor, lineWidth: 2 }} />
              </Mapbox.ShapeSource>
            ) : (
              <Mapbox.PointAnnotation id="callLocation" coordinate={[longitude, latitude]} title={address || 'Location'}>
                <View style={[styles.marker, { backgroundColor: accentColor }]} />
              </Mapbox.PointAnnotation>
            )}
            {showUserLocation ? <Mapbox.UserLocation visible={true} showsUserHeadingIndicator={true} /> : null}
          </Mapbox.MapView>
        ) : (
          <Box className="flex-1 items-center justify-center p-6">
            <Text className="text-center text-gray-500">{t('maps.mapbox_not_configured')}</Text>
          </Box>
        )}

        {/* Close button */}
        <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel={t('common.close')} testID="full-screen-map-close" style={[styles.closeButton, { top: insets.top + 12 }]}>
          <XIcon size={24} color="#fff" />
        </Pressable>

        {/* Address overlay */}
        {address ? (
          <View style={[styles.addressContainer, { paddingBottom: insets.bottom + 8 }]}>
            <Text style={styles.addressText}>{address}</Text>
          </View>
        ) : null}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
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
  closeButton: {
    position: 'absolute',
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 12,
  },
  addressText: {
    color: 'white',
    fontSize: 14,
    textAlign: 'center',
  },
});

export default FullScreenMapModal;
