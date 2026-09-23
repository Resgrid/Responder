import { type Href, Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, ScrollView } from 'react-native';

import { Button, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Input, InputField } from '@/components/ui/input';
import { Pressable } from '@/components/ui/pressable';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { expiryTone, optionalDate } from '@/lib/certifications/format';
import { type CapturedPhoto, capturePhoto, discardPhoto, PhotoPermissionError } from '@/lib/media/photo';
import { useCertificationsStore } from '@/stores/certifications/store';

const hoursOf = (text: string) => {
  const value = Number(text.replace(',', '.'));
  return Number.isFinite(value) && value > 0 ? Math.round(value * 100) / 100 : null;
};

// One certification: its dates and status, the department's verification, renewal and the continuing-education
// hours logged toward it (with an optional certificate photo per entry).
export default function CertificationScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { detail, credits, busy, error } = useCertificationsStore();
  const [renewTo, setRenewTo] = useState('');
  const [renewNumber, setRenewNumber] = useState('');
  const [creditDate, setCreditDate] = useState('');
  const [creditHours, setCreditHours] = useState('');
  const [creditCategory, setCreditCategory] = useState('');
  const [creditNote, setCreditNote] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      const numeric = Number(id);
      if (Number.isFinite(numeric)) void useCertificationsStore.getState().open(numeric);
      return () => useCertificationsStore.getState().close();
    }, [id])
  );

  const renew = async () => {
    const date = optionalDate(renewTo);
    if (!date.ok) {
      setMessage(t('certifications.dateInvalid'));
      return;
    }
    if (await useCertificationsStore.getState().renew(date.value, renewNumber.trim() || null)) {
      setRenewTo('');
      setRenewNumber('');
      setMessage(t('certifications.renewed'));
    }
  };

  const addCredit = async (withPhoto?: 'camera' | 'library') => {
    const hours = hoursOf(creditHours);
    const date = optionalDate(creditDate);
    if (hours == null || !date.ok) {
      setMessage(hours == null ? t('certifications.hoursInvalid') : t('certifications.dateInvalid'));
      return;
    }
    let photo: CapturedPhoto | null = null;
    try {
      photo = withPhoto ? await capturePhoto(withPhoto, 'ce-certificate.jpg') : null;
      if (withPhoto && !photo) return;
      const ok = await useCertificationsStore.getState().addCredit({
        CreditDate: date.value,
        Hours: hours,
        Category: creditCategory.trim() || null,
        Description: creditNote.trim() || null,
        FileData: photo?.base64 ?? null,
        FileName: photo?.name ?? null,
        FileType: photo?.contentType ?? null,
      });
      if (ok) {
        setCreditHours('');
        setCreditDate('');
        setCreditCategory('');
        setCreditNote('');
        setMessage(t('certifications.creditAdded'));
      }
    } catch (failure) {
      setMessage(failure instanceof PhotoPermissionError ? t('certifications.photoDenied') : t('certifications.errors.retry'));
    } finally {
      await discardPhoto(photo);
    }
  };

  const remove = () =>
    Alert.alert(t('certifications.removeTitle'), t('certifications.removeBody'), [
      { text: t('certifications.cancel'), style: 'cancel' },
      {
        text: t('certifications.remove'),
        style: 'destructive',
        onPress: async () => {
          if (await useCertificationsStore.getState().remove()) router.back();
        },
      },
    ]);

  return (
    <VStack className="flex-1 bg-background-0">
      <Stack.Screen options={{ title: t('certifications.title') }} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} keyboardShouldPersistTaps="handled">
        <HStack space="sm" className="items-center">
          <Pressable onPress={() => router.back()} testID="certification-back" accessibilityRole="button" accessibilityLabel={t('certifications.back')}>
            <ArrowLeft size={22} color="#2563eb" />
          </Pressable>
          <Text className="flex-1 text-xl font-bold">{detail?.TypeName || detail?.Name || t('certifications.title')}</Text>
        </HStack>
        {busy && !detail ? <Spinner /> : null}
        {error ? (
          <Text accessibilityRole="alert" className="text-error-600">
            {t(`certifications.errors.${error}`, { defaultValue: t('certifications.errors.retry') })}
          </Text>
        ) : null}
        {message ? <Text className="text-typography-500">{message}</Text> : null}
        {detail ? (
          <>
            <VStack space="xs">
              <Text>{t(`certifications.status.${detail.Status}`)}</Text>
              {detail.StatusReason ? <Text className="text-typography-500">{detail.StatusReason}</Text> : null}
              {detail.Number ? <Text>{t('certifications.numberIs', { number: detail.Number })}</Text> : null}
              {detail.IssuedBy ? <Text>{t('certifications.issuedByIs', { name: detail.IssuedBy })}</Text> : null}
              {detail.Area ? <Text>{t('certifications.areaIs', { area: detail.Area })}</Text> : null}
              {detail.ReceivedOn ? <Text>{t('certifications.receivedOn', { date: String(detail.ReceivedOn).slice(0, 10) })}</Text> : null}
              <Text className={expiryTone(detail.DaysUntilExpiry, detail.Status)}>
                {detail.ExpiresOn ? t('certifications.expires', { date: String(detail.ExpiresOn).slice(0, 10), days: detail.DaysUntilExpiry ?? '' }) : t('certifications.noExpiry')}
              </Text>
              <Text className="text-typography-500">{detail.VerifiedOn ? t('certifications.verifiedOn', { date: String(detail.VerifiedOn).slice(0, 10) }) : t('certifications.notVerified')}</Text>
              {detail.HasFile ? <Text className="text-typography-500">{t('certifications.hasFile')}</Text> : null}
            </VStack>
            <HStack space="sm">
              <Button variant="outline" size="sm" onPress={() => router.push(`/certifications/edit?id=${detail.Id}` as Href)} testID="certification-edit">
                <ButtonText>{t('certifications.edit')}</ButtonText>
              </Button>
              <Button variant="outline" action="negative" size="sm" onPress={remove} isDisabled={busy} testID="certification-remove">
                <ButtonText>{t('certifications.remove')}</ButtonText>
              </Button>
            </HStack>

            <VStack space="sm" className="rounded-lg border border-outline-200 p-3" testID="certification-renew">
              <Text className="font-semibold">{t('certifications.renew')}</Text>
              <Input>
                <InputField value={renewTo} onChangeText={setRenewTo} placeholder={t('certifications.newExpiry')} maxLength={10} testID="certification-renew-date" />
              </Input>
              <Input>
                <InputField value={renewNumber} onChangeText={setRenewNumber} placeholder={t('certifications.newNumber')} maxLength={100} testID="certification-renew-number" />
              </Input>
              <Button variant="outline" onPress={() => void renew()} isDisabled={busy} testID="certification-renew-save">
                <ButtonText>{t('certifications.renewSave')}</ButtonText>
              </Button>
            </VStack>

            <VStack space="sm" className="rounded-lg border border-outline-200 p-3" testID="certification-credits">
              <Text className="font-semibold">
                {detail.CreditHoursRequired ? t('certifications.credits', { hours: detail.CreditHours, required: detail.CreditHoursRequired }) : t('certifications.creditsTitle', { hours: detail.CreditHours })}
              </Text>
              {credits.map((credit) => (
                <Text key={credit.Id} className="text-typography-500">
                  {String(credit.CreditDate).slice(0, 10)} · {credit.Hours} h{credit.Category ? ` · ${credit.Category}` : ''}
                  {credit.Description ? ` · ${credit.Description}` : ''}
                  {credit.HasFile ? ` · ${t('certifications.certificateAttached')}` : ''}
                </Text>
              ))}
              <HStack space="sm">
                <Input className="w-24">
                  <InputField value={creditHours} onChangeText={setCreditHours} keyboardType="decimal-pad" placeholder={t('certifications.hours')} testID="certification-credit-hours" />
                </Input>
                <Input className="flex-1">
                  <InputField value={creditDate} onChangeText={setCreditDate} placeholder={t('certifications.creditDate')} maxLength={10} testID="certification-credit-date" />
                </Input>
              </HStack>
              <Input>
                <InputField value={creditCategory} onChangeText={setCreditCategory} placeholder={t('certifications.category')} maxLength={100} testID="certification-credit-category" />
              </Input>
              <Input>
                <InputField value={creditNote} onChangeText={setCreditNote} placeholder={t('certifications.creditNote')} maxLength={500} testID="certification-credit-note" />
              </Input>
              <HStack space="sm" className="flex-wrap">
                <Button variant="outline" size="sm" onPress={() => void addCredit()} isDisabled={busy || !creditHours.trim()} testID="certification-credit-save">
                  <ButtonText>{t('certifications.addHours')}</ButtonText>
                </Button>
                <Button variant="outline" size="sm" onPress={() => void addCredit('camera')} isDisabled={busy || !creditHours.trim()} testID="certification-credit-camera">
                  <ButtonText>{t('certifications.addHoursWithPhoto')}</ButtonText>
                </Button>
              </HStack>
            </VStack>
          </>
        ) : null}
      </ScrollView>
    </VStack>
  );
}
