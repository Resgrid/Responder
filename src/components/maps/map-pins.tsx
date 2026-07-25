import Mapbox from '@rnmapbox/maps';
import { useColorScheme } from 'nativewind';
import React, { useCallback, useMemo } from 'react';
import { StyleSheet, Text } from 'react-native';

import { POI_MARKER_HEIGHT, POI_MARKER_WIDTH } from '@/constants/poi-marker-shapes';
import { isPoiMarker } from '@/lib/poi';
import { type MapMakerInfoData } from '@/models/v4/mapping/getMapDataAndMarkersData';
import { securityStore } from '@/stores/security/store';

import PinMarker from './pin-marker';
import PoiPinMarker from './poi-pin-marker';

interface MapPinsProps {
  pins: MapMakerInfoData[];
  onPinPress?: (pin: MapMakerInfoData) => void;
}

interface PinItemProps {
  pin: MapMakerInfoData;
  onPinPress?: (pin: MapMakerInfoData) => void;
}

const PoiTitle: React.FC<{ title: string }> = ({ title }) => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <Text style={[styles.poiTitle, { color: isDark ? '#FFFFFF' : '#000000' }]} numberOfLines={2}>
      {title}
    </Text>
  );
};

const PoiPinItem = React.memo<PinItemProps>(({ pin, onPinPress }) => {
  const handlePress = useCallback(() => onPinPress?.(pin), [onPinPress, pin]);

  return (
    <>
      {/* Shape + icon: 36x48 exact dimensions, anchor at bottom-center tip */}
      <Mapbox.MarkerView id={`poi-${pin.Id}`} coordinate={[pin.Longitude, pin.Latitude]} anchor={{ x: 0.5, y: 1 }} allowOverlap={true}>
        <PoiPinMarker color={pin.Color} poiImage={pin.PoiImage} imagePath={pin.ImagePath} marker={pin.Marker} title={pin.Title} onPress={handlePress} />
      </Mapbox.MarkerView>
      {/* Title label: separate MarkerView so it does NOT affect shape anchor measurement */}
      {pin.Title ? (
        <Mapbox.MarkerView id={`poi-title-${pin.Id}`} coordinate={[pin.Longitude, pin.Latitude]} anchor={{ x: 0.5, y: -0.05 }} allowOverlap={true}>
          <PoiTitle title={pin.Title} />
        </Mapbox.MarkerView>
      ) : null}
    </>
  );
});

const StandardPinItem = React.memo<PinItemProps>(({ pin, onPinPress }) => {
  const handlePress = useCallback(() => onPinPress?.(pin), [onPinPress, pin]);

  return (
    <Mapbox.MarkerView id={`pin-${pin.Id}`} coordinate={[pin.Longitude, pin.Latitude]} anchor={{ x: 0.5, y: 0.5 }} allowOverlap={true}>
      <PinMarker imagePath={pin.ImagePath} poiImage={pin.PoiImage} marker={pin.Marker} fallbackIconKey={pin.Type === 4 ? 'flag' : 'call'} title={pin.Title} size={32} onPress={handlePress} />
    </Mapbox.MarkerView>
  );
});

const MapPins: React.FC<MapPinsProps> = ({ pins, onPinPress }) => {
  const canUserViewPII = securityStore((state) => state.rights?.CanViewPII);

  // Filter out personnel pins if user cannot view PII
  const filteredPins = useMemo(
    () =>
      pins.filter((pin) => {
        // Check if this is a personnel pin by ImagePath
        const isPersonnelPin = pin.ImagePath && pin.ImagePath.toLowerCase().startsWith('person');

        // If it's a personnel pin and user can't view PII, filter it out
        if (isPersonnelPin && !canUserViewPII) {
          return false;
        }

        return true;
      }),
    [pins, canUserViewPII]
  );

  return <>{filteredPins.map((pin) => (isPoiMarker(pin) ? <PoiPinItem key={`poi-group-${pin.Id}`} pin={pin} onPinPress={onPinPress} /> : <StandardPinItem key={`pin-${pin.Id}`} pin={pin} onPinPress={onPinPress} />))}</>;
};

const styles = StyleSheet.create({
  poiTitle: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
    maxWidth: POI_MARKER_WIDTH + 20,
  },
});

export default React.memo(MapPins);
