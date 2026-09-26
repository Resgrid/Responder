import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';

import ZeroState from '@/components/common/zero-state';
import { Button, ButtonText } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FlatList } from '@/components/ui/flat-list';
import { HStack } from '@/components/ui/hstack';
import { RefreshControl } from '@/components/ui/refresh-control';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { formatShiftDate, formatShiftTime } from '@/lib/shift-utils';
import { type PendingShiftSignupResultData } from '@/models/v4/shifts/pendingShiftSignupResultData';
import { type ShiftTradeResultData } from '@/models/v4/shifts/shiftTradeResultData';

import { type ShiftSheetAction } from './shift-action-sheet';
import { type ShiftTradeAction, ShiftTradeCard } from './shift-trade-card';

interface ShiftApprovalsListProps {
  signups: PendingShiftSignupResultData[];
  trades: ShiftTradeResultData[];
  isLoading: boolean;
  onRefresh: () => void;
  onAction: (action: ShiftSheetAction) => void;
}

type ApprovalItem = { type: 'header'; key: string; title: string } | { type: 'signup'; key: string; signup: PendingShiftSignupResultData } | { type: 'trade'; key: string; trade: ShiftTradeResultData };

interface PendingSignupCardProps {
  signup: PendingShiftSignupResultData;
  onAction: (action: ShiftSheetAction) => void;
}

const formatRequestedAt = (value: string): string => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
};

export const PendingSignupCard: React.FC<PendingSignupCardProps> = React.memo(({ signup, onAction }) => {
  const { t } = useTranslation();
  const handleApprove = useCallback(() => onAction({ kind: 'review-signup', signup, approve: true }), [onAction, signup]);
  const handleDeny = useCallback(() => onAction({ kind: 'review-signup', signup, approve: false }), [onAction, signup]);
  const roles = (signup.Roles ?? []).join(', ');

  return (
    <Card className="mb-3 bg-white p-4 shadow-xs dark:bg-gray-800" testID={`pending-signup-${signup.ShiftSignupId}`}>
      <VStack space="xs">
        <Text className="text-base font-semibold text-gray-900 dark:text-white">{signup.UserName}</Text>
        <Text className="text-sm text-gray-700 dark:text-gray-300">
          {signup.ShiftName} · {signup.GroupName}
        </Text>
        <Text className="text-sm text-gray-600 dark:text-gray-400">
          {formatShiftDate(signup.ShiftDay || signup.Start)} · {formatShiftTime(signup.Start)} – {formatShiftTime(signup.End)}
        </Text>
        {roles ? <Text className="text-xs text-gray-600 dark:text-gray-400">{roles}</Text> : null}
        {signup.SignupTimestamp ? <Text className="text-xs text-gray-500 dark:text-gray-400">{t('shifts.review.requested_at', { date: formatRequestedAt(signup.SignupTimestamp) })}</Text> : null}
        <HStack space="sm" className="mt-2">
          <Button size="sm" action="positive" onPress={handleApprove} accessibilityLabel={t('shifts.review.approve_person', { name: signup.UserName })} testID={`pending-signup-approve-${signup.ShiftSignupId}`}>
            <ButtonText>{t('shifts.actions.approve')}</ButtonText>
          </Button>
          <Button size="sm" action="negative" variant="outline" onPress={handleDeny} accessibilityLabel={t('shifts.review.deny_person', { name: signup.UserName })} testID={`pending-signup-deny-${signup.ShiftSignupId}`}>
            <ButtonText>{t('shifts.actions.deny')}</ButtonText>
          </Button>
        </HStack>
      </VStack>
    </Card>
  );
});

PendingSignupCard.displayName = 'PendingSignupCard';

const keyExtractor = (item: ApprovalItem) => item.key;

export const ShiftApprovalsList: React.FC<ShiftApprovalsListProps> = ({ signups, trades, isLoading, onRefresh, onAction }) => {
  const { t } = useTranslation();

  const items = useMemo<ApprovalItem[]>(() => {
    const list: ApprovalItem[] = [];
    if (signups.length > 0) {
      list.push({ type: 'header', key: 'header-signups', title: t('shifts.approvals.signups') });
      signups.forEach((signup) => list.push({ type: 'signup', key: `signup-${signup.ShiftSignupId}`, signup }));
    }
    if (trades.length > 0) {
      list.push({ type: 'header', key: 'header-trades', title: t('shifts.approvals.trades') });
      trades.forEach((trade) => list.push({ type: 'trade', key: `trade-${trade.ShiftSignupTradeId}`, trade }));
    }
    return list;
  }, [signups, trades, t]);

  const handleTradeAction = useCallback((action: ShiftTradeAction) => onAction(action), [onAction]);

  const renderItem = useCallback(
    ({ item }: { item: ApprovalItem }) => {
      if (item.type === 'header') {
        return (
          <Text className="mb-2 mt-2 text-sm font-semibold uppercase text-gray-500 dark:text-gray-400" accessibilityRole="header">
            {item.title}
          </Text>
        );
      }
      if (item.type === 'signup') {
        return <PendingSignupCard signup={item.signup} onAction={onAction} />;
      }
      return <ShiftTradeCard trade={item.trade} onAction={handleTradeAction} />;
    },
    [onAction, handleTradeAction]
  );

  return (
    <FlatList
      data={items}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      contentContainerStyle={styles.listContent}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={onRefresh} />}
      ListEmptyComponent={<ZeroState heading={t('shifts.empty.approvals_title')} description={t('shifts.empty.approvals_description')} />}
      removeClippedSubviews={true}
      testID="shift-approvals-list"
    />
  );
};

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
});
