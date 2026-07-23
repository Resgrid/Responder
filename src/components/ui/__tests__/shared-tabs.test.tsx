import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ScrollView } from 'react-native';
import { SharedTabs, TabItem } from '../shared-tabs';
import { Text } from '../text';
import { Box } from '../box';

// Mock dependencies
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('nativewind', () => ({
  useColorScheme: () => ({
    colorScheme: 'light',
  }),
  cssInterop: jest.fn(),
}));

describe('SharedTabs', () => {
  const mockTabs: TabItem[] = [
    {
      key: 'tab1',
      title: 'Tab 1',
      content: <Text>Content 1</Text>,
    },
    {
      key: 'tab2',
      title: 'Tab 2',
      content: <Text>Content 2</Text>,
    },
    {
      key: 'tab3',
      title: 'Tab 3',
      content: <Text>Content 3</Text>,
      badge: 5,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders tabs with default props', () => {
    const { getByText } = render(<SharedTabs tabs={mockTabs} />);

    expect(getByText('Tab 1')).toBeTruthy();
    expect(getByText('Tab 2')).toBeTruthy();
    expect(getByText('Tab 3')).toBeTruthy();
    expect(getByText('Content 1')).toBeTruthy();
  });

  it('renders tabs with custom title font size', () => {
    const { getByText } = render(<SharedTabs tabs={mockTabs} titleFontSize="text-lg" />);

    const tab1 = getByText('Tab 1');
    expect(tab1).toBeTruthy();
    // Note: In a real test environment, you'd check the style properties
    // This is a basic smoke test to ensure the component renders
  });

  it('renders tabs with different sizes', () => {
    const { getByText } = render(<SharedTabs tabs={mockTabs} size="lg" />);

    expect(getByText('Tab 1')).toBeTruthy();
    expect(getByText('Content 1')).toBeTruthy();
  });

  it('renders tabs with different variants', () => {
    const { getByText } = render(<SharedTabs tabs={mockTabs} variant="pills" />);

    expect(getByText('Tab 1')).toBeTruthy();
    expect(getByText('Content 1')).toBeTruthy();
  });

  it('renders compact small segmented tabs', () => {
    const { getByText } = render(<SharedTabs tabs={mockTabs} variant="segmented" size="sm" />);

    expect(getByText('Tab 1')).toBeTruthy();
    expect(getByText('Content 1')).toBeTruthy();
  });

  it('handles tab press correctly', () => {
    const mockOnChange = jest.fn();
    const { getByText } = render(<SharedTabs tabs={mockTabs} onChange={mockOnChange} />);

    fireEvent.press(getByText('Tab 2'));
    expect(mockOnChange).toHaveBeenCalledWith(1);
  });

  it('renders badge when provided', () => {
    const { getByText } = render(<SharedTabs tabs={mockTabs} />);

    expect(getByText('5')).toBeTruthy();
  });

  it('renders with initial index', () => {
    const { getByText } = render(<SharedTabs tabs={mockTabs} initialIndex={1} />);

    expect(getByText('Content 2')).toBeTruthy();
  });

  it('renders with custom font size for small text', () => {
    const { getByText } = render(<SharedTabs tabs={mockTabs} titleFontSize="text-2xs" />);

    expect(getByText('Tab 1')).toBeTruthy();
  });

  it('renders with custom font size for large text', () => {
    const { getByText } = render(<SharedTabs tabs={mockTabs} titleFontSize="text-xl" />);

    expect(getByText('Tab 1')).toBeTruthy();
  });

  it('renders non-scrollable tabs', () => {
    const { getByText } = render(<SharedTabs tabs={mockTabs} scrollable={false} />);

    expect(getByText('Tab 1')).toBeTruthy();
    expect(getByText('Content 1')).toBeTruthy();
  });

  it('renders React.ReactNode title', () => {
    const tabsWithNodeTitle: TabItem[] = [
      {
        key: 'tab1',
        title: <Text>Custom Title</Text>,
        content: <Text>Content 1</Text>,
      },
    ];

    const { getByText } = render(<SharedTabs tabs={tabsWithNodeTitle} />);

    expect(getByText('Custom Title')).toBeTruthy();
    expect(getByText('Content 1')).toBeTruthy();
  });

  it('renders with icon', () => {
    const tabsWithIcon: TabItem[] = [
      {
        key: 'tab1',
        title: 'Tab 1',
        content: <Text>Content 1</Text>,
        icon: <Text>🔥</Text>,
      },
    ];

    const { getByText } = render(<SharedTabs tabs={tabsWithIcon} />);

    expect(getByText('🔥')).toBeTruthy();
    expect(getByText('Tab 1')).toBeTruthy();
  });

  it('renders tab titles on a single line', () => {
    const { getByText } = render(<SharedTabs tabs={mockTabs} />);

    expect(getByText('Tab 1').props.numberOfLines).toBe(1);
  });

  it('renders single-line titles for non-scrollable tabs', () => {
    const { getByText } = render(<SharedTabs tabs={mockTabs} scrollable={false} />);

    expect(getByText('Tab 1').props.numberOfLines).toBe(1);
  });

  it('shows no overflow indicators when tabs fit the container', () => {
    const { UNSAFE_getByType, queryByTestId } = render(<SharedTabs tabs={mockTabs} scrollable={true} />);

    const scrollView = UNSAFE_getByType(ScrollView);
    fireEvent(scrollView, 'layout', { nativeEvent: { layout: { width: 400, height: 40, x: 0, y: 0 } } });
    fireEvent(scrollView, 'contentSizeChange', 300, 40);

    expect(queryByTestId('tabs-scroll-indicator-left')).toBeNull();
    expect(queryByTestId('tabs-scroll-indicator-right')).toBeNull();
  });

  it('shows the right overflow indicator when tabs extend past the container', () => {
    const { UNSAFE_getByType, queryByTestId } = render(<SharedTabs tabs={mockTabs} scrollable={true} />);

    const scrollView = UNSAFE_getByType(ScrollView);
    fireEvent(scrollView, 'layout', { nativeEvent: { layout: { width: 200, height: 40, x: 0, y: 0 } } });
    fireEvent(scrollView, 'contentSizeChange', 500, 40);

    expect(queryByTestId('tabs-scroll-indicator-left')).toBeNull();
    expect(queryByTestId('tabs-scroll-indicator-right')).toBeTruthy();
  });

  it('shows the left overflow indicator after scrolling to the end', () => {
    const { UNSAFE_getByType, queryByTestId } = render(<SharedTabs tabs={mockTabs} scrollable={true} />);

    const scrollView = UNSAFE_getByType(ScrollView);
    fireEvent(scrollView, 'layout', { nativeEvent: { layout: { width: 200, height: 40, x: 0, y: 0 } } });
    fireEvent(scrollView, 'contentSizeChange', 500, 40);
    fireEvent.scroll(scrollView, { nativeEvent: { contentOffset: { x: 300 }, contentSize: { width: 500, height: 40 }, layoutMeasurement: { width: 200, height: 40 } } });

    expect(queryByTestId('tabs-scroll-indicator-left')).toBeTruthy();
    expect(queryByTestId('tabs-scroll-indicator-right')).toBeNull();
  });

  it('shows both overflow indicators when scrolled to the middle', () => {
    const { UNSAFE_getByType, queryByTestId } = render(<SharedTabs tabs={mockTabs} scrollable={true} />);

    const scrollView = UNSAFE_getByType(ScrollView);
    fireEvent(scrollView, 'layout', { nativeEvent: { layout: { width: 200, height: 40, x: 0, y: 0 } } });
    fireEvent(scrollView, 'contentSizeChange', 500, 40);
    fireEvent.scroll(scrollView, { nativeEvent: { contentOffset: { x: 150 }, contentSize: { width: 500, height: 40 }, layoutMeasurement: { width: 200, height: 40 } } });

    expect(queryByTestId('tabs-scroll-indicator-left')).toBeTruthy();
    expect(queryByTestId('tabs-scroll-indicator-right')).toBeTruthy();
  });
});
