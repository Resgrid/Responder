import {
  AlertCircle as RawAlertCircle,
  AlertTriangle as RawAlertTriangle,
  BluetoothIcon as RawBluetoothIcon,
  BuildingIcon as RawBuildingIcon,
  Calendar as RawCalendar,
  CalendarDays as RawCalendarDays,
  CalendarIcon as RawCalendarIcon,
  Check as RawCheck,
  CheckCircle as RawCheckCircle,
  CheckIcon as RawCheckIcon,
  ChevronDown as RawChevronDown,
  ChevronDownIcon as RawChevronDownIcon,
  ChevronLeft as RawChevronLeft,
  ChevronRightIcon as RawChevronRightIcon,
  Clock as RawClock,
  Edit2Icon as RawEdit2Icon,
  EditIcon as RawEditIcon,
  EyeIcon as RawEyeIcon,
  EyeOffIcon as RawEyeOffIcon,
  FileText as RawFileText,
  Filter as RawFilter,
  FilterIcon as RawFilterIcon,
  GlobeIcon as RawGlobeIcon,
  Headphones as RawHeadphones,
  HomeIcon as RawHomeIcon,
  IdCard as RawIdCard,
  Info as RawInfo,
  Loader2 as RawLoader2,
  LogIn as RawLogIn,
  type LucideProps,
  Mail as RawMail,
  MailIcon as RawMailIcon,
  MailOpen as RawMailOpen,
  MapPin as RawMapPin,
  MapPinIcon as RawMapPinIcon,
  MessageSquarePlus as RawMessageSquarePlus,
  Mic as RawMic,
  MoreVertical as RawMoreVertical,
  MoreVerticalIcon as RawMoreVerticalIcon,
  Phone as RawPhone,
  PhoneIcon as RawPhoneIcon,
  Plus as RawPlus,
  PlusIcon as RawPlusIcon,
  RefreshCwIcon as RawRefreshCwIcon,
  Reply as RawReply,
  RotateCcwIcon as RawRotateCcwIcon,
  Search as RawSearch,
  SearchIcon as RawSearchIcon,
  Send as RawSend,
  SettingsIcon as RawSettingsIcon,
  SmartphoneIcon as RawSmartphoneIcon,
  Speaker as RawSpeaker,
  StarIcon as RawStarIcon,
  Tag as RawTag,
  TimerIcon as RawTimerIcon,
  Trash2 as RawTrash2,
  TrashIcon as RawTrashIcon,
  Truck as RawTruck,
  User as RawUser,
  UserIcon as RawUserIcon,
  Users as RawUsers,
  UsersIcon as RawUsersIcon,
  WifiIcon as RawWifiIcon,
  X as RawX,
  XCircle as RawXCircle,
  XIcon as RawXIcon,
} from 'lucide-react-native';
import { styled } from 'nativewind';
import type React from 'react';

/**
 * lucide icons that understand `className`.
 *
 * nativewind v5 dropped the JSX transform: a `className` only has an effect on a component
 * that has been through `styled()`, and metro's polyfill only covers `react-native` itself.
 * On a raw lucide icon the class was silently discarded -- which is why `text-*` colours and
 * `mr-*` spacing had no effect and icons rendered with their default near-black stroke.
 *
 * `target: 'style'` keeps layout utilities working, and `nativeStyleMapping` lifts the
 * resolved colour out of the style object onto lucide's `color` prop, which is where
 * react-native-svg resolves `currentColor` from.
 *
 * Only icons used with a className live here, so the bundle is unchanged; import the rest
 * straight from `lucide-react-native`.
 */
const iconMapping = {
  className: {
    target: 'style',
    nativeStyleMapping: {
      color: 'color',
    },
  },
} as const;

type LucideIcon = React.ComponentType<LucideProps>;

const themed = <T extends LucideIcon>(Component: T): T => styled(Component as LucideIcon, iconMapping) as unknown as T;

export const AlertCircle = themed(RawAlertCircle);
export const AlertTriangle = themed(RawAlertTriangle);
export const BluetoothIcon = themed(RawBluetoothIcon);
export const BuildingIcon = themed(RawBuildingIcon);
export const Calendar = themed(RawCalendar);
export const CalendarDays = themed(RawCalendarDays);
export const CalendarIcon = themed(RawCalendarIcon);
export const Check = themed(RawCheck);
export const CheckCircle = themed(RawCheckCircle);
export const CheckIcon = themed(RawCheckIcon);
export const ChevronDown = themed(RawChevronDown);
export const ChevronDownIcon = themed(RawChevronDownIcon);
export const ChevronLeft = themed(RawChevronLeft);
export const ChevronRightIcon = themed(RawChevronRightIcon);
export const Clock = themed(RawClock);
export const Edit2Icon = themed(RawEdit2Icon);
export const EditIcon = themed(RawEditIcon);
export const EyeIcon = themed(RawEyeIcon);
export const EyeOffIcon = themed(RawEyeOffIcon);
export const FileText = themed(RawFileText);
export const Filter = themed(RawFilter);
export const FilterIcon = themed(RawFilterIcon);
export const GlobeIcon = themed(RawGlobeIcon);
export const Headphones = themed(RawHeadphones);
export const HomeIcon = themed(RawHomeIcon);
export const IdCard = themed(RawIdCard);
export const Info = themed(RawInfo);
export const Loader2 = themed(RawLoader2);
export const LogIn = themed(RawLogIn);
export const Mail = themed(RawMail);
export const MailIcon = themed(RawMailIcon);
export const MailOpen = themed(RawMailOpen);
export const MapPin = themed(RawMapPin);
export const MapPinIcon = themed(RawMapPinIcon);
export const MessageSquarePlus = themed(RawMessageSquarePlus);
export const Mic = themed(RawMic);
export const MoreVertical = themed(RawMoreVertical);
export const MoreVerticalIcon = themed(RawMoreVerticalIcon);
export const Phone = themed(RawPhone);
export const PhoneIcon = themed(RawPhoneIcon);
export const Plus = themed(RawPlus);
export const PlusIcon = themed(RawPlusIcon);
export const RefreshCwIcon = themed(RawRefreshCwIcon);
export const Reply = themed(RawReply);
export const RotateCcwIcon = themed(RawRotateCcwIcon);
export const Search = themed(RawSearch);
export const SearchIcon = themed(RawSearchIcon);
export const Send = themed(RawSend);
export const SettingsIcon = themed(RawSettingsIcon);
export const SmartphoneIcon = themed(RawSmartphoneIcon);
export const Speaker = themed(RawSpeaker);
export const StarIcon = themed(RawStarIcon);
export const Tag = themed(RawTag);
export const TimerIcon = themed(RawTimerIcon);
export const Trash2 = themed(RawTrash2);
export const TrashIcon = themed(RawTrashIcon);
export const Truck = themed(RawTruck);
export const User = themed(RawUser);
export const UserIcon = themed(RawUserIcon);
export const Users = themed(RawUsers);
export const UsersIcon = themed(RawUsersIcon);
export const WifiIcon = themed(RawWifiIcon);
export const X = themed(RawX);
export const XCircle = themed(RawXCircle);
export const XIcon = themed(RawXIcon);
