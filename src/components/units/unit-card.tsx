import { MapPin, Truck } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable } from 'react-native';

import { type StatusesResultData } from '@/models/v4/statuses/statusesResultData';
import { type UnitTypeStatusResultData } from '@/models/v4/statuses/unitTypeStatusResultData';
import { type UnitInfoResultData } from '@/models/v4/units/unitInfoResultData';
import { type UnitResultData } from '@/models/v4/units/unitResultData';

import { Badge, BadgeText } from '../ui/badge';
import { Box } from '../ui/box';
import { HStack } from '../ui/hstack';
import { Icon } from '../ui/icon';
import { Text } from '../ui/text';
import { VStack } from '../ui/vstack';

// Default unit statuses when custom statuses are not defined
const DEFAULT_UNIT_STATUSES: Record<string, { text: string; color: string }> = {
  '0': { text: 'units.status.available', color: '#28a745' }, // Green
  '1': { text: 'units.status.delayed', color: '#ffc107' }, // Yellow
  '2': { text: 'units.status.unavailable', color: '#dc3545' }, // Red
  '3': { text: 'units.status.committed', color: '#007bff' }, // Blue
  '4': { text: 'units.status.outOfService', color: '#6c757d' }, // Gray
  '5': { text: 'units.status.responding', color: '#17a2b8' }, // Cyan
  '6': { text: 'units.status.onScene', color: '#6f42c1' }, // Purple
  '7': { text: 'units.status.staging', color: '#fd7e14' }, // Orange
  '8': { text: 'units.status.returning', color: '#20c997' }, // Teal
  '9': { text: 'units.status.cancelled', color: '#795548' }, // Brown
  '10': { text: 'units.status.released', color: '#87ceeb' }, // Light Blue
  '11': { text: 'units.status.manual', color: '#e83e8c' }, // Pink
  '12': { text: 'units.status.enroute', color: '#155724' }, // Dark Green
};

// Helper function to get contrasting text color based on background luminance
const getContrastTextColor = (hexColor: string): string => {
  // Remove # if present
  const hex = hexColor.replace('#', '');

  // Parse RGB values
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Calculate relative luminance using sRGB
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  // Return white for dark backgrounds, black for light backgrounds
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
};

// Helper function to find status data for a unit based on unit type and status ID
const findUnitStatus = (unitType: string, statusId: string, unitTypeStatuses: UnitTypeStatusResultData[]): StatusesResultData | null => {
  if (!statusId || !unitTypeStatuses.length) return null;

  // Find the status set for this unit type
  const unitTypeStatus = unitTypeStatuses.find((uts) => uts.UnitType === unitType);

  if (!unitTypeStatus) return null;

  // Find the specific status by StateId
  const status = unitTypeStatus.Statuses.find((s) => s.StateId.toString() === statusId || s.Id.toString() === statusId);

  return status || null;
};

// Helper function to get default status by ID
const getDefaultStatus = (statusId: string): { text: string; color: string } | null => {
  return DEFAULT_UNIT_STATUSES[statusId] || null;
};

// Union type for unit data
type UnitData = UnitResultData | UnitInfoResultData;

interface UnitCardProps {
  unit: UnitData;
  unitTypeStatuses: UnitTypeStatusResultData[];
  onPress: (id: string) => void;
}

export const UnitCard: React.FC<UnitCardProps> = ({ unit, unitTypeStatuses, onPress }) => {
  const { t } = useTranslation();
  const hasLocation = unit.Latitude && unit.Longitude;

  // Get status ID and unit type from UnitInfoResultData if available
  const statusId = 'CurrentStatusId' in unit ? unit.CurrentStatusId : null;
  const unitType = unit.Type || '';

  // Find the status data from unit type statuses (custom statuses)
  const customStatusData = statusId ? findUnitStatus(unitType, statusId, unitTypeStatuses) : null;

  // Fall back to default status if custom status not found
  const defaultStatus = statusId && !customStatusData ? getDefaultStatus(statusId) : null;

  // Get status text and colors - prioritize custom, then default, then API response
  const statusText = customStatusData?.Text || (defaultStatus?.text ? t(defaultStatus.text) : null) || ('CurrentStatus' in unit ? unit.CurrentStatus : null);
  const buttonColor = customStatusData?.BColor || defaultStatus?.color || ('CurrentStatusColor' in unit ? unit.CurrentStatusColor : null);
  const textColor = buttonColor ? getContrastTextColor(buttonColor) : '#FFFFFF';

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
            <HStack className="items-center" space="sm">
              {statusText ? (
                <Box className="rounded-md px-2 py-1" style={buttonColor ? { backgroundColor: buttonColor } : { backgroundColor: '#6B7280' }} testID={`unit-status-box-${unit.UnitId}`}>
                  <Text className="text-xs font-medium" style={{ color: textColor }}>
                    {statusText}
                  </Text>
                </Box>
              ) : null}
              {hasLocation ? <Icon as={MapPin} size="sm" className="text-success-600" /> : null}
            </HStack>
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
