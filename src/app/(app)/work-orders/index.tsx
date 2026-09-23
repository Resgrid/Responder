import { type Href, Redirect, Stack, useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshControl, ScrollView } from 'react-native';

import { Button, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Pressable } from '@/components/ui/pressable';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { isOpen } from '@/lib/workOrders/status';
import { WorkOrderPriority } from '@/models/v4/workOrders';
import { useWorkOrdersStatus } from '@/stores/feature-flags/store';
import { useWorkOrdersStore } from '@/stores/workOrders/store';

// Work orders the person reported or that are assigned to them or their roles (Maintenance.WorkOrders).
// Reporting a problem needs the department's Readiness Pro maintenance; reading never does.
export default function WorkOrdersScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const flagStatus = useWorkOrdersStatus();
  const { access, assignedToMe, items, hasMore, canWrite, busy, error } = useWorkOrdersStore();

  useFocusEffect(
    useCallback(() => {
      if (flagStatus === 'enabled') void useWorkOrdersStore.getState().load();
    }, [flagStatus])
  );

  if (flagStatus === 'disabled') return <Redirect href="/(app)/home" />;

  return (
    <VStack className="flex-1 bg-background-0">
      <Stack.Screen options={{ title: t('workOrders.title') }} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} refreshControl={<RefreshControl refreshing={busy} onRefresh={() => void useWorkOrdersStore.getState().load()} />}>
        <HStack className="items-center justify-between">
          <Text className="text-xl font-bold">{t('workOrders.title')}</Text>
          {canWrite ? (
            <Button size="sm" onPress={() => router.push('/work-orders/new' as Href)} testID="work-orders-report">
              <ButtonText>{t('workOrders.report')}</ButtonText>
            </Button>
          ) : null}
        </HStack>
        {flagStatus === 'unknown' ? <Spinner /> : null}
        {access && !access.MaintenanceEnabled ? <Text className="text-typography-500">{t('workOrders.readOnly', { product: access.ProductName ?? 'Readiness Pro' })}</Text> : null}
        {error ? (
          <Text accessibilityRole="alert" className="text-error-600">
            {t(`workOrders.errors.${error}`, { defaultValue: t('workOrders.errors.retry') })}
          </Text>
        ) : null}
        <HStack space="sm">
          <Button variant={assignedToMe ? 'solid' : 'outline'} size="sm" onPress={() => void useWorkOrdersStore.getState().load(true)} testID="work-orders-assigned">
            <ButtonText>{t('workOrders.assignedToMe')}</ButtonText>
          </Button>
          <Button variant={assignedToMe ? 'outline' : 'solid'} size="sm" onPress={() => void useWorkOrdersStore.getState().load(false)} testID="work-orders-all">
            <ButtonText>{t('workOrders.allMine')}</ButtonText>
          </Button>
        </HStack>
        {!busy && items.length === 0 ? <Text className="text-typography-500">{assignedToMe ? t('workOrders.noneAssigned') : t('workOrders.none')}</Text> : null}
        {items.map((item) => (
          <Pressable key={item.Id} onPress={() => router.push(`/work-orders/${item.Id}` as Href)} testID={`work-order-${item.Id}`} className="rounded-lg border border-outline-200 p-3">
            <HStack className="items-center justify-between">
              <Text className="flex-1 font-semibold">{item.Title}</Text>
              <Text className={isOpen(item.Status) ? 'text-primary-600' : 'text-typography-500'}>{t(`workOrders.status.${item.Status}`)}</Text>
            </HStack>
            <Text className="text-typography-500">
              {item.Number} · {t(`workOrders.priority.${item.Priority}`)}
              {item.Priority >= WorkOrderPriority.High ? ' !' : ''}
              {item.DueOn ? ` · ${t('workOrders.due', { date: String(item.DueOn).slice(0, 10) })}` : ''}
            </Text>
          </Pressable>
        ))}
        {hasMore ? (
          <Button variant="outline" onPress={() => void useWorkOrdersStore.getState().loadMore()} isDisabled={busy} testID="work-orders-more">
            <ButtonText>{t('workOrders.more')}</ButtonText>
          </Button>
        ) : null}
      </ScrollView>
    </VStack>
  );
}
