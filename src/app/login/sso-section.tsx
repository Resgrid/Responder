import { AlertTriangle, ChevronLeft, LogIn } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import React, { useCallback, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Image } from 'react-native';
import { ScrollView } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';

import { View } from '@/components/ui';
import { Button, ButtonSpinner, ButtonText } from '@/components/ui/button';
import { FormControl, FormControlError, FormControlErrorIcon, FormControlErrorText, FormControlLabel, FormControlLabelText } from '@/components/ui/form-control';
import { Input, InputField } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import colors from '@/constants/colors';
import type { DepartmentSsoConfig } from '@/services/sso-discovery';

export interface SsoDepartmentFormProps {
  onSsoConfigResolved: (username: string, config: DepartmentSsoConfig) => void;
  onLookupUser: (username: string, departmentId?: number) => Promise<DepartmentSsoConfig | null>;
  isLoading?: boolean;
}

interface DepartmentFormFields {
  username: string;
  departmentId: string;
}

/**
 * Phase 1 of the SSO flow — collects the username and optional department ID,
 * then resolves the SSO config via the username-first discovery endpoint.
 */
export const SsoDepartmentForm: React.FC<SsoDepartmentFormProps> = ({ onSsoConfigResolved, onLookupUser, isLoading = false }) => {
  const { colorScheme } = useColorScheme();
  const { t } = useTranslation();
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [localLoading, setLocalLoading] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<DepartmentFormFields>({ defaultValues: { username: '', departmentId: '' } });

  const onSubmit = useCallback(
    async (data: DepartmentFormFields) => {
      setLookupError(null);
      setLocalLoading(true);
      try {
        const trimmedUsername = data.username.trim();
        const deptIdRaw = data.departmentId.trim();
        const departmentId = deptIdRaw !== '' ? parseInt(deptIdRaw, 10) : undefined;
        const config = await onLookupUser(trimmedUsername, departmentId);
        if (!config) {
          setLookupError(t('login.sso.user_not_found'));
        } else if (!config.ssoEnabled) {
          setLookupError(t('login.sso.sso_not_enabled'));
        } else {
          onSsoConfigResolved(trimmedUsername, config);
        }
      } catch {
        setLookupError(t('login.sso.lookup_network_error'));
      } finally {
        setLocalLoading(false);
      }
    },
    [onLookupUser, onSsoConfigResolved, t]
  );

  const busy = isLoading || localLoading;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" keyboardVerticalOffset={10}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View className="flex-1 justify-center p-4">
          <View className="items-center justify-center">
            <Image style={{ width: '96%' }} source={colorScheme === 'dark' ? require('@assets/images/Resgrid_JustText_White.png') : require('@assets/images/Resgrid_JustText.png')} resizeMode="contain" />
            <Text className="pb-6 text-center text-4xl font-bold">{t('login.title')}</Text>
            <Text className="mb-6 max-w-xl text-center text-gray-500">{t('login.sso.user_description')}</Text>
          </View>

          {/* Username field */}
          <FormControl isInvalid={!!errors.username || !!lookupError} className="w-full">
            <FormControlLabel>
              <FormControlLabelText>{t('login.sso.username_label')}</FormControlLabelText>
            </FormControlLabel>
            <Controller
              defaultValue=""
              name="username"
              control={control}
              rules={{ required: t('login.sso.username_required') }}
              render={({ field: { onChange, onBlur, value } }) => (
                <Input>
                  <InputField
                    placeholder={t('login.sso.username_placeholder')}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    returnKeyType="next"
                    autoCapitalize="none"
                    autoComplete="username"
                    keyboardType="email-address"
                  />
                </Input>
              )}
            />
            {errors.username ? (
              <FormControlError>
                <FormControlErrorIcon as={AlertTriangle} className="text-red-500" />
                <FormControlErrorText className="text-red-500">{errors.username.message}</FormControlErrorText>
              </FormControlError>
            ) : null}
          </FormControl>

          {/* Optional department ID field */}
          <FormControl isInvalid={!!errors.departmentId} className="mt-4 w-full">
            <FormControlLabel>
              <FormControlLabelText>{t('login.sso.department_id_label')}</FormControlLabelText>
            </FormControlLabel>
            <Controller
              defaultValue=""
              name="departmentId"
              control={control}
              rules={{
                validate: (v) => {
                  if (v.trim() === '') return true;
                  return /^\d+$/.test(v.trim()) || t('login.sso.department_id_invalid');
                },
              }}
              render={({ field: { onChange, onBlur, value } }) => (
                <Input>
                  <InputField
                    placeholder={t('login.sso.department_id_placeholder')}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    returnKeyType="done"
                    keyboardType="number-pad"
                    autoComplete="off"
                    onSubmitEditing={handleSubmit(onSubmit)}
                  />
                </Input>
              )}
            />
            {errors.departmentId ? (
              <FormControlError>
                <FormControlErrorIcon as={AlertTriangle} className="text-red-500" />
                <FormControlErrorText className="text-red-500">{errors.departmentId.message}</FormControlErrorText>
              </FormControlError>
            ) : null}
          </FormControl>

          {/* General lookup error */}
          {lookupError ? (
            <View className="mt-3 w-full flex-row items-center rounded-lg bg-red-50 px-3 py-2 dark:bg-red-950">
              <AlertTriangle size={16} className="text-red-500" />
              <Text className="ml-2 text-sm text-red-600 dark:text-red-400">{lookupError}</Text>
            </View>
          ) : null}

          {busy ? (
            <Button className="mt-8 w-full">
              <ButtonSpinner color={colors[colorScheme ?? 'light'].neutral[400]} />
              <ButtonText className="ml-2 text-sm font-medium">{t('login.sso.looking_up')}</ButtonText>
            </Button>
          ) : (
            <Button className="mt-8 w-full" variant="solid" action="primary" onPress={handleSubmit(onSubmit)}>
              <ButtonText>{t('login.sso.continue_button')}</ButtonText>
            </Button>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

// ---------------------------------------------------------------------------

export interface SsoLoginButtonsProps {
  departmentCode: string;
  ssoConfig: DepartmentSsoConfig;
  onOidcPress: () => void;
  onSamlPress: () => void;
  onChangeDepartment: () => void;
  oidcRequestReady?: boolean;
  isLoading?: boolean;
}

/**
 * Renders the SSO provider buttons (OIDC / SAML) for Phase 2 of the login flow.
 * Consumed by the login index so it can be placed above or below the local login form.
 */
export const SsoLoginButtons: React.FC<SsoLoginButtonsProps> = ({ departmentCode, ssoConfig, onOidcPress, onSamlPress, onChangeDepartment, oidcRequestReady = false, isLoading = false }) => {
  const { t } = useTranslation();

  const showOidc = ssoConfig.ssoEnabled && ssoConfig.providerType === 'oidc';
  const showSaml = ssoConfig.ssoEnabled && ssoConfig.providerType === 'saml2';
  const showDivider = ssoConfig.ssoEnabled && ssoConfig.allowLocalLogin;

  if (!showOidc && !showSaml) return null;

  return (
    <View className="w-full">
      <Text className="mb-4 text-center text-sm font-medium text-gray-500">{departmentCode}</Text>

      {showOidc ? (
        <Button className="mb-3 w-full bg-indigo-600" variant="solid" onPress={onOidcPress} isDisabled={!oidcRequestReady || isLoading}>
          <LogIn size={18} color="#fff" />
          <ButtonText className="ml-2">{t('login.sso.sign_in_with_sso')}</ButtonText>
        </Button>
      ) : null}

      {showSaml ? (
        <Button className="mb-3 w-full bg-indigo-600" variant="solid" onPress={onSamlPress} isDisabled={isLoading}>
          <LogIn size={18} color="#fff" />
          <ButtonText className="ml-2">{t('login.sso.sign_in_with_sso')}</ButtonText>
        </Button>
      ) : null}

      {showDivider ? <Text className="my-4 text-center text-sm text-gray-400">{t('login.sso.or_sign_in_with_password')}</Text> : null}

      <Button className="mt-2 w-full" variant="link" onPress={onChangeDepartment}>
        <ChevronLeft size={16} />
        <ButtonText className="text-sm">{t('login.sso.change_department')}</ButtonText>
      </Button>
    </View>
  );
};
