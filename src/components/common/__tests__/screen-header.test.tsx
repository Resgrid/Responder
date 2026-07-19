import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

jest.mock('lucide-react-native', () => ({
  ArrowLeftIcon: () => null,
}));

import { ScreenHeader } from '../screen-header';

describe('ScreenHeader', () => {
  it('renders the title', () => {
    render(<ScreenHeader title="Tornado Warning" onBack={jest.fn()} />);

    expect(screen.getByText('Tornado Warning')).toBeTruthy();
  });

  it('calls onBack when the back button is pressed', () => {
    const onBack = jest.fn();
    render(<ScreenHeader title="Title" onBack={onBack} />);

    fireEvent.press(screen.getByTestId('back-button'));

    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
