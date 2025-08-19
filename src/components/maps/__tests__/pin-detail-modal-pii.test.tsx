import { render, screen } from '@testing-library/react-native';
import React from 'react';

import { type MapMakerInfoData } from '@/models/v4/mapping/getMapDataAndMarkersData';
import { useSecurityStore } from '@/stores/security/store';

import { PinDetailModal } from '../pin-detail-modal';

// Mock the required modules
jest.mock('@/stores/security/store');
jest.mock('@/stores/app/location-store', () => ({
  useLocationStore: jest.fn(() => ({ latitude: 40.7128, longitude: -74.0060 })),
}));
jest.mock('@/stores/toast/store', () => ({
  useToastStore: jest.fn(() => ({ showToast: jest.fn() })),
}));
jest.mock('@/lib/navigation', () => ({
  openMapsWithDirections: jest.fn(),
}));
// Mock expo-router
jest.mock('expo-router', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    back: jest.fn(),
  })),
}));

// Mock nativewind
jest.mock('nativewind', () => ({
  useColorScheme: jest.fn(() => ({
    colorScheme: 'light',
  })),
  cssInterop: jest.fn(),
  styled: jest.fn(() => jest.fn()),
}));

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: jest.fn(() => ({
    t: jest.fn((key: string) => key),
  })),
}));

// Mock UI components
jest.mock('@/components/ui/bottom-sheet', () => ({
  CustomBottomSheet: ({ children, isOpen }: { children: React.ReactNode; isOpen: boolean }) =>
    isOpen ? <div data-testid="bottom-sheet">{children}</div> : null,
}));

const mockUseSecurityStore = useSecurityStore as jest.MockedFunction<typeof useSecurityStore>;

describe('PinDetailModal PII Protection', () => {
  const mockOnClose = jest.fn();
  const mockOnSetAsCurrentCall = jest.fn();

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

  it('should show coordinates for call pins regardless of PII permission', () => {
    mockUseSecurityStore.mockReturnValue({
      canUserViewPII: false,
    } as any);

    render(
      <PinDetailModal
        pin={callPin}
        isOpen={true}
        onClose={mockOnClose}
        onSetAsCurrentCall={mockOnSetAsCurrentCall}
      />
    );

    expect(screen.getByText('40.712800, -74.006000')).toBeTruthy();
  });

  it('should show coordinates for unit pins regardless of PII permission', () => {
    mockUseSecurityStore.mockReturnValue({
      canUserViewPII: false,
    } as any);

    render(
      <PinDetailModal
        pin={unitPin}
        isOpen={true}
        onClose={mockOnClose}
        onSetAsCurrentCall={mockOnSetAsCurrentCall}
      />
    );

    expect(screen.getByText('40.748900, -73.985700')).toBeTruthy();
  });

  it('should show coordinates for personnel pins when user can view PII', () => {
    mockUseSecurityStore.mockReturnValue({
      canUserViewPII: true,
    } as any);

    render(
      <PinDetailModal
        pin={personnelPin}
        isOpen={true}
        onClose={mockOnClose}
        onSetAsCurrentCall={mockOnSetAsCurrentCall}
      />
    );

    expect(screen.getByText('40.758000, -73.985500')).toBeTruthy();
  });

  it('should hide coordinates for personnel pins when user cannot view PII', () => {
    mockUseSecurityStore.mockReturnValue({
      canUserViewPII: false,
    } as any);

    render(
      <PinDetailModal
        pin={personnelPin}
        isOpen={true}
        onClose={mockOnClose}
        onSetAsCurrentCall={mockOnSetAsCurrentCall}
      />
    );

    expect(screen.queryByText('40.758000, -73.985500')).toBeFalsy();
    // Should still show title and other information
    expect(screen.getByText('John Doe')).toBeTruthy();
    expect(screen.getByText('Personnel location')).toBeTruthy();
  });

  it('should handle different personnel ImagePath variations', () => {
    mockUseSecurityStore.mockReturnValue({
      canUserViewPII: false,
    } as any);

    const personnelPinVariations = [
      { ...personnelPin, ImagePath: 'person' },
      { ...personnelPin, ImagePath: 'Person_Available' },
      { ...personnelPin, ImagePath: 'PERSON_RESPONDING' },
      { ...personnelPin, ImagePath: 'person_onscene' },
    ];

    personnelPinVariations.forEach((pin, index) => {
      const { unmount } = render(
        <PinDetailModal
          pin={pin}
          isOpen={true}
          onClose={mockOnClose}
          onSetAsCurrentCall={mockOnSetAsCurrentCall}
        />
      );

      expect(screen.queryByText(`${pin.Latitude.toFixed(6)}, ${pin.Longitude.toFixed(6)}`)).toBeFalsy();
      unmount();
    });
  });

  it('should be case insensitive when detecting personnel pins', () => {
    mockUseSecurityStore.mockReturnValue({
      canUserViewPII: false,
    } as any);

    const personnelPinUppercase: MapMakerInfoData = {
      ...personnelPin,
      ImagePath: 'PERSON_AVAILABLE',
    };

    render(
      <PinDetailModal
        pin={personnelPinUppercase}
        isOpen={true}
        onClose={mockOnClose}
        onSetAsCurrentCall={mockOnSetAsCurrentCall}
      />
    );

    expect(screen.queryByText('40.758000, -73.985500')).toBeFalsy();
    expect(screen.getByText('John Doe')).toBeTruthy();
  });

  it('should handle pins with undefined or null ImagePath', () => {
    mockUseSecurityStore.mockReturnValue({
      canUserViewPII: false,
    } as any);

    const pinWithUndefinedImagePath: MapMakerInfoData = {
      ...callPin,
      ImagePath: undefined as any,
    };

    render(
      <PinDetailModal
        pin={pinWithUndefinedImagePath}
        isOpen={true}
        onClose={mockOnClose}
        onSetAsCurrentCall={mockOnSetAsCurrentCall}
      />
    );

    // Should show coordinates since it's not a personnel pin
    expect(screen.getByText('40.712800, -74.006000')).toBeTruthy();
  });

  it('should not render when pin is null', () => {
    mockUseSecurityStore.mockReturnValue({
      canUserViewPII: true,
    } as any);

    const { UNSAFE_root } = render(
      <PinDetailModal
        pin={null}
        isOpen={true}
        onClose={mockOnClose}
        onSetAsCurrentCall={mockOnSetAsCurrentCall}
      />
    );

    expect(UNSAFE_root.children.length).toBe(0);
  });

  it('should not render when modal is closed', () => {
    mockUseSecurityStore.mockReturnValue({
      canUserViewPII: true,
    } as any);

    render(
      <PinDetailModal
        pin={personnelPin}
        isOpen={false}
        onClose={mockOnClose}
        onSetAsCurrentCall={mockOnSetAsCurrentCall}
      />
    );

    expect(screen.queryByText('John Doe')).toBeFalsy();
  });

  it('should still show other pin information when coordinates are hidden', () => {
    mockUseSecurityStore.mockReturnValue({
      canUserViewPII: false,
    } as any);

    render(
      <PinDetailModal
        pin={personnelPin}
        isOpen={true}
        onClose={mockOnClose}
        onSetAsCurrentCall={mockOnSetAsCurrentCall}
      />
    );

    // Should still show all other information
    expect(screen.getByText('John Doe')).toBeTruthy();
    expect(screen.getByText('Personnel location')).toBeTruthy();
    expect(screen.getByText('common.route')).toBeTruthy();

    // But coordinates should be hidden
    expect(screen.queryByText('40.758000, -73.985500')).toBeFalsy();
  });
});
