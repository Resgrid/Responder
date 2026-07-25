// Removed useFocusEffect to simplify analytics tracking on mount
import { FlashList } from '@shopify/flash-list';
import { Filter, Search, Users, X } from 'lucide-react-native';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Loading } from '@/components/common/loading';
import ZeroState from '@/components/common/zero-state';
import { PersonnelCard } from '@/components/personnel/personnel-card';
import { PersonnelDetailsSheet } from '@/components/personnel/personnel-details-sheet';
import { PersonnelFilterSheet } from '@/components/personnel/personnel-filter-sheet';
import { Badge } from '@/components/ui/badge';
import { Box } from '@/components/ui/box';
import { Button } from '@/components/ui/button';
import { FocusAwareStatusBar } from '@/components/ui/focus-aware-status-bar';
import { HStack } from '@/components/ui/hstack';
import { Input } from '@/components/ui/input';
import { InputField, InputIcon, InputSlot } from '@/components/ui/input';
import { RefreshControl } from '@/components/ui/refresh-control';
import { Text } from '@/components/ui/text';
import { useAnalytics } from '@/hooks/use-analytics';
import { type PersonnelInfoResultData } from '@/models/v4/personnel/personnelInfoResultData';
import { usePersonnelStore } from '@/stores/personnel/store';

type PersonnelListItem = PersonnelInfoResultData & { syntheticId: string };

const syntheticIds = new WeakMap<PersonnelInfoResultData, string>();
let nextSyntheticId = 0;

const normalizePersonnel = (personnel: PersonnelInfoResultData[]): PersonnelListItem[] =>
  personnel.map((person) => {
    let syntheticId = syntheticIds.get(person);
    if (!syntheticId) {
      syntheticId = `personnel-${++nextSyntheticId}`;
      syntheticIds.set(person, syntheticId);
    }

    return { ...person, syntheticId };
  });

export default function Personnel() {
  const { t } = useTranslation();
  const personnel = usePersonnelStore((state) => state.personnel);
  const searchQuery = usePersonnelStore((state) => state.searchQuery);
  const setSearchQuery = usePersonnelStore((state) => state.setSearchQuery);
  const selectPersonnel = usePersonnelStore((state) => state.selectPersonnel);
  const isLoading = usePersonnelStore((state) => state.isLoading);
  const fetchPersonnel = usePersonnelStore((state) => state.fetchPersonnel);
  const selectedFilters = usePersonnelStore((state) => state.selectedFilters);
  const openFilterSheet = usePersonnelStore((state) => state.openFilterSheet);
  const { trackEvent } = useAnalytics();
  const [refreshing, setRefreshing] = React.useState(false);

  React.useEffect(() => {
    // Fetch personnel and track view analytics on mount
    fetchPersonnel();
    trackEvent('personnel_viewed', {
      timestamp: new Date().toISOString(),
    });
  }, [fetchPersonnel, trackEvent]);
  const handleRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await fetchPersonnel();
    setRefreshing(false);
  }, [fetchPersonnel]);

  const normalizedPersonnel = React.useMemo(() => (Array.isArray(personnel) ? normalizePersonnel(personnel) : []), [personnel]);

  const filteredPersonnel = React.useMemo(() => {
    if (!personnel || !Array.isArray(personnel)) return [];
    if (!searchQuery.trim()) return normalizedPersonnel;

    const query = searchQuery.toLowerCase();
    return normalizedPersonnel.filter(
      (person) =>
        person.FirstName?.toLowerCase().includes(query) ||
        person.LastName?.toLowerCase().includes(query) ||
        person.EmailAddress?.toLowerCase().includes(query) ||
        person.GroupName?.toLowerCase().includes(query) ||
        person.Status?.toLowerCase().includes(query) ||
        person.Staffing?.toLowerCase().includes(query) ||
        person.IdentificationNumber?.toLowerCase().includes(query) ||
        person.Roles?.some((role) => role.toLowerCase().includes(query))
    );
  }, [normalizedPersonnel, personnel, searchQuery]);

  const keyExtractor = React.useCallback((item: PersonnelListItem) => item.syntheticId, []);

  const renderPersonnelItem = React.useCallback(({ item }: { item: PersonnelListItem }) => <PersonnelCard personnel={item} onPress={selectPersonnel} />, [selectPersonnel]);

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
              <InputField placeholder={t('personnel.search', 'Search personnel...')} value={searchQuery} onChangeText={setSearchQuery} />
              {searchQuery ? (
                <InputSlot className="pr-3" onPress={() => setSearchQuery('')} testID="clear-search">
                  <InputIcon as={X} />
                </InputSlot>
              ) : null}
            </Input>
            <Button onPress={openFilterSheet} className="h-10 rounded-lg bg-white dark:bg-gray-800" variant="outline" testID="filter-button">
              <HStack className="items-center" space="xs">
                <Filter size={20} className="text-gray-600 dark:text-gray-400" />
                {selectedFilters.length > 0 ? (
                  <Badge size="sm" variant="solid" className="bg-blue-500">
                    <Text className="text-xs text-white">{selectedFilters.length}</Text>
                  </Badge>
                ) : null}
              </HStack>
            </Button>
          </HStack>

          {isLoading && !refreshing ? (
            <Loading />
          ) : filteredPersonnel.length > 0 ? (
            <FlashList
              data={filteredPersonnel}
              keyExtractor={keyExtractor}
              renderItem={renderPersonnelItem}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 100 }}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
            />
          ) : (
            <ZeroState icon={Users} heading={t('personnel.empty', 'No personnel found')} description={t('personnel.emptyDescription', 'No personnel match your search criteria or no personnel data is available.')} />
          )}
        </Box>

        <PersonnelDetailsSheet />
        <PersonnelFilterSheet />
      </View>
    </>
  );
}
