import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle, EyeIcon, EyeOffIcon } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import React, { useState } from 'react';
import type { SubmitHandler } from 'react-hook-form';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Image, Keyboard } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import * as z from 'zod';

import { View } from '@/components/ui';
import { Button, ButtonSpinner, ButtonText } from '@/components/ui/button';
import { FormControl, FormControlError, FormControlErrorIcon, FormControlErrorText, FormControlLabel, FormControlLabelText } from '@/components/ui/form-control';
import { Input, InputField, InputIcon, InputSlot } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import colors from '@/constants/colors';

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
};

export const LoginForm = ({ onSubmit = () => {}, isLoading = false, error = undefined }: LoginFormProps) => {
  const { colorScheme } = useColorScheme();
  const { t } = useTranslation();
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormType>({
    resolver: zodResolver(loginFormSchema),
  });
  const [validated] = useState({
    usernameValid: true,
    passwordValid: true,
  });

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

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" keyboardVerticalOffset={10}>
      <View className="flex-1 justify-center p-4">
        <View className="items-center justify-center">
          <Image style={{ width: '96%' }} source={colorScheme === 'dark' ? require('@assets/images/Resgrid_JustText_White.png') : require('@assets/images/Resgrid_JustText.png')} resizeMode="contain" />
          <Text className="pb-6 text-center text-4xl font-bold">Sign In</Text>

          <Text className="mb-6 max-w-xl text-center text-gray-500">
            To login in to the Resgrid Responder app, please enter your username and password. Resgrid Responder is an app designed to allow a person to interact with their orginization in the Resgrid system.
          </Text>
        </View>
        <FormControl isInvalid={!!errors?.username || !validated.usernameValid} className="w-full">
          <FormControlLabel>
            <FormControlLabelText>{t('login.username')}</FormControlLabelText>
          </FormControlLabel>
          <Controller
            defaultValue=""
            name="username"
            control={control}
            rules={{
              validate: async (value) => {
                try {
                  await loginFormSchema.parseAsync({ username: value });
                  return true;
                } catch (error: any) {
                  return error.message;
                }
              },
            }}
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
            <FormControlErrorText className="text-red-500">{errors?.username?.message || (!validated.usernameValid && 'Username not found')}</FormControlErrorText>
          </FormControlError>
        </FormControl>
        {/* Label Message */}
        <FormControl isInvalid={!!errors.password || !validated.passwordValid} className="w-full">
          <FormControlLabel>
            <FormControlLabelText>{t('login.password')}</FormControlLabelText>
          </FormControlLabel>
          <Controller
            defaultValue=""
            name="password"
            control={control}
            rules={{
              validate: async (value) => {
                try {
                  await loginFormSchema.parseAsync({ password: value });
                  return true;
                } catch (error: any) {
                  return error.message;
                }
              },
            }}
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
            <FormControlErrorText className="text-red-500">{errors?.password?.message || (!validated.passwordValid && t('login.password_incorrect'))}</FormControlErrorText>
          </FormControlError>
        </FormControl>

        {isLoading ? (
          <Button className="mt-8 w-full">
            <ButtonSpinner color={colors.light.neutral[400]} />
            <ButtonText className="ml-2 text-sm font-medium">{t('login.login_button_loading')}</ButtonText>
          </Button>
        ) : (
          <Button className="mt-8 w-full" variant="solid" action="primary" onPress={handleSubmit(onSubmit)}>
            <ButtonText>Log in</ButtonText>
          </Button>
        )}
      </View>
    </KeyboardAvoidingView>
  );
};
