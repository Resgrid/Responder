import { CalendarDays, Clock, Users } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import React, { useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, useWindowDimensions } from 'react-native';

import { Badge, BadgeText } from '@/components/ui/badge';
import { CustomBottomSheet } from '@/components/ui/bottom-sheet';
import { Button, ButtonText } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { useAnalytics } from '@/hooks/use-analytics';
import { formatShiftDate, getDateKey, toDateParam } from '@/lib/shift-utils';
import { type ShiftDayResultData } from '@/models/v4/shifts/shiftDayResultData';
import { useShiftsStore } from '@/stores/shifts/store';

import { ShiftDayCard } from './shift-day-card';
import { getAssignmentTypeKey, getScheduleTypeKey } from './shift-labels';

interface ShiftDetailsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  /** Show this shift's days in the Calendar view. */
  onViewCalendar: (shiftId: string) => void;
}

const MAX_UPCOMING_DAYS = 7;

const ShiftDetailsSheetComponent: React.FC<ShiftDetailsSheetProps> = ({ isOpen, onClose, onViewCalendar }) => {
  const { t } = useTranslation();
  const { trackEvent } = useAnalytics();
  const { width, height } = useWindowDimensions();
  const { colorScheme } = useColorScheme();
  const iconColor = colorScheme === 'dark' ? '#60a5fa' : '#2563eb';

  const selectedShift = useShiftsStore((state) => state.selectedShift);
  const isShiftLoading = useShiftsStore((state) => state.isShiftLoading);
  const selectShiftDay = useShiftsStore((state) => state.selectShiftDay);

  const isLandscape = width > height;

  useEffect(() => {
    if (!isOpen || !selectedShift) return;
    try {
      trackEvent('shift_details_sheet_viewed', {
        timestamp: new Date().toISOString(),
        shiftId: selectedShift.ShiftId || '',
        shiftName: selectedShift.Name || '',
        isLandscape,
        colorScheme: colorScheme || 'light',
        personnelCount: selectedShift.PersonnelCount || 0,
        groupCount: selectedShift.GroupCount || 0,
        inShift: !!selectedShift.InShift,
        scheduleType: selectedShift.ScheduleType || 0,
        assignmentType: selectedShift.AssignmentType || 0,
      });
    } catch (error) {
      console.warn('Failed to track shift details sheet view analytics:', error);
    }
  }, [isOpen, selectedShift, trackEvent, isLandscape, colorScheme]);

  const handleClose = useCallback(() => {
    if (selectedShift) {
      try {
        trackEvent('shift_details_sheet_closed', {
          timestamp: new Date().toISOString(),
          shiftId: selectedShift.ShiftId || '',
        });
      } catch (error) {
        console.warn('Failed to track shift details sheet close analytics:', error);
      }
    }
    onClose();
  }, [selectedShift, trackEvent, onClose]);

  const handleViewCalendar = useCallback(() => {
    if (!selectedShift) return;
    trackEvent('shift_details_view_calendar', { timestamp: new Date().toISOString(), shiftId: selectedShift.ShiftId });
    onViewCalendar(selectedShift.ShiftId);
  }, [selectedShift, trackEvent, onViewCalendar]);

  const handleDayPress = useCallback(
    (day: ShiftDayResultData) => {
      selectShiftDay(day);
    },
    [selectShiftDay]
  );

  const upcomingDays = useMemo(() => {
    const todayKey = toDateParam(new Date());
    return (selectedShift?.Days ?? []).filter((day) => getDateKey(day.ShiftDay || day.Start) >= todayKey).slice(0, MAX_UPCOMING_DAYS);
  }, [selectedShift]);

  if (!selectedShift) return null;

  const hours = selectedShift.StartTime && selectedShift.EndTime ? `${selectedShift.StartTime} – ${selectedShift.EndTime}` : '';

  return (
    <CustomBottomSheet isOpen={isOpen} onClose={handleClose} isLoading={isShiftLoading} loadingText={t('shifts.loading_details')} testID="shift-details-sheet" snapPoints={[90]} minHeight="min-h-[600px]">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={true} contentContainerStyle={{ paddingBottom: 40, flexGrow: 1 }} testID="shift-details-scroll">
        <VStack space="lg" className="p-4">
          <VStack space="sm">
            <Text className="text-2xl font-bold text-gray-900 dark:text-white" accessibilityRole="header">
              {selectedShift.Name}
            </Text>
            {selectedShift.Code ? (
              <Text className="text-base text-gray-600 dark:text-gray-400">
                {t('shifts.shift_code')}: {selectedShift.Code}
              </Text>
            ) : null}
            <HStack space="xs" className="flex-wrap">
              {selectedShift.InShift ? (
                <Badge action="success" size="md" className="mb-1 mr-1">
                  <BadgeText>{t('shifts.in_shift')}</BadgeText>
                </Badge>
              ) : null}
              {selectedShift.RequireApproval ? (
                <Badge action="warning" size="md" className="mb-1 mr-1">
                  <BadgeText>{t('shifts.approval_required')}</BadgeText>
                </Badge>
              ) : null}
            </HStack>
          </VStack>

          <Card className="bg-gray-50 p-4 dark:bg-gray-800">
            <VStack space="md">
              {hours ? (
                <HStack className="items-center justify-between">
                  <HStack space="sm" className="items-center">
                    <Clock size={20} color={iconColor} />
                    <Text className="font-medium text-gray-900 dark:text-white">{t('shifts.hours')}</Text>
                  </HStack>
                  <Text className="font-semibold text-gray-900 dark:text-white">{hours}</Text>
                </HStack>
              ) : null}
              <HStack className="items-center justify-between">
                <HStack space="sm" className="items-center">
                  <Users size={20} color={iconColor} />
                  <Text className="font-medium text-gray-900 dark:text-white">{t('shifts.personnel_count')}</Text>
                </HStack>
                <Text className="font-semibold text-gray-900 dark:text-white">{selectedShift.PersonnelCount}</Text>
              </HStack>
              <HStack className="items-center justify-between">
                <HStack space="sm" className="items-center">
                  <CalendarDays size={20} color={iconColor} />
                  <Text className="font-medium text-gray-900 dark:text-white">{t('shifts.groups')}</Text>
                </HStack>
                <Text className="font-semibold text-gray-900 dark:text-white">{selectedShift.GroupCount}</Text>
              </HStack>
              {selectedShift.NextDay ? (
                <HStack className="items-center justify-between">
                  <Text className="font-medium text-gray-900 dark:text-white">{t('shifts.next_day')}</Text>
                  <Text className="text-gray-700 dark:text-gray-300">{formatShiftDate(selectedShift.NextDay)}</Text>
                </HStack>
              ) : null}
            </VStack>
          </Card>

          <VStack space="sm">
            <Text className="text-lg font-semibold text-gray-900 dark:text-white">{t('shifts.shift_type.label')}</Text>
            <HStack space="sm" className="flex-wrap">
              <Badge action="info" size="md" className="mb-1">
                <BadgeText>{t(getScheduleTypeKey(selectedShift.ScheduleType))}</BadgeText>
              </Badge>
              <Badge action="muted" size="md" className="mb-1">
                <BadgeText>{t(getAssignmentTypeKey(selectedShift.AssignmentType))}</BadgeText>
              </Badge>
            </HStack>
          </VStack>

          {(selectedShift.Groups ?? []).length > 0 ? (
            <VStack space="sm">
              <Text className="text-lg font-semibold text-gray-900 dark:text-white">{t('shifts.groups')}</Text>
              {selectedShift.Groups.map((group) => (
                <Card key={group.GroupId} className="bg-white p-3 dark:bg-gray-800">
                  <Text className="font-medium text-gray-900 dark:text-white">{group.GroupName}</Text>
                  {(group.Roles ?? []).length > 0 ? (
                    group.Roles.map((role) => (
                      <HStack key={role.RoleId} className="justify-between">
                        <Text className="text-sm text-gray-700 dark:text-gray-300">{role.RoleName}</Text>
                        <Text className="text-sm text-gray-700 dark:text-gray-300">{t('shifts.required_count', { count: role.Required })}</Text>
                      </HStack>
                    ))
                  ) : (
                    <Text className="text-sm text-gray-500 dark:text-gray-400">{t('shifts.day.no_role_requirements')}</Text>
                  )}
                </Card>
              ))}
            </VStack>
          ) : null}

          <Button onPress={handleViewCalendar} variant="outline" action="primary" accessibilityHint={t('shifts.view_calendar_hint')} testID="shift-details-view-calendar">
            <CalendarDays size={16} color={iconColor} />
            <ButtonText>{t('shifts.view_calendar')}</ButtonText>
          </Button>

          {upcomingDays.length > 0 ? (
            <VStack space="sm">
              <Text className="text-lg font-semibold text-gray-900 dark:text-white">{t('shifts.upcoming_shift_days')}</Text>
              {upcomingDays.map((day) => (
                <ShiftDayCard key={day.ShiftDayId} shiftDay={day} onPress={handleDayPress} />
              ))}
            </VStack>
          ) : null}
        </VStack>
      </ScrollView>
    </CustomBottomSheet>
  );
};

export const ShiftDetailsSheet = React.memo(ShiftDetailsSheetComponent);

ShiftDetailsSheet.displayName = 'ShiftDetailsSheet';
