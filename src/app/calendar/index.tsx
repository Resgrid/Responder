import { Stack } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CalendarCard } from '@/components/calendar/calendar-card';
import { CalendarItemDetailsSheet } from '@/components/calendar/calendar-item-details-sheet';
import { CalendarView } from '@/components/calendar/calendar-view';
import { Loading } from '@/components/common/loading';
import ZeroState from '@/components/common/zero-state';
import { View } from '@/components/ui';
import { Button, ButtonText } from '@/components/ui/button';
import { FlatList } from '@/components/ui/flat-list';
import { Heading } from '@/components/ui/heading';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { type CalendarItemResultData } from '@/models/v4/calendar/calendarItemResultData';
import { useCalendarStore } from '@/stores/calendar/store';

type TabType = 'today' | 'upcoming' | 'calendar';

export default function CalendarScreen() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabType>('today');
  const [selectedItem, setSelectedItem] = useState<CalendarItemResultData | null>(null);
  const [isDetailsSheetOpen, setIsDetailsSheetOpen] = useState(false);

  const { todaysItems, upcomingItems, selectedMonthItems, selectedDate, isTodaysLoading, isUpcomingLoading, isLoading, error, fetchTodaysItems, fetchUpcomingItems, fetchItemsForDateRange, clearError } =
    useCalendarStore();

  useEffect(() => {
    // Initialize data on mount
    fetchTodaysItems();
    fetchUpcomingItems();
  }, [fetchTodaysItems, fetchUpcomingItems]);

  const handleRefresh = async () => {
    clearError();
    if (activeTab === 'today') {
      await fetchTodaysItems();
    } else if (activeTab === 'upcoming') {
      await fetchUpcomingItems();
    }
  };

  const handleItemPress = (item: CalendarItemResultData) => {
    setSelectedItem(item);
    setIsDetailsSheetOpen(true);
  };

  const handleMonthChange = (startDate: string, endDate: string) => {
    fetchItemsForDateRange(startDate, endDate);
  };

  const getItemsForSelectedDate = () => {
    if (!selectedDate) return [];
    const targetDate = new Date(selectedDate).toDateString();
    return selectedMonthItems.filter((item) => {
      const itemDate = new Date(item.Start).toDateString();
      return itemDate === targetDate;
    });
  };

  const renderTabButton = (tab: TabType, label: string) => (
    <Button key={tab} variant={activeTab === tab ? 'solid' : 'outline'} onPress={() => setActiveTab(tab)} className={`flex-1 ${activeTab === tab ? 'bg-primary-600' : 'border-primary-600 bg-transparent'}`}>
      <ButtonText className={activeTab === tab ? 'text-white' : 'text-primary-600'}>{label}</ButtonText>
    </Button>
  );

  const renderCalendarItem = ({ item }: { item: CalendarItemResultData }) => <CalendarCard item={item} onPress={() => handleItemPress(item)} />;

  const renderTodayTab = () => {
    if (isTodaysLoading) {
      return <Loading text={t('calendar.loading.today')} />;
    }

    if (error) {
      return (
        <ZeroState heading={t('calendar.error.title')} description={error} isError={true}>
          <Button onPress={handleRefresh} className="mt-4">
            <ButtonText>{t('common.retry')}</ButtonText>
          </Button>
        </ZeroState>
      );
    }

    if (todaysItems.length === 0) {
      return <ZeroState heading={t('calendar.today.empty.title')} description={t('calendar.today.empty.description')} />;
    }

    return (
      <FlatList
        data={todaysItems}
        renderItem={renderCalendarItem}
        keyExtractor={(item) => item.CalendarItemId}
        className="flex-1"
        contentContainerStyle={{ padding: 16 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isTodaysLoading} onRefresh={handleRefresh} colors={['#3B82F6']} tintColor="#3B82F6" />}
      />
    );
  };

  const renderUpcomingTab = () => {
    if (isUpcomingLoading) {
      return <Loading text={t('calendar.loading.upcoming')} />;
    }

    if (error) {
      return (
        <ZeroState heading={t('calendar.error.title')} description={error} isError={true}>
          <Button onPress={handleRefresh} className="mt-4">
            <ButtonText>{t('common.retry')}</ButtonText>
          </Button>
        </ZeroState>
      );
    }

    if (upcomingItems.length === 0) {
      return <ZeroState heading={t('calendar.upcoming.empty.title')} description={t('calendar.upcoming.empty.description')} />;
    }

    return (
      <FlatList
        data={upcomingItems}
        renderItem={renderCalendarItem}
        keyExtractor={(item) => item.CalendarItemId}
        className="flex-1"
        contentContainerStyle={{ padding: 16 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isUpcomingLoading} onRefresh={handleRefresh} colors={['#3B82F6']} tintColor="#3B82F6" />}
      />
    );
  };

  const renderCalendarTab = () => {
    return (
      <View className="flex-1">
        <CalendarView onMonthChange={handleMonthChange} />
        {selectedDate ? (
          <View className="flex-1 border-t border-gray-200 dark:border-gray-800">
            <VStack className="p-4">
              <Heading size="sm" className="mb-3">
                {t('calendar.selectedDate.title', {
                  date: new Date(selectedDate).toLocaleDateString(),
                })}
              </Heading>
              {isLoading ? (
                <Loading text={t('calendar.loading.date')} />
              ) : getItemsForSelectedDate().length === 0 ? (
                <Text className="py-8 text-center text-gray-500 dark:text-gray-400">{t('calendar.selectedDate.empty')}</Text>
              ) : (
                <FlatList data={getItemsForSelectedDate()} renderItem={renderCalendarItem} keyExtractor={(item) => item.CalendarItemId} showsVerticalScrollIndicator={false} />
              )}
            </VStack>
          </View>
        ) : (
          <View className="flex-1 items-center justify-center">
            <Text className="text-center text-gray-500 dark:text-gray-400">{t('calendar.selectDate')}</Text>
          </View>
        )}
      </View>
    );
  };

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'today':
        return renderTodayTab();
      case 'upcoming':
        return renderUpcomingTab();
      case 'calendar':
        return renderCalendarTab();
      default:
        return renderTodayTab();
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: t('calendar.title'),
          headerShown: true,
        }}
      />
      <SafeAreaView className="flex-1 bg-white dark:bg-gray-900">
        <VStack className="flex-1">
          {/* Tab Navigation */}
          <HStack className="space-x-2 p-4">
            {renderTabButton('today', t('calendar.tabs.today'))}
            {renderTabButton('upcoming', t('calendar.tabs.upcoming'))}
            {renderTabButton('calendar', t('calendar.tabs.calendar'))}
          </HStack>

          {/* Tab Content */}
          {renderActiveTab()}

          {/* Calendar Item Details Sheet */}
          <CalendarItemDetailsSheet
            item={selectedItem}
            isOpen={isDetailsSheetOpen}
            onClose={() => {
              setIsDetailsSheetOpen(false);
              setSelectedItem(null);
            }}
          />
        </VStack>
      </SafeAreaView>
    </>
  );
}
