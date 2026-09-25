import { addMonths, eachDayOfInterval, endOfMonth, format, getDay, isSameDay, startOfMonth, subMonths } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';

import { View } from '@/components/ui';
import { HStack } from '@/components/ui/hstack';
import { Pressable } from '@/components/ui/pressable';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { formatShiftLongDate, getDateKey } from '@/lib/shift-utils';
import { type ShiftDayResultData } from '@/models/v4/shifts/shiftDayResultData';
import { ShiftDayMyStatus } from '@/models/v4/shifts/shiftEnums';

interface ShiftCalendarViewProps {
  month: Date;
  days: ShiftDayResultData[];
  selectedDate: string | null;
  isLoading: boolean;
  onMonthChange: (month: Date) => void;
  onSelectDate: (date: string) => void;
}

interface DaySummary {
  count: number;
  openSlots: number;
  hasMine: boolean;
  allFilled: boolean;
}

const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

export const summarizeShiftDaysByDate = (days: ShiftDayResultData[]): Map<string, DaySummary> => {
  const map = new Map<string, DaySummary>();
  days.forEach((day) => {
    const key = getDateKey(day.ShiftDay || day.Start);
    if (!key) return;
    const summary = map.get(key) ?? { count: 0, openSlots: 0, hasMine: false, allFilled: true };
    summary.count += 1;
    summary.openSlots += day.Filled ? 0 : Math.max(0, day.OpenSlots || 0);
    summary.hasMine = summary.hasMine || day.MyStatus === ShiftDayMyStatus.OnRoster || day.MyStatus === ShiftDayMyStatus.PendingApproval;
    summary.allFilled = summary.allFilled && day.Filled;
    map.set(key, summary);
  });
  return map;
};

interface CalendarDayCellProps {
  date: Date;
  dateKey: string;
  summary: DaySummary | undefined;
  isSelected: boolean;
  isToday: boolean;
  onSelect: (date: string) => void;
}

const CalendarDayCell: React.FC<CalendarDayCellProps> = React.memo(({ date, dateKey, summary, isSelected, isToday, onSelect }) => {
  const { t } = useTranslation();

  const handlePress = useCallback(() => {
    onSelect(dateKey);
  }, [dateKey, onSelect]);

  const containerClass = isSelected ? 'bg-primary-600' : isToday ? 'bg-primary-50 dark:bg-primary-900/40' : 'bg-white dark:bg-gray-800';
  const textClass = isSelected ? 'text-white' : isToday ? 'text-primary-700 dark:text-primary-300' : 'text-gray-900 dark:text-white';

  return (
    <View style={styles.cell}>
      <Pressable
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityState={{ selected: isSelected }}
        accessibilityLabel={t('shifts.calendar_view.day_a11y', { date: formatShiftLongDate(dateKey), count: summary?.count ?? 0, open: summary?.openSlots ?? 0 })}
        testID={`shift-calendar-day-${dateKey}`}
        className={`m-0.5 flex-1 items-center justify-center rounded-md ${containerClass}`}
      >
        <Text className={`text-sm font-medium ${textClass}`}>{format(date, 'd')}</Text>
        {summary ? (
          <HStack space="xs" className="mt-1">
            {summary.hasMine ? <View className="size-1.5 rounded-full bg-green-500" testID={`shift-calendar-mine-${dateKey}`} /> : null}
            {summary.openSlots > 0 ? <View className="size-1.5 rounded-full bg-amber-500" testID={`shift-calendar-open-${dateKey}`} /> : null}
            {summary.allFilled ? <View className="size-1.5 rounded-full bg-gray-400" /> : null}
          </HStack>
        ) : null}
      </Pressable>
    </View>
  );
});

CalendarDayCell.displayName = 'CalendarDayCell';

export const ShiftCalendarView: React.FC<ShiftCalendarViewProps> = ({ month, days, selectedDate, isLoading, onMonthChange, onSelectDate }) => {
  const { t, i18n } = useTranslation();
  const { colorScheme } = useColorScheme();
  const arrowColor = colorScheme === 'dark' ? '#d1d5db' : '#374151';

  const monthDays = useMemo(() => eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) }), [month]);
  const leadingBlanks = useMemo(() => getDay(startOfMonth(month)), [month]);
  const summaries = useMemo(() => summarizeShiftDaysByDate(days), [days]);

  const monthLabel = useMemo(() => {
    try {
      return month.toLocaleDateString(i18n?.language || undefined, { month: 'long', year: 'numeric' });
    } catch {
      return format(month, 'MMMM yyyy');
    }
  }, [month, i18n?.language]);

  const handlePrevious = useCallback(() => {
    onMonthChange(subMonths(month, 1));
  }, [month, onMonthChange]);

  const handleNext = useCallback(() => {
    onMonthChange(addMonths(month, 1));
  }, [month, onMonthChange]);

  const today = new Date();

  return (
    <VStack space="sm" className="px-4 pb-2" testID="shift-calendar-view">
      <HStack className="items-center justify-between">
        <Pressable onPress={handlePrevious} accessibilityRole="button" accessibilityLabel={t('shifts.calendar_view.previous_month')} testID="shift-calendar-previous" className="rounded-md p-2">
          <ChevronLeft size={20} color={arrowColor} />
        </Pressable>
        <HStack space="sm" className="items-center">
          <Text className="text-lg font-semibold text-gray-900 dark:text-white" accessibilityRole="header">
            {monthLabel}
          </Text>
          {isLoading ? <Spinner size="small" testID="shift-calendar-loading" /> : null}
        </HStack>
        <Pressable onPress={handleNext} accessibilityRole="button" accessibilityLabel={t('shifts.calendar_view.next_month')} testID="shift-calendar-next" className="rounded-md p-2">
          <ChevronRight size={20} color={arrowColor} />
        </Pressable>
      </HStack>

      <View style={styles.grid}>
        {WEEKDAY_KEYS.map((key) => (
          <View key={key} style={styles.headerCell}>
            <Text className="text-xs font-semibold text-gray-500 dark:text-gray-400">{t(`calendar.daysOfWeek.${key}`)}</Text>
          </View>
        ))}
        {Array.from({ length: leadingBlanks }, (_, index) => (
          <View key={`blank-${index}`} style={styles.cell} />
        ))}
        {monthDays.map((date) => {
          const dateKey = format(date, 'yyyy-MM-dd');
          return <CalendarDayCell key={dateKey} date={date} dateKey={dateKey} summary={summaries.get(dateKey)} isSelected={selectedDate === dateKey} isToday={isSameDay(date, today)} onSelect={onSelectDate} />;
        })}
      </View>

      <HStack space="md" className="flex-wrap justify-center">
        <HStack space="xs" className="items-center">
          <View className="size-2 rounded-full bg-green-500" />
          <Text className="text-xs text-gray-600 dark:text-gray-400">{t('shifts.calendar_view.legend_mine')}</Text>
        </HStack>
        <HStack space="xs" className="items-center">
          <View className="size-2 rounded-full bg-amber-500" />
          <Text className="text-xs text-gray-600 dark:text-gray-400">{t('shifts.calendar_view.legend_open')}</Text>
        </HStack>
        <HStack space="xs" className="items-center">
          <View className="size-2 rounded-full bg-gray-400" />
          <Text className="text-xs text-gray-600 dark:text-gray-400">{t('shifts.calendar_view.legend_filled')}</Text>
        </HStack>
      </HStack>
    </VStack>
  );
};

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  headerCell: {
    width: `${100 / 7}%`,
    alignItems: 'center',
    paddingVertical: 4,
  },
  cell: {
    width: `${100 / 7}%`,
    height: 52,
  },
});
