import type { LucideIcon } from 'lucide-react-native';
import * as LucideIcons from 'lucide-react-native';
import React from 'react';

/**
 * Maps a kebab-case lucide icon name string to the corresponding
 * lucide-react-native icon component.
 *
 * This allows dynamic icon selection based on POI type data without
 * importing every possible icon statically at the call site.
 */
const LUCIDE_ICON_MAP: Record<string, LucideIcon> = {
  // Map marker icons
  'map-pin': LucideIcons.MapPin,
  'shield-alert': LucideIcons.ShieldAlert,
  shield: LucideIcons.Shield,
  'shield-check': LucideIcons.ShieldCheck,
  flame: LucideIcons.Flame,
  route: LucideIcons.Route,
  square: LucideIcons.Square,
  flag: LucideIcons.Flag,
  info: LucideIcons.Info,
  landmark: LucideIcons.Landmark,

  // Transportation
  car: LucideIcons.Car,
  bike: LucideIcons.Bike,
  bus: LucideIcons.Bus,
  truck: LucideIcons.Truck,
  ship: LucideIcons.Ship,
  plane: LucideIcons.Plane,
  'train-front': LucideIcons.TrainFront,

  // Buildings & Places
  building: LucideIcons.Building,
  'building-2': LucideIcons.Building2,
  home: LucideIcons.Home,
  hotel: LucideIcons.Hotel,
  store: LucideIcons.Store,
  warehouse: LucideIcons.Warehouse,
  school: LucideIcons.School,
  hospital: LucideIcons.Hospital,
  church: LucideIcons.Church,
  tent: LucideIcons.Tent,
  'door-open': LucideIcons.DoorOpen,

  // Nature & Outdoor
  'tree-pine': LucideIcons.TreePine,
  mountain: LucideIcons.Mountain,
  waves: LucideIcons.Waves,
  droplets: LucideIcons.Droplets,
  wind: LucideIcons.Wind,
  fish: LucideIcons.Fish,
  'paw-print': LucideIcons.PawPrint,
  flower: LucideIcons.Flower,

  // Food & Drink
  utensils: LucideIcons.Utensils,
  coffee: LucideIcons.Coffee,
  beer: LucideIcons.Beer,
  croissant: LucideIcons.Croissant,
  'shopping-basket': LucideIcons.ShoppingBasket,
  'shopping-cart': LucideIcons.ShoppingCart,

  // Commerce & Services
  wrench: LucideIcons.Wrench,
  hammer: LucideIcons.Hammer,
  scissors: LucideIcons.Scissors,
  key: LucideIcons.Key,
  gem: LucideIcons.Gem,
  scale: LucideIcons.Scale,
  mail: LucideIcons.Mail,
  phone: LucideIcons.Phone,
  globe: LucideIcons.Globe,
  monitor: LucideIcons.Monitor,
  shirt: LucideIcons.Shirt,
  armchair: LucideIcons.Armchair,
  footprints: LucideIcons.Footprints,
  paintbrush: LucideIcons.Paintbrush,
  antenna: LucideIcons.Antenna,

  // Education
  'graduation-cap': LucideIcons.GraduationCap,
  baby: LucideIcons.Baby,
  library: LucideIcons.Library,

  // Recreation
  'ferris-wheel': LucideIcons.FerrisWheel,
  palette: LucideIcons.Palette,
  dices: LucideIcons.Dices,
  clapperboard: LucideIcons.Clapperboard,
  dumbbell: LucideIcons.Dumbbell,
  music: LucideIcons.Music,
  circle: LucideIcons.Circle,
  'circle-parking': LucideIcons.CircleParking,
  'pill-bottle': LucideIcons.PillBottle,

  // Utility
  zap: LucideIcons.Zap,
  bell: LucideIcons.Bell,
  cross: LucideIcons.Cross,
  stethoscope: LucideIcons.Stethoscope,
  gavel: LucideIcons.Gavel,
  fuel: LucideIcons.Fuel,
  'arrow-down': LucideIcons.ArrowDown,
};

interface PoiIconProps {
  /** Kebab-case lucide icon name (e.g. "hospital", "map-pin") */
  name: string;
  /** Icon size in pixels */
  size?: number;
  /** Icon color */
  color?: string;
}

const DEFAULT_ICON_SIZE = 14;
const DEFAULT_ICON_COLOR = '#ffffff';

/**
 * Renders a lucide-react-native icon by its kebab-case name string.
 *
 * Falls back to the MapPin icon if the requested icon name is not found.
 */
export const PoiIcon: React.FC<PoiIconProps> = ({ name, size = DEFAULT_ICON_SIZE, color = DEFAULT_ICON_COLOR }) => {
  const IconComponent = LUCIDE_ICON_MAP[name] || LUCIDE_ICON_MAP['map-pin'];

  return <IconComponent size={size} color={color} strokeWidth={2.5} />;
};

export default PoiIcon;
