import { Mail, Phone, Users } from 'lucide-react-native';
import * as React from 'react';
import { Pressable } from 'react-native';

import { formatDateForDisplay, getAvatarUrl, parseDateISOString } from '@/lib/utils';
import { type PersonnelInfoResultData } from '@/models/v4/personnel/personnelInfoResultData';
import { useSecurityStore } from '@/stores/security/store';

import { Avatar, AvatarFallbackText, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { Box } from '../ui/box';
import { HStack } from '../ui/hstack';
import { Text } from '../ui/text';
import { VStack } from '../ui/vstack';

/**
 * Generates a deterministic color from a string (user ID or name)
 * Returns a hex color string
 */
function getColorFromString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }

  // Generate HSL color with good saturation and lightness for visibility
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 65%, 45%)`;
}

/**
 * Gets initials from first and last name
 */
function getInitials(firstName?: string, lastName?: string): string {
  const first = firstName?.trim()?.[0]?.toUpperCase() || '';
  const last = lastName?.trim()?.[0]?.toUpperCase() || '';
  return first + last || '?';
}

interface PersonnelCardProps {
  personnel: PersonnelInfoResultData;
  onPress: (id: string) => void;
}

export const PersonnelCard: React.FC<PersonnelCardProps> = ({ personnel, onPress }) => {
  const fullName = `${personnel.FirstName} ${personnel.LastName}`.trim();
  const { canUserViewPII } = useSecurityStore();
  const [imageError, setImageError] = React.useState(false);

  const avatarUrl = getAvatarUrl(personnel.UserId);
  const initials = getInitials(personnel.FirstName, personnel.LastName);
  const fallbackColor = getColorFromString(personnel.UserId || fullName);

  return (
    <Pressable onPress={() => onPress(personnel.UserId)} testID={`personnel-card-${personnel.UserId}`}>
      <Box className="mb-3 rounded-lg bg-white p-4 shadow-sm dark:bg-gray-800">
        <HStack space="md" className="items-start">
          {/* Profile Avatar */}
          <Avatar size="md" style={imageError ? { backgroundColor: fallbackColor } : undefined}>
            {!imageError && (
              <AvatarImage
                source={{ uri: avatarUrl }}
                onError={() => setImageError(true)}
              />
            )}
            {imageError && (
              <AvatarFallbackText className="text-white">{initials}</AvatarFallbackText>
            )}
          </Avatar>

          <VStack space="xs" className="flex-1">
            <Text className="text-lg font-semibold text-gray-800 dark:text-gray-100">{fullName}</Text>
            {/* Contact Information */}
            {canUserViewPII ? (
              <VStack space="xs">
                {personnel.EmailAddress ? (
                  <HStack space="xs" className="items-center">
                    <Mail size={16} className="text-gray-600 dark:text-gray-400" />
                    <Text className="text-sm text-gray-600 dark:text-gray-300" numberOfLines={1}>
                      {personnel.EmailAddress}
                    </Text>
                  </HStack>
                ) : null}

                {personnel.MobilePhone ? (
                  <HStack space="xs" className="items-center">
                    <Phone size={16} className="text-gray-600 dark:text-gray-400" />
                    <Text className="text-sm text-gray-600 dark:text-gray-300" numberOfLines={1}>
                      {personnel.MobilePhone}
                    </Text>
                  </HStack>
                ) : null}

                {personnel.GroupName ? (
                  <HStack space="xs" className="items-center">
                    <Users size={16} className="text-gray-600 dark:text-gray-400" />
                    <Text className="text-sm text-gray-600 dark:text-gray-300" numberOfLines={1}>
                      {personnel.GroupName}
                    </Text>
                  </HStack>
                ) : null}
              </VStack>
            ) : personnel.GroupName ? (
              <VStack space="xs">
                {personnel.GroupName ? (
                  <HStack space="xs" className="items-center">
                    <Users size={16} className="text-gray-600 dark:text-gray-400" />
                    <Text className="text-sm text-gray-600 dark:text-gray-300" numberOfLines={1}>
                      {personnel.GroupName}
                    </Text>
                  </HStack>
                ) : null}
              </VStack>
            ) : null}

            {/* Status and Staffing Badges */}
            <HStack className="mt-2 flex-wrap">
              {personnel.Status ? (
                <Badge className="mb-1 mr-1" style={{ backgroundColor: personnel.StatusColor || '#3B82F6' }}>
                  <Text className="text-xs text-white">{personnel.Status}</Text>
                </Badge>
              ) : null}

              {personnel.Staffing ? (
                <Badge className="mb-1 mr-1" style={{ backgroundColor: personnel.StaffingColor || '#10B981' }}>
                  <Text className="text-xs text-white">{personnel.Staffing}</Text>
                </Badge>
              ) : null}
            </HStack>

            {/* Roles */}
            {personnel.Roles && personnel.Roles.length > 0 ? (
              <HStack className="mt-1 flex-wrap">
                {personnel.Roles.slice(0, 3).map((role, index) => (
                  <Badge key={index} className="mb-1 mr-1 bg-gray-100 dark:bg-gray-700">
                    <Text className="text-xs text-gray-800 dark:text-gray-100">{role}</Text>
                  </Badge>
                ))}
                {personnel.Roles.length > 3 ? (
                  <Badge className="mb-1 mr-1 bg-gray-100 dark:bg-gray-700">
                    <Text className="text-xs text-gray-800 dark:text-gray-100">+{personnel.Roles.length - 3}</Text>
                  </Badge>
                ) : null}
              </HStack>
            ) : null}

            {/* Last Status Update */}
            {personnel.StatusTimestamp ? <Text className="mt-2 text-xs text-gray-500 dark:text-gray-400">Status: {formatDateForDisplay(parseDateISOString(personnel.StatusTimestamp), 'yyyy-MM-dd HH:mm Z')}</Text> : null}
          </VStack>
        </HStack>
      </Box>
    </Pressable>
  );
};
