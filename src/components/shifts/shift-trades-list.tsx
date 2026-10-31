import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';

import ZeroState from '@/components/common/zero-state';
import { FlatList } from '@/components/ui/flat-list';
import { HStack } from '@/components/ui/hstack';
import { Pressable } from '@/components/ui/pressable';
import { RefreshControl } from '@/components/ui/refresh-control';
import { Text } from '@/components/ui/text';
import { ShiftTradeStatus, ShiftTradeUserState } from '@/models/v4/shifts/shiftEnums';
import { type ShiftTradeResultData } from '@/models/v4/shifts/shiftTradeResultData';
import { type ShiftTradesFilter } from '@/stores/shifts/store';

import { canPickTrade, canRespondToTrade, type ShiftTradeAction, ShiftTradeCard } from './shift-trade-card';

interface ShiftTradesListProps {
  trades: ShiftTradeResultData[];
  /** Open requests in the department. Without them the list shows only the caller's own trades. */
  openTrades?: ShiftTradeResultData[];
  filter?: ShiftTradesFilter;
  onFilterChange?: (filter: ShiftTradesFilter) => void;
  isLoading: boolean;
  busyTradeId: string | null;
  onRefresh: () => void;
  onAction: (action: ShiftTradeAction) => void;
  onOpenDetails?: (trade: ShiftTradeResultData) => void;
}

type TradeItem = { type: 'header'; key: string; title: string } | { type: 'trade'; key: string; trade: ShiftTradeResultData };

/** Trades that need something from the caller come first: an answer, a pick, or a review. */
const needsAttention = (trade: ShiftTradeResultData): boolean => {
  if (trade.CanReview) return true;
  if (trade.Status !== ShiftTradeStatus.Open) return false;
  if (canRespondToTrade(trade)) return true;
  return canPickTrade(trade) && (trade.Users ?? []).some((user) => user.Offered && !user.Declined);
};

const isActiveTrade = (trade: ShiftTradeResultData): boolean => trade.Status === ShiftTradeStatus.Open || trade.Status === ShiftTradeStatus.PendingApproval;

const keyExtractor = (item: TradeItem) => item.key;

interface FilterChipProps {
  value: ShiftTradesFilter;
  label: string;
  isActive: boolean;
  onSelect: (value: ShiftTradesFilter) => void;
}

const FilterChip: React.FC<FilterChipProps> = React.memo(({ value, label, isActive, onSelect }) => {
  const handlePress = useCallback(() => onSelect(value), [onSelect, value]);
  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="tab"
      accessibilityState={{ selected: isActive }}
      testID={`trades-filter-${value}`}
      className={`mr-2 rounded-full border px-3 py-1.5 ${isActive ? 'border-primary-600 bg-primary-100 dark:bg-primary-100/40' : 'border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-800'}`}
    >
      <Text className={`text-xs font-medium ${isActive ? 'text-primary-700' : 'text-gray-700 dark:text-gray-300'}`}>{label}</Text>
    </Pressable>
  );
});

FilterChip.displayName = 'FilterChip';

export const ShiftTradesList: React.FC<ShiftTradesListProps> = ({ trades, openTrades, filter = 'mine', onFilterChange, isLoading, busyTradeId, onRefresh, onAction, onOpenDetails }) => {
  const { t } = useTranslation();
  const showOpen = openTrades !== undefined && filter === 'open';

  const items = useMemo<TradeItem[]>(() => {
    const list: TradeItem[] = [];
    const addSection = (key: string, title: string, section: ShiftTradeResultData[]) => {
      if (section.length === 0) return;
      list.push({ type: 'header', key: `header-${key}`, title });
      section.forEach((trade) => list.push({ type: 'trade', key: `trade-${trade.ShiftSignupTradeId}`, trade }));
    };

    if (showOpen) {
      // What the caller can still do comes first: apply, then the offers they made, then everything else.
      const open = openTrades ?? [];
      const canApply = open.filter((trade) => trade.CanApply);
      const applied = open.filter((trade) => !trade.CanApply && trade.MyState === ShiftTradeUserState.Proposed);
      const others = open.filter((trade) => !trade.CanApply && trade.MyState !== ShiftTradeUserState.Proposed);
      addSection('can-apply', t('shifts.trade.section_can_apply'), canApply);
      addSection('applied', t('shifts.trade.section_applied'), applied);
      addSection('others', t('shifts.trade.section_other_requests'), others);
      return list;
    }

    const attention = trades.filter(needsAttention);
    const active = trades.filter((trade) => !needsAttention(trade) && isActiveTrade(trade));
    const recent = trades.filter((trade) => !needsAttention(trade) && !isActiveTrade(trade));
    addSection('attention', t('shifts.trade.section_attention'), attention);
    addSection('active', t('shifts.trade.section_active'), active);
    addSection('recent', t('shifts.trade.section_recent'), recent);
    return list;
  }, [trades, openTrades, showOpen, t]);

  const renderItem = useCallback(
    ({ item }: { item: TradeItem }) => {
      if (item.type === 'header') {
        return (
          <Text className="mb-2 mt-2 text-sm font-semibold uppercase text-gray-500 dark:text-gray-400" accessibilityRole="header">
            {item.title}
          </Text>
        );
      }
      return <ShiftTradeCard trade={item.trade} onAction={onAction} onOpenDetails={onOpenDetails} isBusy={busyTradeId === item.trade.ShiftSignupTradeId} />;
    },
    [onAction, onOpenDetails, busyTradeId]
  );

  const header =
    openTrades !== undefined && onFilterChange ? (
      <HStack className="pb-2 pt-1" accessibilityRole="tablist">
        <FilterChip value="open" label={t('shifts.trade.filter_open', { count: openTrades.length })} isActive={filter === 'open'} onSelect={onFilterChange} />
        <FilterChip value="mine" label={t('shifts.trade.filter_mine', { count: trades.length })} isActive={filter === 'mine'} onSelect={onFilterChange} />
      </HStack>
    ) : null;

  const empty = showOpen ? (
    <ZeroState heading={t('shifts.empty.open_trades_title')} description={t('shifts.empty.open_trades_description')} />
  ) : (
    <ZeroState heading={t('shifts.empty.trades_title')} description={t('shifts.empty.trades_description')} />
  );

  return (
    <FlatList
      data={items}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      extraData={busyTradeId}
      contentContainerStyle={styles.listContent}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={onRefresh} />}
      ListHeaderComponent={header}
      ListEmptyComponent={empty}
      removeClippedSubviews={true}
      testID="shift-trades-list"
    />
  );
};

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
});
