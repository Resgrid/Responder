import { create } from 'zustand';

import { useAuthStore } from '@/lib';
import { Env } from '@/lib/env';
import { logger } from '@/lib/logging';
import { signalRService } from '@/services/signalr.service';

import { useCoreStore } from '../app/core-store';
import { securityStore, useSecurityStore } from '../security/store';
import { useWeatherAlertsStore } from '../weather-alerts/weather-alerts-store';

interface SignalRState {
  isUpdateHubConnected: boolean;
  lastUpdateMessage: unknown;
  lastUpdateTimestamp: number;
  isGeolocationHubConnected: boolean;
  lastGeolocationMessage: unknown;
  lastGeolocationTimestamp: number;
  error: Error | null;
  connectUpdateHub: () => Promise<void>;
  disconnectUpdateHub: () => Promise<void>;
  connectGeolocationHub: () => Promise<void>;
  disconnectGeolocationHub: () => Promise<void>;
}

type SignalRHandler = (message: unknown) => void;

export const useSignalRStore = create<SignalRState>((set, get) => {
  const createSafeHandler = (event: string, handler: SignalRHandler): SignalRHandler => {
    return (message) => {
      try {
        handler(message);
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

  let updateHubHandlersSubscribed = false;
  let geolocationHubHandlersSubscribed = false;

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

  return {
    isUpdateHubConnected: false,
    lastUpdateMessage: null,
    lastUpdateTimestamp: 0,
    isGeolocationHubConnected: false,
    lastGeolocationMessage: null,
    lastGeolocationTimestamp: 0,
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
  };
});
