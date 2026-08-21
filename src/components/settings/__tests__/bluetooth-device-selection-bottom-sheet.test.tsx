import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { render, screen } from '@testing-library/react-native';
import React from 'react';

import { useBluetoothAudioStore } from '@/stores/app/bluetooth-audio-store';

import { BluetoothDeviceSelectionBottomSheet } from '../bluetooth-device-selection-bottom-sheet';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => (options && 'rssi' in options ? `RSSI: ${options.rssi}dBm` : key),
  }),
}));

jest.mock('lucide-react-native', () => ({
  BluetoothIcon: () => null,
  RefreshCwIcon: () => null,
  WifiIcon: () => null,
}));

jest.mock('@/hooks/use-analytics', () => ({
  useAnalytics: () => ({ trackEvent: jest.fn() }),
}));

jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ error: jest.fn(), success: jest.fn() }),
}));

jest.mock('@/lib/hooks/use-preferred-bluetooth-device', () => ({
  usePreferredBluetoothDevice: () => ({ preferredDevice: null, setPreferredDevice: jest.fn() }),
}));

jest.mock('@/services/bluetooth-audio.service', () => ({
  bluetoothAudioService: {
    startScanning: jest.fn(),
    stopScanning: jest.fn(),
    connectToDevice: jest.fn(),
  },
}));

jest.mock('../../ui/bottom-sheet', () => {
  const ReactLocal = require('react');
  return {
    CustomBottomSheet: ({ children, isOpen }: { children: React.ReactNode; isOpen: boolean }) => (isOpen ? ReactLocal.createElement('View', { testID: 'bottom-sheet' }, children) : null),
  };
});

jest.mock('@/stores/app/bluetooth-audio-store', () => {
  const actual = jest.requireActual('@/stores/app/bluetooth-audio-store') as { State: unknown };
  return {
    State: actual.State,
    useBluetoothAudioStore: jest.fn(),
  };
});

const mockUseBluetoothAudioStore = useBluetoothAudioStore as unknown as jest.Mock;

const buildDevice = (rssi: number | undefined) => ({
  id: 'device-1',
  name: 'Handset One',
  rssi,
  hasAudioCapability: false,
  supportsMicrophoneControl: false,
  isConnected: false,
});

describe('BluetoothDeviceSelectionBottomSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderWithDevice = (rssi: number | undefined) => {
    mockUseBluetoothAudioStore.mockReturnValue({
      availableDevices: [buildDevice(rssi)],
      isScanning: false,
      bluetoothState: 'PoweredOn',
      connectedDevice: null,
      connectionError: null,
    });

    return render(<BluetoothDeviceSelectionBottomSheet isOpen={true} onClose={jest.fn()} />);
  };

  // Regression: the row used `{item.rssi && <Text>…</Text>}`. With a numeric left side a
  // signal reading of exactly 0 rendered a bare "0" outside a <Text>, which crashes React
  // Native with "Text strings must be rendered within a <Text> component".
  it('should render a zero RSSI reading inside a Text element instead of a bare number', () => {
    expect(() => renderWithDevice(0)).not.toThrow();

    expect(screen.getByText('RSSI: 0dBm')).toBeTruthy();
  });

  it('should render a normal RSSI reading', () => {
    renderWithDevice(-64);

    expect(screen.getByText('RSSI: -64dBm')).toBeTruthy();
  });

  it('should render no RSSI row when the device reports no signal strength', () => {
    renderWithDevice(undefined);

    expect(screen.queryByText(/RSSI/)).toBeNull();
  });
});
