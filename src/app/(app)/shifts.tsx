import { Stack, useFocusEffect } from 'expo-router';
import { CalendarPlus, Info, Search, X } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet } from 'react-native';

import ZeroState from '@/components/common/zero-state';
import { ShiftActionSheet, type ShiftSheetAction } from '@/components/shifts/shift-action-sheet';
import { ShiftApprovalsList } from '@/components/shifts/shift-approvals-list';
import { ShiftCalendarView } from '@/components/shifts/shift-calendar-view';
import { ShiftCard } from '@/components/shifts/shift-card';
import { ShiftDayCard } from '@/components/shifts/shift-day-card';
import { ShiftDayDetailsSheet } from '@/components/shifts/shift-day-details-sheet';
import { ShiftDetailsSheet } from '@/components/shifts/shift-details-sheet';
import { canAddDayToCalendar } from '@/components/shifts/shift-labels';
import { ShiftOnDutyList } from '@/components/shifts/shift-on-duty-list';
import { type ShiftSegment, ShiftSegmentBar } from '@/components/shifts/shift-segment-bar';
import { type ShiftTradeAction } from '@/components/shifts/shift-trade-card';
import { ShiftTradeDetailsSheet } from '@/components/shifts/shift-trade-details-sheet';
import { ShiftTradesList } from '@/components/shifts/shift-trades-list';
import { useShiftCalendarExport } from '@/components/shifts/use-shift-calendar-export';
import { View } from '@/components/ui';
import { Button, ButtonSpinner, ButtonText } from '@/components/ui/button';
import { FlatList } from '@/components/ui/flat-list';
import { FocusAwareStatusBar } from '@/components/ui/focus-aware-status-bar';
import { HStack } from '@/components/ui/hstack';
import { Input, InputField, InputIcon, InputSlot } from '@/components/ui/input';
import { Pressable } from '@/components/ui/pressable';
import { RefreshControl } from '@/components/ui/refresh-control';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { useAnalytics } from '@/hooks/use-analytics';
import { formatShiftLongDate, getDateKey, getMonthRange, parseWallClock, toDateParam } from '@/lib/shift-utils';
import { type ShiftDayResultData } from '@/models/v4/shifts/shiftDayResultData';
import { ShiftDayMyStatus } from '@/models/v4/shifts/shiftEnums';
import { type ShiftResultData } from '@/models/v4/shifts/shiftResultData';
import { type ShiftTradeResultData } from '@/models/v4/shifts/shiftTradeResultData';
import { type ShiftSignupFilter, type ShiftTradesFilter, type ShiftViewMode, useShiftsStore } from '@/stores/shifts/store';
import { TermKeys, useTerm } from '@/stores/terminology/store';

const SUPERVISOR_VIEWS: ShiftViewMode[] = ['approvals'];
const TRADE_MUTATIONS = new Set(['respond-trade', 'finish-trade', 'cancel-trade', 'review-trade']);

const shiftDayKeyExtractor = (item: ShiftDayResultData) => item.ShiftDayId;

const matchesQuery = (day: ShiftDayResultData, query: string) => day.ShiftName.toLowerCase().includes(query);

type DayListItem = { type: 'header'; key: string; title: string } | { type: 'day'; key: string; day: ShiftDayResultData };

const dayListKeyExtractor = (item: DayListItem) => item.key;

/** My Shifts in the order someone checks them: what I am on now, what still waits on a supervisor, then what is coming. */
const buildMineSections = (days: ShiftDayResultData[], titles: { active: string; pending: string; upcoming: string }): DayListItem[] => {
  const active = days.filter((day) => day.IsActive);
  const pending = days.filter((day) => !day.IsActive && day.MyStatus === ShiftDayMyStatus.PendingApproval);
  const upcoming = days.filter((day) => !day.IsActive && day.MyStatus !== ShiftDayMyStatus.PendingApproval);
  const items: DayListItem[] = [];
  const addSection = (key: string, title: string, section: ShiftDayResultData[]) => {
    if (section.length === 0) return;
    items.push({ type: 'header', key: `header-${key}`, title });
    section.forEach((day) => items.push({ type: 'day', key: `${key}-${day.ShiftType}-${day.ShiftDayId}`, day }));
  };
  addSection('active', titles.active, active);
  addSection('pending', titles.pending, pending);
  addSection('upcoming', titles.upcoming, upcoming);
  return items;
};

interface CalendarFilterChipProps {
  id: string | null;
  label: string;
  isActive: boolean;
  onSelect: (id: string | null) => void;
}

const CalendarFilterChip: React.FC<CalendarFilterChipProps> = React.memo(({ id, label, isActive, onSelect }) => {
  const handlePress = useCallback(() => onSelect(id), [id, onSelect]);
  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityState={{ selected: isActive }}
      testID={`shifts-calendar-filter-${id ?? 'all'}`}
      className={`mr-2 rounded-full border px-3 py-1.5 ${isActive ? 'border-primary-600 bg-primary-100 dark:bg-primary-100/40' : 'border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-800'}`}
    >
      <Text className={`text-xs font-medium ${isActive ? 'text-primary-700' : 'text-gray-700 dark:text-gray-300'}`}>{label}</Text>
    </Pressable>
  );
});

CalendarFilterChip.displayName = 'CalendarFilterChip';

const ShiftsScreen: React.FC = () => {
  const { t } = useTranslation();
  const shiftsTitle = useTerm(TermKeys.Shifts, t('shifts.title'));
  const { trackEvent } = useAnalytics();
  const { colorScheme } = useColorScheme();

  const shifts = useShiftsStore((state) => state.shifts);
  const todaysShiftDays = useShiftsStore((state) => state.todaysShiftDays);
  const myShiftDays = useShiftsStore((state) => state.myShiftDays);
  const calendarDays = useShiftsStore((state) => state.calendarDays);
  const calendarRange = useShiftsStore((state) => state.calendarRange);
  const calendarShiftId = useShiftsStore((state) => state.calendarShiftId);
  const selectedDate = useShiftsStore((state) => state.selectedDate);
  const trades = useShiftsStore((state) => state.trades);
  const openTrades = useShiftsStore((state) => state.openTrades);
  const tradesFilter = useShiftsStore((state) => state.tradesFilter);
  const signupDays = useShiftsStore((state) => state.signupDays);
  const signupFilter = useShiftsStore((state) => state.signupFilter);
  const isTradeDetailsOpen = useShiftsStore((state) => state.isTradeDetailsOpen);
  const isOpenTradesLoading = useShiftsStore((state) => state.isOpenTradesLoading);
  const isSignupDaysLoading = useShiftsStore((state) => state.isSignupDaysLoading);
  const pendingSignups = useShiftsStore((state) => state.pendingSignups);
  const pendingTrades = useShiftsStore((state) => state.pendingTrades);
  const isSupervisor = useShiftsStore((state) => state.isSupervisor);
  const onDutyPersonnel = useShiftsStore((state) => state.onDutyPersonnel);
  const currentView = useShiftsStore((state) => state.currentView);
  const searchQuery = useShiftsStore((state) => state.searchQuery);
  const isShiftDetailsOpen = useShiftsStore((state) => state.isShiftDetailsOpen);
  const isShiftDayDetailsOpen = useShiftsStore((state) => state.isShiftDayDetailsOpen);
  const isTodaysLoading = useShiftsStore((state) => state.isTodaysLoading);
  const isMyShiftsLoading = useShiftsStore((state) => state.isMyShiftsLoading);
  const isCalendarLoading = useShiftsStore((state) => state.isCalendarLoading);
  const isTradesLoading = useShiftsStore((state) => state.isTradesLoading);
  const isApprovalsLoading = useShiftsStore((state) => state.isApprovalsLoading);
  const isOnDutyLoading = useShiftsStore((state) => state.isOnDutyLoading);
  const activeMutation = useShiftsStore((state) => state.activeMutation);
  const activeMutationTargetId = useShiftsStore((state) => state.activeMutationTargetId);
  const error = useShiftsStore((state) => state.error);
  const setCurrentView = useShiftsStore((state) => state.setCurrentView);
  const setSearchQuery = useShiftsStore((state) => state.setSearchQuery);
  const setSelectedDate = useShiftsStore((state) => state.setSelectedDate);
  const setCalendarShiftFilter = useShiftsStore((state) => state.setCalendarShiftFilter);
  const fetchShiftDaysForDateRange = useShiftsStore((state) => state.fetchShiftDaysForDateRange);
  const refreshView = useShiftsStore((state) => state.refreshView);
  const selectShift = useShiftsStore((state) => state.selectShift);
  const selectShiftDay = useShiftsStore((state) => state.selectShiftDay);
  const closeShiftDetails = useShiftsStore((state) => state.closeShiftDetails);
  const closeShiftDayDetails = useShiftsStore((state) => state.closeShiftDayDetails);
  const openTradeDetails = useShiftsStore((state) => state.openTradeDetails);
  const closeTradeDetails = useShiftsStore((state) => state.closeTradeDetails);
  const setTradesFilter = useShiftsStore((state) => state.setTradesFilter);
  const setSignupFilter = useShiftsStore((state) => state.setSignupFilter);
  const clearError = useShiftsStore((state) => state.clearError);
  const { addToCalendar, isExporting } = useShiftCalendarExport();

  const [sheetAction, setSheetAction] = useState<ShiftSheetAction | null>(null);

  // Approvals exist only for supervisors (decided by the server via IsSupervisor). On Duty is for everyone:
  // anyone who can see shifts can see who is working right now, as on the web.
  const activeView: ShiftViewMode = !isSupervisor && SUPERVISOR_VIEWS.includes(currentView) ? 'today' : currentView;

  useEffect(() => {
    if (activeView !== currentView) {
      setCurrentView(activeView);
    }
  }, [activeView, currentView, setCurrentView]);

  // Data loads on focus (not app start): the current view, plus approvals to learn whether this
  // person supervises anyone and how many requests are waiting.
  useFocusEffect(
    useCallback(() => {
      const state = useShiftsStore.getState();
      void state.refreshView(state.currentView);
      if (state.currentView !== 'approvals') {
        void state.fetchPendingApprovals({ silent: true });
      }
      if (state.currentView !== 'calendar' && state.shifts.length === 0) {
        void state.fetchAllShifts({ silent: true });
      }
      trackEvent('shifts_viewed', {
        timestamp: new Date().toISOString(),
        activeTab: state.currentView,
        isSupervisor: state.isSupervisor,
      });
    }, [trackEvent])
  );

  const calendarMonth = useMemo(() => parseWallClock(calendarRange?.start) ?? new Date(), [calendarRange?.start]);

  const segments = useMemo<ShiftSegment[]>(() => {
    const list: ShiftSegment[] = [
      { key: 'today', label: t('shifts.segments.today') },
      { key: 'mine', label: t('shifts.segments.mine') },
      { key: 'signup', label: t('shifts.segments.signup') },
      { key: 'calendar', label: t('shifts.segments.calendar') },
      { key: 'trades', label: t('shifts.segments.trades'), badge: openTrades.filter((trade) => trade.CanApply).length },
      { key: 'onduty', label: t('shifts.segments.on_duty') },
    ];
    if (isSupervisor) {
      list.push({ key: 'approvals', label: t('shifts.segments.approvals'), badge: pendingSignups.length + pendingTrades.length });
    }
    return list;
  }, [t, isSupervisor, pendingSignups.length, pendingTrades.length, openTrades]);

  const handleSegmentChange = useCallback(
    (view: ShiftViewMode) => {
      trackEvent('shifts_tab_changed', { timestamp: new Date().toISOString(), fromTab: activeView, toTab: view });
      setCurrentView(view);
      if (view === 'calendar' && !useShiftsStore.getState().selectedDate) {
        setSelectedDate(toDateParam(new Date()));
      }
      void refreshView(view);
    },
    [activeView, refreshView, setCurrentView, setSelectedDate, trackEvent]
  );

  const handleRefresh = useCallback(() => {
    clearError();
    trackEvent('shifts_refreshed', { timestamp: new Date().toISOString(), tab: activeView });
    void refreshView(activeView);
    if (activeView !== 'approvals') {
      void useShiftsStore.getState().fetchPendingApprovals({ silent: true });
    }
  }, [activeView, clearError, refreshView, trackEvent]);

  const handleShiftDayPress = useCallback(
    (day: ShiftDayResultData) => {
      trackEvent('shift_day_selected', { timestamp: new Date().toISOString(), shiftDayId: day.ShiftDayId, shiftId: day.ShiftId, tab: useShiftsStore.getState().currentView });
      selectShiftDay(day);
    },
    [selectShiftDay, trackEvent]
  );

  const handleShiftPress = useCallback(
    (shift: ShiftResultData) => {
      trackEvent('shift_selected', { timestamp: new Date().toISOString(), shiftId: shift.ShiftId });
      selectShift(shift);
    },
    [selectShift, trackEvent]
  );

  const handleSearchChange = useCallback((query: string) => setSearchQuery(query), [setSearchQuery]);
  const handleClearSearch = useCallback(() => setSearchQuery(''), [setSearchQuery]);

  const handleMonthChange = useCallback(
    (month: Date) => {
      const range = getMonthRange(month);
      setSelectedDate(null);
      trackEvent('shifts_calendar_month_changed', { timestamp: new Date().toISOString(), start: range.start, end: range.end });
      void fetchShiftDaysForDateRange(range.start, range.end, useShiftsStore.getState().calendarShiftId);
    },
    [fetchShiftDaysForDateRange, setSelectedDate, trackEvent]
  );

  const handleCalendarFilter = useCallback(
    (shiftId: string | null) => {
      void setCalendarShiftFilter(shiftId);
    },
    [setCalendarShiftFilter]
  );

  const handleShowFilteredShiftInfo = useCallback(() => {
    const shift = useShiftsStore.getState().shifts.find((item) => item.ShiftId === useShiftsStore.getState().calendarShiftId);
    if (shift) {
      selectShift(shift);
    }
  }, [selectShift]);

  const handleViewCalendar = useCallback(
    (shiftId: string) => {
      closeShiftDetails();
      setCurrentView('calendar');
      if (!useShiftsStore.getState().selectedDate) {
        setSelectedDate(toDateParam(new Date()));
      }
      void setCalendarShiftFilter(shiftId);
    },
    [closeShiftDetails, setCalendarShiftFilter, setCurrentView, setSelectedDate]
  );

  // The trade sheet closes before the confirmation opens, so two bottom sheets are never stacked.
  const handleTradeAction = useCallback(
    (action: ShiftTradeAction) => {
      if (useShiftsStore.getState().isTradeDetailsOpen) {
        closeTradeDetails();
      }
      setSheetAction(action);
    },
    [closeTradeDetails]
  );

  const handleOpenTradeDetails = useCallback(
    (trade: ShiftTradeResultData) => {
      trackEvent('shift_trade_details_opened', { timestamp: new Date().toISOString(), tradeId: trade.ShiftSignupTradeId, isOpen: !!trade.IsOpen });
      openTradeDetails(trade);
    },
    [openTradeDetails, trackEvent]
  );

  const handleTradesFilter = useCallback(
    (filter: ShiftTradesFilter) => {
      trackEvent('shift_trades_filter_changed', { timestamp: new Date().toISOString(), filter });
      setTradesFilter(filter);
    },
    [setTradesFilter, trackEvent]
  );

  const handleSignupFilterNeeded = useCallback(() => setSignupFilter('needed'), [setSignupFilter]);
  const handleSignupFilterAll = useCallback(() => setSignupFilter('all'), [setSignupFilter]);
  const handleSheetAction = useCallback((action: ShiftSheetAction) => setSheetAction(action), []);
  const handleCloseActionSheet = useCallback(() => setSheetAction(null), []);

  const renderShiftDayItem = useCallback(({ item }: { item: ShiftDayResultData }) => <ShiftDayCard shiftDay={item} onPress={handleShiftDayPress} />, [handleShiftDayPress]);

  const renderDayListItem = useCallback(
    ({ item }: { item: DayListItem }) =>
      item.type === 'header' ? (
        <Text className="mb-2 mt-2 text-sm font-semibold uppercase text-gray-500 dark:text-gray-400" accessibilityRole="header">
          {item.title}
        </Text>
      ) : (
        <ShiftDayCard shiftDay={item.day} onPress={handleShiftDayPress} />
      ),
    [handleShiftDayPress]
  );

  // The calendar list runs edge to edge (the month grid carries its own gutter), so its cards add one.
  const renderCalendarDayItem = useCallback(
    ({ item }: { item: ShiftDayResultData }) => (
      <View className="px-4">
        <ShiftDayCard shiftDay={item} onPress={handleShiftDayPress} />
      </View>
    ),
    [handleShiftDayPress]
  );

  const query = searchQuery.trim().toLowerCase();
  const filteredToday = useMemo(() => (query ? todaysShiftDays.filter((day) => matchesQuery(day, query)) : todaysShiftDays), [todaysShiftDays, query]);
  const filteredMine = useMemo(() => (query ? myShiftDays.filter((day) => matchesQuery(day, query)) : myShiftDays), [myShiftDays, query]);
  const myStandingShifts = useMemo(() => shifts.filter((shift) => shift.InShift), [shifts]);
  const mineItems = useMemo(
    () => buildMineSections(filteredMine, { active: t('shifts.mine_sections.active'), pending: t('shifts.mine_sections.pending'), upcoming: t('shifts.mine_sections.upcoming') }),
    [filteredMine, t]
  );
  const calendarReadyDays = useMemo(() => myShiftDays.filter(canAddDayToCalendar), [myShiftDays]);
  const visibleSignupDays = useMemo(() => {
    const days = signupFilter === 'needed' ? signupDays.filter((day) => !day.Filled) : signupDays;
    return query ? days.filter((day) => matchesQuery(day, query)) : days;
  }, [signupDays, signupFilter, query]);

  const handleAddAllToCalendar = useCallback(() => {
    void addToCalendar(useShiftsStore.getState().myShiftDays);
  }, [addToCalendar]);
  const daysForSelectedDate = useMemo(() => (selectedDate ? calendarDays.filter((day) => getDateKey(day.ShiftDay || day.Start) === selectedDate) : []), [calendarDays, selectedDate]);

  const busyTradeId = activeMutation && TRADE_MUTATIONS.has(activeMutation) ? activeMutationTargetId : null;

  const renderLoading = () => (
    <View className="flex-1 items-center justify-center p-8">
      <Spinner size="large" />
      <Text className="mt-4 text-gray-600 dark:text-gray-400">{t('shifts.loading')}</Text>
    </View>
  );

  const renderError = () => (
    <ZeroState heading={t('shifts.load_error')} description={error ?? ''} isError={true}>
      <Button onPress={handleRefresh} className="mt-4" testID="shifts-retry">
        <ButtonText>{t('common.retry')}</ButtonText>
      </Button>
    </ZeroState>
  );

  const renderSearchBar = () => (
    <View className="px-4 pb-1 pt-3">
      <Input variant="outline" size="md" className="rounded-lg bg-white dark:bg-gray-800">
        <InputSlot className="pl-3">
          <InputIcon as={Search} />
        </InputSlot>
        <InputField placeholder={t('shifts.search_placeholder')} value={searchQuery} onChangeText={handleSearchChange} accessibilityLabel={t('shifts.search_placeholder')} testID="shifts-search-input" />
        {searchQuery ? (
          <InputSlot className="pr-3" onPress={handleClearSearch} accessibilityRole="button" accessibilityLabel={t('common.clear_search')} testID="clear-search-button">
            <InputIcon as={X} />
          </InputSlot>
        ) : null}
      </Input>
    </View>
  );

  const renderToday = () => {
    if (isTodaysLoading && todaysShiftDays.length === 0) return renderLoading();
    if (error && todaysShiftDays.length === 0) return renderError();
    return (
      <FlatList
        data={filteredToday}
        keyExtractor={shiftDayKeyExtractor}
        renderItem={renderShiftDayItem}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={isTodaysLoading} onRefresh={handleRefresh} />}
        ListEmptyComponent={<ZeroState heading={t('shifts.no_shifts_today')} description={t('shifts.no_shifts_today_description')} />}
        removeClippedSubviews={true}
        testID="shifts-today-list"
      />
    );
  };

  const renderMine = () => {
    if (isMyShiftsLoading && myShiftDays.length === 0) return renderLoading();
    if (error && myShiftDays.length === 0) return renderError();
    return (
      <FlatList
        data={mineItems}
        keyExtractor={dayListKeyExtractor}
        renderItem={renderDayListItem}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={isMyShiftsLoading} onRefresh={handleRefresh} />}
        ListHeaderComponent={
          <VStack className="mb-2" space="sm">
            {calendarReadyDays.length > 0 ? (
              <Button variant="outline" action="primary" onPress={handleAddAllToCalendar} isDisabled={isExporting} accessibilityHint={t('shifts.calendar_export.add_all_hint')} testID="shifts-add-all-calendar">
                {isExporting ? <ButtonSpinner /> : <CalendarPlus size={16} color={colorScheme === 'dark' ? '#93c5fd' : '#2563eb'} />}
                <ButtonText>{t('shifts.calendar_export.add_all', { count: calendarReadyDays.length })}</ButtonText>
              </Button>
            ) : null}
            {myStandingShifts.length > 0 ? (
              <VStack>
                <Text className="mb-2 text-sm font-semibold uppercase text-gray-500 dark:text-gray-400" accessibilityRole="header">
                  {t('shifts.my_standing_shifts')}
                </Text>
                {myStandingShifts.map((shift) => (
                  <ShiftCard key={shift.ShiftId} shift={shift} onPress={handleShiftPress} />
                ))}
              </VStack>
            ) : null}
          </VStack>
        }
        ListEmptyComponent={<ZeroState heading={t('shifts.empty.mine_title')} description={t('shifts.empty.mine_description')} />}
        removeClippedSubviews={true}
        testID="shifts-mine-list"
      />
    );
  };

  const renderSignup = () => {
    if (isSignupDaysLoading && signupDays.length === 0) return renderLoading();
    if (error && signupDays.length === 0) return renderError();
    return (
      <FlatList
        data={visibleSignupDays}
        keyExtractor={shiftDayKeyExtractor}
        renderItem={renderShiftDayItem}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={isSignupDaysLoading} onRefresh={handleRefresh} />}
        ListHeaderComponent={
          <VStack space="xs" className="mb-2">
            <Text className="text-sm text-gray-600 dark:text-gray-400">{t('shifts.signup_view.description')}</Text>
            <HStack className="pt-1" accessibilityRole="tablist">
              <CalendarFilterChip id="needed" label={t('shifts.signup_view.filter_needed')} isActive={signupFilter === 'needed'} onSelect={handleSignupFilterNeeded} />
              <CalendarFilterChip id="all" label={t('shifts.signup_view.filter_all')} isActive={signupFilter === 'all'} onSelect={handleSignupFilterAll} />
            </HStack>
          </VStack>
        }
        ListEmptyComponent={<ZeroState heading={t('shifts.empty.signup_title')} description={t('shifts.empty.signup_description')} />}
        removeClippedSubviews={true}
        testID="shifts-signup-list"
      />
    );
  };

  const renderCalendar = () => (
    <FlatList
      data={daysForSelectedDate}
      keyExtractor={shiftDayKeyExtractor}
      renderItem={renderCalendarDayItem}
      contentContainerStyle={styles.calendarContent}
      refreshControl={<RefreshControl refreshing={isCalendarLoading} onRefresh={handleRefresh} />}
      ListHeaderComponent={
        <VStack space="sm">
          <HStack className="items-center pr-4">
            <ScrollView horizontal={true} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} accessibilityLabel={t('shifts.calendar_view.filter_a11y')}>
              <CalendarFilterChip id={null} label={t('shifts.all_shifts')} isActive={calendarShiftId === null} onSelect={handleCalendarFilter} />
              {shifts.map((shift) => (
                <CalendarFilterChip key={shift.ShiftId} id={shift.ShiftId} label={shift.Name} isActive={calendarShiftId === shift.ShiftId} onSelect={handleCalendarFilter} />
              ))}
            </ScrollView>
            {calendarShiftId ? (
              <Pressable onPress={handleShowFilteredShiftInfo} accessibilityRole="button" accessibilityLabel={t('shifts.calendar_view.shift_info')} testID="shifts-calendar-shift-info" className="p-2">
                <Info size={20} color={colorScheme === 'dark' ? '#93c5fd' : '#2563eb'} />
              </Pressable>
            ) : null}
          </HStack>
          <ShiftCalendarView month={calendarMonth} days={calendarDays} selectedDate={selectedDate} isLoading={isCalendarLoading} onMonthChange={handleMonthChange} onSelectDate={setSelectedDate} />
          {selectedDate ? (
            <Text className="px-4 text-base font-semibold text-gray-900 dark:text-white" accessibilityRole="header">
              {formatShiftLongDate(selectedDate)}
            </Text>
          ) : null}
        </VStack>
      }
      ListEmptyComponent={
        <Text className="px-4 py-6 text-center text-gray-500 dark:text-gray-400" testID="shifts-calendar-empty">
          {selectedDate ? t('shifts.empty.calendar_day') : t('shifts.calendar_view.select_day')}
        </Text>
      }
      testID="shifts-calendar-list"
    />
  );

  const renderContent = () => {
    switch (activeView) {
      case 'mine':
        return renderMine();
      case 'signup':
        return renderSignup();
      case 'calendar':
        return renderCalendar();
      case 'trades':
        return (isTradesLoading || isOpenTradesLoading) && trades.length === 0 && openTrades.length === 0 ? (
          renderLoading()
        ) : (
          <ShiftTradesList
            trades={trades}
            openTrades={openTrades}
            filter={tradesFilter}
            onFilterChange={handleTradesFilter}
            isLoading={isTradesLoading || isOpenTradesLoading}
            busyTradeId={busyTradeId}
            onRefresh={handleRefresh}
            onAction={handleTradeAction}
            onOpenDetails={handleOpenTradeDetails}
          />
        );
      case 'approvals':
        return isApprovalsLoading && pendingSignups.length + pendingTrades.length === 0 ? (
          renderLoading()
        ) : (
          <ShiftApprovalsList signups={pendingSignups} trades={pendingTrades} isLoading={isApprovalsLoading} onRefresh={handleRefresh} onAction={handleSheetAction} onOpenTradeDetails={handleOpenTradeDetails} />
        );
      case 'onduty':
        return isOnDutyLoading && onDutyPersonnel.length === 0 ? renderLoading() : <ShiftOnDutyList personnel={onDutyPersonnel} isLoading={isOnDutyLoading} onRefresh={handleRefresh} />;
      case 'today':
      default:
        return renderToday();
    }
  };

  const showSearch = activeView === 'today' || activeView === 'mine' || activeView === 'signup';

  return (
    <>
      <Stack.Screen options={{ title: shiftsTitle, headerShown: true }} />
      <View className="flex-1 bg-gray-50 dark:bg-gray-900" testID="shifts-screen">
        <FocusAwareStatusBar />
        <ShiftSegmentBar segments={segments} active={activeView} onChange={handleSegmentChange} />
        {showSearch ? renderSearchBar() : null}
        <View className="flex-1 pt-2">{renderContent()}</View>

        <ShiftDetailsSheet isOpen={isShiftDetailsOpen} onClose={closeShiftDetails} onViewCalendar={handleViewCalendar} />
        <ShiftDayDetailsSheet isOpen={isShiftDayDetailsOpen} onClose={closeShiftDayDetails} />
        <ShiftTradeDetailsSheet isOpen={isTradeDetailsOpen} onClose={closeTradeDetails} onAction={handleTradeAction} />
        <ShiftActionSheet action={sheetAction} onClose={handleCloseActionSheet} />
      </View>
    </>
  );
};

export default React.memo(ShiftsScreen);

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  calendarContent: {
    paddingBottom: 24,
  },
  chips: {
    paddingLeft: 16,
    paddingRight: 8,
    paddingVertical: 4,
  },
});
