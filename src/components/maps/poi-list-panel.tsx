import { FlashList, type ListRenderItem } from '@shopify/flash-list';
import { ChevronDownIcon, MapIcon } from 'lucide-react-native';
import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Loading } from '@/components/common/loading';
import ZeroState from '@/components/common/zero-state';
import { Badge } from '@/components/ui/badge';
import { Box } from '@/components/ui/box';
import { Button, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Pressable } from '@/components/ui/pressable';
import { Select, SelectBackdrop, SelectContent, SelectDragIndicator, SelectDragIndicatorWrapper, SelectIcon, SelectInput, SelectItem, SelectPortal, SelectTrigger } from '@/components/ui/select';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { getPoiDisplayName } from '@/lib/poi';
import { type PoiResultData } from '@/models/v4/mapping/poiResultData';
import { usePoiStore } from '@/stores/poi/store';

type PoiSortOption = 'name' | 'type';

interface PoiListPanelProps {
  onPoiPress: (poi: PoiResultData) => void;
  onViewOnMap: (poi: PoiResultData) => void;
}

interface PoiListItemProps {
  poi: PoiResultData;
  onPoiPress: (poi: PoiResultData) => void;
  onViewOnMap: (poi: PoiResultData) => void;
}

const ALL_POI_TYPES_VALUE = 'all';

const PoiListItem: React.FC<PoiListItemProps> = React.memo(({ poi, onPoiPress, onViewOnMap }) => {
  const { t } = useTranslation();

  const handleViewDetails = useCallback(() => {
    onPoiPress(poi);
  }, [onPoiPress, poi]);

  const handleViewOnMap = useCallback(() => {
    onViewOnMap(poi);
  }, [onViewOnMap, poi]);

  const displayName = getPoiDisplayName(poi);

  return (
    <Box className="mb-3 rounded-2xl border border-neutral-200 bg-neutral-50/90 p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-950/70">
      <VStack space="sm">
        <HStack className="items-start justify-between">
          <VStack className="flex-1 pr-3">
            <Text className="text-base font-semibold text-gray-900 dark:text-gray-100">{displayName}</Text>
            <Text className="text-sm text-primary-600 dark:text-primary-400">{poi.PoiTypeName}</Text>
          </VStack>
          {poi.IsDestination ? (
            <Badge action="success" size="sm" variant="solid">
              <Text className="text-xs text-white">{t('poi.destination_enabled')}</Text>
            </Badge>
          ) : null}
        </HStack>

        {poi.Address ? <Text className="text-sm text-gray-600 dark:text-gray-300">{poi.Address}</Text> : null}
        {poi.Note ? <Text className="text-sm text-gray-500 dark:text-gray-400">{poi.Note}</Text> : null}

        <HStack space="sm" className="pt-2">
          <Button variant="outline" className="flex-1 border-neutral-300 dark:border-neutral-700" onPress={handleViewOnMap}>
            <ButtonText>{t('poi.view_on_map')}</ButtonText>
          </Button>
          <Button className="flex-1 bg-primary-600 dark:bg-primary-500" onPress={handleViewDetails}>
            <ButtonText>{t('poi.view_details')}</ButtonText>
          </Button>
        </HStack>
      </VStack>
    </Box>
  );
});

PoiListItem.displayName = 'PoiListItem';

export const PoiListPanel: React.FC<PoiListPanelProps> = ({ onPoiPress, onViewOnMap }) => {
  const { t } = useTranslation();
  const { poiTypes, pois, isLoading, error } = usePoiStore((state) => ({
    poiTypes: state.poiTypes,
    pois: state.pois,
    isLoading: state.isLoading,
    error: state.error,
  }));
  const [selectedPoiType, setSelectedPoiType] = useState(ALL_POI_TYPES_VALUE);
  const [sortBy, setSortBy] = useState<PoiSortOption>('name');

  const filteredPois = useMemo(() => {
    const nextPois = selectedPoiType === ALL_POI_TYPES_VALUE ? [...pois] : pois.filter((poi) => poi.PoiTypeId.toString() === selectedPoiType);

    nextPois.sort((left, right) => {
      if (sortBy === 'type') {
        const typeComparison = (left.PoiTypeName || '').localeCompare(right.PoiTypeName || '');
        return typeComparison !== 0 ? typeComparison : getPoiDisplayName(left).localeCompare(getPoiDisplayName(right));
      }

      return getPoiDisplayName(left).localeCompare(getPoiDisplayName(right));
    });

    return nextPois;
  }, [pois, selectedPoiType, sortBy]);

  const selectedPoiTypeLabel = useMemo(() => {
    if (selectedPoiType === ALL_POI_TYPES_VALUE) {
      return t('poi.filter_all_types');
    }

    return poiTypes.find((poiType) => poiType.PoiTypeId.toString() === selectedPoiType)?.Name || t('poi.filter_all_types');
  }, [poiTypes, selectedPoiType, t]);

  const selectedSortLabel = useMemo(() => {
    return sortBy === 'name' ? t('poi.sort_name') : t('poi.sort_type');
  }, [sortBy, t]);

  const renderPoiItem = useCallback<ListRenderItem<PoiResultData>>(({ item }) => <PoiListItem poi={item} onPoiPress={onPoiPress} onViewOnMap={onViewOnMap} />, [onPoiPress, onViewOnMap]);

  const keyExtractor = useCallback((item: PoiResultData) => item.PoiId.toString(), []);

  if (isLoading && pois.length === 0) {
    return <Loading text={t('poi.loading')} />;
  }

  if (error && pois.length === 0) {
    return <ZeroState heading={t('poi.load_error_title')} description={error} isError={true} />;
  }

  return (
    <VStack className="flex-1 bg-transparent p-4">
      <Box className="mb-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-950/60">
        <VStack space="md">
          <Text className="text-sm leading-5 text-gray-600 dark:text-gray-300">{t('poi.list_description')}</Text>

          <VStack space="sm">
            <VStack space="xs">
              <Text className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">{t('poi.filter_label')}</Text>
              <Select selectedValue={selectedPoiType} onValueChange={setSelectedPoiType}>
                <SelectTrigger variant="outline" className="border-neutral-300 bg-white dark:border-neutral-700 dark:bg-neutral-900">
                  <SelectInput placeholder={t('poi.filter_all_types')} value={selectedPoiTypeLabel} />
                  <SelectIcon as={ChevronDownIcon} className="mr-3 text-gray-500 dark:text-gray-400" />
                </SelectTrigger>
                <SelectPortal>
                  <SelectBackdrop />
                  <SelectContent className="pb-20">
                    <SelectDragIndicatorWrapper>
                      <SelectDragIndicator />
                    </SelectDragIndicatorWrapper>
                    <SelectItem label={t('poi.filter_all_types')} value={ALL_POI_TYPES_VALUE} />
                    {poiTypes.map((poiType) => (
                      <SelectItem key={poiType.PoiTypeId} label={poiType.Name} value={poiType.PoiTypeId.toString()} />
                    ))}
                  </SelectContent>
                </SelectPortal>
              </Select>
            </VStack>

            <VStack space="xs">
              <Text className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">{t('poi.sort_label')}</Text>
              <Select selectedValue={sortBy} onValueChange={(value) => setSortBy(value as PoiSortOption)}>
                <SelectTrigger variant="outline" className="border-neutral-300 bg-white dark:border-neutral-700 dark:bg-neutral-900">
                  <SelectInput placeholder={t('poi.sort_name')} value={selectedSortLabel} />
                  <SelectIcon as={ChevronDownIcon} className="mr-3 text-gray-500 dark:text-gray-400" />
                </SelectTrigger>
                <SelectPortal>
                  <SelectBackdrop />
                  <SelectContent className="pb-20">
                    <SelectDragIndicatorWrapper>
                      <SelectDragIndicator />
                    </SelectDragIndicatorWrapper>
                    <SelectItem label={t('poi.sort_name')} value="name" />
                    <SelectItem label={t('poi.sort_type')} value="type" />
                  </SelectContent>
                </SelectPortal>
              </Select>
            </VStack>
          </VStack>
        </VStack>
      </Box>

      <HStack className="mb-3 items-center justify-between rounded-xl bg-neutral-100 px-3 py-2 dark:bg-neutral-950/70">
        <Text className="text-sm font-medium text-gray-700 dark:text-gray-200">{t('poi.results_count', { count: filteredPois.length })}</Text>
        <HStack space="xs" className="items-center">
          <MapIcon size={14} className="text-primary-600 dark:text-primary-400" />
          <Text className="text-xs text-primary-600 dark:text-primary-400">{t('poi.view_on_map_hint')}</Text>
        </HStack>
      </HStack>

      {filteredPois.length > 0 ? (
        <FlashList data={filteredPois} renderItem={renderPoiItem} keyExtractor={keyExtractor} removeClippedSubviews={true} contentContainerStyle={{ paddingBottom: 12 }} />
      ) : (
        <ZeroState heading={t('poi.empty_title')} description={t('poi.empty_description')} />
      )}
    </VStack>
  );
};

export default PoiListPanel;
