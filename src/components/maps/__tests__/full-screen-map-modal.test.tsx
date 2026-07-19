import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

jest.mock('@rnmapbox/maps', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: {
      MapView: ({ children }: { children?: React.ReactNode }) => <View testID="mapbox-map-view">{children}</View>,
      Camera: () => null,
      PointAnnotation: ({ children }: { children?: React.ReactNode }) => <View>{children}</View>,
      UserLocation: () => null,
    },
  };
});

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('lucide-react-native', () => ({
  XIcon: () => null,
}));

jest.mock('@/lib/env', () => ({
  Env: { RESPOND_MAPBOX_PUBKEY: 'pk.test' },
}));

import FullScreenMapModal from '../full-screen-map-modal';

describe('FullScreenMapModal', () => {
  const baseProps = {
    isOpen: true,
    onClose: jest.fn(),
    latitude: 39.7392,
    longitude: -104.9903,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the interactive map when open and configured', () => {
    render(<FullScreenMapModal {...baseProps} />);

    expect(screen.getByTestId('full-screen-map-modal')).toBeTruthy();
    expect(screen.getByTestId('mapbox-map-view')).toBeTruthy();
  });

  it('calls onClose when the close button is pressed', () => {
    render(<FullScreenMapModal {...baseProps} />);

    fireEvent.press(screen.getByTestId('full-screen-map-close'));

    expect(baseProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('shows the address overlay when an address is provided', () => {
    render(<FullScreenMapModal {...baseProps} address="123 Main St" />);

    expect(screen.getByText('123 Main St')).toBeTruthy();
  });
});
