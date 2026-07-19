import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

jest.mock('@rnmapbox/maps', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: {
      MapView: ({ children }: { children?: React.ReactNode }) => <View testID="mapbox-map-view">{children}</View>,
      Camera: () => null,
      PointAnnotation: ({ children }: { children?: React.ReactNode }) => <View testID="mapbox-point-annotation">{children}</View>,
      UserLocation: () => null,
      ShapeSource: ({ children }: { children?: React.ReactNode }) => <View testID="mapbox-shape-source">{children}</View>,
      FillLayer: () => null,
      LineLayer: () => null,
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

  it('renders the area polygon instead of the point marker when a polygon is provided', () => {
    const polygon: [number, number][] = [
      [-104.9, 39.7],
      [-104.8, 39.7],
      [-104.8, 39.8],
    ];
    render(<FullScreenMapModal {...baseProps} polygon={polygon} />);

    expect(screen.getByTestId('mapbox-shape-source')).toBeTruthy();
    expect(screen.queryByTestId('mapbox-point-annotation')).toBeNull();
  });

  it('renders the point marker when no polygon is provided', () => {
    render(<FullScreenMapModal {...baseProps} />);

    expect(screen.getByTestId('mapbox-point-annotation')).toBeTruthy();
    expect(screen.queryByTestId('mapbox-shape-source')).toBeNull();
  });
});
