import { useColorScheme } from 'nativewind';
import React, { useCallback, useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, useWindowDimensions } from 'react-native';

import { useAnalytics } from '@/hooks/use-analytics';

import { Actionsheet, ActionsheetBackdrop, ActionsheetContent, ActionsheetDragIndicator, ActionsheetDragIndicatorWrapper } from '../ui/actionsheet';
import { Button, ButtonSpinner, ButtonText } from '../ui/button';
import { FormControl, FormControlLabel, FormControlLabelText } from '../ui/form-control';
import { HStack } from '../ui/hstack';
import { Input, InputField } from '../ui/input';
import { VStack } from '../ui/vstack';

interface LoginInfoForm {
  username: string;
  password: string;
}

interface LoginInfoBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: LoginInfoForm) => Promise<void>;
}

export function LoginInfoBottomSheet({ isOpen, onClose, onSubmit }: LoginInfoBottomSheetProps) {
  const { t } = useTranslation();
  const { colorScheme } = useColorScheme();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const [isLoading, setIsLoading] = React.useState(false);
  const { trackEvent } = useAnalytics();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInfoForm>();

  // Track analytics when sheet becomes visible
  const trackViewAnalytics = useCallback(() => {
    try {
      trackEvent('login_info_sheet_viewed', {
        timestamp: new Date().toISOString(),
        isLandscape,
        colorScheme: colorScheme || 'light',
      });
    } catch (error) {
      // Analytics errors should not break the component
      console.warn('Failed to track login info sheet view analytics:', error);
    }
  }, [trackEvent, isLandscape, colorScheme]);

  // Track analytics when sheet becomes visible
  useEffect(() => {
    if (isOpen) {
      trackViewAnalytics();
    }
  }, [isOpen, trackViewAnalytics]);

  const onFormSubmit = async (data: LoginInfoForm) => {
    try {
      setIsLoading(true);

      // Track form submission analytics
      try {
        trackEvent('login_info_form_submitted', {
          timestamp: new Date().toISOString(),
          hasUsername: !!data.username,
          hasPassword: !!data.password,
          isLandscape,
        });
      } catch (error) {
        console.warn('Failed to track login info form submission analytics:', error);
      }

      await onSubmit(data);

      // Track successful submission
      try {
        trackEvent('login_info_form_success', {
          timestamp: new Date().toISOString(),
          isLandscape,
        });
      } catch (error) {
        console.warn('Failed to track login info form success analytics:', error);
      }

      onClose();
    } catch (error) {
      // Track failed submission
      try {
        trackEvent('login_info_form_failed', {
          timestamp: new Date().toISOString(),
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          isLandscape,
        });
      } catch (analyticsError) {
        console.warn('Failed to track login info form failure analytics:', analyticsError);
      }

      // Re-throw the error so parent component can handle it
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Handle close with analytics
  const handleClose = useCallback(() => {
    try {
      trackEvent('login_info_sheet_closed', {
        timestamp: new Date().toISOString(),
        wasFormModified: false, // Could track form dirty state if needed
        isLandscape,
      });
    } catch (error) {
      console.warn('Failed to track login info sheet close analytics:', error);
    }
    onClose();
  }, [trackEvent, onClose, isLandscape]);

  return (
    <Actionsheet isOpen={isOpen} onClose={handleClose}>
      <ActionsheetBackdrop />
      <ActionsheetContent className={`rounded-t-3xl px-4 pb-6 ${colorScheme === 'dark' ? 'bg-neutral-900' : 'bg-white'}`}>
        <ActionsheetDragIndicatorWrapper>
          <ActionsheetDragIndicator />
        </ActionsheetDragIndicatorWrapper>

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="w-full">
          <VStack space="lg" className="mt-4 w-full">
            <FormControl isRequired isInvalid={!!errors.username}>
              <FormControlLabel>
                <FormControlLabelText className={`text-sm font-medium ${colorScheme === 'dark' ? 'text-neutral-200' : 'text-neutral-700'}`}>{t('settings.username')}</FormControlLabelText>
              </FormControlLabel>
              <Controller
                control={control}
                name="username"
                rules={{ required: t('form.required') }}
                render={({ field: { onChange, value } }) => (
                  <Input className={`rounded-lg border ${colorScheme === 'dark' ? 'border-neutral-700 bg-neutral-800' : 'border-neutral-200 bg-neutral-50'}`}>
                    <InputField value={value} onChangeText={onChange} placeholder={t('settings.enter_username')} autoCapitalize="none" autoCorrect={false} textContentType="username" autoComplete="username" />
                  </Input>
                )}
              />
            </FormControl>

            <FormControl isRequired isInvalid={!!errors.password}>
              <FormControlLabel>
                <FormControlLabelText className={`text-sm font-medium ${colorScheme === 'dark' ? 'text-neutral-200' : 'text-neutral-700'}`}>{t('settings.password')}</FormControlLabelText>
              </FormControlLabel>
              <Controller
                control={control}
                name="password"
                rules={{ required: t('form.required') }}
                render={({ field: { onChange, value } }) => (
                  <Input className={`rounded-lg border ${colorScheme === 'dark' ? 'border-neutral-700 bg-neutral-800' : 'border-neutral-200 bg-neutral-50'}`}>
                    <InputField
                      value={value}
                      onChangeText={onChange}
                      placeholder={t('settings.enter_password')}
                      type="password"
                      autoCapitalize="none"
                      autoCorrect={false}
                      textContentType="password"
                      autoComplete="password"
                    />
                  </Input>
                )}
              />
            </FormControl>

            <HStack space="md" className="mt-4">
              <Button variant="outline" className="flex-1" onPress={handleClose} size={isLandscape ? 'md' : 'sm'}>
                <ButtonText className={isLandscape ? '' : 'text-xs'}>{t('common.cancel')}</ButtonText>
              </Button>
              <Button className="flex-1 bg-primary-600" onPress={handleSubmit(onFormSubmit)} disabled={isLoading} size={isLandscape ? 'md' : 'sm'}>
                {isLoading ? <ButtonSpinner /> : <ButtonText className={isLandscape ? '' : 'text-xs'}>{t('common.save')}</ButtonText>}
              </Button>
            </HStack>
          </VStack>
        </KeyboardAvoidingView>
      </ActionsheetContent>
    </Actionsheet>
  );
}
