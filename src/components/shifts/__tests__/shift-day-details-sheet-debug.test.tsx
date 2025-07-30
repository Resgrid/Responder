import { render } from '@testing-library/react-native';
import React from 'react';
import { Text, View } from 'react-native';

// Simple debug test to check basic rendering
describe('Debug Test', () => {
  it('should render a simple component', () => {
    const TestComponent = () => (
      <View>
        <Text>Hello World</Text>
      </View>
    );
    const { getByText } = render(<TestComponent />);
    expect(getByText('Hello World')).toBeTruthy();
  });
});
