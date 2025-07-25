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
import { Clock, Users, Calendar } from 'lucide-react-native';
import { Icon } from '@/components/ui/icon';

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
      <Card className="bg-white dark:bg-gray-800 shadow-sm border-l-4" style={{ borderLeftColor: shift.Color || '#3B82F6' }}>
        <CardContent className="p-4">
          <VStack className="space-y-3">
            {/* Header */}
            <HStack className="justify-between items-start">
              <VStack className="flex-1 mr-3">
                <Text className="text-lg font-semibold text-gray-900 dark:text-white">
                  {shift.Name}
                </Text>
                {shift.Code && (
                  <Text className="text-sm text-gray-600 dark:text-gray-400">
                    {t('shifts.shift_code')}: {shift.Code}
                  </Text>
                )}
              </VStack>

              {shift.InShift && (
                <Badge className="bg-green-100 dark:bg-green-900 border-green-200 dark:border-green-700">
                  <Text className="text-green-800 dark:text-green-200 text-xs font-medium">
                    {t('shifts.in_shift')}
                  </Text>
                </Badge>
              )}
            </HStack>

            {/* Stats Row */}
            <HStack className="space-x-4">
              <HStack className="items-center space-x-1">
                <Icon
                  as={Users}
                  size={16}
                  className="text-gray-500 dark:text-gray-400"
                />
                <Text className="text-sm text-gray-600 dark:text-gray-400">
                  {shift.PersonnelCount} {t('shifts.personnel_count')}
                </Text>
              </HStack>

              <HStack className="items-center space-x-1">
                <Icon
                  as={Calendar}
                  size={16}
                  className="text-gray-500 dark:text-gray-400"
                />
                <Text className="text-sm text-gray-600 dark:text-gray-400">
                  {shift.GroupCount} {t('shifts.groups')}
                </Text>
              </HStack>
            </HStack>

            {/* Next Day */}
            {shift.NextDay && (
              <HStack className="items-center space-x-2">
                <Icon
                  as={Clock}
                  size={16}
                  className="text-gray-500 dark:text-gray-400"
                />
                <VStack>
                  <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('shifts.next_day')}
                  </Text>
                  <Text className="text-sm text-gray-600 dark:text-gray-400">
                    {formatNextDay(shift.NextDay)}
                  </Text>
                </VStack>
              </HStack>
            )}

            {/* Schedule and Assignment Type */}
            <HStack className="space-x-2">
              <Badge className="bg-blue-50 dark:bg-blue-900 border-blue-200 dark:border-blue-700">
                <Text className="text-blue-700 dark:text-blue-300 text-xs">
                  {getScheduleTypeText(shift.ScheduleType)}
                </Text>
              </Badge>

              <Badge className="bg-purple-50 dark:bg-purple-900 border-purple-200 dark:border-purple-700">
                <Text className="text-purple-700 dark:text-purple-300 text-xs">
                  {getAssignmentTypeText(shift.AssignmentType)}
                </Text>
              </Badge>
            </HStack>
          </VStack>
        </CardContent>
      </Card>
    </Pressable>
  );
}; 