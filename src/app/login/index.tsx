import { useFocusEffect } from '@react-navigation/native';
import CryptoJS from 'crypto-js';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { LoginFormProps } from '@/app/login/login-form';
import { ServerUrlBottomSheet } from '@/components/settings/server-url-bottom-sheet';
import { FocusAwareStatusBar } from '@/components/ui';
import { Button, ButtonText } from '@/components/ui/button';
import { Modal, ModalBackdrop, ModalBody, ModalContent, ModalFooter, ModalHeader } from '@/components/ui/modal';
import { Text } from '@/components/ui/text';
import { useAnalytics } from '@/hooks/use-analytics';
import { useAuth } from '@/lib/auth';
import { Env } from '@/lib/env';
import { logger } from '@/lib/logging';

import { LoginForm } from './login-form';

export default function Login() {
  const [isErrorModalVisible, setIsErrorModalVisible] = useState(false);
  const [isServerUrlSheetVisible, setIsServerUrlSheetVisible] = useState(false);
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

  // Handle successful authenticated state → navigate to app
  useEffect(() => {
    if (status === 'signedIn' && isAuthenticated) {
      logger.info({ message: 'Login successful, redirecting to home' });
      trackEvent('login_success', { timestamp: new Date().toISOString() });
      router.push('/(app)');
    }
  }, [status, isAuthenticated, router, trackEvent]);

  // Show error modal on login failure
  useEffect(() => {
    if (status === 'error') {
      logger.error({ message: 'Login failed', context: { error } });

      try {
        const timestamp = new Date().toISOString();
        const rawMessage = error ?? '';
        let errorCode = 'unknown_error';
        if (rawMessage.includes('TypeError')) {
          errorCode = 'type_error';
        } else if (rawMessage.toLowerCase().includes('network')) {
          errorCode = 'network_error';
        } else if (rawMessage.toLowerCase().includes('auth')) {
          errorCode = 'auth_error';
        }
        trackEvent('login_failed', {
          timestamp,
          errorCode,
          category: 'login_error',
          message: rawMessage.slice(0, 100),
        });
      } catch {
        logger.warn({ message: 'Failed to track login_failed event' });
      }

      setIsErrorModalVisible(true);
    }
  }, [status, error, trackEvent]);

  const onLocalLoginSubmit: LoginFormProps['onSubmit'] = async (data) => {
    const usernameHash = data.username ? CryptoJS.HmacSHA256(data.username, Env.LOGGING_KEY || '').toString() : null;
    logger.info({
      message: 'Starting Login (button press)',
      context: { hasUsername: Boolean(data.username), usernameHash },
    });

    try {
      trackEvent('login_attempted', {
        timestamp: new Date().toISOString(),
        hasUsername: Boolean(data.username),
      });
    } catch (err) {
      logger.error({
        message: 'Failed to track login_attempt',
        context: {
          error: err instanceof Error ? err.message : String(err),
        },
      });
    }

    await login({ username: data.username, password: data.password });
  };

  return (
    <>
      <FocusAwareStatusBar />

      <LoginForm onSubmit={onLocalLoginSubmit} isLoading={status === 'loading'} onSsoPress={() => router.push('/login/sso')} onServerUrlPress={() => setIsServerUrlSheetVisible(true)} {...(error ? { error } : {})} />

      {isServerUrlSheetVisible ? <ServerUrlBottomSheet isOpen={isServerUrlSheetVisible} onClose={() => setIsServerUrlSheetVisible(false)} /> : null}

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
