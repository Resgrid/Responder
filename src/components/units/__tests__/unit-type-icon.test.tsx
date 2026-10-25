import { act, render, screen } from '@testing-library/react-native';
import React from 'react';
import { Text } from 'react-native';

import { MAP_ICONS } from '@/constants/map-icons';

import { resolveUnitTypeMapIconKey, TypeIcon, UnitTypeIcon } from '../unit-type-icon';

jest.mock('expo-image', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    Image: (props: Record<string, unknown>) => React.createElement(View, { ...props, testID: 'expo-image' }),
  };
});

// The icon is decorative (hidden from accessibility), so queries must opt in to hidden elements.
const HIDDEN = { includeHiddenElements: true };
const URL = 'https://api.resgrid.dev/api/v4/UnitTypeIcons/abc123';

describe('resolveUnitTypeMapIconKey', () => {
  it('returns the bundled key for a built-in icon name', () => {
    expect(resolveUnitTypeMapIconKey('ambulance')).toBe('ambulance');
    expect(resolveUnitTypeMapIconKey('fourbyfour')).toBe('fourbyfour');
  });

  it('tolerates enum-cased and separated names from older servers', () => {
    expect(resolveUnitTypeMapIconKey('CarTwo')).toBe('cartwo');
    expect(resolveUnitTypeMapIconKey(' Ambulance ')).toBe('ambulance');
    expect(resolveUnitTypeMapIconKey('engine_available')).toBe('engine_available');
  });

  it('returns null for missing or unknown names', () => {
    expect(resolveUnitTypeMapIconKey(undefined)).toBeNull();
    expect(resolveUnitTypeMapIconKey(null)).toBeNull();
    expect(resolveUnitTypeMapIconKey('')).toBeNull();
    expect(resolveUnitTypeMapIconKey('not-an-icon')).toBeNull();
    expect(resolveUnitTypeMapIconKey('toString')).toBeNull();
  });
});

describe('UnitTypeIcon', () => {
  it('renders the uploaded icon when there is a url', () => {
    render(<UnitTypeIcon iconUrl={URL} mapIcon="ambulance" size={30} testID="type-icon" fallback={<Text>fallback</Text>} />);

    const image = screen.getByTestId('expo-image', HIDDEN);
    expect(image.props.source).toEqual({ uri: URL });
    expect(image.props.contentFit).toBe('contain');
    expect(image.props.cachePolicy).toBe('memory-disk');
    expect(image.props.style).toEqual({ width: 30, height: 30 });
    expect(screen.getByTestId('type-icon', HIDDEN).props.importantForAccessibility).toBe('no-hide-descendants');
    expect(screen.queryByText('fallback')).toBeNull();
  });

  it('renders the bundled map icon when there is no url', () => {
    render(<UnitTypeIcon iconUrl={null} mapIcon="ambulance" testID="type-icon" fallback={<Text>fallback</Text>} />);

    const image = screen.getByTestId('expo-image', HIDDEN);
    expect(image.props.source).toBe(MAP_ICONS.ambulance.uri);
    expect(image.props.contentFit).toBe('contain');
    expect(image.props.style).toEqual({ width: 24, height: 24 });
    expect(screen.queryByText('fallback')).toBeNull();
  });

  it('passes a requested content fit through to the uploaded and the bundled image', () => {
    const { rerender } = render(<UnitTypeIcon iconUrl={URL} size={32} contentFit="cover" testID="type-icon" />);

    expect(screen.getByTestId('expo-image', HIDDEN).props.contentFit).toBe('cover');
    expect(screen.getByTestId('expo-image', HIDDEN).props.style).toEqual({ width: 32, height: 32 });

    rerender(<UnitTypeIcon mapIcon="ambulance" size={32} contentFit="cover" testID="type-icon" />);

    expect(screen.getByTestId('expo-image', HIDDEN).props.source).toBe(MAP_ICONS.ambulance.uri);
    expect(screen.getByTestId('expo-image', HIDDEN).props.contentFit).toBe('cover');
  });

  it('renders the fallback when there is neither a url nor a known map icon', () => {
    render(<UnitTypeIcon mapIcon="unknown" testID="type-icon" fallback={<Text>fallback</Text>} />);

    expect(screen.getByText('fallback')).toBeTruthy();
    expect(screen.queryByTestId('expo-image', HIDDEN)).toBeNull();
    expect(screen.queryByTestId('type-icon')).toBeNull();
  });

  it('renders nothing by default when there is nothing to show (older servers)', () => {
    const { toJSON } = render(<UnitTypeIcon testID="type-icon" />);

    expect(toJSON()).toBeNull();
  });

  it('falls back to the bundled map icon when the uploaded icon fails to load', () => {
    render(<UnitTypeIcon iconUrl={URL} mapIcon="ambulance" testID="type-icon" fallback={<Text>fallback</Text>} />);

    act(() => {
      screen.getByTestId('expo-image', HIDDEN).props.onError({ error: 'boom' });
    });

    expect(screen.getByTestId('expo-image', HIDDEN).props.source).toBe(MAP_ICONS.ambulance.uri);
    expect(screen.queryByText('fallback')).toBeNull();
  });

  it('falls back to the fallback when the uploaded icon fails and there is no map icon', () => {
    render(<UnitTypeIcon iconUrl={URL} testID="type-icon" fallback={<Text>fallback</Text>} />);

    act(() => {
      screen.getByTestId('expo-image', HIDDEN).props.onError({ error: 'boom' });
    });

    expect(screen.getByText('fallback')).toBeTruthy();
    expect(screen.queryByTestId('expo-image', HIDDEN)).toBeNull();
  });

  it('tries a new url after an earlier one failed', () => {
    const { rerender } = render(<UnitTypeIcon iconUrl={URL} testID="type-icon" fallback={<Text>fallback</Text>} />);

    act(() => {
      screen.getByTestId('expo-image', HIDDEN).props.onError({ error: 'boom' });
    });
    expect(screen.getByText('fallback')).toBeTruthy();

    rerender(<UnitTypeIcon iconUrl={`${URL}-v2`} testID="type-icon" fallback={<Text>fallback</Text>} />);

    expect(screen.getByTestId('expo-image', HIDDEN).props.source).toEqual({ uri: `${URL}-v2` });
  });
});

describe('TypeIcon', () => {
  it('is the same component under a type-neutral name for call and POI type icons', () => {
    expect(TypeIcon).toBe(UnitTypeIcon);

    render(<TypeIcon iconUrl={URL} testID="poi-type-icon" />);

    expect(screen.getByTestId('expo-image', HIDDEN).props.source).toEqual({ uri: URL });
  });
});
