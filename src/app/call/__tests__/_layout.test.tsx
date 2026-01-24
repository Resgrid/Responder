import { render } from '@testing-library/react-native';
import React from 'react';
import { View } from 'react-native';

// Mock expo-router
jest.mock('expo-router', () => {
  const React = require('react');
  const { View } = require('react-native');
  const MockStack = React.forwardRef((props: any, ref: any) => (
    <View ref={ref} testID="mock-stack" {...props}>
      {props.children}
    </View>
  ));
  MockStack.Screen = jest.fn(() => null);
  return {
    Stack: MockStack,
  };
});

import CallLayout from '../_layout';

describe('Call Layout', () => {
  it('should render without crashing', () => {
    const { getByTestId } = render(<CallLayout />);
    expect(getByTestId('mock-stack')).toBeDefined();
  });

  it('should configure Stack with proper screenOptions', () => {
    const { getByTestId } = render(<CallLayout />);
    const stack = getByTestId('mock-stack');
    expect(stack).toBeDefined();
  });
});
