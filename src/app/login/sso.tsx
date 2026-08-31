import { Stack, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { SsoDepartmentForm, SsoLoginButtons } from '@/app/login/sso-section';
import { LoginOtpModal } from '@/components/auth/login-otp-modal';
import { FocusAwareStatusBar } from '@/components/ui';
import { Button, ButtonText } from '@/components/ui/button';
import { Modal, ModalBackdrop, ModalBody, ModalContent, ModalFooter, ModalHeader } from '@/components/ui/modal';
import { Text } from '@/components/ui/text';
import { useAnalytics } from '@/hooks/use-analytics';
import { isValidSsoUrl, useOidcLogin } from '@/hooks/use-oidc-login';
import { useSamlLogin } from '@/hooks/use-saml-login';
import { useAuth } from '@/lib/auth';
import { logger } from '@/lib/logging';
import type { DepartmentSsoConfig } from '@/services/sso-discovery';
import { fetchUserSsoConfig } from '@/services/sso-discovery';
import useAuthStore from '@/stores/auth/store';

type SsoPhase = 'department' | 'login';

export default function SsoLogin() {
  const { t } = useTranslation();
  const router = useRouter();
  const { status, error, isAuthenticated } = useAuth();
  // 'mfaRequired' is also how the password login reports its own 2FA challenge. Opening this
  // screen's prompt on that status alone means retrySsoWithOtp fires with no pending SSO
  // exchange, which drops the user into an error state instead of a code prompt.
  const isSsoMfaPending = useAuthStore((s) => s.isSsoMfaPending);
  const { trackEvent } = useAnalytics();

  const [ssoPhase, setSsoPhase] = useState<SsoPhase>('department');
  const [username, setUsername] = useState('');
  const [ssoConfig, setSsoConfig] = useState<DepartmentSsoConfig | null>(null);
  const [isErrorModalVisible, setIsErrorModalVisible] = useState(false);
  const [otpDismissed, setOtpDismissed] = useState(false);

  // OIDC hook — called unconditionally; empty strings until config resolved
  const oidc = useOidcLogin({
    authority: ssoConfig?.authority ?? '',
    clientId: ssoConfig?.clientId ?? '',
    departmentCode: username,
  });

  // SAML hook
  const saml = useSamlLogin({
    idpSsoUrl: ssoConfig?.metadataUrl ?? ssoConfig?.authority ?? '',
    departmentCode: username,
  });

  // Redirect to app on successful auth
  useEffect(() => {
    if (status === 'signedIn' && isAuthenticated) {
      logger.info({ message: 'SSO login successful, redirecting to home' });
      trackEvent('sso_login_success', { timestamp: new Date().toISOString() });
      router.replace('/(app)');
    }
  }, [status, isAuthenticated, router, trackEvent]);

  // Re-arm the OTP prompt whenever a fresh SSO 2FA challenge arrives
  useEffect(() => {
    if (status === 'mfaRequired' && isSsoMfaPending) {
      setOtpDismissed(false);
    }
  }, [status, isSsoMfaPending]);

  const handleOtpSubmit = useCallback(async (code: string) => {
    await useAuthStore.getState().retrySsoWithOtp(code);
  }, []);

  // Show error modal on auth failure
  useEffect(() => {
    if (status === 'error') {
      logger.error({ message: 'SSO login failed', context: { error } });
      trackEvent('sso_login_failed', {
        timestamp: new Date().toISOString(),
        message: (error ?? '').slice(0, 100),
      });
      setIsErrorModalVisible(true);
    }
  }, [status, error, trackEvent]);

  // Watch OIDC response — exchange code for Resgrid token when authorisation completes
  useEffect(() => {
    if (oidc.response?.type === 'success') {
      oidc.exchangeCodeForResgridToken().then((ok) => {
        if (!ok) {
          logger.error({ message: 'OIDC code exchange returned false' });
          setIsErrorModalVisible(true);
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [oidc.response]);

  // User / department lookup
  const handleLookupUser = useCallback(async (user: string, departmentId?: number): Promise<DepartmentSsoConfig | null> => fetchUserSsoConfig(user, departmentId), []);

  const handleSsoConfigResolved = useCallback(
    (user: string, config: DepartmentSsoConfig) => {
      setUsername(user);
      setSsoConfig(config);
      setSsoPhase('login');
      trackEvent('sso_user_resolved', {
        timestamp: new Date().toISOString(),
        hasSso: config.ssoEnabled,
        providerType: config.providerType ?? 'none',
      });
    },
    [trackEvent]
  );

  const handleChangeDepartment = useCallback(() => {
    setSsoConfig(null);
    setUsername('');
    setSsoPhase('department');
  }, []);

  const handleOidcPress = useCallback(() => {
    const authorityUrl = ssoConfig?.authority ?? '';
    if (!isValidSsoUrl(authorityUrl)) {
      logger.error({ message: 'SSO: refusing OIDC login with invalid or insecure authority URL' });
      setIsErrorModalVisible(true);
      return;
    }
    void oidc.promptAsync();
  }, [oidc, ssoConfig]);

  const handleSamlPress = useCallback(() => {
    const samlUrl = ssoConfig?.metadataUrl ?? ssoConfig?.authority ?? '';
    if (!isValidSsoUrl(samlUrl)) {
      logger.error({ message: 'SSO: refusing SAML login with invalid or insecure IdP URL' });
      setIsErrorModalVisible(true);
      return;
    }
    void saml.startSamlLogin();
  }, [saml, ssoConfig]);

  const ssoEnabled = ssoConfig?.ssoEnabled ?? false;

  return (
    <>
      <FocusAwareStatusBar />
      <Stack.Screen
        options={{
          title: t('login.sso.page_title'),
          headerBackTitle: t('login.sso.back'),
        }}
      />

      {ssoPhase === 'department' ? (
        <SsoDepartmentForm onSsoConfigResolved={handleSsoConfigResolved} onLookupUser={handleLookupUser} isLoading={status === 'loading'} />
      ) : ssoConfig !== null && ssoEnabled ? (
        <SsoLoginButtons
          departmentCode={username}
          ssoConfig={ssoConfig}
          onOidcPress={handleOidcPress}
          onSamlPress={handleSamlPress}
          onChangeDepartment={handleChangeDepartment}
          oidcRequestReady={!!oidc.request}
          isLoading={status === 'loading'}
        />
      ) : (
        <View className="flex-1 items-center justify-center p-6">
          <Text className="mb-6 text-center text-base">{t('login.sso.sso_not_enabled')}</Text>
          <Button variant="outline" size="md" action="secondary" onPress={handleChangeDepartment} className="mb-3 w-full">
            <ButtonText>{t('login.sso.change_department')}</ButtonText>
          </Button>
          <Button variant="solid" size="md" action="primary" onPress={() => router.replace('/login')} className="w-full">
            <ButtonText>{t('login.sso.or_sign_in_with_password')}</ButtonText>
          </Button>
        </View>
      )}

      {/* Two-factor challenge: SSO exchange answered mfa_required / invalid_totp */}
      <LoginOtpModal
        isOpen={status === 'mfaRequired' && isSsoMfaPending && !otpDismissed}
        isSubmitting={status === 'loading'}
        invalidCode={error === 'invalid_totp'}
        onSubmit={handleOtpSubmit}
        onClose={() => setOtpDismissed(true)}
      />

      {/* Error modal */}
      <Modal isOpen={isErrorModalVisible} onClose={() => setIsErrorModalVisible(false)} size="full">
        <ModalBackdrop />
        <ModalContent className="m-4 w-full max-w-3xl rounded-2xl">
          <ModalHeader>
            <Text className="text-xl font-semibold">{t('login.errorModal.title')}</Text>
          </ModalHeader>
          <ModalBody>
            <Text>{t('login.errorModal.message')}</Text>
          </ModalBody>
          <ModalFooter>
            <Button variant="solid" size="sm" action="primary" onPress={() => setIsErrorModalVisible(false)}>
              <ButtonText>{t('login.errorModal.confirmButton')}</ButtonText>
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
