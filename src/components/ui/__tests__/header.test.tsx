import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { Header } from '../header';

// Mock react-native for dimensions
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...(RN as object),
    useWindowDimensions: jest.fn(() => ({
      width: 375,
      height: 812,
    })),
  };
});

describe('Header', () => {
  const defaultProps = {
    title: 'Test Title',
    testID: 'test-header',
  };

  it('renders title correctly', () => {
    render(<Header {...defaultProps} />);

    expect(screen.getByTestId('test-header-title')).toBeTruthy();
    expect(screen.getByText('Test Title')).toBeTruthy();
  });

  it('shows menu button in portrait mode when onMenuPress is provided', () => {
    const mockOnMenuPress = jest.fn();

    render(<Header {...defaultProps} onMenuPress={mockOnMenuPress} />);

    expect(screen.getByTestId('test-header-menu-button')).toBeTruthy();
  });

  it('does not show menu button when onMenuPress is not provided', () => {
    render(<Header {...defaultProps} />);

    expect(screen.queryByTestId('test-header-menu-button')).toBeNull();
  });

  it('does not show menu button in landscape mode even when onMenuPress is provided', () => {
    // Mock landscape dimensions
    const mockUseWindowDimensions = (jest.requireMock('react-native') as any).useWindowDimensions;
    mockUseWindowDimensions.mockReturnValue({
      width: 812,
      height: 375,
    });

    const mockOnMenuPress = jest.fn();

    render(<Header {...defaultProps} onMenuPress={mockOnMenuPress} />);

    expect(screen.queryByTestId('test-header-menu-button')).toBeNull();
  });

  it('calls onMenuPress when menu button is pressed', () => {
    const mockOnMenuPress = jest.fn();

    render(<Header {...defaultProps} onMenuPress={mockOnMenuPress} />);

    fireEvent.press(screen.getByTestId('test-header-menu-button'));

    expect(mockOnMenuPress).toHaveBeenCalledTimes(1);
  });

  it('renders right component when provided', () => {
    const RightComponent = () => {
      const { Text } = require('react-native');
      return <Text testID="right-component">Right Content</Text>;
    };

    render(<Header {...defaultProps} rightComponent={<RightComponent />} />);

    expect(screen.getByTestId('test-header-right-component')).toBeTruthy();
    expect(screen.getByTestId('right-component')).toBeTruthy();
    expect(screen.getByText('Right Content')).toBeTruthy();
  });

  it('does not render right component container when rightComponent is not provided', () => {
    render(<Header {...defaultProps} />);

    expect(screen.queryByTestId('test-header-right-component')).toBeNull();
  });

  it('applies correct testID', () => {
    render(<Header {...defaultProps} />);

    expect(screen.getByTestId('test-header')).toBeTruthy();
  });

  it('handles missing testID gracefully', () => {
    const propsWithoutTestID = {
      title: 'Test Title',
    };

    render(<Header {...propsWithoutTestID} />);

    expect(screen.getByText('Test Title')).toBeTruthy();
  });
});
