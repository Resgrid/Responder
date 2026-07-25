import { useCallback, useEffect, useRef } from 'react';

import { logger } from '@/lib/logging';
import { type SignalRHubConfig, signalRService } from '@/services/signalr.service';

export const useSignalR = (config: SignalRHubConfig) => {
  const configRef = useRef(config);

  useEffect(() => {
    configRef.current = config;
  });

  const hubName = config.name;

  const connect = useCallback(async () => {
    try {
      await signalRService.connectToHub(configRef.current);
    } catch (error) {
      logger.error({
        message: 'Failed to connect to SignalR hub',
        context: { error, config: configRef.current },
      });
    }
  }, []);

  const disconnect = useCallback(async () => {
    try {
      await signalRService.disconnectFromHub(hubName);
    } catch (error) {
      logger.error({
        message: 'Failed to disconnect from SignalR hub',
        context: { error, config: configRef.current },
      });
    }
  }, [hubName]);

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    connect,
    disconnect,
  };
};
