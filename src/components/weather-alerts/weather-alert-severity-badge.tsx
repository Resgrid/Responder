import React from 'react';

import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { normalizeWeatherAlertSeverity } from '@/components/weather-alerts/weather-alert-formatters';
import { SEVERITY_COLORS } from '@/models/v4/weatherAlerts/weatherAlertEnums';

interface WeatherAlertSeverityBadgeProps {
  severity: string;
  label?: string;
}

export const WeatherAlertSeverityBadge: React.FC<WeatherAlertSeverityBadgeProps> = ({ severity, label }) => {
  const normalizedSeverity = normalizeWeatherAlertSeverity(severity);
  const color = SEVERITY_COLORS[normalizedSeverity] ?? SEVERITY_COLORS.Unknown;
  const displayLabel = label ?? normalizedSeverity;

  return (
    <HStack className="items-center" space="xs">
      <Box style={{ backgroundColor: color, width: 10, height: 10, borderRadius: 5 }} />
      <Text className="text-xs font-semibold" style={{ color }}>
        {displayLabel}
      </Text>
    </HStack>
  );
};
