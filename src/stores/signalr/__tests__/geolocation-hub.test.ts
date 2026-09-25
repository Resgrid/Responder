/**
 * The geolocation hub only broadcasts to a connection after it invokes `GeolocationConnect`, and
 * group membership belongs to a connection id: the initial start and every rebuild the service does
 * (after a close, a token expiry or the network coming back) all need a fresh join, or the live map
 * silently stops moving. These tests pin that, plus how pushed positions are stored.
 */
type HubHandler = (...data: unknown[]) => void;

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

jest.mock('@/services/signalr.service', () => ({
  signalRService: mockSignalRService,
  HUB_CONNECTED_EVENT: 'hubConnected',
  HUB_DISCONNECTED_EVENT: 'hubDisconnected',
  HUB_RECONNECT_EXHAUSTED_EVENT: 'hubReconnectExhausted',
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
  useChatStore: { getState: () => ({ handleChatConnected: jest.fn() }) },
}));

jest.mock('../../feature-flags/store', () => ({
  FeatureFlagKeys: { ChatSystem: 'Chat.System' },
  featureFlagsStore: { getState: () => ({ isEnabled: jest.fn().mockReturnValue(true) }) },
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

const GEO_HUB = 'geolocationHub';
const GUID = '0A1B2C3D-4E5F-6071-8293-A4B5C6D7E8F9';

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

function emit(event: string, ...data: unknown[]): void {
  registeredHandlers.get(event)?.forEach((callback) => callback(...data));
}

function joinInvocations(): unknown[][] {
  return mockSignalRService.invoke.mock.calls.filter((call) => call[0] === GEO_HUB && call[1] === 'GeolocationConnect');
}

async function flushPromises(): Promise<void> {
  for (let i = 0; i < 5; i += 1) {
    await Promise.resolve();
  }
}

describe('geolocation hub', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    registeredHandlers.clear();
    mockSignalRService.isHubAvailable.mockReturnValue(true);
    mockSignalRService.invoke.mockResolvedValue(undefined);
    mockSignalRService.connectToHubWithEventingUrl.mockResolvedValue(undefined);
  });

  afterEach(async () => {
    mockSignalRService.invoke.mockResolvedValue(undefined);
    await currentStore?.getState().disconnectGeolocationHub();
    currentStore = null;
    jest.useRealTimers();
  });

  describe('joining the department group', () => {
    it('invokes GeolocationConnect with zero arguments after connecting', async () => {
      const useSignalRStore = loadStore();

      await useSignalRStore.getState().connectGeolocationHub();

      expect(mockSignalRService.connectToHubWithEventingUrl).toHaveBeenCalledWith(
        expect.objectContaining({ name: GEO_HUB, hubName: GEO_HUB, methods: ['onPersonnelLocationUpdated', 'onUnitLocationUpdated', 'onGeolocationConnect'] })
      );
      // Exactly (hub, method): a trailing argument makes the server reject the call.
      expect(joinInvocations()).toEqual([[GEO_HUB, 'GeolocationConnect']]);
    });

    it('reports connected only once the server confirms the join', async () => {
      const useSignalRStore = loadStore();

      await useSignalRStore.getState().connectGeolocationHub();
      expect(useSignalRStore.getState().isGeolocationHubConnected).toBe(false);
      expect(useSignalRStore.getState().geolocationHubJoinedAt).toBe(0);

      emit('onGeolocationConnect', 'connection-id');

      expect(useSignalRStore.getState().isGeolocationHubConnected).toBe(true);
      expect(useSignalRStore.getState().geolocationHubJoinedAt).toBeGreaterThan(0);
    });

    it('joins once when the fresh connection also raises hubConnected', async () => {
      const useSignalRStore = loadStore();

      // The real service emits hubConnected from inside connectToHubWithEventingUrl while its
      // connection lock is held, so the event's join is still in flight when connect returns.
      let releaseJoin: () => void = () => undefined;
      mockSignalRService.invoke.mockImplementation((_hub: string, method: string) => {
        if (method === 'GeolocationConnect') {
          return new Promise<void>((resolve) => {
            releaseJoin = resolve;
          });
        }
        return Promise.resolve(undefined);
      });
      mockSignalRService.connectToHubWithEventingUrl.mockImplementation(async () => {
        emit('hubConnected', { hubName: GEO_HUB });
      });

      const pending = useSignalRStore.getState().connectGeolocationHub();
      await Promise.resolve();
      releaseJoin();
      await pending;

      expect(joinInvocations()).toHaveLength(1);
    });

    it('rejoins on every new connection the service raises (reconnect, token-expiry rebuild, network return)', async () => {
      const useSignalRStore = loadStore();
      await useSignalRStore.getState().connectGeolocationHub();
      emit('onGeolocationConnect', 'first');
      expect(joinInvocations()).toHaveLength(1);

      for (let cycle = 2; cycle <= 4; cycle += 1) {
        // The server closed the socket (e.g. CloseOnAuthenticationExpiration) or the transport dropped.
        emit('hubDisconnected', { hubName: GEO_HUB });
        expect(useSignalRStore.getState().isGeolocationHubConnected).toBe(false);

        // The service rebuilt the connection with a fresh token and announced it.
        emit('hubConnected', { hubName: GEO_HUB });
        await flushPromises();
        expect(joinInvocations()).toHaveLength(cycle);

        emit('onGeolocationConnect', `conn-${cycle}`);
        expect(useSignalRStore.getState().isGeolocationHubConnected).toBe(true);
      }
    });

    it('ignores lifecycle events that belong to other hubs', async () => {
      const useSignalRStore = loadStore();
      await useSignalRStore.getState().connectGeolocationHub();
      emit('onGeolocationConnect', 'id');

      emit('hubDisconnected', { hubName: 'eventingHub' });
      emit('hubConnected', { hubName: 'chatHub' });
      await flushPromises();

      expect(useSignalRStore.getState().isGeolocationHubConnected).toBe(true);
      expect(joinInvocations()).toHaveLength(1);
    });

    it('retries a failed join and clears the connected flag', async () => {
      jest.useFakeTimers();
      const useSignalRStore = loadStore();
      mockSignalRService.invoke.mockRejectedValue(new Error('hub is currently reconnecting'));

      await useSignalRStore.getState().connectGeolocationHub();
      expect(joinInvocations()).toHaveLength(1);
      expect(useSignalRStore.getState().isGeolocationHubConnected).toBe(false);

      await jest.advanceTimersByTimeAsync(5000);
      expect(joinInvocations()).toHaveLength(2);

      mockSignalRService.invoke.mockResolvedValue(undefined);
      await jest.advanceTimersByTimeAsync(5000);
      expect(joinInvocations()).toHaveLength(3);

      // Succeeded: nothing further is scheduled.
      await jest.advanceTimersByTimeAsync(20000);
      expect(joinInvocations()).toHaveLength(3);
    });

    it('does not retry a join that fails after the hub was disconnected', async () => {
      jest.useFakeTimers();
      const useSignalRStore = loadStore();

      let rejectJoin: (error: Error) => void = () => undefined;
      mockSignalRService.invoke.mockImplementation(
        () =>
          new Promise<void>((_resolve, reject) => {
            rejectJoin = reject;
          })
      );

      const connecting = useSignalRStore.getState().connectGeolocationHub();
      await Promise.resolve();
      await useSignalRStore.getState().disconnectGeolocationHub();

      rejectJoin(new Error('connection closed'));
      await connecting;
      await jest.advanceTimersByTimeAsync(30000);

      expect(joinInvocations()).toHaveLength(1);
      expect(useSignalRStore.getState().isGeolocationHubConnected).toBe(false);
    });

    it('does not let a stale connected flag block rebuilding the session', async () => {
      const useSignalRStore = loadStore();
      useSignalRStore.setState({ isGeolocationHubConnected: true });
      mockSignalRService.isHubAvailable.mockReturnValue(false);

      await useSignalRStore.getState().connectGeolocationHub();

      expect(mockSignalRService.connectToHubWithEventingUrl).toHaveBeenCalledTimes(1);
      expect(joinInvocations()).toHaveLength(1);
    });

    it('keeps an already-live, joined session as is', async () => {
      const useSignalRStore = loadStore();
      useSignalRStore.setState({ isGeolocationHubConnected: true });

      await useSignalRStore.getState().connectGeolocationHub();

      expect(mockSignalRService.connectToHubWithEventingUrl).not.toHaveBeenCalled();
      expect(joinInvocations()).toHaveLength(0);
    });

    it('rejoins through connectGeolocationHub when the socket is open but the join was lost', async () => {
      const useSignalRStore = loadStore();
      await useSignalRStore.getState().connectGeolocationHub();
      expect(joinInvocations()).toHaveLength(1);

      // Socket still open (the service reports "already connected" and raises no event), but the
      // server never confirmed the join -- e.g. the retries were exhausted. Resume/toggle repairs it.
      await useSignalRStore.getState().connectGeolocationHub();

      expect(joinInvocations()).toHaveLength(2);
    });
  });

  describe('live locations', () => {
    const unitPayload = (unitId: string, latitude: number, longitude: number, timestamp: string | null = null) => ({ departmentId: 1, unitId, latitude, longitude, recordId: 'r', timestamp });

    it('stores unit and personnel positions per pin', async () => {
      const useSignalRStore = loadStore();
      await useSignalRStore.getState().connectGeolocationHub();

      emit('onUnitLocationUpdated', unitPayload('12', 39.5, -104.9, '2026-09-25T14:03:11.123Z'));
      emit('onPersonnelLocationUpdated', { departmentId: 1, userId: GUID, latitude: 40, longitude: -105, recordId: 'r', timestamp: null });

      const { liveLocations } = useSignalRStore.getState();
      expect(liveLocations.u12).toMatchObject({ pinId: 'u12', latitude: 39.5, longitude: -104.9, timestamp: Date.UTC(2026, 8, 25, 14, 3, 11, 123) });
      expect(liveLocations[`p${GUID.toLowerCase()}`]).toMatchObject({ latitude: 40, longitude: -105, timestamp: null });
    });

    it('keeps every entity from a burst of pushes, not just the last one', async () => {
      const useSignalRStore = loadStore();
      await useSignalRStore.getState().connectGeolocationHub();

      emit('onUnitLocationUpdated', unitPayload('1', 1, 1));
      emit('onUnitLocationUpdated', unitPayload('2', 2, 2));
      emit('onUnitLocationUpdated', JSON.stringify(unitPayload('3', 3, 3)));

      expect(Object.keys(useSignalRStore.getState().liveLocations).sort()).toEqual(['u1', 'u2', 'u3']);
    });

    it('ignores a replayed fix older than the one already applied', async () => {
      const useSignalRStore = loadStore();
      await useSignalRStore.getState().connectGeolocationHub();

      emit('onUnitLocationUpdated', unitPayload('12', 2, 2, '2026-09-25T14:05:00Z'));
      emit('onUnitLocationUpdated', unitPayload('12', 1, 1, '2026-09-25T14:00:00Z'));

      expect(useSignalRStore.getState().liveLocations.u12).toMatchObject({ latitude: 2, longitude: 2 });
    });

    it('ignores unusable payloads', async () => {
      const useSignalRStore = loadStore();
      await useSignalRStore.getState().connectGeolocationHub();

      emit('onUnitLocationUpdated', unitPayload('12', 0, 0));
      emit('onUnitLocationUpdated', unitPayload('13', 91, 0));
      emit('onPersonnelLocationUpdated', 'not json');

      expect(useSignalRStore.getState().liveLocations).toEqual({});
    });
  });
});
