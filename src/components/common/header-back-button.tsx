import { ArrowLeftIcon } from 'lucide-react-native';
import React from 'react';
import { StyleSheet } from 'react-native';

import { Pressable } from '@/components/ui/';

interface HeaderBackButtonProps {
  onPress: () => void;
}

// Fixed 40x40 size: iOS 26 liquid glass headers stretch flexible-width header
// subviews across the screen (react-native-screens 4.16), so the button must
// have an intrinsic width.
export const HeaderBackButton: React.FC<HeaderBackButtonProps> = ({ onPress }) => (
  <Pressable onPress={onPress} testID="back-button" className="size-10 items-center justify-center rounded" style={styles.button}>
    <ArrowLeftIcon size={24} className="text-gray-700 dark:text-gray-300" />
  </Pressable>
);

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
  },
});
