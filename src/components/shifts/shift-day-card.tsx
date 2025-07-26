import { format, parseISO } from 'date-fns';
import { AlertCircle, CheckCircle, Clock, Users } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { View } from '@/components/ui';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
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
    return (
      shiftDay.Needs?.reduce((total, group) => {
        return (
          total +
          (group.GroupNeeds?.reduce((groupTotal, role) => {
            return groupTotal + (role.Needed || 0);
          }, 0) || 0)
        );
      }, 0) || 0
    );
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
      <Card className="bg-white shadow-sm dark:bg-gray-800">
        <CardContent className="p-4">
          <VStack className="space-y-3">
            {/* Header */}
            <HStack className="items-start justify-between">
              <VStack className="mr-3 flex-1">
                <Text className="text-lg font-semibold text-gray-900 dark:text-white">{shiftDay.ShiftName}</Text>
                <Text className="text-sm text-gray-600 dark:text-gray-400">{formatDate(shiftDay.ShiftDay)}</Text>
              </VStack>

              {shiftDay.SignedUp ? (
                <Badge className="border-green-200 bg-green-100 dark:border-green-700 dark:bg-green-900">
                  <HStack className="items-center space-x-1">
                    <Icon as={CheckCircle} size={12} className="text-green-600 dark:text-green-400" />
                    <Text className="text-xs font-medium text-green-800 dark:text-green-200">{t('shifts.signed_up')}</Text>
                  </HStack>
                </Badge>
              ) : (
                <Badge className="border-orange-200 bg-orange-100 dark:border-orange-700 dark:bg-orange-900">
                  <HStack className="items-center space-x-1">
                    <Icon as={AlertCircle} size={12} className="text-orange-600 dark:text-orange-400" />
                    <Text className="text-xs font-medium text-orange-800 dark:text-orange-200">{t('shifts.signup')}</Text>
                  </HStack>
                </Badge>
              )}
            </HStack>

            {/* Time Range */}
            <HStack className="items-center space-x-2">
              <Icon as={Clock} size={16} className="text-gray-500 dark:text-gray-400" />
              <Text className="text-sm text-gray-600 dark:text-gray-400">
                {formatTime(shiftDay.Start)} - {formatTime(shiftDay.End)}
              </Text>
            </HStack>

            {/* Stats Row */}
            <HStack className="justify-between">
              <HStack className="items-center space-x-1">
                <Icon as={Users} size={16} className="text-blue-500" />
                <Text className="text-sm text-gray-600 dark:text-gray-400">
                  {getTotalSignups()}/{getTotalNeeds()} {t('shifts.signups')}
                </Text>
              </HStack>

              <Badge className="border-gray-200 bg-gray-50 dark:border-gray-600 dark:bg-gray-700">
                <Text className="text-xs text-gray-700 dark:text-gray-300">{getShiftTypeText(shiftDay.ShiftType)}</Text>
              </Badge>
            </HStack>

            {/* Progress Bar */}
            <View className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
              <View
                className="h-2 rounded-full bg-primary-600"
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
