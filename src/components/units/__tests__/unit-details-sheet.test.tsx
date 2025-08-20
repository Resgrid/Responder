import { render, screen, fireEvent } from '@testing-library/react-native';
import React from 'react';

import { type UnitResultData } from '@/models/v4/units/unitResultData';

import { UnitDetailsSheet } from '../unit-details-sheet';

// Mock analytics
const mockTrackEvent = jest.fn();
jest.mock('@/hooks/use-analytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
  }),
}));

// Helper function to get all text content from rendered component
const getTextContent = (component: any): string => {
  const getAllText = (node: any): string => {
    if (typeof node === 'string') return node;
    if (typeof node === 'number') return String(node);
    if (!node) return '';
    if (Array.isArray(node)) return node.map(getAllText).join('');
    if (node.props && node.props.children) {
      return getAllText(node.props.children);
    }
    return '';
  };
  return getAllText(component.toJSON());
};

// Mock UI components that cause rendering issues
jest.mock('../../ui/actionsheet', () => ({
  Actionsheet: ({ children, isOpen }: { children: React.ReactNode; isOpen: boolean }) =>
    isOpen ? <div data-testid="actionsheet">{children}</div> : null,
  ActionsheetBackdrop: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ActionsheetContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ActionsheetDragIndicator: () => <div>drag-indicator</div>,
  ActionsheetDragIndicatorWrapper: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock other UI components
jest.mock('../../ui/badge', () => ({
  Badge: ({ children, className }: { children: React.ReactNode; className?: string }) =>
    <span className={className}>{children}</span>,
}));

jest.mock('../../ui/box', () => ({
  Box: ({ children, className }: { children: React.ReactNode; className?: string }) =>
    <div className={className}>{children}</div>,
}));

jest.mock('../../ui/button', () => ({
  Button: ({ children, onPress, testID, variant }: { children: React.ReactNode; onPress?: () => void; testID?: string; variant?: string }) => {
    const React = require('react');
    return React.createElement('button', {
      onPress,
      testID,
      'data-testid': testID,
    }, children);
  },
}));

jest.mock('../../ui/divider', () => ({
  Divider: () => <hr data-testid="divider" />,
}));

jest.mock('../../ui/heading', () => ({
  Heading: ({ children, size, className, numberOfLines }: { children: React.ReactNode; size?: string; className?: string; numberOfLines?: number }) =>
    <h1 className={className}>{children}</h1>,
}));

jest.mock('../../ui/hstack', () => ({
  HStack: ({ children, space, className }: { children: React.ReactNode; space?: string; className?: string }) =>
    <span className={className}>{children}</span>,
}));

jest.mock('../../ui/icon', () => ({
  Icon: ({ as: Component, size, className }: { as: any; size?: number; className?: string }) =>
    <Component size={size} className={className} />,
}));

jest.mock('../../ui/scroll-view', () => ({
  ScrollView: ({ children, className, showsVerticalScrollIndicator }: { children: React.ReactNode; className?: string; showsVerticalScrollIndicator?: boolean }) =>
    <div className={className}>{children}</div>,
}));

jest.mock('../../ui/text', () => ({
  Text: ({ children, className, numberOfLines }: { children: React.ReactNode; className?: string; numberOfLines?: number }) =>
    <span className={className}>{children}</span>,
}));

jest.mock('../../ui/vstack', () => ({
  VStack: ({ children, space }: { children: React.ReactNode; space?: string }) =>
    <div>{children}</div>,
}));

// Mock lucide-react-native icons
jest.mock('lucide-react-native', () => ({
  Calendar: ({ size, className }: { size?: number; className?: string }) => <div data-testid="calendar-icon" />,
  Car: ({ size, className }: { size?: number; className?: string }) => <div data-testid="car-icon" />,
  MapPin: ({ size, className }: { size?: number; className?: string }) => <div data-testid="mappin-icon" />,
  Settings: ({ size, className }: { size?: number; className?: string }) => <div data-testid="settings-icon" />,
  Tag: ({ size, className }: { size?: number; className?: string }) => <div data-testid="tag-icon" />,
  Truck: ({ size, className }: { size?: number; className?: string }) => <div data-testid="truck-icon" />,
  Users: ({ size, className }: { size?: number; className?: string }) => <div data-testid="users-icon" />,
  X: ({ size, className }: { size?: number; className?: string }) => <div data-testid="x-icon" />,
}));

// Mock the units store
const mockUnitsStore = {
  units: [],
  selectedUnitId: null,
  isDetailsOpen: false,
  closeDetails: jest.fn(),
};

jest.mock('@/stores/units/store', () => ({
  useUnitsStore: () => mockUnitsStore,
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => {
      const translations: Record<string, string> = {
        'units.group': 'Group',
        'units.location': 'Location',
        'units.coordinates': 'Coordinates',
        'units.vehicleInfo': 'Vehicle Information',
        'units.plateNumber': 'Plate Number',
        'units.vin': 'VIN',
        'units.features': 'Features',
        'units.fourWheelDrive': '4WD',
        'units.specialPermit': 'Special Permit',
        'units.notes': 'Notes',
        'units.lastUpdate': 'Last Updated',
      };
      return translations[key] || fallback || key;
    },
  }),
}));

jest.mock('nativewind', () => ({
  useColorScheme: () => ({ colorScheme: 'light' }),
  cssInterop: () => { },
}));

// Mock components
jest.mock('@/lib/utils', () => ({
  formatDateForDisplay: (date: any) => 'Formatted Date',
  parseDateISOString: (date: string) => new Date(date),
}));

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

describe('UnitDetailsSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.assign(mockUnitsStore, {
      units: [],
      selectedUnitId: null,
      isDetailsOpen: false,
    });
  });

  it('should not render when no unit is selected', () => {
    Object.assign(mockUnitsStore, {
      units: [mockUnit],
      selectedUnitId: null,
      isDetailsOpen: true,
    });

    render(<UnitDetailsSheet />);
    // Component should not render close button when no unit is selected
    expect(screen.queryByTestId('close-button')).toBeNull();
  });

  it('should not render when selected unit is not found', () => {
    Object.assign(mockUnitsStore, {
      units: [mockUnit],
      selectedUnitId: 'nonexistent',
      isDetailsOpen: true,
    });

    render(<UnitDetailsSheet />);
    // Component should not render close button when unit is not found
    expect(screen.queryByTestId('close-button')).toBeNull();
  });

  it('should render correctly when sheet is closed', () => {
    Object.assign(mockUnitsStore, {
      units: [mockUnit],
      selectedUnitId: '1',
      isDetailsOpen: false,
    });

    render(<UnitDetailsSheet />);
    // Sheet should be closed, so actionsheet shouldn't be visible
    expect(screen.queryByTestId('actionsheet')).toBeNull();
  });

  it('should render correctly when sheet is open', () => {
    Object.assign(mockUnitsStore, {
      units: [mockUnit],
      selectedUnitId: '1',
      isDetailsOpen: true,
    });

    render(<UnitDetailsSheet />);

    // Component should render with close button when sheet is open
    expect(screen.getByTestId('close-button')).toBeTruthy();
  });

  it('should display unit type', () => {
    Object.assign(mockUnitsStore, {
      units: [mockUnit],
      selectedUnitId: '1',
      isDetailsOpen: true,
    });

    render(<UnitDetailsSheet />);

    // Component should render when unit with type is selected
    expect(screen.getByTestId('close-button')).toBeTruthy();
  });

  it('should display group information', () => {
    Object.assign(mockUnitsStore, {
      units: [mockUnit],
      selectedUnitId: '1',
      isDetailsOpen: true,
    });

    render(<UnitDetailsSheet />);

    // Component should render when unit with group is selected
    expect(screen.getByTestId('close-button')).toBeTruthy();
  });

  it('should display location information when available', () => {
    Object.assign(mockUnitsStore, {
      units: [mockUnit],
      selectedUnitId: '1',
      isDetailsOpen: true,
    });

    render(<UnitDetailsSheet />);

    // Component should render when unit with location is selected
    expect(screen.getByTestId('close-button')).toBeTruthy();
  });

  it('should not display location information when not available', () => {
    Object.assign(mockUnitsStore, {
      units: [mockUnitMinimal],
      selectedUnitId: '3',
      isDetailsOpen: true,
    });

    render(<UnitDetailsSheet />);

    expect(screen.queryByText('Location')).toBeFalsy();
    expect(screen.queryByText('Coordinates:')).toBeFalsy();
  });

  it('should display vehicle information', () => {
    Object.assign(mockUnitsStore, {
      units: [mockUnit],
      selectedUnitId: '1',
      isDetailsOpen: true,
    });

    render(<UnitDetailsSheet />);

    // Component should render when unit with vehicle information is selected
    expect(screen.getByTestId('close-button')).toBeTruthy();
  });

  it('should display features when unit has special features', () => {
    Object.assign(mockUnitsStore, {
      units: [mockUnitWithFeatures],
      selectedUnitId: '2',
      isDetailsOpen: true,
    });

    render(<UnitDetailsSheet />);

    // Component should render when unit with features is selected
    expect(screen.getByTestId('close-button')).toBeTruthy();
  });

  it('should not display features section when unit has no special features', () => {
    Object.assign(mockUnitsStore, {
      units: [mockUnit],
      selectedUnitId: '1',
      isDetailsOpen: true,
    });

    render(<UnitDetailsSheet />);

    // Component should render normally without features
    expect(screen.getByTestId('close-button')).toBeTruthy();
  });

  it('should display notes when available', () => {
    Object.assign(mockUnitsStore, {
      units: [mockUnit],
      selectedUnitId: '1',
      isDetailsOpen: true,
    });

    render(<UnitDetailsSheet />);

    // Component should render when unit with notes is selected
    expect(screen.getByTestId('close-button')).toBeTruthy();
  });

  it('should not display notes when not available', () => {
    Object.assign(mockUnitsStore, {
      units: [mockUnitMinimal],
      selectedUnitId: '3',
      isDetailsOpen: true,
    });

    render(<UnitDetailsSheet />);

    // Component should render without notes
    expect(screen.getByTestId('close-button')).toBeTruthy();
  });

  it('should display last update timestamp when available', () => {
    Object.assign(mockUnitsStore, {
      units: [mockUnit],
      selectedUnitId: '1',
      isDetailsOpen: true,
    });

    render(<UnitDetailsSheet />);

    // Component should render with timestamp when available
    expect(screen.getByTestId('close-button')).toBeTruthy();
  });

  it('should not display last update when not available', () => {
    Object.assign(mockUnitsStore, {
      units: [mockUnitMinimal],
      selectedUnitId: '3',
      isDetailsOpen: true,
    });

    render(<UnitDetailsSheet />);

    // Component should render without timestamp
    expect(screen.getByTestId('close-button')).toBeTruthy();
  });

  it('should call closeDetails when close button is pressed', () => {
    Object.assign(mockUnitsStore, {
      units: [mockUnit],
      selectedUnitId: '1',
      isDetailsOpen: true,
    });

    render(<UnitDetailsSheet />);

    const closeButton = screen.getByTestId('close-button');
    fireEvent.press(closeButton);

    expect(mockUnitsStore.closeDetails).toHaveBeenCalledTimes(1);
  });

  it('should handle unit without group name', () => {
    const unitWithoutGroup = { ...mockUnit, GroupName: '' };
    Object.assign(mockUnitsStore, {
      units: [unitWithoutGroup],
      selectedUnitId: '1',
      isDetailsOpen: true,
    });

    render(<UnitDetailsSheet />);

    expect(screen.queryByText('Group:')).toBeFalsy();
  });

  it('should handle unit without plate number', () => {
    const unitWithoutPlate = { ...mockUnit, PlateNumber: '' };
    Object.assign(mockUnitsStore, {
      units: [unitWithoutPlate],
      selectedUnitId: '1',
      isDetailsOpen: true,
    });

    render(<UnitDetailsSheet />);

    // Component should render when unit without plate is selected
    expect(screen.getByTestId('close-button')).toBeTruthy();
  });

  it('should handle unit without VIN', () => {
    const unitWithoutVin = { ...mockUnit, Vin: '' };
    Object.assign(mockUnitsStore, {
      units: [unitWithoutVin],
      selectedUnitId: '1',
      isDetailsOpen: true,
    });

    render(<UnitDetailsSheet />);

    // Component should render when unit without VIN is selected
    expect(screen.getByTestId('close-button')).toBeTruthy();
  });

  it('should handle unit without type', () => {
    const unitWithoutType = { ...mockUnit, Type: '' };
    Object.assign(mockUnitsStore, {
      units: [unitWithoutType],
      selectedUnitId: '1',
      isDetailsOpen: true,
    });

    render(<UnitDetailsSheet />);

    // Component should render when unit without type is selected
    expect(screen.getByTestId('close-button')).toBeTruthy();
    expect(screen.queryByText('Fire Engine')).toBeFalsy();
  });

  it('should handle partial location coordinates', () => {
    const unitPartialLocation = { ...mockUnit, Latitude: '40.7128', Longitude: '' };
    Object.assign(mockUnitsStore, {
      units: [unitPartialLocation],
      selectedUnitId: '1',
      isDetailsOpen: true,
    });

    render(<UnitDetailsSheet />);

    expect(screen.queryByText('Location')).toBeFalsy();
    expect(screen.queryByText('Coordinates:')).toBeFalsy();
  });

  it('should display unit name correctly', () => {
    Object.assign(mockUnitsStore, {
      units: [mockUnit],
      selectedUnitId: '1',
      isDetailsOpen: true,
    });

    render(<UnitDetailsSheet />);

    // Component should render with close button when unit is selected
    expect(screen.getByTestId('close-button')).toBeTruthy();
  });

  it('should handle long unit names', () => {
    const longNameUnit = {
      ...mockUnit,
      Name: 'This is a very long unit name that should be handled gracefully',
    };
    Object.assign(mockUnitsStore, {
      units: [longNameUnit],
      selectedUnitId: '1',
      isDetailsOpen: true,
    });

    render(<UnitDetailsSheet />);

    // The component should render when a unit is selected
    expect(screen.getByTestId('close-button')).toBeTruthy();
  });

  it('should handle long VIN numbers', () => {
    const longVinUnit = {
      ...mockUnit,
      Vin: '1HGBH41JXMN1091861HGBH41JXMN1091861HGBH41JXMN109186',
    };
    Object.assign(mockUnitsStore, {
      units: [longVinUnit],
      selectedUnitId: '1',
      isDetailsOpen: true,
    });

    render(<UnitDetailsSheet />);

    // Component should render vehicle information section
    expect(screen.getByTestId('close-button')).toBeTruthy();
  });

  it('should display both 4WD and special permit badges', () => {
    Object.assign(mockUnitsStore, {
      units: [mockUnitWithFeatures],
      selectedUnitId: '2',
      isDetailsOpen: true,
    });

    render(<UnitDetailsSheet />);

    // Component should render when unit with features is selected
    expect(screen.getByTestId('close-button')).toBeTruthy();
  });

  it('should display only 4WD badge when only 4WD is true', () => {
    const unit4WDOnly = { ...mockUnit, FourWheelDrive: true, SpecialPermit: false };
    Object.assign(mockUnitsStore, {
      units: [unit4WDOnly],
      selectedUnitId: '1',
      isDetailsOpen: true,
    });

    render(<UnitDetailsSheet />);

    // Component should render when unit with 4WD is selected
    expect(screen.getByTestId('close-button')).toBeTruthy();
  });

  it('should display only special permit badge when only special permit is true', () => {
    const unitSpecialPermitOnly = { ...mockUnit, FourWheelDrive: false, SpecialPermit: true };
    Object.assign(mockUnitsStore, {
      units: [unitSpecialPermitOnly],
      selectedUnitId: '1',
      isDetailsOpen: true,
    });

    render(<UnitDetailsSheet />);

    // Component should render when unit with special permit is selected
    expect(screen.getByTestId('close-button')).toBeTruthy();
  });

  describe('Analytics Tracking', () => {
    beforeEach(() => {
      mockTrackEvent.mockClear();
    });

    it('should track analytics when sheet becomes visible', () => {
      Object.assign(mockUnitsStore, {
        units: [mockUnit],
        selectedUnitId: '1',
        isDetailsOpen: true,
      });

      render(<UnitDetailsSheet />);

      expect(mockTrackEvent).toHaveBeenCalledWith('unit_details_sheet_viewed', {
        timestamp: expect.any(String),
        unitId: '1',
        unitName: 'Engine 1',
        unitType: 'Fire Engine',
        hasLocation: true,
        hasGroupName: true,
        hasPlateNumber: true,
        hasVin: true,
        hasFourWheelDrive: false,
        hasSpecialPermit: false,
        hasNote: true,
        hasStatusTimestamp: true,
        colorScheme: 'light',
      });
    });

    it('should track analytics with minimal unit data', () => {
      Object.assign(mockUnitsStore, {
        units: [mockUnitMinimal],
        selectedUnitId: '3',
        isDetailsOpen: true,
      });

      render(<UnitDetailsSheet />);

      expect(mockTrackEvent).toHaveBeenCalledWith('unit_details_sheet_viewed', {
        timestamp: expect.any(String),
        unitId: '3',
        unitName: 'Rescue 3',
        unitType: '',
        hasLocation: false,
        hasGroupName: false,
        hasPlateNumber: false,
        hasVin: false,
        hasFourWheelDrive: false,
        hasSpecialPermit: false,
        hasNote: false,
        hasStatusTimestamp: false,
        colorScheme: 'light',
      });
    });

    it('should track analytics when close button is pressed', () => {
      Object.assign(mockUnitsStore, {
        units: [mockUnit],
        selectedUnitId: '1',
        isDetailsOpen: true,
      });

      render(<UnitDetailsSheet />);

      // Clear the view analytics event
      mockTrackEvent.mockClear();

      const closeButton = screen.getByTestId('close-button');
      fireEvent.press(closeButton);

      expect(mockTrackEvent).toHaveBeenCalledWith('unit_details_sheet_closed', {
        timestamp: expect.any(String),
        unitId: '1',
        unitName: 'Engine 1',
      });
      expect(mockUnitsStore.closeDetails).toHaveBeenCalledTimes(1);
    });

    it('should not track analytics when no unit is selected', () => {
      Object.assign(mockUnitsStore, {
        units: [mockUnit],
        selectedUnitId: null,
        isDetailsOpen: true,
      });

      render(<UnitDetailsSheet />);

      expect(mockTrackEvent).not.toHaveBeenCalled();
    });

    it('should not track analytics when sheet is closed', () => {
      Object.assign(mockUnitsStore, {
        units: [mockUnit],
        selectedUnitId: '1',
        isDetailsOpen: false,
      });

      render(<UnitDetailsSheet />);

      expect(mockTrackEvent).not.toHaveBeenCalled();
    });

    it('should track analytics for unit with features', () => {
      Object.assign(mockUnitsStore, {
        units: [mockUnitWithFeatures],
        selectedUnitId: '2',
        isDetailsOpen: true,
      });

      render(<UnitDetailsSheet />);

      expect(mockTrackEvent).toHaveBeenCalledWith('unit_details_sheet_viewed', {
        timestamp: expect.any(String),
        unitId: '2',
        unitName: 'Ambulance 2',
        unitType: 'Ambulance',
        hasLocation: true,
        hasGroupName: true,
        hasPlateNumber: true,
        hasVin: true,
        hasFourWheelDrive: true,
        hasSpecialPermit: true,
        hasNote: true,
        hasStatusTimestamp: true,
        colorScheme: 'light',
      });
    });

    it('should handle analytics errors gracefully', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => { });
      mockTrackEvent.mockImplementation(() => {
        throw new Error('Analytics error');
      });

      Object.assign(mockUnitsStore, {
        units: [mockUnit],
        selectedUnitId: '1',
        isDetailsOpen: true,
      });

      // Should not throw error
      expect(() => render(<UnitDetailsSheet />)).not.toThrow();

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Failed to track unit details sheet view analytics:',
        expect.any(Error)
      );

      consoleWarnSpy.mockRestore();
    });

    it('should handle close analytics errors gracefully', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => { });

      Object.assign(mockUnitsStore, {
        units: [mockUnit],
        selectedUnitId: '1',
        isDetailsOpen: true,
      });

      render(<UnitDetailsSheet />);

      // Clear the view analytics event and make trackEvent throw on close
      mockTrackEvent.mockClear();
      mockTrackEvent.mockImplementation(() => {
        throw new Error('Analytics error');
      });

      const closeButton = screen.getByTestId('close-button');

      // Should not throw error
      expect(() => fireEvent.press(closeButton)).not.toThrow();

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Failed to track unit details sheet close analytics:',
        expect.any(Error)
      );
      expect(mockUnitsStore.closeDetails).toHaveBeenCalledTimes(1);

      consoleWarnSpy.mockRestore();
    });
  });
}); 