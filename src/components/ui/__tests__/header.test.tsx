import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { Header } from '../header';

// Mock useWindowDimensions hook specifically
const mockUseWindowDimensions = jest.fn(() => ({
  width: 375,
  height: 812,
}));

// Mock React Native components directly
jest.mock('react-native', () => ({
  useWindowDimensions: mockUseWindowDimensions,
}));

// Mock lucide-react-native icons
jest.mock('lucide-react-native', () => ({
  Menu: ({ testID, className }: { testID?: string; className?: string }) => {
    const React = jest.requireActual('react') as typeof import('react');
    return React.createElement('span', { 'data-testid': testID || 'menu-icon', className }, 'Menu');
  },
}));

// Mock the UI components
jest.mock('@/components/ui/view', () => ({
  View: ({ children, testID, className, ...props }: any) => {
    const React = jest.requireActual('react') as typeof import('react');
    return React.createElement('div', { 'data-testid': testID, className, ...props }, children);
  },
}));

jest.mock('@/components/ui/text', () => ({
  Text: ({ children, testID, className, ...props }: any) => {
    const React = jest.requireActual('react') as typeof import('react');
    return React.createElement('span', { 'data-testid': testID, className, ...props }, children);
  },
}));

jest.mock('@/components/ui/pressable', () => ({
  Pressable: ({ children, testID, onPress, className, ...props }: any) => {
    const React = jest.requireActual('react') as typeof import('react');
    return React.createElement('button', { 'data-testid': testID, onClick: onPress, className, ...props }, children);
  },
}));

jest.mock('@/components/ui/hstack', () => ({
  HStack: ({ children, className, space, ...props }: any) => {
    const React = jest.requireActual('react') as typeof import('react');
    return React.createElement('div', { className: `hstack ${className || ''}`, 'data-space': space, ...props }, children);
  },
}));

describe('Header', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('portrait orientation', () => {
    beforeEach(() => {
      mockUseWindowDimensions.mockReturnValue({
        width: 375,
        height: 812,
      });
    });

    it('should render menu button in portrait mode', () => {
      const mockOnMenuPress = jest.fn();
      render(<Header title="Test" onMenuPress={mockOnMenuPress} testID="header" />);

      expect(screen.getByTestId('header-menu-button')).toBeTruthy();
      expect(screen.getByTestId('menu-icon')).toBeTruthy();
    });

    it('should call onMenuPress when menu button is pressed', () => {
      const mockOnMenuPress = jest.fn();
      render(<Header title="Test" onMenuPress={mockOnMenuPress} testID="header" />);

      fireEvent.press(screen.getByTestId('header-menu-button'));
      expect(mockOnMenuPress).toHaveBeenCalledTimes(1);
    });

    it('should render title when provided', () => {
      render(<Header title="Test Title" testID="header" />);

      expect(screen.getByTestId('header-title')).toBeTruthy();
      expect(screen.getByText('Test Title')).toBeTruthy();
    });

    it('should render right component when provided', () => {
      const RightComponent = () => <span data-testid="right-component">Right</span>;

      render(<Header title="Test" rightComponent={<RightComponent />} testID="header" />);

      expect(screen.getByTestId('header-right-component')).toBeTruthy();
      expect(screen.getByTestId('right-component')).toBeTruthy();
    });
  });

  describe('landscape orientation', () => {
    beforeEach(() => {
      mockUseWindowDimensions.mockReturnValue({
        width: 812,
        height: 375,
      });
    });

    it('should not render menu button in landscape mode', () => {
      const mockOnMenuPress = jest.fn();
      render(<Header title="Test" onMenuPress={mockOnMenuPress} testID="header" />);

      expect(screen.queryByTestId('header-menu-button')).toBeNull();
    });

    it('should render title in landscape mode', () => {
      render(<Header title="Landscape Title" testID="header" />);

      expect(screen.getByTestId('header-title')).toBeTruthy();
      expect(screen.getByText('Landscape Title')).toBeTruthy();
    });

    it('should render right component in landscape mode', () => {
      const RightComponent = () => <span data-testid="right-component">Right</span>;

      render(<Header title="Test" rightComponent={<RightComponent />} testID="header" />);

      expect(screen.getByTestId('header-right-component')).toBeTruthy();
      expect(screen.getByTestId('right-component')).toBeTruthy();
    });
  });

  describe('edge cases', () => {
    it('should handle missing onMenuPress prop gracefully', () => {
      mockUseWindowDimensions.mockReturnValue({
        width: 375,
        height: 812,
      });

      render(<Header title="Test" testID="header" />);

      // Should not render menu button if no onMenuPress is provided
      expect(screen.queryByTestId('header-menu-button')).toBeNull();
    });

    it('should handle square dimensions', () => {
      mockUseWindowDimensions.mockReturnValue({
        width: 600,
        height: 600,
      });

      const mockOnMenuPress = jest.fn();
      render(<Header title="Test" onMenuPress={mockOnMenuPress} testID="header" />);

      // Square should be treated as portrait (width <= height)
      expect(screen.getByTestId('header-menu-button')).toBeTruthy();
    });
  });
});
