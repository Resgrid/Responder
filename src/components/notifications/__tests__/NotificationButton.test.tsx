import { render, screen, fireEvent } from '@testing-library/react-native';
import React from 'react';

import { NotificationButton } from '../NotificationButton';

// Mock the Novu hook
jest.mock('@novu/react-native', () => ({
  useCounts: jest.fn(),
}));

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      if (key === 'settings.notifications_badge_overflow') return '99+';
      if (key === 'settings.notifications_button') return 'Notifications';
      return key;
    },
  }),
}));

// Mock lucide-react-native
jest.mock('lucide-react-native', () => ({
  BellIcon: ({ className, ...props }: any) => {
    const MockIcon = require('react-native').View;
    return <MockIcon testID="bell-icon" accessibilityLabel={className} {...props} />;
  },
}));

const { useCounts } = require('@novu/react-native');

describe('NotificationButton', () => {
  const mockOnPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render loading state correctly', () => {
    useCounts.mockReturnValue({
      isLoading: true,
      counts: null,
    });

    render(<NotificationButton onPress={mockOnPress} />);

    // When loading, the component shows an ActivityIndicator
    // Since ActivityIndicator doesn't have a testID, we check that no notification button is rendered
    expect(screen.queryByTestId('notification-button')).toBeNull();
  });

  it('should render notification button with correct icon styling', () => {
    useCounts.mockReturnValue({
      isLoading: false,
      counts: [{ count: 0 }],
    });

    render(<NotificationButton onPress={mockOnPress} />);

    const button = screen.getByTestId('notification-button');
    expect(button).toBeTruthy();

    const bellIcon = screen.getByTestId('bell-icon');
    expect(bellIcon).toBeTruthy();
    expect(bellIcon.props.accessibilityLabel).toBe('text-gray-700 dark:text-gray-300');
  });

  it('should render without notification badge when count is 0', () => {
    useCounts.mockReturnValue({
      isLoading: false,
      counts: [{ count: 0 }],
    });

    render(<NotificationButton onPress={mockOnPress} />);

    expect(screen.getByTestId('notification-button')).toBeTruthy();
    expect(screen.queryByText('0')).toBeNull();
  });

  it('should render notification badge when count is greater than 0', () => {
    useCounts.mockReturnValue({
      isLoading: false,
      counts: [{ count: 5 }],
    });

    render(<NotificationButton onPress={mockOnPress} />);

    expect(screen.getByTestId('notification-button')).toBeTruthy();
    expect(screen.getByTestId('notification-badge')).toBeTruthy();
    expect(screen.getByText('5')).toBeTruthy();
  });

  it('should display "99+" when count exceeds 99', () => {
    useCounts.mockReturnValue({
      isLoading: false,
      counts: [{ count: 150 }],
    });

    render(<NotificationButton onPress={mockOnPress} />);

    expect(screen.getByText('99+')).toBeTruthy();
  });

  it('should handle missing counts gracefully', () => {
    useCounts.mockReturnValue({
      isLoading: false,
      counts: null,
    });

    render(<NotificationButton onPress={mockOnPress} />);

    expect(screen.getByTestId('notification-button')).toBeTruthy();
    expect(screen.queryByText(/\d+/)).toBeNull();
  });

  it('should handle empty counts array', () => {
    useCounts.mockReturnValue({
      isLoading: false,
      counts: [],
    });

    render(<NotificationButton onPress={mockOnPress} />);

    expect(screen.getByTestId('notification-button')).toBeTruthy();
    expect(screen.queryByText(/\d+/)).toBeNull();
  });

  describe('Dark Mode Support', () => {
    it('should use gray colors for better visibility in both light and dark modes', () => {
      useCounts.mockReturnValue({
        isLoading: false,
        counts: [{ count: 3 }],
      });

      render(<NotificationButton onPress={mockOnPress} />);

      const bellIcon = screen.getByTestId('bell-icon');
      // Verify the icon uses the proper gray color classes for contrast
      expect(bellIcon.props.accessibilityLabel).toBe('text-gray-700 dark:text-gray-300');
    });
  });

  describe('Accessibility', () => {
    it('should have proper test ID for automation testing', () => {
      useCounts.mockReturnValue({
        isLoading: false,
        counts: [{ count: 2 }],
      });

      render(<NotificationButton onPress={mockOnPress} />);

      expect(screen.getByTestId('notification-button')).toBeTruthy();
      expect(screen.getByTestId('notification-badge')).toBeTruthy();
    });

    it('should have proper accessibility role and label with notifications', () => {
      useCounts.mockReturnValue({
        isLoading: false,
        counts: [{ count: 5 }],
      });

      render(<NotificationButton onPress={mockOnPress} />);

      const button = screen.getByTestId('notification-button');
      expect(button.props.accessibilityRole).toBe('button');
      expect(button.props.accessibilityLabel).toBe('Notifications, 5 unread');
    });

    it('should have proper accessibility label without notifications', () => {
      useCounts.mockReturnValue({
        isLoading: false,
        counts: [{ count: 0 }],
      });

      render(<NotificationButton onPress={mockOnPress} />);

      const button = screen.getByTestId('notification-button');
      expect(button.props.accessibilityRole).toBe('button');
      expect(button.props.accessibilityLabel).toBe('Notifications');
    });

    it('should be pressable', () => {
      useCounts.mockReturnValue({
        isLoading: false,
        counts: [{ count: 1 }],
      });

      render(<NotificationButton onPress={mockOnPress} />);
      const button = screen.getByTestId('notification-button');

      // The button should be rendered and be a valid React element
      expect(button).toBeTruthy();
      expect(button.type).toBeDefined();

      // Test the onPress handler
      fireEvent.press(button);
      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });
  });

  describe('Internationalization', () => {
    it('should use translated text for badge overflow', () => {
      useCounts.mockReturnValue({
        isLoading: false,
        counts: [{ count: 150 }],
      });

      render(<NotificationButton onPress={mockOnPress} />);

      expect(screen.getByText('99+')).toBeTruthy();
      expect(screen.getByTestId('notification-badge')).toBeTruthy();
    });
  });
});
