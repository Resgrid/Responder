import type Mapbox from '@rnmapbox/maps';
import { useColorScheme } from 'nativewind';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity } from 'react-native';

import { MAP_ICONS, type MapIconKey, resolveMapIconKey } from '@/constants/map-icons';

interface PinMarkerProps {
  imagePath?: string | null;
  marker?: string | null;
  title: string;
  size?: number;
  markerRef?: Mapbox.PointAnnotation | null;
  onPress?: () => void;
  fallbackIconKey?: MapIconKey;
}

const PinMarker: React.FC<PinMarkerProps> = ({ imagePath, marker, title, size = 32, onPress, fallbackIconKey = 'call' }) => {
  const { colorScheme } = useColorScheme();

  const icon = MAP_ICONS[resolveMapIconKey({ imagePath, marker, fallback: fallbackIconKey })];

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <Image fadeDuration={0} source={icon!.uri} style={[styles.image, { width: size, height: size }]} />
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

export default PinMarker;
