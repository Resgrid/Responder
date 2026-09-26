import { type Href, Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView } from 'react-native';

import { getCertification } from '@/api/certifications/certifications';
import { OptionSelect } from '@/components/operations/option-select';
import { Button, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Input, InputField } from '@/components/ui/input';
import { Pressable } from '@/components/ui/pressable';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { optionalDate } from '@/lib/certifications/format';
import { type CapturedPhoto, capturePhoto, discardPhoto, PhotoPermissionError } from '@/lib/media/photo';
import type { Certification } from '@/models/v4/certifications';
import { certificationError, useCertificationsStore } from '@/stores/certifications/store';

const OTHER = '';

// Add or edit one of the member's own certifications: pick it from the department's catalog (or name it),
// enter the number, issuer and dates, and attach a photo of the card or certificate. A catalog entry with a
// default validity lets the server work out the expiry when it is left blank.
export default function EditCertificationScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const listed = useCertificationsStore((state) => (id ? state.items.find((item) => String(item.Id) === id) : undefined));
  const [fetched, setFetched] = useState<Certification | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const needsFetch = !!id && !listed;

  useEffect(() => {
    if (useCertificationsStore.getState().types.length === 0) void useCertificationsStore.getState().load();
  }, []);

  // Opened on a record the list does not hold (a deep link, or before the list has loaded): read it directly,
  // so edit mode never falls back to a blank "add" form whose save would create a second certification.
  useEffect(() => {
    if (!needsFetch) return;
    const numeric = Number(id);
    if (!Number.isFinite(numeric)) {
      setFetchError('denied');
      return;
    }
    let active = true;
    setFetchError(null);
    getCertification(numeric)
      .then((record) => {
        if (active) setFetched(record);
      })
      .catch((failure: unknown) => {
        if (active) setFetchError(certificationError(failure));
      });
    return () => {
      active = false;
    };
  }, [id, needsFetch]);

  const existing = listed ?? (fetched && String(fetched.Id) === id ? fetched : undefined);

  if (id && !existing) {
    return (
      <VStack className="flex-1 bg-background-0">
        <Stack.Screen options={{ title: t('certifications.edit') }} />
        <VStack space="md" className="p-4">
          <HStack space="sm" className="items-center">
            <Pressable onPress={() => router.back()} testID="certification-edit-back" accessibilityRole="button" accessibilityLabel={t('certifications.back')}>
              <ArrowLeft size={22} color="#2563eb" />
            </Pressable>
            <Text className="flex-1 text-xl font-bold">{t('certifications.edit')}</Text>
          </HStack>
          {fetchError ? (
            <Text accessibilityRole="alert" className="text-error-600" testID="certification-edit-error">
              {t(`certifications.errors.${fetchError}`, { defaultValue: t('certifications.errors.retry') })}
            </Text>
          ) : (
            <Spinner testID="certification-edit-loading" />
          )}
        </VStack>
      </VStack>
    );
  }

  // Keyed by the record so the fields are seeded from it once it is known.
  return <CertificationForm key={existing ? String(existing.Id) : 'new'} existing={existing} />;
}

interface CertificationFormProps {
  existing?: Certification;
}

const CertificationForm: React.FC<CertificationFormProps> = ({ existing }) => {
  const { t } = useTranslation();
  const router = useRouter();
  const { types, busy, error } = useCertificationsStore();
  const [typeId, setTypeId] = useState(existing?.TypeId ? String(existing.TypeId) : OTHER);
  const [name, setName] = useState(existing?.Name ?? '');
  const [number, setNumber] = useState(existing?.Number ?? '');
  const [issuedBy, setIssuedBy] = useState(existing?.IssuedBy ?? '');
  const [area, setArea] = useState(existing?.Area ?? '');
  const [receivedOn, setReceivedOn] = useState(String(existing?.ReceivedOn ?? '').slice(0, 10));
  const [expiresOn, setExpiresOn] = useState(String(existing?.ExpiresOn ?? '').slice(0, 10));
  const [photo, setPhoto] = useState<CapturedPhoto | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const pick = async (source: 'camera' | 'library') => {
    try {
      const next = await capturePhoto(source, 'certificate.jpg');
      if (next) {
        await discardPhoto(photo);
        setPhoto(next);
      }
    } catch (failure) {
      setMessage(failure instanceof PhotoPermissionError ? t('certifications.photoDenied') : t('certifications.errors.retry'));
    }
  };

  const save = async () => {
    const received = optionalDate(receivedOn);
    const expires = optionalDate(expiresOn);
    if (!received.ok || !expires.ok) {
      setMessage(t('certifications.dateInvalid'));
      return;
    }
    if (!typeId && !name.trim()) {
      setMessage(t('certifications.nameRequired'));
      return;
    }
    const saved = await useCertificationsStore.getState().save({
      Id: existing?.Id ?? null,
      TypeId: typeId ? Number(typeId) : null,
      Name: name.trim() || null,
      Number: number.trim() || null,
      IssuedBy: issuedBy.trim() || null,
      Area: area.trim() || null,
      ReceivedOn: received.value,
      ExpiresOn: expires.value,
      FileData: photo?.base64 ?? null,
      FileName: photo?.name ?? null,
      FileType: photo?.contentType ?? null,
    });
    if (saved) {
      await discardPhoto(photo);
      router.replace(`/certifications/${saved.Id}` as Href);
    }
  };

  return (
    <VStack className="flex-1 bg-background-0">
      <Stack.Screen options={{ title: existing ? t('certifications.edit') : t('certifications.add') }} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} keyboardShouldPersistTaps="handled">
        <HStack space="sm" className="items-center">
          <Pressable onPress={() => router.back()} testID="certification-edit-back" accessibilityRole="button" accessibilityLabel={t('certifications.back')}>
            <ArrowLeft size={22} color="#2563eb" />
          </Pressable>
          <Text className="flex-1 text-xl font-bold">{existing ? t('certifications.edit') : t('certifications.add')}</Text>
        </HStack>
        <Text className="font-semibold">{t('certifications.form.type')}</Text>
        <OptionSelect
          value={typeId}
          options={[{ value: OTHER, label: t('certifications.form.otherType') }, ...types.map((type) => ({ value: String(type.Id), label: type.Name }))]}
          placeholder={t('certifications.form.otherType')}
          onChange={setTypeId}
          testID="certification-type"
        />
        {!typeId ? (
          <Input>
            <InputField value={name} onChangeText={setName} placeholder={t('certifications.form.name')} maxLength={200} testID="certification-name" />
          </Input>
        ) : null}
        <Input>
          <InputField value={number} onChangeText={setNumber} placeholder={t('certifications.form.number')} maxLength={100} testID="certification-number" />
        </Input>
        <Input>
          <InputField value={issuedBy} onChangeText={setIssuedBy} placeholder={t('certifications.form.issuedBy')} maxLength={200} testID="certification-issued-by" />
        </Input>
        <Input>
          <InputField value={area} onChangeText={setArea} placeholder={t('certifications.form.area')} maxLength={200} testID="certification-area" />
        </Input>
        <Input>
          <InputField value={receivedOn} onChangeText={setReceivedOn} placeholder={t('certifications.form.receivedOn')} maxLength={10} testID="certification-received" />
        </Input>
        <Input>
          <InputField value={expiresOn} onChangeText={setExpiresOn} placeholder={t('certifications.form.expiresOn')} maxLength={10} testID="certification-expires" />
        </Input>
        <HStack space="sm">
          <Button variant="outline" size="sm" onPress={() => void pick('camera')} testID="certification-camera">
            <ButtonText>{t('certifications.form.takePhoto')}</ButtonText>
          </Button>
          <Button variant="outline" size="sm" onPress={() => void pick('library')} testID="certification-library">
            <ButtonText>{t('certifications.form.choosePhoto')}</ButtonText>
          </Button>
        </HStack>
        {photo ? <Text className="text-typography-500">{t('certifications.form.photoAttached')}</Text> : existing?.HasFile ? <Text className="text-typography-500">{t('certifications.hasFile')}</Text> : null}
        {message ? <Text className="text-typography-500">{message}</Text> : null}
        {error ? (
          <Text accessibilityRole="alert" className="text-error-600">
            {t(`certifications.errors.${error}`, { defaultValue: t('certifications.errors.retry') })}
          </Text>
        ) : null}
        <Button onPress={() => void save()} isDisabled={busy} testID="certification-save">
          <ButtonText>{t('certifications.form.save')}</ButtonText>
        </Button>
      </ScrollView>
    </VStack>
  );
};
