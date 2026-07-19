import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { HeaderBackButton } from '../header-back-button';

jest.mock('lucide-react-native', () => ({
  ArrowLeftIcon: () => null,
}));

describe('HeaderBackButton', () => {
  it('renders with back-button testID', () => {
    render(<HeaderBackButton onPress={jest.fn()} />);

    expect(screen.getByTestId('back-button')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    render(<HeaderBackButton onPress={onPress} />);

    fireEvent.press(screen.getByTestId('back-button'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('has a fixed 40x40 wrapper so iOS 26 liquid glass headers cannot stretch it', () => {
    render(<HeaderBackButton onPress={jest.fn()} />);

    const button = screen.getByTestId('back-button-container');
    const flatStyle = Array.isArray(button.props.style) ? Object.assign({}, ...button.props.style.flat().filter(Boolean)) : button.props.style;

    expect(flatStyle).toEqual(
      expect.objectContaining({
        width: 40,
        height: 40,
      })
    );
  });
});
