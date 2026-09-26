import { Calendar, Clock, Users } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { Badge, BadgeText } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { HStack } from '@/components/ui/hstack';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { formatShiftDate } from '@/lib/shift-utils';
import { type ShiftResultData } from '@/models/v4/shifts/shiftResultData';

import { getAssignmentTypeKey, getScheduleTypeKey } from './shift-labels';

interface ShiftCardProps {
  shift: ShiftResultData;
  onPress: (shift: ShiftResultData) => void;
}

const ShiftCardComponent: React.FC<ShiftCardProps> = ({ shift, onPress }) => {
  const { t } = useTranslation();
  const { colorScheme } = useColorScheme();
  const iconColor = colorScheme === 'dark' ? '#9ca3af' : '#6b7280';

  const handlePress = useCallback(() => {
    onPress(shift);
  }, [onPress, shift]);

  const hours = shift.StartTime && shift.EndTime ? `${shift.StartTime} – ${shift.EndTime}` : '';

  return (
    <Pressable onPress={handlePress} className="mb-3" accessibilityRole="button" accessibilityLabel={shift.Name} accessibilityHint={t('shifts.shift_card_a11y_hint')} testID={`shift-card-${shift.ShiftId}`}>
      <Card className="border-l-4 bg-white p-4 shadow-xs dark:bg-gray-800" style={{ borderLeftColor: shift.Color || '#3B82F6' }}>
        <VStack space="sm">
          <HStack className="items-start justify-between">
            <VStack space="xs" className="mr-3 flex-1">
              <Text className="text-base font-semibold text-gray-900 dark:text-white">{shift.Name}</Text>
              {shift.Code ? (
                <Text className="text-sm text-gray-600 dark:text-gray-400">
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

          {hours ? (
            <HStack space="xs" className="items-center">
              <Clock size={16} color={iconColor} />
              <Text className="text-sm text-gray-600 dark:text-gray-400">{hours}</Text>
            </HStack>
          ) : null}

          <HStack space="lg">
            <HStack space="xs" className="items-center">
              <Users size={16} color={iconColor} />
              <Text className="text-sm text-gray-600 dark:text-gray-400">
                {t('shifts.personnel_count')}: {shift.PersonnelCount}
              </Text>
            </HStack>
            <HStack space="xs" className="items-center">
              <Calendar size={16} color={iconColor} />
              <Text className="text-sm text-gray-600 dark:text-gray-400">
                {t('shifts.groups')}: {shift.GroupCount}
              </Text>
            </HStack>
          </HStack>

          {shift.NextDay ? (
            <Text className="text-sm text-gray-700 dark:text-gray-300">
              {t('shifts.next_day')}: {formatShiftDate(shift.NextDay)}
            </Text>
          ) : null}

          <HStack space="xs" className="flex-wrap">
            <Badge action="info" size="sm" className="mb-1 mr-1">
              <BadgeText>{t(getScheduleTypeKey(shift.ScheduleType))}</BadgeText>
            </Badge>
            <Badge action="muted" size="sm" className="mb-1 mr-1">
              <BadgeText>{t(getAssignmentTypeKey(shift.AssignmentType))}</BadgeText>
            </Badge>
            {shift.RequireApproval ? (
              <Badge action="muted" size="sm" className="mb-1 mr-1">
                <BadgeText>{t('shifts.approval_required')}</BadgeText>
              </Badge>
            ) : null}
          </HStack>
        </VStack>
      </Card>
    </Pressable>
  );
};

export const ShiftCard = React.memo(ShiftCardComponent);
