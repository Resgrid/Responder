import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useWindowDimensions, View } from 'react-native';

import MapPanel from '@/components/maps/map-panel';
import PoiListPanel from '@/components/maps/poi-list-panel';
import { SideMenu } from '@/components/sidebar/side-menu';
import { Button, ButtonText } from '@/components/ui/button';
import { Drawer, DrawerBackdrop, DrawerBody, DrawerContent, DrawerFooter } from '@/components/ui/drawer/index';
import { FocusAwareStatusBar } from '@/components/ui/focus-aware-status-bar';
import { SharedTabs, type TabItem } from '@/components/ui/shared-tabs';
import { type PoiResultData } from '@/models/v4/mapping/poiResultData';
import { usePoiStore } from '@/stores/poi/store';

export default function HomeMap() {
  const { t } = useTranslation();
  const router = useRouter();
  const { tab, poiId } = useLocalSearchParams<{ tab?: string | string[]; poiId?: string | string[] }>();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const [isSideMenuOpen, setIsSideMenuOpen] = useState(false);
  const fetchPoisData = usePoiStore((state) => state.fetchPoisData);

  useEffect(() => {
    void fetchPoisData();
  }, [fetchPoisData]);

  const selectedTab = Array.isArray(tab) ? tab[0] : tab;
  const selectedPoiId = useMemo(() => {
    const rawPoiId = Array.isArray(poiId) ? poiId[0] : poiId;
    const nextPoiId = Number(rawPoiId);
    return Number.isFinite(nextPoiId) ? nextPoiId : null;
  }, [poiId]);

  const focusedPoi = usePoiStore((state) => (selectedPoiId != null ? state.getPoiById(selectedPoiId) : null));
  const initialTabIndex = selectedTab === 'pois' ? 1 : 0;

  const handlePoiPress = useCallback(
    (poi: PoiResultData) => {
      router.push(`/poi/${poi.PoiId}`);
    },
    [router]
  );

  const handleViewPoiOnMap = useCallback(
    (poi: PoiResultData) => {
      router.push(`/(app)/map?tab=map&poiId=${poi.PoiId}`);
    },
    [router]
  );

  const tabs: TabItem[] = useMemo(
    () => [
      {
        key: 'map',
        title: t('map.tabs.map'),
        content: (
          <View className="flex-1 overflow-hidden rounded-[28px] border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <MapPanel focusedPoi={focusedPoi} />
          </View>
        ),
      },
      {
        key: 'pois',
        title: t('map.tabs.pois'),
        content: (
          <View className="flex-1 overflow-hidden rounded-[28px] border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <PoiListPanel onPoiPress={handlePoiPress} onViewOnMap={handleViewPoiOnMap} />
          </View>
        ),
      },
    ],
    [focusedPoi, handlePoiPress, handleViewPoiOnMap, t]
  );

  return (
    <>
      <View className="size-full flex-1 bg-neutral-100 dark:bg-neutral-950" testID="home-map-container">
        <FocusAwareStatusBar />

        {/* Content Area with Side Menu */}
        <View className="flex-1 flex-row p-4">
          {/* Permanent Side Menu in Landscape */}
          {isLandscape && (
            <View className="mr-4 w-[280px] overflow-hidden rounded-[28px] border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
              <SideMenu />
            </View>
          )}

          {/* Map Content */}
          <View className="flex-1">
            <SharedTabs
              key={selectedTab || 'map'}
              tabs={tabs}
              initialIndex={initialTabIndex}
              variant="segmented"
              size={isLandscape ? 'lg' : 'md'}
              scrollable={false}
              tabsContainerClassName="rounded-2xl border border-neutral-200 bg-white p-1.5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
              tabClassName="rounded-xl"
              contentClassName="pt-4"
            />
          </View>
        </View>
      </View>

      {/* Drawer for Portrait Mode */}
      {!isLandscape && (
        <Drawer isOpen={isSideMenuOpen} onClose={() => setIsSideMenuOpen(false)} size="lg">
          <DrawerBackdrop onPress={() => setIsSideMenuOpen(false)} />
          <DrawerContent className="bg-white dark:bg-gray-900">
            <DrawerBody className="p-0">
              <SideMenu onNavigate={() => setIsSideMenuOpen(false)} />
            </DrawerBody>
            <DrawerFooter className="border-t border-gray-200 p-3 dark:border-gray-800">
              <Button onPress={() => setIsSideMenuOpen(false)} className="w-full bg-primary-600">
                <ButtonText>{t('common.close')}</ButtonText>
              </Button>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      )}
    </>
  );
}
