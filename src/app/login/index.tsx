import { useFocusEffect } from '@react-navigation/native';
import CryptoJS from 'crypto-js';
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
import { Env } from '@/lib/env';
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

      // Safe analytics: classify and truncate error before tracking
      try {
        const timestamp = new Date().toISOString();
        // Treat error as string and classify based on content
        const rawMessage = error ?? '';
        let errorCode = 'unknown_error';
        if (rawMessage.includes('TypeError')) {
          errorCode = 'type_error';
        } else if (rawMessage.toLowerCase().includes('network')) {
          errorCode = 'network_error';
        } else if (rawMessage.toLowerCase().includes('auth')) {
          errorCode = 'auth_error';
        }
        // Truncate message to 100 chars
        const message = rawMessage.slice(0, 100);
        trackEvent('login_failed', {
          timestamp,
          errorCode,
          category: 'login_error',
          message,
        });
      } catch {
        // Swallow analytics errors, log non-sensitive warning
        logger.warn({ message: 'Failed to track login_failed event' });
      }

      setIsErrorModalVisible(true);
    }
  }, [status, error, trackEvent]);

  const onSubmit: LoginFormProps['onSubmit'] = async (data) => {
    const usernameHash = data.username ? CryptoJS.HmacSHA256(data.username, Env.LOGGING_KEY || '').toString() : null;
    logger.info({
      message: 'Starting Login (button press)',
      context: { hasUsername: Boolean(data.username), usernameHash },
    });

    // Track login attempt
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
