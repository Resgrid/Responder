import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useColorScheme } from 'react-native';
import { Calendar, type CalendarProps, type DateData } from 'react-native-calendars';

import { View } from '@/components/ui';
import { Button, ButtonText } from '@/components/ui/button';
import { Heading } from '@/components/ui/heading';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { formatLocalDateString, getTodayLocalString, isSameDate } from '@/lib/utils';
import { type CalendarItemResultData } from '@/models/v4/calendar/calendarItemResultData';
import { useCalendarStore } from '@/stores/calendar/store';

interface EnhancedCalendarViewProps {
  onDayPress?: (date: DateData) => void;
  onMonthChange?: (startDate: string, endDate: string) => void;
  testID?: string;
}

export const EnhancedCalendarView: React.FC<EnhancedCalendarViewProps> = ({ onDayPress, onMonthChange, testID = 'enhanced-calendar-view' }) => {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const { selectedDate, selectedMonthItems, setSelectedDate, loadCalendarItemsForDateRange, isLoading } = useCalendarStore();

  const [currentMonth, setCurrentMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM format

  // Generate marked dates from calendar items
  const markedDates = useMemo(() => {
    const marked: Record<string, any> = {};

    // Mark dates that have events
    selectedMonthItems.forEach((item: CalendarItemResultData) => {
      // Parse full ISO string and format as local YYYY-MM-DD to avoid timezone drift
      const startDateObj = new Date(item.Start);
      const endDateObj = new Date(item.End);
      const startDate = formatLocalDateString(startDateObj);
      const endDate = formatLocalDateString(endDateObj);

      // Mark start date
      if (!marked[startDate]) {
        marked[startDate] = {
          marked: true,
          dots: [],
        };
      }

      // Add a dot for this event (different colors based on event type)
      marked[startDate].dots.push({
        key: item.CalendarItemId,
        color: item.TypeColor || '#3B82F6', // Use event type color or default blue
      });

      // If it's a multi-day event, mark the range
      if (startDate !== endDate) {
        // Use local Date constructors to avoid timezone issues
        const start = new Date(startDateObj.getFullYear(), startDateObj.getMonth(), startDateObj.getDate());
        const end = new Date(endDateObj.getFullYear(), endDateObj.getMonth(), endDateObj.getDate());
        const current = new Date(start);

        while (current <= end) {
          const dateStr = formatLocalDateString(current);
          if (!marked[dateStr]) {
            marked[dateStr] = {
              marked: true,
              dots: [],
            };
          }

          // Add period marking for multi-day events
          if (dateStr === startDate) {
            marked[dateStr].startingDay = true;
            marked[dateStr].color = item.TypeColor || '#3B82F6';
          } else if (dateStr === endDate) {
            marked[dateStr].endingDay = true;
            marked[dateStr].color = item.TypeColor || '#3B82F6';
          } else {
            marked[dateStr].color = item.TypeColor || '#3B82F6';
          }

          current.setDate(current.getDate() + 1);
        }
      }
    });

    // Mark selected date
    if (selectedDate) {
      if (!marked[selectedDate]) {
        marked[selectedDate] = {};
      }
      marked[selectedDate].selected = true;
      marked[selectedDate].selectedColor = '#3B82F6';
    }

    return marked;
  }, [selectedMonthItems, selectedDate]);

  const handleDayPress = (day: DateData) => {
    setSelectedDate(day.dateString);
    onDayPress?.(day);
  };

  const handleMonthChange = (month: DateData) => {
    const monthStr = `${month.year}-${month.month.toString().padStart(2, '0')}`;
    setCurrentMonth(monthStr);

    // Calculate start and end dates for the month using local Date constructors
    const startDate = formatLocalDateString(new Date(month.year, month.month - 1, 1));
    const endDate = formatLocalDateString(new Date(month.year, month.month, 0));

    // Load calendar items for the new month
    loadCalendarItemsForDateRange(startDate, endDate);

    onMonthChange?.(startDate, endDate);
  };

  const goToToday = () => {
    const todayStr = getTodayLocalString();
    setSelectedDate(todayStr);
    setCurrentMonth(todayStr.slice(0, 7));
  };

  // Load current month data on component mount
  useEffect(() => {
    const now = new Date();
    const startDate = formatLocalDateString(new Date(now.getFullYear(), now.getMonth(), 1));
    const endDate = formatLocalDateString(new Date(now.getFullYear(), now.getMonth() + 1, 0));
    loadCalendarItemsForDateRange(startDate, endDate);
  }, [loadCalendarItemsForDateRange]);

  const calendarTheme: CalendarProps['theme'] = {
    backgroundColor: isDark ? '#111827' : '#ffffff',
    calendarBackground: isDark ? '#111827' : '#ffffff',
    textSectionTitleColor: isDark ? '#9CA3AF' : '#6B7280',
    textSectionTitleDisabledColor: isDark ? '#4B5563' : '#D1D5DB',
    selectedDayBackgroundColor: '#3B82F6',
    selectedDayTextColor: '#ffffff',
    todayTextColor: '#3B82F6',
    dayTextColor: isDark ? '#F9FAFB' : '#111827',
    textDisabledColor: isDark ? '#4B5563' : '#D1D5DB',
    dotColor: '#F59E0B',
    selectedDotColor: '#ffffff',
    arrowColor: isDark ? '#9CA3AF' : '#6B7280',
    disabledArrowColor: isDark ? '#4B5563' : '#D1D5DB',
    monthTextColor: isDark ? '#F9FAFB' : '#111827',
    indicatorColor: '#3B82F6',
    textDayFontFamily: 'System',
    textMonthFontFamily: 'System',
    textDayHeaderFontFamily: 'System',
    textDayFontWeight: '400',
    textMonthFontWeight: '600',
    textDayHeaderFontWeight: '500',
    textDayFontSize: 16,
    textMonthFontSize: 18,
    textDayHeaderFontSize: 14,
  };

  return (
    <VStack className="bg-white dark:bg-gray-900" testID={testID}>
      {/* Calendar Header with Today Button */}
      <HStack className="items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
        <Heading size="md" className="text-gray-900 dark:text-white">
          {t('calendar.title')}
        </Heading>
        <Button variant="outline" size="sm" onPress={goToToday} className="border-primary-500" testID={`${testID}-today-button`}>
          <ButtonText className="text-primary-600 dark:text-primary-400">{t('calendar.tabs.today')}</ButtonText>
        </Button>
      </HStack>

      {/* Calendar Component */}
      <View className="px-4 py-2">
        <Calendar
          testID={`${testID}-calendar`}
          // Calendar configuration
          current={currentMonth + '-01'}
          minDate="2020-01-01"
          maxDate="2030-12-31"
          // Event handling
          onDayPress={handleDayPress}
          onMonthChange={handleMonthChange}
          // Marking and styling
          markedDates={markedDates}
          markingType="multi-dot"
          theme={calendarTheme}
          // Features
          firstDay={0} // Sunday as first day
          showWeekNumbers={false}
          hideExtraDays={true}
          disableMonthChange={false}
          hideArrows={false}
          hideDayNames={false}
          // Customization
          enableSwipeMonths={true}
          // Accessibility
          accessibilityElementsHidden={false}
          importantForAccessibility="yes"
          // Loading state
          displayLoadingIndicator={isLoading}
        />
      </View>

      {/* Selected Date Info */}
      {selectedDate && (
        <View className="border-t border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
          <Text className="text-sm font-medium text-gray-900 dark:text-white">
            {t('calendar.selectedDate.title', {
              date: (() => {
                // Parse the date string properly to avoid timezone issues
                const parts = selectedDate.split('-');
                const year = parseInt(parts[0] ?? '0', 10);
                const month = parseInt(parts[1] ?? '0', 10);
                const day = parseInt(parts[2] ?? '0', 10);

                if (year && month && day) {
                  const localDate = new Date(year, month - 1, day); // month is 0-indexed
                  return localDate.toLocaleDateString([], {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  });
                }

                return selectedDate; // fallback if parsing fails
              })(),
            })}
          </Text>
          {(() => {
            const eventsForDay = selectedMonthItems.filter((item) => {
              // Use isSameDate for timezone-safe date comparison with .NET backend timezone-aware dates
              return selectedDate ? isSameDate(item.Start, selectedDate) : false;
            });

            if (eventsForDay.length > 0) {
              return <Text className="mt-1 text-xs text-gray-600 dark:text-gray-300">{t('calendar.eventsCount', { count: eventsForDay.length })}</Text>;
            }

            return <Text className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t('calendar.noEvents')}</Text>;
          })()}
        </View>
      )}
    </VStack>
  );
};
