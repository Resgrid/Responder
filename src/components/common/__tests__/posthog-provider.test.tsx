/**
 * Tests for PostHogProviderWrapper component
 * 
 * This test suite verifies that the PostHog provider wrapper:
 * - Renders children correctly
 * - Handles service configuration gracefully
 * - Doesn't crash during initialization
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { Text } from 'react-native';

// Mock PostHog provider to just render children
jest.mock('posthog-react-native', () => ({
  PostHogProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock the logger
jest.mock('@/lib/logging', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

// Mock the PostHog service completely
jest.mock('@/services/posthog.service', () => ({
  postHogService: {
    handleNetworkError: jest.fn(),
    handleNavigationError: jest.fn(),
    isPostHogDisabled: jest.fn().mockReturnValue(false),
    areNavigationErrorsSuppressed: jest.fn().mockReturnValue(false),
    getStatus: jest.fn().mockReturnValue({
      retryCount: 0,
      isDisabled: false,
      navigationErrorsSuppressed: false,
      maxRetries: 2,
      disableTimeoutMinutes: 10,
    }),
  },
}));

// Import component after mocks are set up
import { PostHogProviderWrapper } from '../posthog-provider';

describe('PostHogProviderWrapper', () => {
  const mockProps = {
    apiKey: 'test-api-key',
    host: 'https://test.posthog.com',
    children: <Text>Test Child</Text>,
  };

  it('renders children correctly', () => {
    const { getByText } = render(<PostHogProviderWrapper {...mockProps} />);
    expect(getByText('Test Child')).toBeTruthy();
  });

  it('renders with navigation ref', () => {
    const mockNavigationRef = { current: {} };
    const { getByText } = render(
      <PostHogProviderWrapper
        {...mockProps}
        navigationRef={mockNavigationRef}
      />
    );
    expect(getByText('Test Child')).toBeTruthy();
  });

  it('renders with different configuration', () => {
    const propsWithDifferentConfig = {
      apiKey: 'different-api-key',
      host: 'https://custom.posthog.com',
      children: <Text>Test Child</Text>,
    };

    const { getByText } = render(<PostHogProviderWrapper {...propsWithDifferentConfig} />);
    expect(getByText('Test Child')).toBeTruthy();
  });

  it('handles component unmounting', () => {
    const { getByText, unmount } = render(<PostHogProviderWrapper {...mockProps} />);

    expect(getByText('Test Child')).toBeTruthy();

    // Should not throw when unmounting
    expect(() => unmount()).not.toThrow();
  });
});
