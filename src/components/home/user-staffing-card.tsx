import { UserCheck } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { Box } from '@/components/ui/box';
import { Card } from '@/components/ui/card';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { useHomeStore } from '@/stores/home/home-store';

export const UserStaffingCard: React.FC = () => {
  const { t } = useTranslation();
  const { currentUser, isLoadingUser } = useHomeStore();

  if (isLoadingUser) {
    return (
      <Card className="bg-background-50 p-4" testID="user-staffing-card">
        <Box className="h-16 animate-pulse rounded bg-gray-200" />
      </Card>
    );
  }

  const displayStaffing = currentUser?.Staffing || t('home.user.staffing_unknown');
  let displayColor = currentUser?.StaffingColor || '#6B7280'; // Default gray

  // Fix up the color values to match the design system
  if (displayColor === 'label-danger') {
    displayColor = '#EF4444';
  } else if (displayColor === 'label-info') {
    displayColor = '#3B82F6';
  } else if (displayColor === 'label-warning') {
    displayColor = '#F59E0B';
  } else if (displayColor === 'label-success') {
    displayColor = '#10B981';
  } else if (displayColor === 'label-onscene') {
    displayColor = '#10B981';
  } else if (displayColor === 'label-primary') {
    displayColor = '#3B82F6';
  } else if (displayColor === 'label-returning') {
    displayColor = '#6B7280';
  } else if (displayColor === 'label-default') {
    displayColor = '#374151';
  } else if (displayColor === 'label-enroute') {
    displayColor = '#10B981';
  }

  return (
    <Card className="bg-background-50 p-2" style={{ borderLeftWidth: 4, borderLeftColor: displayColor }} testID="user-staffing-card">
      <VStack space="xs">
        <HStack className="items-center justify-between">
          <HStack className="items-center" space="sm">
            <Box className="rounded-lg bg-gray-500 p-2">
              <UserCheck size={16} color="white" />
            </Box>
            <Text className="text-sm font-medium text-gray-600">{t('home.user.my_staffing')}</Text>
          </HStack>
        </HStack>
        <Text className="text-lg font-bold" style={{ color: displayColor }} testID="user-staffing-text">
          {displayStaffing}
        </Text>
        {currentUser?.StaffingTimestamp && (
          <Text className="text-xs text-gray-500">
            {t('home.user.updated')}: {new Date(currentUser.StaffingTimestamp).toLocaleTimeString()}
          </Text>
        )}
      </VStack>
    </Card>
  );
};
