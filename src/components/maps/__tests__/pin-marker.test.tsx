import { act, render, screen } from '@testing-library/react-native';
import React from 'react';

import { MAP_ICONS } from '@/constants/map-icons';

import PinMarker from '../pin-marker';

jest.mock('expo-image', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    Image: (props: Record<string, unknown>) => React.createElement(View, { ...props, testID: 'expo-image' }),
  };
});

// The pin's image is decorative (the title is shown under it), so queries must opt in to hidden elements.
const HIDDEN = { includeHiddenElements: true };
const URL = 'https://api.resgrid.dev/api/v4/UnitTypeIcons/abc';

const bundledImage = () => screen.UNSAFE_root.findAll((node) => node.props.source === MAP_ICONS.ambulance.uri && node.props.testID !== 'expo-image');

describe('PinMarker', () => {
  it('shows the bundled icon resolved from the pin when there is no uploaded icon', () => {
    render(<PinMarker imagePath="ambulance" title="Medic 1" />);

    expect(screen.queryByTestId('expo-image', HIDDEN)).toBeNull();
    expect(bundledImage().length).toBeGreaterThan(0);
    expect(screen.getByText('Medic 1')).toBeTruthy();
  });

  it('shows the uploaded unit type icon in the same footprint as the bundled pin', () => {
    render(<PinMarker imagePath="ambulance" title="Medic 1" iconUrl={URL} size={32} />);

    const image = screen.getByTestId('expo-image', HIDDEN);
    expect(image.props.source).toEqual({ uri: URL });
    expect(image.props.contentFit).toBe('contain');
    expect(image.props.style).toEqual({ width: 32, height: 32 });
    expect(bundledImage()).toHaveLength(0);
    expect(screen.getByText('Medic 1')).toBeTruthy();
  });

  it('falls back to the bundled icon when the uploaded icon fails to load', () => {
    render(<PinMarker imagePath="ambulance" title="Medic 1" iconUrl={URL} />);

    act(() => {
      screen.getByTestId('expo-image', HIDDEN).props.onError({ error: 'boom' });
    });

    expect(screen.queryByTestId('expo-image', HIDDEN)).toBeNull();
    expect(bundledImage().length).toBeGreaterThan(0);
  });

  // Core sends "Person_RespondingCall" for people and "Engine_Responding" for units without a built-in icon; those
  // names used to lose their "_" during resolution and fall through to the call icon.
  it.each([
    ['Person_RespondingCall', 'person_respondingcall'],
    ['Engine_Responding', 'engine_responding'],
  ] as const)('draws the bundled %s pin from its underscore name instead of the call icon', (imagePath, key) => {
    render(<PinMarker imagePath={imagePath} title="Pin" />);

    const drawn = (uri: unknown) => screen.UNSAFE_root.findAll((node) => node.props.source === uri && node.props.testID !== 'expo-image');
    expect(drawn(MAP_ICONS[key].uri).length).toBeGreaterThan(0);
    expect(drawn(MAP_ICONS.call.uri)).toHaveLength(0);
  });
});

// Core's PinIconUrl: the built-in pin recoloured to the call's priority or the unit's/person's status.
describe('PinMarker status/priority pin', () => {
  const PIN_URL = 'https://api.resgrid.dev/api/v4/TypeIcons/Pins/ambulance-responding?v=1';

  const remoteImages = () => screen.queryAllByTestId('expo-image', HIDDEN);

  it('draws the status pin in place of the bundled pin, in the same box and fit, untinted', () => {
    render(<PinMarker imagePath="ambulance" title="Medic 1" pinIconUrl={PIN_URL} size={32} />);

    const image = screen.getByTestId('expo-image', HIDDEN);
    expect(image.props.source).toEqual({ uri: PIN_URL });
    // The bundled pin is a 32 x 37 PNG drawn into a size x size box with resizeMode "cover"; the status pin matches it.
    expect(image.props.style).toEqual({ width: 32, height: 32 });
    expect(image.props.contentFit).toBe('cover');
    expect(image.props.cachePolicy).toBe('memory-disk');
    expect(image.props.tintColor).toBeUndefined();
    expect(screen.getByTestId('pin-marker-status-pin', HIDDEN)).toBeTruthy();
    expect(bundledImage()).toHaveLength(0);
    expect(screen.getByText('Medic 1')).toBeTruthy();
  });

  it('prefers the uploaded icon over the status pin', () => {
    render(<PinMarker imagePath="ambulance" title="Medic 1" iconUrl={URL} pinIconUrl={PIN_URL} />);

    const images = remoteImages();
    expect(images).toHaveLength(1);
    expect(images[0]!.props.source).toEqual({ uri: URL });
    expect(images[0]!.props.contentFit).toBe('contain');
    expect(screen.queryByTestId('pin-marker-status-pin', HIDDEN)).toBeNull();
    expect(bundledImage()).toHaveLength(0);
  });

  it('falls back to the bundled pin when the status pin fails to load', () => {
    render(<PinMarker imagePath="ambulance" title="Medic 1" pinIconUrl={PIN_URL} />);

    act(() => {
      screen.getByTestId('expo-image', HIDDEN).props.onError({ error: 'boom' });
    });

    expect(remoteImages()).toHaveLength(0);
    expect(bundledImage().length).toBeGreaterThan(0);
    expect(screen.getByText('Medic 1')).toBeTruthy();
  });

  it('falls back from a failed uploaded icon to the status pin, then to the bundled pin', () => {
    render(<PinMarker imagePath="ambulance" title="Medic 1" iconUrl={URL} pinIconUrl={PIN_URL} />);

    act(() => {
      screen.getByTestId('expo-image', HIDDEN).props.onError({ error: 'boom' });
    });

    expect(screen.getByTestId('expo-image', HIDDEN).props.source).toEqual({ uri: PIN_URL });
    expect(bundledImage()).toHaveLength(0);

    act(() => {
      screen.getByTestId('expo-image', HIDDEN).props.onError({ error: 'boom' });
    });

    expect(remoteImages()).toHaveLength(0);
    expect(bundledImage().length).toBeGreaterThan(0);
  });

  it.each([null, undefined, '', '   ', '/api/v4/TypeIcons/Pins/ambulance-responding', 'data:image/png;base64,AAAA', 'javascript:alert(1)'])('draws the bundled pin when PinIconUrl is %p', (pinIconUrl) => {
    render(<PinMarker imagePath="ambulance" title="Medic 1" pinIconUrl={pinIconUrl} />);

    expect(remoteImages()).toHaveLength(0);
    expect(bundledImage().length).toBeGreaterThan(0);
  });

  it('redraws when only the status pin changes', () => {
    const NEXT_PIN_URL = 'https://api.resgrid.dev/api/v4/TypeIcons/Pins/ambulance-onscene?v=1';
    const { rerender } = render(<PinMarker imagePath="ambulance" title="Medic 1" pinIconUrl={PIN_URL} />);

    rerender(<PinMarker imagePath="ambulance" title="Medic 1" pinIconUrl={NEXT_PIN_URL} />);

    expect(screen.getByTestId('expo-image', HIDDEN).props.source).toEqual({ uri: NEXT_PIN_URL });
  });

  it('tries the next status pin after an earlier one failed', () => {
    const NEXT_PIN_URL = 'https://api.resgrid.dev/api/v4/TypeIcons/Pins/ambulance-onscene?v=1';
    const { rerender } = render(<PinMarker imagePath="ambulance" title="Medic 1" pinIconUrl={PIN_URL} />);

    act(() => {
      screen.getByTestId('expo-image', HIDDEN).props.onError({ error: 'boom' });
    });
    expect(bundledImage().length).toBeGreaterThan(0);

    rerender(<PinMarker imagePath="ambulance" title="Medic 1" pinIconUrl={NEXT_PIN_URL} />);

    expect(screen.getByTestId('expo-image', HIDDEN).props.source).toEqual({ uri: NEXT_PIN_URL });
    expect(bundledImage()).toHaveLength(0);
  });
});
