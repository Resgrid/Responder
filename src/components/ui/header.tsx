import { Menu } from 'lucide-react-native';
import React from 'react';
import { useWindowDimensions } from 'react-native';

import { HStack } from '@/components/ui/hstack';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';

interface HeaderProps {
  title: string;
  onMenuPress?: () => void;
  rightComponent?: React.ReactNode;
  testID?: string;
}

export const Header: React.FC<HeaderProps> = ({ title, onMenuPress, rightComponent, testID }) => {
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  return (
    <View className="border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-900" testID={testID}>
      <HStack className="items-center justify-between">
        <HStack className="items-center" space="md">
          {!isLandscape && onMenuPress && (
            <Pressable className="p-2" onPress={onMenuPress} testID={`${testID}-menu-button`}>
              <Menu size={24} className="text-gray-700 dark:text-gray-300" />
            </Pressable>
          )}
          <Text className="text-lg font-semibold text-gray-900 dark:text-white" testID={`${testID}-title`}>
            {title}
          </Text>
        </HStack>
        {rightComponent && <View testID={`${testID}-right-component`}>{rightComponent}</View>}
      </HStack>
    </View>
  );
};
