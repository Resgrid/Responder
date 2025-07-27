import React from 'react';
import { useTranslation } from 'react-i18next';

import { Loading } from '@/components/common/loading';
import { Button, ButtonText } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { invertColor } from '@/lib/utils';
import { useCoreStore } from '@/stores/app/core-store';
import { useHomeStore } from '@/stores/home/home-store';
import { useStaffingBottomSheetStore } from '@/stores/staffing/staffing-bottom-sheet-store';

export const StaffingButtons: React.FC = () => {
  const { t } = useTranslation();
  const { isLoadingOptions } = useHomeStore();
  const { activeStaffing } = useCoreStore();
  const { setIsOpen } = useStaffingBottomSheetStore();

  const handleStaffingPress = (staffing: any) => {
    setIsOpen(true, staffing);
  };

  if (isLoadingOptions) {
    return <Loading />;
  }

  if (activeStaffing?.length === 0) {
    return (
      <VStack className="p-4">
        <Text className="text-center text-gray-500">{t('home.staffing.no_options_available')}</Text>
      </VStack>
    );
  }

  return (
    <VStack space="sm" className="p-4" testID="staffing-buttons">
      {activeStaffing?.map((staffing) => (
        <Button
          key={staffing.Id}
          variant="solid"
          className="w-full justify-center px-3 py-2"
          action="primary"
          size="lg"
          style={{
            backgroundColor: staffing.BColor,
          }}
          onPress={() => handleStaffingPress(staffing)}
          testID={`staffing-button-${staffing.Id}`}
        >
          <ButtonText style={{ color: invertColor(staffing.BColor, true) }}>{staffing.Text}</ButtonText>
        </Button>
      ))}
    </VStack>
  );
};
