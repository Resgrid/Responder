import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns';

import { View } from '@/components/ui';
import { Text } from '@/components/ui/text';
import { Badge } from '@/components/ui/badge';
import { Button, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { Spinner } from '@/components/ui/spinner';
import { BottomSheet, BottomSheetBackdrop, BottomSheetContent, BottomSheetHeader } from '@/components/ui/bottom-sheet';
import { FlatList } from '@/components/ui/flat-list';
import { Clock, Users, Calendar, Info } from 'lucide-react-native';
import { Icon } from '@/components/ui/icon';

import { useShiftsStore } from '@/stores/shifts/store';
import { ShiftDayCard } from './shift-day-card';
import { ShiftCalendarView } from './shift-calendar-view';

interface ShiftDetailsSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'info' | 'calendar';

export const ShiftDetailsSheet: React.FC<ShiftDetailsSheetProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabType>('info');

  const {
    selectedShift,
    shiftCalendarData,
    isShiftLoading,
    isCalendarLoading,
    fetchShiftDaysForDateRange,
    selectShiftDay,
  } = useShiftsStore();

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
      className={`flex-1 ${activeTab === tab
          ? 'bg-primary-600 border-primary-600'
          : 'bg-white border-gray-300 dark:bg-gray-800 dark:border-gray-600'
        }`}
    >
      <HStack className="items-center space-x-2">
        <Icon
          as={icon}
          size={16}
          className={
            activeTab === tab
              ? 'text-white'
              : 'text-gray-600 dark:text-gray-400'
          }
        />
        <ButtonText
          className={
            activeTab === tab
              ? 'text-white font-semibold'
              : 'text-gray-700 dark:text-gray-300'
          }
        >
          {title}
        </ButtonText>
      </HStack>
    </Button>
  );

  const renderShiftInfo = () => {
    if (isShiftLoading) {
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
      <VStack className="space-y-6 p-4">
        {/* Header */}
        <VStack className="space-y-2">
          <Text className="text-2xl font-bold text-gray-900 dark:text-white">
            {selectedShift.Name}
          </Text>
          {selectedShift.Code && (
            <Text className="text-lg text-gray-600 dark:text-gray-400">
              {t('shifts.shift_code')}: {selectedShift.Code}
            </Text>
          )}
          {selectedShift.InShift && (
            <Badge className="bg-green-100 dark:bg-green-900 border-green-200 dark:border-green-700 self-start">
              <Text className="text-green-800 dark:text-green-200 text-sm font-medium">
                {t('shifts.in_shift')}
              </Text>
            </Badge>
          )}
        </VStack>

        {/* Stats */}
        <View className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <VStack className="space-y-3">
            <HStack className="justify-between">
              <HStack className="items-center space-x-2">
                <Icon
                  as={Users}
                  size={20}
                  className="text-primary-600"
                />
                <Text className="text-base font-medium text-gray-900 dark:text-white">
                  {t('shifts.personnel_count')}
                </Text>
              </HStack>
              <Text className="text-base font-semibold text-primary-600">
                {selectedShift.PersonnelCount}
              </Text>
            </HStack>

            <HStack className="justify-between">
              <HStack className="items-center space-x-2">
                <Icon
                  as={Calendar}
                  size={20}
                  className="text-primary-600"
                />
                <Text className="text-base font-medium text-gray-900 dark:text-white">
                  {t('shifts.groups')}
                </Text>
              </HStack>
              <Text className="text-base font-semibold text-primary-600">
                {selectedShift.GroupCount}
              </Text>
            </HStack>
          </VStack>
        </View>

        {/* Next Day */}
        {selectedShift.NextDay && (
          <View className="bg-blue-50 dark:bg-blue-900 rounded-lg p-4">
            <HStack className="items-center space-x-3">
              <Icon
                as={Clock}
                size={20}
                className="text-blue-600 dark:text-blue-400"
              />
              <VStack className="flex-1">
                <Text className="text-base font-medium text-blue-900 dark:text-blue-100">
                  {t('shifts.next_day')}
                </Text>
                <Text className="text-sm text-blue-700 dark:text-blue-300">
                  {formatNextDay(selectedShift.NextDay)}
                </Text>
              </VStack>
            </HStack>
          </View>
        )}

        {/* Type Badges */}
        <VStack className="space-y-3">
          <Text className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('shifts.shift_type')}
          </Text>
          <HStack className="space-x-3">
            <Badge className="bg-blue-50 dark:bg-blue-900 border-blue-200 dark:border-blue-700">
              <Text className="text-blue-700 dark:text-blue-300 text-sm">
                {getScheduleTypeText(selectedShift.ScheduleType)}
              </Text>
            </Badge>

            <Badge className="bg-purple-50 dark:bg-purple-900 border-purple-200 dark:border-purple-700">
              <Text className="text-purple-700 dark:text-purple-300 text-sm">
                {getAssignmentTypeText(selectedShift.AssignmentType)}
              </Text>
            </Badge>
          </HStack>
        </VStack>

        {/* Recent Days */}
        {selectedShift.Days && selectedShift.Days.length > 0 && (
          <VStack className="space-y-3">
            <Text className="text-lg font-semibold text-gray-900 dark:text-white">
              Recent Shift Days
            </Text>
            <VStack className="space-y-2">
              {selectedShift.Days.slice(0, 3).map((day) => (
                <ShiftDayCard
                  key={day.ShiftDayId}
                  shiftDay={day}
                  onPress={() => selectShiftDay(day)}
                />
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
        <BottomSheetHeader className="p-4 border-b border-gray-200 dark:border-gray-700">
          <Text className="text-xl font-semibold text-gray-900 dark:text-white text-center">
            {t('shifts.details')}
          </Text>
        </BottomSheetHeader>

        {/* Tab Navigation */}
        <View className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <HStack className="px-4 py-3 space-x-2">
            {renderTabButton('info', Info, t('shifts.details'))}
            {renderTabButton('calendar', Calendar, t('shifts.calendar'))}
          </HStack>
        </View>

        {/* Content */}
        <View className="flex-1">
          {activeTab === 'info' ? renderShiftInfo() : renderCalendar()}
        </View>
      </BottomSheetContent>
    </BottomSheet>
  );
}; 