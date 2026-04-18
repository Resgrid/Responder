import { useColorScheme } from 'nativewind';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { type CheckInRecordResultData } from '@/models/v4/checkIn/checkInRecordResultData';

interface CheckInHistoryListProps {
  history: CheckInRecordResultData[];
  isLoading: boolean;
}

const HistoryItem: React.FC<{ item: CheckInRecordResultData }> = React.memo(({ item }) => {
  const { colorScheme } = useColorScheme();
  const bgColor = colorScheme === 'dark' ? 'bg-neutral-800' : 'bg-gray-50';

  return (
    <Box className={`mb-2 rounded-lg p-3 ${bgColor}`}>
      <HStack className="items-start justify-between">
        <VStack className="flex-1">
          <Text className="font-medium">{item.CheckInTypeName}</Text>
          {item.Note ? <Text className="text-sm text-gray-500">{item.Note}</Text> : null}
        </VStack>
        <Text className="text-xs text-gray-500">{new Date(item.Timestamp).toLocaleString()}</Text>
      </HStack>
    </Box>
  );
});

HistoryItem.displayName = 'HistoryItem';

export const CheckInHistoryList: React.FC<CheckInHistoryListProps> = React.memo(({ history, isLoading }) => {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <Box className="items-center py-4">
        <Text className="text-sm text-gray-500">{t('common.loading')}</Text>
      </Box>
    );
  }

  if (history.length === 0) {
    return (
      <Box className="items-center py-4">
        <Text className="text-sm text-gray-500">{t('check_in.no_timers')}</Text>
      </Box>
    );
  }

  return (
    <VStack testID="check-in-history-list">
      {history.map((item) => (
        <HistoryItem key={item.CheckInRecordId} item={item} />
      ))}
    </VStack>
  );
});

CheckInHistoryList.displayName = 'CheckInHistoryList';
