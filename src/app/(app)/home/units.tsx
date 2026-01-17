import { useFocusEffect } from '@react-navigation/native';
import { FlashList } from '@shopify/flash-list';
import { Filter, Search, Truck, X } from 'lucide-react-native';
import * as React from 'react';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Loading } from '@/components/common/loading';
import ZeroState from '@/components/common/zero-state';
import { Badge } from '@/components/ui/badge';
import { Box } from '@/components/ui/box';
import { Button } from '@/components/ui/button';
import { FocusAwareStatusBar } from '@/components/ui/focus-aware-status-bar';
import { HStack } from '@/components/ui/hstack';
import { Input } from '@/components/ui/input';
import { InputField, InputIcon, InputSlot } from '@/components/ui/input';
import { RefreshControl } from '@/components/ui/refresh-control';
import { Text } from '@/components/ui/text';
import { UnitCard } from '@/components/units/unit-card';
import { UnitDetailsSheet } from '@/components/units/unit-details-sheet';
import { UnitsFilterSheet } from '@/components/units/units-filter-sheet';
import { useAnalytics } from '@/hooks/use-analytics';
import { useUnitsStore } from '@/stores/units/store';

export default function Units() {
  const { t } = useTranslation();
  const { units, unitTypeStatuses, searchQuery, setSearchQuery, selectUnit, isLoading, fetchUnits, selectedFilters, openFilterSheet } = useUnitsStore();
  const { trackEvent } = useAnalytics();
  const [refreshing, setRefreshing] = React.useState(false);

  React.useEffect(() => {
    fetchUnits();
  }, [fetchUnits]);

  // Track analytics when view becomes visible
  useFocusEffect(
    React.useCallback(() => {
      trackEvent('units_viewed', {
        timestamp: new Date().toISOString(),
      });
    }, [trackEvent])
  );

  const handleRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await fetchUnits();
    setRefreshing(false);
  }, [fetchUnits]);

  const renderUnitItem = useCallback(({ item }: { item: any }) => <UnitCard unit={item} unitTypeStatuses={unitTypeStatuses} onPress={selectUnit} />, [unitTypeStatuses, selectUnit]);

  const filteredUnits = React.useMemo(() => {
    if (!searchQuery.trim()) return units;

    const query = searchQuery.toLowerCase();
    return units.filter(
      (unit) =>
        unit.Name?.toLowerCase().includes(query) ||
        unit.Type?.toLowerCase().includes(query) ||
        unit.PlateNumber?.toLowerCase().includes(query) ||
        unit.Vin?.toLowerCase().includes(query) ||
        unit.GroupName?.toLowerCase().includes(query)
    );
  }, [units, searchQuery]);

  return (
    <>
      <View className="flex-1 bg-gray-50 dark:bg-gray-900">
        <FocusAwareStatusBar />
        <Box className="flex-1 px-4 pt-4">
          <HStack className="mb-4" space="sm">
            <Input className="flex-1 rounded-lg bg-white dark:bg-gray-800" size="md" variant="outline">
              <InputSlot className="pl-3">
                <InputIcon as={Search} />
              </InputSlot>
              <InputField placeholder={t('units.search')} value={searchQuery} onChangeText={setSearchQuery} />
              {searchQuery ? (
                <InputSlot className="pr-3" onPress={() => setSearchQuery('')} testID="clear-search">
                  <InputIcon as={X} />
                </InputSlot>
              ) : null}
            </Input>
            <Button onPress={openFilterSheet} className="h-10 rounded-lg bg-white dark:bg-gray-800" variant="outline" testID="filter-button">
              <HStack className="items-center" space="xs">
                <Filter size={20} className="text-gray-600 dark:text-gray-400" />
                {selectedFilters.length > 0 && (
                  <Badge size="sm" variant="solid" className="bg-blue-500">
                    <Text className="text-xs text-white">{selectedFilters.length}</Text>
                  </Badge>
                )}
              </HStack>
            </Button>
          </HStack>

          {isLoading && !refreshing ? (
            <Loading />
          ) : filteredUnits.length > 0 ? (
            <FlashList
              data={filteredUnits}
              keyExtractor={(item, index) => item.UnitId || `unit-${index}`}
              renderItem={renderUnitItem}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 100 }}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
            />
          ) : (
            <ZeroState icon={Truck} heading={t('units.empty')} description={t('units.emptyDescription')} />
          )}
        </Box>

        <UnitDetailsSheet />
        <UnitsFilterSheet />
      </View>
    </>
  );
}
