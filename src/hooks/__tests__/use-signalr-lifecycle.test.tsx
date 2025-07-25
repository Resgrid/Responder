import { renderHook, waitFor } from '@testing-library/react-native';
import { AppStateStatus } from 'react-native';

import { useSignalRStore } from '@/stores/signalr/signalr-store';

import { useSignalRLifecycle } from '../use-signalr-lifecycle';

// Mock the dependencies
jest.mock('@/stores/signalr/signalr-store');
jest.mock('../use-app-lifecycle');

const mockUseSignalRStore = useSignalRStore as jest.MockedFunction<typeof useSignalRStore>;
const mockUseAppLifecycle = require('../use-app-lifecycle').useAppLifecycle as jest.MockedFunction<any>;

describe('useSignalRLifecycle', () => {
  const mockConnectUpdateHub = jest.fn();
  const mockDisconnectUpdateHub = jest.fn();
  const mockConnectGeolocationHub = jest.fn();
  const mockDisconnectGeolocationHub = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock SignalR store
    mockUseSignalRStore.mockReturnValue({
      connectUpdateHub: mockConnectUpdateHub,
      disconnectUpdateHub: mockDisconnectUpdateHub,
      connectGeolocationHub: mockConnectGeolocationHub,
      disconnectGeolocationHub: mockDisconnectGeolocationHub,
      isUpdateHubConnected: false,
      isGeolocationHubConnected: false,
    } as any);

    // Mock app lifecycle
    mockUseAppLifecycle.mockReturnValue({
      isActive: true,
      appState: 'active' as AppStateStatus,
    });
  });

  it('should disconnect SignalR when app goes to background', async () => {
    const { rerender } = renderHook(
      ({ isSignedIn, hasInitialized, isActive, appState }) => {
        mockUseAppLifecycle.mockReturnValue({ isActive, appState });
        return useSignalRLifecycle({ isSignedIn, hasInitialized });
      },
      {
        initialProps: {
          isSignedIn: true,
          hasInitialized: true,
          isActive: true,
          appState: 'active' as AppStateStatus,
        },
      }
    );

    // Simulate app going to background
    rerender({
      isSignedIn: true,
      hasInitialized: true,
      isActive: false,
      appState: 'background' as AppStateStatus,
    });

    await waitFor(() => {
      expect(mockDisconnectUpdateHub).toHaveBeenCalled();
      expect(mockDisconnectGeolocationHub).toHaveBeenCalled();
    });
  });

  it('should reconnect SignalR when app becomes active from background', async () => {
    const { rerender } = renderHook(
      ({ isSignedIn, hasInitialized, isActive, appState }) => {
        mockUseAppLifecycle.mockReturnValue({ isActive, appState });
        return useSignalRLifecycle({ isSignedIn, hasInitialized });
      },
      {
        initialProps: {
          isSignedIn: true,
          hasInitialized: true,
          isActive: false,
          appState: 'background' as AppStateStatus,
        },
      }
    );

    // Simulate app becoming active
    rerender({
      isSignedIn: true,
      hasInitialized: true,
      isActive: true,
      appState: 'active' as AppStateStatus,
    });

    await waitFor(() => {
      expect(mockConnectUpdateHub).toHaveBeenCalled();
      expect(mockConnectGeolocationHub).toHaveBeenCalled();
    }, { timeout: 1000 });
  });

  it('should not manage SignalR when user is not signed in', async () => {
    const { rerender } = renderHook(
      ({ isSignedIn, hasInitialized, isActive, appState }) => {
        mockUseAppLifecycle.mockReturnValue({ isActive, appState });
        return useSignalRLifecycle({ isSignedIn, hasInitialized });
      },
      {
        initialProps: {
          isSignedIn: false,
          hasInitialized: true,
          isActive: true,
          appState: 'active' as AppStateStatus,
        },
      }
    );

    // Simulate app going to background
    rerender({
      isSignedIn: false,
      hasInitialized: true,
      isActive: false,
      appState: 'background' as AppStateStatus,
    });

    // Should not call SignalR methods when user is not signed in
    expect(mockDisconnectUpdateHub).not.toHaveBeenCalled();
    expect(mockDisconnectGeolocationHub).not.toHaveBeenCalled();
  });

  it('should not manage SignalR when app is not initialized', async () => {
    const { rerender } = renderHook(
      ({ isSignedIn, hasInitialized, isActive, appState }) => {
        mockUseAppLifecycle.mockReturnValue({ isActive, appState });
        return useSignalRLifecycle({ isSignedIn, hasInitialized });
      },
      {
        initialProps: {
          isSignedIn: true,
          hasInitialized: false,
          isActive: true,
          appState: 'active' as AppStateStatus,
        },
      }
    );

    // Simulate app going to background
    rerender({
      isSignedIn: true,
      hasInitialized: false,
      isActive: false,
      appState: 'background' as AppStateStatus,
    });

    // Should not call SignalR methods when app is not initialized
    expect(mockDisconnectUpdateHub).not.toHaveBeenCalled();
    expect(mockDisconnectGeolocationHub).not.toHaveBeenCalled();
  });
}); 