import { type Href, Stack, useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshControl, ScrollView } from 'react-native';

import { Button, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { expiryTone } from '@/lib/certifications/format';
import { useCertificationsStore } from '@/stores/certifications/store';

// "My certifications" (Workforce plan Phase D, free): what the member holds, soonest expiry first, with
// the continuing-education hours toward each renewal. Adding one is the member's; verifying is the department's.
export default function CertificationsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { items, busy, error } = useCertificationsStore();

  useFocusEffect(
    useCallback(() => {
      void useCertificationsStore.getState().load();
    }, [])
  );

  return (
    <VStack className="flex-1 bg-background-0">
      <Stack.Screen options={{ title: t('certifications.title') }} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} refreshControl={<RefreshControl refreshing={busy} onRefresh={() => void useCertificationsStore.getState().load()} />}>
        <HStack className="items-center justify-between">
          <Text className="text-xl font-bold">{t('certifications.title')}</Text>
          <Button size="sm" onPress={() => router.push('/certifications/edit' as Href)} testID="certifications-add">
            <ButtonText>{t('certifications.add')}</ButtonText>
          </Button>
        </HStack>
        {error ? (
          <Text accessibilityRole="alert" className="text-error-600">
            {t(`certifications.errors.${error}`, { defaultValue: t('certifications.errors.retry') })}
          </Text>
        ) : null}
        {!busy && items.length === 0 ? <Text className="text-typography-500">{t('certifications.none')}</Text> : null}
        {items.map((item) => (
          <Pressable key={item.Id} onPress={() => router.push(`/certifications/${item.Id}` as Href)} testID={`certification-${item.Id}`} className="rounded-lg border border-outline-200 p-3">
            <HStack className="items-center justify-between">
              <Text className="flex-1 font-semibold">{item.TypeName || item.Name || t('certifications.untitled')}</Text>
              <Text className="text-typography-500">{t(`certifications.status.${item.Status}`)}</Text>
            </HStack>
            {item.Number ? <Text className="text-typography-500">{t('certifications.numberIs', { number: item.Number })}</Text> : null}
            <Text className={expiryTone(item.DaysUntilExpiry, item.Status)}>
              {item.ExpiresOn
                ? item.DaysUntilExpiry != null && item.DaysUntilExpiry < 0
                  ? t('certifications.expired', { date: String(item.ExpiresOn).slice(0, 10) })
                  : t('certifications.expires', { date: String(item.ExpiresOn).slice(0, 10), days: item.DaysUntilExpiry ?? '' })
                : t('certifications.noExpiry')}
            </Text>
            {item.CreditHoursRequired ? <Text className="text-typography-500">{t('certifications.credits', { hours: item.CreditHours, required: item.CreditHoursRequired })}</Text> : null}
          </Pressable>
        ))}
      </ScrollView>
    </VStack>
  );
}
