import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react-native';
import React from 'react';

import { useAnalytics } from '@/hooks/use-analytics';

// Mock the analytics hook
jest.mock('@/hooks/use-analytics', () => ({
  useAnalytics: jest.fn(),
}));

// Mock the translation hook
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Mock nativewind useColorScheme hook
jest.mock('nativewind', () => ({
  useColorScheme: () => ({
    colorScheme: 'light',
    setColorScheme: jest.fn(),
  }),
}));

const mockUseAnalytics = useAnalytics as jest.MockedFunction<typeof useAnalytics>;

// Simple test component
const TestAnalyticsComponent = () => {
  const { trackEvent } = useAnalytics();

  const handleClick = () => {
    trackEvent('test_event', { testProp: 'test_value' });
  };

  const { TouchableOpacity, Text } = require('react-native');

  return (
    <TouchableOpacity onPress={handleClick} testID="test-button">
      <Text>Test Button</Text>
    </TouchableOpacity>
  );
};

describe('Analytics Integration Test', () => {
  const mockTrackEvent = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAnalytics.mockReturnValue({
      trackEvent: mockTrackEvent,
    });
  });

  it('should track analytics events correctly', () => {
    render(<TestAnalyticsComponent />);

    fireEvent.press(screen.getByTestId('test-button'));

    expect(mockTrackEvent).toHaveBeenCalledWith('test_event', { testProp: 'test_value' });
  });
});
