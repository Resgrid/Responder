import type Mapbox from '@rnmapbox/maps';
import { useColorScheme } from 'nativewind';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity } from 'react-native';

import { UnitTypeIcon } from '@/components/units/unit-type-icon';
import { MAP_ICONS, type MapIconKey, resolveMapIconKey } from '@/constants/map-icons';
import { getTypeIconUrl } from '@/lib/type-icons';

export interface PinMarkerIconProps {
  imagePath?: string | null;
  poiImage?: string | null;
  marker?: string | null;
  size?: number;
  fallbackIconKey?: MapIconKey;
  /**
   * Department-uploaded icon (call, unit or POI type, or a personnel pin's role); drawn square at `size`, and the status
   * pin (else the bundled pin) is shown when absent or when it fails to load.
   */
  iconUrl?: string | null;
  /**
   * The built-in pin recoloured to the call's priority or the unit's/person's status (the marker's `PinIconUrl`). Used only
   * when there is no `iconUrl` (or it failed): drawn where and how the bundled pin is (same box, same cover fit, no tint),
   * and the bundled pin is shown when absent, not an absolute http(s) URL, or when it fails to load.
   */
  pinIconUrl?: string | null;
}

interface PinMarkerProps extends PinMarkerIconProps {
  title: string;
  markerRef?: Mapbox.PointAnnotation | null;
  onPress?: () => void;
}

/**
 * A map marker's icon alone, without its title. The map's pins and the map legend both draw icons with it, so a legend
 * icon is exactly what the map draws for the same marker fields.
 */
export const PinMarkerIcon: React.FC<PinMarkerIconProps> = ({ imagePath, poiImage, marker, size = 32, fallbackIconKey = 'call', iconUrl, pinIconUrl }) => {
  const icon = MAP_ICONS[resolveMapIconKey({ poiImage, imagePath, marker, fallback: fallbackIconKey })];
  const bundledPin = <Image fadeDuration={0} source={icon!.uri} style={[styles.image, { width: size, height: size }]} />;
  const statusPinUrl = getTypeIconUrl(pinIconUrl);
  // Precedence: uploaded icon > status/priority pin > bundled pin; each one falls back to the next when it fails to load.
  const pin = statusPinUrl ? <UnitTypeIcon iconUrl={statusPinUrl} size={size} contentFit="cover" fallback={bundledPin} testID="pin-marker-status-pin" /> : bundledPin;

  return <UnitTypeIcon iconUrl={iconUrl} size={size} fallback={pin} testID="pin-marker-type-icon" />;
};

const PinMarker: React.FC<PinMarkerProps> = ({ imagePath, poiImage, marker, title, size = 32, onPress, fallbackIconKey = 'call', iconUrl, pinIconUrl }) => {
  const { colorScheme } = useColorScheme();

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <PinMarkerIcon imagePath={imagePath} poiImage={poiImage} marker={marker} size={size} fallbackIconKey={fallbackIconKey} iconUrl={iconUrl} pinIconUrl={pinIconUrl} />
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
