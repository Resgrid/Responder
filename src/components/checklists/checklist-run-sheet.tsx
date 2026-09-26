import { randomUUID } from 'expo-crypto';
import * as FileSystem from 'expo-file-system/legacy';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, AppState, Image, Modal, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { attestChecklistRun, getChecklistImage } from '@/api/checklists/checklists';
import { ChecklistSignaturePad } from '@/components/checklists/signature-pad';
import { Button, ButtonText } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { checklistFailed, isChecklistRequired, visibleChecklistItems } from '@/lib/checklists/form';
import { checklistError } from '@/lib/checklists/sync';
import type { ChecklistAnswer, ChecklistItem } from '@/models/v4/checklists';
import useAuthStore from '@/stores/auth/store';
import { useChecklistsStore } from '@/stores/checklists/store';
import { dataProtectionStore } from '@/stores/data-protection/store';

export const ChecklistRunSheet: React.FC = () => {
  const { t } = useTranslation();
  const draft = useChecklistsStore((s) => s.active);
  const update = useChecklistsStore((s) => s.update);
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [signing, setSigning] = useState<string | null>(null);
  const [attestation, setAttestation] = useState('');
  const [viewedEvidence, setViewedEvidence] = useState<Record<string, string>>({});
  const userId = useAuthStore((s) => s.userId);
  if (!draft) return null;
  const input = draft.input;
  const items = visibleChecklistItems(draft.run.Form, input.Answers);
  const item = items[Math.min(step, Math.max(0, items.length - 1))];
  const answer = input.Answers.find((a) => a.ItemId === item?.Id);
  const editable = draft.run.CanEdit && !draft.queued;
  const action = async (work: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await work();
    } catch (e) {
      setError(checklistError(e));
    } finally {
      setBusy(false);
    }
  };
  const change = (value: Partial<ChecklistAnswer>) => {
    if (!item) return;
    const changed = [...input.Answers.filter((a) => a.ItemId !== item.Id), { ItemId: item.Id, Status: answer?.Status ?? 1, ...answer, ...value }];
    // Hidden answers must not be submitted from a stale branch of a conditional form.
    const visible = new Set(visibleChecklistItems(draft.run.Form, changed).map((i) => i.Id));
    void update({ ...input, Answers: changed.filter((a) => visible.has(a.ItemId)) }).catch((e) => setError(checklistError(e)));
  };
  const photo = async (question: ChecklistItem, camera = false) => {
    const permission = await (camera ? ImagePicker.requestCameraPermissionsAsync() : ImagePicker.requestMediaLibraryPermissionsAsync());
    if (!permission.granted) throw new Error('denied');
    const result = await (camera ? ImagePicker.launchCameraAsync({ quality: 0.8, exif: false }) : ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, exif: false }));
    if (result.canceled) return;
    const asset = result.assets[0];
    let converted: { uri: string; base64?: string } | null = null;
    try {
      // Normalize HEIC and other camera formats, strip metadata and bound evidence dimensions.
      converted = await manipulateAsync(asset.uri, [{ resize: asset.width >= asset.height ? { width: Math.min(asset.width, 2048) } : { height: Math.min(asset.height, 2048) } }], {
        format: SaveFormat.JPEG,
        compress: 0.8,
        base64: true,
      });
      if (!converted.base64) throw new Error('retry');
      // System permission/camera UI can briefly inactivate the app. Restore only this encrypted
      // draft after returning; openDraft still requires the same identity and a live ADP grant.
      const state = useChecklistsStore.getState();
      if (!state.active) {
        if (state.scope !== draft.scope) throw new Error('denied');
        await state.openDraft(draft.id);
      }
      const active = useChecklistsStore.getState().active;
      if (active?.scope !== draft.scope || active.id !== draft.id) throw new Error('denied');
      await useChecklistsStore.getState().addImage({ id: randomUUID(), itemId: question.Id, name: 'evidence.jpg', contentType: 'image/jpeg', base64: converted.base64 });
    } finally {
      // Only app cache copies are ours to remove. Never remove a camera-roll original.
      for (const uri of new Set([asset.uri, converted?.uri])) if (uri && FileSystem.cacheDirectory && uri.startsWith(FileSystem.cacheDirectory)) await FileSystem.deleteAsync(uri, { idempotent: true });
    }
  };
  const choices = !item
    ? []
    : item.Type === 0
      ? [
          ['pass', 'Pass'],
          ['fail', 'Fail'],
        ]
      : item.Type === 1
        ? [
            ['true', 'Yes'],
            ['false', 'No'],
          ]
        : item.Type === 2
          ? [
              ['true', 'Checked'],
              ['false', 'Unchecked'],
            ]
          : item.Type === 6
            ? item.Options.map((v) => [v, v])
            : [];
  const evidence = item ? draft.images.filter((i) => i.itemId === item.Id).length + draft.run.Files.filter((i) => i.ItemId === item.Id).length : 0;
  return (
    <Modal visible animationType="slide" onRequestClose={() => useChecklistsStore.getState().close()}>
      <SafeAreaView className="flex-1 bg-background-0">
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} keyboardShouldPersistTaps="handled">
          <Text className="text-xl font-bold">{draft.run.Form.Name}</Text>
          <Text>
            {draft.run.Target.Name} · {t('checklists.labels.Version')} {draft.run.VersionNumber}
          </Text>
          {draft.run.Form.Instructions ? <Text>{draft.run.Form.Instructions}</Text> : null}
          <Text>{t('checklists.labels.RunGuidance')}</Text>
          {error ? <Text accessibilityRole="alert">{t(`checklists.errors.${error}`)}</Text> : null}
          {draft.queued ? <Text>{t('checklists.ui.queued')}</Text> : null}
          {item ? (
            <View style={{ gap: 10 }}>
              <Text>
                {Math.min(step + 1, items.length)} / {items.length}
              </Text>
              <Text className="font-bold">
                {item.Name} {isChecklistRequired(item, input.Answers) ? `(${t('checklists.labels.Required')})` : ''}
              </Text>
              {item.Critical ? <Text>{t('checklists.labels.Critical')}</Text> : null}
              {item.Instructions ? <Text>{item.Instructions}</Text> : null}
              {choices.map(([value, label]) => (
                <Button key={value} isDisabled={!editable || busy} variant={answer?.Value === value ? 'solid' : 'outline'} onPress={() => change({ Status: 1, Value: value })}>
                  <ButtonText>{item.Type === 6 ? label : t(`checklists.labels.${label}`)}</ButtonText>
                </Button>
              ))}
              {[3, 4, 5, 7].includes(item.Type) ? (
                <TextInput
                  accessibilityLabel={t('checklists.labels.Answer')}
                  className="rounded border border-outline-300 p-3 text-typography-900"
                  editable={editable && !busy}
                  multiline={item.Type === 5}
                  keyboardType={[3, 4].includes(item.Type) ? 'decimal-pad' : 'default'}
                  value={answer?.Value ?? ''}
                  placeholder={item.Type === 7 ? 'YYYY-MM-DD' : (item.Units ?? '')}
                  onChangeText={(Value) => change({ Status: Value ? 1 : 0, Value })}
                />
              ) : null}
              {item.Type === 8 || item.RequirePhotoOnFail || item.Type === 9 ? (
                <Text>
                  {t('checklists.labels.Evidence')}: {evidence}
                </Text>
              ) : null}
              {item.Type === 8 || (item.RequirePhotoOnFail && checklistFailed(item, answer)) ? (
                <Button isDisabled={!editable || busy} onPress={() => void action(() => photo(item))}>
                  <ButtonText>{t('checklists.labels.Photo')}</ButtonText>
                </Button>
              ) : null}
              {item.Type === 8 || (item.RequirePhotoOnFail && checklistFailed(item, answer)) ? (
                <Button isDisabled={!editable || busy} onPress={() => void action(() => photo(item, true))}>
                  <ButtonText>{t('checklists.ui.takePhoto')}</ButtonText>
                </Button>
              ) : null}
              {draft.images
                .filter((image) => image.itemId === item.Id)
                .map((image) => (
                  <View key={image.id}>
                    <Image source={{ uri: `data:${image.contentType};base64,${image.base64}` }} accessibilityLabel={t('checklists.labels.Evidence')} style={{ width: 180, height: 120 }} resizeMode="contain" />
                    {editable ? (
                      <Button variant="outline" isDisabled={busy} onPress={() => void action(() => useChecklistsStore.getState().removeImage(image.id))}>
                        <ButtonText>{t('checklists.ui.removeImage')}</ButtonText>
                      </Button>
                    ) : null}
                  </View>
                ))}
              {draft.run.Files.filter((file) => file.ItemId === item.Id).map((file) => (
                <View key={file.Id}>
                  <Button
                    variant="outline"
                    isDisabled={busy}
                    onPress={() =>
                      void action(async () => {
                        const uri = await getChecklistImage(file.Id);
                        const current = useChecklistsStore.getState();
                        if (
                          AppState.currentState !== 'active' ||
                          (current.access?.IsProtected && !dataProtectionStore.getState().isStepUpActive()) ||
                          current.locked ||
                          current.active?.scope !== draft.scope ||
                          current.active.id !== draft.id
                        )
                          throw new Error('locked');
                        setViewedEvidence((images) => ({ ...images, [file.Id]: uri }));
                      })
                    }
                  >
                    <ButtonText>
                      {t('checklists.labels.Evidence')}: {file.Name}
                    </ButtonText>
                  </Button>
                  {viewedEvidence[file.Id] ? <Image source={{ uri: viewedEvidence[file.Id] }} accessibilityLabel={t('checklists.labels.Evidence')} style={{ width: 240, height: 180 }} resizeMode="contain" /> : null}
                </View>
              ))}
              {item.Type === 9 ? (
                <Button isDisabled={!editable || busy} onPress={() => setSigning(item.Id)}>
                  <ButtonText>{t('checklists.labels.Signature')}</ButtonText>
                </Button>
              ) : null}
              {signing === item.Id && editable ? (
                <ChecklistSignaturePad
                  onSave={(base64) =>
                    action(async () => {
                      await useChecklistsStore.getState().addImage({ id: randomUUID(), itemId: item.Id, name: 'signature.png', contentType: 'image/png', base64 });
                      setSigning(null);
                    })
                  }
                />
              ) : null}
              <Text>{t('checklists.labels.Note')}</Text>
              <TextInput
                accessibilityLabel={t('checklists.labels.Note')}
                className="rounded border border-outline-300 p-3 text-typography-900"
                editable={editable && !busy}
                multiline
                value={answer?.Note ?? ''}
                onChangeText={(Note) => change({ Note })}
              />
              {item.AllowNotApplicable ? (
                <View>
                  <Button isDisabled={!editable || busy} variant="outline" onPress={() => change({ Status: answer?.Status === 2 ? 0 : 2, Value: null })}>
                    <ButtonText>{t('checklists.ui.notApplicable')}</ButtonText>
                  </Button>
                  {answer?.Status === 2 ? (
                    <TextInput
                      accessibilityLabel={t('checklists.ui.reason')}
                      className="rounded border border-outline-300 p-3 text-typography-900"
                      editable={editable}
                      value={answer.NotApplicableReason ?? ''}
                      onChangeText={(NotApplicableReason) => change({ NotApplicableReason })}
                    />
                  ) : null}
                </View>
              ) : null}
              <View className="flex-row justify-between">
                <Button variant="outline" isDisabled={step === 0} onPress={() => setStep((n) => n - 1)}>
                  <ButtonText>{t('checklists.labels.Previous')}</ButtonText>
                </Button>
                <Button variant="outline" isDisabled={step >= items.length - 1} onPress={() => setStep((n) => n + 1)}>
                  <ButtonText>{t('checklists.labels.Next')}</ButtonText>
                </Button>
              </View>
            </View>
          ) : null}
          <TextInput
            accessibilityLabel={t('checklists.labels.Note')}
            className="rounded border border-outline-300 p-3 text-typography-900"
            editable={editable && !busy}
            multiline
            value={input.Note ?? ''}
            onChangeText={(Note) => void update({ ...input, Note }).catch((e) => setError(checklistError(e)))}
          />
          <TextInput
            accessibilityLabel={t('checklists.labels.ReportedLocation')}
            className="rounded border border-outline-300 p-3 text-typography-900"
            editable={editable && !busy}
            value={input.LocationDescription ?? ''}
            onChangeText={(LocationDescription) => void update({ ...input, LocationDescription }).catch((e) => setError(checklistError(e)))}
          />
          {draft.run.Form.RequireLocation ? (
            <Button
              isDisabled={!editable || busy}
              onPress={() =>
                void action(async () => {
                  const permission = await Location.requestForegroundPermissionsAsync();
                  if (!permission.granted) throw new Error('denied');
                  const position = await Location.getCurrentPositionAsync({});
                  await update({ ...input, Latitude: position.coords.latitude, Longitude: position.coords.longitude });
                })
              }
            >
              <ButtonText>{t('checklists.labels.ReportedLocation')}</ButtonText>
            </Button>
          ) : null}
          {editable ? (
            <View style={{ gap: 8 }}>
              <Button isDisabled={busy} onPress={() => void action(() => useChecklistsStore.getState().queue(false))}>
                <ButtonText>{t('checklists.labels.SaveProgress')}</ButtonText>
              </Button>
              <Button isDisabled={busy} onPress={() => void action(() => useChecklistsStore.getState().queue(true))}>
                <ButtonText>{t('checklists.labels.SubmitRun')}</ButtonText>
              </Button>
            </View>
          ) : null}
          {draft.queued ? (
            <View style={{ gap: 8 }}>
              <Button isDisabled={busy} onPress={() => void action(() => useChecklistsStore.getState().retry(draft.id))}>
                <ButtonText>{t('checklists.ui.retry')}</ButtonText>
              </Button>
              <Button variant="outline" isDisabled={busy} onPress={() => void action(() => useChecklistsStore.getState().editLocal())}>
                <ButtonText>{t('checklists.ui.editLocal')}</ButtonText>
              </Button>
              <Button
                variant="outline"
                isDisabled={busy}
                onPress={() =>
                  Alert.alert(t('checklists.ui.useServer'), t('checklists.ui.replaceLocal'), [
                    { text: t('checklists.ui.close'), style: 'cancel' },
                    { text: t('checklists.ui.confirm'), onPress: () => void action(() => useChecklistsStore.getState().useServerVersion()) },
                  ])
                }
              >
                <ButtonText>{t('checklists.ui.useServer')}</ButtonText>
              </Button>
            </View>
          ) : null}
          {draft.run.State === 1 && draft.run.CreatedBy !== userId ? (
            <View>
              <Text>{t('checklists.labels.WitnessInstructions')}</Text>
              <TextInput accessibilityLabel={t('checklists.labels.Attestation')} className="rounded border border-outline-300 p-3 text-typography-900" value={attestation} onChangeText={setAttestation} />
              <Button
                isDisabled={busy || !attestation.trim()}
                onPress={() =>
                  void action(async () => {
                    await attestChecklistRun(draft.id, draft.run.SubmissionHash!, attestation);
                    await useChecklistsStore.getState().openServer(draft.id);
                  })
                }
              >
                <ButtonText>{t('checklists.labels.Attest')}</ButtonText>
              </Button>
            </View>
          ) : null}
          {draft.run.State > 0 ? (
            <Text>
              {t(`checklists.labels.${draft.run.State === 1 ? 'AwaitingWitness' : 'Submitted'}`)} · {t('checklists.labels.Score')}: {draft.run.Score ?? '—'}
            </Text>
          ) : null}
          <Button variant="outline" onPress={() => useChecklistsStore.getState().close()}>
            <ButtonText>{t('checklists.ui.close')}</ButtonText>
          </Button>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};
