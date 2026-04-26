import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeftIcon, MapIcon, RouteIcon } from 'lucide-react-native';
import React, { useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, View } from 'react-native';

import { Loading } from '@/components/common/loading';
import ZeroState from '@/components/common/zero-state';
import StaticMap from '@/components/maps/static-map';
import { FocusAwareStatusBar, SafeAreaView } from '@/components/ui';
import { Badge } from '@/components/ui/badge';
import { Box } from '@/components/ui/box';
import { Button, ButtonIcon, ButtonText } from '@/components/ui/button';
import { Heading } from '@/components/ui/heading';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { useAnalytics } from '@/hooks/use-analytics';
import { openMapsWithDirections } from '@/lib/navigation';
import { getPoiDisplayName } from '@/lib/poi';
import { useLocationStore } from '@/stores/app/location-store';
import { usePoiStore } from '@/stores/poi/store';
import { usePersonnelStatusBottomSheetStore } from '@/stores/status/personnel-status-store';
import { useToastStore } from '@/stores/toast/store';

const parsePoiId = (id: string | string[] | undefined) => {
  const rawValue = Array.isArray(id) ? id[0] : id;
  const nextPoiId = Number(rawValue);
  return Number.isFinite(nextPoiId) ? nextPoiId : null;
};

export default function PoiDetail() {
  const { t } = useTranslation();
  const router = useRouter();
  const { trackEvent } = useAnalytics();
  const { id } = useLocalSearchParams();
  const poiId = parsePoiId(id);
  const poi = usePoiStore((state) => (poiId != null ? state.getPoiById(poiId) : null));
  const fetchPoiDetail = usePoiStore((state) => state.fetchPoiDetail);
  const isLoadingPoi = usePoiStore((state) => state.isLoadingPoi);
  const error = usePoiStore((state) => state.error);
  const showToast = useToastStore((state) => state.showToast);
  const userLocation = useLocationStore((state) => ({
    latitude: state.latitude,
    longitude: state.longitude,
  }));

  useEffect(() => {
    if (poiId != null) {
      void fetchPoiDetail(poiId);
    }
  }, [fetchPoiDetail, poiId]);

  useEffect(() => {
    if (poi) {
      trackEvent('poi_detail_viewed', {
        timestamp: new Date().toISOString(),
        poiId: poi.PoiId,
        poiTypeId: poi.PoiTypeId,
        isDestination: poi.IsDestination,
      });
    }
  }, [poi, trackEvent]);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  const handleOpenMaps = useCallback(async () => {
    if (!poi) {
      return;
    }

    const success = await openMapsWithDirections(poi.Latitude, poi.Longitude, getPoiDisplayName(poi), userLocation.latitude ?? undefined, userLocation.longitude ?? undefined);

    if (!success) {
      showToast('error', t('poi.route_error'));
    }
  }, [poi, showToast, t, userLocation.latitude, userLocation.longitude]);

  const handleViewOnMap = useCallback(() => {
    if (!poi) {
      return;
    }

    router.push(`/(app)/map?tab=map&poiId=${poi.PoiId}`);
  }, [poi, router]);

  const handleSetStatusDestination = useCallback(() => {
    if (!poi || !poi.IsDestination) {
      return;
    }

    usePersonnelStatusBottomSheetStore.getState().setIsOpen(true, undefined, { preselectedPoi: poi });
    router.push('/(app)/home');
  }, [poi, router]);

  const title = poi ? getPoiDisplayName(poi) : t('poi.title');

  if (poiId == null) {
    return (
      <>
        <Stack.Screen
          options={{
            title: t('poi.title'),
            headerShown: true,
            headerLeft: () => (
              <Pressable onPress={handleBack} className="p-2" testID="back-button">
                <ArrowLeftIcon size={24} className="text-gray-700 dark:text-gray-300" />
              </Pressable>
            ),
          }}
        />
        <SafeAreaView className="size-full flex-1">
          <FocusAwareStatusBar hidden={true} />
          <ZeroState heading={t('poi.invalid_title')} description={t('poi.invalid_description')} isError={true} />
        </SafeAreaView>
      </>
    );
  }

  if (isLoadingPoi && !poi) {
    return (
      <>
        <Stack.Screen
          options={{
            title: t('poi.title'),
            headerShown: true,
            headerLeft: () => (
              <Pressable onPress={handleBack} className="p-2" testID="back-button">
                <ArrowLeftIcon size={24} className="text-gray-700 dark:text-gray-300" />
              </Pressable>
            ),
          }}
        />
        <SafeAreaView className="size-full flex-1">
          <FocusAwareStatusBar hidden={true} />
          <Loading text={t('poi.loading_detail')} />
        </SafeAreaView>
      </>
    );
  }

  if (!poi) {
    return (
      <>
        <Stack.Screen
          options={{
            title: t('poi.title'),
            headerShown: true,
            headerLeft: () => (
              <Pressable onPress={handleBack} className="p-2" testID="back-button">
                <ArrowLeftIcon size={24} className="text-gray-700 dark:text-gray-300" />
              </Pressable>
            ),
          }}
        />
        <SafeAreaView className="size-full flex-1">
          <FocusAwareStatusBar hidden={true} />
          <ZeroState heading={t('poi.load_error_title')} description={error || t('poi.not_found')} isError={true} />
        </SafeAreaView>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title,
          headerShown: true,
          headerLeft: () => (
            <Pressable onPress={handleBack} className="p-2" testID="back-button">
              <ArrowLeftIcon size={24} className="text-gray-700 dark:text-gray-300" />
            </Pressable>
          ),
        }}
      />
      <SafeAreaView className="size-full flex-1">
        <FocusAwareStatusBar hidden={true} />
        <ScrollView className="flex-1 bg-neutral-50 dark:bg-neutral-950">
          <Box className="p-4">
            <VStack space="md">
              <VStack space="xs">
                <HStack className="items-center justify-between">
                  <Heading size="lg">{title}</Heading>
                  {poi.IsDestination ? (
                    <Badge action="success" size="sm" variant="solid">
                      <Text className="text-xs text-white">{t('poi.destination_enabled')}</Text>
                    </Badge>
                  ) : null}
                </HStack>
                <Text className="text-sm text-primary-600 dark:text-primary-400">{poi.PoiTypeName}</Text>
              </VStack>

              <StaticMap latitude={poi.Latitude} longitude={poi.Longitude} address={poi.Address || title} zoom={15} height={220} showUserLocation={true} />

              <HStack space="sm" className="flex-wrap">
                <Button variant="outline" className="flex-1" onPress={handleViewOnMap}>
                  <ButtonIcon as={MapIcon} />
                  <ButtonText>{t('poi.view_on_map')}</ButtonText>
                </Button>
                <Button className="flex-1 bg-primary-600" onPress={handleOpenMaps}>
                  <ButtonIcon as={RouteIcon} />
                  <ButtonText>{t('common.route')}</ButtonText>
                </Button>
              </HStack>

              {poi.IsDestination ? (
                <Button variant="outline" onPress={handleSetStatusDestination}>
                  <ButtonText>{t('poi.set_status_destination')}</ButtonText>
                </Button>
              ) : null}

              <Box className="rounded-lg bg-white p-4 dark:bg-neutral-900">
                <VStack space="md">
                  <VStack space="xs">
                    <Text className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{t('poi.type_label')}</Text>
                    <Text className="text-base text-gray-900 dark:text-gray-100">{poi.PoiTypeName}</Text>
                  </VStack>

                  {poi.Address ? (
                    <VStack space="xs">
                      <Text className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{t('poi.address_label')}</Text>
                      <Text className="text-base text-gray-900 dark:text-gray-100">{poi.Address}</Text>
                    </VStack>
                  ) : null}

                  {poi.Note ? (
                    <VStack space="xs">
                      <Text className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{t('poi.note_label')}</Text>
                      <Text className="text-base text-gray-900 dark:text-gray-100">{poi.Note}</Text>
                    </VStack>
                  ) : null}

                  <VStack space="xs">
                    <Text className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{t('poi.coordinates_label')}</Text>
                    <Text className="text-base text-gray-900 dark:text-gray-100">
                      {poi.Latitude.toFixed(6)}, {poi.Longitude.toFixed(6)}
                    </Text>
                  </VStack>
                </VStack>
              </Box>
            </VStack>
          </Box>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}
