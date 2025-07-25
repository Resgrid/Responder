import { Mail, Phone, Users } from 'lucide-react-native';
import { Pressable } from 'react-native';

import { formatDateForDisplay, parseDateISOString } from '@/lib/utils';
import { type PersonnelInfoResultData } from '@/models/v4/personnel/personnelInfoResultData';

import { Badge } from '../ui/badge';
import { Box } from '../ui/box';
import { HStack } from '../ui/hstack';
import { Text } from '../ui/text';
import { VStack } from '../ui/vstack';

interface PersonnelCardProps {
  personnel: PersonnelInfoResultData;
  onPress: (id: string) => void;
}

export const PersonnelCard: React.FC<PersonnelCardProps> = ({ personnel, onPress }) => {
  const fullName = `${personnel.FirstName} ${personnel.LastName}`.trim();

  return (
    <Pressable onPress={() => onPress(personnel.UserId)} testID={`personnel-card-${personnel.UserId}`}>
      <Box className="mb-3 rounded-lg bg-white p-4 shadow-sm dark:bg-gray-800">
        <VStack space="xs">
          <Text className="text-lg font-semibold text-gray-800 dark:text-gray-100">{fullName}</Text>

          {/* Contact Information */}
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

          {/* Status and Staffing Badges */}
          <HStack className="mt-2 flex-wrap">
            {personnel.Status ? (
              <Badge
                className="mb-1 mr-1"
                style={{ backgroundColor: personnel.StatusColor || '#3B82F6' }}
              >
                <Text className="text-xs text-white">{personnel.Status}</Text>
              </Badge>
            ) : null}

            {personnel.Staffing ? (
              <Badge
                className="mb-1 mr-1"
                style={{ backgroundColor: personnel.StaffingColor || '#10B981' }}
              >
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
          {personnel.StatusTimestamp ? (
            <Text className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Status: {formatDateForDisplay(parseDateISOString(personnel.StatusTimestamp), 'yyyy-MM-dd HH:mm Z')}
            </Text>
          ) : null}
        </VStack>
      </Box>
    </Pressable>
  );
}; 