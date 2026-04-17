import { AlertTriangle, CloudLightning, Flame, Heart, Leaf, Mountain } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet } from 'react-native';

import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { formatWeatherAlertTranslation, normalizeWeatherAlertSeverity } from '@/components/weather-alerts/weather-alert-formatters';
import { getTimeAgoUtc } from '@/lib/utils';
import { SEVERITY_COLORS } from '@/models/v4/weatherAlerts/weatherAlertEnums';
import type { WeatherAlertResultData } from '@/models/v4/weatherAlerts/weatherAlertResultData';

import { getWeatherAlertRequestId } from './weather-alert-list-utils';
import { WeatherAlertSeverityBadge } from './weather-alert-severity-badge';

const CATEGORY_ICON_MAP: Record<string, React.ElementType> = {
  Met: CloudLightning,
  Fire: Flame,
  Health: Heart,
  Env: Leaf,
  Geo: Mountain,
};

interface WeatherAlertCardProps {
  alert: WeatherAlertResultData;
  onPress: () => void;
}

export const WeatherAlertCard: React.FC<WeatherAlertCardProps> = ({ alert, onPress }) => {
  const { t } = useTranslation();
  const normalizedSeverity = normalizeWeatherAlertSeverity(alert.Severity);
  const accentColor = SEVERITY_COLORS[normalizedSeverity] ?? SEVERITY_COLORS.Unknown;
  const CategoryIcon = CATEGORY_ICON_MAP[alert.Category] ?? AlertTriangle;
  const alertRequestId = getWeatherAlertRequestId(alert);

  const handlePress = React.useCallback(() => {
    if (alertRequestId.length > 0 || alert.Event.length > 0) {
      onPress();
    }
  }, [onPress, alertRequestId, alert.Event]);

  const expiresText = alert.Expires ? getTimeAgoUtc(alert.Expires) : '';

  return (
    <Pressable onPress={handlePress} testID={`weather-alert-card-${alertRequestId || 'unknown'}`}>
      <Box className="mb-3 overflow-hidden rounded-xl bg-white shadow-sm dark:bg-gray-800" style={[styles.card]}>
        <HStack className="flex-1">
          <Box style={[styles.accent, { backgroundColor: accentColor }]} />
          <VStack className="flex-1 p-3" space="sm">
            <HStack className="items-center justify-between">
              <HStack className="items-center" space="sm">
                <CategoryIcon size={18} color={accentColor} />
                <WeatherAlertSeverityBadge severity={normalizedSeverity} />
              </HStack>
              {expiresText ? <Text className="text-xs text-gray-500 dark:text-gray-400">{expiresText}</Text> : null}
            </HStack>

            <Text className="text-base font-bold text-gray-900 dark:text-white" numberOfLines={2}>
              {alert.Event}
            </Text>

            {alert.AreaDescription ? (
              <Text className="text-sm text-gray-600 dark:text-gray-300" numberOfLines={1}>
                {alert.AreaDescription}
              </Text>
            ) : null}

            <HStack className="items-center" space="md">
              {alert.Urgency ? (
                <Text className="text-xs text-gray-500 dark:text-gray-400">
                  {t('weatherAlerts.urgency.label')}: {formatWeatherAlertTranslation(t, 'urgency', alert.Urgency)}
                </Text>
              ) : null}
              {alert.Certainty ? (
                <Text className="text-xs text-gray-500 dark:text-gray-400">
                  {t('weatherAlerts.certainty.label')}: {formatWeatherAlertTranslation(t, 'certainty', alert.Certainty)}
                </Text>
              ) : null}
            </HStack>
          </VStack>
        </HStack>
      </Box>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
  },
  accent: {
    width: 5,
  },
});
