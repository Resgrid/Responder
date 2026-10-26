import { act, render, screen } from '@testing-library/react-native';
import React from 'react';

import { MAP_ICONS } from '@/constants/map-icons';
import { type MapMakerInfoData } from '@/models/v4/mapping/getMapDataAndMarkersData';
import { securityStore } from '@/stores/security/store';

import MapPins from '../map-pins';

// Status/priority pins (Core's PinIconUrl) rendered end to end: MapPins -> the real PinMarker -> the recoloured pin, the
// uploaded icon or the bundled pin.

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
const PIN_BASE = 'https://api.resgrid.dev/api/v4/TypeIcons/Pins';
const UNIT_ICON_URL = 'https://api.resgrid.dev/api/v4/TypeIcons/unit-ambulance?s=responding&v=1';

// As the Core map API sends them: call 0 (`c`), unit 1 (`u`), personnel 3 (`p`).
const callPin: MapMakerInfoData = {
  Id: 'c1',
  Title: 'Structure Fire',
  Latitude: 40.7128,
  Longitude: -74.006,
  ImagePath: 'call',
  InfoWindowContent: '',
  Color: '',
  Type: 0,
  zIndex: '',
  PinIconUrl: `${PIN_BASE}/call-high?v=1`,
  IconStyle: 'high',
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
  PinIconUrl: `${PIN_BASE}/ambulance-responding?v=1`,
  IconStyle: 'responding',
};

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
  PinIconUrl: `${PIN_BASE}/person-responding?v=1`,
  IconStyle: 'responding',
};

const remoteUris = () => screen.queryAllByTestId('expo-image', HIDDEN).map((image) => image.props.source.uri);
const bundledImages = (uri: unknown) => screen.UNSAFE_root.findAll((node) => node.props.source === uri && node.props.testID !== 'expo-image');

describe('MapPins status/priority pins', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCanUserViewPII(true);
  });

  it('draws call, unit and personnel markers with their status/priority pins', () => {
    render(<MapPins pins={[callPin, unitPin, personnelPin]} />);

    expect(remoteUris().sort()).toEqual([callPin.PinIconUrl, unitPin.PinIconUrl, personnelPin.PinIconUrl].sort());
    expect(screen.getAllByTestId('pin-marker-status-pin', HIDDEN)).toHaveLength(3);
    expect(bundledImages(MAP_ICONS.call.uri)).toHaveLength(0);
    expect(bundledImages(MAP_ICONS.ambulance.uri)).toHaveLength(0);
    expect(bundledImages(MAP_ICONS.person_respondingcall.uri)).toHaveLength(0);
  });

  it('draws the uploaded icon instead of the status pin when the marker has one', () => {
    render(<MapPins pins={[{ ...unitPin, IconUrl: UNIT_ICON_URL }]} />);

    expect(remoteUris()).toEqual([UNIT_ICON_URL]);
    expect(screen.queryByTestId('pin-marker-status-pin', HIDDEN)).toBeNull();
  });

  it('draws the bundled pin when the server sends no status pin (stations, older servers)', () => {
    const { rerender } = render(<MapPins pins={[{ ...unitPin, PinIconUrl: null, IconStyle: null }]} />);

    expect(remoteUris()).toEqual([]);
    expect(bundledImages(MAP_ICONS.ambulance.uri).length).toBeGreaterThan(0);

    const { PinIconUrl: _pinIconUrl, IconStyle: _iconStyle, ...olderServerPin } = unitPin;
    rerender(<MapPins pins={[olderServerPin]} />);

    expect(remoteUris()).toEqual([]);
    expect(bundledImages(MAP_ICONS.ambulance.uri).length).toBeGreaterThan(0);
  });

  it('falls back to the bundled pin when the status pin fails to load', () => {
    render(<MapPins pins={[unitPin]} />);

    act(() => {
      screen.getByTestId('expo-image', HIDDEN).props.onError({ error: 'boom' });
    });

    expect(remoteUris()).toEqual([]);
    expect(bundledImages(MAP_ICONS.ambulance.uri).length).toBeGreaterThan(0);
    expect(screen.getByText('Medic 7')).toBeTruthy();
  });

  it('redraws a marker whose refetched data changes only its status pin', () => {
    const { rerender } = render(<MapPins pins={[unitPin]} />);
    expect(remoteUris()).toEqual([unitPin.PinIconUrl]);

    const onScenePinUrl = `${PIN_BASE}/ambulance-onscene?v=1`;
    rerender(<MapPins pins={[{ ...unitPin, PinIconUrl: onScenePinUrl, IconStyle: 'onscene' }]} />);

    expect(remoteUris()).toEqual([onScenePinUrl]);
  });

  it('keeps the status pin when a live location moves the marker', () => {
    const { rerender } = render(<MapPins pins={[unitPin]} />);

    rerender(<MapPins pins={[{ ...unitPin, Latitude: 40.75, Longitude: -73.99 }]} />);

    expect(remoteUris()).toEqual([unitPin.PinIconUrl]);
  });

  it('still hides personnel markers that carry a status pin when the user cannot view PII', () => {
    mockCanUserViewPII(false);

    render(<MapPins pins={[personnelPin, unitPin]} />);

    expect(screen.queryByText('Jane Medic')).toBeNull();
    expect(remoteUris()).toEqual([unitPin.PinIconUrl]);
  });
});
