import { render, screen } from '@testing-library/react-native';
import React from 'react';

import { PoiListPanel } from '../poi-list-panel';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, fallback?: unknown) => (typeof fallback === 'string' ? fallback : key) }),
}));

jest.mock('@shopify/flash-list', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    FlashList: ({ data, renderItem, keyExtractor }: { data: unknown[]; renderItem: (info: { item: unknown; index: number }) => React.ReactNode; keyExtractor: (item: unknown) => string }) =>
      React.createElement(
        View,
        null,
        data.map((item, index) => React.createElement(View, { key: keyExtractor(item) }, renderItem({ item, index })))
      ),
  };
});

jest.mock('@/components/maps/poi-filter-bottom-sheet', () => ({ PoiFilterBottomSheet: () => null }));

jest.mock('lucide-react-native', () => {
  const MockIcon = () => null;
  return { FilterIcon: MockIcon, MapIcon: MockIcon, SearchIcon: MockIcon, XIcon: MockIcon };
});

jest.mock('expo-image', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    Image: (props: any) => React.createElement(View, { ...props, testID: 'expo-image' }),
  };
});

const URL = 'https://api.resgrid.dev/api/v4/TypeIcons/hospital';

const mockPoiState = {
  poiTypes: [],
  pois: [
    {
      PoiId: 1,
      PoiTypeId: 7,
      PoiTypeName: 'Hospital',
      Name: 'Memorial',
      Address: '1 Main St',
      Note: '',
      Latitude: 1,
      Longitude: 2,
      Color: '',
      ImagePath: '',
      PoiImage: '',
      Marker: '',
      IsDestination: false,
      IconUrl: URL,
    },
    { PoiId: 2, PoiTypeId: 8, PoiTypeName: 'Shelter', Name: 'North Shelter', Address: '2 Main St', Note: '', Latitude: 1, Longitude: 2, Color: '', ImagePath: '', PoiImage: '', Marker: '', IsDestination: false },
  ],
  isLoading: false,
  error: null,
};

jest.mock('@/stores/poi/store', () => ({
  usePoiStore: (selector: (state: typeof mockPoiState) => unknown) => selector(mockPoiState),
}));

// The type icon is decorative (hidden from accessibility), so queries must opt in to hidden elements.
const HIDDEN = { includeHiddenElements: true };

describe('PoiListPanel POI type icons', () => {
  it("shows the POI type's uploaded icon next to POIs that have one, and the name alone otherwise", () => {
    render(<PoiListPanel onPoiPress={jest.fn()} onViewOnMap={jest.fn()} />);

    expect(screen.getByText('Memorial')).toBeTruthy();
    expect(screen.getByText('North Shelter')).toBeTruthy();
    expect(screen.getByTestId('poi-type-icon-1', HIDDEN)).toBeTruthy();
    expect(screen.getByTestId('expo-image', HIDDEN).props.source).toEqual({ uri: URL });
    expect(screen.queryByTestId('poi-type-icon-2', HIDDEN)).toBeNull();
  });
});
