import React from 'react';
import { useTranslation } from 'react-i18next';

import { Loading } from '@/components/common/loading';
import { Button, ButtonText } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { invertColor } from '@/lib/utils';
import { useCoreStore } from '@/stores/app/core-store';
import { useHomeStore } from '@/stores/home/home-store';
import { usePersonnelStatusBottomSheetStore } from '@/stores/status/personnel-status-store';

export const StatusButtons: React.FC = () => {
  const { t } = useTranslation();
  const { isLoadingOptions, availableStatuses } = useHomeStore();
  const { setIsOpen } = usePersonnelStatusBottomSheetStore();

  const handleStatusPress = (statusId: number, statusData: any) => {
    // Open the bottom sheet with the selected status
    setIsOpen(true, statusData);
  };

  if (isLoadingOptions) {
    return <Loading />;
  }

  if (availableStatuses?.length === 0) {
    return (
      <VStack className="p-4">
        <Text className="text-center text-gray-500">{t('home.status.no_options_available')}</Text>
      </VStack>
    );
  }

  return (
    <VStack space="sm" className="p-4" testID="status-buttons">
      {availableStatuses
        ?.filter((status) => ![4, 5, 6, 7].includes(status.Id))
        .map((status) => (
          <Button
            key={status.Id}
            variant="solid"
            className="w-full justify-center px-3 py-2"
            action="primary"
            size="lg"
            style={{ backgroundColor: status.Color }}
            onPress={() => handleStatusPress(status.Id, status)}
            testID={`status-button-${status.Id}`}
          >
            <ButtonText style={{ color: invertColor(status.Color, true) }}>{status.Text}</ButtonText>
          </Button>
        ))}
    </VStack>
  );
};
