import { useEffect, useRef } from 'react';

import { getUnitStatus } from '@/api/units/unitStatuses';
import { logger } from '@/lib/logging';
import { useCoreStore } from '@/stores/app/core-store';
import useAuthStore from '@/stores/auth/store';
import { useSignalRStore } from '@/stores/signalr/signalr-store';

export const useStatusSignalRUpdates = () => {
  const lastProcessedTimestamp = useRef<number>(0);
  const userId = useAuthStore((state) => state.userId);

  const lastUpdateTimestamp = useSignalRStore((state) => state.lastUpdateTimestamp);
  const lastUpdateMessage = useSignalRStore((state) => state.lastUpdateMessage);

  useEffect(() => {
    const handleStatusUpdate = async () => {
      try {
        if (!userId) {
          logger.info({
            message: 'No active user, skipping status update',
          });
          return;
        }

        // Parse the SignalR message to check if it's a unit status update
        if (lastUpdateMessage && typeof lastUpdateMessage === 'string') {
          try {
            const parsedMessage = JSON.parse(lastUpdateMessage);

            // Check if this is a unit status update message
            if (parsedMessage && parsedMessage.UserId === userId) {
              logger.info({
                message: 'Processing user status update',
                context: {
                  userId: userId,
                  timestamp: lastUpdateTimestamp,
                  message: parsedMessage,
                },
              });

              // Update the last processed timestamp
              lastProcessedTimestamp.current = lastUpdateTimestamp;
            }
          } catch (parseError) {
            logger.error({
              message: 'Failed to parse SignalR message',
              context: { error: parseError, message: lastUpdateMessage },
            });
          }
        }
      } catch (error) {
        logger.error({
          message: 'Failed to process unit status update',
          context: { error },
        });
      }
    };

    if (lastUpdateTimestamp > 0 && lastUpdateTimestamp !== lastProcessedTimestamp.current && userId) {
      handleStatusUpdate();
    }
  }, [lastUpdateTimestamp, lastUpdateMessage, userId]);
};
