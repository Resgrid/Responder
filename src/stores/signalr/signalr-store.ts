import { create } from 'zustand';

import { useAuthStore } from '@/lib';
import { Env } from '@/lib/env';
import { logger } from '@/lib/logging';
import { registerStoreReset } from '@/lib/storage/clear-all-data';
import { HUB_CONNECTED_EVENT, HUB_DISCONNECTED_EVENT, HUB_RECONNECT_EXHAUSTED_EVENT, type HubLifecycleEvent, signalRService } from '@/services/signalr.service';

import { useCoreStore } from '../app/core-store';
import { useIncidentCommandStore } from '../calls/incident-command-store';
import { useChatStore } from '../chat/store';
import { FeatureFlagKeys, featureFlagsStore } from '../feature-flags/store';
import { securityStore, useSecurityStore } from '../security/store';
import { useWeatherAlertsStore } from '../weather-alerts/weather-alerts-store';

/** The realtime feeds an outage is tracked for. Geolocation is opt-in and cosmetic, so it is not. */
export type RealtimeHubKey = 'update' | 'chat';

export interface RealtimeHubOutage {
  /** Epoch ms the live session dropped. */
  since: number;
  /** Every reconnection attempt has been spent; the hub is parked until the network returns. */
  exhausted: boolean;
}

export type RealtimeHubOutages = Partial<Record<RealtimeHubKey, RealtimeHubOutage>>;

interface SignalRState {
  isUpdateHubConnected: boolean;
  lastUpdateMessage: unknown;
  lastUpdateTimestamp: number;
  isGeolocationHubConnected: boolean;
  lastGeolocationMessage: unknown;
  lastGeolocationTimestamp: number;
  isChatHubConnected: boolean;
  /**
   * Hubs that were live and then went quiet, so the UI can tell the responder the update feed
   * has stopped -- a dead feed and a quiet shift look identical on screen otherwise.
   *
   * Only a hub that actually established a session can land here: every entry originates from a
   * disconnect emitted by an open connection. A cold start, a hub that was never connected, and
   * an intentional teardown (backgrounding, sign-out) all leave this empty, which is what keeps
   * the banner from flashing when nothing is wrong.
   */
  realtimeHubOutages: RealtimeHubOutages;
  error: Error | null;
  connectUpdateHub: () => Promise<void>;
  disconnectUpdateHub: () => Promise<void>;
  connectGeolocationHub: () => Promise<void>;
  disconnectGeolocationHub: () => Promise<void>;
  connectChatHub: () => Promise<void>;
  disconnectChatHub: () => Promise<void>;
}

// Hub methods can send several positional arguments, so handlers are variadic.
type SignalRHandler = (...args: unknown[]) => void;

/**
 * A call id is a non-empty string or a finite number and nothing else. Anything looser gets
 * stringified into a plausible-looking id — an array of one becomes its element, an object becomes
 * "[object Object]" — and would be treated as a real incident instead of falling through to the
 * fallback path.
 */
function toCallId(value: unknown): string | undefined {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  return undefined;
}

/**
 * The affected incident's call id. Core sends it as a bare string — the eventing worker forwards the
 * topic's ItemId, which is CallId.ToString() — with object payloads tolerated so a producer sending a
 * richer message keeps working.
 */
function extractCommandCallId(message: unknown): string | undefined {
  const scalar = toCallId(message);
  if (scalar !== undefined) {
    return scalar;
  }
  if (message !== null && typeof message === 'object') {
    const m = message as { CallId?: unknown; callId?: unknown };
    return toCallId(m.CallId ?? m.callId);
  }
  return undefined;
}

// Rejoining the department group after an update-hub reconnect.
const UPDATE_REJOIN_RETRY_MS = 5000;
const UPDATE_REJOIN_MAX_ATTEMPTS = 3;
let updateRejoinTimer: ReturnType<typeof setTimeout> | null = null;
let updateRejoinAttempts = 0;
// Stamps each rejoin with the connection lifecycle that started it. Teardown (explicit
// disconnect or a dropped transport) bumps the generation, so an invoke still in flight
// against the old connection completes as a no-op instead of restoring the connected
// flag, refreshing incidents, or scheduling retries after the connection is gone.
let updateConnectionGeneration = 0;
// The rejoin in flight for the current generation, shared by the hubConnected event and
// connectUpdateHub so a fresh connection announces itself exactly once.
let updateRejoinOperation: { generation: number; promise: Promise<void> } | null = null;

function stopUpdateRejoinRetry(): void {
  if (updateRejoinTimer) {
    clearTimeout(updateRejoinTimer);
    updateRejoinTimer = null;
  }
}

/**
 * Tear the realtime session down. Registered with `registerStoreReset` below, so signing out runs
 * it from `clearAllAppData` while the tokens the sockets were opened with are still valid.
 *
 * Left alone, those sockets stay open authenticated as the outgoing user, the chat heartbeat
 * interval ticks forever, and a dropped transport reconnects into `refreshAccessToken` --
 * re-entering the very logout that should have ended it. The flags matter just as much: a stale
 * `isChatHubConnected` makes the next user's `connectChatHub` early-return onto the previous
 * user's connection.
 *
 * Assigned from inside the store factory because the teardown needs its `set` and the per-hub
 * timers that live in that closure.
 */
let resetRealtimeSession: () => void = () => undefined;

export const useSignalRStore = create<SignalRState>((set, get) => {
  const createSafeHandler = (event: string, handler: SignalRHandler): SignalRHandler => {
    return (...args) => {
      try {
        handler(...args);
      } catch (error) {
        logger.error({
          message: `Failed to handle SignalR event: ${event}`,
          context: { error },
        });
      }
    };
  };

  /**
   * Record that a hub which *was* live has gone quiet.
   *
   * Only ever reached from a disconnect raised by an established connection, so a hub that never
   * connected cannot register an outage and cannot flash the banner during startup.
   *
   * The original `since` survives repeat events: a second disconnect inside the same outage must
   * not restart the grace period the banner is counting down, and an exhausted hub stays exhausted
   * until it either reconnects or is torn down.
   */
  const markHubLost = (hub: RealtimeHubKey, exhausted: boolean): void => {
    set((state) => {
      const current = state.realtimeHubOutages[hub];
      if (current && (current.exhausted || !exhausted)) {
        return {};
      }
      return {
        realtimeHubOutages: {
          ...state.realtimeHubOutages,
          [hub]: { since: current?.since ?? Date.now(), exhausted },
        },
      };
    });
  };

  /** Clear a hub's outage: it reconnected, or it was disconnected on purpose. */
  const markHubHealthy = (hub: RealtimeHubKey): void => {
    set((state) => {
      if (!state.realtimeHubOutages[hub]) {
        return {};
      }
      const next = { ...state.realtimeHubOutages };
      delete next[hub];
      return { realtimeHubOutages: next };
    });
  };

  /**
   * Rejoin the department group, retrying a few times before giving up.
   *
   * A reconnect issues a new connection id, so the group this connection joined is gone with the old
   * one — without re-announcing, the socket stays open and silent and no incident command change
   * arrives. A failed rejoin also has to clear the connected flag, or connectUpdateHub's
   * already-connected guard would block every later repair. The hub replays nothing from the outage,
   * so the open incident view is refreshed once the group is back.
   */
  const runUpdateRejoin = async (generation: number): Promise<void> => {
    const departmentId = parseInt(securityStore.getState().rights?.DepartmentId ?? '0');
    try {
      await signalRService.invoke(Env.CHANNEL_HUB_NAME, 'connect', departmentId);
      if (generation !== updateConnectionGeneration) {
        return;
      }
      stopUpdateRejoinRetry();
      updateRejoinAttempts = 0;
      set({ isUpdateHubConnected: true, error: null });
      markHubHealthy('update');
      logger.info({ message: 'Re-announced to update hub after reconnect', context: { departmentId } });
      const openCallId = useIncidentCommandStore.getState().callId;
      if (openCallId) {
        useIncidentCommandStore.getState().handleIncidentCommandUpdated(openCallId);
      }
    } catch (error) {
      if (generation !== updateConnectionGeneration) {
        return;
      }
      updateRejoinAttempts += 1;
      logger.warn({ message: 'Failed to re-announce to update hub after reconnect', context: { error, attempt: updateRejoinAttempts, maxAttempts: UPDATE_REJOIN_MAX_ATTEMPTS } });
      set({ isUpdateHubConnected: false });

      if (updateRejoinAttempts < UPDATE_REJOIN_MAX_ATTEMPTS) {
        stopUpdateRejoinRetry();
        updateRejoinTimer = setTimeout(() => {
          updateRejoinTimer = null;
          void rejoinDepartmentGroup();
        }, UPDATE_REJOIN_RETRY_MS);
      } else {
        logger.error({ message: 'Giving up re-announcing to update hub; the next connectUpdateHub will rebuild the session', context: { attempts: updateRejoinAttempts } });
      }
    }
  };

  const rejoinDepartmentGroup = (): Promise<void> => {
    const generation = updateConnectionGeneration;
    // Reuse the in-flight rejoin only when it belongs to this connection; an operation
    // left over from a previous generation is a dead announce that must not absorb the
    // fresh connection's rejoin.
    if (updateRejoinOperation && updateRejoinOperation.generation === generation) {
      return updateRejoinOperation.promise;
    }
    const promise = runUpdateRejoin(generation).finally(() => {
      if (updateRejoinOperation?.promise === promise) {
        updateRejoinOperation = null;
      }
    });
    updateRejoinOperation = { generation, promise };
    return promise;
  };

  const updateHubHandlers = new Map<string, SignalRHandler>([
    [
      'personnelStatusUpdated',
      createSafeHandler('personnelStatusUpdated', (message) => {
        logger.debug({
          message: 'personnelStatusUpdated',
          context: { message },
        });
        set({ lastUpdateMessage: message, lastUpdateTimestamp: Date.now() });
      }),
    ],
    [
      'personnelStaffingUpdated',
      createSafeHandler('personnelStaffingUpdated', (message) => {
        logger.debug({
          message: 'personnelStaffingUpdated',
          context: { message },
        });
        set({ lastUpdateMessage: message, lastUpdateTimestamp: Date.now() });
      }),
    ],
    [
      'unitStatusUpdated',
      createSafeHandler('unitStatusUpdated', (message) => {
        logger.debug({
          message: 'unitStatusUpdated',
          context: { message },
        });
        set({ lastUpdateMessage: message, lastUpdateTimestamp: Date.now() });
      }),
    ],
    [
      'callsUpdated',
      createSafeHandler('callsUpdated', (message) => {
        const now = Date.now();

        logger.debug({
          message: 'callsUpdated',
          context: { message, now },
        });
        set({ lastUpdateMessage: message, lastUpdateTimestamp: now });
      }),
    ],
    [
      'callAdded',
      createSafeHandler('callAdded', (message) => {
        logger.debug({
          message: 'callAdded',
          context: { message },
        });
        set({ lastUpdateMessage: message, lastUpdateTimestamp: Date.now() });
      }),
    ],
    [
      'callClosed',
      createSafeHandler('callClosed', (message) => {
        logger.debug({
          message: 'callClosed',
          context: { message },
        });
        set({ lastUpdateMessage: message, lastUpdateTimestamp: Date.now() });
      }),
    ],
    [
      'weatherAlertReceived',
      createSafeHandler('weatherAlertReceived', (message) => {
        logger.debug({
          message: 'weatherAlertReceived',
          context: { message },
        });
        const alertId = typeof message === 'string' ? message : ((message as Record<string, string>)?.AlertId ?? '');
        if (alertId) {
          useWeatherAlertsStore.getState().handleAlertReceived(alertId);
        }
        set({ lastUpdateMessage: message, lastUpdateTimestamp: Date.now() });
      }),
    ],
    [
      'weatherAlertUpdated',
      createSafeHandler('weatherAlertUpdated', (message) => {
        logger.debug({
          message: 'weatherAlertUpdated',
          context: { message },
        });
        const alertId = typeof message === 'string' ? message : ((message as Record<string, string>)?.AlertId ?? '');
        if (alertId) {
          useWeatherAlertsStore.getState().handleAlertUpdated(alertId);
        }
        set({ lastUpdateMessage: message, lastUpdateTimestamp: Date.now() });
      }),
    ],
    [
      'weatherAlertExpired',
      createSafeHandler('weatherAlertExpired', (message) => {
        logger.debug({
          message: 'weatherAlertExpired',
          context: { message },
        });
        const alertId = typeof message === 'string' ? message : ((message as Record<string, string>)?.AlertId ?? '');
        if (alertId) {
          useWeatherAlertsStore.getState().handleAlertExpired(alertId);
        }
        set({ lastUpdateMessage: message, lastUpdateTimestamp: Date.now() });
      }),
    ],
    [
      'incidentCommandUpdated',
      createSafeHandler('incidentCommandUpdated', (message) => {
        logger.debug({
          message: 'incidentCommandUpdated',
          context: { message },
        });
        const callId = extractCommandCallId(message);
        if (callId) {
          useIncidentCommandStore.getState().handleIncidentCommandUpdated(callId);
        }
        set({ lastUpdateMessage: message, lastUpdateTimestamp: Date.now() });
      }),
    ],
    [
      HUB_CONNECTED_EVENT,
      createSafeHandler(HUB_CONNECTED_EVENT, (message) => {
        if (readHubName(message) !== Env.CHANNEL_HUB_NAME) return;
        stopUpdateRejoinRetry();
        updateRejoinAttempts = 0;
        void rejoinDepartmentGroup();
      }),
    ],
    [
      HUB_DISCONNECTED_EVENT,
      createSafeHandler(`${HUB_DISCONNECTED_EVENT}:update`, (message) => {
        if (readHubName(message) !== Env.CHANNEL_HUB_NAME) return;
        // A dropped transport supersedes any rejoin still pending against the old connection —
        // bumping the generation turns an invoke already in flight into a no-op — and
        // clearing the flag is what lets connectUpdateHub rebuild the session later.
        updateConnectionGeneration += 1;
        stopUpdateRejoinRetry();
        updateRejoinAttempts = 0;
        set({ isUpdateHubConnected: false });
        markHubLost('update', false);
      }),
    ],
    [
      HUB_RECONNECT_EXHAUSTED_EVENT,
      createSafeHandler(`${HUB_RECONNECT_EXHAUSTED_EVENT}:update`, (message) => {
        if (readHubName(message) !== Env.CHANNEL_HUB_NAME) return;
        // Reconnection has given up. The service parks the hub and retries it when the network is
        // reachable again, but until then nothing arrives, so there is no reason to keep waiting
        // out the banner's grace period.
        markHubLost('update', true);
      }),
    ],
    [
      'onConnected',
      createSafeHandler('onConnected', () => {
        logger.info({
          message: 'Connected to update SignalR hub',
        });
        set({ isUpdateHubConnected: true, error: null });
        markHubHealthy('update');
      }),
    ],
  ]);

  const geolocationHubHandlers = new Map<string, SignalRHandler>([
    [
      'onPersonnelLocationUpdated',
      createSafeHandler('onPersonnelLocationUpdated', (message) => {
        set({ lastGeolocationMessage: message, lastGeolocationTimestamp: Date.now() });
      }),
    ],
    [
      'onUnitLocationUpdated',
      createSafeHandler('onUnitLocationUpdated', (message) => {
        set({ lastGeolocationMessage: message, lastGeolocationTimestamp: Date.now() });
      }),
    ],
    [
      'onGeolocationConnect',
      createSafeHandler('onGeolocationConnect', () => {
        logger.info({
          message: 'Connected to geolocation SignalR hub',
        });
        set({ isGeolocationHubConnected: true, error: null });
      }),
    ],
  ]);

  // Client-event method names raised by the chat SignalR hub.
  const CHAT_HUB_METHODS = [
    'chatMessageReceived',
    'chatMessageEdited',
    'chatMessageDeleted',
    'chatReactionUpdated',
    'chatReceiptUpdated',
    'chatChannelUpdated',
    'chatChannelProvisioned',
    'chatModerationApplied',
    'chatMessageAckRequired',
    'chatThreadUpdated',
    'chatbotMessageReceived',
    'chatbotTyping',
    'chatTyping',
    'chatPresenceChanged',
    'onChatConnected',
  ];
  const CHAT_HEARTBEAT_INTERVAL_MS = 45000;
  const CHAT_ARM_RETRY_MS = 5000;
  const CHAT_ARM_MAX_ATTEMPTS = 3;
  // The hub replays a full resync on arm; collapse the duplicate that arrives when
  // the server echoes its own onChatConnected right after ours. Scoped to a single
  // connection — the disconnect handler clears the marker so the next one resyncs.
  const CHAT_RESYNC_DEBOUNCE_MS = 2000;

  const readHubName = (message: unknown): string | undefined => (message as HubLifecycleEvent | undefined)?.hubName;

  const chatHubHandlers = new Map<string, SignalRHandler>([
    ['chatMessageReceived', createSafeHandler('chatMessageReceived', (message) => useChatStore.getState().handleMessageReceived(message))],
    ['chatMessageEdited', createSafeHandler('chatMessageEdited', (message) => useChatStore.getState().handleMessageEdited(message))],
    ['chatMessageDeleted', createSafeHandler('chatMessageDeleted', (message) => useChatStore.getState().handleMessageDeleted(message))],
    ['chatReactionUpdated', createSafeHandler('chatReactionUpdated', (message) => useChatStore.getState().handleReactionUpdated(message))],
    ['chatReceiptUpdated', createSafeHandler('chatReceiptUpdated', (message) => useChatStore.getState().handleReceiptUpdated(message))],
    ['chatChannelUpdated', createSafeHandler('chatChannelUpdated', (message) => useChatStore.getState().handleChannelUpdated(message))],
    ['chatChannelProvisioned', createSafeHandler('chatChannelProvisioned', (message) => useChatStore.getState().handleChannelProvisioned(message))],
    ['chatModerationApplied', createSafeHandler('chatModerationApplied', (message) => useChatStore.getState().handleModerationApplied(message))],
    ['chatMessageAckRequired', createSafeHandler('chatMessageAckRequired', (message) => useChatStore.getState().handleAckRequired(message))],
    ['chatThreadUpdated', createSafeHandler('chatThreadUpdated', (message) => useChatStore.getState().handleThreadUpdated(message))],
    ['chatbotMessageReceived', createSafeHandler('chatbotMessageReceived', (message) => useChatStore.getState().handleChatbotMessageReceived(message))],
    ['chatbotTyping', createSafeHandler('chatbotTyping', (message) => useChatStore.getState().handleChatbotTyping(message))],
    ['chatTyping', createSafeHandler('chatTyping', (message) => useChatStore.getState().handleTyping(message))],
    // The hub sends presence as two positional args (`userId, isOnline`), not an object.
    ['chatPresenceChanged', createSafeHandler('chatPresenceChanged', (message, isOnline) => useChatStore.getState().handlePresenceChanged(message, isOnline))],
    [
      'onChatConnected',
      createSafeHandler('onChatConnected', () => {
        logger.info({
          message: 'Connected to chat SignalR hub',
        });
        set({ isChatHubConnected: true, error: null });
        markHubHealthy('chat');
        resyncChat();
      }),
    ],
    [
      HUB_CONNECTED_EVENT,
      createSafeHandler(HUB_CONNECTED_EVENT, (message) => {
        if (readHubName(message) !== Env.CHAT_HUB_NAME) return;
        // A reconnect issues a new connection id, so the retry budget starts over.
        void armChatSession({ resetAttempts: true });
      }),
    ],
    [
      HUB_DISCONNECTED_EVENT,
      createSafeHandler(HUB_DISCONNECTED_EVENT, (message) => {
        if (readHubName(message) !== Env.CHAT_HUB_NAME) return;
        stopChatHeartbeat();
        stopChatArmRetry();
        // The debounce only ever guards duplicates within one connection. A dropped
        // transport reconnects in as little as no time at all, so carrying the marker
        // across the gap would swallow the resync that backfills whatever was missed
        // while the socket was down.
        lastChatResyncAt = 0;
        // Clearing the flag is what lets connectChatHub repair the session later;
        // while it stayed true the hub could never be re-announced.
        set({ isChatHubConnected: false });
        markHubLost('chat', false);
      }),
    ],
    [
      HUB_RECONNECT_EXHAUSTED_EVENT,
      createSafeHandler(`${HUB_RECONNECT_EXHAUSTED_EVENT}:chat`, (message) => {
        if (readHubName(message) !== Env.CHAT_HUB_NAME) return;
        markHubLost('chat', true);
      }),
    ],
  ]);

  let updateHubHandlersSubscribed = false;
  let geolocationHubHandlersSubscribed = false;
  let chatHubHandlersSubscribed = false;
  let chatHeartbeatTimer: ReturnType<typeof setInterval> | null = null;
  let chatArmRetryTimer: ReturnType<typeof setTimeout> | null = null;
  let chatArmAttempts = 0;
  // The arm in flight, shared by the lifecycle event and the connectChatHub fallback so a
  // fresh connection announces itself exactly once.
  let chatArmOperation: Promise<void> | null = null;
  let lastChatResyncAt = 0;

  const subscribeHandlers = (handlers: Map<string, SignalRHandler>) => {
    handlers.forEach((handler, event) => signalRService.on(event, handler));
  };

  const unsubscribeHandlers = (handlers: Map<string, SignalRHandler>) => {
    handlers.forEach((handler, event) => signalRService.off(event, handler));
  };

  const subscribeUpdateHubHandlers = () => {
    if (updateHubHandlersSubscribed) return;
    subscribeHandlers(updateHubHandlers);
    updateHubHandlersSubscribed = true;
  };

  const unsubscribeUpdateHubHandlers = () => {
    if (!updateHubHandlersSubscribed) return;
    unsubscribeHandlers(updateHubHandlers);
    updateHubHandlersSubscribed = false;
  };

  const subscribeGeolocationHubHandlers = () => {
    if (geolocationHubHandlersSubscribed) return;
    subscribeHandlers(geolocationHubHandlers);
    geolocationHubHandlersSubscribed = true;
  };

  const unsubscribeGeolocationHubHandlers = () => {
    if (!geolocationHubHandlersSubscribed) return;
    unsubscribeHandlers(geolocationHubHandlers);
    geolocationHubHandlersSubscribed = false;
  };

  const subscribeChatHubHandlers = () => {
    if (chatHubHandlersSubscribed) return;
    subscribeHandlers(chatHubHandlers);
    chatHubHandlersSubscribed = true;
  };

  const unsubscribeChatHubHandlers = () => {
    if (!chatHubHandlersSubscribed) return;
    unsubscribeHandlers(chatHubHandlers);
    chatHubHandlersSubscribed = false;
  };

  const stopChatHeartbeat = () => {
    if (chatHeartbeatTimer) {
      clearInterval(chatHeartbeatTimer);
      chatHeartbeatTimer = null;
    }
  };

  const stopChatArmRetry = () => {
    if (chatArmRetryTimer) {
      clearTimeout(chatArmRetryTimer);
      chatArmRetryTimer = null;
    }
  };

  const resyncChat = () => {
    const now = Date.now();
    if (now - lastChatResyncAt < CHAT_RESYNC_DEBOUNCE_MS) return;
    lastChatResyncAt = now;
    useChatStore.getState().handleChatConnected();
  };

  /**
   * Announce this connection to the chat hub and restart the heartbeat.
   *
   * The hub only places a connection into its channel groups in response to
   * `Connect`, and every reconnect issues a fresh connection id. Without
   * re-arming, the websocket stays open but the client receives nothing.
   */
  const runChatArm = async (): Promise<void> => {
    stopChatArmRetry();

    try {
      await signalRService.invoke(Env.CHAT_HUB_NAME, 'Connect');
    } catch (error) {
      chatArmAttempts += 1;
      logger.warn({
        message: 'Failed to announce presence to chat hub',
        context: { error, attempt: chatArmAttempts, maxAttempts: CHAT_ARM_MAX_ATTEMPTS },
      });
      if (chatArmAttempts < CHAT_ARM_MAX_ATTEMPTS && chatHubHandlersSubscribed) {
        chatArmRetryTimer = setTimeout(() => {
          void armChatSession();
        }, CHAT_ARM_RETRY_MS);
      }
      return;
    }

    chatArmAttempts = 0;
    set({ isChatHubConnected: true, error: null });
    markHubHealthy('chat');

    stopChatHeartbeat();
    chatHeartbeatTimer = setInterval(() => {
      signalRService.invoke(Env.CHAT_HUB_NAME, 'Heartbeat').catch((error) => {
        logger.debug({
          message: 'Chat hub heartbeat failed',
          context: { error },
        });
      });
    }, CHAT_HEARTBEAT_INTERVAL_MS);

    resyncChat();
  };

  /**
   * Serializes arming per connection. The hubConnected event and the connectChatHub
   * fallback both fire for a single fresh socket — the event's arm parks on the
   * connection lock, so without sharing the operation the fallback sees an unarmed
   * session and issues a second `Connect`, with the two runs racing each other's retry
   * timer and spending the attempt budget twice as fast.
   *
   * `resetAttempts` accompanies a new connection id, which always deserves a full budget
   * no matter how a previous connection's arming went.
   */
  const armChatSession = (options?: { resetAttempts?: boolean }): Promise<void> => {
    if (options?.resetAttempts) {
      chatArmAttempts = 0;
    }

    if (chatArmOperation) {
      return chatArmOperation;
    }

    const operation = runChatArm().finally(() => {
      if (chatArmOperation === operation) {
        chatArmOperation = null;
      }
    });
    chatArmOperation = operation;
    return operation;
  };

  resetRealtimeSession = () => {
    stopChatHeartbeat();
    stopChatArmRetry();
    stopUpdateRejoinRetry();
    chatArmAttempts = 0;
    updateRejoinAttempts = 0;
    lastChatResyncAt = 0;
    // Any rejoin still in flight belongs to the session that just ended.
    updateConnectionGeneration += 1;
    unsubscribeUpdateHubHandlers();
    unsubscribeGeolocationHubHandlers();
    unsubscribeChatHubHandlers();
    set({
      isUpdateHubConnected: false,
      lastUpdateMessage: null,
      lastUpdateTimestamp: 0,
      isGeolocationHubConnected: false,
      lastGeolocationMessage: null,
      lastGeolocationTimestamp: 0,
      isChatHubConnected: false,
      // Signing out is not an outage. Left populated, the next user would land on a home screen
      // already showing "live updates unavailable" for a session that no longer exists.
      realtimeHubOutages: {},
      error: null,
    });

    // Closing the transports is local work, so it can finish after this returns; the handlers
    // are already gone and nothing is left listening for whatever arrives in between.
    void signalRService.disconnectAll().catch((error) => {
      logger.warn({
        message: 'Failed to disconnect SignalR hubs while resetting the realtime session',
        context: { error },
      });
    });
  };

  return {
    isUpdateHubConnected: false,
    lastUpdateMessage: null,
    lastUpdateTimestamp: 0,
    isGeolocationHubConnected: false,
    lastGeolocationMessage: null,
    lastGeolocationTimestamp: 0,
    isChatHubConnected: false,
    realtimeHubOutages: {},
    error: null,
    connectUpdateHub: async () => {
      try {
        if (get().isUpdateHubConnected) {
          return;
        }

        set({ isUpdateHubConnected: false, error: null });

        // Get the eventing URL from the core store config
        const coreState = useCoreStore.getState();
        const eventingUrl = coreState.config?.EventingUrl;

        if (!eventingUrl) {
          const errorMessage = 'EventingUrl not available in config. Please ensure config is loaded first.';
          logger.error({
            message: errorMessage,
          });
          set({ error: new Error(errorMessage) });
          return;
        }

        // Connect to the eventing hub
        subscribeUpdateHubHandlers();
        await signalRService.connectToHubWithEventingUrl({
          name: Env.CHANNEL_HUB_NAME,
          eventingUrl: eventingUrl,
          hubName: Env.CHANNEL_HUB_NAME,
          methods: [
            'personnelStatusUpdated',
            'personnelStaffingUpdated',
            'unitStatusUpdated',
            'callsUpdated',
            'callAdded',
            'callClosed',
            'weatherAlertReceived',
            'weatherAlertUpdated',
            'weatherAlertExpired',
            'incidentCommandUpdated',
            'onConnected',
          ],
        });

        // A fresh connection announces itself from the hubConnected event above; awaiting the
        // shared rejoin joins that announce instead of racing it with a second `connect`, and
        // failures retry on the rejoin schedule rather than tearing the session down. When the
        // event already finished the announce the flag is set and there is nothing left to do.
        if (!get().isUpdateHubConnected) {
          await rejoinDepartmentGroup();
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Unknown error occurred');
        logger.error({
          message: 'Failed to connect to SignalR hubs',
          context: { error: err },
        });
        unsubscribeUpdateHubHandlers();
        set({ error: err });
      }
    },
    disconnectUpdateHub: async () => {
      try {
        // Invalidate any rejoin still in flight so its completion can't restore the
        // connected flag or refresh incidents after this teardown.
        updateConnectionGeneration += 1;
        stopUpdateRejoinRetry();
        updateRejoinAttempts = 0;
        await signalRService.disconnectFromHub(Env.CHANNEL_HUB_NAME);
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Unknown error occurred');
        logger.error({
          message: 'Failed to disconnect from SignalR hubs',
          context: { error: err },
        });
        set({ error: err });
      } finally {
        unsubscribeUpdateHubHandlers();
        set({ isUpdateHubConnected: false, lastUpdateMessage: null });
        // Closing the socket raises the same disconnect event a dropped transport does, so the
        // handler above has already recorded an outage. Backgrounding the app is not an outage --
        // clearing it here is what stops a banner from being queued up behind every app switch.
        markHubHealthy('update');
      }
    },
    connectGeolocationHub: async () => {
      try {
        if (get().isGeolocationHubConnected) {
          return;
        }

        set({ isGeolocationHubConnected: false, error: null });

        // Get the eventing URL from the core store config
        const coreState = useCoreStore.getState();
        const eventingUrl = coreState.config?.EventingUrl;

        if (!eventingUrl) {
          const errorMessage = 'EventingUrl not available in config. Please ensure config is loaded first.';
          logger.error({
            message: errorMessage,
          });
          set({ error: new Error(errorMessage) });
          return;
        }

        // Connect to the geolocation hub
        subscribeGeolocationHubHandlers();
        await signalRService.connectToHubWithEventingUrl({
          name: Env.REALTIME_GEO_HUB_NAME,
          eventingUrl: eventingUrl,
          hubName: Env.REALTIME_GEO_HUB_NAME,
          methods: ['onPersonnelLocationUpdated', 'onUnitLocationUpdated', 'onGeolocationConnect'],
        });
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Unknown error occurred');
        logger.error({
          message: 'Failed to connect to SignalR hubs',
          context: { error: err },
        });
        unsubscribeGeolocationHubHandlers();
        set({ error: err });
      }
    },
    disconnectGeolocationHub: async () => {
      try {
        await signalRService.disconnectFromHub(Env.REALTIME_GEO_HUB_NAME);
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Unknown error occurred');
        logger.error({
          message: 'Failed to disconnect from SignalR hubs',
          context: { error: err },
        });
        set({ error: err });
      } finally {
        unsubscribeGeolocationHubHandlers();
        set({ isGeolocationHubConnected: false, lastGeolocationMessage: null });
      }
    },
    connectChatHub: async () => {
      try {
        // Guard here so every call path (init, app-resume reconnect) honors the flag.
        if (!featureFlagsStore.getState().isEnabled(FeatureFlagKeys.ChatSystem)) {
          logger.info({
            message: 'Chat disabled by feature flag; skipping chat hub connection',
          });
          return;
        }

        if (get().isChatHubConnected) {
          return;
        }

        // Get the eventing URL from the core store config
        const eventingUrl = useCoreStore.getState().config?.EventingUrl;
        if (!eventingUrl) {
          logger.warn({
            message: 'EventingUrl not available for chat hub, skipping connection',
          });
          return;
        }

        // Register the chat event handlers, then connect the chat hub via the eventing URL.
        subscribeChatHubHandlers();
        await signalRService.connectToHubWithEventingUrl({
          name: Env.CHAT_HUB_NAME,
          eventingUrl: eventingUrl,
          hubName: Env.CHAT_HUB_NAME,
          methods: CHAT_HUB_METHODS,
        });

        // A fresh connection arms itself from the hubConnected event above; awaiting the
        // shared operation joins that arm instead of starting a competing one. When the
        // socket was already open no event fired, so this starts the only arm there is.
        if (!get().isChatHubConnected) {
          await armChatSession({ resetAttempts: true });
        }

        logger.info({
          message: 'Chat hub handlers registered successfully',
        });
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Unknown error occurred');
        logger.error({
          message: 'Failed to connect to chat SignalR hub',
          context: { error: err },
        });
        stopChatHeartbeat();
        stopChatArmRetry();
        // Only drop the handlers when there is no socket left. Unsubscribing while the
        // hub is alive strands every incoming frame with no listener and no recovery.
        if (!signalRService.isHubAvailable(Env.CHAT_HUB_NAME)) {
          unsubscribeChatHubHandlers();
        }
        set({ error: err });
      }
    },
    disconnectChatHub: async () => {
      try {
        stopChatHeartbeat();
        stopChatArmRetry();
        await signalRService.disconnectFromHub(Env.CHAT_HUB_NAME);
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Unknown error occurred');
        logger.error({
          message: 'Failed to disconnect from chat SignalR hub',
          context: { error: err },
        });
        set({ error: err });
      } finally {
        unsubscribeChatHubHandlers();
        set({ isChatHubConnected: false });
        // Same as the update hub: an intentional close is not something to warn the user about.
        markHubHealthy('chat');
      }
    },
  };
});

registerStoreReset('signalr', () => resetRealtimeSession());
