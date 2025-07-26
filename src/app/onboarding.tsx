import { useRouter } from 'expo-router';
import { Bell, ChevronRight, MapPin, Users } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import React, { useEffect, useRef, useState } from 'react';
import { Dimensions, FlatList, Image } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { FocusAwareStatusBar, SafeAreaView, View } from '@/components/ui';
import { Button, ButtonText } from '@/components/ui/button';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
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
  return (
    <View className="w-full flex-1 items-center justify-center px-8" style={{ width }}>
      <View className="mb-8 items-center justify-center">{icon}</View>
      <Text className="mb-4 text-center text-3xl font-bold">{title}</Text>
      <Text className="text-center text-lg text-gray-600">{description}</Text>
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
  const { status, setIsOnboarding } = useAuthStore();
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const buttonOpacity = useSharedValue(0);
  const { colorScheme } = useColorScheme();

  useEffect(() => {
    setIsOnboarding();
  }, [setIsOnboarding]);

  const handleScroll = (event: { nativeEvent: { contentOffset: { x: number } } }) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / width);
    setCurrentIndex(index);

    // Show button with animation when on the last slide
    if (index === onboardingData.length - 1) {
      buttonOpacity.value = withTiming(1, { duration: 500 });
    } else {
      buttonOpacity.value = withTiming(0, { duration: 300 });
    }
  };

  const nextSlide = () => {
    if (currentIndex < onboardingData.length - 1) {
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

      <FlatList
        ref={flatListRef}
        data={onboardingData}
        renderItem={({ item }) => <OnboardingItem {...item} />}
        horizontal
        showsHorizontalScrollIndicator={false}
        pagingEnabled
        bounces={false}
        keyExtractor={(item) => item.title}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      />

      <Pagination currentIndex={currentIndex} length={onboardingData.length} />

      <SafeAreaView className="mb-8 mt-4 px-8">
        {currentIndex < onboardingData.length - 1 ? (
          <View className="flex-row items-center justify-between">
            <Pressable
              onPress={() => {
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
              onPress={() => {
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
