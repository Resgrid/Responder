import { ChevronDownIcon } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import React, { useCallback, useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Platform, ScrollView, useWindowDimensions } from 'react-native';

import { getSystemConfig } from '@/api/config';
import { useAnalytics } from '@/hooks/use-analytics';
import { Env } from '@/lib/env';
import { logger } from '@/lib/logging';
import type { ResgridSystemLocation } from '@/models/v4/configs/getSystemConfigResultData';
import { useServerUrlStore } from '@/stores/app/server-url-store';
import useAuthStore from '@/stores/auth/store';

import { Actionsheet, ActionsheetBackdrop, ActionsheetContent, ActionsheetDragIndicator, ActionsheetDragIndicatorWrapper } from '../ui/actionsheet';
import { Button, ButtonSpinner, ButtonText } from '../ui/button';
import { Center } from '../ui/center';
import { FormControl, FormControlError, FormControlErrorText, FormControlHelperText, FormControlLabel, FormControlLabelText } from '../ui/form-control';
import { HStack } from '../ui/hstack';
import { Input, InputField } from '../ui/input';
import { Select, SelectBackdrop, SelectContent, SelectDragIndicator, SelectDragIndicatorWrapper, SelectIcon, SelectInput, SelectItem, SelectPortal, SelectTrigger } from '../ui/select';
import { Text } from '../ui/text';
import { VStack } from '../ui/vstack';

interface ServerUrlForm {
  url: string;
}

interface ServerUrlBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onUrlChanged?: () => Promise<void>;
}

const URL_PATTERN = /^https?:\/\/.+/;
const CUSTOM_SERVER_VALUE = '__custom__';
const API_PATH_SUFFIX = `/api/${Env.API_VERSION}`;

const normalizeInputUrl = (url: string) => url.trim().replace(/\/+$/, '');

const normalizeBaseUrl = (url: string) => {
  const trimmedUrl = normalizeInputUrl(url);

  if (trimmedUrl.endsWith(API_PATH_SUFFIX)) {
    return trimmedUrl.slice(0, -API_PATH_SUFFIX.length).replace(/\/+$/, '');
  }

  return trimmedUrl;
};

const normalizeCustomDisplayUrl = (url: string) => normalizeBaseUrl(url).replace(/^(https?:\/\/[^/]+).*$/, '$1');

const buildApiUrl = (url: string) => `${normalizeBaseUrl(url)}${API_PATH_SUFFIX}`;

export function ServerUrlBottomSheet({ isOpen, onClose, onUrlChanged }: ServerUrlBottomSheetProps) {
  const { t } = useTranslation();
  const { colorScheme } = useColorScheme();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const [isLoading, setIsLoading] = React.useState(false);
  const [isLoadingServerOptions, setIsLoadingServerOptions] = React.useState(true);
  const [locations, setLocations] = React.useState<ResgridSystemLocation[]>([]);
  const [selectedServer, setSelectedServer] = React.useState<string>(CUSTOM_SERVER_VALUE);
  const { setUrl, getUrl } = useServerUrlStore();
  const { trackEvent } = useAnalytics();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ServerUrlForm>();

  React.useEffect(() => {
    if (!isOpen) {
      setIsLoadingServerOptions(true);
      return undefined;
    }

    let isMounted = true;

    const loadServerOptions = async () => {
      try {
        const [currentUrl, systemConfig] = await Promise.all([getUrl(), getSystemConfig()]);
        const normalizedCurrentUrl = normalizeBaseUrl(currentUrl);
        const nextLocations = systemConfig.Data?.Locations ?? [];
        const matchingLocation = nextLocations.find((location) => normalizeBaseUrl(location.ApiUrl) === normalizedCurrentUrl);

        if (isMounted) {
          setLocations(nextLocations);
          setValue('url', matchingLocation ? normalizeInputUrl(matchingLocation.ApiUrl) : normalizeCustomDisplayUrl(currentUrl));
          setSelectedServer(matchingLocation?.Name ?? CUSTOM_SERVER_VALUE);
        }
      } catch (error) {
        const currentUrl = await getUrl();

        if (isMounted) {
          setLocations([]);
          setValue('url', normalizeCustomDisplayUrl(currentUrl));
          setSelectedServer(CUSTOM_SERVER_VALUE);
        }

        logger.error({
          message: 'Failed to load system config for server URLs',
          context: { error },
        });
      } finally {
        if (isMounted) {
          setIsLoadingServerOptions(false);
        }
      }
    };

    loadServerOptions();

    return () => {
      isMounted = false;
    };
  }, [isOpen, setValue, getUrl]);

  // Track analytics when sheet becomes visible
  const trackViewAnalytics = useCallback(() => {
    try {
      trackEvent('server_url_sheet_viewed', {
        timestamp: new Date().toISOString(),
        isLandscape,
        colorScheme: colorScheme || 'light',
      });
    } catch (error) {
      // Analytics errors should not break the component
      console.warn('Failed to track server URL sheet view analytics:', error);
    }
  }, [trackEvent, isLandscape, colorScheme]);

  // Track analytics when sheet becomes visible
  useEffect(() => {
    if (isOpen) {
      trackViewAnalytics();
    }
  }, [isOpen, trackViewAnalytics]);

  const onFormSubmit = async (data: ServerUrlForm) => {
    try {
      setIsLoading(true);
      const selectedLocation = locations.find((location) => location.Name === selectedServer);
      const resolvedBaseUrl = selectedServer === CUSTOM_SERVER_VALUE ? data.url : (selectedLocation?.ApiUrl ?? data.url);
      const normalizedResolvedBaseUrl = normalizeBaseUrl(resolvedBaseUrl);

      // Track form submission analytics
      try {
        trackEvent('server_url_form_submitted', {
          timestamp: new Date().toISOString(),
          hasUrl: !!normalizedResolvedBaseUrl,
          urlLength: normalizedResolvedBaseUrl.length,
          isLandscape,
        });
      } catch (error) {
        console.warn('Failed to track server URL form submission analytics:', error);
      }

      await setUrl(buildApiUrl(normalizedResolvedBaseUrl));

      if (isAuthenticated && onUrlChanged) {
        await onUrlChanged();
      }

      // Track successful submission
      try {
        trackEvent('server_url_form_success', {
          timestamp: new Date().toISOString(),
          isLandscape,
        });
      } catch (error) {
        console.warn('Failed to track server URL form success analytics:', error);
      }

      logger.info({
        message: 'Server URL updated successfully',
        context: { url: normalizedResolvedBaseUrl },
      });
      onClose();
    } catch (error) {
      // Track failed submission
      try {
        trackEvent('server_url_form_failed', {
          timestamp: new Date().toISOString(),
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          isLandscape,
        });
      } catch (analyticsError) {
        console.warn('Failed to track server URL form failure analytics:', analyticsError);
      }

      logger.error({
        message: 'Failed to update server URL',
        context: { error },
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle close with analytics
  const handleClose = useCallback(() => {
    try {
      trackEvent('server_url_sheet_closed', {
        timestamp: new Date().toISOString(),
        wasFormModified: false, // Could track form dirty state if needed
        isLandscape,
      });
    } catch (error) {
      console.warn('Failed to track server URL sheet close analytics:', error);
    }
    onClose();
  }, [trackEvent, onClose, isLandscape]);

  const handleServerChange = useCallback(
    (nextServer: string) => {
      setSelectedServer(nextServer);

      if (nextServer === CUSTOM_SERVER_VALUE) {
        return;
      }

      const selectedLocation = locations.find((location) => location.Name === nextServer);

      if (selectedLocation) {
        setValue('url', normalizeInputUrl(selectedLocation.ApiUrl));
      }
    },
    [locations, setValue]
  );

  const isCustomSelected = selectedServer === CUSTOM_SERVER_VALUE;

  return (
    <Actionsheet isOpen={isOpen} onClose={handleClose} snapPoints={[80]}>
      <ActionsheetBackdrop />
      <ActionsheetContent className={`rounded-t-3xl px-4 pb-6 ${colorScheme === 'dark' ? 'bg-neutral-900' : 'bg-white'}`}>
        <ActionsheetDragIndicatorWrapper>
          <ActionsheetDragIndicator />
        </ActionsheetDragIndicatorWrapper>

        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, paddingBottom: 20 }} showsVerticalScrollIndicator={false} automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}>
          <VStack space="lg" className="mt-4 w-full">
            <FormControl>
              <FormControlLabel>
                <FormControlLabelText className={`text-sm font-medium ${colorScheme === 'dark' ? 'text-neutral-200' : 'text-neutral-700'}`}>{t('settings.server')}</FormControlLabelText>
              </FormControlLabel>
              {isLoadingServerOptions ? (
                <Center testID="server-options-loading" className={`min-h-16 rounded-lg border p-4 ${colorScheme === 'dark' ? 'border-neutral-700 bg-neutral-800' : 'border-neutral-200 bg-neutral-50'}`}>
                  <ButtonSpinner />
                  <Text className={`mt-2 ${colorScheme === 'dark' ? 'text-neutral-300' : 'text-neutral-600'}`}>{t('loading.loadingData')}</Text>
                </Center>
              ) : (
                <Select onValueChange={handleServerChange} selectedValue={selectedServer}>
                  <SelectTrigger className={`rounded-lg border ${colorScheme === 'dark' ? 'border-neutral-700 bg-neutral-800' : 'border-neutral-200 bg-neutral-50'}`}>
                    <SelectInput placeholder={t('settings.server')} value={selectedServer === CUSTOM_SERVER_VALUE ? t('settings.custom') : locations.find((location) => location.Name === selectedServer)?.Name} />
                    <SelectIcon as={ChevronDownIcon} className="mr-3" />
                  </SelectTrigger>
                  <SelectPortal>
                    <SelectBackdrop />
                    <SelectContent className="max-h-[60vh] pb-20">
                      <SelectDragIndicatorWrapper>
                        <SelectDragIndicator />
                      </SelectDragIndicatorWrapper>
                      {locations.map((location) => (
                        <SelectItem key={location.Name} label={location.Name} value={location.Name} />
                      ))}
                      <SelectItem label={t('settings.custom')} value={CUSTOM_SERVER_VALUE} />
                    </SelectContent>
                  </SelectPortal>
                </Select>
              )}
            </FormControl>
            <FormControl isRequired={isCustomSelected} isInvalid={isCustomSelected ? !!errors.url : false}>
              <FormControlLabel>
                <FormControlLabelText className={`text-sm font-medium ${colorScheme === 'dark' ? 'text-neutral-200' : 'text-neutral-700'}`}>{t('settings.server_url')}</FormControlLabelText>
              </FormControlLabel>
              <Controller
                control={control}
                name="url"
                rules={{
                  validate: (value) => {
                    if (!isCustomSelected) {
                      return true;
                    }

                    if (!value) {
                      return t('form.required');
                    }

                    return URL_PATTERN.test(value) ? true : t('form.invalid_url');
                  },
                }}
                render={({ field: { onChange, value } }) => (
                  <Input className={`rounded-lg border ${colorScheme === 'dark' ? 'border-neutral-700 bg-neutral-800' : 'border-neutral-200 bg-neutral-50'}`}>
                    <InputField
                      value={value}
                      onChangeText={onChange}
                      placeholder={t('settings.enter_server_url')}
                      editable={isCustomSelected && !isLoadingServerOptions}
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType="url"
                      textContentType="URL"
                      returnKeyType="done"
                      autoFocus={false}
                      blurOnSubmit={true}
                    />
                  </Input>
                )}
              />
              <FormControlHelperText>
                <FormControlError>
                  <FormControlErrorText>{errors.url?.message}</FormControlErrorText>
                </FormControlError>
              </FormControlHelperText>
            </FormControl>
            <Center>
              <Text size="md" className="text-center text-red-500">
                {t('settings.server_url_note')}
              </Text>
            </Center>

            <HStack space="md" className="mt-4">
              <Button variant="outline" className="flex-1" onPress={handleClose} size={isLandscape ? 'md' : 'sm'}>
                <ButtonText className={isLandscape ? '' : 'text-xs'}>{t('common.cancel')}</ButtonText>
              </Button>
              <Button className="flex-1 bg-primary-600" onPress={handleSubmit(onFormSubmit)} disabled={isLoading || isLoadingServerOptions} size={isLandscape ? 'md' : 'sm'}>
                {isLoading ? <ButtonSpinner /> : <ButtonText className={isLandscape ? '' : 'text-xs'}>{t('common.save')}</ButtonText>}
              </Button>
            </HStack>
          </VStack>
        </ScrollView>
      </ActionsheetContent>
    </Actionsheet>
  );
}
