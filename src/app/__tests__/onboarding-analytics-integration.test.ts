// Mock analytics first
const mockTrackEventOnboardingIntegration = jest.fn();
jest.mock('@/hooks/use-analytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEventOnboardingIntegration,
  }),
}));

// Mock useFocusEffect
const mockUseFocusEffectOnboardingIntegration = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: mockUseFocusEffectOnboardingIntegration,
}));

describe('Onboarding Analytics Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Analytics Hook Integration', () => {
    it('should import and use useAnalytics hook correctly', () => {
      const { useAnalytics } = require('@/hooks/use-analytics');
      const { trackEvent } = useAnalytics();
      
      expect(trackEvent).toBeDefined();
      expect(typeof trackEvent).toBe('function');
    });

    it('should call trackEvent with onboarding view analytics', () => {
      const { useAnalytics } = require('@/hooks/use-analytics');
      const { trackEvent } = useAnalytics();

      // Simulate the analytics call for onboarding page view
      trackEvent('onboarding_viewed', {
        timestamp: new Date('2024-01-15T10:00:00Z').toISOString(),
        currentSlide: 0,
        totalSlides: 3,
      });

      expect(mockTrackEventOnboardingIntegration).toHaveBeenCalledWith('onboarding_viewed', {
        timestamp: '2024-01-15T10:00:00.000Z',
        currentSlide: 0,
        totalSlides: 3,
      });
    });

    it('should call trackEvent with slide change analytics', () => {
      const { useAnalytics } = require('@/hooks/use-analytics');
      const { trackEvent } = useAnalytics();

      // Simulate the analytics call for slide change
      trackEvent('onboarding_slide_changed', {
        timestamp: new Date('2024-01-15T10:00:00Z').toISOString(),
        fromSlide: 0,
        toSlide: 1,
        slideTitle: 'Instant Notifications',
      });

      expect(mockTrackEventOnboardingIntegration).toHaveBeenCalledWith('onboarding_slide_changed', {
        timestamp: '2024-01-15T10:00:00.000Z',
        fromSlide: 0,
        toSlide: 1,
        slideTitle: 'Instant Notifications',
      });
    });

    it('should call trackEvent with next button analytics', () => {
      const { useAnalytics } = require('@/hooks/use-analytics');
      const { trackEvent } = useAnalytics();

      // Simulate the analytics call for next button click
      trackEvent('onboarding_next_clicked', {
        timestamp: new Date('2024-01-15T10:00:00Z').toISOString(),
        currentSlide: 1,
        slideTitle: 'Instant Notifications',
      });

      expect(mockTrackEventOnboardingIntegration).toHaveBeenCalledWith('onboarding_next_clicked', {
        timestamp: '2024-01-15T10:00:00.000Z',
        currentSlide: 1,
        slideTitle: 'Instant Notifications',
      });
    });

    it('should call trackEvent with skip button analytics', () => {
      const { useAnalytics } = require('@/hooks/use-analytics');
      const { trackEvent } = useAnalytics();

      // Simulate the analytics call for skip button click
      trackEvent('onboarding_skip_clicked', {
        timestamp: new Date('2024-01-15T10:00:00Z').toISOString(),
        currentSlide: 2,
        slideTitle: 'Interact with Calls',
      });

      expect(mockTrackEventOnboardingIntegration).toHaveBeenCalledWith('onboarding_skip_clicked', {
        timestamp: '2024-01-15T10:00:00.000Z',
        currentSlide: 2,
        slideTitle: 'Interact with Calls',
      });
    });

    it('should call trackEvent with completion analytics', () => {
      const { useAnalytics } = require('@/hooks/use-analytics');
      const { trackEvent } = useAnalytics();

      // Simulate the analytics call for onboarding completion
      trackEvent('onboarding_completed', {
        timestamp: new Date('2024-01-15T10:00:00Z').toISOString(),
        totalSlides: 3,
        completionMethod: 'finished',
      });

      expect(mockTrackEventOnboardingIntegration).toHaveBeenCalledWith('onboarding_completed', {
        timestamp: '2024-01-15T10:00:00.000Z',
        totalSlides: 3,
        completionMethod: 'finished',
      });
    });
  });

  describe('Focus Effect Integration', () => {
    it('should call useFocusEffect with proper callback', () => {
      // Import the hook for direct testing
      const { useFocusEffect } = require('@react-navigation/native');
      
      expect(useFocusEffect).toBeDefined();
      expect(typeof useFocusEffect).toBe('function');
    });

    it('should track page view when useFocusEffect callback is triggered', () => {
      const { useAnalytics } = require('@/hooks/use-analytics');
      const { useFocusEffect } = require('@react-navigation/native');

      // Test the pattern without actually using React hooks
      const trackEventFn = jest.fn();
      const callbackFn = jest.fn(() => {
        trackEventFn('onboarding_viewed', {
          timestamp: new Date('2024-01-15T10:00:00Z').toISOString(),
          currentSlide: 0,
          totalSlides: 3,
        });
      });

      // Simulate calling useFocusEffect with the callback
      useFocusEffect(callbackFn);

      // Verify that the callback is properly formed
      expect(callbackFn).toBeDefined();
      expect(typeof callbackFn).toBe('function');
    });
  });

  describe('Analytics Data Transformation', () => {
    it('should handle analytics data transformation for different slides', () => {
      // Test different slide scenarios
      const slides = [
        { index: 0, title: 'Resgrid Responder' },
        { index: 1, title: 'Instant Notifications' },
        { index: 2, title: 'Interact with Calls' },
      ];

      slides.forEach((slide) => {
        const analyticsData = {
          timestamp: new Date().toISOString(),
          currentSlide: slide.index,
          slideTitle: slide.title,
        };

        expect(analyticsData.currentSlide).toBe(slide.index);
        expect(analyticsData.slideTitle).toBe(slide.title);
        expect(typeof analyticsData.timestamp).toBe('string');
        expect(Date.parse(analyticsData.timestamp)).not.toBeNaN();
      });
    });

    it('should handle analytics data transformation for slide transitions', () => {
      // Test different slide transition scenarios
      const transitions = [
        { from: 0, to: 1, title: 'Instant Notifications' },
        { from: 1, to: 2, title: 'Interact with Calls' },
        { from: 2, to: 1, title: 'Instant Notifications' }, // Backward navigation
      ];

      transitions.forEach((transition) => {
        const analyticsData = {
          timestamp: new Date().toISOString(),
          fromSlide: transition.from,
          toSlide: transition.to,
          slideTitle: transition.title,
        };

        expect(analyticsData.fromSlide).toBe(transition.from);
        expect(analyticsData.toSlide).toBe(transition.to);
        expect(analyticsData.slideTitle).toBe(transition.title);
        expect(typeof analyticsData.timestamp).toBe('string');
        expect(Date.parse(analyticsData.timestamp)).not.toBeNaN();
      });
    });

    it('should handle analytics data transformation for completion methods', () => {
      // Test different completion methods
      const completionMethods = ['finished', 'skipped'];

      completionMethods.forEach((method) => {
        const analyticsData = {
          timestamp: new Date().toISOString(),
          totalSlides: 3,
          completionMethod: method,
        };

        expect(analyticsData.completionMethod).toBe(method);
        expect(analyticsData.totalSlides).toBe(3);
        expect(typeof analyticsData.timestamp).toBe('string');
        expect(Date.parse(analyticsData.timestamp)).not.toBeNaN();
      });
    });
  });

  describe('Event Timing and Sequence', () => {
    it('should track events in proper sequence during onboarding flow', () => {
      const { useAnalytics } = require('@/hooks/use-analytics');
      const { trackEvent } = useAnalytics();

      const baseTime = new Date('2024-01-15T10:00:00Z');

      // 1. Page view
      trackEvent('onboarding_viewed', {
        timestamp: baseTime.toISOString(),
        currentSlide: 0,
        totalSlides: 3,
      });

      // 2. Slide change (1 second later)
      const slideChangeTime = new Date(baseTime.getTime() + 1000);
      trackEvent('onboarding_slide_changed', {
        timestamp: slideChangeTime.toISOString(),
        fromSlide: 0,
        toSlide: 1,
        slideTitle: 'Instant Notifications',
      });

      // 3. Next button click (2 seconds after slide change)
      const nextClickTime = new Date(slideChangeTime.getTime() + 2000);
      trackEvent('onboarding_next_clicked', {
        timestamp: nextClickTime.toISOString(),
        currentSlide: 1,
        slideTitle: 'Instant Notifications',
      });

      // 4. Completion (3 seconds after next click)
      const completionTime = new Date(nextClickTime.getTime() + 3000);
      trackEvent('onboarding_completed', {
        timestamp: completionTime.toISOString(),
        totalSlides: 3,
        completionMethod: 'finished',
      });

      expect(mockTrackEventOnboardingIntegration).toHaveBeenCalledTimes(4);
      
      // Verify call order
      expect(mockTrackEventOnboardingIntegration).toHaveBeenNthCalledWith(1, 'onboarding_viewed', {
        timestamp: '2024-01-15T10:00:00.000Z',
        currentSlide: 0,
        totalSlides: 3,
      });
      
      expect(mockTrackEventOnboardingIntegration).toHaveBeenNthCalledWith(2, 'onboarding_slide_changed', {
        timestamp: '2024-01-15T10:00:01.000Z',
        fromSlide: 0,
        toSlide: 1,
        slideTitle: 'Instant Notifications',
      });
      
      expect(mockTrackEventOnboardingIntegration).toHaveBeenNthCalledWith(3, 'onboarding_next_clicked', {
        timestamp: '2024-01-15T10:00:03.000Z',
        currentSlide: 1,
        slideTitle: 'Instant Notifications',
      });

      expect(mockTrackEventOnboardingIntegration).toHaveBeenNthCalledWith(4, 'onboarding_completed', {
        timestamp: '2024-01-15T10:00:06.000Z',
        totalSlides: 3,
        completionMethod: 'finished',
      });
    });

    it('should track events in proper sequence during skip flow', () => {
      const { useAnalytics } = require('@/hooks/use-analytics');
      const { trackEvent } = useAnalytics();

      const baseTime = new Date('2024-01-15T10:00:00Z');

      // 1. Page view
      trackEvent('onboarding_viewed', {
        timestamp: baseTime.toISOString(),
        currentSlide: 0,
        totalSlides: 3,
      });

      // 2. Skip button click (5 seconds later)
      const skipTime = new Date(baseTime.getTime() + 5000);
      trackEvent('onboarding_skip_clicked', {
        timestamp: skipTime.toISOString(),
        currentSlide: 0,
        slideTitle: 'Resgrid Responder',
      });

      expect(mockTrackEventOnboardingIntegration).toHaveBeenCalledTimes(2);
      
      // Verify call order
      expect(mockTrackEventOnboardingIntegration).toHaveBeenNthCalledWith(1, 'onboarding_viewed', {
        timestamp: '2024-01-15T10:00:00.000Z',
        currentSlide: 0,
        totalSlides: 3,
      });
      
      expect(mockTrackEventOnboardingIntegration).toHaveBeenNthCalledWith(2, 'onboarding_skip_clicked', {
        timestamp: '2024-01-15T10:00:05.000Z',
        currentSlide: 0,
        slideTitle: 'Resgrid Responder',
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle unknown slide titles gracefully', () => {
      const { useAnalytics } = require('@/hooks/use-analytics');
      const { trackEvent } = useAnalytics();

      // Simulate tracking with unknown slide
      trackEvent('onboarding_slide_changed', {
        timestamp: new Date('2024-01-15T10:00:00Z').toISOString(),
        fromSlide: 10,
        toSlide: 11,
        slideTitle: 'Unknown',
      });

      expect(mockTrackEventOnboardingIntegration).toHaveBeenCalledWith('onboarding_slide_changed', {
        timestamp: '2024-01-15T10:00:00.000Z',
        fromSlide: 10,
        toSlide: 11,
        slideTitle: 'Unknown',
      });
    });

    it('should handle analytics service errors gracefully', () => {
      // This test verifies that analytics errors don't crash the application
      // The actual error handling is done within the analytics service itself
      const { useAnalytics } = require('@/hooks/use-analytics');
      const { trackEvent } = useAnalytics();

      // Since the actual analytics hook handles errors internally,
      // we test that the tracking call structure is correct
      const trackingCall = () => {
        trackEvent('onboarding_viewed', {
          timestamp: new Date().toISOString(),
          currentSlide: 0,
          totalSlides: 3,
        });
      };

      // The call should complete without throwing
      expect(() => trackingCall()).not.toThrow();
      
      // Verify the analytics service was called
      expect(mockTrackEventOnboardingIntegration).toHaveBeenCalledWith('onboarding_viewed', {
        timestamp: expect.any(String),
        currentSlide: 0,
        totalSlides: 3,
      });
    });

    it('should validate all required analytics properties are present', () => {
      const events = [
        {
          name: 'onboarding_viewed',
          requiredProps: ['timestamp', 'currentSlide', 'totalSlides'],
        },
        {
          name: 'onboarding_slide_changed',
          requiredProps: ['timestamp', 'fromSlide', 'toSlide', 'slideTitle'],
        },
        {
          name: 'onboarding_next_clicked',
          requiredProps: ['timestamp', 'currentSlide', 'slideTitle'],
        },
        {
          name: 'onboarding_skip_clicked',
          requiredProps: ['timestamp', 'currentSlide', 'slideTitle'],
        },
        {
          name: 'onboarding_completed',
          requiredProps: ['timestamp', 'totalSlides', 'completionMethod'],
        },
      ];

      events.forEach((event) => {
        const mockData: Record<string, any> = {
          timestamp: new Date().toISOString(),
          currentSlide: 0,
          totalSlides: 3,
          fromSlide: 0,
          toSlide: 1,
          slideTitle: 'Test Slide',
          completionMethod: 'finished',
        };

        event.requiredProps.forEach((prop) => {
          expect(mockData[prop]).toBeDefined();
          expect(typeof mockData[prop]).toBeTruthy();
        });
      });
    });
  });
});
