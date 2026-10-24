import { act, render, screen } from '@testing-library/react-native';
import React from 'react';

import PoiPinMarker from '../poi-pin-marker';

jest.mock('expo-image', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    Image: (props: Record<string, unknown>) => React.createElement(View, { ...props, testID: 'expo-image' }),
  };
});

jest.mock('react-native-svg', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    __esModule: true,
    default: ({ children }: { children?: React.ReactNode }) => React.createElement(View, { testID: 'poi-shape' }, children),
    Path: () => null,
  };
});

jest.mock('../poi-icon', () => {
  const React = require('react');
  const { View } = require('react-native');

  return { PoiIcon: ({ name }: { name: string }) => React.createElement(View, { testID: `poi-icon-${name}` }) };
});

// The uploaded icon is decorative (the title is a separate label), so queries must opt in to hidden elements.
const HIDDEN = { includeHiddenElements: true };
const URL = 'https://api.resgrid.dev/api/v4/TypeIcons/poi1';

describe('PoiPinMarker', () => {
  it('renders the colored shape and icon when there is no uploaded icon', () => {
    render(<PoiPinMarker color="#ff0000" poiImage="map-icon-hospital" marker="MAP_PIN" title="Memorial" />);

    expect(screen.getByTestId('poi-shape')).toBeTruthy();
    expect(screen.getByTestId('poi-icon-hospital')).toBeTruthy();
    expect(screen.queryByTestId('expo-image', HIDDEN)).toBeNull();
  });

  it('renders the uploaded POI type icon in place of the shape', () => {
    render(<PoiPinMarker color="#ff0000" poiImage="map-icon-hospital" marker="MAP_PIN" iconUrl={URL} title="Memorial" />);

    const image = screen.getByTestId('expo-image', HIDDEN);
    expect(image.props.source).toEqual({ uri: URL });
    expect(image.props.contentFit).toBe('contain');
    expect(screen.queryByTestId('poi-shape', HIDDEN)).toBeNull();
    expect(screen.getByTestId('poi-marker-Memorial')).toBeTruthy();
  });

  it('falls back to the shape and icon when the uploaded icon fails to load', () => {
    render(<PoiPinMarker color="#ff0000" poiImage="map-icon-hospital" marker="MAP_PIN" iconUrl={URL} title="Memorial" />);

    act(() => {
      screen.getByTestId('expo-image', HIDDEN).props.onError({ error: 'boom' });
    });

    expect(screen.queryByTestId('expo-image', HIDDEN)).toBeNull();
    expect(screen.getByTestId('poi-shape')).toBeTruthy();
    expect(screen.getByTestId('poi-icon-hospital')).toBeTruthy();
  });
});
