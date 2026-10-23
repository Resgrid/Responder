import type Mapbox from '@rnmapbox/maps';
import { useColorScheme } from 'nativewind';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity } from 'react-native';

import { UnitTypeIcon } from '@/components/units/unit-type-icon';
import { MAP_ICONS, type MapIconKey, resolveMapIconKey } from '@/constants/map-icons';

interface PinMarkerProps {
  imagePath?: string | null;
  poiImage?: string | null;
  marker?: string | null;
  title: string;
  size?: number;
  markerRef?: Mapbox.PointAnnotation | null;
  onPress?: () => void;
  fallbackIconKey?: MapIconKey;
  /**
   * Department-uploaded icon (call, unit or POI type, or a personnel pin's role); drawn square at `size`, and the bundled
   * pin is shown when absent or when it fails to load.
   */
  iconUrl?: string | null;
}

const PinMarker: React.FC<PinMarkerProps> = ({ imagePath, poiImage, marker, title, size = 32, onPress, fallbackIconKey = 'call', iconUrl }) => {
  const { colorScheme } = useColorScheme();

  const icon = MAP_ICONS[resolveMapIconKey({ poiImage, imagePath, marker, fallback: fallbackIconKey })];

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <UnitTypeIcon iconUrl={iconUrl} size={size} fallback={<Image fadeDuration={0} source={icon!.uri} style={[styles.image, { width: size, height: size }]} />} testID="pin-marker-type-icon" />
      <Text style={[styles.title, { color: colorScheme === 'dark' ? '#FFFFFF' : '#000000' }]} numberOfLines={2}>
        {title}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    overflow: 'visible',
    resizeMode: 'cover',
  },
  title: {
    marginTop: 2,
    overflow: 'visible',
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default React.memo(PinMarker);
