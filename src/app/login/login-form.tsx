import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle, ChevronDownIcon, EyeIcon, EyeOffIcon, GlobeIcon } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import React, { useCallback, useState } from 'react';
import type { SubmitHandler } from 'react-hook-form';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Image, Keyboard, ScrollView } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import * as z from 'zod';

import { View } from '@/components/ui';
import { Button, ButtonSpinner, ButtonText } from '@/components/ui/button';
import { FormControl, FormControlError, FormControlErrorIcon, FormControlErrorText, FormControlLabel, FormControlLabelText } from '@/components/ui/form-control';
import { Input, InputField, InputIcon, InputSlot } from '@/components/ui/input';
import { Pressable } from '@/components/ui/pressable';
import { Select, SelectBackdrop, SelectContent, SelectDragIndicator, SelectDragIndicatorWrapper, SelectIcon, SelectInput, SelectItem, SelectPortal, SelectTrigger } from '@/components/ui/select';
import { Text } from '@/components/ui/text';
import colors from '@/constants/colors';
import { useAnalytics } from '@/hooks/use-analytics';
import { useSelectedLanguage } from '@/lib';
import type { Language } from '@/lib/i18n/resources';

const LANGUAGES: { label: string; value: Language }[] = [
  { label: 'English', value: 'en' },
  { label: 'Español', value: 'es' },
  { label: 'Svenska', value: 'sv' },
  { label: 'Deutsch', value: 'de' },
  { label: 'Français', value: 'fr' },
  { label: 'Italiano', value: 'it' },
  { label: 'Polski', value: 'pl' },
  { label: 'Українська', value: 'uk' },
  { label: 'العربية', value: 'ar' },
];

const loginFormSchema = z.object({
  username: z
    .string({
      required_error: 'Username is required',
    })
    .min(3, 'Username must be at least 3 characters'),
  password: z
    .string({
      required_error: 'Password is required',
    })
    .min(6, 'Password must be at least 6 characters'),
});

export type FormType = z.infer<typeof loginFormSchema>;

export type LoginFormProps = {
  onSubmit?: SubmitHandler<FormType>;
  isLoading?: boolean;
  error?: string;
  onSsoPress?: () => void;
  onServerUrlPress?: () => void;
};

export const LoginForm = ({ onSubmit = () => {}, isLoading = false, error = undefined, onSsoPress, onServerUrlPress }: LoginFormProps) => {
  const { colorScheme } = useColorScheme();
  const { t } = useTranslation();
  const { trackEvent } = useAnalytics();
  const { language, setLanguage } = useSelectedLanguage();
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormType>({
    resolver: zodResolver(loginFormSchema),
  });
  const selectedLanguageLabel = LANGUAGES.find((option) => option.value === (language ?? 'en'))?.label ?? LANGUAGES[0].label;

  const [showPassword, setShowPassword] = useState(false);
  const handleState = () => {
    setShowPassword((showState) => {
      return !showState;
    });
  };
  const handleKeyPress = () => {
    Keyboard.dismiss();
    handleSubmit(onSubmit)();
  };

  const handleServerUrlPress = useCallback(() => {
    try {
      trackEvent('login_server_url_pressed', {
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.warn('Failed to track login server URL press analytics:', error);
    }
    onServerUrlPress?.();
  }, [onServerUrlPress, trackEvent]);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" keyboardVerticalOffset={10}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View className="flex-1 justify-center p-4">
          <View className="items-center justify-center">
            <Image style={{ width: '96%' }} source={colorScheme === 'dark' ? require('@assets/images/Resgrid_JustText_White.png') : require('@assets/images/Resgrid_JustText.png')} resizeMode="contain" />
            <Text className="pb-6 text-center text-4xl font-bold">{t('login.title')}</Text>

            <Text className="mb-6 max-w-xl text-center text-gray-500">{t('login.login_button_description')}</Text>
          </View>
          <FormControl isInvalid={!!errors?.username} className="w-full">
            <FormControlLabel>
              <FormControlLabelText>{t('login.username')}</FormControlLabelText>
            </FormControlLabel>
            <Controller
              defaultValue=""
              name="username"
              control={control}
              render={({ field: { onChange, onBlur, value } }) => (
                <Input>
                  <InputField
                    placeholder={t('login.username_placeholder')}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    onSubmitEditing={handleKeyPress}
                    returnKeyType="done"
                    autoCapitalize="none"
                    autoComplete="off"
                  />
                </Input>
              )}
            />
            <FormControlError>
              <FormControlErrorIcon as={AlertTriangle} className="text-red-500" />
              <FormControlErrorText className="text-red-500">{errors?.username?.message}</FormControlErrorText>
            </FormControlError>
          </FormControl>
          {/* Label Message */}
          <FormControl isInvalid={!!errors.password} className="w-full">
            <FormControlLabel>
              <FormControlLabelText>{t('login.password')}</FormControlLabelText>
            </FormControlLabel>
            <Controller
              defaultValue=""
              name="password"
              control={control}
              render={({ field: { onChange, onBlur, value } }) => (
                <Input>
                  <InputField
                    type={showPassword ? 'text' : 'password'}
                    placeholder={t('login.password_placeholder')}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    onSubmitEditing={handleKeyPress}
                    returnKeyType="done"
                    autoCapitalize="none"
                    autoComplete="off"
                  />
                  <InputSlot onPress={handleState} className="pr-3">
                    <InputIcon as={showPassword ? EyeIcon : EyeOffIcon} />
                  </InputSlot>
                </Input>
              )}
            />
            <FormControlError>
              <FormControlErrorIcon as={AlertTriangle} className="text-red-500" />
              <FormControlErrorText className="text-red-500">{errors?.password?.message}</FormControlErrorText>
            </FormControlError>
          </FormControl>

          {isLoading ? (
            <Button className="mt-8 w-full">
              <ButtonSpinner color={colors.light.neutral[400]} />
              <ButtonText className="ml-2 text-sm font-medium">{t('login.login_button_loading')}</ButtonText>
            </Button>
          ) : (
            <Button className="mt-8 w-full" variant="solid" action="primary" onPress={handleSubmit(onSubmit)}>
              <ButtonText>{t('login.login_button')}</ButtonText>
            </Button>
          )}

          {/* Server URL and SSO Buttons */}
          <View className="mt-14 w-full flex-row gap-2">
            <Pressable accessibilityRole="button" className="h-10 flex-1 items-center justify-center rounded border border-outline-300 bg-transparent px-4" onPress={handleServerUrlPress} testID="server-url-button">
              <Text className="text-xs text-primary-500">{t('login.change_server_url')}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" className="h-10 flex-1 items-center justify-center rounded border border-outline-300 bg-transparent px-4" onPress={onSsoPress} testID="sso-button">
              <Text className="text-xs text-primary-500">{t('login.sso.login_with_sso_button')}</Text>
            </Pressable>
          </View>

          {/* Language Selector */}
          <View className="mt-6 w-full items-center justify-center">
            <Select onValueChange={(val) => setLanguage(val as Language)} selectedValue={language ?? 'en'}>
              <SelectTrigger testID="login-language-trigger" className="min-h-0 border-0 bg-transparent p-2">
                <GlobeIcon size={16} className={`mr-2 ${colorScheme === 'dark' ? 'text-neutral-400' : 'text-neutral-500'}`} />
                <Text className={`mr-1 text-sm ${colorScheme === 'dark' ? 'text-neutral-500' : 'text-neutral-400'}`}>{t('login.select_language')}:</Text>
                <SelectInput value={selectedLanguageLabel} placeholder={t('login.select_language')} className={`flex-0 px-0 text-sm font-medium ${colorScheme === 'dark' ? 'text-neutral-100' : 'text-neutral-700'}`} />
                <SelectIcon as={ChevronDownIcon} className={`ml-1 ${colorScheme === 'dark' ? 'text-neutral-500' : 'text-neutral-400'}`} />
              </SelectTrigger>
              <SelectPortal>
                <SelectBackdrop />
                <SelectContent className="max-h-[60vh] pb-20">
                  <SelectDragIndicatorWrapper>
                    <SelectDragIndicator />
                  </SelectDragIndicatorWrapper>
                  {LANGUAGES.map((lang) => (
                    <SelectItem key={lang.value} label={lang.label} value={lang.value} />
                  ))}
                </SelectContent>
              </SelectPortal>
            </Select>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};
