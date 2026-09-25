import { CheckSquare, Circle, CircleDot, Square } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import React, { useCallback } from 'react';

import { HStack } from '@/components/ui/hstack';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';

interface ShiftSelectRowProps {
  id: string;
  title: string;
  subtitle?: string;
  trailing?: string;
  selected: boolean;
  /** `radio` for a single choice, `checkbox` for several. */
  mode: 'radio' | 'checkbox';
  disabled?: boolean;
  onToggle: (id: string) => void;
  testID?: string;
}

const ShiftSelectRowComponent: React.FC<ShiftSelectRowProps> = ({ id, title, subtitle, trailing, selected, mode, disabled = false, onToggle, testID }) => {
  const { colorScheme } = useColorScheme();
  const iconColor = selected ? '#2563eb' : colorScheme === 'dark' ? '#9ca3af' : '#6b7280';

  const handlePress = useCallback(() => {
    onToggle(id);
  }, [id, onToggle]);

  const icon =
    mode === 'radio' ? selected ? <CircleDot size={20} color={iconColor} /> : <Circle size={20} color={iconColor} /> : selected ? <CheckSquare size={20} color={iconColor} /> : <Square size={20} color={iconColor} />;

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      accessibilityRole={mode}
      accessibilityState={mode === 'radio' ? { selected, disabled } : { checked: selected, disabled }}
      accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
      testID={testID}
      className={`rounded-lg border px-3 py-3 ${selected ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30' : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'} ${disabled ? 'opacity-50' : ''}`}
    >
      <HStack space="sm" className="items-center">
        {icon}
        <VStack className="flex-1">
          <Text className="text-sm font-medium text-gray-900 dark:text-white">{title}</Text>
          {subtitle ? <Text className="text-xs text-gray-600 dark:text-gray-400">{subtitle}</Text> : null}
        </VStack>
        {trailing ? <Text className="text-xs font-medium text-gray-700 dark:text-gray-300">{trailing}</Text> : null}
      </HStack>
    </Pressable>
  );
};

export const ShiftSelectRow = React.memo(ShiftSelectRowComponent);
