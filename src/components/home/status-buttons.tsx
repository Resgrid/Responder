import React from 'react';
import { useTranslation } from 'react-i18next';

import { Loading } from '@/components/common/loading';
import { Button, ButtonText } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { invertColor } from '@/lib/utils';
import { type StatusesResultData } from '@/models/v4/statuses/statusesResultData';
import { useCoreStore } from '@/stores/app/core-store';
import { useHomeStore } from '@/stores/home/home-store';
import { usePersonnelStatusBottomSheetStore } from '@/stores/status/personnel-status-store';

const LEGACY_HIDDEN_STATUS_IDS = [4, 5, 6, 7];

export const StatusButtons: React.FC = () => {
  const { t } = useTranslation();
  const { isLoadingOptions } = useHomeStore();
  const { activeStatuses } = useCoreStore();
  const { setIsOpen } = usePersonnelStatusBottomSheetStore();

  const handleStatusPress = (statusData: StatusesResultData) => {
    // Open the bottom sheet with the selected status
    setIsOpen(true, statusData);
  };

  if (isLoadingOptions || activeStatuses === null) {
    return <Loading />;
  }

  // These IDs are legacy system-managed statuses that Resgrid sets internally.
  // They predate the newer Detail-based destination model and should stay hidden
  // from the Home tab buttons even though they may still be applied under the hood.
  const visibleStatuses = activeStatuses.filter((status) => !LEGACY_HIDDEN_STATUS_IDS.includes(status.Id));

  if (visibleStatuses.length === 0) {
    return (
      <VStack className="p-4">
        <Text className="text-center text-gray-500">{t('home.status.no_options_available')}</Text>
      </VStack>
    );
  }

  return (
    <VStack space="sm" className="p-4" testID="status-buttons">
      {visibleStatuses.map((status) => (
        <Button
          key={status.Id}
          variant="solid"
          className="w-full justify-center px-3 py-2"
          action="primary"
          size="lg"
          style={{
            backgroundColor: status.BColor,
          }}
          onPress={() => handleStatusPress(status)}
          testID={`status-button-${status.Id}`}
        >
          <ButtonText style={{ color: invertColor(status.BColor, true) }}>{status.Text}</ButtonText>
        </Button>
      ))}
    </VStack>
  );
};
