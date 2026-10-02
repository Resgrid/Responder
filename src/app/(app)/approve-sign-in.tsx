import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView } from 'react-native';

import { approveRequest, denyRequest, getApprovalOptions, getPendingApproval, type PendingApprovalData } from '@/api/mfa/account-security';
import { Box } from '@/components/ui/box';
import { Button, ButtonText } from '@/components/ui/button';
import { Heading } from '@/components/ui/heading';
import { Input, InputField } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { toMfaProblem } from '@/lib/mfa/errors';
import { mfaErrorKey } from '@/lib/mfa/messages';
import { getPasskeyAssertion } from '@/lib/mfa/passkey';
import { isPasskeyCeremonyError } from '@/lib/mfa/passkey-errors';
import { parseUtc } from '@/lib/mfa/types';

type Phase = 'loading' | 'review' | 'approved' | 'denied' | 'none';

const APP_NAMES: Record<string, string> = { web: 'Resgrid Web', unit: 'Resgrid Unit', dispatch: 'Resgrid Dispatch', ic: 'Resgrid Command' };

/**
 * Approve with Responder, as the approver (passkey plan section 7.9). The request names the app, installation, department,
 * purpose and coarse origin; the member types the number shown on the other screen and confirms with this app's
 * passkey. The number is never pushed, so only someone who can see that screen can approve it. "This wasn't me" ends
 * the other sign-in and pauses requests for a while.
 */
export default function ApproveSignIn() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const [phase, setPhase] = useState<Phase>('loading');
  const [request, setRequest] = useState<PendingApprovalData | null>(null);
  const [number, setNumber] = useState('');
  const [busy, setBusy] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const pending = await getPendingApproval();
      setRequest(pending);
      setPhase(pending ? 'review' : 'none');
    } catch (error) {
      setErrorCode(toMfaProblem(error).code);
      setPhase('none');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, params.id]);

  const approve = useCallback(async () => {
    if (!request) {
      return;
    }
    setBusy(true);
    setErrorCode(null);
    try {
      const ceremony = await getApprovalOptions(request.ApprovalRequestId);
      const credential = await getPasskeyAssertion(ceremony.Options);
      await approveRequest(request.ApprovalRequestId, number.trim(), ceremony.RequestId, credential);
      setPhase('approved');
    } catch (error) {
      if (isPasskeyCeremonyError(error)) {
        setErrorCode(`passkey_${error.reason}`);
      } else {
        const problem = toMfaProblem(error);
        setErrorCode(problem.code);
        if (problem.code === 'approval_number_mismatch') {
          // The attempts left come from the server; a request that ran out is denied there.
          await load();
        } else if (problem.code === 'approval_denied' || problem.code === 'approval_expired') {
          setPhase('none');
        }
      }
    } finally {
      setNumber('');
      setBusy(false);
    }
  }, [load, number, request]);

  const deny = useCallback(
    async (reason: 'declined' | 'not_me') => {
      if (!request) {
        return;
      }
      setBusy(true);
      setErrorCode(null);
      try {
        await denyRequest(request.ApprovalRequestId, reason);
        setPhase('denied');
      } catch (error) {
        setErrorCode(toMfaProblem(error).code);
      } finally {
        setBusy(false);
      }
    },
    [request]
  );

  const done = useCallback(() => (router.canGoBack() ? router.back() : router.replace('/(app)')), [router]);

  const expiresAt = parseUtc(request?.ExpiresAt);

  return (
    <>
      <Stack.Screen options={{ title: t('mfa.approve.title') }} />
      <ScrollView contentContainerStyle={{ padding: 24 }} keyboardShouldPersistTaps="handled">
        <VStack space="md">
          <Heading size="lg">{t('mfa.approve.title')}</Heading>

          {phase === 'loading' ? <Spinner size="large" /> : null}

          {phase === 'review' && request ? (
            <>
              <Box className="rounded-lg bg-background-50 p-4" testID="approve-details">
                <VStack space="xs">
                  <Text className="font-semibold">{t(`mfa.approve.purpose.${request.Purpose}`)}</Text>
                  <Text size="sm">{t('mfa.approve.app', { app: (request.RequestingApp && APP_NAMES[request.RequestingApp]) ?? t('mfa.approve.unknown_app') })}</Text>
                  {request.InstallationLabel ? <Text size="sm">{t('mfa.approve.installation', { label: request.InstallationLabel })}</Text> : null}
                  {request.Shared ? <Text size="sm">{t('mfa.approve.shared')}</Text> : null}
                  {request.Department ? <Text size="sm">{t('mfa.approve.department', { department: request.Department })}</Text> : null}
                  {request.OriginRegion ? <Text size="sm">{t('mfa.approve.origin', { origin: request.OriginRegion })}</Text> : null}
                  {expiresAt ? <Text size="sm">{t('mfa.approve.expires', { time: new Date(expiresAt).toLocaleTimeString() })}</Text> : null}
                </VStack>
              </Box>
              <Text size="sm">{t('mfa.approve.number_body')}</Text>
              <Input variant="outline" size="lg" isDisabled={busy}>
                <InputField
                  testID="approve-number"
                  value={number}
                  onChangeText={setNumber}
                  placeholder={t('mfa.approve.number_placeholder')}
                  keyboardType="number-pad"
                  maxLength={2}
                  accessibilityLabel={t('mfa.approve.number_placeholder')}
                  aria-label={t('mfa.approve.number_placeholder')}
                />
              </Input>
              <Button action="primary" onPress={() => void approve()} isDisabled={busy || number.trim().length !== 2} testID="approve-confirm">
                {busy ? <Spinner size="small" /> : <ButtonText>{t('mfa.approve.approve')}</ButtonText>}
              </Button>
              <Button variant="outline" action="secondary" onPress={() => void deny('declined')} isDisabled={busy} testID="approve-deny">
                <ButtonText>{t('mfa.approve.deny')}</ButtonText>
              </Button>
              <Button variant="outline" action="negative" onPress={() => void deny('not_me')} isDisabled={busy} testID="approve-not-me">
                <ButtonText>{t('mfa.approve.not_me')}</ButtonText>
              </Button>
            </>
          ) : null}

          {phase === 'approved' ? <Text testID="approve-approved">{t('mfa.approve.approved')}</Text> : null}
          {phase === 'denied' ? <Text testID="approve-denied">{t('mfa.approve.denied')}</Text> : null}
          {phase === 'none' ? <Text testID="approve-none">{t('mfa.approve.none')}</Text> : null}

          {errorCode ? (
            <Text size="sm" className="text-error-600" testID="approve-error" accessibilityLiveRegion="polite" accessibilityRole="alert" role="alert">
              {errorCode === 'approval_number_mismatch' && request ? t('mfa.approve.number_mismatch', { count: request.AttemptsRemaining }) : t(mfaErrorKey(errorCode))}
            </Text>
          ) : null}

          {phase !== 'review' && phase !== 'loading' ? (
            <Button action="primary" onPress={done} testID="approve-done">
              <ButtonText>{t('mfa.approve.done')}</ButtonText>
            </Button>
          ) : null}
        </VStack>
      </ScrollView>
    </>
  );
}
