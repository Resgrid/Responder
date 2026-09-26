import { Clock, Repeat, Users } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { Badge, BadgeText } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { HStack } from '@/components/ui/hstack';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { formatShiftDate, formatShiftTime, isOvernightShift } from '@/lib/shift-utils';
import { type ShiftDayResultData } from '@/models/v4/shifts/shiftDayResultData';

import { getAssignmentTypeKey, getMyStatusLabel } from './shift-labels';

interface ShiftDayCardProps {
  shiftDay: ShiftDayResultData;
  onPress: (shiftDay: ShiftDayResultData) => void;
  testID?: string;
}

const ShiftDayCardComponent: React.FC<ShiftDayCardProps> = ({ shiftDay, onPress, testID }) => {
  const { t } = useTranslation();
  const { colorScheme } = useColorScheme();
  const mutedIconColor = colorScheme === 'dark' ? '#9ca3af' : '#6b7280';

  const handlePress = useCallback(() => {
    onPress(shiftDay);
  }, [onPress, shiftDay]);

  const myStatus = getMyStatusLabel(shiftDay.MyStatus);
  const date = formatShiftDate(shiftDay.ShiftDay || shiftDay.Start);
  const overnight = isOvernightShift(shiftDay.Start, shiftDay.End);
  const timeRange = `${formatShiftTime(shiftDay.Start)} – ${formatShiftTime(shiftDay.End)}${overnight ? ` ${t('shifts.overnight')}` : ''}`;
  const staffing = shiftDay.Filled ? t('shifts.status.filled') : t('shifts.status.open_slots', { count: shiftDay.OpenSlots });

  const accessibilityLabel = useMemo(() => {
    const parts = [shiftDay.ShiftName, date, timeRange, staffing];
    if (shiftDay.IsActive) parts.push(t('shifts.status.active_now'));
    if (myStatus) parts.push(t(myStatus.key));
    if (shiftDay.MyTradeId) parts.push(t('shifts.status.trade_requested'));
    return parts.join(', ');
  }, [shiftDay.ShiftName, shiftDay.IsActive, shiftDay.MyTradeId, date, timeRange, staffing, myStatus, t]);

  return (
    <Pressable
      onPress={handlePress}
      className="mb-3"
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={t('shifts.card_a11y_hint')}
      testID={testID ?? `shift-day-card-${shiftDay.ShiftDayId}`}
    >
      <Card className="border-l-4 bg-white p-4 shadow-xs dark:bg-gray-800" style={{ borderLeftColor: shiftDay.Color || '#3B82F6' }}>
        <VStack space="sm">
          <HStack className="items-start justify-between" space="sm">
            <VStack className="flex-1" space="xs">
              <Text className="text-base font-semibold text-gray-900 dark:text-white">{shiftDay.ShiftName}</Text>
              <Text className="text-sm text-gray-600 dark:text-gray-400">{date}</Text>
            </VStack>
            {shiftDay.IsActive ? (
              <Badge action="success" size="sm" testID="shift-day-active-badge">
                <BadgeText>{t('shifts.status.active_now')}</BadgeText>
              </Badge>
            ) : null}
          </HStack>

          <HStack space="sm" className="items-center">
            <Clock size={16} color={mutedIconColor} />
            <Text className="text-sm text-gray-700 dark:text-gray-300">{timeRange}</Text>
          </HStack>

          <HStack space="sm" className="items-center">
            <Users size={16} color={shiftDay.Filled ? '#059669' : '#d97706'} />
            <Text className={`text-sm ${shiftDay.Filled ? 'text-green-700 dark:text-green-400' : 'text-amber-700 dark:text-amber-400'}`}>{staffing}</Text>
          </HStack>

          <HStack space="xs" className="flex-wrap">
            {myStatus ? (
              <Badge action={myStatus.action} size="sm" className="mb-1 mr-1" testID="shift-day-my-status">
                <BadgeText>{t(myStatus.key)}</BadgeText>
              </Badge>
            ) : null}
            {shiftDay.MyTradeId ? (
              <Badge action="info" size="sm" className="mb-1 mr-1" testID="shift-day-trade-badge">
                <HStack space="xs" className="items-center">
                  <Repeat size={12} color="#2563eb" />
                  <BadgeText>{t('shifts.status.trade_requested')}</BadgeText>
                </HStack>
              </Badge>
            ) : null}
            <Badge action="muted" size="sm" className="mb-1 mr-1">
              <BadgeText>{t(getAssignmentTypeKey(shiftDay.ShiftType))}</BadgeText>
            </Badge>
            {shiftDay.RequireApproval ? (
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

export const ShiftDayCard = React.memo(ShiftDayCardComponent);
