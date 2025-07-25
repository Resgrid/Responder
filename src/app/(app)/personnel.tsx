import { Search, Users, X } from 'lucide-react-native';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, RefreshControl, View } from 'react-native';

import { Loading } from '@/components/common/loading';
import ZeroState from '@/components/common/zero-state';
import { PersonnelCard } from '@/components/personnel/personnel-card';
import { PersonnelDetailsSheet } from '@/components/personnel/personnel-details-sheet';
import { Box } from '@/components/ui/box';
import { FocusAwareStatusBar } from '@/components/ui/focus-aware-status-bar';
import { Input } from '@/components/ui/input';
import { InputField, InputIcon, InputSlot } from '@/components/ui/input';
import { usePersonnelStore } from '@/stores/personnel/store';

export default function Personnel() {
  const { t } = useTranslation();
  const { personnel, searchQuery, setSearchQuery, selectPersonnel, isLoading, fetchPersonnel } = usePersonnelStore();
  const [refreshing, setRefreshing] = React.useState(false);

  React.useEffect(() => {
    fetchPersonnel();
  }, [fetchPersonnel]);

  const handleRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await fetchPersonnel();
    setRefreshing(false);
  }, [fetchPersonnel]);

  const filteredPersonnel = React.useMemo(() => {
    if (!personnel || !Array.isArray(personnel)) return [];
    if (!searchQuery.trim()) return personnel;

    const query = searchQuery.toLowerCase();
    return personnel.filter(
      (person) =>
        person.FirstName.toLowerCase().includes(query) ||
        person.LastName.toLowerCase().includes(query) ||
        person.EmailAddress?.toLowerCase().includes(query) ||
        person.GroupName?.toLowerCase().includes(query) ||
        person.Status?.toLowerCase().includes(query) ||
        person.Staffing?.toLowerCase().includes(query) ||
        person.IdentificationNumber?.toLowerCase().includes(query) ||
        person.Roles?.some((role) => role.toLowerCase().includes(query))
    );
  }, [personnel, searchQuery]);

  return (
    <>
      <View className="flex-1 bg-gray-50 dark:bg-gray-900">
        <FocusAwareStatusBar />
        <Box className="flex-1 px-4 pt-4">
          <Input className="mb-4 rounded-lg bg-white dark:bg-gray-800" size="md" variant="outline">
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

          {isLoading && !refreshing ? (
            <Loading />
          ) : filteredPersonnel.length > 0 ? (
            <FlatList
              data={filteredPersonnel}
              keyExtractor={(item, index) => item.UserId || `personnel-${index}`}
              renderItem={({ item }) => <PersonnelCard personnel={item} onPress={selectPersonnel} />}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 100 }}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
            />
          ) : (
            <ZeroState icon={Users} heading={t('personnel.empty', 'No personnel found')} description={t('personnel.emptyDescription', 'No personnel match your search criteria or no personnel data is available.')} />
          )}
        </Box>

        <PersonnelDetailsSheet />
      </View>
    </>
  );
}
