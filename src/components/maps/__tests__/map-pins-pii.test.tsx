import { render, screen } from '@testing-library/react-native';
import React from 'react';

import { type MapMakerInfoData } from '@/models/v4/mapping/getMapDataAndMarkersData';
import { useSecurityStore } from '@/stores/security/store';

import MapPins from '../map-pins';

// Mock Mapbox components
jest.mock('@rnmapbox/maps', () => ({
  MarkerView: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock the security store
jest.mock('@/stores/security/store');
const mockUseSecurityStore = useSecurityStore as jest.MockedFunction<typeof useSecurityStore>;

// Mock PinMarker component
jest.mock('../pin-marker', () => {
  // Need to import React and React Native components here to avoid out-of-scope error
  const React = require('react');
  const { View, Text } = require('react-native');

  return function MockPinMarker({ title, imagePath }: { title: string; imagePath: string }) {
    return React.createElement(
      View,
      { testID: `pin-marker-${title}` },
      React.createElement(Text, null, title),
      React.createElement(Text, { testID: `imagepath-${title}` }, imagePath)
    );
  };
});

describe('MapPins PII Protection', () => {
  const mockOnPinPress = jest.fn();

  const callPin: MapMakerInfoData = {
    Id: '1',
    Title: 'Medical Emergency',
    Latitude: 40.7128,
    Longitude: -74.0060,
    ImagePath: 'call',
    InfoWindowContent: 'Emergency at Main St',
    Color: '#ff0000',
    Type: 1,
    zIndex: '1',
  };

  const personnelPin: MapMakerInfoData = {
    Id: '2',
    Title: 'John Doe',
    Latitude: 40.7580,
    Longitude: -73.9855,
    ImagePath: 'person_available',
    InfoWindowContent: 'Personnel location',
    Color: '#00ff00',
    Type: 2,
    zIndex: '2',
  };

  const unitPin: MapMakerInfoData = {
    Id: '3',
    Title: 'Engine 1',
    Latitude: 40.7489,
    Longitude: -73.9857,
    ImagePath: 'engine_available',
    InfoWindowContent: 'Unit location',
    Color: '#0000ff',
    Type: 3,
    zIndex: '3',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should show all pins when user can view PII', () => {
    mockUseSecurityStore.mockReturnValue({
      canUserViewPII: true,
    } as any);

    render(
      <MapPins
        pins={[callPin, personnelPin, unitPin]}
        onPinPress={mockOnPinPress}
      />
    );

    expect(screen.getByTestId('pin-marker-Medical Emergency')).toBeTruthy();
    expect(screen.getByTestId('pin-marker-John Doe')).toBeTruthy();
    expect(screen.getByTestId('pin-marker-Engine 1')).toBeTruthy();
  });

  it('should hide personnel pins when user cannot view PII', () => {
    mockUseSecurityStore.mockReturnValue({
      canUserViewPII: false,
    } as any);

    render(
      <MapPins
        pins={[callPin, personnelPin, unitPin]}
        onPinPress={mockOnPinPress}
      />
    );

    expect(screen.getByTestId('pin-marker-Medical Emergency')).toBeTruthy();
    expect(screen.queryByTestId('pin-marker-John Doe')).toBeFalsy();
    expect(screen.getByTestId('pin-marker-Engine 1')).toBeTruthy();
  });

  it('should filter out multiple personnel pins when PII cannot be viewed', () => {
    mockUseSecurityStore.mockReturnValue({
      canUserViewPII: false,
    } as any);

    const personnelPin2: MapMakerInfoData = {
      ...personnelPin,
      Id: '4',
      Title: 'Jane Smith',
      ImagePath: 'person_responding',
    };

    const personnelPin3: MapMakerInfoData = {
      ...personnelPin,
      Id: '5',
      Title: 'Bob Johnson',
      ImagePath: 'person_onscene',
    };

    render(
      <MapPins
        pins={[callPin, personnelPin, personnelPin2, personnelPin3, unitPin]}
        onPinPress={mockOnPinPress}
      />
    );

    expect(screen.getByTestId('pin-marker-Medical Emergency')).toBeTruthy();
    expect(screen.queryByTestId('pin-marker-John Doe')).toBeFalsy();
    expect(screen.queryByTestId('pin-marker-Jane Smith')).toBeFalsy();
    expect(screen.queryByTestId('pin-marker-Bob Johnson')).toBeFalsy();
    expect(screen.getByTestId('pin-marker-Engine 1')).toBeTruthy();
  });

  it('should handle different person ImagePath variations', () => {
    mockUseSecurityStore.mockReturnValue({
      canUserViewPII: false,
    } as any);

    const personnelPins: MapMakerInfoData[] = [
      { ...personnelPin, Id: '6', Title: 'Person 1', ImagePath: 'person' },
      { ...personnelPin, Id: '7', Title: 'Person 2', ImagePath: 'Person_Available' },
      { ...personnelPin, Id: '8', Title: 'Person 3', ImagePath: 'PERSON_RESPONDING' },
      { ...personnelPin, Id: '9', Title: 'Person 4', ImagePath: 'person_onscene' },
    ];

    render(
      <MapPins
        pins={[callPin, ...personnelPins, unitPin]}
        onPinPress={mockOnPinPress}
      />
    );

    expect(screen.getByTestId('pin-marker-Medical Emergency')).toBeTruthy();
    expect(screen.queryByTestId('pin-marker-Person 1')).toBeFalsy();
    expect(screen.queryByTestId('pin-marker-Person 2')).toBeFalsy();
    expect(screen.queryByTestId('pin-marker-Person 3')).toBeFalsy();
    expect(screen.queryByTestId('pin-marker-Person 4')).toBeFalsy();
    expect(screen.getByTestId('pin-marker-Engine 1')).toBeTruthy();
  });

  it('should handle empty pins array', () => {
    mockUseSecurityStore.mockReturnValue({
      canUserViewPII: false,
    } as any);

    const { UNSAFE_root } = render(
      <MapPins
        pins={[]}
        onPinPress={mockOnPinPress}
      />
    );

    expect(UNSAFE_root.children.length).toBe(0);
  });

  it('should handle pins with undefined or null ImagePath', () => {
    mockUseSecurityStore.mockReturnValue({
      canUserViewPII: false,
    } as any);

    const pinWithUndefinedImagePath: MapMakerInfoData = {
      ...callPin,
      Id: '10',
      Title: 'Pin Without ImagePath',
      ImagePath: undefined as any,
    };

    const pinWithNullImagePath: MapMakerInfoData = {
      ...callPin,
      Id: '11',
      Title: 'Pin With Null ImagePath',
      ImagePath: null as any,
    };

    render(
      <MapPins
        pins={[pinWithUndefinedImagePath, pinWithNullImagePath]}
        onPinPress={mockOnPinPress}
      />
    );

    expect(screen.getByTestId('pin-marker-Pin Without ImagePath')).toBeTruthy();
    expect(screen.getByTestId('pin-marker-Pin With Null ImagePath')).toBeTruthy();
  });

  it('should be case insensitive when filtering personnel pins', () => {
    mockUseSecurityStore.mockReturnValue({
      canUserViewPII: false,
    } as any);

    const personnelPinUppercase: MapMakerInfoData = {
      ...personnelPin,
      Id: '12',
      Title: 'Uppercase Person',
      ImagePath: 'PERSON_AVAILABLE',
    };

    const personnelPinMixedCase: MapMakerInfoData = {
      ...personnelPin,
      Id: '13',
      Title: 'Mixed Case Person',
      ImagePath: 'Person_Responding',
    };

    render(
      <MapPins
        pins={[callPin, personnelPinUppercase, personnelPinMixedCase, unitPin]}
        onPinPress={mockOnPinPress}
      />
    );

    expect(screen.getByTestId('pin-marker-Medical Emergency')).toBeTruthy();
    expect(screen.queryByTestId('pin-marker-Uppercase Person')).toBeFalsy();
    expect(screen.queryByTestId('pin-marker-Mixed Case Person')).toBeFalsy();
    expect(screen.getByTestId('pin-marker-Engine 1')).toBeTruthy();
  });
});
