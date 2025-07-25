import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { useColorScheme } from 'nativewind';

import { SideMenu } from '../side-menu';
import { useLiveKitStore } from '@/stores/app/livekit-store';
import { useAudioStreamStore } from '@/stores/app/audio-stream-store';

// Mock dependencies
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

jest.mock('nativewind', () => ({
  useColorScheme: jest.fn(),
  cssInterop: jest.fn(),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('@/lib/auth', () => ({
  useAuthStore: () => ({
    profile: {
      name: 'Test User',
      sub: '12345678',
    },
    logout: jest.fn(),
  }),
}));

jest.mock('@/stores/app/livekit-store', () => ({
  useLiveKitStore: jest.fn(),
}));

jest.mock('@/stores/app/audio-stream-store', () => ({
  useAudioStreamStore: jest.fn(),
}));

jest.mock('../../audio-stream/audio-stream-bottom-sheet', () => ({
  AudioStreamBottomSheet: 'AudioStreamBottomSheet',
}));

// Mock UI components
jest.mock('@/components/ui/avatar', () => ({
  Avatar: 'Avatar',
  AvatarFallbackText: 'AvatarFallbackText',
  AvatarImage: 'AvatarImage',
}));

jest.mock('@/components/ui/box', () => ({
  Box: 'Box',
}));

jest.mock('@/components/ui/divider', () => ({
  Divider: 'Divider',
}));

jest.mock('@/components/ui/hstack', () => ({
  HStack: 'HStack',
}));

jest.mock('@/components/ui/scroll-view', () => ({
  ScrollView: 'ScrollView',
}));

jest.mock('@/components/ui/text', () => ({
  Text: 'Text',
}));

jest.mock('@/components/ui/vstack', () => ({
  VStack: 'VStack',
}));

const mockUseLiveKitStore = useLiveKitStore as jest.MockedFunction<typeof useLiveKitStore>;
const mockUseAudioStreamStore = useAudioStreamStore as jest.MockedFunction<typeof useAudioStreamStore>;
const mockUseColorScheme = useColorScheme as jest.MockedFunction<typeof useColorScheme>;

describe('SideMenu', () => {
  const mockSetIsBottomSheetVisible = jest.fn();
  const mockToggleMicrophone = jest.fn();
  const mockSetAudioStreamBottomSheetVisible = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseColorScheme.mockReturnValue({
      colorScheme: 'light',
      setColorScheme: jest.fn(),
      toggleColorScheme: jest.fn(),
    });

    // Default audio stream store mock
    mockUseAudioStreamStore.mockReturnValue({
      currentStream: null,
      isPlaying: false,
      setIsBottomSheetVisible: mockSetAudioStreamBottomSheetVisible,
    });
  });

  it('should render PTT button with normal styling when not connected to voice call', () => {
    mockUseLiveKitStore.mockReturnValue({
      isConnected: false,
      setIsBottomSheetVisible: mockSetIsBottomSheetVisible,
      toggleMicrophone: mockToggleMicrophone,
    });

    render(<SideMenu />);

    const pttButton = screen.getByTestId('side-menu-ptt-button');
    expect(pttButton).toBeTruthy();

    // Check that the button has outline styling (light theme, not connected)
    expect(pttButton.props.className).toContain('border-green-600');
    expect(pttButton.props.className).toContain('bg-transparent');
    expect(pttButton.props.className).not.toContain('bg-green-600');
  });

  it('should render PTT button with active styling when connected to voice call', () => {
    mockUseLiveKitStore.mockReturnValue({
      isConnected: true,
      setIsBottomSheetVisible: mockSetIsBottomSheetVisible,
      toggleMicrophone: mockToggleMicrophone,
    });

    render(<SideMenu />);

    const pttButton = screen.getByTestId('side-menu-ptt-button');
    expect(pttButton).toBeTruthy();

    // Check that the button has active styling (connected)
    expect(pttButton.props.className).toContain('bg-green-600');
    expect(pttButton.props.className).toContain('border-green-600');
    expect(pttButton.props.className).not.toContain('bg-transparent');
  });

  it('should open LiveKit bottom sheet when PTT button is pressed and not connected', () => {
    mockUseLiveKitStore.mockReturnValue({
      isConnected: false,
      setIsBottomSheetVisible: mockSetIsBottomSheetVisible,
      toggleMicrophone: mockToggleMicrophone,
    });

    render(<SideMenu />);

    const pttButton = screen.getByTestId('side-menu-ptt-button');
    fireEvent.press(pttButton);

    expect(mockSetIsBottomSheetVisible).toHaveBeenCalledWith(true);
    expect(mockToggleMicrophone).not.toHaveBeenCalled();
  });

  it('should open LiveKit bottom sheet when PTT button is pressed and connected', () => {
    mockUseLiveKitStore.mockReturnValue({
      isConnected: true,
      setIsBottomSheetVisible: mockSetIsBottomSheetVisible,
      toggleMicrophone: mockToggleMicrophone,
    });

    render(<SideMenu />);

    const pttButton = screen.getByTestId('side-menu-ptt-button');
    fireEvent.press(pttButton);

    expect(mockSetIsBottomSheetVisible).toHaveBeenCalledWith(true);
    expect(mockToggleMicrophone).not.toHaveBeenCalled();
  });

  it('should render PTT button with correct dark mode styling when not connected', () => {
    mockUseColorScheme.mockReturnValue({
      colorScheme: 'dark',
      setColorScheme: jest.fn(),
      toggleColorScheme: jest.fn(),
    });
    mockUseLiveKitStore.mockReturnValue({
      isConnected: false,
      setIsBottomSheetVisible: mockSetIsBottomSheetVisible,
      toggleMicrophone: mockToggleMicrophone,
    });

    render(<SideMenu />);

    const pttButton = screen.getByTestId('side-menu-ptt-button');
    expect(pttButton).toBeTruthy();

    // Check that the button has dark mode outline styling (not connected)
    expect(pttButton.props.className).toContain('border-green-600');
    expect(pttButton.props.className).toContain('bg-transparent');
    expect(pttButton.props.className).not.toContain('bg-green-600');
  });

  it('should render PTT button with correct dark mode styling when connected', () => {
    mockUseColorScheme.mockReturnValue({
      colorScheme: 'dark',
      setColorScheme: jest.fn(),
      toggleColorScheme: jest.fn(),
    });
    mockUseLiveKitStore.mockReturnValue({
      isConnected: true,
      setIsBottomSheetVisible: mockSetIsBottomSheetVisible,
      toggleMicrophone: mockToggleMicrophone,
    });

    render(<SideMenu />);

    const pttButton = screen.getByTestId('side-menu-ptt-button');
    expect(pttButton).toBeTruthy();

    // Check that the button has active styling in dark mode (connected)
    expect(pttButton.props.className).toContain('bg-green-600');
    expect(pttButton.props.className).not.toContain('bg-green-900');
  });

  it('should render profile section correctly', () => {
    mockUseLiveKitStore.mockReturnValue({
      isConnected: false,
      setIsBottomSheetVisible: mockSetIsBottomSheetVisible,
      toggleMicrophone: mockToggleMicrophone,
    });

    render(<SideMenu />);

    expect(screen.getByTestId('side-menu-profile')).toBeTruthy();
    expect(screen.getByTestId('side-menu-profile-name')).toBeTruthy();
    expect(screen.getByTestId('side-menu-profile-id')).toBeTruthy();
  });

  it('should render all navigation menu items', () => {
    mockUseLiveKitStore.mockReturnValue({
      isConnected: false,
      setIsBottomSheetVisible: mockSetIsBottomSheetVisible,
      toggleMicrophone: mockToggleMicrophone,
    });

    render(<SideMenu />);

    // Check that all expected menu items are rendered
    expect(screen.getByTestId('side-menu-home')).toBeTruthy();
    expect(screen.getByTestId('side-menu-messages')).toBeTruthy();
    expect(screen.getByTestId('side-menu-contacts')).toBeTruthy();
    expect(screen.getByTestId('side-menu-map')).toBeTruthy();
    expect(screen.getByTestId('side-menu-notes')).toBeTruthy();
    expect(screen.getByTestId('side-menu-protocols')).toBeTruthy();
    expect(screen.getByTestId('side-menu-calendar')).toBeTruthy();
    expect(screen.getByTestId('side-menu-shifts')).toBeTruthy();
    expect(screen.getByTestId('side-menu-settings')).toBeTruthy();
  });

  describe('Audio Stream Button', () => {
    it('should render with outline styling when no stream is playing', () => {
      mockUseLiveKitStore.mockReturnValue({
        isConnected: false,
        setIsBottomSheetVisible: mockSetIsBottomSheetVisible,
        toggleMicrophone: mockToggleMicrophone,
      });

      mockUseAudioStreamStore.mockReturnValue({
        currentStream: null,
        isPlaying: false,
        setIsBottomSheetVisible: mockSetAudioStreamBottomSheetVisible,
      });

      render(<SideMenu />);

      const audioButton = screen.getByTestId('side-menu-audio-button');
      expect(audioButton).toBeTruthy();

      // Check outline styling when not playing
      expect(audioButton.props.className).toContain('border-blue-600');
      expect(audioButton.props.className).toContain('bg-transparent');
      expect(audioButton.props.className).not.toContain('bg-blue-600');
    });

    it('should render with filled styling when stream is playing', () => {
      mockUseLiveKitStore.mockReturnValue({
        isConnected: false,
        setIsBottomSheetVisible: mockSetIsBottomSheetVisible,
        toggleMicrophone: mockToggleMicrophone,
      });

      mockUseAudioStreamStore.mockReturnValue({
        currentStream: { Id: '1', Name: 'Test Stream' },
        isPlaying: true,
        setIsBottomSheetVisible: mockSetAudioStreamBottomSheetVisible,
      });

      render(<SideMenu />);

      const audioButton = screen.getByTestId('side-menu-audio-button');
      expect(audioButton).toBeTruthy();

      // Check filled styling when playing
      expect(audioButton.props.className).toContain('border-blue-600');
      expect(audioButton.props.className).toContain('bg-blue-600');
      expect(audioButton.props.className).not.toContain('bg-transparent');
    });

    it('should open audio stream bottom sheet when pressed', () => {
      mockUseLiveKitStore.mockReturnValue({
        isConnected: false,
        setIsBottomSheetVisible: mockSetIsBottomSheetVisible,
        toggleMicrophone: mockToggleMicrophone,
      });

      mockUseAudioStreamStore.mockReturnValue({
        currentStream: null,
        isPlaying: false,
        setIsBottomSheetVisible: mockSetAudioStreamBottomSheetVisible,
      });

      render(<SideMenu />);

      const audioButton = screen.getByTestId('side-menu-audio-button');
      fireEvent.press(audioButton);

      expect(mockSetAudioStreamBottomSheetVisible).toHaveBeenCalledWith(true);
    });

    it('should re-open audio stream bottom sheet when pressed while playing', () => {
      mockUseLiveKitStore.mockReturnValue({
        isConnected: false,
        setIsBottomSheetVisible: mockSetIsBottomSheetVisible,
        toggleMicrophone: mockToggleMicrophone,
      });

      mockUseAudioStreamStore.mockReturnValue({
        currentStream: { Id: '1', Name: 'Test Stream' },
        isPlaying: true,
        setIsBottomSheetVisible: mockSetAudioStreamBottomSheetVisible,
      });

      render(<SideMenu />);

      const audioButton = screen.getByTestId('side-menu-audio-button');
      fireEvent.press(audioButton);

      expect(mockSetAudioStreamBottomSheetVisible).toHaveBeenCalledWith(true);
    });
  });
}); 