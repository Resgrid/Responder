import { format, parseISO } from 'date-fns';
import { AlertCircle, CheckCircle, Clock, Users } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { HStack } from '@/components/ui/hstack';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
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
    switch (shiftType) {
      case 0:
        return t('shifts.shift_type.regular');
      case 1:
        return t('shifts.shift_type.emergency');
      case 2:
        return t('shifts.shift_type.training');
      default:
        return t('shifts.shift_type.unknown');
    }
  };

  const getProgressPercentage = () => {
    const totalNeeds = getTotalNeeds();
    const totalSignups = getTotalSignups();
    return totalNeeds > 0 ? Math.min((totalSignups / totalNeeds) * 100, 100) : 0;
  };

  return (
    <Pressable onPress={onPress} className="mb-3">
      <Card size="md" variant="elevated" className="bg-background-0 shadow-sm">
        <View className="p-4">
          <VStack space="sm">
            {/* Header */}
            <HStack className="items-start justify-between" space="md">
              <VStack className="flex-1" space="xs">
                <Text size="lg" bold className="text-typography-900">
                  {shiftDay.ShiftName}
                </Text>
                <Text size="sm" className="text-typography-600">
                  {formatDate(shiftDay.ShiftDay)}
                </Text>
              </VStack>

              {shiftDay.SignedUp ? (
                <Badge size="md" variant="solid" action="success" className="flex-row items-center">
                  <HStack space="xs" className="items-center">
                    <CheckCircle size={12} color="#059669" />
                    <Text size="xs" bold className="text-success-800">
                      {t('shifts.signed_up')}
                    </Text>
                  </HStack>
                </Badge>
              ) : (
                <Badge size="md" variant="solid" action="warning" className="flex-row items-center">
                  <HStack space="xs" className="items-center">
                    <AlertCircle size={12} color="#D97706" />
                    <Text size="xs" bold className="text-warning-800">
                      {t('shifts.signup')}
                    </Text>
                  </HStack>
                </Badge>
              )}
            </HStack>

            {/* Time Range */}
            <HStack space="sm" className="items-center">
              <Clock size={16} color="#6B7280" />
              <Text size="sm" className="text-typography-600">
                {formatTime(shiftDay.Start)} - {formatTime(shiftDay.End)}
              </Text>
            </HStack>

            {/* Stats Row */}
            <HStack className="items-center justify-between">
              <HStack space="xs" className="items-center">
                <Users size={16} color="#3B82F6" />
                <Text size="sm" className="text-typography-600">
                  {getTotalSignups()}/{getTotalNeeds()} {t('shifts.signups')}
                </Text>
              </HStack>

              <Badge size="sm" variant="outline" action="muted">
                <Text size="xs" className="text-typography-700">
                  {getShiftTypeText(shiftDay.ShiftType)}
                </Text>
              </Badge>
            </HStack>

            {/* Progress Bar */}
            <View className="h-2 w-full rounded-full bg-background-200">
              <View
                className="h-2 rounded-full bg-primary-600"
                style={{
                  width: `${getProgressPercentage()}%`,
                }}
                testID="progress-bar"
              />
            </View>
          </VStack>
        </View>
      </Card>
    </Pressable>
  );
};
