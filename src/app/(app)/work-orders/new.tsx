import { type Href, Redirect, Stack, useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView } from 'react-native';

import { OptionSelect } from '@/components/operations/option-select';
import { Button, ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Input, InputField } from '@/components/ui/input';
import { Pressable } from '@/components/ui/pressable';
import { Switch } from '@/components/ui/switch';
import { Text } from '@/components/ui/text';
import { Textarea, TextareaInput } from '@/components/ui/textarea';
import { VStack } from '@/components/ui/vstack';
import { WorkOrderPriority, WorkOrderType } from '@/models/v4/workOrders';
import { useWorkOrdersStatus } from '@/stores/feature-flags/store';
import { useWorkOrdersStore } from '@/stores/workOrders/store';

const NONE = '';

// Report a problem: a new work order starts Requested and goes to the target's managers. The person picks
// what it is about (an apparatus, a station, a piece of equipment, or just a location) and can attach photos
// from the order once it exists.
export default function ReportWorkOrderScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const flagStatus = useWorkOrdersStatus();
  const { choices, canWrite, busy, error } = useWorkOrdersStore();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [type, setType] = useState(String(WorkOrderType.Corrective));
  const [priority, setPriority] = useState(String(WorkOrderPriority.Normal));
  const [unitId, setUnitId] = useState(NONE);
  const [groupId, setGroupId] = useState(NONE);
  const [assetId, setAssetId] = useState(NONE);
  const [safetyCritical, setSafetyCritical] = useState(false);

  useEffect(() => {
    if (flagStatus === 'enabled' && !useWorkOrdersStore.getState().choices) void useWorkOrdersStore.getState().load();
  }, [flagStatus]);

  if (flagStatus === 'disabled') return <Redirect href="/(app)/home" />;

  const option = (value: string | number, label: string) => ({ value: String(value), label });
  const none = option(NONE, t('workOrders.form.none'));
  const typeOptions = Object.values(WorkOrderType).map((value) => option(value, t(`workOrders.type.${value}`)));
  const priorityOptions = Object.values(WorkOrderPriority).map((value) => option(value, t(`workOrders.priority.${value}`)));

  const submit = async () => {
    const id = await useWorkOrdersStore.getState().report({
      title,
      description,
      location,
      type: Number(type),
      priority: Number(priority),
      unitId: unitId ? Number(unitId) : null,
      groupId: groupId ? Number(groupId) : null,
      assetId: assetId || null,
      safetyCritical,
    });
    if (id) router.replace(`/work-orders/${id}` as Href);
  };

  return (
    <VStack className="flex-1 bg-background-0">
      <Stack.Screen options={{ title: t('workOrders.report') }} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} keyboardShouldPersistTaps="handled">
        <HStack space="sm" className="items-center">
          <Pressable onPress={() => router.back()} testID="work-order-new-back" accessibilityRole="button" accessibilityLabel={t('workOrders.back')}>
            <ArrowLeft size={22} color="#2563eb" />
          </Pressable>
          <Text className="flex-1 text-xl font-bold">{t('workOrders.report')}</Text>
        </HStack>
        {!canWrite && choices ? <Text className="text-typography-500">{t('workOrders.cannotReport')}</Text> : null}
        <Text className="font-semibold">{t('workOrders.form.title')}</Text>
        <Input>
          <InputField value={title} onChangeText={setTitle} maxLength={200} placeholder={t('workOrders.form.titleHint')} testID="work-order-title" />
        </Input>
        <Text className="font-semibold">{t('workOrders.form.description')}</Text>
        <Textarea>
          <TextareaInput value={description} onChangeText={setDescription} maxLength={20000} placeholder={t('workOrders.form.descriptionHint')} testID="work-order-description" />
        </Textarea>
        <Text className="font-semibold">{t('workOrders.form.type')}</Text>
        <OptionSelect value={type} options={typeOptions} placeholder={t('workOrders.form.type')} onChange={setType} testID="work-order-type" />
        <Text className="font-semibold">{t('workOrders.form.priority')}</Text>
        <OptionSelect value={priority} options={priorityOptions} placeholder={t('workOrders.form.priority')} onChange={setPriority} testID="work-order-priority" />
        <Text className="font-semibold">{t('workOrders.form.unit')}</Text>
        <OptionSelect value={unitId} options={[none, ...(choices?.Units ?? []).map((unit) => option(unit.Id, unit.Name))]} placeholder={t('workOrders.form.none')} onChange={setUnitId} testID="work-order-unit" />
        <Text className="font-semibold">{t('workOrders.form.group')}</Text>
        <OptionSelect value={groupId} options={[none, ...(choices?.Groups ?? []).map((group) => option(group.Id, group.Name))]} placeholder={t('workOrders.form.none')} onChange={setGroupId} testID="work-order-group" />
        {(choices?.Assets ?? []).length > 0 ? (
          <>
            <Text className="font-semibold">{t('workOrders.form.asset')}</Text>
            <OptionSelect
              value={assetId}
              options={[none, ...(choices?.Assets ?? []).map((asset) => option(asset.Id, asset.Name))]}
              placeholder={t('workOrders.form.none')}
              onChange={setAssetId}
              testID="work-order-asset"
            />
          </>
        ) : null}
        <Text className="font-semibold">{t('workOrders.form.location')}</Text>
        <Input>
          <InputField value={location} onChangeText={setLocation} maxLength={1000} placeholder={t('workOrders.form.locationHint')} testID="work-order-location" />
        </Input>
        <HStack className="items-center justify-between">
          <Text className="flex-1">{t('workOrders.form.safetyCritical')}</Text>
          <Switch value={safetyCritical} onValueChange={setSafetyCritical} testID="work-order-safety" />
        </HStack>
        {error ? (
          <Text accessibilityRole="alert" className="text-error-600">
            {t(`workOrders.errors.${error}`, { defaultValue: t('workOrders.errors.retry') })}
          </Text>
        ) : null}
        <Button onPress={() => void submit()} isDisabled={busy || !canWrite || !title.trim()} testID="work-order-submit">
          <ButtonText>{t('workOrders.form.submit')}</ButtonText>
        </Button>
        <Text className="text-typography-500">{t('workOrders.form.photosAfter')}</Text>
      </ScrollView>
    </VStack>
  );
}
