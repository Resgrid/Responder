// Mock for lucide-react-native icons
const React = require('react');
const { View } = require('react-native');

const mockIcon = React.forwardRef((props: any, ref: any) => {
  return React.createElement(View, { ...props, ref, testID: `icon-${props.testID || 'mock'}` });
});

export const AlertCircle = mockIcon;
export const Bell = mockIcon;
export const BuildingIcon = mockIcon;
export const CalendarIcon = mockIcon;
export const CheckCircle = mockIcon;
export const ChevronDownIcon = mockIcon;
export const ChevronRightIcon = mockIcon;
export const ChevronRight = mockIcon;
export const Circle = mockIcon;
export const ClockIcon = mockIcon;
export const Edit2Icon = mockIcon;
export const ExternalLink = mockIcon;
export const FileTextIcon = mockIcon;
export const GlobeIcon = mockIcon;
export const HomeIcon = mockIcon;
export const ImageIcon = mockIcon;
export const InfoIcon = mockIcon;
export const MailIcon = mockIcon;
export const MapPinIcon = mockIcon;
export const MessageCircle = mockIcon;
export const MoreVertical = mockIcon;
export const PaperclipIcon = mockIcon;
export const Phone = mockIcon;
export const PhoneIcon = mockIcon;
export const RouteIcon = mockIcon;
export const SettingsIcon = mockIcon;
export const SmartphoneIcon = mockIcon;
export const StarIcon = mockIcon;
export const TrashIcon = mockIcon;
export const Trash2 = mockIcon;
export const User = mockIcon;
export const UserCheck = mockIcon;
export const UserIcon = mockIcon;
export const Users = mockIcon;
export const UsersIcon = mockIcon;
export const X = mockIcon;
