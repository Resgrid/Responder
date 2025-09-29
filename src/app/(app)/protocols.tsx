import { useFocusEffect } from '@react-navigation/native';
import { FlashList } from '@shopify/flash-list';
import { FileText, Search, X } from 'lucide-react-native';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshControl } from 'react-native';

import { Loading } from '@/components/common/loading';
import ZeroState from '@/components/common/zero-state';
import { ProtocolCard } from '@/components/protocols/protocol-card';
import { ProtocolDetailsSheet } from '@/components/protocols/protocol-details-sheet';
import { FocusAwareStatusBar } from '@/components/ui';
import { Box } from '@/components/ui/box';
import { Input, InputField, InputIcon, InputSlot } from '@/components/ui/input';
import { View } from '@/components/ui/view';
import { useAnalytics } from '@/hooks/use-analytics';
import { useProtocolsStore } from '@/stores/protocols/store';

export default function Protocols() {
  const { t } = useTranslation();
  const { protocols, searchQuery, setSearchQuery, selectProtocol, isLoading, fetchProtocols } = useProtocolsStore();
  const { trackEvent } = useAnalytics();
  const [refreshing, setRefreshing] = React.useState(false);

  React.useEffect(() => {
    fetchProtocols();
  }, [fetchProtocols]);

  // Track analytics when view becomes visible
  useFocusEffect(
    React.useCallback(() => {
      trackEvent('protocols_viewed', {
        timestamp: new Date().toISOString(),
      });
    }, [trackEvent])
  );

  const handleRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await fetchProtocols();
    setRefreshing(false);
  }, [fetchProtocols]);

  const filteredProtocols = React.useMemo(() => {
    if (!searchQuery.trim()) return protocols;

    const query = searchQuery.toLowerCase();
    return protocols.filter((protocol) => protocol.Name.toLowerCase().includes(query) || protocol.Description?.toLowerCase().includes(query) || protocol.Code?.toLowerCase().includes(query));
  }, [protocols, searchQuery]);

  // Show loading page during initial fetch (when no protocols are loaded yet)
  if (isLoading && protocols.length === 0) {
    return (
      <View className="flex-1 bg-gray-50 dark:bg-gray-900">
        <Loading />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      <FocusAwareStatusBar />
      <Box className="flex-1 px-4 pt-4">
        <Input className="mb-4 rounded-lg bg-white dark:bg-gray-800" size="md" variant="outline">
          <InputSlot className="pl-3">
            <InputIcon as={Search} />
          </InputSlot>
          <InputField placeholder={t('protocols.search')} value={searchQuery} onChangeText={setSearchQuery} />
          {searchQuery ? (
            <InputSlot className="pr-3" onPress={() => setSearchQuery('')} testID="clear-search-button">
              <InputIcon as={X} />
            </InputSlot>
          ) : null}
        </Input>

        {filteredProtocols.length > 0 ? (
          <FlashList
            testID="protocols-list"
            data={filteredProtocols}
            keyExtractor={(item, index) => item.Id || `protocol-${index}`}
            renderItem={({ item }) => <ProtocolCard protocol={item} onPress={selectProtocol} />}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 100 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          />
        ) : (
          <ZeroState icon={FileText} heading={t('protocols.empty')} description={t('protocols.emptyDescription')} />
        )}
      </Box>

      <ProtocolDetailsSheet />
    </View>
  );
}
