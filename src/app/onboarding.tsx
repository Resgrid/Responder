import { useFocusEffect } from '@react-navigation/native';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { Bell, ChevronRight, MapPin, Users } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import React, { useCallback, useRef, useState } from 'react';
import { Dimensions, Image } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { FocusAwareStatusBar, SafeAreaView, View } from '@/components/ui';
import { Button, ButtonText } from '@/components/ui/button';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { useAnalytics } from '@/hooks/use-analytics';
import { useAuthStore } from '@/lib/auth';
import { useIsFirstTime } from '@/lib/storage';

const { width } = Dimensions.get('window');

type OnboardingItemProps = {
  title: string;
  description: string;
  icon: React.ReactNode;
};

const onboardingData: OnboardingItemProps[] = [
  {
    title: 'Resgrid Responder',
    description: 'Manage your status, staffing, and interact with your organization in real-time',
    icon: <MapPin size={80} color="#FF7B1A" />,
  },
  {
    title: 'Instant Notifications',
    description: 'Receive immediate alerts for emergencies and important updates from your department',
    icon: <Bell size={80} color="#FF7B1A" />,
  },
  {
    title: 'Interact with Calls',
    description: 'Seamlessly view call information and interact with your team members for efficient emergency response',
    icon: <Users size={80} color="#FF7B1A" />,
  },
];

const OnboardingItem: React.FC<OnboardingItemProps> = ({ title, description, icon }) => {
  const { colorScheme } = useColorScheme();

  return (
    <View
      style={{
        width,
        height: 400,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
      }}
    >
      <View style={{ marginBottom: 32, alignItems: 'center' }}>{icon}</View>
      <Text
        style={{
          fontSize: 28,
          fontWeight: 'bold',
          textAlign: 'center',
          marginBottom: 16,
          color: colorScheme === 'dark' ? '#ffffff' : '#1f2937', // white in dark mode, dark gray in light mode
        }}
      >
        {title}
      </Text>
      <Text
        style={{
          fontSize: 16,
          textAlign: 'center',
          color: colorScheme === 'dark' ? '#d1d5db' : '#6b7280', // light gray in dark mode, gray in light mode
          lineHeight: 24,
        }}
      >
        {description}
      </Text>
    </View>
  );
};

const Pagination: React.FC<{ currentIndex: number; length: number }> = ({ currentIndex, length }) => {
  return (
    <View className="mt-8 flex-row justify-center">
      {Array.from({ length }).map((_, index) => (
        <View key={index} className={`mx-1 h-2.5 rounded-full ${currentIndex === index ? 'w-6 bg-primary-500' : 'w-2.5 bg-primary-300'}`} />
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
  const flatListRef = useRef<FlashList<OnboardingItemProps>>(null);
  const buttonOpacity = useSharedValue(0);
  const { colorScheme } = useColorScheme();

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

  const handleScroll = (event: { nativeEvent: { contentOffset: { x: number } } }) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / width);
    const wasLastIndex = currentIndex;
    setCurrentIndex(index);

    // Analytics: Track slide changes
    if (index !== wasLastIndex) {
      trackEvent('onboarding_slide_changed', {
        timestamp: new Date().toISOString(),
        fromSlide: wasLastIndex,
        toSlide: index,
        slideTitle: onboardingData[index]?.title || 'Unknown',
      });
    }

    // Show button with animation when on the last slide
    if (index === onboardingData.length - 1) {
      buttonOpacity.value = withTiming(1, { duration: 500 });
    } else {
      buttonOpacity.value = withTiming(0, { duration: 300 });
    }
  };

  const nextSlide = () => {
    if (currentIndex < onboardingData.length - 1) {
      // Analytics: Track next button clicks
      trackEvent('onboarding_next_clicked', {
        timestamp: new Date().toISOString(),
        currentSlide: currentIndex,
        slideTitle: onboardingData[currentIndex]?.title || 'Unknown',
      });

      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
    }
  };

  const buttonAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: buttonOpacity.value,
      transform: [{ translateY: (1 - buttonOpacity.value) * 20 }],
    };
  });

  return (
    <View className="flex-1">
      <FocusAwareStatusBar hidden={true} />

      <View className="w-full items-center justify-center px-10 pt-20">
        <Image style={{ width: '96%' }} resizeMode="contain" source={colorScheme === 'dark' ? require('@assets/images/Resgrid_JustText_White.png') : require('@assets/images/Resgrid_JustText.png')} />
      </View>

      <View style={{ flex: 1, minHeight: 400 }}>
        <FlashList
          ref={flatListRef}
          data={onboardingData}
          renderItem={({ item }: { item: OnboardingItemProps }) => <OnboardingItem {...item} />}
          horizontal
          showsHorizontalScrollIndicator={false}
          pagingEnabled
          bounces={false}
          keyExtractor={(item: OnboardingItemProps) => item.title}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          estimatedItemSize={width}
          getItemType={() => 'onboarding-item'}
          testID="onboarding-flatlist"
        />
      </View>

      <Pagination currentIndex={currentIndex} length={onboardingData.length} />

      <SafeAreaView className="mb-8 mt-4 px-8">
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

            <Button size="lg" variant="solid" action="primary" className="bg-primary-500 px-6" onPress={nextSlide}>
              <ButtonText>Next </ButtonText>
              <ChevronRight size={20} color={colorScheme === 'dark' ? 'black' : 'white'} />
            </Button>
          </View>
        ) : (
          <Animated.View style={buttonAnimatedStyle}>
            <Button
              size="lg"
              variant="solid"
              action="primary"
              className="w-full bg-primary-500"
              testID="get-started-button"
              onPress={() => {
                // Analytics: Track completion
                trackEvent('onboarding_completed', {
                  timestamp: new Date().toISOString(),
                  totalSlides: onboardingData.length,
                  completionMethod: 'finished',
                });

                setIsFirstTime(false);
                router.replace('/login');
              }}
            >
              <ButtonText>Let's Get Started</ButtonText>
            </Button>
          </Animated.View>
        )}
      </SafeAreaView>
    </View>
  );
}
