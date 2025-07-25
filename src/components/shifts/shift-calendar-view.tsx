import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Pressable } from 'react-native';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO, addMonths, subMonths } from 'date-fns';

import { View } from '@/components/ui';
import { Text } from '@/components/ui/text';
import { Button, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { Spinner } from '@/components/ui/spinner';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { Icon } from '@/components/ui/icon';

import { type ShiftResultData } from '@/models/v4/shifts/shiftResultData';
import { type ShiftDaysResultData } from '@/models/v4/shifts/shiftDayResultData';

interface ShiftCalendarViewProps {
  shift: ShiftResultData;
  shiftDays: ShiftDaysResultData[];
  isLoading: boolean;
  onShiftDayPress: (shiftDay: ShiftDaysResultData) => void;
  onDateRangeChange: (startDate: string, endDate: string) => void;
}

export const ShiftCalendarView: React.FC<ShiftCalendarViewProps> = ({
  shift,
  shiftDays,
  isLoading,
  onShiftDayPress,
  onDateRangeChange,
}) => {
  const { t } = useTranslation();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const daysInMonth = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    return eachDayOfInterval({ start: monthStart, end: monthEnd });
  }, [currentMonth]);

  const shiftDaysByDate = useMemo(() => {
    const dayMap = new Map<string, ShiftDaysResultData[]>();

    shiftDays.forEach((shiftDay) => {
      if (shiftDay.ShiftDay) {
        try {
          const dayKey = format(parseISO(shiftDay.ShiftDay), 'yyyy-MM-dd');
          const existing = dayMap.get(dayKey) || [];
          dayMap.set(dayKey, [...existing, shiftDay]);
        } catch (error) {
          // Handle invalid date format
          console.warn('Invalid shift day date:', shiftDay.ShiftDay);
        }
      }
    });

    return dayMap;
  }, [shiftDays]);

  const handlePreviousMonth = () => {
    const newMonth = subMonths(currentMonth, 1);
    setCurrentMonth(newMonth);

    const startDate = format(startOfMonth(newMonth), 'yyyy-MM-dd');
    const endDate = format(endOfMonth(newMonth), 'yyyy-MM-dd');
    onDateRangeChange(startDate, endDate);
  };

  const handleNextMonth = () => {
    const newMonth = addMonths(currentMonth, 1);
    setCurrentMonth(newMonth);

    const startDate = format(startOfMonth(newMonth), 'yyyy-MM-dd');
    const endDate = format(endOfMonth(newMonth), 'yyyy-MM-dd');
    onDateRangeChange(startDate, endDate);
  };

  const getDayStatus = (date: Date) => {
    const dayKey = format(date, 'yyyy-MM-dd');
    const dayShifts = shiftDaysByDate.get(dayKey) || [];

    if (dayShifts.length === 0) return null;

    const hasSignedUp = dayShifts.some(s => s.SignedUp);
    const totalSignups = dayShifts.reduce((sum, s) => sum + (s.Signups?.length || 0), 0);
    const totalNeeds = dayShifts.reduce((sum, s) => {
      return sum + (s.Needs?.reduce((needSum, group) => {
        return needSum + (group.GroupNeeds?.reduce((roleSum, role) => {
          return roleSum + (role.Needed || 0);
        }, 0) || 0);
      }, 0) || 0);
    }, 0);

    return {
      hasShifts: true,
      hasSignedUp,
      signupPercentage: totalNeeds > 0 ? (totalSignups / totalNeeds) * 100 : 0,
      shifts: dayShifts,
    };
  };

  const renderDayItem = (date: Date) => {
    const dayStatus = getDayStatus(date);
    const isToday = isSameDay(date, new Date());
    const dayNumber = format(date, 'd');

    let containerClasses = 'w-full h-16 justify-center items-center border border-gray-200 dark:border-gray-700';
    let textClasses = 'text-sm font-medium';

    if (isToday) {
      containerClasses += ' bg-primary-50 dark:bg-primary-900 border-primary-300 dark:border-primary-600';
      textClasses += ' text-primary-700 dark:text-primary-300';
    } else {
      containerClasses += ' bg-white dark:bg-gray-800';
      textClasses += ' text-gray-900 dark:text-white';
    }

    if (dayStatus?.hasShifts) {
      containerClasses += ' border-l-4';
      if (dayStatus.hasSignedUp) {
        containerClasses += ' border-l-green-500';
      } else {
        containerClasses += ' border-l-orange-500';
      }
    }

    const handleDayPress = () => {
      if (dayStatus?.shifts && dayStatus.shifts.length > 0) {
        // If there's only one shift, navigate directly to it
        if (dayStatus.shifts.length === 1) {
          onShiftDayPress(dayStatus.shifts[0]);
        } else {
          // For multiple shifts, navigate to the first one
          // Could be enhanced to show a picker
          onShiftDayPress(dayStatus.shifts[0]);
        }
      }
    };

    return (
      <Pressable
        key={format(date, 'yyyy-MM-dd')}
        onPress={handleDayPress}
        disabled={!dayStatus?.hasShifts}
        className={containerClasses}
      >
        <VStack className="items-center space-y-1">
          <Text className={textClasses}>
            {dayNumber}
          </Text>

          {dayStatus?.hasShifts && (
            <View className="flex-row space-x-1">
              {dayStatus.hasSignedUp && (
                <View className="w-2 h-2 bg-green-500 rounded-full" />
              )}
              <View className="w-2 h-2 bg-orange-500 rounded-full" />
            </View>
          )}
        </VStack>
      </Pressable>
    );
  };

  const renderCalendarGrid = () => {
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
      <VStack className="space-y-1">
        {/* Days of Week Header */}
        <HStack className="space-x-1">
          {daysOfWeek.map((day) => (
            <View key={day} className="flex-1 py-2 items-center">
              <Text className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                {day}
              </Text>
            </View>
          ))}
        </HStack>

        {/* Calendar Days */}
        <View style={styles.calendarGrid}>
          {daysInMonth.map((date) => renderDayItem(date))}
        </View>
      </VStack>
    );
  };

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center p-8">
        <Spinner size="large" />
        <Text className="mt-4 text-gray-600 dark:text-gray-400">
          {t('shifts.loading')}
        </Text>
      </View>
    );
  }

  return (
    <VStack className="flex-1 p-4 space-y-4">
      {/* Month Navigation */}
      <HStack className="justify-between items-center">
        <Button
          onPress={handlePreviousMonth}
          variant="outline"
          size="sm"
          className="bg-white dark:bg-gray-800"
        >
          <Icon
            as={ChevronLeft}
            size={16}
            className="text-gray-600 dark:text-gray-400"
          />
        </Button>

        <Text className="text-lg font-semibold text-gray-900 dark:text-white">
          {format(currentMonth, 'MMMM yyyy')}
        </Text>

        <Button
          onPress={handleNextMonth}
          variant="outline"
          size="sm"
          className="bg-white dark:bg-gray-800"
        >
          <Icon
            as={ChevronRight}
            size={16}
            className="text-gray-600 dark:text-gray-400"
          />
        </Button>
      </HStack>

      {/* Calendar */}
      {renderCalendarGrid()}

      {/* Legend */}
      <VStack className="space-y-2 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
        <Text className="text-sm font-medium text-gray-900 dark:text-white">
          Legend
        </Text>
        <HStack className="space-x-4">
          <HStack className="items-center space-x-2">
            <View className="w-3 h-3 bg-green-500 rounded-full" />
            <Text className="text-xs text-gray-600 dark:text-gray-400">
              {t('shifts.signed_up')}
            </Text>
          </HStack>

          <HStack className="items-center space-x-2">
            <View className="w-3 h-3 bg-orange-500 rounded-full" />
            <Text className="text-xs text-gray-600 dark:text-gray-400">
              Available
            </Text>
          </HStack>
        </HStack>
      </VStack>
    </VStack>
  );
};

const styles = StyleSheet.create({
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 1,
  },
}); 