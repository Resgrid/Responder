import React from 'react';
import { Home, Settings, User } from 'lucide-react-native';

import { Box } from '@/components/ui/box';
import { SharedTabs, type TabItem } from '@/components/ui/shared-tabs';
import { Text } from '@/components/ui/text';

// Example usage of the refactored SharedTabs component
export const SharedTabsExample: React.FC = () => {
  const tabs: TabItem[] = [
    {
      key: 'home',
      title: 'tabs.home',
      icon: <Home size={16} className="text-current" />,
      content: (
        <Box className="flex-1 items-center justify-center p-4">
          <Text className="text-lg font-semibold">Home Content</Text>
          <Text className="mt-2 text-gray-600 dark:text-gray-300">This is the home tab content with proper Nativewind styling.</Text>
        </Box>
      ),
    },
    {
      key: 'profile',
      title: 'tabs.profile',
      icon: <User size={16} className="text-current" />,
      badge: 2,
      content: (
        <Box className="flex-1 items-center justify-center p-4">
          <Text className="text-lg font-semibold">Profile Content</Text>
          <Text className="mt-2 text-gray-600 dark:text-gray-300">Profile tab with a badge indicator.</Text>
        </Box>
      ),
    },
    {
      key: 'settings',
      title: 'tabs.settings',
      icon: <Settings size={16} className="text-current" />,
      content: (
        <Box className="flex-1 items-center justify-center p-4">
          <Text className="text-lg font-semibold">Settings Content</Text>
          <Text className="mt-2 text-gray-600 dark:text-gray-300">Settings tab demonstrating the refactored component.</Text>
        </Box>
      ),
    },
  ];

  return (
    <Box className="flex-1 bg-white dark:bg-gray-900">
      {/* Default variant */}
      <SharedTabs tabs={tabs} variant="default" className="flex-1" />
      
      {/* Pills variant example */}
      {/* <SharedTabs 
        tabs={tabs} 
        variant="pills"
        size="lg"
        className="flex-1 mt-4"
      /> */}
      
      {/* Segmented variant example */}
      {/* <SharedTabs 
        tabs={tabs} 
        variant="segmented"
        scrollable={false}
        className="flex-1 mt-4"
      /> */}
    </Box>
  );
};
