import React from 'react';
import { render, screen } from '@testing-library/react-native';

import { useCoreStore } from '@/stores/app/core-store';
import { type UnitStatusResultData } from '@/models/v4/unitStatus/unitStatusResultData';

import { SidebarStatusCard } from '../status-sidebar';

// Mock the store
jest.mock('@/stores/app/core-store');

const mockUseCoreStore = useCoreStore as jest.MockedFunction<typeof useCoreStore>;

// Helper function to create mock status objects
const createMockStatus = (overrides: Partial<UnitStatusResultData> = {}): UnitStatusResultData => ({
  UnitId: '123',
  State: 'Available',
  StateStyle: 'label-success',
  Timestamp: '2023-01-01T12:00:00Z',
  Note: 'Test note',
  Name: 'Unit 1',
  Type: 'Engine',
  StateCss: '',
  DestinationId: '',
  Latitude: '',
  Longitude: '',
  GroupName: '',
  GroupId: '',
  Eta: '',
  ...overrides,
});

describe('SidebarStatusCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render with unknown status when activeUnitStatus is null', () => {
    mockUseCoreStore.mockReturnValue(null);

    render(<SidebarStatusCard />);

    expect(screen.getByText('Unknown')).toBeTruthy();
  });

  it('should render with unknown status when activeUnitStatus is undefined', () => {
    mockUseCoreStore.mockReturnValue(undefined);

    render(<SidebarStatusCard />);

    expect(screen.getByText('Unknown')).toBeTruthy();
  });

  it('should render the correct status text', () => {
    const mockStatus = createMockStatus();
    mockUseCoreStore.mockReturnValue(mockStatus);

    render(<SidebarStatusCard />);

    expect(screen.getByText('Available')).toBeTruthy();
  });

  it('should render status with empty string when State is missing', () => {
    const mockStatus = createMockStatus({ State: '' });
    mockUseCoreStore.mockReturnValue(mockStatus);

    render(<SidebarStatusCard />);

    expect(screen.getByText('Unknown')).toBeTruthy();
  });

  describe('Color mapping', () => {
    const colorTestCases = [
      { styleClass: 'label-danger', expectedColor: '#ED5565', label: 'danger' },
      { styleClass: 'label-info', expectedColor: '#23c6c8', label: 'info' },
      { styleClass: 'label-warning', expectedColor: '#f8ac59', label: 'warning' },
      { styleClass: 'label-success', expectedColor: '#449d44', label: 'success' },
      { styleClass: 'label-onscene', expectedColor: '#449d44', label: 'onscene' },
      { styleClass: 'label-primary', expectedColor: '#228BCB', label: 'primary' },
      { styleClass: 'label-returning', expectedColor: '', label: 'returning' },
      { styleClass: 'label-default', expectedColor: '#262626', label: 'default' },
      { styleClass: 'label-enroute', expectedColor: '#449d44', label: 'enroute' },
    ];

    colorTestCases.forEach(({ styleClass, expectedColor, label }) => {
      it(`should apply correct color for ${label} status`, () => {
        const mockStatus = createMockStatus({
          State: 'Test Status',
          StateStyle: styleClass,
        });

        mockUseCoreStore.mockReturnValue(mockStatus);

        const { getByTestId } = render(<SidebarStatusCard />);

        // We need to find the Card component by its style
        const cardElement = getByTestId('status-card');
        expect(cardElement.props.style).toEqual(
          expect.objectContaining({
            backgroundColor: expectedColor,
          })
        );
      });
    });

    it('should handle unknown status styles by keeping original value', () => {
      const mockStatus = createMockStatus({
        State: 'Test Status',
        StateStyle: 'unknown-style',
      });

      mockUseCoreStore.mockReturnValue(mockStatus);

      const { getByTestId } = render(<SidebarStatusCard />);

      const cardElement = getByTestId('status-card');
      expect(cardElement.props.style).toEqual(
        expect.objectContaining({
          backgroundColor: 'unknown-style',
        })
      );
    });

    it('should handle empty StateStyle by using empty string', () => {
      const mockStatus = createMockStatus({
        State: 'Test Status',
        StateStyle: '',
      });

      mockUseCoreStore.mockReturnValue(mockStatus);

      const { getByTestId } = render(<SidebarStatusCard />);

      const cardElement = getByTestId('status-card');
      expect(cardElement.props.style).toEqual(
        expect.objectContaining({
          backgroundColor: '',
        })
      );
    });
  });

  describe('Status updates', () => {
    it('should re-render when activeUnitStatus changes', () => {
      const initialStatus = createMockStatus();
      mockUseCoreStore.mockReturnValue(initialStatus);

      const { rerender } = render(<SidebarStatusCard />);

      expect(screen.getByText('Available')).toBeTruthy();

      // Update the status
      const updatedStatus = createMockStatus({
        State: 'Busy',
        StateStyle: 'label-danger',
        Timestamp: '2023-01-01T12:30:00Z',
        Note: 'Updated note',
      });

      mockUseCoreStore.mockReturnValue(updatedStatus);

      rerender(<SidebarStatusCard />);

      expect(screen.getByText('Busy')).toBeTruthy();
      expect(screen.queryByText('Available')).toBeNull();
    });

    it('should handle transition from null to valid status', () => {
      mockUseCoreStore.mockReturnValue(null);

      const { rerender } = render(<SidebarStatusCard />);

      expect(screen.getByText('Unknown')).toBeTruthy();

      // Update to valid status
      const status = createMockStatus({
        State: 'En Route',
        StateStyle: 'label-enroute',
      });

      mockUseCoreStore.mockReturnValue(status);

      rerender(<SidebarStatusCard />);

      expect(screen.getByText('En Route')).toBeTruthy();
      expect(screen.queryByText('Unknown')).toBeNull();
    });

    it('should handle transition from valid status to null', () => {
      const status = createMockStatus({
        State: 'On Scene',
        StateStyle: 'label-onscene',
      });

      mockUseCoreStore.mockReturnValue(status);

      const { rerender } = render(<SidebarStatusCard />);

      expect(screen.getByText('On Scene')).toBeTruthy();

      // Update to null
      mockUseCoreStore.mockReturnValue(null);

      rerender(<SidebarStatusCard />);

      expect(screen.getByText('Unknown')).toBeTruthy();
      expect(screen.queryByText('On Scene')).toBeNull();
    });
  });

  describe('Edge cases', () => {
    it('should handle status with special characters', () => {
      const mockStatus = createMockStatus({
        State: 'Status with "quotes" & symbols',
        StateStyle: 'label-info',
      });

      mockUseCoreStore.mockReturnValue(mockStatus);

      render(<SidebarStatusCard />);

      expect(screen.getByText('Status with "quotes" & symbols')).toBeTruthy();
    });

    it('should handle very long status text', () => {
      const longStatusText = 'This is a very long status text that might overflow the container and cause layout issues';
      const mockStatus = createMockStatus({
        State: longStatusText,
        StateStyle: 'label-info',
      });

      mockUseCoreStore.mockReturnValue(mockStatus);

      render(<SidebarStatusCard />);

      expect(screen.getByText(longStatusText)).toBeTruthy();
    });

    it('should handle null StateStyle gracefully', () => {
      const mockStatus = createMockStatus({
        State: 'Test Status',
        StateStyle: null as any,
      });

      mockUseCoreStore.mockReturnValue(mockStatus);

      const { getByTestId } = render(<SidebarStatusCard />);

      const cardElement = getByTestId('status-card');
      expect(cardElement.props.style).toEqual(
        expect.objectContaining({
          backgroundColor: '',
        })
      );
    });
  });
}); 