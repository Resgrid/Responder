import { useRouter } from 'expo-router';
import { AlertTriangle, CloudLightning, Flame, Heart, Leaf, Mountain } from 'lucide-react-native';
import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet } from 'react-native';

import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { normalizeWeatherAlertSeverity } from '@/components/weather-alerts/weather-alert-formatters';
import { SEVERITY_COLORS } from '@/models/v4/weatherAlerts/weatherAlertEnums';
import type { WeatherAlertResultData } from '@/models/v4/weatherAlerts/weatherAlertResultData';
import { useWeatherAlertsStore } from '@/stores/weather-alerts/weather-alerts-store';

const CATEGORY_ICON_MAP: Record<string, React.ElementType> = {
  Met: CloudLightning,
  Fire: Flame,
  Health: Heart,
  Env: Leaf,
  Geo: Mountain,
};

export const WeatherAlertBanner: React.FC = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const settings = useWeatherAlertsStore((state) => state.settings);
  const getSevereAlerts = useWeatherAlertsStore((state) => state.getSevereAlerts);
  const severeAlerts = getSevereAlerts();

  const handlePress = useCallback(() => {
    router.push('/(app)/weather-alerts' as never);
  }, [router]);

  if (!settings?.WeatherAlertsEnabled || severeAlerts.length === 0) {
    return null;
  }

  const topAlert: WeatherAlertResultData = severeAlerts[0];
  const moreCount = severeAlerts.length - 1;
  const bgColor = SEVERITY_COLORS[normalizeWeatherAlertSeverity(topAlert.Severity)] ?? SEVERITY_COLORS.Severe;
  const CategoryIcon = CATEGORY_ICON_MAP[topAlert.Category] ?? AlertTriangle;

  return (
    <Pressable onPress={handlePress} testID="weather-alert-banner">
      <Box style={[styles.banner, { backgroundColor: bgColor }]} className="mx-4 mt-4 rounded-xl px-4 py-3">
        <HStack className="items-center" space="sm">
          <CategoryIcon size={20} color="#FFFFFF" />
          <Text className="flex-1 text-sm font-bold text-white" numberOfLines={1}>
            {topAlert.Event}
          </Text>
          {moreCount > 0 ? (
            <Box className="rounded-full bg-white/30 px-2 py-0.5">
              <Text className="text-xs font-semibold text-white">{t('weatherAlerts.banner.moreAlerts', { count: moreCount })}</Text>
            </Box>
          ) : null}
        </HStack>
      </Box>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  banner: {
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
});
