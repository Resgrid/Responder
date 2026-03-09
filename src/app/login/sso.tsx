import { Stack, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { SsoDepartmentForm, SsoLoginButtons } from '@/app/login/sso-section';
import { FocusAwareStatusBar } from '@/components/ui';
import { Button, ButtonText } from '@/components/ui/button';
import { Modal, ModalBackdrop, ModalBody, ModalContent, ModalFooter, ModalHeader } from '@/components/ui/modal';
import { Text } from '@/components/ui/text';
import { useAnalytics } from '@/hooks/use-analytics';
import { useOidcLogin } from '@/hooks/use-oidc-login';
import { useSamlLogin } from '@/hooks/use-saml-login';
import { useAuth } from '@/lib/auth';
import { logger } from '@/lib/logging';
import type { DepartmentSsoConfig } from '@/services/sso-discovery';
import { fetchUserSsoConfig } from '@/services/sso-discovery';

type SsoPhase = 'department' | 'login';

export default function SsoLogin() {
  const { t } = useTranslation();
  const router = useRouter();
  const { status, error, isAuthenticated } = useAuth();
  const { trackEvent } = useAnalytics();

  const [ssoPhase, setSsoPhase] = useState<SsoPhase>('department');
  const [username, setUsername] = useState('');
  const [ssoConfig, setSsoConfig] = useState<DepartmentSsoConfig | null>(null);
  const [isErrorModalVisible, setIsErrorModalVisible] = useState(false);

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
      ) : ssoEnabled ? (
        <SsoLoginButtons
          departmentCode={username}
          ssoConfig={ssoConfig!}
          onOidcPress={() => oidc.promptAsync()}
          onSamlPress={() => saml.startSamlLogin()}
          onChangeDepartment={handleChangeDepartment}
          oidcRequestReady={!!oidc.request}
          isLoading={status === 'loading'}
        />
      ) : null}

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
