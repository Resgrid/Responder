import React from 'react';
import { useTranslation } from 'react-i18next';
import { format, parseISO } from 'date-fns';

import { View } from '@/components/ui';
import { Text } from '@/components/ui/text';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { Pressable } from '@/components/ui/pressable';
import { Clock, Users, CheckCircle, AlertCircle } from 'lucide-react-native';
import { Icon } from '@/components/ui/icon';

import { type ShiftDaysResultData } from '@/models/v4/shifts/shiftDayResultData';

interface ShiftDayCardProps {
  shiftDay: ShiftDaysResultData;
  onPress: () => void;
}

export const ShiftDayCard: React.FC<ShiftDayCardProps> = ({ shiftDay, onPress }) => {
  const { t } = useTranslation();

  const formatTime = (timeString: string) => {
    if (!timeString) return '';
    try {
      return format(parseISO(timeString), 'h:mm a');
    } catch {
      return timeString;
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    try {
      return format(parseISO(dateString), 'MMM dd, yyyy');
    } catch {
      return dateString;
    }
  };

  const getTotalSignups = () => {
    return shiftDay.Signups?.length || 0;
  };

  const getTotalNeeds = () => {
    return shiftDay.Needs?.reduce((total, group) => {
      return total + (group.GroupNeeds?.reduce((groupTotal, role) => {
        return groupTotal + (role.Needed || 0);
      }, 0) || 0);
    }, 0) || 0;
  };

  const getShiftTypeText = (shiftType: number) => {
    // These would map to enum values from backend
    switch (shiftType) {
      case 0:
        return 'Regular';
      case 1:
        return 'Emergency';
      case 2:
        return 'Training';
      default:
        return 'Unknown';
    }
  };

  return (
    <Pressable onPress={onPress} className="mb-3">
      <Card className="bg-white dark:bg-gray-800 shadow-sm">
        <CardContent className="p-4">
          <VStack className="space-y-3">
            {/* Header */}
            <HStack className="justify-between items-start">
              <VStack className="flex-1 mr-3">
                <Text className="text-lg font-semibold text-gray-900 dark:text-white">
                  {shiftDay.ShiftName}
                </Text>
                <Text className="text-sm text-gray-600 dark:text-gray-400">
                  {formatDate(shiftDay.ShiftDay)}
                </Text>
              </VStack>

              {shiftDay.SignedUp ? (
                <Badge className="bg-green-100 dark:bg-green-900 border-green-200 dark:border-green-700">
                  <HStack className="items-center space-x-1">
                    <Icon
                      as={CheckCircle}
                      size={12}
                      className="text-green-600 dark:text-green-400"
                    />
                    <Text className="text-green-800 dark:text-green-200 text-xs font-medium">
                      {t('shifts.signed_up')}
                    </Text>
                  </HStack>
                </Badge>
              ) : (
                <Badge className="bg-orange-100 dark:bg-orange-900 border-orange-200 dark:border-orange-700">
                  <HStack className="items-center space-x-1">
                    <Icon
                      as={AlertCircle}
                      size={12}
                      className="text-orange-600 dark:text-orange-400"
                    />
                    <Text className="text-orange-800 dark:text-orange-200 text-xs font-medium">
                      {t('shifts.signup')}
                    </Text>
                  </HStack>
                </Badge>
              )}
            </HStack>

            {/* Time Range */}
            <HStack className="items-center space-x-2">
              <Icon
                as={Clock}
                size={16}
                className="text-gray-500 dark:text-gray-400"
              />
              <Text className="text-sm text-gray-600 dark:text-gray-400">
                {formatTime(shiftDay.Start)} - {formatTime(shiftDay.End)}
              </Text>
            </HStack>

            {/* Stats Row */}
            <HStack className="justify-between">
              <HStack className="items-center space-x-1">
                <Icon
                  as={Users}
                  size={16}
                  className="text-blue-500"
                />
                <Text className="text-sm text-gray-600 dark:text-gray-400">
                  {getTotalSignups()}/{getTotalNeeds()} {t('shifts.signups')}
                </Text>
              </HStack>

              <Badge className="bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600">
                <Text className="text-gray-700 dark:text-gray-300 text-xs">
                  {getShiftTypeText(shiftDay.ShiftType)}
                </Text>
              </Badge>
            </HStack>

            {/* Progress Bar */}
            <View className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <View
                className="bg-primary-600 h-2 rounded-full"
                style={{
                  width: `${getTotalNeeds() > 0 ? (getTotalSignups() / getTotalNeeds()) * 100 : 0}%`,
                }}
              />
            </View>
          </VStack>
        </CardContent>
      </Card>
    </Pressable>
  );
}; 