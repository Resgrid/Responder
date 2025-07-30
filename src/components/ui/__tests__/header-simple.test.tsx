import { describe, expect, it, jest } from '@jest/globals';
import { render } from '@testing-library/react-native';
import React from 'react';

// Mock React Native first, before any other imports
jest.mock('react-native', () => {
  const MockedRN = {
    useWindowDimensions: jest.fn(() => ({
      width: 375,
      height: 812,
      scale: 2,
      fontScale: 1,
    })),
    StyleSheet: {
      create: jest.fn((styles) => styles),
    },
    NativeModules: {
      SettingsManager: {},
      PlatformConstants: {
        forceTouchAvailable: false,
      },
    },
    TurboModuleRegistry: {
      getEnforcing: jest.fn(() => ({})),
    },
    Platform: {
      OS: 'ios',
      select: jest.fn((options: any) => options.ios),
    },
  };
  return MockedRN;
});

// Mock lucide-react-native icons
jest.mock('lucide-react-native', () => ({
  Menu: ({ testID, className, size }: { testID?: string; className?: string; size?: number }) => {
    const React = jest.requireActual('react') as typeof import('react');
    return React.createElement('span', { 'data-testid': testID || 'menu-icon', className, 'data-size': size }, 'Menu');
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

import { Header } from '../header';

describe('Header Simple Test', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render without crashing', () => {
    // Test that component renders without throwing
    expect(() => {
      render(<Header title="Test" testID="header" />);
    }).not.toThrow();
  });

  it('should render with title', () => {
    // Test that component renders with title prop without throwing
    expect(() => {
      render(<Header title="Test Title" />);
    }).not.toThrow();
  });

  it('should render with all props', () => {
    const mockOnMenuPress = jest.fn();
    const RightComponent = () => React.createElement('span', { 'data-testid': 'right-component' }, 'Right');

    // Test that component renders with all props without throwing
    expect(() => {
      render(
        <Header
          title="Test Title"
          onMenuPress={mockOnMenuPress}
          rightComponent={<RightComponent />}
          testID="header"
        />
      );
    }).not.toThrow();
  });
});
