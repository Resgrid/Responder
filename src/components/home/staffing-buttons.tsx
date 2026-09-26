import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { type AccessibilityActionEvent } from 'react-native';

import { Loading } from '@/components/common/loading';
import { Button, ButtonSpinner, ButtonText } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { isNoteRequiredForStatus } from '@/lib/status-destinations';
import { invertColor } from '@/lib/utils';
import { type StatusesResultData } from '@/models/v4/statuses/statusesResultData';
import { useCoreStore } from '@/stores/app/core-store';
import { useHomeStore } from '@/stores/home/home-store';
import { useStaffingBottomSheetStore } from '@/stores/staffing/staffing-bottom-sheet-store';

interface StaffingButtonProps {
  staffing: StatusesResultData;
  isSubmitting: boolean;
  isDisabled: boolean;
  onQuickSet: (staffing: StatusesResultData) => void;
  onOpenSheet: (staffing: StatusesResultData) => void;
}

const StaffingButton: React.FC<StaffingButtonProps> = React.memo(({ staffing, isSubmitting, isDisabled, onQuickSet, onOpenSheet }) => {
  const { t } = useTranslation();
  const noteRequired = isNoteRequiredForStatus(staffing);
  const textColor = invertColor(staffing.BColor, true);

  // A level that needs a note still goes through the sheet; everything else is one tap, with a
  // long press as the way to attach a note anyway.
  const handlePress = useCallback(() => {
    if (noteRequired) {
      onOpenSheet(staffing);
    } else {
      onQuickSet(staffing);
    }
  }, [noteRequired, onOpenSheet, onQuickSet, staffing]);

  const handleLongPress = useCallback(() => onOpenSheet(staffing), [onOpenSheet, staffing]);

  const handleAccessibilityAction = useCallback(
    (event: AccessibilityActionEvent) => {
      if (event.nativeEvent.actionName === 'longpress') {
        onOpenSheet(staffing);
      } else if (event.nativeEvent.actionName === 'activate') {
        handlePress();
      }
    },
    [handlePress, onOpenSheet, staffing]
  );

  return (
    <Button
      variant="solid"
      className="w-full justify-center px-3 py-2"
      action="primary"
      size="lg"
      style={{ backgroundColor: staffing.BColor }}
      onPress={handlePress}
      onLongPress={noteRequired ? undefined : handleLongPress}
      isDisabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={staffing.Text}
      accessibilityHint={noteRequired ? t('home.staffing.note_required_hint') : t('home.staffing.quick_set_hint')}
      accessibilityState={{ disabled: isDisabled, busy: isSubmitting }}
      accessibilityActions={noteRequired ? [{ name: 'activate' }] : [{ name: 'activate' }, { name: 'longpress', label: t('home.staffing.add_note_action') }]}
      onAccessibilityAction={handleAccessibilityAction}
      testID={`staffing-button-${staffing.Id}`}
    >
      {isSubmitting ? <ButtonSpinner color={textColor} testID={`staffing-button-spinner-${staffing.Id}`} /> : null}
      <ButtonText style={{ color: textColor }}>{staffing.Text}</ButtonText>
    </Button>
  );
});

StaffingButton.displayName = 'StaffingButton';

export const StaffingButtons: React.FC = () => {
  const { t } = useTranslation();
  const { isLoadingOptions } = useHomeStore();
  const { activeStaffing } = useCoreStore();
  const setIsOpen = useStaffingBottomSheetStore((state) => state.setIsOpen);
  const quickSubmitStaffing = useStaffingBottomSheetStore((state) => state.quickSubmitStaffing);
  const quickSubmittingId = useStaffingBottomSheetStore((state) => state.quickSubmittingId);

  const handleQuickSet = useCallback(
    (staffing: StatusesResultData) => {
      void quickSubmitStaffing(staffing);
    },
    [quickSubmitStaffing]
  );

  const handleOpenSheet = useCallback(
    (staffing: StatusesResultData) => {
      setIsOpen(true, staffing);
    },
    [setIsOpen]
  );

  if (isLoadingOptions || activeStaffing === null) {
    return <Loading />;
  }

  if (activeStaffing.length === 0) {
    return (
      <VStack className="p-4">
        <Text className="text-center text-gray-500">{t('home.staffing.no_options_available')}</Text>
      </VStack>
    );
  }

  return (
    <VStack space="sm" className="p-4" testID="staffing-buttons">
      {activeStaffing.map((staffing) => (
        <StaffingButton key={staffing.Id} staffing={staffing} isSubmitting={quickSubmittingId === staffing.Id} isDisabled={quickSubmittingId !== null} onQuickSet={handleQuickSet} onOpenSheet={handleOpenSheet} />
      ))}
    </VStack>
  );
};
