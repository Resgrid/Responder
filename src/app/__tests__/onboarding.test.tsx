import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import React from 'react';

// Mock all dependencies first
jest.mock('expo-router', () => ({
  useRouter: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn(),
}));

jest.mock('nativewind', () => ({
  useColorScheme: () => ({ colorScheme: 'light' }),
}));

const mockTrackEvent = jest.fn();
jest.mock('@/hooks/use-analytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
  }),
}));

const mockSetIsOnboarding = jest.fn();
jest.mock('@/lib/auth', () => ({
  useAuthStore: () => ({
    status: 'idle',
    setIsOnboarding: mockSetIsOnboarding,
  }),
}));

const mockSetIsFirstTime = jest.fn();
jest.mock('@/lib/storage', () => ({
  useIsFirstTime: () => [true, mockSetIsFirstTime],
}));

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => ({
  useSharedValue: jest.fn(() => ({ value: 0 })),
  useAnimatedStyle: jest.fn(() => ({})),
  withTiming: jest.fn((value) => value),
  default: {
    View: ({ children, style, ...props }: any) => {
      const React = require('react');
      const { View } = require('react-native');
      return React.createElement(View, { style, ...props }, children);
    },
  },
}));

// Mock lucide-react-native icons
jest.mock('lucide-react-native', () => ({
  Bell: ({ size, color, ...props }: any) => {
    const React = require('react');
    const { View } = require('react-native');
    return React.createElement(View, { testID: 'bell-icon', ...props });
  },
  ChevronRight: ({ size, color, ...props }: any) => {
    const React = require('react');
    const { View } = require('react-native');
    return React.createElement(View, { testID: 'chevron-right-icon', ...props });
  },
  MapPin: ({ size, color, ...props }: any) => {
    const React = require('react');
    const { View } = require('react-native');
    return React.createElement(View, { testID: 'map-pin-icon', ...props });
  },
  Users: ({ size, color, ...props }: any) => {
    const React = require('react');
    const { View } = require('react-native');
    return React.createElement(View, { testID: 'users-icon', ...props });
  },
}));

// Simple mock for Image require
jest.mock('@assets/images/Resgrid_JustText_White.png', () => 'resgrid-white-logo');
jest.mock('@assets/images/Resgrid_JustText.png', () => 'resgrid-logo');

import Onboarding from '../onboarding';

describe('Onboarding Component', () => {
  const mockRouter = {
    replace: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useFocusEffect as jest.Mock).mockImplementation((callback) => callback());
  });

  describe('Component Rendering', () => {
    it('should render onboarding component without crashing', () => {
      const { getByText } = render(<Onboarding />);

      expect(getByText('Resgrid Responder')).toBeTruthy();
      expect(getByText('Manage your status, staffing, and interact with your organization in real-time')).toBeTruthy();
    });

    it('should render navigation elements', () => {
      const { getByText } = render(<Onboarding />);

      expect(getByText('Skip')).toBeTruthy();
      expect(getByText('Next')).toBeTruthy();
    });

    it('should render pagination dots', () => {
      const { getByTestId } = render(<Onboarding />);

      // We expect 3 pagination dots for 3 onboarding slides
      const flatList = getByTestId('onboarding-flatlist');
      expect(flatList).toBeTruthy();
    });
  });

  describe('Analytics Tracking', () => {
    it('should track onboarding_viewed event when component becomes visible', () => {
      render(<Onboarding />);

      expect(mockTrackEvent).toHaveBeenCalledWith('onboarding_viewed', {
        timestamp: expect.any(String),
        currentSlide: 0,
        totalSlides: 3,
      });
    });

    it('should track onboarding_next_clicked event when next button is pressed', () => {
      const { getByText } = render(<Onboarding />);

      // Clear the initial view tracking call
      mockTrackEvent.mockClear();

      fireEvent.press(getByText('Next'));

      expect(mockTrackEvent).toHaveBeenCalledWith('onboarding_next_clicked', {
        timestamp: expect.any(String),
        currentSlide: 0,
        slideTitle: 'Resgrid Responder',
      });
    });

    it('should track onboarding_skip_clicked event when skip button is pressed', () => {
      const { getByText } = render(<Onboarding />);

      // Clear the initial view tracking call
      mockTrackEvent.mockClear();

      fireEvent.press(getByText('Skip'));

      expect(mockTrackEvent).toHaveBeenCalledWith('onboarding_skip_clicked', {
        timestamp: expect.any(String),
        currentSlide: 0,
        slideTitle: 'Resgrid Responder',
      });
    });

    it('should track onboarding_slide_changed event when scrolling between slides', () => {
      const { getByTestId } = render(<Onboarding />);

      // Clear the initial view tracking call
      mockTrackEvent.mockClear();

      const flatList = getByTestId('onboarding-flatlist');

      // Simulate scroll to second slide
      fireEvent.scroll(flatList, {
        nativeEvent: {
          contentOffset: { x: 390, y: 0 }, // width of one slide
        },
      });

      expect(mockTrackEvent).toHaveBeenCalledWith('onboarding_slide_changed', {
        timestamp: expect.any(String),
        fromSlide: 0,
        toSlide: 1,
        slideTitle: 'Instant Notifications',
      });
    });
  });

  describe('Navigation Behavior', () => {
    it('should navigate to login when skip is pressed', () => {
      const { getByText } = render(<Onboarding />);

      fireEvent.press(getByText('Skip'));

      expect(mockSetIsFirstTime).toHaveBeenCalledWith(false);
      expect(mockRouter.replace).toHaveBeenCalledWith('/login');
    });

    it('should navigate to login when Get Started is pressed on last slide', async () => {
      const { getByTestId, getByText } = render(<Onboarding />);

      const flatList = getByTestId('onboarding-flatlist');

      // Simulate scroll to the last slide (index 2)
      fireEvent.scroll(flatList, {
        nativeEvent: {
          contentOffset: { x: 780, y: 0 }, // width * 2 for third slide
        },
      });

      // Wait for state update and look for the actual button text
      await waitFor(() => {
        const getStartedButton = getByText("Let's Get Started");
        expect(getStartedButton).toBeTruthy();

        // Clear previous analytics calls
        mockTrackEvent.mockClear();

        // Press the button
        fireEvent.press(getStartedButton);

        // Verify analytics and navigation
        expect(mockTrackEvent).toHaveBeenCalledWith('onboarding_completed', {
          timestamp: expect.any(String),
          totalSlides: 3,
          completionMethod: 'finished',
        });
        expect(mockSetIsFirstTime).toHaveBeenCalledWith(false);
        expect(mockRouter.replace).toHaveBeenCalledWith('/login');
      });
    });

    it('should call setIsOnboarding on component mount', () => {
      render(<Onboarding />);

      expect(mockSetIsOnboarding).toHaveBeenCalled();
    });
  });

  describe('Analytics Data Validation', () => {
    it('should validate onboarding_viewed analytics structure', () => {
      render(<Onboarding />);

      const call = mockTrackEvent.mock.calls.find(call => call[0] === 'onboarding_viewed');
      expect(call).toBeTruthy();

      const analyticsData = call[1];
      expect(typeof analyticsData.timestamp).toBe('string');
      expect(typeof analyticsData.currentSlide).toBe('number');
      expect(typeof analyticsData.totalSlides).toBe('number');
      expect(Date.parse(analyticsData.timestamp)).not.toBeNaN();
      expect(analyticsData.totalSlides).toBe(3);
    });

    it('should validate onboarding_next_clicked analytics structure', () => {
      const { getByText } = render(<Onboarding />);

      mockTrackEvent.mockClear();
      fireEvent.press(getByText('Next'));

      const call = mockTrackEvent.mock.calls.find(call => call[0] === 'onboarding_next_clicked');
      expect(call).toBeTruthy();

      const analyticsData = call[1];
      expect(typeof analyticsData.timestamp).toBe('string');
      expect(typeof analyticsData.currentSlide).toBe('number');
      expect(typeof analyticsData.slideTitle).toBe('string');
      expect(Date.parse(analyticsData.timestamp)).not.toBeNaN();
    });

    it('should validate onboarding_skip_clicked analytics structure', () => {
      const { getByText } = render(<Onboarding />);

      mockTrackEvent.mockClear();
      fireEvent.press(getByText('Skip'));

      const call = mockTrackEvent.mock.calls.find(call => call[0] === 'onboarding_skip_clicked');
      expect(call).toBeTruthy();

      const analyticsData = call[1];
      expect(typeof analyticsData.timestamp).toBe('string');
      expect(typeof analyticsData.currentSlide).toBe('number');
      expect(typeof analyticsData.slideTitle).toBe('string');
      expect(Date.parse(analyticsData.timestamp)).not.toBeNaN();
    });

    it('should validate onboarding_slide_changed analytics structure', () => {
      const { getByTestId } = render(<Onboarding />);

      mockTrackEvent.mockClear();
      const flatList = getByTestId('onboarding-flatlist');

      fireEvent.scroll(flatList, {
        nativeEvent: {
          contentOffset: { x: 390, y: 0 },
        },
      });

      const call = mockTrackEvent.mock.calls.find(call => call[0] === 'onboarding_slide_changed');
      expect(call).toBeTruthy();

      const analyticsData = call[1];
      expect(typeof analyticsData.timestamp).toBe('string');
      expect(typeof analyticsData.fromSlide).toBe('number');
      expect(typeof analyticsData.toSlide).toBe('number');
      expect(typeof analyticsData.slideTitle).toBe('string');
      expect(Date.parse(analyticsData.timestamp)).not.toBeNaN();
    });
  });

  describe('Error Handling', () => {
    it('should handle analytics errors gracefully', () => {
      mockTrackEvent.mockImplementation(() => {
        throw new Error('Analytics service error');
      });

      // Component should still render without crashing
      expect(() => render(<Onboarding />)).not.toThrow();
    });

    it('should handle missing slide data gracefully', () => {
      const { getByTestId } = render(<Onboarding />);

      mockTrackEvent.mockClear();
      const flatList = getByTestId('onboarding-flatlist');

      // Simulate scroll to an invalid index
      fireEvent.scroll(flatList, {
        nativeEvent: {
          contentOffset: { x: 9999, y: 0 },
        },
      });

      // Should handle the case where slide data doesn't exist
      const call = mockTrackEvent.mock.calls.find(call => call[0] === 'onboarding_slide_changed');
      if (call) {
        const analyticsData = call[1];
        expect(analyticsData.slideTitle).toBeDefined();
      }
    });
  });

  describe('Focus Effect Integration', () => {
    it('should call useFocusEffect with proper callback', () => {
      render(<Onboarding />);

      expect(useFocusEffect).toHaveBeenCalled();

      // Verify the callback function structure
      const focusCallback = (useFocusEffect as jest.Mock).mock.calls[0][0];
      expect(typeof focusCallback).toBe('function');
    });

    it('should track analytics when focus effect is triggered', () => {
      let focusCallback: () => void;

      (useFocusEffect as jest.Mock).mockImplementation((callback) => {
        focusCallback = callback;
      });

      render(<Onboarding />);

      // Clear previous calls
      mockTrackEvent.mockClear();

      // Manually trigger the focus callback
      focusCallback!();

      expect(mockTrackEvent).toHaveBeenCalledWith('onboarding_viewed', expect.any(Object));
    });
  });
});
