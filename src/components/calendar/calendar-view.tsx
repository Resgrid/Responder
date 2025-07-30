import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { View } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { Heading } from '@/components/ui/heading';
import { HStack } from '@/components/ui/hstack';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { useCalendarStore } from '@/stores/calendar/store';

interface CalendarViewProps {
  onMonthChange: (startDate: string, endDate: string) => void;
}

const DAYS_OF_WEEK = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

export const CalendarView: React.FC<CalendarViewProps> = ({ onMonthChange }) => {
  const { t } = useTranslation();
  const [currentDate, setCurrentDate] = useState(new Date());
  const { selectedDate, setSelectedDate, selectedMonthItems } = useCalendarStore();

  useEffect(() => {
    // Load data for the current month when component mounts or month changes
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    onMonthChange(startOfMonth.toISOString().split('T')[0], endOfMonth.toISOString().split('T')[0]);
  }, [currentDate, onMonthChange]);

  const getDaysInMonth = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

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
  }, [currentDate]);

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
    setCurrentDate((prev) => {
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
      year: 'numeric',
    });
  };

  const renderDay = (date: Date | null, index: number) => {
    if (!date) {
      return <View key={index} className="flex-1 h-10 items-center justify-center rounded-lg my-0.5" />;
    }

    const hasEvents = hasEventsOnDate(date);
    const isSelected = isDateSelected(date);
    const isTodayDate = isToday(date);

    const dayTextClasses = ['text-center text-sm font-medium', isSelected ? 'text-white' : isTodayDate ? 'text-primary-600 dark:text-primary-400' : 'text-gray-900 dark:text-white'].join(' ');

    const dayContainerClasses = [
      'flex-1 h-10 my-0.5 items-center justify-center relative rounded-lg',
      isTodayDate && !isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : '',
      isSelected ? 'bg-primary-500 dark:bg-primary-600' : '',
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <Pressable key={index} className={dayContainerClasses} onPress={() => handleDatePress(date)}>
        <Text className={dayTextClasses}>{date.getDate()}</Text>
        {hasEvents && <View className={['absolute bottom-1 h-1 w-1 rounded-full', isSelected ? 'bg-white' : 'bg-amber-500'].join(' ')} />}
      </Pressable>
    );
  };

  return (
    <VStack className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      {/* Month Navigation */}
      <HStack className="items-center justify-between px-4 py-3">
        <Button variant="outline" size="sm" onPress={() => navigateMonth('prev')} className="border-none p-2">
          <ChevronLeft size={20} className="text-gray-600 dark:text-gray-400" />
        </Button>

        <Heading size="md" className="font-semibold text-gray-900 dark:text-white">
          {getMonthYearText()}
        </Heading>

        <Button variant="outline" size="sm" onPress={() => navigateMonth('next')} className="border-none p-2">
          <ChevronRight size={20} className="text-gray-600 dark:text-gray-400" />
        </Button>
      </HStack>

      {/* Days of Week Header */}
      <HStack className="border-b border-gray-100 px-4 py-2 dark:border-gray-700">
        {DAYS_OF_WEEK.map((day) => (
          <View key={day} className="flex-1 py-2">
            <Text className="text-center text-xs font-semibold text-gray-500 dark:text-gray-400">{t(`calendar.daysOfWeek.${day}`)}</Text>
          </View>
        ))}
      </HStack>

      {/* Calendar Grid */}
      <View className="px-4 pb-4">
        {Array.from({ length: Math.ceil(getDaysInMonth.length / 7) }, (_, weekIndex) => (
          <HStack key={weekIndex}>{getDaysInMonth.slice(weekIndex * 7, weekIndex * 7 + 7).map((date, dayIndex) => renderDay(date, weekIndex * 7 + dayIndex))}</HStack>
        ))}
      </View>
    </VStack>
  );
};
