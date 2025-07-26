import { endOfMonth, format, parseISO, startOfMonth } from 'date-fns';
import { Calendar, Clock, Info, Users } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { View } from '@/components/ui';
import { Badge } from '@/components/ui/badge';
import { BottomSheet, BottomSheetBackdrop, BottomSheetContent, BottomSheetHeader } from '@/components/ui/bottom-sheet';
import { Button, ButtonText } from '@/components/ui/button';
import { FlatList } from '@/components/ui/flat-list';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { useShiftsStore } from '@/stores/shifts/store';

import { ShiftCalendarView } from './shift-calendar-view';
import { ShiftDayCard } from './shift-day-card';

interface ShiftDetailsSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'info' | 'calendar';

export const ShiftDetailsSheet: React.FC<ShiftDetailsSheetProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabType>('info');

  const { selectedShift, shiftCalendarData, isShiftLoading, isCalendarLoading, fetchShiftDaysForDateRange, selectShiftDay } = useShiftsStore();

  useEffect(() => {
    if (isOpen && selectedShift && !shiftCalendarData[selectedShift.ShiftId]) {
      // Fetch current month's shift days
      const now = new Date();
      const startDate = format(startOfMonth(now), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(now), 'yyyy-MM-dd');
      fetchShiftDaysForDateRange(selectedShift.ShiftId, startDate, endDate);
    }
  }, [isOpen, selectedShift, shiftCalendarData, fetchShiftDaysForDateRange]);

  if (!selectedShift) return null;

  const formatNextDay = (nextDay: string) => {
    if (!nextDay) return t('shifts.no_shifts');
    try {
      return format(parseISO(nextDay), 'MMM dd, yyyy');
    } catch {
      return nextDay;
    }
  };

  const getScheduleTypeText = (scheduleType: number) => {
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
    switch (assignmentType) {
      case 0:
        return 'Optional';
      case 1:
        return 'Required';
      default:
        return 'Unknown';
    }
  };

  const renderTabButton = (tab: TabType, icon: any, title: string) => (
    <Button
      onPress={() => setActiveTab(tab)}
      variant={activeTab === tab ? 'solid' : 'outline'}
      className={`flex-1 ${activeTab === tab ? 'border-primary-600 bg-primary-600' : 'border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-800'}`}
    >
      <HStack className="items-center space-x-2">
        <Icon as={icon} size={16} className={activeTab === tab ? 'text-white' : 'text-gray-600 dark:text-gray-400'} />
        <ButtonText className={activeTab === tab ? 'font-semibold text-white' : 'text-gray-700 dark:text-gray-300'}>{title}</ButtonText>
      </HStack>
    </Button>
  );

  const renderShiftInfo = () => {
    if (isShiftLoading) {
      return (
        <View className="flex-1 items-center justify-center p-8">
          <Spinner size="large" />
          <Text className="mt-4 text-gray-600 dark:text-gray-400">{t('shifts.loading')}</Text>
        </View>
      );
    }

    return (
      <VStack className="space-y-6 p-4">
        {/* Header */}
        <VStack className="space-y-2">
          <Text className="text-2xl font-bold text-gray-900 dark:text-white">{selectedShift.Name}</Text>
          {selectedShift.Code && (
            <Text className="text-lg text-gray-600 dark:text-gray-400">
              {t('shifts.shift_code')}: {selectedShift.Code}
            </Text>
          )}
          {selectedShift.InShift && (
            <Badge className="self-start border-green-200 bg-green-100 dark:border-green-700 dark:bg-green-900">
              <Text className="text-sm font-medium text-green-800 dark:text-green-200">{t('shifts.in_shift')}</Text>
            </Badge>
          )}
        </VStack>

        {/* Stats */}
        <View className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
          <VStack className="space-y-3">
            <HStack className="justify-between">
              <HStack className="items-center space-x-2">
                <Icon as={Users} size={20} className="text-primary-600" />
                <Text className="text-base font-medium text-gray-900 dark:text-white">{t('shifts.personnel_count')}</Text>
              </HStack>
              <Text className="text-base font-semibold text-primary-600">{selectedShift.PersonnelCount}</Text>
            </HStack>

            <HStack className="justify-between">
              <HStack className="items-center space-x-2">
                <Icon as={Calendar} size={20} className="text-primary-600" />
                <Text className="text-base font-medium text-gray-900 dark:text-white">{t('shifts.groups')}</Text>
              </HStack>
              <Text className="text-base font-semibold text-primary-600">{selectedShift.GroupCount}</Text>
            </HStack>
          </VStack>
        </View>

        {/* Next Day */}
        {selectedShift.NextDay && (
          <View className="rounded-lg bg-blue-50 p-4 dark:bg-blue-900">
            <HStack className="items-center space-x-3">
              <Icon as={Clock} size={20} className="text-blue-600 dark:text-blue-400" />
              <VStack className="flex-1">
                <Text className="text-base font-medium text-blue-900 dark:text-blue-100">{t('shifts.next_day')}</Text>
                <Text className="text-sm text-blue-700 dark:text-blue-300">{formatNextDay(selectedShift.NextDay)}</Text>
              </VStack>
            </HStack>
          </View>
        )}

        {/* Type Badges */}
        <VStack className="space-y-3">
          <Text className="text-lg font-semibold text-gray-900 dark:text-white">{t('shifts.shift_type')}</Text>
          <HStack className="space-x-3">
            <Badge className="border-blue-200 bg-blue-50 dark:border-blue-700 dark:bg-blue-900">
              <Text className="text-sm text-blue-700 dark:text-blue-300">{getScheduleTypeText(selectedShift.ScheduleType)}</Text>
            </Badge>

            <Badge className="border-purple-200 bg-purple-50 dark:border-purple-700 dark:bg-purple-900">
              <Text className="text-sm text-purple-700 dark:text-purple-300">{getAssignmentTypeText(selectedShift.AssignmentType)}</Text>
            </Badge>
          </HStack>
        </VStack>

        {/* Recent Days */}
        {selectedShift.Days && selectedShift.Days.length > 0 && (
          <VStack className="space-y-3">
            <Text className="text-lg font-semibold text-gray-900 dark:text-white">Recent Shift Days</Text>
            <VStack className="space-y-2">
              {selectedShift.Days.slice(0, 3).map((day) => (
                <ShiftDayCard key={day.ShiftDayId} shiftDay={day} onPress={() => selectShiftDay(day)} />
              ))}
            </VStack>
          </VStack>
        )}
      </VStack>
    );
  };

  const renderCalendar = () => {
    return (
      <ShiftCalendarView
        shift={selectedShift}
        shiftDays={shiftCalendarData[selectedShift.ShiftId] || []}
        isLoading={isCalendarLoading}
        onShiftDayPress={selectShiftDay}
        onDateRangeChange={(startDate, endDate) => {
          fetchShiftDaysForDateRange(selectedShift.ShiftId, startDate, endDate);
        }}
      />
    );
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      <BottomSheetBackdrop onPress={onClose} />
      <BottomSheetContent className="h-[85%] bg-white dark:bg-gray-900">
        <BottomSheetHeader className="border-b border-gray-200 p-4 dark:border-gray-700">
          <Text className="text-center text-xl font-semibold text-gray-900 dark:text-white">{t('shifts.details')}</Text>
        </BottomSheetHeader>

        {/* Tab Navigation */}
        <View className="border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          <HStack className="space-x-2 px-4 py-3">
            {renderTabButton('info', Info, t('shifts.details'))}
            {renderTabButton('calendar', Calendar, t('shifts.calendar'))}
          </HStack>
        </View>

        {/* Content */}
        <View className="flex-1">{activeTab === 'info' ? renderShiftInfo() : renderCalendar()}</View>
      </BottomSheetContent>
    </BottomSheet>
  );
};
