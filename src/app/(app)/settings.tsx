/* eslint-disable react/react-in-jsx-scope */
import { Env } from '@env';
import { useFocusEffect } from '@react-navigation/native';
import { useColorScheme } from 'nativewind';
import React, { useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { BackgroundGeolocationItem } from '@/components/settings/background-geolocation-item';
import { BluetoothDeviceItem } from '@/components/settings/bluetooth-device-item';
import { Item } from '@/components/settings/item';
import { KeepAliveItem } from '@/components/settings/keep-alive-item';
import { LanguageItem } from '@/components/settings/language-item';
import { LoginInfoBottomSheet } from '@/components/settings/login-info-bottom-sheet';
import { RealtimeGeolocationItem } from '@/components/settings/realtime-geolocation-item';
import { ServerUrlBottomSheet } from '@/components/settings/server-url-bottom-sheet';
import { ThemeItem } from '@/components/settings/theme-item';
import { ToggleItem } from '@/components/settings/toggle-item';
import { FocusAwareStatusBar, ScrollView } from '@/components/ui';
import { Box } from '@/components/ui/box';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { VStack } from '@/components/ui/vstack';
import { useAnalytics } from '@/hooks/use-analytics';
import { useAuth, useAuthStore } from '@/lib';
import { logger } from '@/lib/logging';
import { getBaseApiUrl } from '@/lib/storage/app';
import { openLinkInBrowser } from '@/lib/utils';
import { useUnitsStore } from '@/stores/units/store';

export default function Settings() {
  const { t } = useTranslation();
  const signOut = useAuthStore.getState().logout;
  const { colorScheme } = useColorScheme();
  const { trackEvent } = useAnalytics();
  const [showLoginInfo, setShowLoginInfo] = React.useState(false);
  const { login, status, isAuthenticated } = useAuth();
  const [showServerUrl, setShowServerUrl] = React.useState(false);
  const [showUnitSelection, setShowUnitSelection] = React.useState(false);
  const { units } = useUnitsStore();

  // Track analytics when view becomes visible
  useFocusEffect(
    useCallback(() => {
      trackEvent('settings_viewed', {
        timestamp: new Date().toISOString(),
        colorScheme: colorScheme || 'light',
        isAuthenticated,
        serverUrl: getBaseApiUrl(),
        unitsCount: units.length,
      });
    }, [trackEvent, colorScheme, isAuthenticated, units.length])
  );

  const handleLoginInfoSubmit = async (data: { username: string; password: string }) => {
    logger.info({
      message: 'Updating login info',
    });

    trackEvent('settings_login_info_updated', {
      timestamp: new Date().toISOString(),
      username: data.username,
    });

    await login({ username: data.username, password: data.password });
  };

  const handleServerUrlPress = useCallback(() => {
    trackEvent('settings_server_url_pressed', {
      timestamp: new Date().toISOString(),
      currentServerUrl: getBaseApiUrl(),
    });
    setShowServerUrl(true);
  }, [trackEvent]);

  const handleLoginInfoPress = useCallback(() => {
    trackEvent('settings_login_info_pressed', {
      timestamp: new Date().toISOString(),
    });
    setShowLoginInfo(true);
  }, [trackEvent]);

  const handleLogoutPress = useCallback(() => {
    trackEvent('settings_logout_pressed', {
      timestamp: new Date().toISOString(),
    });
    signOut();
  }, [trackEvent, signOut]);

  const handleSupportLinkPress = useCallback(
    (linkType: string, url: string) => {
      trackEvent('settings_support_link_pressed', {
        timestamp: new Date().toISOString(),
        linkType,
        url,
      });
      openLinkInBrowser(url);
    },
    [trackEvent]
  );

  useEffect(() => {
    if (status === 'signedIn' && isAuthenticated) {
      logger.info({
        message: 'Setting Login info successful',
      });
    }
  }, [status, isAuthenticated]);

  return (
    <Box className={`flex-1 ${colorScheme === 'dark' ? 'bg-neutral-950' : 'bg-neutral-50'}`}>
      <FocusAwareStatusBar />
      <ScrollView>
        <VStack className="md p-4">
          {/* App Info Section */}
          <Card className={`mb-4 rounded-lg border p-4 ${colorScheme === 'dark' ? 'border-neutral-800 bg-neutral-900' : 'border-neutral-200 bg-white'}`}>
            <Heading className="mb2 text-sm">{t('settings.app_info')}</Heading>
            <VStack space="sm">
              <Item text={t('settings.app_name')} value={Env.NAME} />
              <Item text={t('settings.version')} value={Env.VERSION} />
              <Item text={t('settings.environment')} value={Env.APP_ENV} />
            </VStack>
          </Card>

          {/* Account Section */}
          <Card className={`mb-8 rounded-lg border p-4 ${colorScheme === 'dark' ? 'border-neutral-800 bg-neutral-900' : 'border-neutral-200 bg-white'}`}>
            <Heading className="mb2 text-sm">{t('settings.account')}</Heading>
            <VStack space="sm">
              <Item text={t('settings.server')} value={getBaseApiUrl()} onPress={handleServerUrlPress} textStyle="text-info-600" />
              <Item text={t('settings.login_info')} onPress={handleLoginInfoPress} textStyle="text-info-600" />
              <Item text={t('settings.logout')} onPress={handleLogoutPress} textStyle="text-error-600" />
            </VStack>
          </Card>

          {/* Preferences Section */}
          <Card className={`mb-4 rounded-lg border p-4 ${colorScheme === 'dark' ? 'border-neutral-800 bg-neutral-900' : 'border-neutral-200 bg-white'}`}>
            <Heading className="mb2 text-sm">{t('settings.preferences')}</Heading>
            <VStack space="sm">
              <ThemeItem />
              <LanguageItem />
              <KeepAliveItem />
              <RealtimeGeolocationItem />
              <BackgroundGeolocationItem />
              <BluetoothDeviceItem />
            </VStack>
          </Card>

          {/* Support Section */}
          <Card className={`mb-4 rounded-lg border p-4 ${colorScheme === 'dark' ? 'border-neutral-800 bg-neutral-900' : 'border-neutral-200 bg-white'}`}>
            <Heading className="mb2 text-sm">{t('settings.support')}</Heading>
            <VStack space="sm">
              <Item text={t('settings.help_center')} onPress={() => handleSupportLinkPress('help_center', 'https://resgrid.zohodesk.com/portal/en/home')} />
              <Item text={t('settings.contact_us')} onPress={() => handleSupportLinkPress('contact_us', 'https://resgrid.com/contact')} />
              <Item text={t('settings.status_page')} onPress={() => handleSupportLinkPress('status_page', 'https://resgrid.freshstatus.io')} />
              <Item text={t('settings.privacy_policy')} onPress={() => handleSupportLinkPress('privacy_policy', 'https://resgrid.com/privacy')} />
              <Item text={t('settings.terms')} onPress={() => handleSupportLinkPress('terms', 'https://resgrid.com/terms')} />
            </VStack>
          </Card>
        </VStack>
      </ScrollView>

      <LoginInfoBottomSheet isOpen={showLoginInfo} onClose={() => setShowLoginInfo(false)} onSubmit={handleLoginInfoSubmit} />
      <ServerUrlBottomSheet isOpen={showServerUrl} onClose={() => setShowServerUrl(false)} />
    </Box>
  );
}
