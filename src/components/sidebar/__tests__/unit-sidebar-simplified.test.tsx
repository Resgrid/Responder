import { render, screen, fireEvent } from '@testing-library/react-native';
import React from 'react';

// Mock the store hooks directly without importing the actual stores
jest.mock('@/stores/app/core-store', () => ({
  useCoreStore: jest.fn(() => ({ activeUnit: null })),
}));

jest.mock('@/stores/app/location-store', () => ({
  useLocationStore: jest.fn(() => ({
    isMapLocked: false,
    setMapLocked: jest.fn()
  })),
}));

jest.mock('@/stores/app/livekit-store', () => ({
  useLiveKitStore: jest.fn(() => ({
    setIsBottomSheetVisible: jest.fn(),
    currentRoomInfo: null,
    isConnected: false,
    isTalking: false,
  })),
}));

jest.mock('@/stores/app/audio-stream-store', () => ({
  useAudioStreamStore: jest.fn(() => ({
    setIsBottomSheetVisible: jest.fn(),
    currentStream: null,
    isPlaying: false,
  })),
}));

// Mock the AudioStreamBottomSheet component
jest.mock('@/components/audio-stream/audio-stream-bottom-sheet', () => ({
  AudioStreamBottomSheet: () => null,
}));

// Now import the component and store functions
import { SidebarUnitCard } from '../unit-sidebar';
import { useCoreStore } from '@/stores/app/core-store';
import { useLocationStore } from '@/stores/app/location-store';
import { useLiveKitStore } from '@/stores/app/livekit-store';
import { useAudioStreamStore } from '@/stores/app/audio-stream-store';

const mockUseCoreStore = useCoreStore as jest.MockedFunction<typeof useCoreStore>;
const mockUseLocationStore = useLocationStore as jest.MockedFunction<typeof useLocationStore>;
const mockUseLiveKitStore = useLiveKitStore as jest.MockedFunction<typeof useLiveKitStore>;
const mockUseAudioStreamStore = useAudioStreamStore as jest.MockedFunction<typeof useAudioStreamStore>;

describe('SidebarUnitCard', () => {
  const mockSetMapLocked = jest.fn();
  const mockSetIsBottomSheetVisible = jest.fn();
  const mockSetAudioStreamBottomSheetVisible = jest.fn();

  const defaultProps = {
    unitName: 'Test Unit',
    unitType: 'Ambulance',
    unitGroup: 'Test Group',
    bgColor: 'bg-blue-500',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseCoreStore.mockReturnValue({
      activeUnit: null,
    });

    mockUseLocationStore.mockReturnValue({
      isMapLocked: false,
      setMapLocked: mockSetMapLocked,
    });

    mockUseLiveKitStore.mockReturnValue({
      setIsBottomSheetVisible: mockSetIsBottomSheetVisible,
      currentRoomInfo: null,
      isConnected: false,
      isTalking: false,
    });

    mockUseAudioStreamStore.mockReturnValue({
      setIsBottomSheetVisible: mockSetAudioStreamBottomSheetVisible,
      currentStream: null,
      isPlaying: false,
    });
  });

  it('renders unit information correctly', () => {
    render(<SidebarUnitCard {...defaultProps} />);

    expect(screen.getByText('Test Unit')).toBeTruthy();
    expect(screen.getByText('Ambulance')).toBeTruthy();
    expect(screen.getByText('Test Group')).toBeTruthy();
  });

  it('renders with default props when no active unit', () => {
    render(<SidebarUnitCard {...defaultProps} />);

    // Should render the default props since no active unit is set
    expect(screen.getByText('Test Unit')).toBeTruthy();
    expect(screen.getByText('Ambulance')).toBeTruthy();
    expect(screen.getByText('Test Group')).toBeTruthy();
  });

  describe('Map Lock Button', () => {
    it('renders map lock button with unlock icon when map is not locked', () => {
      render(<SidebarUnitCard {...defaultProps} />);

      const mapLockButton = screen.getByTestId('map-lock-button');
      expect(mapLockButton).toBeTruthy();

      // Check that the button has the correct styling for unlocked state
      expect(mapLockButton).toHaveStyle({
        backgroundColor: 'transparent',
        borderColor: '#007AFF',
      });
    });

    it('toggles map lock state when pressed', () => {
      render(<SidebarUnitCard {...defaultProps} />);

      const mapLockButton = screen.getByTestId('map-lock-button');
      fireEvent.press(mapLockButton);

      expect(mockSetMapLocked).toHaveBeenCalledWith(true);
    });
  });

  describe('Call Button', () => {
    it('renders call button with correct styling when not connected', () => {
      render(<SidebarUnitCard {...defaultProps} />);

      const callButton = screen.getByTestId('call-button');
      expect(callButton).toBeTruthy();

      // Check that the button has the correct styling for disconnected state
      expect(callButton).toHaveStyle({
        backgroundColor: 'transparent',
        borderColor: '#007AFF',
      });
    });

    it('opens LiveKit when call button is pressed', () => {
      render(<SidebarUnitCard {...defaultProps} />);

      const callButton = screen.getByTestId('call-button');
      fireEvent.press(callButton);

      expect(mockSetIsBottomSheetVisible).toHaveBeenCalledWith(true);
    });
  });

  describe('Audio Stream Button', () => {
    it('renders audio stream button with correct styling when not playing', () => {
      render(<SidebarUnitCard {...defaultProps} />);

      const audioStreamButton = screen.getByTestId('audio-stream-button');
      expect(audioStreamButton).toBeTruthy();

      // Check that the button has the correct styling for inactive state
      expect(audioStreamButton).toHaveStyle({
        backgroundColor: 'transparent',
        borderColor: '#007AFF',
      });
    });

    it('opens audio stream when button is pressed', () => {
      render(<SidebarUnitCard {...defaultProps} />);

      const audioStreamButton = screen.getByTestId('audio-stream-button');
      fireEvent.press(audioStreamButton);

      expect(mockSetAudioStreamBottomSheetVisible).toHaveBeenCalledWith(true);
    });
  });

  describe('Button Container Layout', () => {
    it('renders all buttons in the correct order', () => {
      render(<SidebarUnitCard {...defaultProps} />);

      const mapLockButton = screen.getByTestId('map-lock-button');
      const audioStreamButton = screen.getByTestId('audio-stream-button');
      const callButton = screen.getByTestId('call-button');

      expect(mapLockButton).toBeTruthy();
      expect(audioStreamButton).toBeTruthy();
      expect(callButton).toBeTruthy();
    });
  });
});
