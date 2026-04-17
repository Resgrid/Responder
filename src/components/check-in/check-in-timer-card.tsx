import { Timer } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { getCheckInTitle } from '@/components/check-in/check-in-target';
import { Box } from '@/components/ui/box';
import { Button, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { useCheckInTimer } from '@/hooks/use-check-in-timer';
import { type CheckInTimerStatusResultData } from '@/models/v4/checkIn/checkInTimerStatusResultData';

interface CheckInTimerCardProps {
  status: CheckInTimerStatusResultData;
  resolvedTargetName?: string;
  onCheckIn: (targetType: number, unitId?: number, targetName?: string) => void;
  isCurrentUser: boolean;
}

export const CheckInTimerCard: React.FC<CheckInTimerCardProps> = React.memo(({ status, resolvedTargetName, onCheckIn, isCurrentUser }) => {
  const { t } = useTranslation();
  const { colorScheme } = useColorScheme();
  const { progressPercent, formattedTime, statusColor, isOverdue, isWarning } = useCheckInTimer({
    elapsedMinutes: status.ElapsedMinutes,
    durationMinutes: status.DurationMinutes,
    warningThresholdMinutes: status.WarningThresholdMinutes,
    status: status.Status,
  });

  const handleCheckIn = () => {
    onCheckIn(status.TargetType, status.UnitId ?? undefined, resolvedTitle || undefined);
  };

  const resolvedTitle = getCheckInTitle(status, resolvedTargetName);
  const checkInTitle = resolvedTitle || t('check_in.unknown_unit');
  const lastCheckInText = status.LastCheckIn ? t('check_in.minutes_ago', { count: status.ElapsedMinutes }) : t('check_in.status_ok');

  const bgColor = colorScheme === 'dark' ? 'bg-neutral-800' : 'bg-white';
  const borderStyle = isOverdue ? { borderLeftColor: '#EF4444', borderLeftWidth: 4 } : isWarning ? { borderLeftColor: '#F59E0B', borderLeftWidth: 4 } : { borderLeftColor: '#22C55E', borderLeftWidth: 4 };

  return (
    <Box className={`mb-3 rounded-xl p-4 shadow-sm ${bgColor}`} style={borderStyle}>
      <VStack space="sm">
        <HStack className="items-center justify-between">
          <HStack className="flex-1 items-center" space="sm">
            <Timer size={18} color={statusColor} />
            <VStack className="flex-1">
              <Text className="font-semibold">{checkInTitle}</Text>
              <Text className="text-xs text-gray-500">{status.TargetTypeName}</Text>
            </VStack>
          </HStack>
          <Text className="text-sm font-bold" style={{ color: statusColor }}>
            {formattedTime}
          </Text>
        </HStack>

        <HStack className="items-center justify-between">
          <Text className="text-xs text-gray-500">
            {t('check_in.last_check_in')}: {lastCheckInText}
          </Text>
          <Text className="text-xs text-gray-500">{t('check_in.progress', { elapsed: status.ElapsedMinutes, total: status.DurationMinutes })}</Text>
        </HStack>

        {/* Progress bar */}
        <View style={styles.progressBarContainer}>
          <View
            style={[
              styles.progressBar,
              {
                width: `${Math.min(progressPercent, 100)}%`,
                backgroundColor: statusColor,
              },
            ]}
          />
        </View>

        {isCurrentUser ? (
          <Button size="sm" variant="solid" onPress={handleCheckIn} className="self-end" testID="check-in-button">
            <ButtonText>{t('check_in.perform_check_in')}</ButtonText>
          </Button>
        ) : null}
      </VStack>
    </Box>
  );
});

CheckInTimerCard.displayName = 'CheckInTimerCard';

const styles = StyleSheet.create({
  progressBarContainer: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E5E7EB',
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
});
