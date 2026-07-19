import React from 'react';

import { HeaderBackButton } from '@/components/common/header-back-button';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';

interface ScreenHeaderProps {
  title: string;
  onBack: () => void;
}

// Standard in-content header for detail screens living inside the (app) layout.
// The (app) layout owns the application top bar; a native Stack header here would
// replace that chrome, so detail screens render this row below it instead.
export const ScreenHeader: React.FC<ScreenHeaderProps> = ({ title, onBack }) => (
  <HStack className="items-center bg-white px-2 pb-2 pt-1 dark:bg-gray-900" space="sm">
    <HeaderBackButton onPress={onBack} />
    <Text className="flex-1 text-lg font-bold text-gray-900 dark:text-white" numberOfLines={1}>
      {title}
    </Text>
  </HStack>
);
