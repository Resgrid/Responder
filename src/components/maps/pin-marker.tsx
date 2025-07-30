import type Mapbox from '@rnmapbox/maps';
import { useColorScheme } from 'nativewind';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity } from 'react-native';

import { MAP_ICONS } from '@/constants/map-icons';

type MapIconKey = keyof typeof MAP_ICONS;

interface PinMarkerProps {
  imagePath?: MapIconKey;
  title: string;
  size?: number;
  markerRef?: Mapbox.PointAnnotation | null;
  onPress?: () => void;
}

const PinMarker: React.FC<PinMarkerProps> = ({ imagePath, title, size = 32, onPress }) => {
  const { colorScheme } = useColorScheme();

  const icon = imagePath ? MAP_ICONS[imagePath.toLowerCase() as MapIconKey] : MAP_ICONS['call'];

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
