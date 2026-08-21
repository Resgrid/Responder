import { Satellite } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { useRealtimeGeolocation } from '@/lib/hooks/use-realtime-geolocation';
import { logger } from '@/lib/logging';

import { Alert, AlertIcon, AlertText } from '../ui/alert';
import { Switch } from '../ui/switch';
import { Text } from '../ui/text';
import { View } from '../ui/view';
import { VStack } from '../ui/vstack';

export const RealtimeGeolocationItem = () => {
  const { isRealtimeGeolocationEnabled, setRealtimeGeolocationEnabled, isGeolocationHubConnected } = useRealtimeGeolocation();
  const { t } = useTranslation();
  const { colorScheme } = useColorScheme();

  const handleToggle = React.useCallback(
    async (value: boolean) => {
      try {
        await setRealtimeGeolocationEnabled(value);
      } catch (error) {
        logger.error({ message: 'Failed to toggle realtime geolocation', context: { error } });
      }
    },
    [setRealtimeGeolocationEnabled]
  );

  return (
    <VStack space="sm">
      <View className="w-full flex-row items-center justify-between px-4 py-2">
        <View className="flex-row items-center">
          <Text>{t('settings.realtime_geolocation')}</Text>
        </View>
        <View className="flex-row items-center">
          <Switch size="md" value={isRealtimeGeolocationEnabled} onValueChange={handleToggle} />
        </View>
      </View>

      {isRealtimeGeolocationEnabled ? (
        <View className="px-4">
          <Alert className={`rounded-lg border ${colorScheme === 'dark' ? 'border-blue-800 bg-blue-900/20' : 'border-blue-200 bg-blue-50'}`}>
            <AlertIcon as={Satellite} className={`${colorScheme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />
            <AlertText className={`text-sm ${colorScheme === 'dark' ? 'text-blue-200' : 'text-blue-700'}`}>
              {t('settings.realtime_geolocation_warning')} {isGeolocationHubConnected ? t('settings.geolocation_hub_connected') : t('settings.geolocation_hub_connecting')}
            </AlertText>
          </Alert>
        </View>
      ) : null}
    </VStack>
  );
};
