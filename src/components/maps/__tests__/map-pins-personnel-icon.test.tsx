import { act, render, screen } from '@testing-library/react-native';
import React from 'react';

import { MAP_ICONS } from '@/constants/map-icons';
import { type MapMakerInfoData } from '@/models/v4/mapping/getMapDataAndMarkersData';
import { securityStore } from '@/stores/security/store';

import MapPins from '../map-pins';

// Personnel (Type 3) pins rendered end to end: MapPins -> the real PinMarker -> the uploaded role icon or the bundled pin.

jest.mock('@rnmapbox/maps', () => ({
  MarkerView: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('expo-image', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    Image: (props: Record<string, unknown>) => React.createElement(View, { ...props, testID: 'expo-image' }),
  };
});

jest.mock('@/stores/security/store', () => ({
  securityStore: jest.fn(),
}));
const mockSecurityStore = securityStore as jest.MockedFunction<typeof securityStore>;

const mockCanUserViewPII = (canView: boolean) => {
  mockSecurityStore.mockImplementation((selector: any) => selector({ rights: { CanViewPII: canView } }));
};

// The pin image is decorative (the title is shown under it), so queries must opt in to hidden elements.
const HIDDEN = { includeHiddenElements: true };
const ROLE_ICON_URL = 'https://api.resgrid.dev/api/v4/TypeIcons/role-paramedic';
const UNIT_ICON_URL = 'https://api.resgrid.dev/api/v4/TypeIcons/unit-ambulance';

// As the Core map API sends a person: id `p{UserId}`, Type 3, ImagePath "Person_RespondingCall".
const personnelPin: MapMakerInfoData = {
  Id: 'pabc-123',
  Title: 'Jane Medic',
  Latitude: 40.758,
  Longitude: -73.9855,
  ImagePath: 'Person_RespondingCall',
  InfoWindowContent: '',
  Color: '',
  Type: 3,
  zIndex: '',
};

const unitPin: MapMakerInfoData = {
  Id: 'u7',
  Title: 'Medic 7',
  Latitude: 40.7489,
  Longitude: -73.9857,
  ImagePath: 'ambulance',
  InfoWindowContent: '',
  Color: '',
  Type: 1,
  zIndex: '',
};

// "Person_RespondingCall" resolves to the bundled person_respondingcall pin (it used to fall through to the call icon).
const bundledImages = (uri: unknown) => screen.UNSAFE_root.findAll((node) => node.props.source === uri && node.props.testID !== 'expo-image');
const bundledPersonPin = () => bundledImages(MAP_ICONS.person_respondingcall.uri);
const bundledCallPin = () => bundledImages(MAP_ICONS.call.uri);

describe('MapPins personnel role icons', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCanUserViewPII(true);
  });

  it('draws a personnel pin with the uploaded role icon, square at the standard pin size', () => {
    render(<MapPins pins={[{ ...personnelPin, IconUrl: ROLE_ICON_URL }]} />);

    const image = screen.getByTestId('expo-image', HIDDEN);
    expect(image.props.source).toEqual({ uri: ROLE_ICON_URL });
    expect(image.props.contentFit).toBe('contain');
    expect(image.props.style).toEqual({ width: 32, height: 32 });
    expect(bundledPersonPin()).toHaveLength(0);
    expect(screen.getByText('Jane Medic')).toBeTruthy();
  });

  it('draws the uploaded role icon at the same size as an uploaded unit type icon', () => {
    render(<MapPins pins={[{ ...personnelPin, IconUrl: ROLE_ICON_URL }, { ...unitPin, IconUrl: UNIT_ICON_URL }]} />);

    const images = screen.getAllByTestId('expo-image', HIDDEN);
    expect(images).toHaveLength(2);
    const byUrl = Object.fromEntries(images.map((image) => [image.props.source.uri, image.props.style]));
    expect(byUrl[ROLE_ICON_URL]).toEqual(byUrl[UNIT_ICON_URL]);
  });

  it('falls back to the bundled person pin when the uploaded role icon fails to load', () => {
    render(<MapPins pins={[{ ...personnelPin, IconUrl: ROLE_ICON_URL }]} />);

    act(() => {
      screen.getByTestId('expo-image', HIDDEN).props.onError({ error: 'boom' });
    });

    expect(screen.queryByTestId('expo-image', HIDDEN)).toBeNull();
    expect(bundledPersonPin().length).toBeGreaterThan(0);
    expect(bundledCallPin()).toHaveLength(0);
    expect(screen.getByText('Jane Medic')).toBeTruthy();
  });

  it('draws the bundled person pin, not the call icon, when there is no IconUrl', () => {
    expect(MAP_ICONS.person_respondingcall.uri).not.toBe(MAP_ICONS.call.uri);

    const { rerender } = render(<MapPins pins={[{ ...personnelPin, IconUrl: null }]} />);

    expect(screen.queryByTestId('expo-image', HIDDEN)).toBeNull();
    expect(bundledPersonPin().length).toBeGreaterThan(0);
    expect(bundledCallPin()).toHaveLength(0);

    // Older servers omit the field entirely.
    rerender(<MapPins pins={[personnelPin]} />);

    expect(screen.queryByTestId('expo-image', HIDDEN)).toBeNull();
    expect(bundledPersonPin().length).toBeGreaterThan(0);
    expect(screen.getByText('Jane Medic')).toBeTruthy();
  });

  it('hides a personnel pin that carries a role icon when the user cannot view PII', () => {
    mockCanUserViewPII(false);

    render(<MapPins pins={[{ ...personnelPin, IconUrl: ROLE_ICON_URL }, { ...unitPin, IconUrl: UNIT_ICON_URL }]} />);

    expect(screen.queryByText('Jane Medic')).toBeNull();
    const images = screen.getAllByTestId('expo-image', HIDDEN);
    expect(images).toHaveLength(1);
    expect(images[0]!.props.source).toEqual({ uri: UNIT_ICON_URL });
    expect(screen.getByText('Medic 7')).toBeTruthy();
  });

  it('hides a Type 3 pin without PII rights even when its ImagePath does not name a person', () => {
    mockCanUserViewPII(false);

    render(<MapPins pins={[{ ...personnelPin, ImagePath: '', IconUrl: ROLE_ICON_URL }, unitPin]} />);

    expect(screen.queryByText('Jane Medic')).toBeNull();
    expect(screen.queryByTestId('expo-image', HIDDEN)).toBeNull();
    expect(screen.getByText('Medic 7')).toBeTruthy();
  });
});
