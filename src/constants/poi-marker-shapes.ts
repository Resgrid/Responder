/**
 * SVG path definitions for POI marker background shapes.
 * All shapes use the viewBox="-24 -48 48 48" coordinate system as defined in the web app.
 *
 * Origin (0,0) is at the top-center of the 48×48 bounding box.
 * X goes from -24 (left) to +24 (right).
 * Y goes from -48 (top) to 0 (bottom).
 * The tip of the pin is at (0, 0) (bottom-center).
 *
 * When rendered at 36×48 pixels:
 *   scaleX = 36/48 = 0.75
 *   scaleY = 48/48 = 1.0
 *   offsetX = 24 * 0.75 = 18
 *   offsetY = 48 * 1.0 = 48
 */

export type PoiMarkerShape = 'MAP_PIN' | 'SHIELD' | 'ROUTE' | 'SQUARE' | 'SQUARE_ROUNDED';

/**
 * Classic teardrop-shaped map pin.
 */
const MAP_PIN_PATH = 'M0-48c-9.8 0-17.7 7.8-17.7 17.4 0 15.5 17.7 30.6 17.7 30.6s17.7-15.4 17.7-30.6c0-9.6-7.9-17.4-17.7-17.4z';

/**
 * Crest/shield shape.
 */
const SHIELD_PATH =
  'M18.8-31.8c.3-3.4 1.3-6.6 3.2-9.5l-7-6.7c-2.2 1.8-4.8 2.8-7.6 3-2.6.2-5.1-.2-7.5-1.4-2.4 1.1-4.9 1.6-7.5 1.4-2.7-.2-5.1-1.1-7.3-2.7l-7.1 6.7c1.7 2.9 2.7 6 2.9 9.2.1 1.5-.3 3.5-1.3 6.1-.5 1.5-.9 2.7-1.2 3.8-.2 1-.4 1.9-.5 2.5 0 2.8.8 5.3 2.5 7.5 1.3 1.6 3.5 3.4 6.5 5.4 3.3 1.6 5.8 2.6 7.6 3.1.5.2 1 .4 1.5.7l1.5.6c1.2.7 2 1.4 2.4 2.1.5-.8 1.3-1.5 2.4-2.1.7-.3 1.3-.5 1.9-.8.5-.2.9-.4 1.1-.5.4-.1.9-.3 1.5-.6.6-.2 1.3-.5 2.2-.8 1.7-.6 3-1.1 3.8-1.6 2.9-2 5.1-3.8 6.4-5.3 1.7-2.2 2.6-4.8 2.5-7.6-.1-1.3-.7-3.3-1.7-6.1-.9-2.8-1.3-4.9-1.2-6.4z';

/**
 * Route sign shape.
 */
const ROUTE_PATH =
  'M24-28.3c-.2-13.3-7.9-18.5-8.3-18.7l-1.2-.8-1.2.8c-2 1.4-4.1 2-6.1 2-3.4 0-5.8-1.9-5.9-1.9l-1.3-1.1-1.3 1.1c-.1.1-2.5 1.9-5.9 1.9-2.1 0-4.1-.7-6.1-2l-1.2-.8-1.2.8c-.8.6-8 5.9-8.2 18.7-.2 1.1 2.9 22.2 23.9 28.3 22.9-6.7 24.1-26.9 24-28.3z';

/**
 * Plain square (no rounded corners).
 * Note: SVG viewBox is -24,-48,48,48, but for SQUARE we use a simpler path.
 */
const SQUARE_PATH = 'M-24-48h48v48h-48z';

/**
 * Square with rounded corners.
 */
const SQUARE_ROUNDED_PATH = 'M24-8c0 4.4-3.6 8-8 8h-32c-4.4 0-8-3.6-8-8v-32c0-4.4 3.6-8 8-8h32c4.4 0 8 3.6 8 8v32z';

/**
 * Lookup table for all supported POI marker shapes.
 * The key is the normalized (uppercase) shape name as provided by the API's `Marker` field.
 */
export const POI_MARKER_PATHS: Record<string, string> = {
  MAP_PIN: MAP_PIN_PATH,
  SHIELD: SHIELD_PATH,
  ROUTE: ROUTE_PATH,
  SQUARE: SQUARE_PATH,
  SQUARE_ROUNDED: SQUARE_ROUNDED_PATH,
} as const;

/** Default shape when none is specified or the shape is unknown. */
export const DEFAULT_POI_MARKER_SHAPE: PoiMarkerShape = 'MAP_PIN';

/**
 * Returns the SVG path data for a given POI marker shape.
 *
 * @param markerShape - The `Marker` field value from the API (e.g. "MAP_PIN", "SHIELD").
 *   Normalized to uppercase internally. Null/empty values default to MAP_PIN.
 * @returns The SVG path `d` attribute string.
 */
export const getPoiMarkerShapePath = (markerShape?: string | null): string => {
  const normalized = (markerShape ?? '').trim().toUpperCase();

  if (normalized.length === 0) {
    return MAP_PIN_PATH;
  }

  return POI_MARKER_PATHS[normalized] ?? MAP_PIN_PATH;
};

/** SVG viewBox used for all shapes. */
export const POI_MARKER_VIEWBOX = '-24 -48 48 48';

/** The aspect ratio of the SVG shapes (width/height). */
export const POI_MARKER_ASPECT_RATIO = 48 / 48; // 1.0

/** Total marker dimensions in pixels (matching the web app). */
export const POI_MARKER_WIDTH = 36;
export const POI_MARKER_HEIGHT = 48;

/** Anchor point for the marker (bottom-center). */
export const POI_MARKER_ANCHOR_X = 0.5;
export const POI_MARKER_ANCHOR_Y = 1.0;
