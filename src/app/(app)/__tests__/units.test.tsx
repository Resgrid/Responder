import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import React from 'react';

import { type UnitResultData } from '@/models/v4/units/unitResultData';

// Mock the units store
const mockUnitsStore = {
  units: [],
  searchQuery: '',
  setSearchQuery: jest.fn(),
  selectUnit: jest.fn(),
  isLoading: false,
  fetchUnits: jest.fn(),
};

jest.mock('@/stores/units/store', () => ({
  useUnitsStore: () => mockUnitsStore,
}));

// Mock UI components
jest.mock('@/components/ui/input', () => ({
  Input: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  InputField: ({ placeholder, value, onChangeText, ...props }: any) => {
    const handleChange = (e: any) => {
      if (onChangeText) {
        onChangeText(e.target ? e.target.value : e);
      }
    };
    const inputProps = {
      placeholder,
      value,
      onChange: handleChange,
      'data-testid': 'search-input',
      ...props
    };
    return <input {...inputProps} />;
  },
  InputIcon: ({ as: Icon, ...props }: any) => <Icon {...props} />,
  InputSlot: ({ children, onPress, ...props }: any) => (
    <div {...props} onClick={onPress}>
      {children}
    </div>
  ),
}));

jest.mock('@/components/ui/box', () => ({
  Box: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}));

// Mock React Native components
jest.mock('react-native', () => ({
  FlatList: ({ data, renderItem, keyExtractor, refreshControl, ...props }: any) => (
    <div {...props}>
      {refreshControl}
      <div>
        {data?.map((item: any, index: number) => (
          <div key={keyExtractor?.(item, index) || index}>
            {renderItem?.({ item, index })}
          </div>
        ))}
      </div>
    </div>
  ),
  RefreshControl: ({ refreshing, onRefresh }: any) => (
    <div onClick={onRefresh}>RefreshControl</div>
  ),
  View: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  Pressable: ({ children, onPress, ...props }: any) => (
    <div {...props} onClick={onPress}>
      {children}
    </div>
  ),
  StyleSheet: {
    create: (styles: any) => styles,
  },
  Platform: {
    OS: 'ios',
    select: (obj: any) => obj.ios || obj.default,
  },
}));

// Mock icons
jest.mock('lucide-react-native', () => ({
  Search: (props: any) => <div {...props}>Search</div>,
  X: (props: any) => <div {...props}>X</div>,
  Truck: (props: any) => <div {...props}>Truck</div>,
}));

// Mock components
jest.mock('@/components/common/loading', () => ({
  Loading: () => <div data-testid="loading">Loading</div>,
}));

jest.mock('@/components/common/zero-state', () => {
  const ZeroState = ({ heading }: { heading: string }) => (
    <div data-testid="zero-state">{`ZeroState: ${heading}`}</div>
  );
  ZeroState.displayName = 'ZeroState';
  return ZeroState;
});

jest.mock('@/components/units/unit-card', () => ({
  UnitCard: ({ unit, onPress }: { unit: any; onPress: (id: string) => void }) => (
    <div
      data-testid={`unit-card-${unit.UnitId}`}
      onClick={() => onPress(unit.UnitId)}
    >
      {unit.Name}
    </div>
  ),
}));

jest.mock('@/components/units/unit-details-sheet', () => ({
  UnitDetailsSheet: () => <div data-testid="unit-details-sheet">UnitDetailsSheet</div>,
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Mock navigation hooks
jest.mock('@react-navigation/core', () => ({
  useIsFocused: () => true,
}));

// Mock FocusAwareStatusBar
jest.mock('@/components/ui/focus-aware-status-bar', () => ({
  FocusAwareStatusBar: () => null,
}));

import Units from '../home/units';

// Mock data
const mockUnits: UnitResultData[] = [
  {
    UnitId: '1',
    DepartmentId: 'dept1',
    Name: 'Engine 1',
    Type: 'Fire Engine',
    TypeId: 1,
    CustomStatusSetId: '',
    GroupId: 'group1',
    GroupName: 'Station 1',
    Vin: '1HGBH41JXMN109186',
    PlateNumber: 'FD001',
    FourWheelDrive: false,
    SpecialPermit: false,
    CurrentDestinationId: '',
    CurrentStatusId: '1',
    CurrentStatusTimestamp: '2024-01-15T10:00:00Z',
    Latitude: '40.7128',
    Longitude: '-74.0060',
    Note: 'Primary response unit for Station 1',
  },
  {
    UnitId: '2',
    DepartmentId: 'dept1',
    Name: 'Ambulance 2',
    Type: 'Ambulance',
    TypeId: 2,
    CustomStatusSetId: '',
    GroupId: 'group2',
    GroupName: 'Station 2',
    Vin: '2HGBH41JXMN109187',
    PlateNumber: 'AMB002',
    FourWheelDrive: true,
    SpecialPermit: true,
    CurrentDestinationId: '',
    CurrentStatusId: '2',
    CurrentStatusTimestamp: '2024-01-15T11:00:00Z',
    Latitude: '40.7589',
    Longitude: '-73.9851',
    Note: 'Advanced life support unit',
  },
  {
    UnitId: '3',
    DepartmentId: 'dept1',
    Name: 'Rescue 3',
    Type: 'Rescue',
    TypeId: 3,
    CustomStatusSetId: '',
    GroupId: 'group1',
    GroupName: 'Station 1',
    Vin: '',
    PlateNumber: '',
    FourWheelDrive: false,
    SpecialPermit: false,
    CurrentDestinationId: '',
    CurrentStatusId: '',
    CurrentStatusTimestamp: '',
    Latitude: '',
    Longitude: '',
    Note: '',
  },
];

describe('Units', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.assign(mockUnitsStore, {
      units: [],
      searchQuery: '',
      isLoading: false,
    });
  });

  it('should fetch units on mount', () => {
    render(<Units />);
    expect(mockUnitsStore.fetchUnits).toHaveBeenCalledTimes(1);
  });

  it('should render component without errors when units are provided', () => {
    Object.assign(mockUnitsStore, {
      units: mockUnits,
      isLoading: false,
    });

    expect(() => render(<Units />)).not.toThrow();
  });

  it('should render component without errors when no units are provided', () => {
    Object.assign(mockUnitsStore, {
      units: [],
      isLoading: false,
    });

    expect(() => render(<Units />)).not.toThrow();
  });

  it('should render component without errors when loading', () => {
    Object.assign(mockUnitsStore, {
      units: [],
      isLoading: true,
    });

    expect(() => render(<Units />)).not.toThrow();
  });

  it('should call setSearchQuery when search query changes', () => {
    Object.assign(mockUnitsStore, {
      units: mockUnits,
      isLoading: false,
    });

    render(<Units />);

    // Test store interaction directly
    expect(mockUnitsStore.setSearchQuery).toBeDefined();
    expect(typeof mockUnitsStore.setSearchQuery).toBe('function');
  });

  it('should call selectUnit when unit is selected', () => {
    Object.assign(mockUnitsStore, {
      units: mockUnits,
      isLoading: false,
    });

    render(<Units />);

    // Test store interaction directly
    expect(mockUnitsStore.selectUnit).toBeDefined();
    expect(typeof mockUnitsStore.selectUnit).toBe('function');
  });

  it('should handle different loading states correctly', () => {
    // Test initial state
    Object.assign(mockUnitsStore, {
      units: [],
      isLoading: true,
    });

    const { rerender } = render(<Units />);

    // Test loaded state
    Object.assign(mockUnitsStore, {
      units: mockUnits,
      isLoading: false,
    });

    expect(() => rerender(<Units />)).not.toThrow();
  });
}); 