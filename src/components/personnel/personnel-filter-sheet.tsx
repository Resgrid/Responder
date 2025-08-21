import { Check, Filter, X } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { SectionList } from 'react-native';

import { Loading } from '@/components/common/loading';
import { useAnalytics } from '@/hooks/use-analytics';
import { type FilterResultData } from '@/models/v4/personnel/filterResultData';
import { usePersonnelStore } from '@/stores/personnel/store';

import { Actionsheet, ActionsheetBackdrop, ActionsheetContent, ActionsheetDragIndicator, ActionsheetDragIndicatorWrapper } from '../ui/actionsheet';
import { Badge } from '../ui/badge';
import { Box } from '../ui/box';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { Heading } from '../ui/heading';
import { HStack } from '../ui/hstack';
import { Pressable } from '../ui/pressable';
import { Text } from '../ui/text';
import { VStack } from '../ui/vstack';

interface FilterGroup {
  title: string;
  data: FilterResultData[];
}

export const PersonnelFilterSheet: React.FC = () => {
  const { t } = useTranslation();
  const { filterOptions, selectedFilters, isFilterSheetOpen, isLoadingFilters, closeFilterSheet, toggleFilter } = usePersonnelStore();
  const { trackEvent } = useAnalytics();

  // Group filter options by Type
  const groupedFilterOptions = useMemo((): FilterGroup[] => {
    if (!filterOptions || filterOptions.length === 0) return [];

    const groups = filterOptions.reduce(
      (acc, item) => {
        const type = item.Type || 'Other';
        if (!acc[type]) {
          acc[type] = [];
        }
        acc[type].push(item);
        return acc;
      },
      {} as Record<string, FilterResultData[]>
    );

    return Object.entries(groups)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([title, data]) => ({
        title,
        data: data.sort((a, b) => a.Name.localeCompare(b.Name)),
      }));
  }, [filterOptions]);

  // Track analytics when sheet becomes visible
  useEffect(() => {
    if (isFilterSheetOpen && groupedFilterOptions) {
      try {
        const filterTypes = groupedFilterOptions.map((group) => group.title);
        const totalFilterOptions = filterOptions?.length || 0;
        const activeFilterCount = selectedFilters.length;

        trackEvent('personnel_filter_sheet_viewed', {
          timestamp: new Date().toISOString(),
          totalFilterOptions,
          activeFilterCount,
          filterTypesAvailable: filterTypes.join(','),
          hasFiltersApplied: activeFilterCount > 0,
          isLoading: isLoadingFilters,
        });
      } catch (error) {
        // Analytics errors should not break the component
        console.warn('Failed to track personnel filter sheet view analytics:', error);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFilterSheetOpen]);

  // Enhanced toggle filter with analytics
  const handleToggleFilter = useCallback(
    (filterId: string) => {
      const isCurrentlySelected = selectedFilters.includes(filterId);
      const filterItem = filterOptions?.find((f) => f.Id === filterId);

      try {
        trackEvent('personnel_filter_toggled', {
          timestamp: new Date().toISOString(),
          filterId,
          filterName: filterItem?.Name || '',
          filterType: filterItem?.Type || '',
          action: isCurrentlySelected ? 'removed' : 'added',
          previousActiveCount: selectedFilters.length,
          newActiveCount: isCurrentlySelected ? selectedFilters.length - 1 : selectedFilters.length + 1,
        });
      } catch (error) {
        console.warn('Failed to track personnel filter toggle analytics:', error);
      }

      toggleFilter(filterId);
    },
    [trackEvent, selectedFilters, filterOptions, toggleFilter]
  );

  const renderFilterItem = ({ item }: { item: FilterResultData }) => {
    const isSelected = selectedFilters.includes(item.Id);

    return (
      <Pressable onPress={() => handleToggleFilter(item.Id)} className="flex-row items-center justify-between px-4 py-3" testID={`filter-item-${item.Id}`}>
        <Text className="flex-1 text-base text-gray-800 dark:text-gray-100">{item.Name}</Text>
        <HStack className="items-center" space="sm">
          {isSelected && <Check size={16} className="text-blue-500" />}
          <Checkbox
            value={isSelected ? 'true' : 'false'}
            onChange={() => handleToggleFilter(item.Id)}
            aria-label={`Toggle filter ${item.Name}`}
            testID={`filter-checkbox-${item.Id}`}
            className={isSelected ? 'border-blue-500' : ''}
          />
        </HStack>
      </Pressable>
    );
  };

  const renderSectionHeader = ({ section }: { section: FilterGroup }) => (
    <Box className="bg-gray-100 px-4 py-2 dark:bg-gray-700">
      <Text className="text-sm font-medium text-gray-600 dark:text-gray-300">{section.title}</Text>
    </Box>
  );

  const activeFilterCount = selectedFilters.length;

  return (
    <Actionsheet isOpen={isFilterSheetOpen} onClose={closeFilterSheet} snapPoints={[80]}>
      <ActionsheetBackdrop />
      <ActionsheetContent className="w-full rounded-t-xl bg-white dark:bg-gray-800">
        <ActionsheetDragIndicatorWrapper>
          <ActionsheetDragIndicator />
        </ActionsheetDragIndicatorWrapper>

        <Box className="w-full flex-1 p-4">
          <HStack className="mb-4 items-center justify-between">
            <HStack className="items-center" space="sm">
              <Filter size={24} className="text-gray-600 dark:text-gray-400" />
              <Heading size="lg" className="text-gray-800 dark:text-gray-100">
                {t('personnel.filter.title', 'Filter Personnel')}
              </Heading>
              {activeFilterCount > 0 && (
                <Badge size="sm" variant="solid" className="bg-blue-500">
                  <Text className="text-xs text-white">{activeFilterCount}</Text>
                </Badge>
              )}
            </HStack>
            <Button variant="link" onPress={closeFilterSheet} className="p-1" testID="close-filter-sheet">
              <X size={24} className="text-gray-600 dark:text-gray-400" />
            </Button>
          </HStack>

          {isLoadingFilters ? (
            <Loading />
          ) : groupedFilterOptions.length > 0 ? (
            <VStack className="flex-1">
              <Text className="mb-3 text-sm text-gray-600 dark:text-gray-400">{t('personnel.filter.description', 'Select filters to refine the personnel list. Changes are automatically applied.')}</Text>
              <SectionList
                sections={groupedFilterOptions}
                keyExtractor={(item) => item.Id}
                renderItem={renderFilterItem}
                renderSectionHeader={renderSectionHeader}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 20 }}
              />
            </VStack>
          ) : (
            <VStack className="flex-1 items-center justify-center">
              <Filter size={48} className="mb-3 text-gray-400 dark:text-gray-500" />
              <Text className="text-center text-gray-600 dark:text-gray-400">{t('personnel.filter.empty', 'No filter options available')}</Text>
              <Text className="mt-1 text-center text-sm text-gray-500 dark:text-gray-500">{t('personnel.filter.emptyDescription', 'Filter options will appear here when available.')}</Text>
            </VStack>
          )}
        </Box>
      </ActionsheetContent>
    </Actionsheet>
  );
};
