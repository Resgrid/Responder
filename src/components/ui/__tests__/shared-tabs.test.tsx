import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';

// Mock React Native first, before any other imports
jest.mock('react-native', () => {
  const MockedRN = {
    View: 'View',
    Text: 'Text',
    Pressable: 'Pressable',
    ScrollView: 'ScrollView',
    useWindowDimensions: jest.fn(),
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
      select: jest.fn((options) => options.ios),
    },
  };
  return MockedRN;
});

// Mock other dependencies
import { useTranslation } from 'react-i18next';
import { useColorScheme } from 'nativewind';
import { useWindowDimensions, View, Text as RNText } from 'react-native';

import { SharedTabs, type TabItem } from '../shared-tabs';

// Mock the translation hook
jest.mock('react-i18next', () => ({
  useTranslation: jest.fn(),
}));

// Mock nativewind useColorScheme
jest.mock('nativewind', () => ({
  useColorScheme: jest.fn(),
}));

// Mock Lucide icons
jest.mock('lucide-react-native', () => ({
  Home: 'Home',
  User: 'User',
  Settings: 'Settings',
  Bell: 'Bell',
}));

// Mock UI components
jest.mock('@/components/ui/box', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    Box: ({ children, className, ...props }: any) =>
      React.createElement(View, { ...props, testID: 'box', className }, children),
  };
});

jest.mock('@/components/ui/pressable', () => {
  const React = require('react');
  const { Pressable: RNPressable } = require('react-native');
  return {
    Pressable: ({ children, className, ...props }: any) =>
      React.createElement(RNPressable, { ...props, testID: 'pressable', className }, children),
  };
});

jest.mock('@/components/ui/text', () => {
  const React = require('react');
  const { Text: RNText } = require('react-native');
  return {
    Text: ({ children, className, ...props }: any) =>
      React.createElement(RNText, { ...props, testID: 'text', className }, children),
  };
});

// Mock zustand store
jest.mock('zustand', () => ({
  create: jest.fn((storeFunction) => {
    let state = { activeIndex: 0 };
    const setState = jest.fn((updater) => {
      if (typeof updater === 'function') {
        state = { ...state, ...updater(state) };
      } else {
        state = { ...state, ...updater };
      }
    });

    const store = storeFunction(setState);
    return jest.fn(() => ({
      ...state,
      ...store,
      setActiveIndex: jest.fn((index) => {
        state.activeIndex = index;
      }),
    }));
  }),
}));

const mockTranslation = useTranslation as jest.MockedFunction<typeof useTranslation>;
const mockColorScheme = useColorScheme as jest.MockedFunction<typeof useColorScheme>;
const mockWindowDimensions = useWindowDimensions as jest.MockedFunction<typeof useWindowDimensions>;

describe('SharedTabs', () => {
  const mockT = jest.fn((key: string) => key);

  const sampleTabs: TabItem[] = [
    {
      key: 'home',
      title: 'Home',
      content: <View testID="home-content"><RNText>Home Content</RNText></View>,
    },
    {
      key: 'profile',
      title: 'Profile',
      content: <View testID="profile-content"><RNText>Profile Content</RNText></View>,
    },
    {
      key: 'settings',
      title: 'Settings',
      content: <View testID="settings-content"><RNText>Settings Content</RNText></View>,
      badge: 3,
    },
  ];

  const sampleTabsWithIcons: TabItem[] = [
    {
      key: 'home',
      title: 'Home',
      content: <View testID="home-content"><RNText>Home Content</RNText></View>,
      icon: <View testID="home-icon"><RNText>HomeIcon</RNText></View>,
    },
    {
      key: 'profile',
      title: 'Profile',
      content: <View testID="profile-content"><RNText>Profile Content</RNText></View>,
      icon: <View testID="profile-icon"><RNText>ProfileIcon</RNText></View>,
      badge: 5,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockTranslation.mockReturnValue({
      t: mockT,
      i18n: {
        language: 'en',
        changeLanguage: jest.fn(),
      },
    } as any);

    mockColorScheme.mockReturnValue({
      colorScheme: 'light',
      setColorScheme: jest.fn(),
      toggleColorScheme: jest.fn(),
    });

    mockWindowDimensions.mockReturnValue({
      width: 375,
      height: 812,
      scale: 2,
      fontScale: 1,
    });
  });

  describe('Basic Rendering', () => {
    it('renders correctly with basic tabs', () => {
      const { getAllByTestId } = render(<SharedTabs tabs={sampleTabs} />);

      expect(getAllByTestId('box').length).toBeGreaterThan(0);
    });

    it('renders all tab titles', () => {
      const { getAllByTestId } = render(<SharedTabs tabs={sampleTabs} />);

      const textElements = getAllByTestId('text');
      const tabTitles = textElements.filter(el =>
        ['Home', 'Profile', 'Settings'].includes(el.children?.[0] as string)
      );

      expect(tabTitles).toHaveLength(3);
    });

    it('renders the first tab content by default', () => {
      const { getByTestId } = render(<SharedTabs tabs={sampleTabs} />);

      expect(getByTestId('home-content')).toBeTruthy();
    });

    it('renders with custom initial index', () => {
      const { getByTestId } = render(<SharedTabs tabs={sampleTabs} initialIndex={1} />);

      expect(getByTestId('profile-content')).toBeTruthy();
    });
  });

  describe('Tab Switching', () => {
    it('switches tabs when pressed', () => {
      const { getAllByTestId, getByTestId, queryByTestId } = render(
        <SharedTabs tabs={sampleTabs} />
      );

      const pressables = getAllByTestId('pressable');

      // Click second tab
      act(() => {
        fireEvent.press(pressables[1]);
      });

      expect(getByTestId('profile-content')).toBeTruthy();
      expect(queryByTestId('home-content')).toBeFalsy();
    });

    it('calls onChange callback when provided', () => {
      const onChangeMock = jest.fn();
      const { getAllByTestId } = render(
        <SharedTabs tabs={sampleTabs} onChange={onChangeMock} />
      );

      const pressables = getAllByTestId('pressable');

      act(() => {
        fireEvent.press(pressables[2]);
      });

      expect(onChangeMock).toHaveBeenCalledWith(2);
    });
  });

  describe('Icons and Badges', () => {
    it('renders icons when provided', () => {
      const { getByTestId } = render(<SharedTabs tabs={sampleTabsWithIcons} />);

      expect(getByTestId('home-icon')).toBeTruthy();
      expect(getByTestId('profile-icon')).toBeTruthy();
    });

    it('renders badges when provided', () => {
      const { getAllByTestId } = render(<SharedTabs tabs={sampleTabs} />);

      const textElements = getAllByTestId('text');
      const badgeText = textElements.find(el => el.children?.[0] === '3');

      expect(badgeText).toBeTruthy();
    });

    it('does not render badge when count is 0', () => {
      const tabsWithZeroBadge: TabItem[] = [
        {
          key: 'home',
          title: 'Home',
          content: <View testID="home-content"><RNText>Home Content</RNText></View>,
          badge: 0,
        },
      ];

      const { getAllByTestId } = render(<SharedTabs tabs={tabsWithZeroBadge} />);

      const textElements = getAllByTestId('text');
      const badgeText = textElements.find(el => el.children?.[0] === '0');

      expect(badgeText).toBeFalsy();
    });
  });

  describe('Variants', () => {
    it('renders with default variant', () => {
      const { getAllByTestId } = render(<SharedTabs tabs={sampleTabs} variant="default" />);
      expect(getAllByTestId('box').length).toBeGreaterThan(0);
    });

    it('renders with pills variant', () => {
      const { getAllByTestId } = render(<SharedTabs tabs={sampleTabs} variant="pills" />);
      expect(getAllByTestId('box').length).toBeGreaterThan(0);
    });

    it('renders with underlined variant', () => {
      const { getAllByTestId } = render(<SharedTabs tabs={sampleTabs} variant="underlined" />);
      expect(getAllByTestId('box').length).toBeGreaterThan(0);
    });

    it('renders with segmented variant', () => {
      const { getAllByTestId } = render(<SharedTabs tabs={sampleTabs} variant="segmented" />);
      expect(getAllByTestId('box').length).toBeGreaterThan(0);
    });
  });

  describe('Sizes', () => {
    it('renders with small size', () => {
      const { getAllByTestId } = render(<SharedTabs tabs={sampleTabs} size="sm" />);
      expect(getAllByTestId('box').length).toBeGreaterThan(0);
    });

    it('renders with medium size', () => {
      const { getAllByTestId } = render(<SharedTabs tabs={sampleTabs} size="md" />);
      expect(getAllByTestId('box').length).toBeGreaterThan(0);
    });

    it('renders with large size', () => {
      const { getAllByTestId } = render(<SharedTabs tabs={sampleTabs} size="lg" />);
      expect(getAllByTestId('box').length).toBeGreaterThan(0);
    });
  });

  describe('Scrollable Mode', () => {
    it('renders with scrollable mode enabled by default', () => {
      const { getAllByTestId } = render(<SharedTabs tabs={sampleTabs} />);
      expect(getAllByTestId('box').length).toBeGreaterThan(0);
    });

    it('renders with scrollable mode disabled', () => {
      const { getAllByTestId } = render(<SharedTabs tabs={sampleTabs} scrollable={false} />);
      expect(getAllByTestId('box').length).toBeGreaterThan(0);
    });
  });

  describe('Dark Mode Support', () => {
    it('renders correctly in dark mode', () => {
      mockColorScheme.mockReturnValue({
        colorScheme: 'dark',
        setColorScheme: jest.fn(),
        toggleColorScheme: jest.fn(),
      });

      const { getAllByTestId } = render(<SharedTabs tabs={sampleTabs} />);
      expect(getAllByTestId('box').length).toBeGreaterThan(0);
    });

    it('renders correctly in light mode', () => {
      mockColorScheme.mockReturnValue({
        colorScheme: 'light',
        setColorScheme: jest.fn(),
        toggleColorScheme: jest.fn(),
      });

      const { getAllByTestId } = render(<SharedTabs tabs={sampleTabs} />);
      expect(getAllByTestId('box').length).toBeGreaterThan(0);
    });
  });

  describe('Orientation Support', () => {
    it('renders correctly in portrait mode', () => {
      mockWindowDimensions.mockReturnValue({
        width: 375,
        height: 812,
        scale: 2,
        fontScale: 1,
      });

      const { getAllByTestId } = render(<SharedTabs tabs={sampleTabs} />);
      expect(getAllByTestId('box').length).toBeGreaterThan(0);
    });

    it('renders correctly in landscape mode', () => {
      mockWindowDimensions.mockReturnValue({
        width: 812,
        height: 375,
        scale: 2,
        fontScale: 1,
      });

      const { getAllByTestId } = render(<SharedTabs tabs={sampleTabs} />);
      expect(getAllByTestId('box').length).toBeGreaterThan(0);
    });
  });

  describe('Internationalization', () => {
    it('translates string titles using t function', () => {
      render(<SharedTabs tabs={sampleTabs} />);

      expect(mockT).toHaveBeenCalledWith('Home');
      expect(mockT).toHaveBeenCalledWith('Profile');
      expect(mockT).toHaveBeenCalledWith('Settings');
    });

    it('renders React node titles without translation', () => {
      const tabsWithNodeTitles: TabItem[] = [
        {
          key: 'home',
          title: <View testID="custom-title"><RNText>Custom Title</RNText></View>,
          content: <View testID="home-content"><RNText>Home Content</RNText></View>,
        },
      ];

      const { getByTestId } = render(<SharedTabs tabs={tabsWithNodeTitles} />);

      expect(getByTestId('custom-title')).toBeTruthy();
    });
  });

  describe('Custom Classes', () => {
    it('applies custom className', () => {
      const { getAllByTestId } = render(
        <SharedTabs tabs={sampleTabs} className="custom-class" />
      );

      const boxes = getAllByTestId('box');
      const rootBox = boxes.find(box => box.props.className?.includes('custom-class'));
      expect(rootBox).toBeTruthy();
    });

    it('applies custom tabClassName', () => {
      const { getAllByTestId } = render(
        <SharedTabs tabs={sampleTabs} tabClassName="custom-tab-class" />
      );

      const pressables = getAllByTestId('pressable');
      const customPressable = pressables.find(p => p.props.className?.includes('custom-tab-class'));
      expect(customPressable).toBeTruthy();
    });

    it('applies custom contentClassName', () => {
      const { getAllByTestId } = render(
        <SharedTabs tabs={sampleTabs} contentClassName="custom-content-class" />
      );

      const boxes = getAllByTestId('box');
      const contentBox = boxes.find(box => box.props.className?.includes('custom-content-class'));
      expect(contentBox).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('handles empty tabs array', () => {
      const { getAllByTestId } = render(<SharedTabs tabs={[]} />);
      expect(getAllByTestId('box').length).toBeGreaterThan(0);
    });

    it('handles single tab', () => {
      const singleTab: TabItem[] = [
        {
          key: 'only',
          title: 'Only Tab',
          content: <View testID="only-content"><RNText>Only Content</RNText></View>,
        },
      ];

      const { getByTestId } = render(<SharedTabs tabs={singleTab} />);
      expect(getByTestId('only-content')).toBeTruthy();
    });

    it('handles invalid initial index gracefully', () => {
      const { getAllByTestId } = render(
        <SharedTabs tabs={sampleTabs} initialIndex={10} />
      );
      expect(getAllByTestId('box').length).toBeGreaterThan(0);
    });
  });

  describe('State Management', () => {
    it('uses local state when no onChange callback is provided', () => {
      const { getAllByTestId, getByTestId } = render(<SharedTabs tabs={sampleTabs} />);

      const pressables = getAllByTestId('pressable');

      act(() => {
        fireEvent.press(pressables[1]);
      });

      expect(getByTestId('profile-content')).toBeTruthy();
    });

    it('uses external state management when onChange is provided', () => {
      const onChangeMock = jest.fn();
      const { getAllByTestId } = render(
        <SharedTabs tabs={sampleTabs} onChange={onChangeMock} />
      );

      const pressables = getAllByTestId('pressable');

      act(() => {
        fireEvent.press(pressables[1]);
      });

      expect(onChangeMock).toHaveBeenCalledWith(1);
    });
  });
});