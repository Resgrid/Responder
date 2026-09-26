import { Redirect, Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, ScrollView } from 'react-native';

import { OptionSelect } from '@/components/operations/option-select';
import { Button, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Input, InputField } from '@/components/ui/input';
import { Pressable } from '@/components/ui/pressable';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import { Text } from '@/components/ui/text';
import { Textarea, TextareaInput } from '@/components/ui/textarea';
import { VStack } from '@/components/ui/vstack';
import { capturePhoto, discardPhoto, PhotoPermissionError } from '@/lib/media/photo';
import { missingField, todayKey, type TransitionFields, transitionNeeds } from '@/lib/workOrders/status';
import { WorkOrderActivityType } from '@/models/v4/workOrders';
import { useWorkOrdersStatus } from '@/stores/feature-flags/store';
import { useWorkOrdersStore } from '@/stores/workOrders/store';

const blankFields: TransitionFields = { reason: '', resolution: '', cause: '', verification: '', duplicateOf: '', confirmTasks: false };

const hoursOf = (text: string) => {
  const value = Number(text.replace(',', '.'));
  return Number.isFinite(value) && value > 0 && value <= 24 ? Math.round(value * 100) / 100 : null;
};

// One work order: what it is about, where it stands, and what this person may do next. The server's
// Transitions and Can* flags drive every button; a stale revision reloads the order and says so.
export default function WorkOrderScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const flagStatus = useWorkOrdersStatus();
  const { detail, choices, images, busy, error } = useWorkOrdersStore();
  const [target, setTarget] = useState('');
  const [fields, setFields] = useState<TransitionFields>(blankFields);
  const [comment, setComment] = useState('');
  const [hours, setHours] = useState('');
  const [hoursNote, setHoursNote] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (flagStatus !== 'enabled' || !id) return undefined;
      void useWorkOrdersStore.getState().open(id);
      return () => useWorkOrdersStore.getState().close();
    }, [flagStatus, id])
  );

  const needs = useMemo(() => (detail && target ? transitionNeeds(detail, Number(target)) : null), [detail, target]);
  const nameOf = (list: { Id: string; Name: string }[] | undefined, value?: string | number | null) => (value == null ? null : (list?.find((item) => item.Id === String(value))?.Name ?? null));

  if (flagStatus === 'disabled') return <Redirect href="/(app)/home" />;

  const order = detail?.Order;
  const content = detail?.Input?.Content;
  const canAct = !!detail && detail.CanWrite;
  const canComment = canAct && (detail.CanContribute || detail.CanEdit || detail.CanManage || !!detail.ReportedBy);

  const move = async () => {
    if (!detail || !needs) return;
    const missing = missingField(needs, fields);
    if (missing) {
      setMessage(t(`workOrders.transition.missing.${missing}`));
      return;
    }
    setMessage(null);
    const ok = await useWorkOrdersStore.getState().transition({
      Status: Number(target),
      Reason: fields.reason.trim() || null,
      Resolution: fields.resolution.trim() || null,
      Cause: fields.cause.trim() || null,
      VerificationEvidence: fields.verification.trim() || null,
      DuplicateOfId: fields.duplicateOf.trim() || null,
      ConfirmTasksComplete: fields.confirmTasks,
    });
    if (ok) {
      setTarget('');
      setFields(blankFields);
    }
  };

  const attach = async (source: 'camera' | 'library') => {
    setMessage(null);
    try {
      const photo = await capturePhoto(source, `work-order-${order?.Number ?? 'photo'}.jpg`);
      if (!photo) return;
      const ok = await useWorkOrdersStore.getState().attach({ uri: photo.uri, name: photo.name, type: photo.contentType });
      await discardPhoto(photo);
      if (ok) setMessage(t('workOrders.photoAdded'));
    } catch (failure) {
      setMessage(failure instanceof PhotoPermissionError ? t('workOrders.errors.photo_denied') : t('workOrders.errors.retry'));
    }
  };

  const logHours = async () => {
    const value = hoursOf(hours);
    if (value == null) {
      setMessage(t('workOrders.hoursInvalid'));
      return;
    }
    if (await useWorkOrdersStore.getState().logHours(todayKey(), value, hoursNote.trim() || null)) {
      setHours('');
      setHoursNote('');
    }
  };

  return (
    <VStack className="flex-1 bg-background-0">
      <Stack.Screen options={{ title: order?.Number ?? t('workOrders.title') }} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} keyboardShouldPersistTaps="handled">
        <HStack space="sm" className="items-center">
          <Pressable onPress={() => router.back()} testID="work-order-back" accessibilityRole="button" accessibilityLabel={t('workOrders.back')}>
            <ArrowLeft size={22} color="#2563eb" />
          </Pressable>
          <Text className="flex-1 text-xl font-bold">{order?.Title ?? t('workOrders.title')}</Text>
        </HStack>
        {busy && !detail ? <Spinner /> : null}
        {error ? (
          <Text accessibilityRole="alert" className="text-error-600">
            {t(`workOrders.errors.${error}`, { defaultValue: t('workOrders.errors.retry') })}
          </Text>
        ) : null}
        {message ? <Text className="text-typography-500">{message}</Text> : null}
        {detail && order ? (
          <>
            <VStack space="xs">
              <Text className="text-typography-500">
                {order.Number} · {t(`workOrders.status.${order.Status}`)} · {t(`workOrders.priority.${order.Priority}`)}
              </Text>
              <Text className="text-typography-500">{t(`workOrders.type.${detail.Input.Type}`)}</Text>
              {nameOf(choices?.Units, order.UnitId) ? <Text>{t('workOrders.unitIs', { name: nameOf(choices?.Units, order.UnitId) })}</Text> : null}
              {nameOf(choices?.Groups, order.GroupId) ? <Text>{t('workOrders.groupIs', { name: nameOf(choices?.Groups, order.GroupId) })}</Text> : null}
              {nameOf(choices?.Assets, order.AssetId) ? <Text>{t('workOrders.assetIs', { name: nameOf(choices?.Assets, order.AssetId) })}</Text> : null}
              {content?.LocationText ? <Text>{t('workOrders.locationIs', { location: content.LocationText })}</Text> : null}
              {order.DueOn ? <Text className="text-typography-500">{t('workOrders.due', { date: String(order.DueOn).slice(0, 10) })}</Text> : null}
              {content?.SafetyCritical || content?.HazardousWork ? <Text className="text-error-600">{t('workOrders.safety')}</Text> : null}
            </VStack>
            {content?.Description ? <Text>{content.Description}</Text> : null}
            {(content?.Steps ?? []).length > 0 ? (
              <VStack space="xs">
                <Text className="font-semibold">{t('workOrders.steps')}</Text>
                {content?.Steps.map((step, index) => (
                  <Text key={`${index}-${step.Text}`}>
                    {step.Completed ? '☑' : '☐'} {step.Text}
                  </Text>
                ))}
              </VStack>
            ) : null}
            {content?.Resolution ? <Text>{t('workOrders.resolutionIs', { text: content.Resolution })}</Text> : null}

            {canAct && detail.CanAccept ? (
              <Button action="positive" onPress={() => void useWorkOrdersStore.getState().accept()} isDisabled={busy} testID="work-order-accept">
                <ButtonText>{t('workOrders.accept')}</ButtonText>
              </Button>
            ) : null}

            {canAct && detail.Transitions.length > 0 ? (
              <VStack space="sm" className="rounded-lg border border-outline-200 p-3" testID="work-order-transition">
                <Text className="font-semibold">{t('workOrders.transition.title')}</Text>
                <OptionSelect
                  value={target}
                  options={detail.Transitions.map((status) => ({ value: String(status), label: t(`workOrders.status.${status}`) }))}
                  placeholder={t('workOrders.transition.pick')}
                  onChange={(value) => {
                    setTarget(value);
                    setMessage(null);
                  }}
                  testID="work-order-transition-status"
                />
                {needs?.reason ? (
                  <Input>
                    <InputField value={fields.reason} onChangeText={(reason) => setFields({ ...fields, reason })} placeholder={t('workOrders.transition.reason')} maxLength={4000} testID="work-order-reason" />
                  </Input>
                ) : null}
                {needs?.resolution ? (
                  <Textarea>
                    <TextareaInput value={fields.resolution} onChangeText={(resolution) => setFields({ ...fields, resolution })} placeholder={t('workOrders.transition.resolution')} testID="work-order-resolution" />
                  </Textarea>
                ) : null}
                {needs?.cause ? (
                  <Input>
                    <InputField value={fields.cause} onChangeText={(cause) => setFields({ ...fields, cause })} placeholder={t('workOrders.transition.cause')} testID="work-order-cause" />
                  </Input>
                ) : null}
                {needs?.verification ? (
                  <Input>
                    <InputField
                      value={fields.verification}
                      onChangeText={(verification) => setFields({ ...fields, verification })}
                      placeholder={t('workOrders.transition.verification')}
                      testID="work-order-verification"
                    />
                  </Input>
                ) : null}
                {needs?.duplicateOf ? (
                  <Input>
                    <InputField value={fields.duplicateOf} onChangeText={(duplicateOf) => setFields({ ...fields, duplicateOf })} placeholder={t('workOrders.transition.duplicateOf')} testID="work-order-duplicate" />
                  </Input>
                ) : null}
                {needs?.confirmTasks ? (
                  <HStack className="items-center justify-between">
                    <Text className="flex-1">{t('workOrders.transition.confirmTasks')}</Text>
                    <Switch value={fields.confirmTasks} onValueChange={(confirmTasks) => setFields({ ...fields, confirmTasks })} testID="work-order-confirm-tasks" />
                  </HStack>
                ) : null}
                <Button onPress={() => void move()} isDisabled={busy || !target} testID="work-order-move">
                  <ButtonText>{t('workOrders.transition.apply')}</ButtonText>
                </Button>
              </VStack>
            ) : null}

            {canAct && detail.CanContribute ? (
              <VStack space="sm" className="rounded-lg border border-outline-200 p-3" testID="work-order-labor">
                <Text className="font-semibold">{t('workOrders.logHours')}</Text>
                <HStack space="sm">
                  <Input className="w-24">
                    <InputField value={hours} onChangeText={setHours} keyboardType="decimal-pad" placeholder={t('workOrders.hours')} testID="work-order-hours" />
                  </Input>
                  <Input className="flex-1">
                    <InputField value={hoursNote} onChangeText={setHoursNote} placeholder={t('workOrders.hoursNote')} maxLength={4000} testID="work-order-hours-note" />
                  </Input>
                </HStack>
                <Button variant="outline" onPress={() => void logHours()} isDisabled={busy || !hours.trim()} testID="work-order-hours-save">
                  <ButtonText>{t('workOrders.saveHours')}</ButtonText>
                </Button>
                {detail.Labor.length > 0 ? <Text className="text-typography-500">{t('workOrders.hoursLogged', { hours: detail.Labor.reduce((sum, entry) => sum + (entry.Content?.Hours ?? 0), 0) })}</Text> : null}
              </VStack>
            ) : null}

            {canComment ? (
              <VStack space="sm">
                <Textarea>
                  <TextareaInput value={comment} onChangeText={setComment} placeholder={t('workOrders.commentHint')} maxLength={10000} testID="work-order-comment" />
                </Textarea>
                <Button
                  variant="outline"
                  onPress={async () => {
                    if (await useWorkOrdersStore.getState().comment(comment)) setComment('');
                  }}
                  isDisabled={busy || !comment.trim()}
                  testID="work-order-comment-save"
                >
                  <ButtonText>{t('workOrders.addComment')}</ButtonText>
                </Button>
                <HStack space="sm">
                  <Button variant="outline" size="sm" onPress={() => void attach('camera')} isDisabled={busy} testID="work-order-camera">
                    <ButtonText>{t('workOrders.takePhoto')}</ButtonText>
                  </Button>
                  <Button variant="outline" size="sm" onPress={() => void attach('library')} isDisabled={busy} testID="work-order-library">
                    <ButtonText>{t('workOrders.choosePhoto')}</ButtonText>
                  </Button>
                </HStack>
              </VStack>
            ) : null}

            {detail.Files.filter((file) => !file.WithdrawnOn).length > 0 ? (
              <VStack space="xs">
                <Text className="font-semibold">{t('workOrders.files')}</Text>
                {detail.Files.filter((file) => !file.WithdrawnOn).map((file) => (
                  <VStack key={file.Id} space="xs">
                    {file.ContentType.startsWith('image/') ? (
                      images[file.Id] ? (
                        <Image source={{ uri: images[file.Id] }} style={{ width: '100%', height: 220, borderRadius: 8 }} resizeMode="contain" accessibilityLabel={file.Name} />
                      ) : (
                        <Button variant="link" size="sm" onPress={() => void useWorkOrdersStore.getState().viewImage(file.Id)} testID={`work-order-file-${file.Id}`}>
                          <ButtonText>{t('workOrders.viewPhoto', { name: file.Name })}</ButtonText>
                        </Button>
                      )
                    ) : (
                      <Text className="text-typography-500">{file.Name}</Text>
                    )}
                  </VStack>
                ))}
              </VStack>
            ) : null}

            {detail.Activities.length > 0 ? (
              <VStack space="xs">
                <Text className="font-semibold">{t('workOrders.activity')}</Text>
                {[...detail.Activities]
                  .sort((a, b) => b.CreatedOn.localeCompare(a.CreatedOn))
                  .map((activity) => (
                    <VStack key={activity.Id} className="border-b border-outline-100 pb-1">
                      <Text className="text-typography-500">
                        {String(activity.CreatedOn).slice(0, 16).replace('T', ' ')} · {t(`workOrders.activityType.${activity.Type}`)}
                        {activity.Type === WorkOrderActivityType.StatusChanged && activity.NewStatus != null ? ` → ${t(`workOrders.status.${activity.NewStatus}`)}` : ''}
                      </Text>
                      {activity.Note ? <Text>{activity.Note}</Text> : null}
                    </VStack>
                  ))}
              </VStack>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </VStack>
  );
}
