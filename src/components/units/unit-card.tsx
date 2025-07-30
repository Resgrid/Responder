import { MapPin, Settings, Truck } from 'lucide-react-native';
import { Pressable } from 'react-native';

import { type UnitResultData } from '@/models/v4/units/unitResultData';

import { Badge } from '../ui/badge';
import { Box } from '../ui/box';
import { HStack } from '../ui/hstack';
import { Icon } from '../ui/icon';
import { Text } from '../ui/text';
import { VStack } from '../ui/vstack';

interface UnitCardProps {
  unit: UnitResultData;
  onPress: (id: string) => void;
}

export const UnitCard: React.FC<UnitCardProps> = ({ unit, onPress }) => {
  const hasLocation = unit.Latitude && unit.Longitude;

  return (
    <Pressable onPress={() => onPress(unit.UnitId)} testID={`unit-card-${unit.UnitId}`}>
      <Box className="mb-3 rounded-lg bg-white p-4 shadow-sm dark:bg-gray-800">
        <VStack space="xs">
          <HStack className="items-center justify-between">
            <HStack className="flex-1 items-center" space="sm">
              <Icon as={Truck} size={20} className="text-blue-600 dark:text-blue-400" />
              <Text className="flex-1 text-lg font-semibold text-gray-800 dark:text-gray-100" numberOfLines={1}>
                {unit.Name}
              </Text>
            </HStack>
            {hasLocation && <Icon as={MapPin} size={16} className="text-green-600 dark:text-green-400" />}
          </HStack>

          {unit.Type && <Text className="text-sm text-gray-600 dark:text-gray-300">{unit.Type}</Text>}

          <HStack className="mt-2 flex-wrap items-center" space="xs">
            {unit.GroupName && (
              <Badge className="mb-1 mr-1 bg-purple-100 dark:bg-purple-900">
                <Text className="text-xs text-purple-800 dark:text-purple-100">{unit.GroupName}</Text>
              </Badge>
            )}

            {unit.PlateNumber && (
              <Badge className="mb-1 mr-1 bg-gray-100 dark:bg-gray-700">
                <Text className="text-xs text-gray-800 dark:text-gray-100">{unit.PlateNumber}</Text>
              </Badge>
            )}

            {unit.FourWheelDrive && (
              <Badge className="mb-1 mr-1 bg-orange-100 dark:bg-orange-900">
                <Text className="text-xs text-orange-800 dark:text-orange-100">4WD</Text>
              </Badge>
            )}

            {unit.SpecialPermit && (
              <Badge className="mb-1 mr-1 bg-yellow-100 dark:bg-yellow-900">
                <Text className="text-xs text-yellow-800 dark:text-yellow-100">Special Permit</Text>
              </Badge>
            )}
          </HStack>

          {unit.Note && (
            <Text className="mt-2 text-xs text-gray-500 dark:text-gray-400" numberOfLines={2}>
              {unit.Note}
            </Text>
          )}
        </VStack>
      </Box>
    </Pressable>
  );
};
