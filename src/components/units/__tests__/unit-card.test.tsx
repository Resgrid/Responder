import { render, screen } from '@testing-library/react-native';
import React from 'react';

import { type StatusesResultData } from '@/models/v4/statuses/statusesResultData';
import { type UnitTypeStatusResultData } from '@/models/v4/statuses/unitTypeStatusResultData';
import { type UnitInfoResultData } from '@/models/v4/units/unitInfoResultData';

import { UnitCard } from '../unit-card';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

// The card's lucide icons (generic truck, location pin) render through the ui Icon; tag them so the tests can count them.
jest.mock('../../ui/icon', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    Icon: () => React.createElement(View, { testID: 'ui-icon' }),
  };
});

jest.mock('expo-image', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    Image: (props: any) => React.createElement(View, { ...props, testID: 'expo-image' }),
  };
});

const createStatus = (overrides: Partial<StatusesResultData>): StatusesResultData => ({
  Id: 0,
  Type: 0,
  StateId: 0,
  Text: '',
  BColor: '#2563eb',
  Color: '#ffffff',
  Gps: false,
  Note: 0,
  Detail: 0,
  ...overrides,
});

const createUnit = (overrides: Partial<UnitInfoResultData>): UnitInfoResultData => ({
  UnitId: 'unit-1',
  DepartmentId: '1',
  Name: 'Engine 1',
  Type: 'Engine',
  TypeId: 1,
  CustomStatusSetId: '',
  GroupId: '',
  GroupName: '',
  Vin: '',
  PlateNumber: '',
  FourWheelDrive: false,
  SpecialPermit: false,
  CurrentDestinationId: '',
  CurrentDestinationName: '',
  CurrentStatusId: '',
  CurrentStatus: 'Server Status Text',
  CurrentStatusColor: '',
  CurrentStatusTimestampUtc: '',
  Latitude: '',
  Longitude: '',
  Note: '',
  Roles: [],
  ...overrides,
});

// Set 12 is the department's "Engine statuses" set, but the unit type has since been renamed, so its group's
// UnitType no longer matches the unit's Type. Set 20 is attached to whatever type is now called "Engine".
const unitTypeStatuses: UnitTypeStatusResultData[] = [
  {
    UnitType: 'Engine (old name)',
    StatusId: '12',
    Statuses: [createStatus({ Id: 40, StateId: 12, Text: 'In Quarters', BColor: '#00ff00' }), createStatus({ Id: 41, StateId: 12, Text: 'Enroute', BColor: '#ff0000' })],
  },
  {
    UnitType: 'Engine',
    StatusId: '20',
    Statuses: [createStatus({ Id: 40, StateId: 20, Text: 'Wrong Set Status', BColor: '#0000ff' })],
  },
];

describe('UnitCard status lookup', () => {
  it("prefers the unit's own custom status set over the unit type name", () => {
    render(<UnitCard unit={createUnit({ CustomStatusSetId: '12', CurrentStatusId: '41' })} unitTypeStatuses={unitTypeStatuses} onPress={jest.fn()} />);

    expect(screen.getByText('Enroute')).toBeTruthy();
    expect(screen.queryByText('Wrong Set Status')).toBeNull();
  });

  it('falls back to the unit type name when no custom status set id is sent', () => {
    render(<UnitCard unit={createUnit({ CustomStatusSetId: '', CurrentStatusId: '40' })} unitTypeStatuses={unitTypeStatuses} onPress={jest.fn()} />);

    expect(screen.getByText('Wrong Set Status')).toBeTruthy();
  });

  it('falls back to the unit type name when the set id is 0 or not in the list', () => {
    const { rerender } = render(<UnitCard unit={createUnit({ CustomStatusSetId: '0', CurrentStatusId: '40' })} unitTypeStatuses={unitTypeStatuses} onPress={jest.fn()} />);
    expect(screen.getByText('Wrong Set Status')).toBeTruthy();

    rerender(<UnitCard unit={createUnit({ CustomStatusSetId: '99', CurrentStatusId: '40' })} unitTypeStatuses={unitTypeStatuses} onPress={jest.fn()} />);
    expect(screen.getByText('Wrong Set Status')).toBeTruthy();
  });

  it('matches the status option by its id before the legacy set-id match', () => {
    // The unit's status id (12) is also the set's id; option 12 is the real status.
    const groups: UnitTypeStatusResultData[] = [
      {
        UnitType: 'Engine',
        StatusId: '12',
        Statuses: [createStatus({ Id: 30, StateId: 12, Text: 'First Option' }), createStatus({ Id: 12, StateId: 12, Text: 'Real Status' })],
      },
    ];

    render(<UnitCard unit={createUnit({ CustomStatusSetId: '12', CurrentStatusId: '12' })} unitTypeStatuses={groups} onPress={jest.fn()} />);

    expect(screen.getByText('Real Status')).toBeTruthy();
    expect(screen.queryByText('First Option')).toBeNull();
  });

  it("shows the server's status text when the status is in no known set", () => {
    render(<UnitCard unit={createUnit({ Type: 'Ladder', CustomStatusSetId: '', CurrentStatusId: '7' })} unitTypeStatuses={unitTypeStatuses} onPress={jest.fn()} />);

    expect(screen.getByText('Server Status Text')).toBeTruthy();
  });
});

describe('UnitCard type icon', () => {
  // The type icon is decorative (hidden from accessibility), so queries must opt in to hidden elements.
  const HIDDEN = { includeHiddenElements: true };

  it("shows the department's uploaded type icon next to the name", () => {
    const url = 'https://api.resgrid.dev/api/v4/UnitTypeIcons/abc';
    render(<UnitCard unit={createUnit({ TypeIconUrl: url, TypeMapIcon: 'ambulance' })} unitTypeStatuses={[]} onPress={jest.fn()} />);

    expect(screen.getByTestId('unit-type-icon-unit-1', HIDDEN)).toBeTruthy();
    expect(screen.getByTestId('expo-image', HIDDEN).props.source).toEqual({ uri: url });
    // The generic truck (the only lucide icon on a card with no location) is replaced, not shown alongside.
    expect(screen.queryAllByTestId('ui-icon', HIDDEN)).toHaveLength(0);
  });

  it('shows the built-in type icon when there is no upload', () => {
    render(<UnitCard unit={createUnit({ TypeIconUrl: null, TypeMapIcon: 'ambulance' })} unitTypeStatuses={[]} onPress={jest.fn()} />);

    expect(screen.getByTestId('unit-type-icon-unit-1', HIDDEN)).toBeTruthy();
    expect(screen.getByTestId('expo-image', HIDDEN).props.source).toBeTruthy();
  });

  it('keeps the generic truck icon when the server sends no type icon (older servers)', () => {
    render(<UnitCard unit={createUnit({})} unitTypeStatuses={[]} onPress={jest.fn()} />);

    expect(screen.queryByTestId('unit-type-icon-unit-1', HIDDEN)).toBeNull();
    expect(screen.queryByTestId('expo-image', HIDDEN)).toBeNull();
    expect(screen.getAllByTestId('ui-icon', HIDDEN)).toHaveLength(1);
    expect(screen.getByText('Engine 1')).toBeTruthy();
  });
});
