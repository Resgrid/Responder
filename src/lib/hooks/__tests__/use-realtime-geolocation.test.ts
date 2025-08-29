import { renderHook, act } from '@testing-library/react-native';

import { useRealtimeGeolocation, registerLocationServiceRealtimeUpdater } from '../use-realtime-geolocation';

// Mock dependencies
jest.mock('react-native-mmkv', () => ({
  useMMKVBoolean: jest.fn(),
}));

jest.mock('@/stores/signalr/signalr-store', () => ({
  useSignalRStore: jest.fn(),
}));

jest.mock('@/lib/logging', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@/lib/storage', () => ({
  storage: {},
}));

jest.mock('@/lib/storage/realtime-geolocation', () => ({
  getRealtimeGeolocationStorageKey: jest.fn(() => 'REALTIME_GEOLOCATION_ENABLED'),
  saveRealtimeGeolocationState: jest.fn(),
}));

import { useMMKVBoolean } from 'react-native-mmkv';
import { useSignalRStore } from '@/stores/signalr/signalr-store';
import { logger } from '@/lib/logging';
import { saveRealtimeGeolocationState } from '@/lib/storage/realtime-geolocation';

const mockUseMMKVBoolean = useMMKVBoolean as jest.MockedFunction<typeof useMMKVBoolean>;
const mockUseSignalRStore = useSignalRStore as jest.MockedFunction<typeof useSignalRStore>;
const mockLogger = logger as jest.Mocked<typeof logger>;
const mockSaveRealtimeGeolocationState = saveRealtimeGeolocationState as jest.MockedFunction<typeof saveRealtimeGeolocationState>;

describe('useRealtimeGeolocation', () => {
  let mockSetRealtimeGeolocationEnabled: jest.Mock;
  let mockConnectGeolocationHub: jest.Mock;
  let mockDisconnectGeolocationHub: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSetRealtimeGeolocationEnabled = jest.fn();
    mockConnectGeolocationHub = jest.fn();
    mockDisconnectGeolocationHub = jest.fn();

    mockUseMMKVBoolean.mockReturnValue([false, mockSetRealtimeGeolocationEnabled]);
    mockUseSignalRStore.mockReturnValue({
      isGeolocationHubConnected: false,
      connectGeolocationHub: mockConnectGeolocationHub,
      disconnectGeolocationHub: mockDisconnectGeolocationHub,
    });
  });

  it('should return initial state', () => {
    const { result } = renderHook(() => useRealtimeGeolocation());

    expect(result.current.isRealtimeGeolocationEnabled).toBe(false);
    expect(result.current.isGeolocationHubConnected).toBe(false);
    expect(typeof result.current.setRealtimeGeolocationEnabled).toBe('function');
  });

  it('should enable realtime geolocation and connect to hub', async () => {
    const mockLocationServiceUpdater = jest.fn();
    registerLocationServiceRealtimeUpdater(mockLocationServiceUpdater);

    const { result } = renderHook(() => useRealtimeGeolocation());

    await act(async () => {
      await result.current.setRealtimeGeolocationEnabled(true);
    });

    expect(mockSetRealtimeGeolocationEnabled).toHaveBeenCalledWith(true);
    expect(mockSaveRealtimeGeolocationState).toHaveBeenCalledWith(true);
    expect(mockLocationServiceUpdater).toHaveBeenCalledWith(true);
    expect(mockConnectGeolocationHub).toHaveBeenCalled();
    expect(mockLogger.info).toHaveBeenCalledWith({
      message: 'Realtime geolocation enabled',
      context: { enabled: true, hubConnected: false },
    });
  });

  it('should disable realtime geolocation and disconnect from hub', async () => {
    const mockLocationServiceUpdater = jest.fn();
    registerLocationServiceRealtimeUpdater(mockLocationServiceUpdater);

    const { result } = renderHook(() => useRealtimeGeolocation());

    await act(async () => {
      await result.current.setRealtimeGeolocationEnabled(false);
    });

    expect(mockSetRealtimeGeolocationEnabled).toHaveBeenCalledWith(false);
    expect(mockSaveRealtimeGeolocationState).toHaveBeenCalledWith(false);
    expect(mockLocationServiceUpdater).toHaveBeenCalledWith(false);
    expect(mockDisconnectGeolocationHub).toHaveBeenCalled();
    expect(mockLogger.info).toHaveBeenCalledWith({
      message: 'Realtime geolocation disabled',
      context: { enabled: false, hubConnected: false },
    });
  });

  it('should handle errors when setting realtime geolocation', async () => {
    const error = new Error('Connection failed');
    mockConnectGeolocationHub.mockRejectedValue(error);

    const { result } = renderHook(() => useRealtimeGeolocation());

    try {
      await act(async () => {
        await result.current.setRealtimeGeolocationEnabled(true);
      });
    } catch (thrownError) {
      expect(thrownError).toEqual(error);
    }

    expect(mockLogger.error).toHaveBeenCalledWith({
      message: 'Failed to update realtime geolocation state',
      context: { error, enabled: true },
    });
  });

  it('should work without location service updater registered', async () => {
    // Clear any previously registered updater
    registerLocationServiceRealtimeUpdater(null as any);

    const { result } = renderHook(() => useRealtimeGeolocation());

    await act(async () => {
      await result.current.setRealtimeGeolocationEnabled(true);
    });

    expect(mockSetRealtimeGeolocationEnabled).toHaveBeenCalledWith(true);
    expect(mockConnectGeolocationHub).toHaveBeenCalled();
  });

  it('should return true when realtime geolocation is enabled', () => {
    mockUseMMKVBoolean.mockReturnValue([true, mockSetRealtimeGeolocationEnabled]);

    const { result } = renderHook(() => useRealtimeGeolocation());

    expect(result.current.isRealtimeGeolocationEnabled).toBe(true);
  });

  it('should return hub connected state', () => {
    mockUseSignalRStore.mockReturnValue({
      isGeolocationHubConnected: true,
      connectGeolocationHub: mockConnectGeolocationHub,
      disconnectGeolocationHub: mockDisconnectGeolocationHub,
    });

    const { result } = renderHook(() => useRealtimeGeolocation());

    expect(result.current.isGeolocationHubConnected).toBe(true);
  });
});

describe('registerLocationServiceRealtimeUpdater', () => {
  it('should register location service updater function', () => {
    const mockUpdater = jest.fn();
    
    // This should not throw any errors
    expect(() => {
      registerLocationServiceRealtimeUpdater(mockUpdater);
    }).not.toThrow();
  });
});
