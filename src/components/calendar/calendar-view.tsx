import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';

import { View, VStack, HStack } from '@/components/ui';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { Button } from '@/components/ui/button';
import { useCalendarStore } from '@/stores/calendar/store';

interface CalendarViewProps {
  onMonthChange: (startDate: string, endDate: string) => void;
}

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const CalendarView: React.FC<CalendarViewProps> = ({ onMonthChange }) => {
  const { t } = useTranslation();
  const [currentDate, setCurrentDate] = useState(new Date());
  const { selectedDate, setSelectedDate, selectedMonthItems } = useCalendarStore();

  useEffect(() => {
    // Load data for the current month when component mounts or month changes
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    onMonthChange(
      startOfMonth.toISOString().split('T')[0],
      endOfMonth.toISOString().split('T')[0]
    );
  }, [currentDate, onMonthChange]);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();

    // Get first day of month and number of days
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (Date | null)[] = [];

    // Add empty cells for days before the month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  const hasEventsOnDate = (date: Date) => {
    const targetDate = date.toDateString();
    return selectedMonthItems.some((item) => {
      const itemDate = new Date(item.Start).toDateString();
      return itemDate === targetDate;
    });
  };

  const isDateSelected = (date: Date) => {
    if (!selectedDate) return false;
    return date.toDateString() === new Date(selectedDate).toDateString();
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const handleDatePress = (date: Date) => {
    const dateString = date.toISOString().split('T')[0];
    setSelectedDate(dateString);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const getMonthYearText = () => {
    return currentDate.toLocaleDateString([], {
      month: 'long',
      year: 'numeric'
    });
  };

  const renderDay = (date: Date | null, index: number) => {
    if (!date) {
      return <View key={index} style={styles.dayCell} />;
    }

    const hasEvents = hasEventsOnDate(date);
    const isSelected = isDateSelected(date);
    const isTodayDate = isToday(date);

    return (
      <TouchableOpacity
        key={index}
        style={[
          styles.dayCell,
          isTodayDate && styles.todayCell,
          isSelected && styles.selectedCell,
        ]}
        onPress={() => handleDatePress(date)}
      >
        <Text
          className={`text-center text-sm font-medium ${isSelected
              ? 'text-white'
              : isTodayDate
                ? 'text-primary-600 dark:text-primary-400'
                : 'text-gray-900 dark:text-white'
            }`}
        >
          {date.getDate()}
        </Text>
        {hasEvents && (
          <View style={[
            styles.eventDot,
            isSelected && styles.selectedEventDot
          ]} />
        )}
      </TouchableOpacity>
    );
  };

  const days = getDaysInMonth(currentDate);

  return (
    <VStack className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
      {/* Month Navigation */}
      <HStack className="justify-between items-center px-4 py-3">
        <Button
          variant="ghost"
          size="sm"
          onPress={() => navigateMonth('prev')}
          className="p-2"
        >
          <ChevronLeft size={20} color="currentColor" />
        </Button>

        <Heading size="md" className="text-gray-900 dark:text-white">
          {getMonthYearText()}
        </Heading>

        <Button
          variant="ghost"
          size="sm"
          onPress={() => navigateMonth('next')}
          className="p-2"
        >
          <ChevronRight size={20} color="currentColor" />
        </Button>
      </HStack>

      {/* Days of Week Header */}
      <HStack className="px-4 py-2 border-b border-gray-100 dark:border-gray-700">
        {DAYS_OF_WEEK.map((day) => (
          <View key={day} style={styles.dayHeader}>
            <Text className="text-center text-xs font-semibold text-gray-500 dark:text-gray-400">
              {t(`calendar.daysOfWeek.${day.toLowerCase()}`)}
            </Text>
          </View>
        ))}
      </HStack>

      {/* Calendar Grid */}
      <View className="px-4 pb-4">
        {Array.from({ length: Math.ceil(days.length / 7) }, (_, weekIndex) => (
          <HStack key={weekIndex}>
            {days.slice(weekIndex * 7, weekIndex * 7 + 7).map((date, dayIndex) =>
              renderDay(date, weekIndex * 7 + dayIndex)
            )}
          </HStack>
        ))}
      </View>
    </VStack>
  );
};

const styles = StyleSheet.create({
  dayHeader: {
    flex: 1,
    paddingVertical: 8,
  },
  dayCell: {
    flex: 1,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginVertical: 2,
    borderRadius: 8,
  },
  todayCell: {
    backgroundColor: '#EFF6FF', // blue-50
  },
  selectedCell: {
    backgroundColor: '#3B82F6', // blue-500
  },
  eventDot: {
    position: 'absolute',
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#F59E0B', // amber-500
  },
  selectedEventDot: {
    backgroundColor: '#FFFFFF',
  },
}); 