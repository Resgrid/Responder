import { useFocusEffect, useRouter } from 'expo-router';
import { Bell, MapPin, Users } from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { OnboardingScreen } from '@/components/onboarding/onboarding-screen';
import { useAnalytics } from '@/hooks/use-analytics';
import { useIsFirstTime } from '@/lib/storage';

interface OnboardingSlide {
  titleKey: string;
  descriptionKey: string;
  icon: React.ReactNode;
}

const onboardingData: OnboardingSlide[] = [
  {
    titleKey: 'onboarding.slides.responder.title',
    descriptionKey: 'onboarding.slides.responder.description',
    icon: <MapPin size={56} color={'#FF7B1A'} />,
  },
  {
    titleKey: 'onboarding.slides.notifications.title',
    descriptionKey: 'onboarding.slides.notifications.description',
    icon: <Bell size={56} color={'#FF7B1A'} />,
  },
  {
    titleKey: 'onboarding.slides.calls.title',
    descriptionKey: 'onboarding.slides.calls.description',
    icon: <Users size={56} color={'#FF7B1A'} />,
  },
];

export default function Onboarding() {
  const { t } = useTranslation();
  const [, setIsFirstTime] = useIsFirstTime();
  const { trackEvent } = useAnalytics();
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
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

  const getSlideTitle = useCallback(
    (index: number) => {
      const titleKey = onboardingData[index]?.titleKey;

      return titleKey ? t(titleKey) : 'Unknown';
    },
    [t]
  );

  const trackSlideChange = useCallback(
    (fromSlide: number, toSlide: number) => {
      trackEvent('onboarding_slide_changed', {
        timestamp: new Date().toISOString(),
        fromSlide,
        toSlide,
        slideTitle: getSlideTitle(toSlide),
      });
    },
    [trackEvent, getSlideTitle]
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
        slideTitle: getSlideTitle(currentIndex),
      });

      goToSlide(nextIndex);
    }
  }, [currentIndex, goToSlide, trackEvent, getSlideTitle]);

  const handleSkip = useCallback(() => {
    // Analytics: Track skip button clicks
    trackEvent('onboarding_skip_clicked', {
      timestamp: new Date().toISOString(),
      currentSlide: currentIndex,
      slideTitle: getSlideTitle(currentIndex),
      skipLocation: 'top_right',
    });

    setIsFirstTime(false);
    router.replace('/login');
  }, [trackEvent, currentIndex, setIsFirstTime, router, getSlideTitle]);

  const currentSlide = onboardingData[currentIndex];
  return (
    <OnboardingScreen
      title={t(currentSlide.titleKey)}
      description={t(currentSlide.descriptionKey)}
      icon={currentSlide.icon}
      currentIndex={currentIndex}
      total={onboardingData.length}
      skipLabel={t('onboarding.skip')}
      nextLabel={t('common.next')}
      finishLabel={t('onboarding.get_started')}
      onSkip={handleSkip}
      onNext={nextSlide}
      onFinish={handleGetStarted}
      onSlideChange={goToSlide}
    />
  );
}
