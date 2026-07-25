import { useEffect, useRef } from 'react';

import { useAuthStore } from '@/lib/auth';
import { logger } from '@/lib/logging';
import { useHomeStore } from '@/stores/home/home-store';
import { useSignalRStore } from '@/stores/signalr/signalr-store';

export const useStatusSignalRUpdates = () => {
  const lastProcessedTimestamp = useRef<number>(0);
  const { userId } = useAuthStore();
  const { fetchCurrentUserInfo } = useHomeStore();

  const lastUpdateTimestamp = useSignalRStore((state) => state.lastUpdateTimestamp);
  const lastUpdateMessage = useSignalRStore((state) => state.lastUpdateMessage);

  useEffect(() => {
    const handleStatusUpdate = async () => {
      try {
        if (!userId) {
          logger.info({
            message: 'No current user, skipping status update',
          });
          return;
        }

        // Check if this is a personnel status or staffing update message for the current user
        if (lastUpdateMessage && typeof lastUpdateMessage === 'object') {
          const parsedMessage = lastUpdateMessage as { UserId?: string };

          if (parsedMessage.UserId === userId) {
            logger.info({
              message: 'Processing personnel status/staffing update for current user',
              context: {
                userId,
                timestamp: lastUpdateTimestamp,
                message: parsedMessage,
              },
            });

            // Refresh the current user's status and staffing
            await fetchCurrentUserInfo();

            // Update the last processed timestamp
            lastProcessedTimestamp.current = lastUpdateTimestamp;
          }
        }
      } catch (error) {
        logger.error({
          message: 'Failed to process personnel status/staffing update',
          context: { error },
        });
      }
    };

    if (lastUpdateTimestamp > 0 && lastUpdateTimestamp !== lastProcessedTimestamp.current && userId) {
      handleStatusUpdate();
    }
  }, [lastUpdateTimestamp, lastUpdateMessage, userId, fetchCurrentUserInfo]);
};
