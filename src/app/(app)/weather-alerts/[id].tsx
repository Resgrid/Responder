import Mapbox from '@rnmapbox/maps';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Clock, Info, MapPin, Shield } from 'lucide-react-native';
import React, { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet } from 'react-native';

import { Box } from '@/components/ui/box';
import { FocusAwareStatusBar } from '@/components/ui/focus-aware-status-bar';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { formatWeatherAlertTranslation } from '@/components/weather-alerts/weather-alert-formatters';
import { getWeatherAlertRequestId } from '@/components/weather-alerts/weather-alert-list-utils';
import { WeatherAlertSeverityBadge } from '@/components/weather-alerts/weather-alert-severity-badge';
import { SEVERITY_COLORS } from '@/models/v4/weatherAlerts/weatherAlertEnums';
import { useWeatherAlertsStore } from '@/stores/weather-alerts/weather-alerts-store';

function parsePolygon(polygonStr: string): [number, number][] | null {
  if (!polygonStr) return null;
  try {
    const parsed = JSON.parse(polygonStr);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed as [number, number][];
    }
  } catch {
    // Try parsing as space-separated coordinate pairs (NWS format: "lat,lng lat,lng ...")
    const pairs = polygonStr.trim().split(/\s+/);
    if (pairs.length >= 3) {
      const coords = pairs.map((pair) => {
        const [lat, lng] = pair.split(',').map(Number);
        return [lng, lat] as [number, number];
      });
      if (coords.every(([lng, lat]) => !isNaN(lng) && !isNaN(lat))) {
        return coords;
      }
    }
  }
  return null;
}

function formatDateTime(dateStr: string): string {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleString();
  } catch {
    return dateStr;
  }
}

export default function WeatherAlertDetail() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { selectedAlert, isLoadingDetail, fetchAlertDetail, selectAlertByIdentity } = useWeatherAlertsStore();
  const alertIdentity = typeof id === 'string' ? decodeURIComponent(id).trim() : '';

  useEffect(() => {
    if (alertIdentity.length === 0) {
      return;
    }

    const matchedAlert = selectAlertByIdentity(alertIdentity);
    const requestId = matchedAlert ? getWeatherAlertRequestId(matchedAlert) : '';

    if (requestId.length > 0) {
      fetchAlertDetail(requestId);
    }
  }, [alertIdentity, fetchAlertDetail, selectAlertByIdentity]);

  const polygonCoords = useMemo(() => {
    if (!selectedAlert?.Polygon) return null;
    return parsePolygon(selectedAlert.Polygon);
  }, [selectedAlert?.Polygon]);

  const geoJsonShape = useMemo(() => {
    if (!polygonCoords) return null;
    return {
      type: 'Feature' as const,
      geometry: {
        type: 'Polygon' as const,
        coordinates: [polygonCoords],
      },
      properties: {},
    };
  }, [polygonCoords]);

  const mapCenter = useMemo((): [number, number] | null => {
    if (polygonCoords && polygonCoords.length > 0) {
      const lngs = polygonCoords.map((c) => c[0]);
      const lats = polygonCoords.map((c) => c[1]);
      return [(Math.min(...lngs) + Math.max(...lngs)) / 2, (Math.min(...lats) + Math.max(...lats)) / 2];
    }
    if (selectedAlert?.Latitude && selectedAlert?.Longitude) {
      return [parseFloat(selectedAlert.Longitude), parseFloat(selectedAlert.Latitude)];
    }
    return null;
  }, [polygonCoords, selectedAlert?.Latitude, selectedAlert?.Longitude]);

  if (isLoadingDetail || !selectedAlert) {
    return (
      <VStack className="size-full flex-1 items-center justify-center">
        <FocusAwareStatusBar />
        <ActivityIndicator size="large" />
      </VStack>
    );
  }

  const accentColor = SEVERITY_COLORS[selectedAlert.Severity] ?? SEVERITY_COLORS.Unknown;

  return (
    <VStack className="size-full flex-1" testID="weather-alert-detail">
      <FocusAwareStatusBar />

      {/* Header */}
      <HStack className="items-center bg-white px-4 pb-3 pt-2 dark:bg-gray-900" space="md">
        <Pressable onPress={() => router.back()} testID="weather-alert-back">
          <ArrowLeft size={24} color="#374151" />
        </Pressable>
        <Text className="flex-1 text-lg font-bold text-gray-900 dark:text-white" numberOfLines={1}>
          {selectedAlert.Event}
        </Text>
      </HStack>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Severity + Category Header */}
        <Box className="bg-white px-4 py-3 dark:bg-gray-900">
          <HStack className="items-center" space="md">
            <WeatherAlertSeverityBadge severity={selectedAlert.Severity} />
            {selectedAlert.Category ? <Text className="text-sm text-gray-500 dark:text-gray-400">{formatWeatherAlertTranslation(t, 'category', selectedAlert.Category)}</Text> : null}
          </HStack>
        </Box>

        {/* Headline */}
        {selectedAlert.Headline ? (
          <Box className="bg-white px-4 pb-3 dark:bg-gray-900">
            <Text className="text-base font-semibold text-gray-800 dark:text-gray-200">{selectedAlert.Headline}</Text>
          </Box>
        ) : null}

        {/* Timing */}
        <Box className="mx-4 mt-3 rounded-xl bg-white p-4 shadow-sm dark:bg-gray-800">
          <HStack className="items-center" space="sm">
            <Clock size={16} color="#6B7280" />
            <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('weatherAlerts.detail.timing')}</Text>
          </HStack>
          <VStack className="mt-2" space="xs">
            {selectedAlert.Effective ? (
              <HStack className="justify-between">
                <Text className="text-sm text-gray-500">{t('weatherAlerts.detail.effective')}</Text>
                <Text className="text-sm text-gray-700 dark:text-gray-300">{formatDateTime(selectedAlert.Effective)}</Text>
              </HStack>
            ) : null}
            {selectedAlert.Onset ? (
              <HStack className="justify-between">
                <Text className="text-sm text-gray-500">{t('weatherAlerts.detail.onset')}</Text>
                <Text className="text-sm text-gray-700 dark:text-gray-300">{formatDateTime(selectedAlert.Onset)}</Text>
              </HStack>
            ) : null}
            {selectedAlert.Expires ? (
              <HStack className="justify-between">
                <Text className="text-sm text-gray-500">{t('weatherAlerts.detail.expires')}</Text>
                <Text className="text-sm text-gray-700 dark:text-gray-300">{formatDateTime(selectedAlert.Expires)}</Text>
              </HStack>
            ) : null}
          </VStack>
        </Box>

        {/* Area */}
        {selectedAlert.AreaDescription ? (
          <Box className="mx-4 mt-3 rounded-xl bg-white p-4 shadow-sm dark:bg-gray-800">
            <HStack className="items-center" space="sm">
              <MapPin size={16} color="#6B7280" />
              <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('weatherAlerts.detail.area')}</Text>
            </HStack>
            <Text className="mt-2 text-sm text-gray-600 dark:text-gray-400">{selectedAlert.AreaDescription}</Text>
          </Box>
        ) : null}

        {/* Map */}
        {mapCenter ? (
          <Box className="mx-4 mt-3 overflow-hidden rounded-xl" style={styles.mapContainer}>
            <Mapbox.MapView style={styles.map} styleURL={Mapbox.StyleURL.Street}>
              <Mapbox.Camera centerCoordinate={mapCenter} zoomLevel={7} animationMode="none" />
              {geoJsonShape ? (
                <Mapbox.ShapeSource id="alertPolygon" shape={geoJsonShape as GeoJSON.Feature}>
                  <Mapbox.FillLayer
                    id="alertPolygonFill"
                    style={{
                      fillColor: accentColor,
                      fillOpacity: 0.2,
                    }}
                  />
                  <Mapbox.LineLayer
                    id="alertPolygonLine"
                    style={{
                      lineColor: accentColor,
                      lineWidth: 2,
                    }}
                  />
                </Mapbox.ShapeSource>
              ) : (
                <Mapbox.PointAnnotation id="alertCenter" coordinate={mapCenter}>
                  <Box style={[styles.marker, { backgroundColor: accentColor }]} />
                </Mapbox.PointAnnotation>
              )}
            </Mapbox.MapView>
          </Box>
        ) : null}

        {/* Description */}
        {selectedAlert.Description ? (
          <Box className="mx-4 mt-3 rounded-xl bg-white p-4 shadow-sm dark:bg-gray-800">
            <Text className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">{t('weatherAlerts.detail.description')}</Text>
            <Text className="text-sm leading-5 text-gray-600 dark:text-gray-400">{selectedAlert.Description}</Text>
          </Box>
        ) : null}

        {/* Instructions */}
        {selectedAlert.Instruction ? (
          <Box className="mx-4 mt-3 rounded-xl border p-4" style={{ borderColor: accentColor, backgroundColor: `${accentColor}10` }}>
            <HStack className="items-center" space="sm">
              <Shield size={16} color={accentColor} />
              <Text className="text-sm font-semibold" style={{ color: accentColor }}>
                {t('weatherAlerts.detail.instructions')}
              </Text>
            </HStack>
            <Text className="mt-2 text-sm leading-5 text-gray-700 dark:text-gray-300">{selectedAlert.Instruction}</Text>
          </Box>
        ) : null}

        {/* Metadata */}
        <Box className="mx-4 mt-3 rounded-xl bg-white p-4 shadow-sm dark:bg-gray-800">
          <HStack className="items-center" space="sm">
            <Info size={16} color="#6B7280" />
            <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('weatherAlerts.detail.metadata')}</Text>
          </HStack>
          <VStack className="mt-2" space="xs">
            {selectedAlert.Urgency ? (
              <HStack className="justify-between">
                <Text className="text-sm text-gray-500">{t('weatherAlerts.urgency.label')}</Text>
                <Text className="text-sm text-gray-700 dark:text-gray-300">{formatWeatherAlertTranslation(t, 'urgency', selectedAlert.Urgency)}</Text>
              </HStack>
            ) : null}
            {selectedAlert.Certainty ? (
              <HStack className="justify-between">
                <Text className="text-sm text-gray-500">{t('weatherAlerts.certainty.label')}</Text>
                <Text className="text-sm text-gray-700 dark:text-gray-300">{formatWeatherAlertTranslation(t, 'certainty', selectedAlert.Certainty)}</Text>
              </HStack>
            ) : null}
            {selectedAlert.Status ? (
              <HStack className="justify-between">
                <Text className="text-sm text-gray-500">{t('weatherAlerts.detail.status')}</Text>
                <Text className="text-sm text-gray-700 dark:text-gray-300">{formatWeatherAlertTranslation(t, 'status', selectedAlert.Status)}</Text>
              </HStack>
            ) : null}
            {selectedAlert.SenderName ? (
              <HStack className="justify-between">
                <Text className="text-sm text-gray-500">{t('weatherAlerts.detail.sender')}</Text>
                <Text className="text-sm text-gray-700 dark:text-gray-300">{selectedAlert.SenderName}</Text>
              </HStack>
            ) : null}
          </VStack>
        </Box>
      </ScrollView>
    </VStack>
  );
}

const styles = StyleSheet.create({
  mapContainer: {
    height: 250,
  },
  map: {
    flex: 1,
  },
  marker: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
});
