import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView } from 'react-native';

import { DepartmentStats } from '@/components/home/department-stats';
import { StaffingButtons } from '@/components/home/staffing-buttons';
import { StatusButtons } from '@/components/home/status-buttons';
import { UserStaffingCard } from '@/components/home/user-staffing-card';
import { UserStatusCard } from '@/components/home/user-status-card';
import { FocusAwareStatusBar } from '@/components/ui/focus-aware-status-bar';
import { HStack } from '@/components/ui/hstack';
import { SharedTabs, type TabItem } from '@/components/ui/shared-tabs';
import { VStack } from '@/components/ui/vstack';
import { useHomeStore } from '@/stores/home/home-store';

export default function HomeDashboard() {
  const { t } = useTranslation();
  const { refreshAll } = useHomeStore();

  // Initialize data when component mounts
  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  const tabs: TabItem[] = [
    {
      key: 'status',
      title: t('home.tabs.status'),
      content: <StatusButtons />,
    },
    {
      key: 'staffing',
      title: t('home.tabs.staffing'),
      content: <StaffingButtons />,
    },
  ];

  return (
    <VStack className="size-full flex-1" testID="home-dashboard-container">
      <FocusAwareStatusBar />

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Department Statistics */}
        {/*<DepartmentStats />*/}

        {/* User Status and Staffing Cards */}
        <HStack space="md" className="p-4">
          <VStack className="flex-1">
            <UserStatusCard />
          </VStack>
          <VStack className="flex-1">
            <UserStaffingCard />
          </VStack>
        </HStack>

        {/* Status/Staffing Tabs */}
        <VStack className="flex-1 px-4 pb-4">
          <SharedTabs tabs={tabs} variant="segmented" size="md" scrollable={false} />
        </VStack>
      </ScrollView>
    </VStack>
  );
}
