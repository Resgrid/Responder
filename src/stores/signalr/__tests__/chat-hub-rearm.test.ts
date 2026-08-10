/**
 * The chat hub only places a connection into its channel groups in response to
 * `Connect`, and every reconnect issues a fresh connection id. These tests pin the
 * behaviour that keeps a reconnected socket from going silent.
 */
type HubHandler = (data: unknown) => void;

const registeredHandlers = new Map<string, Set<HubHandler>>();

const mockSignalRService = {
  connectToHubWithEventingUrl: jest.fn().mockResolvedValue(undefined),
  connectToHub: jest.fn().mockResolvedValue(undefined),
  disconnectFromHub: jest.fn().mockResolvedValue(undefined),
  disconnectAll: jest.fn().mockResolvedValue(undefined),
  invoke: jest.fn().mockResolvedValue(undefined),
  isHubAvailable: jest.fn().mockReturnValue(true),
  on: jest.fn((event: string, callback: HubHandler) => {
    if (!registeredHandlers.has(event)) registeredHandlers.set(event, new Set());
    registeredHandlers.get(event)?.add(callback);
  }),
  off: jest.fn((event: string, callback: HubHandler) => {
    registeredHandlers.get(event)?.delete(callback);
  }),
};

const mockHandleChatConnected = jest.fn();
const mockIsEnabled = jest.fn().mockReturnValue(true);

jest.mock('@/services/signalr.service', () => ({
  signalRService: mockSignalRService,
  HUB_CONNECTED_EVENT: 'hubConnected',
  HUB_DISCONNECTED_EVENT: 'hubDisconnected',
}));

jest.mock('@/lib/env', () => ({
  Env: {
    CHANNEL_HUB_NAME: 'eventingHub',
    REALTIME_GEO_HUB_NAME: 'geolocationHub',
    CHAT_HUB_NAME: 'chatHub',
  },
}));

jest.mock('@/lib', () => ({
  useAuthStore: { getState: jest.fn(() => ({ accessToken: 'mock-token' })) },
}));

jest.mock('@/lib/logging', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn(), trace: jest.fn(), fatal: jest.fn() },
}));

jest.mock('../../chat/store', () => ({
  useChatStore: { getState: () => ({ handleChatConnected: mockHandleChatConnected }) },
}));

jest.mock('../../feature-flags/store', () => ({
  FeatureFlagKeys: { ChatSystem: 'Chat.System' },
  featureFlagsStore: { getState: () => ({ isEnabled: mockIsEnabled }) },
}));

jest.mock('../../app/core-store', () => ({
  useCoreStore: { getState: () => ({ config: { EventingUrl: 'https://eventing.example.com/' } }) },
}));

jest.mock('../../security/store', () => {
  const store = { getState: jest.fn(() => ({ rights: { DepartmentId: '123' } })) };
  return { securityStore: store, useSecurityStore: store };
});

jest.mock('../../weather-alerts/weather-alerts-store', () => ({
  useWeatherAlertsStore: { getState: jest.fn(() => ({ handleAlertReceived: jest.fn(), handleAlertUpdated: jest.fn(), handleAlertExpired: jest.fn() })) },
}));

const CHAT_HUB = 'chatHub';

type SignalRStoreApi = typeof import('../signalr-store').useSignalRStore;

let currentStore: SignalRStoreApi | null = null;

function loadStore(): SignalRStoreApi {
  let store: SignalRStoreApi | undefined;
  jest.isolateModules(() => {
    store = require('../signalr-store').useSignalRStore as SignalRStoreApi;
  });
  if (!store) throw new Error('failed to load signalr store');
  currentStore = store;
  return store;
}

function emit(event: string, data: unknown): void {
  registeredHandlers.get(event)?.forEach((callback) => callback(data));
}

function connectInvocations(): unknown[][] {
  return mockSignalRService.invoke.mock.calls.filter((call) => call[0] === CHAT_HUB && call[1] === 'Connect');
}

describe('chat hub re-arming', () => {
  let now = 1_000_000;

  beforeEach(() => {
    jest.clearAllMocks();
    registeredHandlers.clear();
    mockIsEnabled.mockReturnValue(true);
    mockSignalRService.isHubAvailable.mockReturnValue(true);
    mockSignalRService.invoke.mockResolvedValue(undefined);
    mockSignalRService.connectToHubWithEventingUrl.mockResolvedValue(undefined);
    now = 1_000_000;
    jest.spyOn(Date, 'now').mockImplementation(() => now);
  });

  afterEach(async () => {
    // Leaves no heartbeat interval or arm-retry timeout behind for the next test.
    mockSignalRService.invoke.mockResolvedValue(undefined);
    await currentStore?.getState().disconnectChatHub();
    currentStore = null;
    jest.restoreAllMocks();
  });

  it('announces presence and resyncs on the initial connect', async () => {
    const useSignalRStore = loadStore();

    await useSignalRStore.getState().connectChatHub();

    expect(connectInvocations()).toHaveLength(1);
    expect(useSignalRStore.getState().isChatHubConnected).toBe(true);
    expect(mockHandleChatConnected).toHaveBeenCalledTimes(1);
  });

  it('announces once when the connection also raises hubConnected', async () => {
    const useSignalRStore = loadStore();

    // The real service emits hubConnected from inside connectToHubWithEventingUrl, and its
    // invoke() waits on the same connection lock — so the lifecycle handler's arm is still
    // parked when connectChatHub resumes and checks whether the session is armed. Holding
    // Connect open reproduces that ordering; resolving it immediately would not.
    let releaseConnect: () => void = () => undefined;
    mockSignalRService.invoke.mockImplementation((_hub: string, method: string) => {
      if (method === 'Connect') {
        return new Promise<void>((resolve) => {
          releaseConnect = resolve;
        });
      }
      return Promise.resolve(undefined);
    });
    mockSignalRService.connectToHubWithEventingUrl.mockImplementation(async () => {
      emit('hubConnected', { hubName: CHAT_HUB });
    });

    const pending = useSignalRStore.getState().connectChatHub();
    // Let connectChatHub reach its fallback check while the first arm is still in flight.
    await Promise.resolve();
    releaseConnect();
    await pending;

    // Two arms for one connection id would announce twice and halve the retry budget.
    expect(connectInvocations()).toHaveLength(1);
    expect(useSignalRStore.getState().isChatHubConnected).toBe(true);
    expect(mockHandleChatConnected).toHaveBeenCalledTimes(1);
  });

  it('re-announces presence when the hub reconnects', async () => {
    const useSignalRStore = loadStore();
    await useSignalRStore.getState().connectChatHub();
    expect(connectInvocations()).toHaveLength(1);

    // The transport dropped and the SignalR client reconnected on its own: the new
    // connection id belongs to no groups until we announce it again.
    emit('hubDisconnected', { hubName: CHAT_HUB });
    expect(useSignalRStore.getState().isChatHubConnected).toBe(false);

    now += 10_000;
    emit('hubConnected', { hubName: CHAT_HUB });
    await Promise.resolve();
    await Promise.resolve();

    expect(connectInvocations()).toHaveLength(2);
    expect(useSignalRStore.getState().isChatHubConnected).toBe(true);
    expect(mockHandleChatConnected).toHaveBeenCalledTimes(2);
  });

  it('resyncs a reconnect that lands inside the debounce window', async () => {
    const useSignalRStore = loadStore();
    await useSignalRStore.getState().connectChatHub();
    expect(mockHandleChatConnected).toHaveBeenCalledTimes(1);

    // A blip: withAutomaticReconnect retries immediately, so the new connection routinely
    // arrives well inside CHAT_RESYNC_DEBOUNCE_MS. Debouncing across it would skip the
    // backfill of everything missed while the socket was down.
    emit('hubDisconnected', { hubName: CHAT_HUB });
    now += 200;
    emit('hubConnected', { hubName: CHAT_HUB });
    await Promise.resolve();
    await Promise.resolve();

    expect(connectInvocations()).toHaveLength(2);
    expect(mockHandleChatConnected).toHaveBeenCalledTimes(2);
  });

  it('still collapses duplicate resync signals within one connection', async () => {
    const useSignalRStore = loadStore();
    await useSignalRStore.getState().connectChatHub();
    expect(mockHandleChatConnected).toHaveBeenCalledTimes(1);

    // The server echoes its own onChatConnected right after ours; that is a duplicate for
    // the same connection id and must not fan out a second resync.
    now += 200;
    emit('onChatConnected', undefined);

    expect(mockHandleChatConnected).toHaveBeenCalledTimes(1);
  });

  it('ignores lifecycle events from other hubs', async () => {
    const useSignalRStore = loadStore();
    await useSignalRStore.getState().connectChatHub();

    emit('hubDisconnected', { hubName: 'eventingHub' });
    expect(useSignalRStore.getState().isChatHubConnected).toBe(true);

    now += 10_000;
    emit('hubConnected', { hubName: 'geolocationHub' });
    await Promise.resolve();

    expect(connectInvocations()).toHaveLength(1);
  });

  it('keeps chat handlers subscribed when announcing fails on a live socket', async () => {
    const useSignalRStore = loadStore();
    mockSignalRService.invoke.mockRejectedValue(new Error('hub is currently reconnecting'));

    await useSignalRStore.getState().connectChatHub();

    // Tearing the handlers down here would strand every incoming frame with no
    // listener and no way back, even though the connection is still usable.
    expect(mockSignalRService.off).not.toHaveBeenCalled();
    expect(registeredHandlers.get('chatMessageReceived')?.size).toBe(1);
    expect(useSignalRStore.getState().isChatHubConnected).toBe(false);
  });

  it('restores the retry budget when a new connection id arrives', async () => {
    jest.useFakeTimers();
    try {
      const useSignalRStore = loadStore();
      mockSignalRService.invoke.mockRejectedValue(new Error('hub is currently reconnecting'));

      // Spend the whole budget on this connection: the initial arm plus its retries.
      await useSignalRStore.getState().connectChatHub();
      for (let attempt = 1; attempt < 3; attempt += 1) {
        await jest.advanceTimersByTimeAsync(5000);
      }
      expect(connectInvocations()).toHaveLength(3);

      // Exhausted — no further retry is pending on this connection.
      await jest.advanceTimersByTimeAsync(5000);
      expect(connectInvocations()).toHaveLength(3);

      emit('hubDisconnected', { hubName: CHAT_HUB });
      now += 10_000;
      emit('hubConnected', { hubName: CHAT_HUB });
      await Promise.resolve();
      await Promise.resolve();

      // The new connection id arms with a full budget, so its failure retries again
      // rather than inheriting the previous connection's spent attempts.
      expect(connectInvocations()).toHaveLength(4);
      await jest.advanceTimersByTimeAsync(5000);
      expect(connectInvocations()).toHaveLength(5);
    } finally {
      jest.useRealTimers();
    }
  });

  it('does not connect when the chat feature flag is off', async () => {
    const useSignalRStore = loadStore();
    mockIsEnabled.mockReturnValue(false);

    await useSignalRStore.getState().connectChatHub();

    expect(mockSignalRService.connectToHubWithEventingUrl).not.toHaveBeenCalled();
    expect(connectInvocations()).toHaveLength(0);
  });
});
