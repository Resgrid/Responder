import { XIcon } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { getMapIconLegend } from '@/api/mapping/mapping';
import { Actionsheet, ActionsheetBackdrop, ActionsheetContent, ActionsheetDragIndicator, ActionsheetDragIndicatorWrapper } from '@/components/ui/actionsheet';
import { Button, ButtonText } from '@/components/ui/button';
import { Heading } from '@/components/ui/heading';
import { HStack } from '@/components/ui/hstack';
import { Pressable } from '@/components/ui/pressable';
import { ScrollView } from '@/components/ui/scroll-view';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { logger } from '@/lib/logging';
import { isPoiMarker } from '@/lib/poi';
import { type MapMakerInfoData } from '@/models/v4/mapping/getMapDataAndMarkersData';
import { type GetMapIconLegendResultData, type MapLegendPoiTypeData, type MapLegendRowData, type MapLegendStateData, type MapLegendStyleData } from '@/models/v4/mapping/getMapIconLegendResultData';
import { securityStore } from '@/stores/security/store';
import { TermKeys, useTerm } from '@/stores/terminology/store';

import { PinMarkerIcon } from './pin-marker';
import PoiPinMarker from './poi-pin-marker';

/** The size the map draws call, unit, personnel and station pins at (MapPins -> PinMarker). */
const ICON_SIZE = 32;

/** The ImagePath the map API gives station markers; the map draws them with it. */
const STATION_IMAGE_PATH = 'Station';

/** Labels for the style keys the server sends (MapLegendStyleData.Key / MapLegendStateData.IconStyle). */
const STYLE_LABEL_KEYS: Record<string, string> = {
  available: 'maps.legend.style.available',
  dispatched: 'maps.legend.style.dispatched',
  responding: 'maps.legend.style.responding',
  onscene: 'maps.legend.style.onscene',
  transporting: 'maps.legend.style.transporting',
  returning: 'maps.legend.style.returning',
  staging: 'maps.legend.style.staging',
  delayed: 'maps.legend.style.delayed',
  unavailable: 'maps.legend.style.unavailable',
  low: 'maps.legend.style.low',
  medium: 'maps.legend.style.medium',
  high: 'maps.legend.style.high',
  emergency: 'maps.legend.style.emergency',
};

const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

type LegendStatus = 'loading' | 'loaded' | 'error';

interface NormalizedLegend {
  statusStyles: MapLegendStyleData[];
  priorityStyles: MapLegendStyleData[];
  calls: MapLegendRowData[];
  units: MapLegendRowData[];
  personnel: MapLegendRowData[];
  poiTypes: MapLegendPoiTypeData[];
}

const asArray = <T,>(value: T[] | null | undefined): T[] => (Array.isArray(value) ? value.filter((item) => item != null) : []);

const asText = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

const asNames = (value: string[] | null | undefined): string[] =>
  asArray(value)
    .map(asText)
    .filter((name) => name.length > 0);

const asColor = (value: string | null | undefined): string | null => {
  const color = asText(value);
  return HEX_COLOR.test(color) ? color : null;
};

/** The legend with every list present (an absent or null list from the server is treated as empty). */
export const normalizeMapLegend = (data: GetMapIconLegendResultData | null | undefined): NormalizedLegend => {
  const rows = (value: MapLegendRowData[] | null | undefined) => asArray(value).map((row) => ({ ...row, States: asArray(row.States) }));

  return {
    statusStyles: asArray(data?.StatusStyles),
    priorityStyles: asArray(data?.PriorityStyles),
    calls: rows(data?.Calls),
    units: rows(data?.Units),
    personnel: rows(data?.Personnel),
    poiTypes: asArray(data?.PoiTypes),
  };
};

interface LegendIconProps {
  label: string;
  testID?: string;
  children: React.ReactNode;
}

/** An accessible box for a legend icon; the icons themselves are decorative (hidden from accessibility). */
const LegendIcon: React.FC<LegendIconProps> = ({ label, testID, children }) => (
  <View accessible={true} accessibilityRole="image" accessibilityLabel={label} testID={testID} style={styles.icon}>
    {children}
  </View>
);

interface MarkerIconProps {
  label: string;
  iconUrl?: string | null;
  pinIconUrl?: string | null;
  imagePath?: string | null;
  testID?: string;
}

/** A call, unit, personnel or station icon, drawn exactly as the map draws the marker (uploaded icon > styled pin > bundled pin). */
const MarkerIcon: React.FC<MarkerIconProps> = ({ label, iconUrl, pinIconUrl, imagePath, testID }) => (
  <LegendIcon label={label} testID={testID}>
    <PinMarkerIcon imagePath={imagePath} iconUrl={iconUrl} pinIconUrl={pinIconUrl} size={ICON_SIZE} />
  </LegendIcon>
);

const Swatch: React.FC<{ color: string | null; testID?: string }> = ({ color, testID }) => (
  <View testID={testID} style={[styles.swatch, color ? { backgroundColor: color } : styles.swatchEmpty]} accessibilityElementsHidden={true} importantForAccessibility="no-hide-descendants" />
);

const SectionHeading: React.FC<{ title: string; testID: string }> = ({ title, testID }) => (
  <Heading size="sm" accessibilityRole="header" className="mb-2 mt-5 text-gray-900 dark:text-gray-100" testID={testID}>
    {title}
  </Heading>
);

interface StyleRowProps {
  label: string;
  color: string | null;
  icons: MarkerIconProps[];
  lines: string[];
  testID: string;
}

const StyleRow: React.FC<StyleRowProps> = ({ label, color, icons, lines, testID }) => (
  <HStack space="md" className="items-center border-b border-gray-100 py-2 dark:border-neutral-800" testID={testID}>
    <HStack space="xs" className="items-center">
      {icons.map((icon) => (
        <MarkerIcon key={icon.testID ?? icon.label} {...icon} />
      ))}
    </HStack>
    <Swatch color={color} testID={`${testID}-swatch`} />
    <VStack className="flex-1">
      <Text className="text-sm font-semibold text-gray-900 dark:text-gray-100">{label}</Text>
      {lines.map((line, index) => (
        <Text key={`line-${index}`} className="text-xs text-gray-600 dark:text-gray-400">
          {line}
        </Text>
      ))}
    </VStack>
  </HStack>
);

interface LegendRowCardProps {
  row: MapLegendRowData;
  rowName: string;
  subtitle?: string | null;
  testID: string;
}

/** A call type, unit type or role: its own icon beside its name, then its icon in each priority or status. */
const LegendRowCard: React.FC<LegendRowCardProps> = ({ row, rowName, subtitle, testID }) => (
  <VStack className="mb-3 rounded-xl border border-gray-200 p-3 dark:border-neutral-700" testID={testID}>
    <HStack space="sm" className="items-center">
      <MarkerIcon label={rowName} iconUrl={row.IconUrl} pinIconUrl={row.PinIconUrl} imagePath={row.ImagePath} testID={`${testID}-icon`} />
      <VStack className="flex-1">
        <Text className="text-sm font-semibold text-gray-900 dark:text-gray-100">{rowName}</Text>
        {subtitle ? <Text className="text-xs text-gray-600 dark:text-gray-400">{subtitle}</Text> : null}
      </VStack>
    </HStack>
    {row.States.length > 0 ? (
      <View className="mt-2 flex-row flex-wrap">
        {row.States.map((state: MapLegendStateData, index: number) => {
          const stateName = asText(state.Name);
          const dotColor = asColor(state.Color);
          const stateTestID = `${testID}-state-${state.Id ?? index}`;

          return (
            <View key={`${state.Id ?? 'state'}-${index}`} className="w-1/2 flex-row items-center py-1 pr-2 md:w-1/3" testID={stateTestID}>
              <MarkerIcon label={`${rowName} · ${stateName}`} iconUrl={state.IconUrl} pinIconUrl={state.PinIconUrl} imagePath={asText(state.ImagePath) || row.ImagePath} testID={`${stateTestID}-icon`} />
              <Text className="ml-2 shrink text-xs text-gray-700 dark:text-gray-300" numberOfLines={2} accessibilityElementsHidden={true} importantForAccessibility="no">
                {stateName}
              </Text>
              {dotColor ? <View testID={`${stateTestID}-dot`} style={[styles.dot, { backgroundColor: dotColor }]} /> : null}
            </View>
          );
        })}
      </View>
    ) : null}
  </VStack>
);

interface MapLegendSheetProps {
  isOpen: boolean;
  onClose: () => void;
  /** A hydrant marker the map is drawing right now; the hydrant row shows only when there is one, drawn like it. */
  hydrantPin?: MapMakerInfoData | null;
}

/**
 * Bottom sheet listing every icon the department's map can show, named with the department's own call types, priorities,
 * unit types, status sets, statuses, roles and POI types (GET /Mapping/GetMapIconLegend). It asks the server again every
 * time it opens, so department changes show on the next open.
 */
export const MapLegendSheet: React.FC<MapLegendSheetProps> = ({ isOpen, onClose, hydrantPin = null }) => {
  const { t } = useTranslation();
  const { colorScheme } = useColorScheme();
  const [status, setStatus] = useState<LegendStatus>('loading');
  const [legend, setLegend] = useState<NormalizedLegend | null>(null);
  const [attempt, setAttempt] = useState(0);
  // The map hides personnel pins from users who may not see PII (MapPins), so the legend leaves them out too.
  const canViewPersonnel = securityStore((state) => state.rights?.CanViewPII) === true;

  const callsTitle = useTerm(TermKeys.Calls, t('maps.legend.calls'));
  const unitsTitle = useTerm(TermKeys.Units, t('maps.legend.units'));
  const personnelTitle = useTerm(TermKeys.Personnel, t('maps.legend.personnel'));

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const controller = new AbortController();
    setStatus('loading');
    setLegend(null);

    getMapIconLegend(controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        setLegend(normalizeMapLegend(result?.Data));
        setStatus('loaded');
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        logger.error({ message: 'Failed to load the map icon legend', context: { error } });
        setStatus('error');
      });

    return () => controller.abort();
  }, [isOpen, attempt]);

  const handleRetry = useCallback(() => setAttempt((value) => value + 1), []);

  const styleLabel = useCallback(
    (key: string, kind: 'status' | 'priority') => {
      const normalized = asText(key).toLowerCase();
      if (!normalized || normalized === 'unknown') {
        return kind === 'status' ? t('maps.legend.style.unknown') : t('maps.legend.no_meaning');
      }
      const labelKey = STYLE_LABEL_KEYS[normalized];
      return labelKey ? t(labelKey) : asText(key);
    },
    [t]
  );

  const namesLine = useCallback((label: string, names: string[]) => (names.length > 0 ? t('maps.legend.names_line', { label, names: names.join(', ') }) : null), [t]);

  // The "none" rows (Id null) carry the default call/unit/person pin, which a style's pin falls back to as on the map.
  const defaults = useMemo(() => {
    const noneImagePath = (rows: MapLegendRowData[] | undefined) => rows?.find((row) => row.Id == null)?.ImagePath ?? null;
    return { call: noneImagePath(legend?.calls), unit: noneImagePath(legend?.units), person: noneImagePath(legend?.personnel) };
  }, [legend]);

  const rowName = useCallback((row: MapLegendRowData, noneLabel: string) => (row.Id == null ? noneLabel : asText(row.Name)), []);

  const iconColor = colorScheme === 'dark' ? '#9ca3af' : '#4b5563';

  const renderContent = () => {
    if (status === 'loading') {
      return (
        <VStack space="sm" className="items-center py-10" testID="map-legend-loading">
          <Spinner size="large" />
          <Text className="text-sm text-gray-600 dark:text-gray-400">{t('maps.legend.loading')}</Text>
        </VStack>
      );
    }

    if (status === 'error' || !legend) {
      return (
        <VStack space="md" className="items-center py-10" testID="map-legend-error">
          <Text className="text-center text-sm text-gray-700 dark:text-gray-300">{t('maps.legend.error')}</Text>
          <Button onPress={handleRetry} testID="map-legend-retry" className="bg-primary-600">
            <ButtonText>{t('common.retry')}</ButtonText>
          </Button>
        </VStack>
      );
    }

    const personnelRows = canViewPersonnel ? legend.personnel : [];

    return (
      <VStack className="pb-6">
        {legend.statusStyles.length > 0 ? (
          <VStack testID="map-legend-status-colors">
            <SectionHeading title={t('maps.legend.status_colors')} testID="map-legend-heading-status" />
            {legend.statusStyles.map((style, index) => {
              const label = styleLabel(style.Key, 'status');
              const key = asText(style.Key).toLowerCase() || `style-${index}`;
              const icons: MarkerIconProps[] = [{ label: `${unitsTitle} · ${label}`, pinIconUrl: style.UnitPinIconUrl, imagePath: defaults.unit, testID: `map-legend-status-${key}-unit-pin` }];
              if (canViewPersonnel) {
                icons.push({ label: `${personnelTitle} · ${label}`, pinIconUrl: style.PersonPinIconUrl, imagePath: defaults.person, testID: `map-legend-status-${key}-person-pin` });
              }
              const lines = [namesLine(unitsTitle, asNames(style.UnitStatuses)), canViewPersonnel ? namesLine(personnelTitle, asNames(style.PersonnelStatuses)) : null].filter((line): line is string => line != null);

              return <StyleRow key={`${key}-${index}`} label={label} color={asColor(style.Color)} icons={icons} lines={lines} testID={`map-legend-status-${key}`} />;
            })}
          </VStack>
        ) : null}

        {legend.priorityStyles.length > 0 ? (
          <VStack testID="map-legend-priority-colors">
            <SectionHeading title={t('maps.legend.priority_colors')} testID="map-legend-heading-priority" />
            {legend.priorityStyles.map((style, index) => {
              const label = styleLabel(style.Key, 'priority');
              const key = asText(style.Key).toLowerCase() || `style-${index}`;
              const icons: MarkerIconProps[] = [{ label: `${callsTitle} · ${label}`, pinIconUrl: style.CallPinIconUrl, imagePath: defaults.call, testID: `map-legend-priority-${key}-call-pin` }];
              const lines = [namesLine(t('maps.legend.priorities'), asNames(style.Priorities))].filter((line): line is string => line != null);

              return <StyleRow key={`${key}-${index}`} label={label} color={asColor(style.Color)} icons={icons} lines={lines} testID={`map-legend-priority-${key}`} />;
            })}
          </VStack>
        ) : null}

        {legend.calls.length > 0 ? (
          <VStack testID="map-legend-calls">
            <SectionHeading title={callsTitle} testID="map-legend-heading-calls" />
            {legend.calls.map((row, index) => (
              <LegendRowCard key={`call-${row.Id ?? 'none'}-${index}`} row={row} rowName={rowName(row, t('maps.legend.no_call_type'))} testID={`map-legend-call-${row.Id ?? 'none'}`} />
            ))}
          </VStack>
        ) : null}

        {legend.units.length > 0 ? (
          <VStack testID="map-legend-units">
            <SectionHeading title={unitsTitle} testID="map-legend-heading-units" />
            {legend.units.map((row, index) => {
              const statusSetName = asText(row.StatusSetName);
              const subtitle = statusSetName ? t('maps.legend.names_line', { label: t('maps.legend.statuses'), names: statusSetName }) : t('maps.legend.built_in_unit_statuses');

              return <LegendRowCard key={`unit-${row.Id ?? 'none'}-${index}`} row={row} rowName={rowName(row, t('maps.legend.no_unit_type'))} subtitle={subtitle} testID={`map-legend-unit-${row.Id ?? 'none'}`} />;
            })}
          </VStack>
        ) : null}

        {personnelRows.length > 0 ? (
          <VStack testID="map-legend-personnel">
            <SectionHeading title={personnelTitle} testID="map-legend-heading-personnel" />
            <Text className="mb-2 text-xs text-gray-600 dark:text-gray-400">{t('maps.legend.personnel_note')}</Text>
            {personnelRows.map((row, index) => (
              <LegendRowCard key={`role-${row.Id ?? 'none'}-${index}`} row={row} rowName={rowName(row, t('maps.legend.no_role_icon'))} testID={`map-legend-role-${row.Id ?? 'none'}`} />
            ))}
          </VStack>
        ) : null}

        <VStack testID="map-legend-other">
          <SectionHeading title={t('maps.legend.other')} testID="map-legend-heading-other" />
          <HStack space="md" className="items-center py-2" testID="map-legend-station">
            <MarkerIcon label={t('maps.legend.station')} imagePath={STATION_IMAGE_PATH} testID="map-legend-station-icon" />
            <Text className="text-sm text-gray-900 dark:text-gray-100">{t('maps.legend.station')}</Text>
          </HStack>
          {hydrantPin ? (
            <HStack space="md" className="items-center py-2" testID="map-legend-hydrant">
              {isPoiMarker(hydrantPin) ? (
                <LegendIcon label={t('maps.legend.hydrant')} testID="map-legend-hydrant-icon">
                  <View pointerEvents="none">
                    <PoiPinMarker color={hydrantPin.Color} poiImage={hydrantPin.PoiImage} imagePath={hydrantPin.ImagePath} marker={hydrantPin.Marker} iconUrl={hydrantPin.IconUrl} title={t('maps.legend.hydrant')} />
                  </View>
                </LegendIcon>
              ) : (
                <MarkerIcon label={t('maps.legend.hydrant')} iconUrl={hydrantPin.IconUrl} pinIconUrl={hydrantPin.PinIconUrl} imagePath={hydrantPin.ImagePath} testID="map-legend-hydrant-icon" />
              )}
              <Text className="text-sm text-gray-900 dark:text-gray-100">{t('maps.legend.hydrant')}</Text>
            </HStack>
          ) : null}
          {legend.poiTypes.map((poiType, index) => {
            const name = asText(poiType.Name);

            return (
              <HStack key={`poi-type-${poiType.PoiTypeId}-${index}`} space="md" className="items-center py-2" testID={`map-legend-poi-type-${poiType.PoiTypeId}`}>
                <LegendIcon label={name} testID={`map-legend-poi-type-${poiType.PoiTypeId}-icon`}>
                  <View pointerEvents="none">
                    <PoiPinMarker color={poiType.Color} poiImage={poiType.PoiImage} imagePath={poiType.ImagePath} marker={poiType.Marker} iconUrl={poiType.IconUrl} title={name} />
                  </View>
                </LegendIcon>
                <Text className="flex-1 text-sm text-gray-900 dark:text-gray-100">{name}</Text>
              </HStack>
            );
          })}
        </VStack>
      </VStack>
    );
  };

  return (
    <Actionsheet isOpen={isOpen} onClose={onClose} snapPoints={[88]} testID="map-legend-sheet">
      <ActionsheetBackdrop />
      <ActionsheetContent className="w-full rounded-t-3xl bg-white px-4 dark:bg-neutral-900">
        <ActionsheetDragIndicatorWrapper>
          <ActionsheetDragIndicator />
        </ActionsheetDragIndicatorWrapper>

        <HStack className="w-full items-center justify-between pb-2 pt-1">
          <Heading size="md" accessibilityRole="header" className="text-gray-900 dark:text-gray-100">
            {t('maps.legend.title')}
          </Heading>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel={t('common.close')} testID="map-legend-close" className="p-2">
            <XIcon size={20} color={iconColor} />
          </Pressable>
        </HStack>

        <ScrollView className="w-full flex-1" showsVerticalScrollIndicator={true} testID="map-legend-scroll">
          {isOpen ? renderContent() : null}
        </ScrollView>
      </ActionsheetContent>
    </Actionsheet>
  );
};

const styles = StyleSheet.create({
  icon: {
    minWidth: ICON_SIZE,
    minHeight: ICON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatch: {
    width: 16,
    height: 16,
    borderRadius: 4,
  },
  swatchEmpty: {
    borderWidth: 1,
    borderColor: '#9ca3af',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 4,
  },
});

export default MapLegendSheet;
