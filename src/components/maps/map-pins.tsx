import Mapbox from '@rnmapbox/maps';
import React from 'react';

import { type MAP_ICONS } from '@/constants/map-icons';
import { type MapMakerInfoData } from '@/models/v4/mapping/getMapDataAndMarkersData';
import { useSecurityStore } from '@/stores/security/store';

import PinMarker from './pin-marker';

type MapIconKey = keyof typeof MAP_ICONS;

interface MapPinsProps {
  pins: MapMakerInfoData[];
  onPinPress?: (pin: MapMakerInfoData) => void;
}

const MapPins: React.FC<MapPinsProps> = ({ pins, onPinPress }) => {
  const { canUserViewPII } = useSecurityStore();

  // Filter out personnel pins if user cannot view PII
  const filteredPins = pins.filter((pin) => {
    // Check if this is a personnel pin by ImagePath
    const isPersonnelPin = pin.ImagePath && pin.ImagePath.toLowerCase().startsWith('person');

    // If it's a personnel pin and user can't view PII, filter it out
    if (isPersonnelPin && !canUserViewPII) {
      return false;
    }

    return true;
  });

  return (
    <>
      {filteredPins.map((pin) => (
        <Mapbox.MarkerView key={`pin-${pin.Id}`} id={`pin-${pin.Id}`} coordinate={[pin.Longitude, pin.Latitude]} anchor={{ x: 0.5, y: 0.5 }} allowOverlap={true}>
          <PinMarker imagePath={pin.ImagePath as MapIconKey} title={pin.Title} size={32} onPress={() => onPinPress?.(pin)} />
        </Mapbox.MarkerView>
      ))}
    </>
  );
};

export default MapPins;
