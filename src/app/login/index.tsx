import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { LoginFormProps } from '@/app/login/login-form';
import { FocusAwareStatusBar } from '@/components/ui';
import { Button, ButtonText } from '@/components/ui/button';
import { Modal, ModalBackdrop, ModalBody, ModalContent, ModalFooter, ModalHeader } from '@/components/ui/modal';
import { Text } from '@/components/ui/text';
import { useAnalytics } from '@/hooks/use-analytics';
import { useAuth } from '@/lib/auth';
import { logger } from '@/lib/logging';

import { LoginForm } from './login-form';

export default function Login() {
  const [isErrorModalVisible, setIsErrorModalVisible] = useState(false);
  const { t } = useTranslation();
  const router = useRouter();
  const { login, status, error, isAuthenticated } = useAuth();
  const { trackEvent } = useAnalytics();

  // Track analytics when view becomes visible
  useFocusEffect(
    useCallback(() => {
      trackEvent('login_viewed', {
        timestamp: new Date().toISOString(),
      });
    }, [trackEvent])
  );

  useEffect(() => {
    if (status === 'signedIn' && isAuthenticated) {
      logger.info({
        message: 'Login successful, redirecting to home',
      });

      // Track successful login
      trackEvent('login_success', {
        timestamp: new Date().toISOString(),
      });

      router.push('/(app)');
    }
  }, [status, isAuthenticated, router, trackEvent]);

  useEffect(() => {
    if (status === 'error') {
      logger.error({
        message: 'Login failed',
        context: { error },
      });

      // Track login failure
      trackEvent('login_failed', {
        timestamp: new Date().toISOString(),
        error: error || 'Unknown error',
      });

      setIsErrorModalVisible(true);
    }
  }, [status, error, trackEvent]);

  const onSubmit: LoginFormProps['onSubmit'] = async (data) => {
    logger.info({
      message: 'Starting Login (button press)',
      context: { username: data.username },
    });

    // Track login attempt
    trackEvent('login_attempted', {
      timestamp: new Date().toISOString(),
      username: data.username,
    });

    await login({ username: data.username, password: data.password });
  };

  return (
    <>
      <FocusAwareStatusBar />
      <LoginForm onSubmit={onSubmit} isLoading={status === 'loading'} error={error ?? undefined} />

      <Modal
        isOpen={isErrorModalVisible}
        onClose={() => {
          setIsErrorModalVisible(false);
        }}
        size="full"
      >
        <ModalBackdrop />
        <ModalContent className="m-4 w-full max-w-3xl rounded-2xl">
          <ModalHeader>
            <Text className="text-xl font-semibold">{t('login.errorModal.title')}</Text>
          </ModalHeader>
          <ModalBody>
            <Text>{t('login.errorModal.message')}</Text>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="solid"
              size="sm"
              action="primary"
              onPress={() => {
                setIsErrorModalVisible(false);
              }}
            >
              <ButtonText>{t('login.errorModal.confirmButton')}</ButtonText>
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
