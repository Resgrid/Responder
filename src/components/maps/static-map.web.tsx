import Mapbox from '@rnmapbox/maps';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet } from 'react-native';

import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';

interface StaticMapProps {
  latitude: number;
  longitude: number;
  address?: string;
  zoom?: number;
  height?: number;
  showUserLocation?: boolean;
  onPress?: () => void;
}

const StaticMap: React.FC<StaticMapProps> = ({ latitude, longitude, address, zoom = 15, height = 200, showUserLocation = false, onPress }) => {
  const { t } = useTranslation();
  const [userCoordinate, setUserCoordinate] = useState<[number, number] | null>(null);

  useEffect(() => {
    if (!showUserLocation || typeof navigator === 'undefined' || !navigator.geolocation) {
      return;
    }

    let cancelled = false;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (!cancelled) {
          setUserCoordinate([position.coords.longitude, position.coords.latitude]);
        }
      },
      () => {
        // Geolocation unavailable or denied — skip rendering the indicator
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
    );

    return () => {
      cancelled = true;
    };
  }, [showUserLocation]);
  if (!latitude || !longitude) {
    return (
      <Box className="w-full items-center justify-center bg-gray-200" style={{ height }}>
        <Text className="text-gray-500">{t('call_detail.no_location')}</Text>
      </Box>
    );
  }

  return (
    <div style={{ width: '100%', height, position: 'relative', overflow: 'hidden' }}>
      <Mapbox.MapView style={{ flex: 1, width: '100%', height }} zoomEnabled={false} scrollEnabled={false} rotateEnabled={false} pitchEnabled={false}>
        <Mapbox.Camera zoomLevel={zoom} centerCoordinate={[longitude, latitude]} animationDuration={0} />
        <Mapbox.MarkerView coordinate={[longitude, latitude]}>
          <div
            style={{
              width: 20,
              height: 20,
              borderRadius: 10,
              backgroundColor: '#ef4444',
              border: '3px solid #ffffff',
            }}
          />
        </Mapbox.MarkerView>

        {showUserLocation && userCoordinate ? (
          <Mapbox.MarkerView coordinate={userCoordinate}>
            <div
              style={{
                width: 16,
                height: 16,
                borderRadius: 8,
                backgroundColor: '#3b82f6',
                border: '3px solid #ffffff',
                boxShadow: '0 0 0 4px rgba(59, 130, 246, 0.25)',
              }}
            />
          </Mapbox.MarkerView>
        ) : null}
      </Mapbox.MapView>

      {onPress ? <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={address || t('call_detail.title')} testID="static-map-press-overlay" style={StyleSheet.absoluteFill} /> : null}

      {address ? (
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            padding: 8,
            color: 'white',
            fontSize: 12,
            pointerEvents: 'none',
          }}
        >
          {address}
        </div>
      ) : null}
    </div>
  );
};

export default StaticMap;
