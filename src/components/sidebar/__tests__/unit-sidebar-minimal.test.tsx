import { render } from '@testing-library/react-native';
import React from 'react';

// Mock all stores inline first
jest.mock('@/stores/app/core-store', () => ({
  useCoreStore: jest.fn(() => ({ activeUnit: null })),
}));

jest.mock('@/stores/app/location-store', () => ({
  useLocationStore: jest.fn(() => ({ isMapLocked: false, setMapLocked: jest.fn() })),
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

jest.mock('@/components/audio-stream/audio-stream-bottom-sheet', () => ({
  AudioStreamBottomSheet: () => null,
}));

// Test if we can import the component
describe('SidebarUnitCard - Import Test', () => {
  it('should be able to import the component', () => {
    const SidebarUnitCard = require('../unit-sidebar').SidebarUnitCard;
    expect(SidebarUnitCard).toBeDefined();
  });
});
