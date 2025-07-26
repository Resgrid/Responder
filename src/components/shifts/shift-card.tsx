import { format, parseISO } from 'date-fns';
import { Calendar, Clock, Users } from 'lucide-react-native';
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
import { type ShiftResultData } from '@/models/v4/shifts/shiftResultData';

interface ShiftCardProps {
  shift: ShiftResultData;
  onPress: () => void;
}

export const ShiftCard: React.FC<ShiftCardProps> = ({ shift, onPress }) => {
  const { t } = useTranslation();

  const formatNextDay = (nextDay: string) => {
    if (!nextDay) return t('shifts.no_shifts');
    try {
      return format(parseISO(nextDay), 'MMM dd, yyyy');
    } catch {
      return nextDay;
    }
  };

  const getScheduleTypeText = (scheduleType: number) => {
    // These would map to enum values from backend
    switch (scheduleType) {
      case 0:
        return 'Manual';
      case 1:
        return 'Automatic';
      default:
        return 'Unknown';
    }
  };

  const getAssignmentTypeText = (assignmentType: number) => {
    // These would map to enum values from backend
    switch (assignmentType) {
      case 0:
        return 'Optional';
      case 1:
        return 'Required';
      default:
        return 'Unknown';
    }
  };

  return (
    <Pressable onPress={onPress} className="mb-3">
      <Card className="border-l-4 bg-white shadow-sm dark:bg-gray-800" style={{ borderLeftColor: shift.Color || '#3B82F6' }}>
        <CardContent className="p-4">
          <VStack className="space-y-3">
            {/* Header */}
            <HStack className="items-start justify-between">
              <VStack className="mr-3 flex-1">
                <Text className="text-lg font-semibold text-gray-900 dark:text-white">{shift.Name}</Text>
                {shift.Code && (
                  <Text className="text-sm text-gray-600 dark:text-gray-400">
                    {t('shifts.shift_code')}: {shift.Code}
                  </Text>
                )}
              </VStack>

              {shift.InShift && (
                <Badge className="border-green-200 bg-green-100 dark:border-green-700 dark:bg-green-900">
                  <Text className="text-xs font-medium text-green-800 dark:text-green-200">{t('shifts.in_shift')}</Text>
                </Badge>
              )}
            </HStack>

            {/* Stats Row */}
            <HStack className="space-x-4">
              <HStack className="items-center space-x-1">
                <Icon as={Users} size={16} className="text-gray-500 dark:text-gray-400" />
                <Text className="text-sm text-gray-600 dark:text-gray-400">
                  {shift.PersonnelCount} {t('shifts.personnel_count')}
                </Text>
              </HStack>

              <HStack className="items-center space-x-1">
                <Icon as={Calendar} size={16} className="text-gray-500 dark:text-gray-400" />
                <Text className="text-sm text-gray-600 dark:text-gray-400">
                  {shift.GroupCount} {t('shifts.groups')}
                </Text>
              </HStack>
            </HStack>

            {/* Next Day */}
            {shift.NextDay && (
              <HStack className="items-center space-x-2">
                <Icon as={Clock} size={16} className="text-gray-500 dark:text-gray-400" />
                <VStack>
                  <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('shifts.next_day')}</Text>
                  <Text className="text-sm text-gray-600 dark:text-gray-400">{formatNextDay(shift.NextDay)}</Text>
                </VStack>
              </HStack>
            )}

            {/* Schedule and Assignment Type */}
            <HStack className="space-x-2">
              <Badge className="border-blue-200 bg-blue-50 dark:border-blue-700 dark:bg-blue-900">
                <Text className="text-xs text-blue-700 dark:text-blue-300">{getScheduleTypeText(shift.ScheduleType)}</Text>
              </Badge>

              <Badge className="border-purple-200 bg-purple-50 dark:border-purple-700 dark:bg-purple-900">
                <Text className="text-xs text-purple-700 dark:text-purple-300">{getAssignmentTypeText(shift.AssignmentType)}</Text>
              </Badge>
            </HStack>
          </VStack>
        </CardContent>
      </Card>
    </Pressable>
  );
};
