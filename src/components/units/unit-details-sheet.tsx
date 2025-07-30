import { Calendar, Car, MapPin, Settings, Tag, Truck, Users, X } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { formatDateForDisplay, parseDateISOString } from '@/lib/utils';
import { useUnitsStore } from '@/stores/units/store';

import { Actionsheet, ActionsheetBackdrop, ActionsheetContent, ActionsheetDragIndicator, ActionsheetDragIndicatorWrapper } from '../ui/actionsheet';
import { Badge } from '../ui/badge';
import { Box } from '../ui/box';
import { Button } from '../ui/button';
import { Divider } from '../ui/divider';
import { Heading } from '../ui/heading';
import { HStack } from '../ui/hstack';
import { Icon } from '../ui/icon';
import { ScrollView } from '../ui/scroll-view';
import { Text } from '../ui/text';
import { VStack } from '../ui/vstack';

export const UnitDetailsSheet: React.FC = () => {
  const { t } = useTranslation();
  const { colorScheme } = useColorScheme();
  const { units, selectedUnitId, isDetailsOpen, closeDetails } = useUnitsStore();

  const selectedUnit = units.find((unit) => unit.UnitId === selectedUnitId);

  if (!selectedUnit) return null;

  const hasLocation = selectedUnit.Latitude && selectedUnit.Longitude;

  return (
    <Actionsheet isOpen={isDetailsOpen} onClose={closeDetails} snapPoints={[67]}>
      <ActionsheetBackdrop />
      <ActionsheetContent className="w-full rounded-t-xl bg-white dark:bg-gray-800">
        <ActionsheetDragIndicatorWrapper>
          <ActionsheetDragIndicator />
        </ActionsheetDragIndicatorWrapper>

        <Box className="w-full flex-1 p-4">
          <HStack className="mb-4 items-center justify-between">
            <HStack className="flex-1 items-center" space="sm">
              <Icon as={Truck} size={24} className="text-blue-600 dark:text-blue-400" />
              <Heading size="lg" className="flex-1 text-gray-800 dark:text-gray-100" numberOfLines={1}>
                {selectedUnit.Name}
              </Heading>
            </HStack>
            <Button variant="link" onPress={closeDetails} className="p-1" testID="close-button">
              <X size={24} className="text-gray-600 dark:text-gray-400" />
            </Button>
          </HStack>

          <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
            <VStack space="md">
              {/* Unit Type */}
              {selectedUnit.Type && (
                <HStack space="xs" className="items-center">
                  <Icon as={Settings} size={18} className="text-gray-600 dark:text-gray-400" />
                  <Text className="text-gray-700 dark:text-gray-300">{selectedUnit.Type}</Text>
                </HStack>
              )}

              {/* Group Information */}
              {selectedUnit.GroupName && (
                <HStack space="xs" className="items-center">
                  <Icon as={Users} size={18} className="text-gray-600 dark:text-gray-400" />
                  <Text className="text-gray-700 dark:text-gray-300">
                    {t('units.group')}: {selectedUnit.GroupName}
                  </Text>
                </HStack>
              )}

              {/* Location Information */}
              {hasLocation && (
                <Box className="rounded-lg bg-gray-50 p-3 dark:bg-gray-700">
                  <HStack space="xs" className="items-center">
                    <Icon as={MapPin} size={18} className="text-green-600 dark:text-green-400" />
                    <Text className="font-medium text-gray-800 dark:text-gray-200">{t('units.location')}</Text>
                  </HStack>
                  <Text className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    {t('units.coordinates')}: {selectedUnit.Latitude}, {selectedUnit.Longitude}
                  </Text>
                </Box>
              )}

              {/* Vehicle Information */}
              <Box className="rounded-lg bg-gray-50 p-3 dark:bg-gray-700">
                <HStack space="xs" className="mb-2 items-center">
                  <Icon as={Car} size={18} className="text-blue-600 dark:text-blue-400" />
                  <Text className="font-medium text-gray-800 dark:text-gray-200">{t('units.vehicleInfo')}</Text>
                </HStack>

                <VStack space="xs">
                  {selectedUnit.PlateNumber && (
                    <HStack className="justify-between">
                      <Text className="text-sm text-gray-600 dark:text-gray-400">{t('units.plateNumber')}:</Text>
                      <Text className="text-sm text-gray-800 dark:text-gray-200">{selectedUnit.PlateNumber}</Text>
                    </HStack>
                  )}

                  {selectedUnit.Vin && (
                    <HStack className="justify-between">
                      <Text className="text-sm text-gray-600 dark:text-gray-400">{t('units.vin')}:</Text>
                      <Text className="text-sm text-gray-800 dark:text-gray-200" numberOfLines={1}>
                        {selectedUnit.Vin}
                      </Text>
                    </HStack>
                  )}
                </VStack>
              </Box>

              {/* Features */}
              {(selectedUnit.FourWheelDrive || selectedUnit.SpecialPermit) && (
                <Box className="rounded-lg bg-gray-50 p-3 dark:bg-gray-700">
                  <Text className="mb-2 font-medium text-gray-800 dark:text-gray-200">{t('units.features')}</Text>
                  <HStack className="flex-wrap" space="xs">
                    {selectedUnit.FourWheelDrive && (
                      <Badge className="mb-1 mr-1 bg-orange-100 dark:bg-orange-900">
                        <Text className="text-xs text-orange-800 dark:text-orange-100">{t('units.fourWheelDrive')}</Text>
                      </Badge>
                    )}
                    {selectedUnit.SpecialPermit && (
                      <Badge className="mb-1 mr-1 bg-yellow-100 dark:bg-yellow-900">
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

              <Divider />

              {/* Status Information */}
              {selectedUnit.CurrentStatusTimestamp && (
                <HStack space="xs" className="items-center">
                  <Icon as={Calendar} size={18} className="text-gray-600 dark:text-gray-400" />
                  <Text className="text-sm text-gray-700 dark:text-gray-300">
                    {t('units.lastUpdate')}: {formatDateForDisplay(parseDateISOString(selectedUnit.CurrentStatusTimestamp), 'yyyy-MM-dd HH:mm Z')}
                  </Text>
                </HStack>
              )}
            </VStack>
          </ScrollView>
        </Box>
      </ActionsheetContent>
    </Actionsheet>
  );
};
