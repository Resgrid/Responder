import { ChevronDownIcon } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { useNavigationApp } from '@/lib/hooks/use-navigation-app';
import { getNavigationAppOptions, type NavigationApp } from '@/lib/storage/navigation-app';

import { Select, SelectBackdrop, SelectContent, SelectDragIndicator, SelectDragIndicatorWrapper, SelectIcon, SelectInput, SelectItem, SelectPortal, SelectTrigger } from '../ui/select';
import { Text } from '../ui/text';
import { View } from '../ui/view';
import { VStack } from '../ui/vstack';

const OPTION_LABEL_KEYS: Record<NavigationApp, string> = {
  default: 'settings.navigation_app.default',
  google_maps: 'settings.navigation_app.google_maps',
  apple_maps: 'settings.navigation_app.apple_maps',
  waze: 'settings.navigation_app.waze',
  gaia_gps: 'settings.navigation_app.gaia_gps',
  here_wego: 'settings.navigation_app.here_wego',
  mapquest: 'settings.navigation_app.mapquest',
  onx_offroad: 'settings.navigation_app.onx_offroad',
  organic_maps: 'settings.navigation_app.organic_maps',
  osmand: 'settings.navigation_app.osmand',
};

/** Settings row for the per-device navigation app used by every "Route" / "Directions" action. */
export const NavigationAppItem = () => {
  const { navigationApp, setNavigationApp } = useNavigationApp();
  const { t } = useTranslation();
  const { colorScheme } = useColorScheme();

  const options = React.useMemo(() => getNavigationAppOptions().map((app) => ({ label: t(OPTION_LABEL_KEYS[app]), value: app })), [t]);

  const selectedOption = React.useMemo(() => options.find((option) => option.value === navigationApp), [options, navigationApp]);

  const onSelect = React.useCallback(
    (value: string) => {
      const option = options.find((candidate) => candidate.value === value);
      if (option) {
        setNavigationApp(option.value);
      }
    },
    [options, setNavigationApp]
  );

  return (
    <VStack space="sm">
      <View className="flex-1 flex-row items-center justify-between px-4 py-2">
        <View className="flex-1 flex-row items-center pr-3">
          <Text>{t('settings.navigation_app.title')}</Text>
        </View>
        <View className="flex-row items-center">
          <Select onValueChange={onSelect} selectedValue={selectedOption?.value ?? null} initialLabel={selectedOption?.label} testID="navigation-app-select">
            <SelectTrigger>
              <SelectInput placeholder={t('settings.navigation_app.title')} />
              <SelectIcon as={ChevronDownIcon} className="mr-3" />
            </SelectTrigger>
            <SelectPortal>
              <SelectBackdrop />
              <SelectContent className="max-h-[60vh] pb-20">
                <SelectDragIndicatorWrapper>
                  <SelectDragIndicator />
                </SelectDragIndicatorWrapper>
                {options.map((option) => (
                  <SelectItem key={option.value} label={option.label} value={option.value} />
                ))}
              </SelectContent>
            </SelectPortal>
          </Select>
        </View>
      </View>
      <View className="px-4">
        <Text className={`text-xs ${colorScheme === 'dark' ? 'text-neutral-400' : 'text-neutral-500'}`}>{t('settings.navigation_app.description')}</Text>
      </View>
    </VStack>
  );
};
