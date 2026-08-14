import { ArrowLeftIcon } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Pressable } from '@/components/ui/';

interface HeaderBackButtonProps {
  onPress: () => void;
}

// Fixed 40x40 plain View wrapper: iOS 26 liquid glass headers stretch flexible-width
// header subviews (react-native-screens 4.16). Gluestack/NativeWind styles can land a
// frame after the first native commit, so the glass capsule caches a stretched
// constraint on re-entry — the wrapper guarantees a fixed frame from the first commit.
// collapsable={false} keeps the native view (and its frame) from being optimized away.
export const HeaderBackButton: React.FC<HeaderBackButtonProps> = ({ onPress }) => {
  const { colorScheme } = useColorScheme();

  return (
    <View style={styles.button} collapsable={false} testID="back-button-container">
      <Pressable onPress={onPress} testID="back-button" className="size-10 items-center justify-center rounded">
        {/* lucide icons draw with `stroke="currentColor"`, which react-native-svg resolves
            to black — a `className` text colour never reaches them. Pass `color` instead,
            or the arrow is invisible against the dark header. */}
        <ArrowLeftIcon size={24} color={colorScheme === 'dark' ? '#d1d5db' : '#374151'} />
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
  },
});
