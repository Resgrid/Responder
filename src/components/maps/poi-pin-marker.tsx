import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { TypeIcon } from '@/components/units/unit-type-icon';
import { resolvePoiIcon } from '@/constants/poi-icon-mapping';
import { getPoiMarkerShapePath, POI_MARKER_HEIGHT, POI_MARKER_VIEWBOX, POI_MARKER_WIDTH } from '@/constants/poi-marker-shapes';

import { PoiIcon } from './poi-icon';

interface PoiPinMarkerProps {
  /** Hex color for the SVG shape fill (e.g. "#2563eb") */
  color?: string | null;
  /** The `PoiImage` field from the API (e.g. "map-icon-hospital") */
  poiImage?: string | null;
  /** The `ImagePath` field from the API (fallback for icon resolution) */
  imagePath?: string | null;
  /** The `Marker` field from the API (shape type: "MAP_PIN", "SHIELD", etc.) */
  marker?: string | null;
  /** Department-uploaded POI type icon; shown in place of the shape + icon, which comes back if it is absent or fails to load. */
  iconUrl?: string | null;
  /** Display title for the marker */
  title: string;
  /** Press handler */
  onPress?: () => void;
}

/** Default fill color matching the web app. */
export const DEFAULT_POI_COLOR = '#2563eb';

/**
 * POI pin marker component that renders a colored SVG shape with a white icon inside.
 *
 * Matches the web application's POI marker rendering:
 *   - SVG background shape filled with the POI type's Color
 *   - White lucide icon centered on top of the shape
 *   - Drop shadow via an offset semi-transparent path
 *   - 36x48 pixel dimensions, bottom-center anchor
 *
 * This component is the SHAPE+ICON only (no title text). The title is rendered
 * as a separate MarkerView in the parent (MapPins) so that the anchor measurement
 * is not contaminated by overflow text.
 */
const PoiPinMarker: React.FC<PoiPinMarkerProps> = ({ color, poiImage, imagePath, marker, iconUrl, title, onPress }) => {
  const fillColor = color?.trim() || DEFAULT_POI_COLOR;
  const shapePath = getPoiMarkerShapePath(marker);
  const iconName = resolvePoiIcon(poiImage, imagePath);

  const shape = (
    <>
      {/*
       * Shape background — kept in normal layout flow (NOT absolutely positioned)
       * so that Mapbox.MarkerView measures the correct 36×48 dimensions when
       * computing the anchor offset. Previously both children were absolute,
       * giving the container an intrinsic height of 0 and causing the SVG to
       * render entirely below the coordinate point ("too low / cut off").
       */}
      <Svg width={POI_MARKER_WIDTH} height={POI_MARKER_HEIGHT} viewBox={POI_MARKER_VIEWBOX} preserveAspectRatio="none">
        {/* Shadow layer: offset down by 1px, semi-transparent black */}
        <Path d={shapePath} fill="rgba(17, 24, 39, 0.25)" transform="translate(0, 1)" />
        {/* Main shape */}
        <Path d={shapePath} fill={fillColor} />
      </Svg>
      {/* White icon — absolutely overlaid on the shape */}
      <View style={styles.iconContainer}>
        <PoiIcon name={iconName} size={14} color="#ffffff" />
      </View>
    </>
  );

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7} testID={`poi-marker-${title}`}>
      {iconUrl ? (
        // The uploaded icon keeps the shape's 36×48 footprint (so the bottom-center anchor still lands on the
        // point), standing on the bottom edge; on a load error the shape comes back in the same box.
        <View style={styles.uploadedIconFootprint}>
          <TypeIcon iconUrl={iconUrl} size={POI_MARKER_WIDTH} fallback={shape} testID="poi-marker-type-icon" />
        </View>
      ) : (
        shape
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  /*
   * No explicit width/height — the Svg in normal flow (36×48) determines the
   * container size, which Mapbox can measure correctly for anchor computation.
   */
  container: {
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  uploadedIconFootprint: {
    width: POI_MARKER_WIDTH,
    height: POI_MARKER_HEIGHT,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  iconContainer: {
    position: 'absolute',
    top: 12,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default PoiPinMarker;
