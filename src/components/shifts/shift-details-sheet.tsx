import { endOfMonth, format, parseISO, startOfMonth } from 'date-fns';
import { Calendar, Clock, Info, Users } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView } from 'react-native';

import { Badge, BadgeText } from '@/components/ui/badge';
import { CustomBottomSheet } from '@/components/ui/bottom-sheet';
import { Box } from '@/components/ui/box';
import { Button, ButtonText } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { HStack } from '@/components/ui/hstack';
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

const ShiftDetailsSheetComponent: React.FC<ShiftDetailsSheetProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabType>('info');

  const { selectedShift, shiftCalendarData, isShiftLoading, isCalendarLoading, selectShiftDay } = useShiftsStore();

  const formatNextDay = useCallback(
    (nextDay: string) => {
      if (!nextDay) return t('shifts.no_shifts');
      try {
        return format(parseISO(nextDay), 'MMM dd, yyyy');
      } catch {
        return nextDay;
      }
    },
    [t]
  );

  const getScheduleTypeText = useCallback((scheduleType: number) => {
    switch (scheduleType) {
      case 0:
        return 'Manual';
      case 1:
        return 'Automatic';
      default:
        return 'Unknown';
    }
  }, []);

  const getAssignmentTypeText = useCallback((assignmentType: number) => {
    switch (assignmentType) {
      case 0:
        return 'Optional';
      case 1:
        return 'Required';
      default:
        return 'Unknown';
    }
  }, []);

  const renderTabButton = useCallback(
    (tab: TabType, icon: any, title: string) => (
      <Button onPress={() => setActiveTab(tab)} variant={activeTab === tab ? 'solid' : 'outline'} action={activeTab === tab ? 'primary' : 'secondary'} className="flex-1">
        <HStack space="xs" className="items-center">
          {React.createElement(icon, {
            size: 16,
            className: activeTab === tab ? 'text-white' : 'text-gray-600 dark:text-gray-400',
          })}
          <ButtonText className={activeTab === tab ? 'font-semibold text-white' : 'text-gray-700 dark:text-gray-300'}>{title}</ButtonText>
        </HStack>
      </Button>
    ),
    [activeTab]
  );

  const renderShiftInfo = useCallback(() => {
    if (isShiftLoading) {
      return (
        <Box className="flex-1 items-center justify-center p-8">
          <Spinner size="large" />
          <Text className="mt-4 text-gray-600 dark:text-gray-400">{t('shifts.loading')}</Text>
        </Box>
      );
    }

    return (
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
        <VStack space="lg" className="p-4">
          {/* Header */}
          <VStack space="sm">
            <Text size="2xl" className="font-bold text-gray-900 dark:text-white">
              {selectedShift?.Name}
            </Text>
            {selectedShift?.Code && (
              <Text size="lg" className="text-gray-600 dark:text-gray-400">
                {t('shifts.shift_code')}: {selectedShift.Code}
              </Text>
            )}
            {selectedShift?.InShift && (
              <Badge action="success" size="md" className="self-start">
                <BadgeText>{t('shifts.in_shift')}</BadgeText>
              </Badge>
            )}
          </VStack>

          {/* Stats */}
          <Card size="md" variant="elevated" className="bg-gray-50 dark:bg-gray-800">
            <VStack space="md" className="p-4">
              <HStack className="justify-between">
                <HStack space="sm" className="items-center">
                  <Users size={20} className="text-primary-600" />
                  <Text size="md" className="font-medium text-gray-900 dark:text-white">
                    {t('shifts.personnel_count')}
                  </Text>
                </HStack>
                <Text size="md" className="font-semibold text-primary-600">
                  {selectedShift?.PersonnelCount}
                </Text>
              </HStack>

              <HStack className="justify-between">
                <HStack space="sm" className="items-center">
                  <Calendar size={20} className="text-primary-600" />
                  <Text size="md" className="font-medium text-gray-900 dark:text-white">
                    {t('shifts.groups')}
                  </Text>
                </HStack>
                <Text size="md" className="font-semibold text-primary-600">
                  {selectedShift?.GroupCount}
                </Text>
              </HStack>
            </VStack>
          </Card>

          {/* Next Day */}
          {selectedShift?.NextDay && (
            <Card size="md" variant="elevated" className="bg-blue-50 dark:bg-blue-900">
              <HStack space="md" className="items-center p-4">
                <Clock size={20} className="text-blue-600 dark:text-blue-400" />
                <VStack className="flex-1">
                  <Text size="md" className="font-medium text-blue-900 dark:text-blue-100">
                    {t('shifts.next_day')}
                  </Text>
                  <Text size="sm" className="text-blue-700 dark:text-blue-300">
                    {formatNextDay(selectedShift.NextDay)}
                  </Text>
                </VStack>
              </HStack>
            </Card>
          )}

          {/* Type Badges */}
          <VStack space="md">
            <Text size="lg" className="font-semibold text-gray-900 dark:text-white">
              {t('shifts.shift_type')}
            </Text>
            <HStack space="sm">
              <Badge action="info" size="md">
                <BadgeText>{getScheduleTypeText(selectedShift?.ScheduleType || 0)}</BadgeText>
              </Badge>

              <Badge action="muted" size="md">
                <BadgeText>{getAssignmentTypeText(selectedShift?.AssignmentType || 0)}</BadgeText>
              </Badge>
            </HStack>
          </VStack>

          {/* Recent Days */}
          {selectedShift?.Days && selectedShift.Days.length > 0 && (
            <VStack space="md">
              <Text size="lg" className="font-semibold text-gray-900 dark:text-white">
                Recent Shift Days
              </Text>
              <VStack space="sm">
                {selectedShift.Days.slice(0, 7).map((day) => (
                  <ShiftDayCard key={day.ShiftDayId} shiftDay={day} onPress={() => selectShiftDay(day)} />
                ))}
              </VStack>
            </VStack>
          )}
        </VStack>
      </ScrollView>
    );
  }, [isShiftLoading, selectedShift, t, formatNextDay, getScheduleTypeText, getAssignmentTypeText, selectShiftDay]);

  const renderCalendar = useCallback(() => {
    if (!selectedShift) return null;
    return (
      <ShiftCalendarView
        shift={selectedShift}
        shiftDays={shiftCalendarData[selectedShift.ShiftId] || []}
        isLoading={isCalendarLoading}
        onShiftDayPress={selectShiftDay}
        onDateRangeChange={(startDate, endDate) => {
          // TODO: Implement when fetchShiftDaysForDateRange is available
          // fetchShiftDaysForDateRange(selectedShift.ShiftId, startDate, endDate);
        }}
      />
    );
  }, [selectedShift, shiftCalendarData, isCalendarLoading, selectShiftDay]);

  useEffect(() => {
    // Note: fetchShiftDaysForDateRange is not implemented yet
    // This useEffect is currently a placeholder for future calendar data fetching
    if (isOpen && selectedShift && !shiftCalendarData[selectedShift.ShiftId]) {
      // TODO: Implement calendar data fetching when needed
      // const now = new Date();
      // const startDate = format(startOfMonth(now), 'yyyy-MM-dd');
      // const endDate = format(endOfMonth(now), 'yyyy-MM-dd');
      // fetchShiftDaysForDateRange(selectedShift.ShiftId, startDate, endDate);
    }
  }, [isOpen, selectedShift, shiftCalendarData]);

  if (!selectedShift) return null;

  return (
    <CustomBottomSheet isOpen={isOpen} onClose={onClose} testID="shift-details-sheet" snapPoints={[80]} minHeight="min-h-[600px]">
      <VStack space="md" className="h-full">
        {/* Header */}
        <Box className="border-b border-gray-200 pb-4 dark:border-gray-700">
          <Text size="xl" className="text-center font-semibold text-gray-900 dark:text-white">
            {t('shifts.details')}
          </Text>
        </Box>

        {/* Tab Navigation */}
        <Box className="border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          <HStack space="sm" className="px-4 py-3">
            {renderTabButton('info', Info, t('shifts.details'))}
            {renderTabButton('calendar', Calendar, t('shifts.calendar'))}
          </HStack>
        </Box>

        {/* Content */}
        <Box className="flex-1">{activeTab === 'info' ? renderShiftInfo() : renderCalendar()}</Box>
      </VStack>
    </CustomBottomSheet>
  );
};

export const ShiftDetailsSheet = React.memo(ShiftDetailsSheetComponent);

ShiftDetailsSheet.displayName = 'ShiftDetailsSheet';
