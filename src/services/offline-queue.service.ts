import { logger } from '@/lib/logging';
import { useOfflineQueueStore } from '@/stores/offline-queue/store';

import { offlineQueueProcessor } from './offline-queue-processor';

export class OfflineQueueService {
  private static instance: OfflineQueueService;

  private constructor() {}

  public static getInstance(): OfflineQueueService {
    if (!OfflineQueueService.instance) {
      OfflineQueueService.instance = new OfflineQueueService();
    }
    return OfflineQueueService.instance;
  }

  public async initialize(): Promise<void> {
    try {
      logger.info({
        message: 'Initializing offline queue service',
      });

      // Initialize the network listener in the store
      const queueStore = useOfflineQueueStore.getState();
      queueStore.initializeNetworkListener();

      // Start the queue processor
      await offlineQueueProcessor.startProcessing();

      logger.info({
        message: 'Offline queue service initialized successfully',
      });
    } catch (error) {
      logger.error({
        message: 'Failed to initialize offline queue service',
        context: { error },
      });
      throw error;
    }
  }

  public cleanup(): void {
    try {
      offlineQueueProcessor.cleanup();

      logger.info({
        message: 'Offline queue service cleaned up',
      });
    } catch (error) {
      logger.error({
        message: 'Error cleaning up offline queue service',
        context: { error },
      });
    }
  }
}

export const offlineQueueService = OfflineQueueService.getInstance();
