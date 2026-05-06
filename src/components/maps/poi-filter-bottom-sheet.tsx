import { ChevronDownIcon, FilterIcon, RotateCcwIcon, XIcon } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { type PoiTypeResultData } from '@/models/v4/mapping/poiTypeResultData';

import { Actionsheet, ActionsheetBackdrop, ActionsheetContent, ActionsheetDragIndicator, ActionsheetDragIndicatorWrapper } from '../ui/actionsheet';
import { Badge } from '../ui/badge';
import { Box } from '../ui/box';
import { Button, ButtonText } from '../ui/button';
import { Heading } from '../ui/heading';
import { HStack } from '../ui/hstack';
import { Select, SelectBackdrop, SelectContent, SelectDragIndicator, SelectDragIndicatorWrapper, SelectIcon, SelectInput, SelectItem, SelectPortal, SelectTrigger } from '../ui/select';
import { Text } from '../ui/text';
import { VStack } from '../ui/vstack';

type PoiSortOption = 'name' | 'type';
const ALL_POI_TYPES_VALUE = 'all';

interface PoiFilterBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPoiType: string;
  onPoiTypeChange: (value: string) => void;
  sortBy: PoiSortOption;
  onSortByChange: (value: PoiSortOption) => void;
  poiTypes: PoiTypeResultData[];
}

export const PoiFilterBottomSheet: React.FC<PoiFilterBottomSheetProps> = ({ isOpen, onClose, selectedPoiType, onPoiTypeChange, sortBy, onSortByChange, poiTypes }) => {
  const { t } = useTranslation();
  const { colorScheme } = useColorScheme();

  const hasActiveFilters = selectedPoiType !== ALL_POI_TYPES_VALUE || sortBy !== 'name';

  const handleReset = useCallback(() => {
    onPoiTypeChange(ALL_POI_TYPES_VALUE);
    onSortByChange('name');
  }, [onPoiTypeChange, onSortByChange]);

  const handleDone = useCallback(() => {
    onClose();
  }, [onClose]);

  const handlePoiTypeChange = useCallback(
    (value: string) => {
      onPoiTypeChange(value);
    },
    [onPoiTypeChange]
  );

  const handleSortChange = useCallback(
    (value: string) => {
      onSortByChange(value as PoiSortOption);
    },
    [onSortByChange]
  );

  const selectedPoiTypeLabel = selectedPoiType === ALL_POI_TYPES_VALUE ? t('poi.filter_all_types') : poiTypes.find((pt) => pt.PoiTypeId.toString() === selectedPoiType)?.Name || t('poi.filter_all_types');

  const selectedSortLabel = sortBy === 'name' ? t('poi.sort_name') : t('poi.sort_type');

  return (
    <Actionsheet isOpen={isOpen} onClose={onClose} snapPoints={[45]}>
      <ActionsheetBackdrop />
      <ActionsheetContent className={`rounded-t-3xl px-4 pb-6 ${colorScheme === 'dark' ? 'bg-neutral-900' : 'bg-white'}`}>
        <ActionsheetDragIndicatorWrapper>
          <ActionsheetDragIndicator />
        </ActionsheetDragIndicatorWrapper>

        <Box className="w-full flex-1 pt-2">
          <HStack className="mb-4 items-center justify-between">
            <HStack className="items-center" space="sm">
              <FilterIcon size={20} className="text-gray-600 dark:text-gray-400" />
              <Heading size="md" className="text-gray-800 dark:text-gray-100">
                {t('poi.filter_sort_title', 'Filter & Sort')}
              </Heading>
              {hasActiveFilters ? (
                <Badge size="sm" variant="solid" className="bg-primary-500">
                  <Text className="text-xs text-white">!</Text>
                </Badge>
              ) : null}
            </HStack>
            <Button variant="link" onPress={onClose} className="p-1">
              <XIcon size={20} className="text-gray-600 dark:text-gray-400" />
            </Button>
          </HStack>

          <VStack space="lg" className="flex-1">
            <VStack space="xs">
              <Text className="text-sm font-medium text-gray-700 dark:text-gray-200">{t('poi.filter_label')}</Text>
              <Select selectedValue={selectedPoiType} onValueChange={handlePoiTypeChange}>
                <SelectTrigger variant="outline" className={`rounded-lg border ${colorScheme === 'dark' ? 'border-neutral-700 bg-neutral-800' : 'border-neutral-200 bg-neutral-50'}`}>
                  <SelectInput placeholder={t('poi.filter_all_types')} value={selectedPoiTypeLabel} />
                  <SelectIcon as={ChevronDownIcon} className="mr-3 text-gray-500 dark:text-gray-400" />
                </SelectTrigger>
                <SelectPortal>
                  <SelectBackdrop />
                  <SelectContent>
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
              <Text className="text-sm font-medium text-gray-700 dark:text-gray-200">{t('poi.sort_label')}</Text>
              <Select selectedValue={sortBy} onValueChange={handleSortChange}>
                <SelectTrigger variant="outline" className={`rounded-lg border ${colorScheme === 'dark' ? 'border-neutral-700 bg-neutral-800' : 'border-neutral-200 bg-neutral-50'}`}>
                  <SelectInput placeholder={t('poi.sort_name')} value={selectedSortLabel} />
                  <SelectIcon as={ChevronDownIcon} className="mr-3 text-gray-500 dark:text-gray-400" />
                </SelectTrigger>
                <SelectPortal>
                  <SelectBackdrop />
                  <SelectContent>
                    <SelectDragIndicatorWrapper>
                      <SelectDragIndicator />
                    </SelectDragIndicatorWrapper>
                    <SelectItem label={t('poi.sort_name')} value="name" />
                    <SelectItem label={t('poi.sort_type')} value="type" />
                  </SelectContent>
                </SelectPortal>
              </Select>
            </VStack>

            <HStack space="sm" className="mt-4">
              <Button variant="outline" className="flex-1" onPress={handleReset} disabled={!hasActiveFilters}>
                <RotateCcwIcon size={16} className="mr-2 text-gray-600 dark:text-gray-400" />
                <ButtonText>{t('poi.reset_filters', 'Reset')}</ButtonText>
              </Button>
              <Button className="flex-1 bg-primary-600 dark:bg-primary-500" onPress={handleDone}>
                <ButtonText>{t('common.done', 'Done')}</ButtonText>
              </Button>
            </HStack>
          </VStack>
        </Box>
      </ActionsheetContent>
    </Actionsheet>
  );
};

export default PoiFilterBottomSheet;
