import { logger } from '@/lib/logging';
import { useOfflineQueueStore } from '@/stores/offline-queue/store';

import { offlineQueueProcessor } from './offline-queue-processor';

export class OfflineQueueService {
  private static instance: OfflineQueueService;
  private initialized = false;

  private constructor() {}

  public static getInstance(): OfflineQueueService {
    if (!OfflineQueueService.instance) {
      OfflineQueueService.instance = new OfflineQueueService();
    }
    return OfflineQueueService.instance;
  }

  public async initialize(): Promise<void> {
    if (this.initialized) {
      logger.debug({
        message: 'Offline queue service already initialized, skipping',
      });
      return;
    }

    try {
      logger.info({
        message: 'Initializing offline queue service',
      });

      // Initialize the network listener in the store (await in case it's async)
      const queueStore = useOfflineQueueStore.getState();
      await queueStore.initializeNetworkListener();

      // Start the queue processor
      await offlineQueueProcessor.startProcessing();

      this.initialized = true;

      logger.info({
        message: 'Offline queue service initialized successfully',
      });
    } catch (error) {
      this.initialized = false; // Ensure flag is cleared on failure
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

      this.initialized = false;

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
