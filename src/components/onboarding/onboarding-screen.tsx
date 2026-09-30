import { ChevronRight } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import React, { useRef, useState } from 'react';
import type { GestureResponderEvent } from 'react-native';
import { Image, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';

import { FocusAwareStatusBar, SafeAreaView, View } from '@/components/ui';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';

interface OnboardingScreenProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  currentIndex: number;
  total: number;
  skipLabel: string;
  nextLabel: string;
  finishLabel: string;
  onSkip: () => void;
  onNext: () => void;
  onFinish: () => void;
  onSlideChange: (index: number) => void;
}

/** Content grows with text size; the whole page remains scrollable on short screens. */
export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ title, description, icon, currentIndex, total, skipLabel, nextLabel, finishLabel, onSkip, onNext, onFinish, onSlideChange }) => {
  const { width, height, fontScale } = useWindowDimensions();
  const [containerWidth, setContainerWidth] = useState(width);
  const { colorScheme } = useColorScheme();
  const start = useRef<{ x: number; y: number } | null>(null);
  const availableWidth = Math.min(width, containerWidth);
  const horizontal = availableWidth >= 680 && fontScale < 1.5;
  const compact = height < 500;
  const last = currentIndex === total - 1;
  const actionColor = colorScheme === 'dark' ? 'black' : 'white';

  const handleTouchStart = (event: GestureResponderEvent) => {
    start.current = { x: event.nativeEvent.pageX, y: event.nativeEvent.pageY ?? 0 };
  };
  const handleTouchEnd = (event: GestureResponderEvent) => {
    const origin = start.current;
    start.current = null;
    if (!origin) return;
    const dx = event.nativeEvent.pageX - origin.x;
    const dy = (event.nativeEvent.pageY ?? 0) - origin.y;
    // Vertical scrolling must not accidentally advance or complete onboarding.
    if (Math.abs(dx) < 60 || Math.abs(dx) <= Math.abs(dy) * 1.5) return;
    onSlideChange(Math.max(0, Math.min(total - 1, currentIndex + (dx < 0 ? 1 : -1))));
  };

  return (
    <SafeAreaView className="flex-1 bg-background-50" onLayout={(event) => setContainerWidth(event.nativeEvent.layout.width)}>
      <FocusAwareStatusBar hidden={true} />
      <ScrollView bounces={false} contentContainerStyle={styles.scroll}>
        <View style={[styles.page, { paddingHorizontal: availableWidth < 360 ? 16 : 24, paddingVertical: compact ? 12 : 24 }]}>
          <View style={styles.header}>
            <Image accessible={false} style={styles.logo} resizeMode="contain" source={colorScheme === 'dark' ? require('@assets/images/Resgrid_JustText_White.png') : require('@assets/images/Resgrid_JustText.png')} />
            <Pressable testID="skip-button-top" accessibilityRole="button" accessibilityLabel={skipLabel} onPress={onSkip} style={styles.skip}>
              <Text className="text-base font-semibold leading-6 text-typography-600">{skipLabel}</Text>
            </Pressable>
          </View>

          <View
            style={[styles.main, { paddingVertical: compact ? 16 : 32 }]}
            testID="onboarding-flatlist"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={() => {
              start.current = null;
            }}
          >
            <View testID="onboarding-content" className="border border-outline-100 bg-background-0" style={[styles.card, horizontal ? styles.horizontal : styles.vertical]}>
              <View
                accessible={false}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
                className="bg-primary-50"
                style={[styles.artwork, { width: horizontal ? 180 : compact ? 112 : 160, height: horizontal ? 180 : compact ? 112 : 160 }]}
              >
                <View className="border border-primary-200 bg-background-0" style={styles.icon}>
                  {icon}
                </View>
              </View>
              <View style={styles.copy}>
                <Text
                  accessibilityRole="header"
                  className={`font-bold text-typography-950 ${availableWidth < 360 ? 'text-[28px] leading-[36px]' : 'text-[34px] leading-[44px]'}`}
                  style={[styles.title, { textAlign: horizontal ? 'left' : 'center' }]}
                >
                  {title}
                </Text>
                <Text className="text-[17px] leading-[28px] text-typography-600" style={[styles.description, { textAlign: horizontal ? 'left' : 'center' }]}>
                  {description}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.footer}>
            <View accessible accessibilityRole="progressbar" accessibilityValue={{ min: 1, max: total, now: currentIndex + 1 }} style={styles.progress}>
              {Array.from({ length: total }, (_, index) => (
                <View key={index} className={index === currentIndex ? 'bg-primary-500' : 'bg-outline-200'} style={[styles.dot, { width: index === currentIndex ? 28 : 8 }]} />
              ))}
            </View>
            <Pressable
              testID={last ? 'get-started-button' : 'next-button'}
              accessibilityRole="button"
              accessibilityLabel={last ? finishLabel : nextLabel}
              onPress={last ? onFinish : onNext}
              className="bg-primary-500"
              style={styles.action}
            >
              <Text className="text-base font-semibold leading-6" style={{ color: actionColor, flexShrink: 1, textAlign: 'center' }}>
                {last ? finishLabel : nextLabel}
              </Text>
              <ChevronRight size={20} color={actionColor} />
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  scroll: { flexGrow: 1 },
  page: { flexGrow: 1, width: '100%', maxWidth: 960, alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
  logo: { width: 136, height: 36, flexShrink: 1 },
  skip: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 12, flexShrink: 1 },
  main: { flexGrow: 1, justifyContent: 'center' },
  card: { borderRadius: 28, padding: 24, gap: 28, alignItems: 'center', width: '100%' },
  horizontal: { flexDirection: 'row', padding: 32, gap: 40 },
  vertical: { flexDirection: 'column' },
  artwork: { borderRadius: 999, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  icon: { width: 104, height: 104, borderRadius: 32, justifyContent: 'center', alignItems: 'center' },
  copy: { flexShrink: 1, minWidth: 0, width: '100%', gap: 16 },
  // Explicit line heights override the Text component's default body line height.
  title: { alignSelf: 'stretch', paddingVertical: 4 },
  description: { alignSelf: 'stretch' },
  footer: { width: '100%', maxWidth: 480, alignSelf: 'center', gap: 24 },
  progress: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, minHeight: 16 },
  dot: { height: 8, borderRadius: 4 },
  action: { minHeight: 56, borderRadius: 16, paddingVertical: 16, paddingHorizontal: 24, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
});
