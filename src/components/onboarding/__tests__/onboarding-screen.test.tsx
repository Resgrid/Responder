import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { ScrollView } from 'react-native';

import { OnboardingScreen } from '../onboarding-screen';

let mockWindow = { width: 320, height: 568, fontScale: 1, scale: 1 };
jest.mock('nativewind', () => ({ useColorScheme: () => ({ colorScheme: 'light' }), cssInterop: jest.fn() }));
jest.mock('@/components/ui', () => {
  const { View } = require('react-native');
  return { View, SafeAreaView: View, FocusAwareStatusBar: () => null };
});
jest.mock('@/components/ui/text', () => ({ Text: require('react-native').Text }));
jest.mock('@/components/ui/pressable', () => ({ Pressable: require('react-native').Pressable }));
jest.mock('lucide-react-native', () => ({ ChevronRight: () => null }));

const props = {
  title: 'Resgrid Responder',
  description: 'Stay connected to your department.',
  icon: null,
  currentIndex: 0,
  total: 3,
  skipLabel: 'Skip',
  nextLabel: 'Next',
  finishLabel: 'Get started',
  onSkip: jest.fn(),
  onNext: jest.fn(),
  onFinish: jest.fn(),
  onSlideChange: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  mockWindow = { width: 320, height: 568, fontScale: 1, scale: 1 };
  jest.spyOn(require('react-native'), 'useWindowDimensions').mockImplementation(() => mockWindow);
});

it.each([
  [320, 568, 1, 'column'],
  [844, 390, 1, 'row'],
  [768, 1024, 1, 'row'],
  [1024, 768, 2, 'column'],
] as const)('supports %s × %s with font scale %s', (width, height, fontScale, direction) => {
  mockWindow = { width, height, fontScale, scale: 1 };
  const screen = render(<OnboardingScreen {...props} />);
  expect(Object.assign({}, ...screen.getByTestId('onboarding-content').props.style.flat(Infinity)).flexDirection).toBe(direction);
  const title = screen.UNSAFE_getAllByType(require('react-native').Text).find((node) => node.props.children === props.title)!;
  expect(title.props.className).toContain(width < 360 ? 'leading-[36px]' : 'leading-[44px]');
  expect(title.props.numberOfLines).toBeUndefined();
  expect(screen.UNSAFE_getByType(ScrollView).props.contentContainerStyle.flexGrow).toBe(1);
  fireEvent.press(screen.getByTestId('next-button'));
  expect(props.onNext).toHaveBeenCalledTimes(1);
  screen.unmount();
});

it('reflows after rotation without resetting the selected step', () => {
  const screen = render(<OnboardingScreen {...props} currentIndex={1} />);
  mockWindow = { width: 844, height: 390, fontScale: 1, scale: 1 };
  screen.rerender(<OnboardingScreen {...props} currentIndex={1} />);
  const safeArea = screen.UNSAFE_getAllByType(require('react-native').View).find((view) => view.props.onLayout);
  fireEvent(safeArea!, 'layout', { nativeEvent: { layout: { width: 844 } } });
  expect(Object.assign({}, ...screen.getByTestId('onboarding-content').props.style.flat(Infinity)).flexDirection).toBe('row');
  expect(screen.getByRole('progressbar').props.accessibilityValue.now).toBe(2);
  screen.unmount();
});

it('ignores vertical scrolling and clamps swipes at the last step without completing', () => {
  const screen = render(<OnboardingScreen {...props} currentIndex={2} />);
  const content = screen.getByTestId('onboarding-flatlist');
  fireEvent(content, 'touchStart', { nativeEvent: { pageX: 280, pageY: 100 } });
  fireEvent(content, 'touchEnd', { nativeEvent: { pageX: 180, pageY: 400 } });
  expect(props.onSlideChange).not.toHaveBeenCalled();
  fireEvent(content, 'touchStart', { nativeEvent: { pageX: 280, pageY: 100 } });
  fireEvent(content, 'touchEnd', { nativeEvent: { pageX: 80, pageY: 110 } });
  expect(props.onSlideChange).toHaveBeenCalledWith(2);
  expect(props.onFinish).not.toHaveBeenCalled();
  fireEvent.press(screen.getByTestId('get-started-button'));
  expect(props.onFinish).toHaveBeenCalledTimes(1);
  screen.unmount();
});
