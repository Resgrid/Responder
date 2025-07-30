import { MapPin } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { useBackgroundGeolocation } from '@/lib/hooks/use-background-geolocation';
import { locationService } from '@/services/location';
import { useLocationStore } from '@/stores/app/location-store';

import { Alert, AlertIcon, AlertText } from '../ui/alert';
import { Switch } from '../ui/switch';
import { Text } from '../ui/text';
import { View } from '../ui/view';
import { VStack } from '../ui/vstack';

export const BackgroundGeolocationItem = () => {
  const { isBackgroundGeolocationEnabled, setBackgroundGeolocationEnabled } = useBackgroundGeolocation();
  const { t } = useTranslation();
  const { colorScheme } = useColorScheme();
  const setLocationBackgroundEnabled = useLocationStore((state) => state.setBackgroundEnabled);

  const handleToggle = React.useCallback(
    async (value: boolean) => {
      try {
        await setBackgroundGeolocationEnabled(value);

        // Update the location store state
        setLocationBackgroundEnabled(value);

        // Start or stop background location updates based on the value
        if (value) {
          await locationService.startBackgroundUpdates();
        } else {
          await locationService.stopBackgroundUpdates();
        }
      } catch (error) {
        console.error('Failed to toggle background geolocation:', error);
      }
    },
    [setBackgroundGeolocationEnabled, setLocationBackgroundEnabled]
  );

  return (
    <VStack space="sm">
      <View className="flex-1 flex-row items-center justify-between px-4 py-2">
        <View className="flex-row items-center">
          <Text>{t('settings.background_geolocation')}</Text>
        </View>
        <View className="flex-row items-center">
          <Switch size="md" value={isBackgroundGeolocationEnabled} onValueChange={handleToggle} />
        </View>
      </View>

      {isBackgroundGeolocationEnabled && (
        <View className="px-4">
          <Alert className={`rounded-lg border ${colorScheme === 'dark' ? 'border-orange-800 bg-orange-900/20' : 'border-orange-200 bg-orange-50'}`}>
            <AlertIcon as={MapPin} className={`${colorScheme === 'dark' ? 'text-orange-400' : 'text-orange-600'}`} />
            <AlertText className={`text-sm ${colorScheme === 'dark' ? 'text-orange-200' : 'text-orange-700'}`}>{t('settings.background_geolocation_warning')}</AlertText>
          </Alert>
        </View>
      )}
    </VStack>
  );
};
