import { create } from 'zustand';

import { useAuthStore } from '@/lib';
import { Env } from '@/lib/env';
import { logger } from '@/lib/logging';
import { HUB_CONNECTED_EVENT, HUB_DISCONNECTED_EVENT, type HubLifecycleEvent, signalRService } from '@/services/signalr.service';

import { useCoreStore } from '../app/core-store';
import { useChatStore } from '../chat/store';
import { FeatureFlagKeys, featureFlagsStore } from '../feature-flags/store';
import { securityStore, useSecurityStore } from '../security/store';
import { useWeatherAlertsStore } from '../weather-alerts/weather-alerts-store';

interface SignalRState {
  isUpdateHubConnected: boolean;
  lastUpdateMessage: unknown;
  lastUpdateTimestamp: number;
  isGeolocationHubConnected: boolean;
  lastGeolocationMessage: unknown;
  lastGeolocationTimestamp: number;
  isChatHubConnected: boolean;
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

  const updateHubHandlers = new Map<string, SignalRHandler>([
    [
      'personnelStatusUpdated',
      createSafeHandler('personnelStatusUpdated', (message) => {
        logger.info({
          message: 'personnelStatusUpdated',
          context: { message },
        });
        set({ lastUpdateMessage: message, lastUpdateTimestamp: Date.now() });
      }),
    ],
    [
      'personnelStaffingUpdated',
      createSafeHandler('personnelStaffingUpdated', (message) => {
        logger.info({
          message: 'personnelStaffingUpdated',
          context: { message },
        });
        set({ lastUpdateMessage: message, lastUpdateTimestamp: Date.now() });
      }),
    ],
    [
      'unitStatusUpdated',
      createSafeHandler('unitStatusUpdated', (message) => {
        logger.info({
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

        logger.info({
          message: 'callsUpdated',
          context: { message, now },
        });
        set({ lastUpdateMessage: message, lastUpdateTimestamp: now });
      }),
    ],
    [
      'callAdded',
      createSafeHandler('callAdded', (message) => {
        logger.info({
          message: 'callAdded',
          context: { message },
        });
        set({ lastUpdateMessage: message, lastUpdateTimestamp: Date.now() });
      }),
    ],
    [
      'callClosed',
      createSafeHandler('callClosed', (message) => {
        logger.info({
          message: 'callClosed',
          context: { message },
        });
        set({ lastUpdateMessage: message, lastUpdateTimestamp: Date.now() });
      }),
    ],
    [
      'weatherAlertReceived',
      createSafeHandler('weatherAlertReceived', (message) => {
        logger.info({
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
        logger.info({
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
        logger.info({
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
      'onConnected',
      createSafeHandler('onConnected', () => {
        logger.info({
          message: 'Connected to update SignalR hub',
        });
        set({ isUpdateHubConnected: true, error: null });
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
  // the server echoes its own onChatConnected right after ours.
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
        resyncChat();
      }),
    ],
    [
      HUB_CONNECTED_EVENT,
      createSafeHandler(HUB_CONNECTED_EVENT, (message) => {
        if (readHubName(message) !== Env.CHAT_HUB_NAME) return;
        void armChatSession();
      }),
    ],
    [
      HUB_DISCONNECTED_EVENT,
      createSafeHandler(HUB_DISCONNECTED_EVENT, (message) => {
        if (readHubName(message) !== Env.CHAT_HUB_NAME) return;
        stopChatHeartbeat();
        stopChatArmRetry();
        // Clearing the flag is what lets connectChatHub repair the session later;
        // while it stayed true the hub could never be re-announced.
        set({ isChatHubConnected: false });
      }),
    ],
  ]);

  let updateHubHandlersSubscribed = false;
  let geolocationHubHandlersSubscribed = false;
  let chatHubHandlersSubscribed = false;
  let chatHeartbeatTimer: ReturnType<typeof setInterval> | null = null;
  let chatArmRetryTimer: ReturnType<typeof setTimeout> | null = null;
  let chatArmAttempts = 0;
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
  const armChatSession = async (): Promise<void> => {
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

  return {
    isUpdateHubConnected: false,
    lastUpdateMessage: null,
    lastUpdateTimestamp: 0,
    isGeolocationHubConnected: false,
    lastGeolocationMessage: null,
    lastGeolocationTimestamp: 0,
    isChatHubConnected: false,
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
            'onConnected',
          ],
        });

        await signalRService.invoke(Env.CHANNEL_HUB_NAME, 'connect', parseInt(securityStore.getState().rights?.DepartmentId ?? '0'));
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
        chatArmAttempts = 0;
        subscribeChatHubHandlers();
        await signalRService.connectToHubWithEventingUrl({
          name: Env.CHAT_HUB_NAME,
          eventingUrl: eventingUrl,
          hubName: Env.CHAT_HUB_NAME,
          methods: CHAT_HUB_METHODS,
        });

        // A fresh connection arms itself from the hubConnected event above. Cover the
        // case where the socket was already open and no event was emitted.
        if (!get().isChatHubConnected) {
          await armChatSession();
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
      }
    },
  };
});
