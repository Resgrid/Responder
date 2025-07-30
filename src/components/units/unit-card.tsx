import { MapPin, Truck } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable } from 'react-native';

import { type UnitResultData } from '@/models/v4/units/unitResultData';

import { Badge, BadgeText } from '../ui/badge';
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
  const { t } = useTranslation();
  const hasLocation = unit.Latitude && unit.Longitude;

  return (
    <Pressable onPress={() => onPress(unit.UnitId)} testID={`unit-card-${unit.UnitId}`}>
      <Box className="mb-3 rounded-lg border border-outline-100 bg-background-0 p-4 shadow-sm">
        <VStack space="sm">
          <HStack className="items-center justify-between">
            <HStack className="flex-1 items-center" space="sm">
              <Icon as={Truck} size="md" className="text-primary-600" />
              <Text className="flex-1 text-lg font-semibold text-typography-900" numberOfLines={1}>
                {unit.Name}
              </Text>
            </HStack>
            {hasLocation && <Icon as={MapPin} size="sm" className="text-success-600" />}
          </HStack>

          {unit.Type && <Text className="text-sm text-typography-600">{unit.Type}</Text>}

          <HStack className="flex-wrap items-center" space="xs">
            {unit.GroupName ? (
              <Badge action="info" variant="outline" size="sm">
                <BadgeText>{unit.GroupName}</BadgeText>
              </Badge>
            ) : null}

            {unit.PlateNumber ? (
              <Badge action="muted" variant="outline" size="sm">
                <BadgeText>{unit.PlateNumber}</BadgeText>
              </Badge>
            ) : null}

            {unit.FourWheelDrive ? (
              <Badge action="warning" variant="outline" size="sm">
                <BadgeText>{t('units.fourWheelDrive')}</BadgeText>
              </Badge>
            ) : null}

            {unit.SpecialPermit ? (
              <Badge action="success" variant="outline" size="sm">
                <BadgeText>{t('units.specialPermit')}</BadgeText>
              </Badge>
            ) : null}
          </HStack>

          {unit.Note ? (
            <Text className="text-xs text-typography-500" numberOfLines={2}>
              {unit.Note}
            </Text>
          ) : null}
        </VStack>
      </Box>
    </Pressable>
  );
};
