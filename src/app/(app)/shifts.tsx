import { Search } from 'lucide-react-native';
import React, { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshControl, StyleSheet } from 'react-native';

import ZeroState from '@/components/common/zero-state-example';
import { ShiftCard } from '@/components/shifts/shift-card';
import { ShiftDayCard } from '@/components/shifts/shift-day-card';
import { ShiftDayDetailsSheet } from '@/components/shifts/shift-day-details-sheet';
import { ShiftDetailsSheet } from '@/components/shifts/shift-details-sheet';
import { View } from '@/components/ui';
import { Button, ButtonText } from '@/components/ui/button';
import { FlatList } from '@/components/ui/flat-list';
import { FocusAwareStatusBar } from '@/components/ui/focus-aware-status-bar';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Input, InputField } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { type ShiftViewMode, useShiftsStore } from '@/stores/shifts/store';

export default function ShiftsScreen() {
  const { t } = useTranslation();
  const {
    // Data
    shifts,
    todaysShiftDays,
    // UI State
    currentView,
    searchQuery,
    isShiftDetailsOpen,
    isShiftDayDetailsOpen,
    // Loading states
    isLoading,
    isTodaysLoading,
    // Actions
    setCurrentView,
    setSearchQuery,
    fetchAllShifts,
    fetchTodaysShifts,
    closeShiftDetails,
    closeShiftDayDetails,
    selectShift,
    selectShiftDay,
    // Computed
    getFilteredShifts,
    getFilteredTodaysShifts,
  } = useShiftsStore();

  const filteredShifts = useMemo(() => getFilteredShifts(), [getFilteredShifts]);
  const filteredTodaysShifts = useMemo(() => getFilteredTodaysShifts(), [getFilteredTodaysShifts]);

  useEffect(() => {
    // Refresh data when the screen is focused
    if (currentView === 'today') {
      fetchTodaysShifts();
    } else {
      fetchAllShifts();
    }
  }, [currentView, fetchTodaysShifts, fetchAllShifts]);

  const handleRefresh = async () => {
    if (currentView === 'today') {
      await fetchTodaysShifts();
    } else {
      await fetchAllShifts();
    }
  };

  const renderTabButton = (mode: ShiftViewMode, title: string) => (
    <Button
      onPress={() => setCurrentView(mode)}
      variant={currentView === mode ? 'solid' : 'outline'}
      className={`flex-1 ${currentView === mode ? 'border-primary-600 bg-primary-600' : 'border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-800'}`}
    >
      <ButtonText className={currentView === mode ? 'font-semibold text-white' : 'text-gray-700 dark:text-gray-300'}>{title}</ButtonText>
    </Button>
  );

  const renderSearchBar = () => (
    <View className="px-4 pb-2">
      <Input variant="outline" className="bg-white dark:bg-gray-800">
        <Icon as={Search} className="ml-3 text-gray-400" size={20} />
        <InputField placeholder={t('shifts.search_placeholder')} value={searchQuery} onChangeText={setSearchQuery} className="ml-2" />
      </Input>
    </View>
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
      return <ZeroState title={t('shifts.no_shifts_today')} description={t('shifts.no_shifts_today')} buttonText="" onButtonPress={() => {}} showButton={false} />;
    }

    return (
      <FlatList
        data={filteredTodaysShifts}
        keyExtractor={(item) => item.ShiftDayId}
        renderItem={({ item }) => <ShiftDayCard shiftDay={item} onPress={() => selectShiftDay(item)} />}
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
      return <ZeroState title={t('shifts.no_shifts')} description={t('shifts.no_shifts')} buttonText="" onButtonPress={() => {}} showButton={false} />;
    }

    return (
      <FlatList
        data={filteredShifts}
        keyExtractor={(item) => item.ShiftId}
        renderItem={({ item }) => <ShiftCard shift={item} onPress={() => selectShift(item)} />}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={handleRefresh} />}
        showsVerticalScrollIndicator={false}
      />
    );
  };

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      <FocusAwareStatusBar style="auto" />

      <VStack className="flex-1">
        {/* Tab Navigation */}
        <View className="border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          <HStack className="space-x-2 px-4 py-3">
            {renderTabButton('today', t('shifts.today'))}
            {renderTabButton('all', t('shifts.all_shifts'))}
          </HStack>
        </View>

        {/* Search Bar */}
        {renderSearchBar()}

        {/* Content */}
        <View className="flex-1">{currentView === 'today' ? renderTodayShifts() : renderAllShifts()}</View>
      </VStack>

      {/* Details Sheets */}
      <ShiftDetailsSheet isOpen={isShiftDetailsOpen} onClose={closeShiftDetails} />

      <ShiftDayDetailsSheet isOpen={isShiftDayDetailsOpen} onClose={closeShiftDayDetails} />
    </View>
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
});
