import { useColorScheme } from 'nativewind';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { type PerformCheckInInput } from '@/api/calls/check-in-timers';
import { shouldUseNamedCheckInTarget } from '@/components/check-in/check-in-target';
import { CustomBottomSheet } from '@/components/ui/bottom-sheet';
import { Box } from '@/components/ui/box';
import { Button, ButtonText } from '@/components/ui/button';
import { Heading } from '@/components/ui/heading';
import { HStack } from '@/components/ui/hstack';
import { Input, InputField } from '@/components/ui/input';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { useLocationStore } from '@/stores/app/location-store';

interface CheckInBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  callId: number;
  onSubmit: (input: PerformCheckInInput) => Promise<void>;
  isLoading: boolean;
  defaultCheckInType?: number;
  defaultUnitId?: number;
  targetName?: string;
}

interface CheckInTypeOption {
  value: number;
  labelKey: string;
}

const CHECK_IN_TYPES: CheckInTypeOption[] = [
  { value: 0, labelKey: 'check_in.type_personnel' },
  { value: 1, labelKey: 'check_in.type_unit' },
  { value: 2, labelKey: 'check_in.type_ic' },
  { value: 3, labelKey: 'check_in.type_par' },
  { value: 4, labelKey: 'check_in.type_hazmat' },
  { value: 5, labelKey: 'check_in.type_sector_rotation' },
  { value: 6, labelKey: 'check_in.type_rehab' },
];

const CARD_ONLY_CHECK_IN_TYPES = new Set([1, 2]);

export const CheckInBottomSheet: React.FC<CheckInBottomSheetProps> = ({ isOpen, onClose, callId, onSubmit, isLoading, defaultCheckInType = 0, defaultUnitId, targetName }) => {
  const { t } = useTranslation();
  const { colorScheme } = useColorScheme();
  const [selectedType, setSelectedType] = useState(defaultCheckInType);
  const [note, setNote] = useState('');
  const location = useLocationStore();
  const resolvedTargetName = targetName?.trim() ?? '';
  const isCardDrivenCheckIn = defaultUnitId !== undefined || resolvedTargetName.length > 0;
  const shouldShowTargetName = shouldUseNamedCheckInTarget(defaultCheckInType) && resolvedTargetName.length > 0;
  const titleText = shouldShowTargetName ? `${t('check_in.select_type')}: ${resolvedTargetName}` : t('check_in.select_type');
  const availableCheckInTypes = isCardDrivenCheckIn
    ? CHECK_IN_TYPES.filter((type) => !CARD_ONLY_CHECK_IN_TYPES.has(type.value) || type.value === defaultCheckInType)
    : CHECK_IN_TYPES.filter((type) => !CARD_ONLY_CHECK_IN_TYPES.has(type.value));

  const handleSubmit = useCallback(async () => {
    await onSubmit({
      CallId: callId,
      CheckInType: selectedType,
      UnitId: defaultUnitId,
      Latitude: location.latitude?.toString(),
      Longitude: location.longitude?.toString(),
      Note: note.trim() || undefined,
    });
    setNote('');
    onClose();
  }, [callId, selectedType, defaultUnitId, location, note, onSubmit, onClose]);

  const activeBg = colorScheme === 'dark' ? 'bg-primary-700' : 'bg-primary-100';
  const inactiveBg = colorScheme === 'dark' ? 'bg-neutral-800' : 'bg-gray-100';

  return (
    <CustomBottomSheet isOpen={isOpen} onClose={onClose} isLoading={isLoading} loadingText={t('check_in.confirm_check_in')} testID="check-in-bottom-sheet">
      <VStack space="lg" className="w-full">
        <Heading size="md">{titleText}</Heading>

        <VStack space="sm">
          {availableCheckInTypes.map((type) => (
            <Pressable key={type.value} onPress={() => setSelectedType(type.value)} className={`rounded-lg p-3 ${selectedType === type.value ? activeBg : inactiveBg}`}>
              <HStack className="items-center" space="sm">
                <Box className={`size-5 items-center justify-center rounded-full border-2 ${selectedType === type.value ? 'border-primary-500 bg-primary-500' : 'border-gray-400'}`}>
                  {selectedType === type.value ? <Box className="size-2 rounded-full bg-white" /> : null}
                </Box>
                <Text className={selectedType === type.value ? 'font-semibold' : ''}>{t(type.labelKey)}</Text>
              </HStack>
            </Pressable>
          ))}
        </VStack>

        <VStack space="xs">
          <Text className="text-sm text-gray-500">{t('check_in.add_note')}</Text>
          <Input variant="outline" size="md">
            <InputField placeholder={t('check_in.add_note')} value={note} onChangeText={setNote} multiline numberOfLines={2} />
          </Input>
        </VStack>

        {location.latitude != null && location.longitude != null ? (
          <Text className="text-xs text-gray-500">
            GPS: {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
          </Text>
        ) : null}

        <Button size="lg" onPress={handleSubmit} isDisabled={isLoading} testID="confirm-check-in-button">
          <ButtonText>{t('check_in.confirm_check_in')}</ButtonText>
        </Button>
      </VStack>
    </CustomBottomSheet>
  );
};
