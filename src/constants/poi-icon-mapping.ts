/**
 * POI icon mapping from map-icons CSS class names to lucide-react-native icon names.
 *
 * This mapping mirrors the map-icons font library used by the Resgrid web application.
 * Each entry maps a map-icon CSS class name (e.g. "map-icon-hospital") to a
 * lucide-react-native icon name (e.g. "hospital").
 *
 * For mobile apps, lucide-react-native provides native vector icons that are
 * rendered in white inside the colored SVG shape background.
 */

/**
 * Raw mapping: map-icon class name (without "map-icon-" prefix) → lucide icon name.
 * All lucide icon names have been verified against lucide-react-native v0.475.
 */
const POI_ICON_TO_LUCIDE: Record<string, string> = {
  // Common POI types
  'map-pin': 'map-pin',
  'point-of-interest': 'map-pin',
  hospital: 'hospital',
  police: 'shield-alert',
  'fire-station': 'flame',
  school: 'school',
  bank: 'building',
  'post-office': 'mail',
  church: 'church',
  parking: 'circle-parking',
  'gas-station': 'fuel',
  airport: 'plane',
  restaurant: 'utensils',
  'grocery-or-supermarket': 'shopping-basket',
  pharmacy: 'pill-bottle',
  library: 'library',
  museum: 'building-2',
  stadium: 'building-2',
  courthouse: 'gavel',
  'city-hall': 'building-2',
  embassy: 'building-2',
  campground: 'tent',
  park: 'tree-pine',
  lodging: 'hotel',
  'train-station': 'train-front',
  'bus-station': 'bus',
  'square-pin': 'map-pin',
  shield: 'shield',
  route: 'route',
  square: 'square',
  'square-rounded': 'square',

  // Transportation
  'car-rental': 'car',
  'car-repair': 'wrench',
  'car-wash': 'car',
  'bicycle-store': 'bike',
  bicycle: 'bike',
  motorcycle: 'bike',
  boat: 'ship',
  ferry: 'ship',
  'subway-station': 'train-front',
  'taxi-stand': 'car',

  // Food & Drink
  bakery: 'croissant',
  bar: 'beer',
  cafe: 'coffee',
  'convenience-store': 'store',
  'liquor-store': 'beer',
  'meal-delivery': 'bike',
  'meal-takeaway': 'shopping-basket',
  supermarket: 'shopping-cart',
  store: 'store',

  // Health
  dentist: 'stethoscope',
  doctor: 'stethoscope',
  'veterinary-care': 'stethoscope',
  'medical-store': 'cross',

  // Civic & Government
  'local-government-office': 'building-2',
  'local-post-office': 'mail',
  'place-of-worship': 'church',
  mosque: 'church',
  synagogue: 'church',
  temple: 'church',
  cemetery: 'church',
  'funeral-home': 'church',
  'fire-hydrant': 'flame',
  'police-box': 'shield-alert',

  // Education
  university: 'graduation-cap',
  college: 'graduation-cap',
  daycare: 'baby',
  'primary-school': 'school',
  'secondary-school': 'school',

  // Recreation
  aquarium: 'fish',
  'amusement-park': 'ferris-wheel',
  'art-gallery': 'palette',
  beach: 'waves',
  'bowling-alley': 'circle',
  casino: 'dices',
  cinema: 'clapperboard',
  'movie-theater': 'clapperboard',
  'golf-course': 'flag',
  gym: 'dumbbell',
  'hair-care': 'scissors',
  'night-club': 'music',
  playground: 'tree-pine',
  rink: 'circle',
  spa: 'droplets',
  'tourist-information': 'info',
  zoo: 'paw-print',

  // Business & Services
  atm: 'landmark',
  'beauty-salon': 'scissors',
  'car-dealer': 'car',
  'clothing-store': 'shirt',
  'department-store': 'store',
  'electronics-store': 'monitor',
  florist: 'flower',
  'furniture-store': 'armchair',
  'hardware-store': 'hammer',
  'home-goods-store': 'home',
  'insurance-agency': 'shield-check',
  'jewelry-store': 'gem',
  laundromat: 'shirt',
  lawyer: 'scale',
  locksmith: 'key',
  'moving-company': 'truck',
  'painter-shop': 'paintbrush',
  'pet-store': 'paw-print',
  plumber: 'wrench',
  'real-estate-agency': 'building',
  'roofing-contractor': 'home',
  'shoe-store': 'footprints',
  'shopping-mall': 'store',
  'storage-facility': 'warehouse',
  'travel-agency': 'globe',

  // Infrastructure
  bridge: 'route',
  dam: 'waves',
  electrician: 'zap',
  'fire-alarm': 'bell',
  'fire-extinguisher': 'flame',
  fountain: 'droplets',
  gate: 'door-open',
  lighthouse: 'tower',
  memorial: 'flag',
  monument: 'landmark',
  'mountain-pass': 'mountain',
  'natural-feature': 'mountain',
  'power-substation': 'zap',
  'power-tower': 'zap',
  tower: 'antenna',
  tunnel: 'arrow-down',
  'water-tower': 'droplets',
  windmill: 'wind',
};

/** Default lucide icon name when a map-icon is not found in the mapping. */
export const DEFAULT_POI_ICON = 'map-pin';

/**
 * Strips the "map-icon-" prefix from a CSS class name to get the icon key.
 *
 * @param iconClass - The full CSS class name (e.g. "map-icon-hospital")
 * @returns The icon key without the prefix (e.g. "hospital"), or the original string
 *   if it doesn't start with "map-icon-".
 */
const stripMapIconPrefix = (iconClass: string): string => {
  if (iconClass.toLowerCase().startsWith('map-icon-')) {
    return iconClass.slice(9); // Remove "map-icon-"
  }
  return iconClass;
};

/**
 * Resolves a map-icon CSS class name to a lucide-react-native icon name.
 *
 * @param poiImage - The `PoiImage` field value from the API (e.g. "map-icon-hospital")
 * @param imagePath - The `ImagePath` field as fallback
 * @returns A lucide-react-native icon name string, or the default if not found.
 */
export const resolvePoiIcon = (poiImage?: string | null, imagePath?: string | null): string => {
  const tokens = [poiImage, imagePath].filter((v): v is string => typeof v === 'string' && v.trim().length > 0);

  for (const token of tokens) {
    const key = stripMapIconPrefix(token.trim()).toLowerCase();
    if (POI_ICON_TO_LUCIDE[key]) {
      return POI_ICON_TO_LUCIDE[key];
    }
  }

  return DEFAULT_POI_ICON;
};
