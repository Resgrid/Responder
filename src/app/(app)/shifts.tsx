import { useFocusEffect } from 'expo-router';
import { Search, X } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';

import ZeroState from '@/components/common/zero-state';
import { ShiftCard } from '@/components/shifts/shift-card';
import { ShiftDayCard } from '@/components/shifts/shift-day-card';
import { ShiftDayDetailsSheet } from '@/components/shifts/shift-day-details-sheet';
import { ShiftDetailsSheet } from '@/components/shifts/shift-details-sheet';
import { View } from '@/components/ui';
import { Button, ButtonText } from '@/components/ui/button';
import { FlatList } from '@/components/ui/flat-list';
import { FocusAwareStatusBar } from '@/components/ui/focus-aware-status-bar';
import { HStack } from '@/components/ui/hstack';
import { Input, InputField, InputIcon, InputSlot } from '@/components/ui/input';
import { RefreshControl } from '@/components/ui/refresh-control';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { useAnalytics } from '@/hooks/use-analytics';
import { type ShiftDaysResultData } from '@/models/v4/shifts/shiftDayResultData';
import { type ShiftResultData } from '@/models/v4/shifts/shiftResultData';
import { type ShiftViewMode, useShiftsStore } from '@/stores/shifts/store';

const ShiftsScreen: React.FC = () => {
  const { t } = useTranslation();
  const { trackEvent } = useAnalytics();
  const shifts = useShiftsStore((state) => state.shifts);
  const todaysShiftDays = useShiftsStore((state) => state.todaysShiftDays);
  const currentView = useShiftsStore((state) => state.currentView);
  const searchQuery = useShiftsStore((state) => state.searchQuery);
  const isShiftDetailsOpen = useShiftsStore((state) => state.isShiftDetailsOpen);
  const isShiftDayDetailsOpen = useShiftsStore((state) => state.isShiftDayDetailsOpen);
  const isLoading = useShiftsStore((state) => state.isLoading);
  const isTodaysLoading = useShiftsStore((state) => state.isTodaysLoading);
  const setCurrentView = useShiftsStore((state) => state.setCurrentView);
  const setSearchQuery = useShiftsStore((state) => state.setSearchQuery);
  const fetchAllShifts = useShiftsStore((state) => state.fetchAllShifts);
  const fetchTodaysShifts = useShiftsStore((state) => state.fetchTodaysShifts);
  const closeShiftDetails = useShiftsStore((state) => state.closeShiftDetails);
  const closeShiftDayDetails = useShiftsStore((state) => state.closeShiftDayDetails);
  const selectShift = useShiftsStore((state) => state.selectShift);
  const selectShiftDay = useShiftsStore((state) => state.selectShiftDay);

  const filteredShifts = useMemo(() => {
    if (!searchQuery.trim()) return shifts;
    const query = searchQuery.trim().toLowerCase();
    return shifts.filter((shift) => shift.Name.toLowerCase().includes(query) || shift.Code.toLowerCase().includes(query));
  }, [shifts, searchQuery]);

  const filteredTodaysShifts = useMemo(() => {
    if (!searchQuery.trim()) return todaysShiftDays;
    const query = searchQuery.trim().toLowerCase();
    return todaysShiftDays.filter((shiftDay) => shiftDay.ShiftName.toLowerCase().includes(query));
  }, [todaysShiftDays, searchQuery]);

  useEffect(() => {
    // Refresh data when the screen is focused
    if (currentView === 'today') {
      fetchTodaysShifts();
    } else {
      fetchAllShifts();
    }
  }, [currentView, fetchTodaysShifts, fetchAllShifts]);

  // Track analytics when view becomes visible
  useFocusEffect(
    React.useCallback(() => {
      trackEvent('shifts_viewed', {
        timestamp: new Date().toISOString(),
        activeTab: currentView,
        shiftCount: currentView === 'today' ? todaysShiftDays.length : shifts.length,
        hasSearchQuery: searchQuery.trim().length > 0,
      });
    }, [trackEvent, currentView, todaysShiftDays.length, shifts.length, searchQuery])
  );

  const handleTabChange = useCallback(
    (mode: ShiftViewMode) => {
      const fromTab = currentView;
      setCurrentView(mode);

      // Track analytics for tab changes
      trackEvent('shifts_tab_changed', {
        timestamp: new Date().toISOString(),
        fromTab,
        toTab: mode,
      });

      // Fetch appropriate data when tab changes
      if (mode === 'today') {
        fetchTodaysShifts();
      } else {
        fetchAllShifts();
      }
    },
    [setCurrentView, fetchTodaysShifts, fetchAllShifts, trackEvent, currentView]
  );

  const handleRefresh = useCallback(async () => {
    // Track analytics for refresh actions
    trackEvent('shifts_refreshed', {
      timestamp: new Date().toISOString(),
      tab: currentView,
    });

    if (currentView === 'today') {
      await fetchTodaysShifts();
    } else {
      await fetchAllShifts();
    }
  }, [currentView, fetchTodaysShifts, fetchAllShifts, trackEvent]);

  const renderShiftItem = useCallback(
    ({ item }: { item: ShiftResultData }) => (
      <ShiftCard
        shift={item}
        onPress={() => {
          // Track analytics for shift selection
          trackEvent('shift_selected', {
            timestamp: new Date().toISOString(),
            shiftId: item.ShiftId,
            shiftName: item.Name,
            shiftCode: item.Code,
            tab: currentView,
          });
          selectShift(item);
        }}
      />
    ),
    [selectShift, trackEvent, currentView]
  );

  const renderShiftDayItem = useCallback(
    ({ item }: { item: ShiftDaysResultData }) => (
      <ShiftDayCard
        shiftDay={item}
        onPress={() => {
          // Track analytics for shift day selection
          trackEvent('shift_day_selected', {
            timestamp: new Date().toISOString(),
            shiftDayId: item.ShiftDayId,
            shiftId: item.ShiftId,
            shiftName: item.ShiftName,
            tab: currentView,
          });
          selectShiftDay(item);
        }}
      />
    ),
    [selectShiftDay, trackEvent, currentView]
  );

  const handleSearchChange = useCallback(
    (query: string) => {
      setSearchQuery(query);

      // Track analytics for search if query is not empty
      if (query.trim().length > 0) {
        trackEvent('shifts_search', {
          timestamp: new Date().toISOString(),
          searchQuery: query.trim(),
          tab: currentView,
        });
      }
    },
    [setSearchQuery, trackEvent, currentView]
  );

  const renderTabButton = (mode: ShiftViewMode, title: string) => (
    <Button onPress={() => handleTabChange(mode)} variant={currentView === mode ? 'solid' : 'outline'} className={`flex-1 ${currentView === mode ? 'bg-primary-600' : 'border-primary-600 bg-transparent'}`}>
      <ButtonText className={currentView === mode ? 'text-white' : 'text-primary-600'}>{title}</ButtonText>
    </Button>
  );

  const renderSearchBar = () => (
    <Input variant="outline" size="md" className="rounded-lg bg-white dark:bg-gray-800">
      <InputSlot className="pl-3">
        <InputIcon as={Search} />
      </InputSlot>
      <InputField placeholder={t('shifts.search_placeholder')} value={searchQuery} onChangeText={handleSearchChange} />
      {searchQuery ? (
        <InputSlot className="pr-3" onPress={() => handleSearchChange('')} testID="clear-search-button">
          <InputIcon as={X} />
        </InputSlot>
      ) : null}
    </Input>
  );

  const renderTodayShifts = () => {
    if (isTodaysLoading && todaysShiftDays.length === 0) {
      return (
        <View className="flex-1 items-center justify-center p-8">
          <Spinner size="large" />
          <Text className="mt-4 text-gray-600 dark:text-gray-400">{t('shifts.loading')}</Text>
        </View>
      );
    }

    if (filteredTodaysShifts.length === 0) {
      return <ZeroState heading={t('shifts.no_shifts_today')} description={t('shifts.no_shifts_today_description', 'Check back later or contact your supervisor for shift assignments')} />;
    }

    return (
      <FlatList
        data={filteredTodaysShifts}
        keyExtractor={(item) => item.ShiftDayId}
        renderItem={renderShiftDayItem}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={isTodaysLoading} onRefresh={handleRefresh} />}
        showsVerticalScrollIndicator={false}
      />
    );
  };

  const renderAllShifts = () => {
    if (isLoading && shifts.length === 0) {
      return (
        <View className="flex-1 items-center justify-center p-8">
          <Spinner size="large" />
          <Text className="mt-4 text-gray-600 dark:text-gray-400">{t('shifts.loading')}</Text>
        </View>
      );
    }

    if (filteredShifts.length === 0) {
      return <ZeroState heading={t('shifts.no_shifts')} description={t('shifts.no_shifts_description', 'Contact your supervisor if you believe you should have shift assignments')} />;
    }

    return (
      <FlatList
        data={filteredShifts}
        keyExtractor={(item) => item.ShiftId}
        renderItem={renderShiftItem}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={handleRefresh} />}
        showsVerticalScrollIndicator={false}
      />
    );
  };

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      <FocusAwareStatusBar />

      <VStack className="flex-1">
        {/* Tab Navigation */}
        <HStack className="space-x-2 px-4 pt-4">
          {renderTabButton('today', t('shifts.today'))}
          {renderTabButton('all', t('shifts.all_shifts'))}
        </HStack>

        {/* Search Bar */}
        <View className="px-4 py-3">{renderSearchBar()}</View>

        {/* Content */}
        <View className="flex-1">{currentView === 'today' ? renderTodayShifts() : renderAllShifts()}</View>
      </VStack>

      {/* Details Sheets */}
      <ShiftDetailsSheet isOpen={isShiftDetailsOpen} onClose={closeShiftDetails} />

      <ShiftDayDetailsSheet isOpen={isShiftDayDetailsOpen} onClose={closeShiftDayDetails} />
    </View>
  );
};

export default React.memo(ShiftsScreen);

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
});
