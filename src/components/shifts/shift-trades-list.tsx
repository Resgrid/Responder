import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';

import ZeroState from '@/components/common/zero-state';
import { FlatList } from '@/components/ui/flat-list';
import { RefreshControl } from '@/components/ui/refresh-control';
import { Text } from '@/components/ui/text';
import { ShiftTradeDirection, ShiftTradeStatus, ShiftTradeUserState } from '@/models/v4/shifts/shiftEnums';
import { type ShiftTradeResultData } from '@/models/v4/shifts/shiftTradeResultData';

import { type ShiftTradeAction, ShiftTradeCard } from './shift-trade-card';

interface ShiftTradesListProps {
  trades: ShiftTradeResultData[];
  isLoading: boolean;
  busyTradeId: string | null;
  onRefresh: () => void;
  onAction: (action: ShiftTradeAction) => void;
}

type TradeItem = { type: 'header'; key: string; title: string } | { type: 'trade'; key: string; trade: ShiftTradeResultData };

/** Trades that need something from the caller come first: an answer, a pick, or a review. */
const needsAttention = (trade: ShiftTradeResultData): boolean => {
  if (trade.CanReview) return true;
  if (trade.Status !== ShiftTradeStatus.Open) return false;
  if (trade.Direction === ShiftTradeDirection.Incoming) return trade.MyState === ShiftTradeUserState.Open;
  return (trade.Users ?? []).some((user) => user.Offered && !user.Declined);
};

const isActiveTrade = (trade: ShiftTradeResultData): boolean => trade.Status === ShiftTradeStatus.Open || trade.Status === ShiftTradeStatus.PendingApproval;

const keyExtractor = (item: TradeItem) => item.key;

export const ShiftTradesList: React.FC<ShiftTradesListProps> = ({ trades, isLoading, busyTradeId, onRefresh, onAction }) => {
  const { t } = useTranslation();

  const items = useMemo<TradeItem[]>(() => {
    const attention = trades.filter(needsAttention);
    const active = trades.filter((trade) => !needsAttention(trade) && isActiveTrade(trade));
    const recent = trades.filter((trade) => !needsAttention(trade) && !isActiveTrade(trade));

    const list: TradeItem[] = [];
    const addSection = (key: string, title: string, section: ShiftTradeResultData[]) => {
      if (section.length === 0) return;
      list.push({ type: 'header', key: `header-${key}`, title });
      section.forEach((trade) => list.push({ type: 'trade', key: `trade-${trade.ShiftSignupTradeId}`, trade }));
    };
    addSection('attention', t('shifts.trade.section_attention'), attention);
    addSection('active', t('shifts.trade.section_active'), active);
    addSection('recent', t('shifts.trade.section_recent'), recent);
    return list;
  }, [trades, t]);

  const renderItem = useCallback(
    ({ item }: { item: TradeItem }) => {
      if (item.type === 'header') {
        return (
          <Text className="mb-2 mt-2 text-sm font-semibold uppercase text-gray-500 dark:text-gray-400" accessibilityRole="header">
            {item.title}
          </Text>
        );
      }
      return <ShiftTradeCard trade={item.trade} onAction={onAction} isBusy={busyTradeId === item.trade.ShiftSignupTradeId} />;
    },
    [onAction, busyTradeId]
  );

  return (
    <FlatList
      data={items}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      extraData={busyTradeId}
      contentContainerStyle={styles.listContent}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={onRefresh} />}
      ListEmptyComponent={<ZeroState heading={t('shifts.empty.trades_title')} description={t('shifts.empty.trades_description')} />}
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
