import { act, renderHook } from '@testing-library/react-native';
import { type AppStateStatus } from 'react-native';

import { useSignalRLifecycle } from '@/hooks/use-signalr-lifecycle';
import { loadRealtimeGeolocationState } from '@/lib/storage/realtime-geolocation';

// Drives the real hook: the app lifecycle, the SignalR store and the stored opt-in are mocked.
const mockAppLifecycle: { isActive: boolean; appState: AppStateStatus } = { isActive: true, appState: 'active' };

jest.mock('@/hooks/use-app-lifecycle', () => ({
  useAppLifecycle: () => mockAppLifecycle,
}));

const mockSignalRStore = {
  connectUpdateHub: jest.fn(),
  disconnectUpdateHub: jest.fn(),
  connectGeolocationHub: jest.fn(),
  disconnectGeolocationHub: jest.fn(),
  connectChatHub: jest.fn(),
  disconnectChatHub: jest.fn(),
};

jest.mock('@/stores/signalr/signalr-store', () => ({
  useSignalRStore: (selector: (state: typeof mockSignalRStore) => unknown) => selector(mockSignalRStore),
}));

jest.mock('@/lib/storage/realtime-geolocation', () => ({
  loadRealtimeGeolocationState: jest.fn(),
}));

jest.mock('@/lib/logging', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const mockLoadRealtimeGeolocationState = loadRealtimeGeolocationState as jest.MockedFunction<typeof loadRealtimeGeolocationState>;

interface LifecycleProps {
  isSignedIn: boolean;
  hasInitialized: boolean;
}

const renderLifecycle = (props: LifecycleProps) => renderHook((current: LifecycleProps) => useSignalRLifecycle(current), { initialProps: props });

const setAppState = (isActive: boolean, appState: AppStateStatus) => {
  mockAppLifecycle.isActive = isActive;
  mockAppLifecycle.appState = appState;
};

describe('useSignalRLifecycle', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    Object.values(mockSignalRStore).forEach((fn) => fn.mockResolvedValue(undefined));
    mockLoadRealtimeGeolocationState.mockResolvedValue(true);
    setAppState(true, 'active');
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  /** Background long enough to disconnect, then come back to the foreground. */
  const backgroundThenResume = async (rerender: (props: LifecycleProps) => void, props: LifecycleProps) => {
    setAppState(false, 'background');
    rerender(props);
    await act(async () => {
      await jest.advanceTimersByTimeAsync(2000);
    });

    setAppState(true, 'active');
    rerender(props);
    await act(async () => {
      await jest.advanceTimersByTimeAsync(1000);
    });
  };

  it('reconnects every hub on resume when realtime geolocation is enabled', async () => {
    const props = { isSignedIn: true, hasInitialized: true };
    const { rerender } = renderLifecycle(props);

    await backgroundThenResume(rerender, props);

    expect(mockSignalRStore.connectUpdateHub).toHaveBeenCalledTimes(1);
    expect(mockSignalRStore.connectGeolocationHub).toHaveBeenCalledTimes(1);
    expect(mockSignalRStore.connectChatHub).toHaveBeenCalledTimes(1);
  });

  it('leaves the geolocation hub disconnected on resume when the user opted out', async () => {
    mockLoadRealtimeGeolocationState.mockResolvedValue(false);
    const props = { isSignedIn: true, hasInitialized: true };
    const { rerender } = renderLifecycle(props);

    await backgroundThenResume(rerender, props);

    // Startup follows the stored opt-in; resume has to as well rather than reconnecting a hub the
    // user switched off in Settings.
    expect(mockSignalRStore.connectGeolocationHub).not.toHaveBeenCalled();
    expect(mockSignalRStore.connectUpdateHub).toHaveBeenCalledTimes(1);
    expect(mockSignalRStore.connectChatHub).toHaveBeenCalledTimes(1);
  });

  it('still reconnects the other hubs when one of them fails', async () => {
    mockSignalRStore.connectUpdateHub.mockRejectedValue(new Error('offline'));
    const props = { isSignedIn: true, hasInitialized: true };
    const { rerender } = renderLifecycle(props);

    await backgroundThenResume(rerender, props);

    expect(mockSignalRStore.connectGeolocationHub).toHaveBeenCalledTimes(1);
    expect(mockSignalRStore.connectChatHub).toHaveBeenCalledTimes(1);
  });

  it('does not manage SignalR connections when the user is not signed in', async () => {
    const props = { isSignedIn: false, hasInitialized: true };
    const { rerender } = renderLifecycle(props);

    await backgroundThenResume(rerender, props);

    Object.values(mockSignalRStore).forEach((fn) => expect(fn).not.toHaveBeenCalled());
  });

  it('does not manage SignalR connections before the app has initialized', async () => {
    const props = { isSignedIn: true, hasInitialized: false };
    const { rerender } = renderLifecycle(props);

    await backgroundThenResume(rerender, props);

    Object.values(mockSignalRStore).forEach((fn) => expect(fn).not.toHaveBeenCalled());
  });
});
