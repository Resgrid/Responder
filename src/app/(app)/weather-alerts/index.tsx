import { useRouter } from 'expo-router';
import { CloudOff, Search, X } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshControl, ScrollView } from 'react-native';

import { Box } from '@/components/ui/box';
import { FocusAwareStatusBar } from '@/components/ui/focus-aware-status-bar';
import { Input, InputField, InputIcon, InputSlot } from '@/components/ui/input';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { WeatherAlertCard } from '@/components/weather-alerts/weather-alert-card';
import { getWeatherAlertSeverityOrder, normalizeWeatherAlertSeverity } from '@/components/weather-alerts/weather-alert-formatters';
import { getWeatherAlertIdentity, getWeatherAlertKey } from '@/components/weather-alerts/weather-alert-list-utils';
import type { WeatherAlertResultData } from '@/models/v4/weatherAlerts/weatherAlertResultData';
import { useWeatherAlertsStore } from '@/stores/weather-alerts/weather-alerts-store';

type FilterKey = 'all' | 'Extreme' | 'Severe' | 'Moderate' | 'Minor';

interface WeatherAlertFilter {
  key: FilterKey;
  label: string;
}

export default function WeatherAlertsList() {
  const { t } = useTranslation();
  const router = useRouter();
  const { alerts, isLoading, fetchActiveAlerts } = useWeatherAlertsStore();
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchActiveAlerts();
  }, [fetchActiveAlerts]);

  const filteredAlerts = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    const base = activeFilter === 'all' ? alerts : alerts.filter((alert) => normalizeWeatherAlertSeverity(alert.Severity) === activeFilter);

    const searched =
      normalizedQuery.length === 0
        ? base
        : base.filter(
            (alert) =>
              (alert.Event?.toLowerCase() || '').includes(normalizedQuery) ||
              (alert.Title?.toLowerCase() || '').includes(normalizedQuery) ||
              (alert.Headline?.toLowerCase() || '').includes(normalizedQuery) ||
              (alert.AreaDescription?.toLowerCase() || '').includes(normalizedQuery)
          );

    return [...searched].sort((a, b) => getWeatherAlertSeverityOrder(a.Severity) - getWeatherAlertSeverityOrder(b.Severity));
  }, [alerts, activeFilter, searchQuery]);

  const handleAlertPress = useCallback(
    (alert: WeatherAlertResultData) => {
      const alertIdentity = getWeatherAlertIdentity(alert);
      if (alertIdentity.length > 0) {
        router.push(`/(app)/weather-alerts/${encodeURIComponent(alertIdentity)}` as never);
      }
    },
    [router]
  );

  const handleRefresh = useCallback(() => {
    fetchActiveAlerts();
  }, [fetchActiveAlerts]);

  const filters = useMemo<WeatherAlertFilter[]>(
    () => [
      { key: 'all', label: t('weatherAlerts.filter.all') },
      { key: 'Extreme', label: t('weatherAlerts.filter.extreme') },
      { key: 'Severe', label: t('weatherAlerts.filter.severe') },
      { key: 'Moderate', label: t('weatherAlerts.filter.moderate') },
      { key: 'Minor', label: t('weatherAlerts.filter.minor') },
    ],
    [t]
  );

  const EmptyState = useMemo(
    () => (
      <VStack className="flex-1 items-center justify-center p-8" space="md">
        <CloudOff size={48} color="#9CA3AF" />
        <Text className="text-center text-lg font-semibold text-gray-500 dark:text-gray-400">{t('weatherAlerts.noActiveAlerts')}</Text>
      </VStack>
    ),
    [t]
  );

  const handleFilterPress = useCallback((filter: FilterKey) => {
    setActiveFilter(filter);
  }, []);

  return (
    <VStack className="size-full flex-1 bg-gray-50 dark:bg-gray-900" testID="weather-alerts-list">
      <FocusAwareStatusBar />
      <Box className="px-4 pt-4">
        <Input className="mb-3 rounded-lg bg-white dark:bg-gray-800" size="md" variant="outline">
          <InputSlot className="pl-3">
            <InputIcon as={Search} />
          </InputSlot>
          <InputField placeholder={t('weatherAlerts.search')} value={searchQuery} onChangeText={setSearchQuery} />
          {searchQuery ? (
            <InputSlot className="pr-3" onPress={() => setSearchQuery('')}>
              <InputIcon as={X} />
            </InputSlot>
          ) : null}
        </Input>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4, paddingBottom: 8 }}>
          {filters.map((filter) => {
            const isActive = filter.key === activeFilter;

            return (
              <Pressable key={filter.key} className={isActive ? 'rounded-full bg-primary-500 px-3 py-1.5' : 'rounded-full bg-gray-100 px-3 py-1.5 dark:bg-gray-800'} onPress={() => handleFilterPress(filter.key)}>
                <Text className={isActive ? 'text-xs font-medium text-white' : 'text-xs font-medium text-gray-700 dark:text-gray-200'} numberOfLines={1}>
                  {filter.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </Box>
      <ScrollView
        className="flex-1"
        contentContainerStyle={filteredAlerts.length === 0 ? { flexGrow: 1, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 } : { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 }}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={handleRefresh} />}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="never"
      >
        {filteredAlerts.length === 0 ? EmptyState : filteredAlerts.map((alert, index) => <WeatherAlertCard key={getWeatherAlertKey(alert, index)} alert={alert} onPress={() => handleAlertPress(alert)} />)}
      </ScrollView>
    </VStack>
  );
}
