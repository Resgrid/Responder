import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { Bell, ChevronRight, MapPin, Users } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import type { GestureResponderEvent } from 'react-native';
import { Dimensions, Image, ScrollView, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { FocusAwareStatusBar, SafeAreaView, View } from '@/components/ui';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { useAnalytics } from '@/hooks/use-analytics';
import { useIsFirstTime } from '@/lib/storage';

const { width } = Dimensions.get('window');
const SWIPE_THRESHOLD = 60;

// Color constants
const COLORS = {
  primary: '#FF7B1A',
  text: {
    light: {
      primary: '#1f2937',
      secondary: '#6b7280',
    },
    dark: {
      primary: '#ffffff',
      secondary: '#d1d5db',
    },
  },
};

// Static styles
const styles = StyleSheet.create({
  onboardingContainer: {
    height: 400,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  iconContainer: {
    marginBottom: 32,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  flexContainer: {
    flex: 1,
    minHeight: 400,
  },
});

type OnboardingItemProps = {
  title: string;
  description: string;
  icon: React.ReactNode;
};

const onboardingData: OnboardingItemProps[] = [
  {
    title: 'Resgrid Responder',
    description: 'Manage your status, staffing, and interact with your organization in real-time',
    icon: <MapPin size={80} color={COLORS.primary} />,
  },
  {
    title: 'Instant Notifications',
    description: 'Receive immediate alerts for emergencies and important updates from your department',
    icon: <Bell size={80} color={COLORS.primary} />,
  },
  {
    title: 'Interact with Calls',
    description: 'Seamlessly view call information and interact with your team members for efficient emergency response',
    icon: <Users size={80} color={COLORS.primary} />,
  },
];

const OnboardingItem: React.FC<OnboardingItemProps> = ({ title, description, icon }) => {
  const { colorScheme } = useColorScheme();

  // Compute dynamic colors once using useMemo
  const textColors = useMemo(() => {
    const isDark = colorScheme === 'dark';
    return {
      title: isDark ? COLORS.text.dark.primary : COLORS.text.light.primary,
      description: isDark ? COLORS.text.dark.secondary : COLORS.text.light.secondary,
    };
  }, [colorScheme]);

  return (
    <View style={[styles.onboardingContainer, { width }]}>
      <View style={styles.iconContainer}>{icon}</View>
      <Text style={[styles.title, { color: textColors.title }]}>{title}</Text>
      <Text style={[styles.description, { color: textColors.description }]}>{description}</Text>
    </View>
  );
};

const Pagination: React.FC<{ currentIndex: number; items: OnboardingItemProps[] }> = ({ currentIndex, items }) => {
  return (
    <View className="mt-8 flex-row justify-center">
      {items.map((item, index) => (
        <View key={item.title} className={`mx-1 h-2.5 rounded-full ${currentIndex === index ? 'w-6 bg-primary-500' : 'w-2.5 bg-primary-300'}`} />
      ))}
    </View>
  );
};

export default function Onboarding() {
  const [_, setIsFirstTime] = useIsFirstTime();
  //const { setIsOnboarding } = useAuthStore();
  const { trackEvent } = useAnalytics();
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const swipeStartXRef = useRef<number | null>(null);
  const buttonOpacity = useSharedValue(0);
  const { colorScheme } = useColorScheme();

  // Initialize button opacity when reaching the last slide
  React.useEffect(() => {
    if (currentIndex === onboardingData.length - 1) {
      buttonOpacity.value = withTiming(1, { duration: 500 });
    } else {
      buttonOpacity.value = withTiming(0, { duration: 300 });
    }
  }, [currentIndex, buttonOpacity]);

  //useEffect(() => {
  //  setIsOnboarding();
  //}, [setIsOnboarding]);

  // Analytics: Track when the onboarding page is viewed
  useFocusEffect(
    useCallback(() => {
      trackEvent('onboarding_viewed', {
        timestamp: new Date().toISOString(),
        currentSlide: currentIndex,
        totalSlides: onboardingData.length,
      });
    }, [trackEvent, currentIndex])
  );

  const handleGetStarted = useCallback(() => {
    // Analytics: Track completion
    trackEvent('onboarding_completed', {
      timestamp: new Date().toISOString(),
      totalSlides: onboardingData.length,
      completionMethod: 'finished',
    });

    setIsFirstTime(false);
    router.replace('/login');
  }, [trackEvent, setIsFirstTime, router]);

  const trackSlideChange = useCallback(
    (fromSlide: number, toSlide: number) => {
      trackEvent('onboarding_slide_changed', {
        timestamp: new Date().toISOString(),
        fromSlide,
        toSlide,
        slideTitle: onboardingData[toSlide]?.title || 'Unknown',
      });
    },
    [trackEvent]
  );

  const goToSlide = useCallback(
    (nextIndex: number) => {
      if (nextIndex < 0 || nextIndex >= onboardingData.length || nextIndex === currentIndex) {
        return;
      }

      setCurrentIndex(nextIndex);
      trackSlideChange(currentIndex, nextIndex);
    },
    [currentIndex, trackSlideChange]
  );

  const nextSlide = useCallback(() => {
    if (currentIndex < onboardingData.length - 1) {
      const nextIndex = currentIndex + 1;

      // Analytics: Track next button clicks
      trackEvent('onboarding_next_clicked', {
        timestamp: new Date().toISOString(),
        currentSlide: currentIndex,
        slideTitle: onboardingData[currentIndex]?.title || 'Unknown',
      });

      goToSlide(nextIndex);
    }
  }, [currentIndex, goToSlide, trackEvent]);

  const handleSlideTouchStart = useCallback((event: GestureResponderEvent) => {
    swipeStartXRef.current = typeof event.nativeEvent.pageX === 'number' ? event.nativeEvent.pageX : null;
  }, []);

  const handleSlideTouchEnd = useCallback(
    (event: GestureResponderEvent) => {
      const startX = swipeStartXRef.current;
      const endX = typeof event.nativeEvent.pageX === 'number' ? event.nativeEvent.pageX : null;

      swipeStartXRef.current = null;

      if (startX === null || endX === null) {
        return;
      }

      const deltaX = endX - startX;

      if (deltaX <= -SWIPE_THRESHOLD) {
        if (currentIndex < onboardingData.length - 1) {
          goToSlide(currentIndex + 1);
        } else {
          handleGetStarted();
        }
      }

      if (deltaX >= SWIPE_THRESHOLD && currentIndex > 0) {
        goToSlide(currentIndex - 1);
      }
    },
    [currentIndex, goToSlide, handleGetStarted]
  );

  const buttonAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: buttonOpacity.value,
      transform: [{ translateY: (1 - buttonOpacity.value) * 20 }],
    };
  });

  const handleSkip = useCallback(() => {
    // Analytics: Track skip button clicks
    trackEvent('onboarding_skip_clicked', {
      timestamp: new Date().toISOString(),
      currentSlide: currentIndex,
      slideTitle: onboardingData[currentIndex]?.title || 'Unknown',
      skipLocation: 'top_right',
    });

    setIsFirstTime(false);
    router.replace('/login');
  }, [trackEvent, currentIndex, setIsFirstTime, router]);

  const actionTextColor = colorScheme === 'dark' ? '#000000' : '#FFFFFF';
  const currentSlide = onboardingData[currentIndex];

  return (
    <SafeAreaView className="flex-1">
      <FocusAwareStatusBar hidden={true} />
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false} bounces={false}>
        <View className="w-full items-center justify-center px-10 pt-20">
          <Image style={{ width: '96%' }} resizeMode="contain" source={colorScheme === 'dark' ? require('@assets/images/Resgrid_JustText_White.png') : require('@assets/images/Resgrid_JustText.png')} />

          {/* Skip button in upper right corner */}
          <Pressable onPress={handleSkip} className="absolute right-8 top-4" testID="skip-button-top">
            <Text className="text-base font-semibold text-primary-500">Skip</Text>
          </Pressable>
        </View>

        <View style={styles.flexContainer}>
          <View testID="onboarding-flatlist" onTouchStart={handleSlideTouchStart} onTouchEnd={handleSlideTouchEnd}>
            <OnboardingItem key={currentSlide.title} {...currentSlide} />
          </View>
        </View>

        <Pagination currentIndex={currentIndex} items={onboardingData} />

        <View className="mb-8 mt-4 px-8">
          {currentIndex < onboardingData.length - 1 ? (
            <View className="flex-row items-center justify-between">
              <Pressable
                onPress={() => {
                  // Analytics: Track skip button clicks
                  trackEvent('onboarding_skip_clicked', {
                    timestamp: new Date().toISOString(),
                    currentSlide: currentIndex,
                    slideTitle: onboardingData[currentIndex]?.title || 'Unknown',
                  });

                  setIsFirstTime(false);
                  router.replace('/login');
                }}
              >
                <Text className="text-gray-500">Skip</Text>
              </Pressable>

              <Pressable accessibilityRole="button" className="h-11 flex-row items-center justify-center rounded bg-primary-500 px-6" onPress={nextSlide} testID="next-button">
                <Text style={{ color: actionTextColor }} className="text-base font-semibold">
                  Next
                </Text>
                <ChevronRight size={20} color={colorScheme === 'dark' ? 'black' : 'white'} />
              </Pressable>
            </View>
          ) : (
            <Animated.View style={buttonAnimatedStyle}>
              <Pressable accessibilityRole="button" className="h-11 w-full flex-row items-center justify-center rounded bg-primary-500" testID="get-started-button" onPress={handleGetStarted}>
                <Text style={{ color: actionTextColor }} className="text-base font-semibold">
                  Let's Get Started
                </Text>
              </Pressable>
            </Animated.View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
