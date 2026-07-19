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
}

/**
 * Full-screen interactive map for a single location (e.g. a call). Opened from the
 * locked StaticMap preview so the user can pan/zoom freely around the point.
 */
const FullScreenMapModal: React.FC<FullScreenMapModalProps> = ({ isOpen, onClose, latitude, longitude, address, zoom = 15, showUserLocation = false }) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const isMapboxConfigured = Boolean(Env.RESPOND_MAPBOX_PUBKEY && Env.RESPOND_MAPBOX_PUBKEY.trim() !== '');

  return (
    <Modal visible={isOpen} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={styles.container} testID="full-screen-map-modal">
        {isMapboxConfigured ? (
          <Mapbox.MapView style={styles.map} logoEnabled={false} attributionEnabled={false} compassEnabled={true} zoomEnabled={true} scrollEnabled={true} rotateEnabled={true} pitchEnabled={true}>
            <Mapbox.Camera zoomLevel={zoom} centerCoordinate={[longitude, latitude]} animationDuration={0} />
            <Mapbox.PointAnnotation id="callLocation" coordinate={[longitude, latitude]} title={address || 'Location'}>
              <View style={styles.marker} />
            </Mapbox.PointAnnotation>
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
