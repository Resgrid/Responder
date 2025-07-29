import { render } from '@testing-library/react-native';
import React from 'react';
import { Text, View } from 'react-native';

// Simple test to verify the test setup works
describe('Simple Test', () => {
  it('should run basic test', () => {
    expect(1 + 1).toBe(2);
  });

  it('should render React Native component', () => {
    const TestComponent = () => React.createElement(View, {},
      React.createElement(Text, {}, 'Hello World')
    );
    const result = render(React.createElement(TestComponent));

    // Try using queryByText which returns null if not found instead of throwing
    const textElement = result.queryByText('Hello World');
    expect(textElement).toBeTruthy();
  });
});
