import { Image } from 'expo-image';
import React, { useState } from 'react';
import { View } from 'react-native';

import { MAP_ICONS, type MapIconKey } from '@/constants/map-icons';

export interface UnitTypeIconProps {
  /** Department-uploaded icon for the unit/call/POI type or personnel role (absolute URL, anonymous GET, immutable). */
  iconUrl?: string | null;
  /** Built-in icon the type picked (a `MAP_ICONS` key such as "ambulance" or "fire"). */
  mapIcon?: string | null;
  size?: number;
  /** Rendered when there is no icon to show (nothing set, or the uploaded icon failed with no built-in to fall back to). */
  fallback?: React.ReactNode;
  testID?: string;
}

/** The `MAP_ICONS` key for a unit type's built-in icon name, or null when it names none. */
export const resolveUnitTypeMapIconKey = (mapIcon?: string | null): MapIconKey | null => {
  if (typeof mapIcon !== 'string') return null;

  const name = mapIcon.trim().toLowerCase();
  if (!name) return null;

  // Exact name first (keys may contain "_"), then the name without separators ("Car Two" / "car-two" -> "cartwo").
  for (const candidate of [name, name.replace(/[^a-z0-9]+/g, '')]) {
    if (Object.prototype.hasOwnProperty.call(MAP_ICONS, candidate)) {
      return candidate as MapIconKey;
    }
  }

  return null;
};

/**
 * The icon a department gave a unit's type: the uploaded image when there is one (falling back if it fails to load),
 * else the built-in map icon the type picked, else `fallback`. Decorative: the unit's name is always shown beside it.
 */
export const UnitTypeIcon: React.FC<UnitTypeIconProps> = ({ iconUrl, mapIcon, size = 24, fallback = null, testID }) => {
  // Keyed on the URL that failed, so a new upload (a new URL) gets its own attempt.
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  const remoteUrl = typeof iconUrl === 'string' && iconUrl.trim().length > 0 && iconUrl !== failedUrl ? iconUrl : null;
  const mapIconKey = remoteUrl ? null : resolveUnitTypeMapIconKey(mapIcon);

  if (!remoteUrl && !mapIconKey) {
    return <>{fallback}</>;
  }

  return (
    <View testID={testID} style={{ width: size, height: size }} accessible={false} accessibilityElementsHidden={true} importantForAccessibility="no-hide-descendants">
      {remoteUrl ? (
        <Image source={{ uri: remoteUrl }} style={{ width: size, height: size }} contentFit="contain" cachePolicy="memory-disk" onError={() => setFailedUrl(remoteUrl)} />
      ) : (
        <Image source={MAP_ICONS[mapIconKey as MapIconKey].uri} style={{ width: size, height: size }} contentFit="contain" />
      )}
    </View>
  );
};

/** Type-neutral name for the same component, for call type, POI type and personnel role icons (same props, same fallbacks). */
export const TypeIcon = UnitTypeIcon;
