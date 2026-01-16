import { Calendar, Car, MapPin, Settings, Truck, Users, X } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import React, { useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, Pressable } from 'react-native';

import { useAnalytics } from '@/hooks/use-analytics';
import { openMapsWithDirections } from '@/lib/navigation';
import { formatDateForDisplay, parseDateISOString } from '@/lib/utils';
import { useUnitsStore } from '@/stores/units/store';

import { Actionsheet, ActionsheetBackdrop, ActionsheetContent, ActionsheetDragIndicator, ActionsheetDragIndicatorWrapper } from '../ui/actionsheet';
import { Badge } from '../ui/badge';
import { Box } from '../ui/box';
import { Button } from '../ui/button';
import { Divider } from '../ui/divider';
import { Heading } from '../ui/heading';
import { HStack } from '../ui/hstack';
import { ScrollView } from '../ui/scroll-view';
import { Text } from '../ui/text';
import { VStack } from '../ui/vstack';

export const UnitDetailsSheet: React.FC = React.memo(() => {
  const { t } = useTranslation();
  const { colorScheme } = useColorScheme();
  const { trackEvent } = useAnalytics();
  const { units, selectedUnitId, isDetailsOpen, closeDetails } = useUnitsStore();

  const selectedUnit = units.find((unit) => unit.UnitId === selectedUnitId);

  const hasLocation = selectedUnit?.Latitude && selectedUnit?.Longitude;
  const isDark = colorScheme === 'dark';

  // Helper to get timestamp - handle both UnitResultData and UnitInfoResultData
  const getStatusTimestamp = (unit: typeof selectedUnit) => {
    if (!unit) return null;
    if ('CurrentStatusTimestampUtc' in unit) {
      return unit.CurrentStatusTimestampUtc;
    }
    if ('CurrentStatusTimestamp' in unit) {
      return unit.CurrentStatusTimestamp;
    }
    return null;
  };

  const statusTimestamp = getStatusTimestamp(selectedUnit);

  // Track analytics when sheet becomes visible
  const trackViewAnalytics = useCallback(() => {
    if (!selectedUnit) return;

    try {
      trackEvent('unit_details_sheet_viewed', {
        timestamp: new Date().toISOString(),
        unitId: selectedUnit.UnitId || '',
        unitName: selectedUnit.Name || '',
        unitType: selectedUnit.Type || '',
        hasLocation: !!hasLocation,
        hasGroupName: !!selectedUnit.GroupName,
        hasPlateNumber: !!selectedUnit.PlateNumber,
        hasVin: !!selectedUnit.Vin,
        hasFourWheelDrive: !!selectedUnit.FourWheelDrive,
        hasSpecialPermit: !!selectedUnit.SpecialPermit,
        hasNote: !!selectedUnit.Note,
        hasStatusTimestamp: !!statusTimestamp,
        colorScheme: colorScheme || 'light',
      });
    } catch (error) {
      // Analytics errors should not break the component
      console.warn('Failed to track unit details sheet view analytics:', error);
    }
  }, [trackEvent, selectedUnit, hasLocation, statusTimestamp, colorScheme]);

  // Track analytics when sheet becomes visible
  useEffect(() => {
    if (isDetailsOpen && selectedUnit) {
      trackViewAnalytics();
    }
  }, [isDetailsOpen, selectedUnit, trackViewAnalytics]);

  // Handle close with analytics
  const handleClose = useCallback(() => {
    if (selectedUnit) {
      try {
        trackEvent('unit_details_sheet_closed', {
          timestamp: new Date().toISOString(),
          unitId: selectedUnit.UnitId || '',
          unitName: selectedUnit.Name || '',
        });
      } catch (error) {
        // Analytics errors should not break the component
        console.warn('Failed to track unit details sheet close analytics:', error);
      }
    }
    closeDetails();
  }, [trackEvent, selectedUnit, closeDetails]);

  // Handle opening the native maps app with location
  const handleOpenMaps = useCallback(() => {
    if (!selectedUnit?.Latitude || !selectedUnit?.Longitude) return;

    const latitude = selectedUnit.Latitude;
    const longitude = selectedUnit.Longitude;

    // Track analytics for map opening
    try {
      trackEvent('unit_details_location_tapped', {
        timestamp: new Date().toISOString(),
        unitId: selectedUnit.UnitId || '',
        unitName: selectedUnit.Name || '',
        latitude,
        longitude,
        platform: Platform.OS,
      });
    } catch (error) {
      console.warn('Failed to track location tap analytics:', error);
    }

    // Use the navigation utility to open maps
    openMapsWithDirections(latitude, longitude, selectedUnit.Name).catch((error) => {
      console.warn('Failed to open maps:', error);
    });
  }, [selectedUnit, trackEvent]);

  if (!selectedUnit) return null;

  return (
    <Actionsheet isOpen={isDetailsOpen} onClose={handleClose} snapPoints={[67]}>
      <ActionsheetBackdrop />
      <ActionsheetContent className="w-full rounded-t-xl bg-white dark:bg-gray-800">
        <ActionsheetDragIndicatorWrapper>
          <ActionsheetDragIndicator />
        </ActionsheetDragIndicatorWrapper>

        <Box className="w-full flex-1 px-4 pb-4">
          <HStack className="mb-6 items-center justify-between pt-2">
            <HStack className="flex-1 items-center" space="sm">
              <Truck size={24} color={isDark ? '#60a5fa' : '#2563eb'} />
              <Heading size="lg" className="flex-1 text-gray-800 dark:text-gray-100" numberOfLines={1}>
                {selectedUnit.Name}
              </Heading>
            </HStack>
            <Button variant="link" onPress={handleClose} className="p-1" testID="close-button">
              <X size={24} color={isDark ? '#9ca3af' : '#6b7280'} />
            </Button>
          </HStack>

          <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
            <VStack space="md">
              {/* Unit Type */}
              {selectedUnit.Type && (
                <HStack space="sm" className="items-center">
                  <Settings size={18} color={isDark ? '#9ca3af' : '#6b7280'} />
                  <Text className="text-gray-700 dark:text-gray-300">{selectedUnit.Type}</Text>
                </HStack>
              )}

              {/* Group Information */}
              {selectedUnit.GroupName && (
                <HStack space="sm" className="items-center">
                  <Users size={18} color={isDark ? '#9ca3af' : '#6b7280'} />
                  <Text className="text-gray-700 dark:text-gray-300">
                    {t('units.group')}: {selectedUnit.GroupName}
                  </Text>
                </HStack>
              )}

              {/* Location Information */}
              {hasLocation && (
                <Pressable onPress={handleOpenMaps} testID="location-press">
                  <Box className="rounded-lg bg-gray-50 p-3 active:bg-gray-100 dark:bg-gray-700 dark:active:bg-gray-600">
                    <HStack space="sm" className="mb-2 items-center">
                      <MapPin size={18} color={isDark ? '#4ade80' : '#16a34a'} />
                      <Text className="font-medium text-gray-800 dark:text-gray-200">{t('units.location')}</Text>
                    </HStack>
                    <Text className="text-sm text-gray-600 dark:text-gray-400">
                      {t('units.coordinates')}: {selectedUnit.Latitude}, {selectedUnit.Longitude}
                    </Text>
                    <Text className="mt-1 text-xs text-blue-600 dark:text-blue-400">{t('units.tapToOpenMaps')}</Text>
                  </Box>
                </Pressable>
              )}

              {/* Vehicle Information */}
              <Box className="rounded-lg bg-gray-50 p-3 dark:bg-gray-700">
                <HStack space="sm" className="mb-3 items-center">
                  <Car size={18} color={isDark ? '#60a5fa' : '#2563eb'} />
                  <Text className="font-medium text-gray-800 dark:text-gray-200">{t('units.vehicleInfo')}</Text>
                </HStack>

                <VStack space="sm">
                  {selectedUnit.PlateNumber && (
                    <HStack className="justify-between">
                      <Text className="text-sm text-gray-600 dark:text-gray-400">{t('units.plateNumber')}:</Text>
                      <Text className="text-sm font-medium text-gray-800 dark:text-gray-200">{selectedUnit.PlateNumber}</Text>
                    </HStack>
                  )}

                  {selectedUnit.Vin && (
                    <HStack className="justify-between">
                      <Text className="text-sm text-gray-600 dark:text-gray-400">{t('units.vin')}:</Text>
                      <Text className="text-sm font-medium text-gray-800 dark:text-gray-200" numberOfLines={1}>
                        {selectedUnit.Vin}
                      </Text>
                    </HStack>
                  )}
                </VStack>
              </Box>

              {/* Features */}
              {(selectedUnit.FourWheelDrive || selectedUnit.SpecialPermit) && (
                <Box className="rounded-lg bg-gray-50 p-3 dark:bg-gray-700">
                  <Text className="mb-3 font-medium text-gray-800 dark:text-gray-200">{t('units.features')}</Text>
                  <HStack className="flex-wrap gap-2">
                    {selectedUnit.FourWheelDrive && (
                      <Badge className="bg-orange-100 dark:bg-orange-900">
                        <Text className="text-xs text-orange-800 dark:text-orange-100">{t('units.fourWheelDrive')}</Text>
                      </Badge>
                    )}
                    {selectedUnit.SpecialPermit && (
                      <Badge className="bg-yellow-100 dark:bg-yellow-900">
                        <Text className="text-xs text-yellow-800 dark:text-yellow-100">{t('units.specialPermit')}</Text>
                      </Badge>
                    )}
                  </HStack>
                </Box>
              )}

              {/* Notes */}
              {selectedUnit.Note && (
                <Box className="rounded-lg bg-gray-50 p-3 dark:bg-gray-700">
                  <Text className="mb-2 font-medium text-gray-800 dark:text-gray-200">{t('units.notes')}</Text>
                  <Text className="text-sm text-gray-700 dark:text-gray-300">{selectedUnit.Note}</Text>
                </Box>
              )}

              <Divider className="my-2" />

              {/* Status Information */}
              {statusTimestamp && (
                <HStack space="sm" className="items-center">
                  <Calendar size={18} color={isDark ? '#9ca3af' : '#6b7280'} />
                  <Text className="text-sm text-gray-700 dark:text-gray-300">
                    {t('units.lastUpdate')}: {formatDateForDisplay(parseDateISOString(statusTimestamp), 'yyyy-MM-dd HH:mm Z')}
                  </Text>
                </HStack>
              )}
            </VStack>
          </ScrollView>
        </Box>
      </ActionsheetContent>
    </Actionsheet>
  );
});
