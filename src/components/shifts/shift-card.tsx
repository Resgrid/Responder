import { format, parseISO } from 'date-fns';
import { Calendar, Clock, Users } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { Badge, BadgeText } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { HStack } from '@/components/ui/hstack';
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
        return t('shifts.manual') || 'Manual';
      case 1:
        return t('shifts.automatic') || 'Automatic';
      default:
        return t('shifts.unknown') || 'Unknown';
    }
  };

  const getAssignmentTypeText = (assignmentType: number) => {
    // These would map to enum values from backend
    switch (assignmentType) {
      case 0:
        return t('shifts.assigned') || 'Assigned';
      case 1:
        return t('shifts.signup') || 'Sign Up';
      default:
        return t('shifts.unknown') || 'Unknown';
    }
  };

  return (
    <Pressable onPress={onPress} className="mb-3">
      <Card className="border-l-4 bg-white shadow-sm dark:bg-gray-800" style={{ borderLeftColor: shift.Color || '#3B82F6' }}>
        <VStack space="md" className="p-4">
          {/* Header */}
          <HStack className="items-start justify-between">
            <VStack space="xs" className="mr-3 flex-1">
              <Text size="lg" className="font-semibold text-gray-900 dark:text-white">
                {shift.Name}
              </Text>
              {shift.Code ? (
                <Text size="sm" className="text-gray-600 dark:text-gray-400">
                  {t('shifts.shift_code')}: {shift.Code}
                </Text>
              ) : null}
            </VStack>

            {shift.InShift ? (
              <Badge action="success" size="sm">
                <BadgeText>{t('shifts.in_shift')}</BadgeText>
              </Badge>
            ) : null}
          </HStack>

          {/* Stats Row */}
          <HStack space="lg">
            <HStack space="xs" className="items-center">
              <Users size={16} className="text-gray-500 dark:text-gray-400" />
              <Text size="sm" className="text-gray-600 dark:text-gray-400">
                {shift.PersonnelCount} {t('shifts.personnel_count')}
              </Text>
            </HStack>

            <HStack space="xs" className="items-center">
              <Calendar size={16} className="text-gray-500 dark:text-gray-400" />
              <Text size="sm" className="text-gray-600 dark:text-gray-400">
                {shift.GroupCount} {t('shifts.groups')}
              </Text>
            </HStack>
          </HStack>

          {/* Next Day */}
          {shift.NextDay ? (
            <HStack space="sm" className="items-center">
              <Clock size={16} className="text-gray-500 dark:text-gray-400" />
              <VStack space="xs">
                <Text size="sm" className="font-medium text-gray-700 dark:text-gray-300">
                  {t('shifts.next_day')}
                </Text>
                <Text size="sm" className="text-gray-600 dark:text-gray-400">
                  {formatNextDay(shift.NextDay)}
                </Text>
              </VStack>
            </HStack>
          ) : null}

          {/* Schedule and Assignment Type */}
          <HStack space="sm">
            <Badge action="info" size="sm">
              <BadgeText>{getScheduleTypeText(shift.ScheduleType)}</BadgeText>
            </Badge>

            <Badge action="muted" size="sm">
              <BadgeText>{getAssignmentTypeText(shift.AssignmentType)}</BadgeText>
            </Badge>
          </HStack>
        </VStack>
      </Card>
    </Pressable>
  );
};
