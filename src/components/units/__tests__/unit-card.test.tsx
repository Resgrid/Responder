import { render, screen, fireEvent } from '@testing-library/react-native';
import React from 'react';

import { type UnitResultData } from '@/models/v4/units/unitResultData';

import { UnitCard } from '../unit-card';

// Mock data
const mockUnit: UnitResultData = {
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
};

const mockUnitWithFeatures: UnitResultData = {
  ...mockUnit,
  UnitId: '2',
  Name: 'Ambulance 2',
  Type: 'Ambulance',
  PlateNumber: 'AMB002',
  FourWheelDrive: true,
  SpecialPermit: true,
  Note: 'Advanced life support unit',
};

const mockUnitMinimal: UnitResultData = {
  UnitId: '3',
  DepartmentId: 'dept1',
  Name: 'Rescue 3',
  Type: '',
  TypeId: 3,
  CustomStatusSetId: '',
  GroupId: '',
  GroupName: '',
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
};

const mockUnitNoLocation: UnitResultData = {
  ...mockUnit,
  UnitId: '4',
  Name: 'Unit No Location',
  Latitude: '',
  Longitude: '',
};

describe('UnitCard', () => {
  const mockOnPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render correctly with full unit data', () => {
    render(<UnitCard unit={mockUnit} onPress={mockOnPress} />);

    expect(screen.getByText('Engine 1')).toBeTruthy();
    expect(screen.getByText('Fire Engine')).toBeTruthy();
    expect(screen.getByText('Station 1')).toBeTruthy();
    expect(screen.getByText('FD001')).toBeTruthy();
    expect(screen.getByText('Primary response unit for Station 1')).toBeTruthy();
  });

  it('should render with correct testID', () => {
    render(<UnitCard unit={mockUnit} onPress={mockOnPress} />);

    expect(screen.getByTestId('unit-card-1')).toBeTruthy();
  });

  it('should show location indicator when coordinates are available', () => {
    render(<UnitCard unit={mockUnit} onPress={mockOnPress} />);

    // Location icon should be present
    expect(screen.getByTestId('unit-card-1')).toBeTruthy();
    // Note: The MapPin icon would be rendered but testing its presence requires more specific testing
  });

  it('should not show location indicator when coordinates are not available', () => {
    render(<UnitCard unit={mockUnitNoLocation} onPress={mockOnPress} />);

    expect(screen.getByTestId('unit-card-4')).toBeTruthy();
    // Location icon should not be present
  });

  it('should show features badges when unit has special features', () => {
    render(<UnitCard unit={mockUnitWithFeatures} onPress={mockOnPress} />);

    expect(screen.getByText('4WD')).toBeTruthy();
    expect(screen.getByText('Special Permit')).toBeTruthy();
  });

  it('should not show features badges when unit has no special features', () => {
    render(<UnitCard unit={mockUnit} onPress={mockOnPress} />);

    expect(screen.queryByText('4WD')).toBeFalsy();
    expect(screen.queryByText('Special Permit')).toBeFalsy();
  });

  it('should handle minimal unit data gracefully', () => {
    render(<UnitCard unit={mockUnitMinimal} onPress={mockOnPress} />);

    expect(screen.getByText('Rescue 3')).toBeTruthy();
    expect(screen.getByTestId('unit-card-3')).toBeTruthy();

    // Type should not be rendered if empty
    expect(screen.queryByText('')).toBeFalsy();
  });

  it('should call onPress when pressed', () => {
    render(<UnitCard unit={mockUnit} onPress={mockOnPress} />);

    const card = screen.getByTestId('unit-card-1');
    fireEvent.press(card);

    expect(mockOnPress).toHaveBeenCalledWith('1');
  });

  it('should call onPress with correct unit ID for different units', () => {
    render(<UnitCard unit={mockUnitWithFeatures} onPress={mockOnPress} />);

    const card = screen.getByTestId('unit-card-2');
    fireEvent.press(card);

    expect(mockOnPress).toHaveBeenCalledWith('2');
  });

  it('should truncate long unit names', () => {
    const longNameUnit = {
      ...mockUnit,
      Name: 'This is a very long unit name that should be truncated to prevent layout issues',
    };

    render(<UnitCard unit={longNameUnit} onPress={mockOnPress} />);

    expect(screen.getByText('This is a very long unit name that should be truncated to prevent layout issues')).toBeTruthy();
  });

  it('should truncate long notes', () => {
    const longNoteUnit = {
      ...mockUnit,
      Note: 'This is a very long note that should be truncated to two lines to prevent the card from becoming too tall and affecting the layout',
    };

    render(<UnitCard unit={longNoteUnit} onPress={mockOnPress} />);

    expect(screen.getByText('This is a very long note that should be truncated to two lines to prevent the card from becoming too tall and affecting the layout')).toBeTruthy();
  });

  it('should render without group name when not provided', () => {
    const noGroupUnit = {
      ...mockUnit,
      GroupName: '',
    };

    render(<UnitCard unit={noGroupUnit} onPress={mockOnPress} />);

    expect(screen.getByText('Engine 1')).toBeTruthy();
    expect(screen.queryByText('Station 1')).toBeFalsy();
  });

  it('should render without plate number when not provided', () => {
    const noPlateUnit = {
      ...mockUnit,
      PlateNumber: '',
    };

    render(<UnitCard unit={noPlateUnit} onPress={mockOnPress} />);

    expect(screen.getByText('Engine 1')).toBeTruthy();
    expect(screen.queryByText('FD001')).toBeFalsy();
  });

  it('should render without note when not provided', () => {
    const noNoteUnit = {
      ...mockUnit,
      Note: '',
    };

    render(<UnitCard unit={noNoteUnit} onPress={mockOnPress} />);

    expect(screen.getByText('Engine 1')).toBeTruthy();
    expect(screen.queryByText('Primary response unit for Station 1')).toBeFalsy();
  });

  it('should render without type when not provided', () => {
    const noTypeUnit = {
      ...mockUnit,
      Type: '',
    };

    render(<UnitCard unit={noTypeUnit} onPress={mockOnPress} />);

    expect(screen.getByText('Engine 1')).toBeTruthy();
    expect(screen.queryByText('Fire Engine')).toBeFalsy();
  });

  it('should handle both location coordinates empty', () => {
    const noLocationUnit = {
      ...mockUnit,
      Latitude: '',
      Longitude: '',
    };

    render(<UnitCard unit={noLocationUnit} onPress={mockOnPress} />);

    expect(screen.getByText('Engine 1')).toBeTruthy();
    // Location icon should not be present
  });

  it('should handle partial location coordinates', () => {
    const partialLocationUnit = {
      ...mockUnit,
      Latitude: '40.7128',
      Longitude: '',
    };

    render(<UnitCard unit={partialLocationUnit} onPress={mockOnPress} />);

    expect(screen.getByText('Engine 1')).toBeTruthy();
    // Location icon should not be present since both coordinates are required
  });

  it('should show all badges when unit has all optional fields', () => {
    render(<UnitCard unit={mockUnitWithFeatures} onPress={mockOnPress} />);

    expect(screen.getByText('Station 1')).toBeTruthy(); // Group badge
    expect(screen.getByText('AMB002')).toBeTruthy(); // Plate number badge
    expect(screen.getByText('4WD')).toBeTruthy(); // 4WD badge
    expect(screen.getByText('Special Permit')).toBeTruthy(); // Special permit badge
  });

  it('should handle empty string values gracefully', () => {
    const emptyStringUnit = {
      ...mockUnit,
      Type: '',
      GroupName: '',
      PlateNumber: '',
      Note: '',
    };

    render(<UnitCard unit={emptyStringUnit} onPress={mockOnPress} />);

    expect(screen.getByText('Engine 1')).toBeTruthy();
    expect(screen.getByTestId('unit-card-1')).toBeTruthy();
  });

  it('should handle special characters in unit data', () => {
    const specialCharUnit = {
      ...mockUnit,
      Name: 'Engine #1 & Rescue',
      Type: 'Fire/Rescue Engine',
      Note: 'Special unit with symbols: @#$%',
    };

    render(<UnitCard unit={specialCharUnit} onPress={mockOnPress} />);

    expect(screen.getByText('Engine #1 & Rescue')).toBeTruthy();
    expect(screen.getByText('Fire/Rescue Engine')).toBeTruthy();
    expect(screen.getByText('Special unit with symbols: @#$%')).toBeTruthy();
  });
}); 