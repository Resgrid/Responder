import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';

import ZeroState from '@/components/common/zero-state';
import { Badge, BadgeText } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { FlatList } from '@/components/ui/flat-list';
import { HStack } from '@/components/ui/hstack';
import { RefreshControl } from '@/components/ui/refresh-control';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { formatShiftTime } from '@/lib/shift-utils';
import { type OnDutyPersonResultData } from '@/models/v4/shifts/onDutyPersonResultData';

import { getRosterSourceLabel } from './shift-labels';

interface ShiftOnDutyListProps {
  personnel: OnDutyPersonResultData[];
  isLoading: boolean;
  onRefresh: () => void;
}

type OnDutyItem = { type: 'header'; key: string; title: string; subtitle: string; count: number } | { type: 'person'; key: string; person: OnDutyPersonResultData };

interface OnDutyPersonRowProps {
  person: OnDutyPersonResultData;
}

export const OnDutyPersonRow: React.FC<OnDutyPersonRowProps> = React.memo(({ person }) => {
  const { t } = useTranslation();
  const source = getRosterSourceLabel(person.Source);
  const details = [person.GroupName, (person.Roles ?? []).join(', ')].filter((part) => !!part).join(' · ');

  return (
    <Card className="mb-2 bg-white p-3 dark:bg-gray-800" testID={`on-duty-${person.ShiftDayId}-${person.UserId}`}>
      <HStack className="items-center justify-between" space="sm">
        <VStack className="flex-1">
          <Text className="text-sm font-semibold text-gray-900 dark:text-white">{person.Name}</Text>
          {details ? <Text className="text-xs text-gray-600 dark:text-gray-400">{details}</Text> : null}
          <Text className="text-xs text-gray-500 dark:text-gray-400">{t('shifts.on_duty.until', { time: formatShiftTime(person.End) })}</Text>
        </VStack>
        <Badge action={source.action} size="sm">
          <BadgeText>{t(source.key)}</BadgeText>
        </Badge>
      </HStack>
    </Card>
  );
});

OnDutyPersonRow.displayName = 'OnDutyPersonRow';

const keyExtractor = (item: OnDutyItem) => item.key;

export const ShiftOnDutyList: React.FC<ShiftOnDutyListProps> = ({ personnel, isLoading, onRefresh }) => {
  const { t } = useTranslation();

  // Grouped by shift day so a supervisor sees each running shift as one block.
  const items = useMemo<OnDutyItem[]>(() => {
    const byDay = new Map<string, OnDutyPersonResultData[]>();
    personnel.forEach((person) => {
      const key = person.ShiftDayId || person.ShiftId;
      byDay.set(key, [...(byDay.get(key) ?? []), person]);
    });

    const list: OnDutyItem[] = [];
    byDay.forEach((people, key) => {
      const first = people[0];
      if (!first) return;
      list.push({ type: 'header', key: `header-${key}`, title: first.ShiftName, subtitle: `${formatShiftTime(first.Start)} – ${formatShiftTime(first.End)}`, count: people.length });
      people.forEach((person) => list.push({ type: 'person', key: `person-${key}-${person.UserId}`, person }));
    });
    return list;
  }, [personnel]);

  const renderItem = useCallback(
    ({ item }: { item: OnDutyItem }) => {
      if (item.type === 'header') {
        return (
          <HStack className="mb-2 mt-3 items-center justify-between">
            <VStack>
              <Text className="text-base font-semibold text-gray-900 dark:text-white" accessibilityRole="header">
                {item.title}
              </Text>
              <Text className="text-xs text-gray-500 dark:text-gray-400">{item.subtitle}</Text>
            </VStack>
            <Text className="text-sm text-gray-700 dark:text-gray-300">{t('shifts.on_duty.count', { count: item.count })}</Text>
          </HStack>
        );
      }
      return <OnDutyPersonRow person={item.person} />;
    },
    [t]
  );

  return (
    <FlatList
      data={items}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      contentContainerStyle={styles.listContent}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={onRefresh} />}
      ListEmptyComponent={<ZeroState heading={t('shifts.empty.on_duty_title')} description={t('shifts.empty.on_duty_description')} />}
      removeClippedSubviews={true}
      testID="shift-on-duty-list"
    />
  );
};

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
});
