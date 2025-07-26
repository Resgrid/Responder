import { Activity, Phone, Users } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { Box } from '@/components/ui/box';
import { Card } from '@/components/ui/card';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { useHomeStore } from '@/stores/home/home-store';

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  testID?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, testID }) => {
  return (
    <Card className="flex-1 bg-background-50 p-4" testID={testID}>
      <VStack space="xs">
        <HStack className="items-center justify-between">
          <Box className="rounded-lg bg-primary-500 p-2">{icon}</Box>
          <Text className="text-2xl font-bold text-primary-600">{value}</Text>
        </HStack>
        <Text className="text-sm font-medium text-gray-600">{title}</Text>
      </VStack>
    </Card>
  );
};

export const DepartmentStats: React.FC = () => {
  const { t } = useTranslation();
  const { departmentStats, isLoadingStats } = useHomeStore();

  if (isLoadingStats) {
    return (
      <HStack space="md" className="p-4" testID="department-stats">
        <Card className="flex-1 bg-background-50 p-4">
          <Box className="h-16 animate-pulse rounded bg-gray-200" />
        </Card>
        <Card className="flex-1 bg-background-50 p-4">
          <Box className="h-16 animate-pulse rounded bg-gray-200" />
        </Card>
        <Card className="flex-1 bg-background-50 p-4">
          <Box className="h-16 animate-pulse rounded bg-gray-200" />
        </Card>
      </HStack>
    );
  }

  return (
    <HStack space="md" className="p-4" testID="department-stats">
      <StatCard title={t('home.stats.open_calls')} value={departmentStats.openCalls} icon={<Phone size={20} color="white" />} testID="open-calls-stat" />
      <StatCard title={t('home.stats.personnel_in_service')} value={departmentStats.personnelInService} icon={<Users size={20} color="white" />} testID="personnel-in-service-stat" />
      <StatCard title={t('home.stats.units_in_service')} value={departmentStats.unitsInService} icon={<Activity size={20} color="white" />} testID="units-in-service-stat" />
    </HStack>
  );
};
