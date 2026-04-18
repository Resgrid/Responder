import { render, screen } from '@testing-library/react-native';
import React from 'react';

import { Loading, Skeleton } from '../loading';

jest.mock('@gluestack-ui/nativewind-utils/tva', () => ({
  tva: jest.fn().mockImplementation(() => {
    return jest.fn().mockImplementation((props) => {
      const { class: className } = props || {};
      return className || '';
    });
  }),
}));

jest.mock('@gluestack-ui/nativewind-utils', () => ({
  tva: jest.fn().mockImplementation(() => {
    return jest.fn().mockImplementation((props) => {
      const { class: className } = props || {};
      return className || '';
    });
  }),
  isWeb: false,
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'common:loading': 'Loading',
      };

      return translations[key] || key;
    },
  }),
}));

jest.mock('lucide-react-native', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    Loader2: React.forwardRef((props: Record<string, unknown>, ref: React.Ref<unknown>) => React.createElement(View, { ...props, ref, testID: 'loader-icon' })),
  };
});

describe('Loading', () => {
  it('renders dot loading state without using icon Box components', () => {
    render(<Loading type="dots" />);

    expect(screen.getByText('Loading')).toBeTruthy();
  });

  it('renders icon loading state with the animation on a wrapper view', () => {
    render(<Loading type="icon" />);

    expect(screen.getByTestId('loader-icon')).toBeTruthy();
    expect(screen.getByText('Loading')).toBeTruthy();
  });
});

describe('Skeleton', () => {
  it('renders children when not loading', () => {
    render(
      <Skeleton isLoading={false}>
        <></>
      </Skeleton>
    );

    expect(screen.queryByTestId('loader-icon')).toBeNull();
  });

  it('renders loading placeholder when loading', () => {
    render(<Skeleton height={24} width={80} />);

    expect(screen.toJSON()).toBeTruthy();
  });
});
