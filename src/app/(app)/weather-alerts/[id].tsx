import Mapbox from '@rnmapbox/maps';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Clock, Info, MapPin, Shield } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet } from 'react-native';

import { ScreenHeader } from '@/components/common/screen-header';
import FullScreenMapModal from '@/components/maps/full-screen-map-modal';
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

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const handleOpenMapModal = useCallback(() => {
    setIsMapModalOpen(true);
  }, []);
  const handleCloseMapModal = useCallback(() => {
    setIsMapModalOpen(false);
  }, []);

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

  const polygonExtrema = useMemo(() => {
    if (!polygonCoords || polygonCoords.length === 0) {
      return null;
    }
    let minLng = polygonCoords[0]![0];
    let maxLng = polygonCoords[0]![0];
    let minLat = polygonCoords[0]![1];
    let maxLat = polygonCoords[0]![1];
    for (const [lng, lat] of polygonCoords) {
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    }
    return { minLng, maxLng, minLat, maxLat };
  }, [polygonCoords]);

  const mapCenter = useMemo((): [number, number] | null => {
    if (polygonExtrema) {
      return [(polygonExtrema.minLng + polygonExtrema.maxLng) / 2, (polygonExtrema.minLat + polygonExtrema.maxLat) / 2];
    }
    if (selectedAlert?.Latitude && selectedAlert?.Longitude) {
      return [parseFloat(selectedAlert.Longitude), parseFloat(selectedAlert.Latitude)];
    }
    return null;
  }, [polygonExtrema, selectedAlert?.Latitude, selectedAlert?.Longitude]);

  // Fit the camera to the polygon so the whole impacted area is visible —
  // a fixed zoom clips large warnings and shrinks small ones to a dot.
  // >= 3 points required, matching the geometry actually drawn.
  const mapBounds = useMemo(() => {
    if (!polygonExtrema || !polygonCoords || polygonCoords.length < 3) {
      return null;
    }
    return {
      ne: [polygonExtrema.maxLng, polygonExtrema.maxLat] as [number, number],
      sw: [polygonExtrema.minLng, polygonExtrema.minLat] as [number, number],
      paddingTop: 24,
      paddingBottom: 24,
      paddingLeft: 24,
      paddingRight: 24,
    };
  }, [polygonExtrema, polygonCoords]);

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
      <ScreenHeader title={selectedAlert.Event} onBack={handleBack} />

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
            <Mapbox.MapView style={styles.map} styleURL={Mapbox.StyleURL.Street} scrollEnabled={false} zoomEnabled={false} rotateEnabled={false} pitchEnabled={false} compassEnabled={false}>
              {mapBounds ? <Mapbox.Camera bounds={mapBounds} animationMode="none" /> : <Mapbox.Camera centerCoordinate={mapCenter} zoomLevel={7} animationMode="none" />}
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
            {/* Transparent tap overlay — gestures are disabled on the inline map; tapping opens the interactive full-screen map */}
            <Pressable onPress={handleOpenMapModal} accessibilityRole="button" accessibilityLabel={t('weatherAlerts.detail.area')} testID="weather-alert-map-press" style={StyleSheet.absoluteFill} />
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

      {/* Full-screen interactive map of the impacted area */}
      {isMapModalOpen && mapCenter ? (
        <FullScreenMapModal
          isOpen={isMapModalOpen}
          onClose={handleCloseMapModal}
          latitude={mapCenter[1]}
          longitude={mapCenter[0]}
          address={selectedAlert.AreaDescription || selectedAlert.Event}
          zoom={8}
          polygon={polygonCoords ?? undefined}
          accentColor={accentColor}
        />
      ) : null}
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
