import { useFocusEffect } from '@react-navigation/native';
import { Stack } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CalendarCard } from '@/components/calendar/calendar-card';
import { CalendarItemDetailsSheet } from '@/components/calendar/calendar-item-details-sheet';
import { EnhancedCalendarView } from '@/components/calendar/enhanced-calendar-view';
import { Loading } from '@/components/common/loading';
import ZeroState from '@/components/common/zero-state';
import { View } from '@/components/ui';
import { Button, ButtonText } from '@/components/ui/button';
import { FlatList } from '@/components/ui/flat-list';
import { Heading } from '@/components/ui/heading';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { useAnalytics } from '@/hooks/use-analytics';
import { type CalendarItemResultData } from '@/models/v4/calendar/calendarItemResultData';
import { useCalendarStore } from '@/stores/calendar/store';

type TabType = 'today' | 'upcoming' | 'calendar';

export default function CalendarScreen() {
  const { t } = useTranslation();
  const { trackEvent } = useAnalytics();
  const [activeTab, setActiveTab] = useState<TabType>('today');
  const [selectedItem, setSelectedItem] = useState<CalendarItemResultData | null>(null);
  const [isDetailsSheetOpen, setIsDetailsSheetOpen] = useState(false);

  const {
    todayCalendarItems,
    upcomingCalendarItems,
    selectedMonthItems,
    selectedDate,
    isTodaysLoading,
    isUpcomingLoading,
    isLoading,
    error,
    loadTodaysCalendarItems,
    loadUpcomingCalendarItems,
    loadCalendarItemsForDateRange,
    viewCalendarItemAction,
    clearError,
  } = useCalendarStore();

  useEffect(() => {
    // Initialize data on mount using new Angular-style actions
    loadTodaysCalendarItems();
    loadUpcomingCalendarItems();
  }, [loadTodaysCalendarItems, loadUpcomingCalendarItems]);

  // Track analytics when view becomes visible
  useFocusEffect(
    React.useCallback(() => {
      trackEvent('calendar_viewed', {
        timestamp: new Date().toISOString(),
        activeTab,
      });
    }, [trackEvent, activeTab])
  );

  const handleRefresh = async () => {
    clearError();

    // Track analytics for refresh actions
    trackEvent('calendar_refreshed', {
      timestamp: new Date().toISOString(),
      tab: activeTab,
    });

    if (activeTab === 'today') {
      await loadTodaysCalendarItems();
    } else if (activeTab === 'upcoming') {
      await loadUpcomingCalendarItems();
    }
  };

  const handleItemPress = (item: CalendarItemResultData) => {
    setSelectedItem(item);
    viewCalendarItemAction(item); // Update store state to match Angular
    setIsDetailsSheetOpen(true);

    // Track analytics for item interaction
    trackEvent('calendar_item_viewed', {
      timestamp: new Date().toISOString(),
      itemId: item.CalendarItemId,
      itemTitle: item.Title,
      itemType: item.TypeName,
      tab: activeTab,
    });
  };

  const handleMonthChange = (startDate: string, endDate: string) => {
    loadCalendarItemsForDateRange(startDate, endDate);

    // Track analytics for month navigation
    trackEvent('calendar_month_changed', {
      timestamp: new Date().toISOString(),
      startDate,
      endDate,
    });
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
    <Button
      key={tab}
      variant={activeTab === tab ? 'solid' : 'outline'}
      onPress={() => {
        setActiveTab(tab);
        // Track analytics for tab changes
        trackEvent('calendar_tab_changed', {
          timestamp: new Date().toISOString(),
          fromTab: activeTab,
          toTab: tab,
        });
      }}
      className={`flex-1 ${activeTab === tab ? 'bg-primary-600' : 'border-primary-600 bg-transparent'}`}
    >
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

    if (!todayCalendarItems || todayCalendarItems.length === 0) {
      return <ZeroState heading={t('calendar.today.empty.title')} description={t('calendar.today.empty.description')} />;
    }

    return (
      <FlatList
        data={todayCalendarItems}
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

    if (!upcomingCalendarItems || upcomingCalendarItems.length === 0) {
      return <ZeroState heading={t('calendar.upcoming.empty.title')} description={t('calendar.upcoming.empty.description')} />;
    }

    return (
      <FlatList
        data={upcomingCalendarItems}
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
        <EnhancedCalendarView onMonthChange={handleMonthChange} />
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
    </>
  );
}
