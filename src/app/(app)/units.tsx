import { Search, Truck, X } from 'lucide-react-native';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, RefreshControl, View } from 'react-native';

import { Loading } from '@/components/common/loading';
import ZeroState from '@/components/common/zero-state';
import { UnitCard } from '@/components/units/unit-card';
import { UnitDetailsSheet } from '@/components/units/unit-details-sheet';
import { Box } from '@/components/ui/box';
import { FocusAwareStatusBar } from '@/components/ui/focus-aware-status-bar';
import { Input } from '@/components/ui/input';
import { InputField, InputIcon, InputSlot } from '@/components/ui/input';
import { useUnitsStore } from '@/stores/units/store';

export default function Units() {
  const { t } = useTranslation();
  const { units, searchQuery, setSearchQuery, selectUnit, isLoading, fetchUnits } = useUnitsStore();
  const [refreshing, setRefreshing] = React.useState(false);

  React.useEffect(() => {
    fetchUnits();
  }, [fetchUnits]);

  const handleRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await fetchUnits();
    setRefreshing(false);
  }, [fetchUnits]);

  const filteredUnits = React.useMemo(() => {
    if (!searchQuery.trim()) return units;

    const query = searchQuery.toLowerCase();
    return units.filter(
      (unit) =>
        unit.Name.toLowerCase().includes(query) ||
        unit.Type.toLowerCase().includes(query) ||
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
          <Input className="mb-4 rounded-lg bg-white dark:bg-gray-800" size="md" variant="outline">
            <InputSlot className="pl-3">
              <InputIcon as={Search} />
            </InputSlot>
            <InputField placeholder={t('units.search')} value={searchQuery} onChangeText={setSearchQuery} />
            {searchQuery ? (
              <InputSlot className="pr-3" onPress={() => setSearchQuery('')}>
                <InputIcon as={X} />
              </InputSlot>
            ) : null}
          </Input>

          {isLoading && !refreshing ? (
            <Loading />
          ) : filteredUnits.length > 0 ? (
            <FlatList
              data={filteredUnits}
              keyExtractor={(item, index) => item.UnitId || `unit-${index}`}
              renderItem={({ item }) => <UnitCard unit={item} onPress={selectUnit} />}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 100 }}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
            />
          ) : (
            <ZeroState icon={Truck} heading={t('units.empty')} description={t('units.emptyDescription')} />
          )}
        </Box>

        <UnitDetailsSheet />
      </View>
    </>
  );
} 