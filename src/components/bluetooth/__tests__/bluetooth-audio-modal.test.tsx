// Mock Platform first, before any other imports
jest.mock('react-native/Libraries/Utilities/Platform', () => ({
  OS: 'ios',
  select: jest.fn().mockImplementation((obj) => obj.ios || obj.default),
}));

// Mock react-native-svg before anything else
jest.mock('react-native-svg', () => ({
  Svg: 'Svg',
  Circle: 'Circle',
  Ellipse: 'Ellipse',
  G: 'G',
  Text: 'Text',
  TSpan: 'TSpan',
  TextPath: 'TextPath',
  Path: 'Path',
  Polygon: 'Polygon',
  Polyline: 'Polyline',
  Line: 'Line',
  Rect: 'Rect',
  Use: 'Use',
  Image: 'Image',
  Symbol: 'Symbol',
  Defs: 'Defs',
  LinearGradient: 'LinearGradient',
  RadialGradient: 'RadialGradient',
  Stop: 'Stop',
  ClipPath: 'ClipPath',
  Pattern: 'Pattern',
  Mask: 'Mask',
  default: 'Svg',
}));

import { render } from '@testing-library/react-native';
import React from 'react';

import BluetoothAudioModal from '../bluetooth-audio-modal';

// Mock dependencies
jest.mock('@/services/bluetooth-audio.service', () => ({
  bluetoothAudioService: {
    startScanning: jest.fn(),
    stopScanning: jest.fn(),
    connectToDevice: jest.fn(),
    disconnectDevice: jest.fn(),
  },
}));

jest.mock('@/stores/app/bluetooth-audio-store', () => ({
  useBluetoothAudioStore: jest.fn(),
}));

jest.mock('@/stores/app/livekit-store', () => ({
  useLiveKitStore: jest.fn(),
}));

jest.mock('@/hooks/use-analytics', () => ({
  useAnalytics: jest.fn(),
}));

jest.mock('react-native', () => ({
  Alert: {
    alert: jest.fn(),
  },
  useWindowDimensions: () => ({
    width: 400,
    height: 800,
  }),
  Platform: {
    OS: 'ios',
    select: jest.fn().mockImplementation((obj) => obj.ios || obj.default),
  },
  ActivityIndicator: 'ActivityIndicator',
  ScrollView: ({ children, ...props }: any) => {
    const React = require('react');
    return React.createElement('View', { testID: 'scroll-view', ...props }, children);
  },
}));

// Mock Date.now separately to avoid conflicts with Date constructor
const mockDateNow = jest.fn(() => 1642248000000); // Fixed timestamp
global.Date.now = mockDateNow;

// Mock lucide icons to avoid SVG issues in tests
jest.mock('lucide-react-native', () => ({
  AlertTriangle: 'AlertTriangle',
  Bluetooth: 'Bluetooth',
  BluetoothConnected: 'BluetoothConnected',
  CheckCircle: 'CheckCircle',
  Mic: 'Mic',
  MicOff: 'MicOff',
  RefreshCw: 'RefreshCw',
  Signal: 'Signal',
  Wifi: 'Wifi',
}));

// Mock gluestack UI components
jest.mock('@/components/ui/actionsheet', () => ({
  Actionsheet: ({ children, isOpen }: any) => isOpen ? children : null,
  ActionsheetBackdrop: () => null,
  ActionsheetContent: ({ children, ...props }: any) => {
    const React = require('react');
    return React.createElement('View', { testID: 'actionsheet-content', ...props }, children);
  },
  ActionsheetDragIndicator: () => null,
  ActionsheetDragIndicatorWrapper: ({ children }: any) => children,
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, ...props }: any) => {
    const React = require('react');
    return React.createElement('View', { testID: 'badge', ...props }, children);
  },
}));

jest.mock('@/components/ui/box', () => ({
  Box: ({ children, ...props }: any) => {
    const React = require('react');
    return React.createElement('View', { testID: 'box', ...props }, children);
  },
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onPress, ...props }: any) => {
    const React = require('react');
    return React.createElement('View', { onPress, testID: 'button', ...props }, children);
  },
  ButtonText: ({ children, ...props }: any) => {
    const React = require('react');
    return React.createElement('Text', { testID: 'button-text', ...props }, children);
  },
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({ children, ...props }: any) => {
    const React = require('react');
    return React.createElement('View', { testID: 'card', ...props }, children);
  },
}));

jest.mock('@/components/ui/heading', () => ({
  Heading: ({ children, ...props }: any) => {
    const React = require('react');
    return React.createElement('Text', { testID: 'heading', ...props }, children);
  },
}));

jest.mock('@/components/ui/hstack', () => ({
  HStack: ({ children, ...props }: any) => {
    const React = require('react');
    return React.createElement('View', { testID: 'hstack', ...props }, children);
  },
}));

jest.mock('@/components/ui/spinner', () => ({
  Spinner: (props: any) => {
    const React = require('react');
    return React.createElement('Text', { testID: 'spinner' }, 'Loading...');
  },
}));

jest.mock('@/components/ui/text', () => ({
  Text: ({ children, ...props }: any) => {
    const React = require('react');
    return React.createElement('Text', { testID: 'text', ...props }, children);
  },
}));

jest.mock('@/components/ui/vstack', () => ({
  VStack: ({ children, ...props }: any) => {
    const React = require('react');
    return React.createElement('View', { testID: 'vstack', ...props }, children);
  },
}));

// Import mocked hooks
const { useBluetoothAudioStore } = require('@/stores/app/bluetooth-audio-store');
const { useLiveKitStore } = require('@/stores/app/livekit-store');
const { useAnalytics } = require('@/hooks/use-analytics');

describe('BluetoothAudioModal', () => {
  const mockProps = {
    isOpen: true,
    onClose: jest.fn(),
  };

  const mockTrackEvent = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockDateNow.mockReturnValue(1642248000000); // Reset to default timestamp

    // Mock analytics
    useAnalytics.mockReturnValue({
      trackEvent: mockTrackEvent,
    });

    // Default mock for Bluetooth store
    useBluetoothAudioStore.mockReturnValue({
      bluetoothState: 'poweredOn',
      isScanning: false,
      isConnecting: false,
      availableDevices: [],
      connectedDevice: null,
      connectionError: null,
      isAudioRoutingActive: false,
      buttonEvents: [],
      lastButtonAction: null,
    });

    // Default mock for LiveKit store
    useLiveKitStore.mockReturnValue({
      isConnected: false,
      currentRoom: null,
    });
  });

  describe('Analytics Integration', () => {
    it('should import and use useAnalytics hook correctly', () => {
      render(<BluetoothAudioModal {...mockProps} />);

      expect(useAnalytics).toHaveBeenCalled();
      expect(mockTrackEvent).toBeDefined();
      expect(typeof mockTrackEvent).toBe('function');
    });

    it('should track modal viewed analytics when opened', () => {
      render(<BluetoothAudioModal {...mockProps} />);

      expect(mockTrackEvent).toHaveBeenCalledWith('bluetooth_audio_modal_viewed', {
        timestamp: expect.any(String),
        bluetoothState: 'poweredOn',
        availableDevicesCount: 0,
        hasConnectedDevice: false,
        connectedDeviceId: '',
        connectedDeviceName: '',
        isLiveKitConnected: false,
        isAudioRoutingActive: false,
        hasConnectionError: false,
        isScanning: false,
        isConnecting: false,
        recentButtonEventsCount: 0,
      });
    });

    it('should not track analytics when modal is not open', () => {
      render(<BluetoothAudioModal {...mockProps} isOpen={false} />);

      expect(mockTrackEvent).not.toHaveBeenCalled();
    });

    it('should track analytics with correct timestamp format', () => {
      const mockDate = new Date('2024-01-15T10:00:00Z');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);

      render(<BluetoothAudioModal {...mockProps} />);

      expect(mockTrackEvent).toHaveBeenCalledWith('bluetooth_audio_modal_viewed', expect.objectContaining({
        timestamp: '2024-01-15T10:00:00.000Z',
      }));

      jest.restoreAllMocks();
    });
  });

  describe('Data Validation', () => {
    it('should include all required properties in modal viewed analytics', () => {
      render(<BluetoothAudioModal {...mockProps} />);

      const expectedProperties = [
        'timestamp',
        'bluetoothState',
        'availableDevicesCount',
        'hasConnectedDevice',
        'connectedDeviceId',
        'connectedDeviceName',
        'isLiveKitConnected',
        'isAudioRoutingActive',
        'hasConnectionError',
        'isScanning',
        'isConnecting',
        'recentButtonEventsCount',
      ];

      expect(mockTrackEvent).toHaveBeenCalledWith('bluetooth_audio_modal_viewed', expect.objectContaining(
        expectedProperties.reduce((acc, prop) => ({ ...acc, [prop]: expect.anything() }), {})
      ));
    });

    it('should use correct data types for analytics properties', () => {
      render(<BluetoothAudioModal {...mockProps} />);

      expect(mockTrackEvent).toHaveBeenCalledWith('bluetooth_audio_modal_viewed', {
        timestamp: expect.any(String),
        bluetoothState: expect.any(String),
        availableDevicesCount: expect.any(Number),
        hasConnectedDevice: expect.any(Boolean),
        connectedDeviceId: expect.any(String),
        connectedDeviceName: expect.any(String),
        isLiveKitConnected: expect.any(Boolean),
        isAudioRoutingActive: expect.any(Boolean),
        hasConnectionError: expect.any(Boolean),
        isScanning: expect.any(Boolean),
        isConnecting: expect.any(Boolean),
        recentButtonEventsCount: expect.any(Number),
      });
    });

    it('should handle null connected device gracefully', () => {
      useBluetoothAudioStore.mockReturnValue({
        bluetoothState: 'poweredOn',
        isScanning: false,
        isConnecting: false,
        availableDevices: [],
        connectedDevice: null,
        connectionError: null,
        isAudioRoutingActive: false,
        buttonEvents: [],
        lastButtonAction: null,
      });

      render(<BluetoothAudioModal {...mockProps} />);

      expect(mockTrackEvent).toHaveBeenCalledWith('bluetooth_audio_modal_viewed', expect.objectContaining({
        hasConnectedDevice: false,
        connectedDeviceId: '',
        connectedDeviceName: '',
      }));
    });
  });
});
