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

  it('does not connect when the chat feature flag is off', async () => {
    const useSignalRStore = loadStore();
    mockIsEnabled.mockReturnValue(false);

    await useSignalRStore.getState().connectChatHub();

    expect(mockSignalRService.connectToHubWithEventingUrl).not.toHaveBeenCalled();
    expect(connectInvocations()).toHaveLength(0);
  });
});
