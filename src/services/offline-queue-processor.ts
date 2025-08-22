import NetInfo from '@react-native-community/netinfo';

import { savePersonnelStatus } from '@/api/personnel/personnelStatuses';
import { logger } from '@/lib/logging';
import { getOfflineQueueStorage } from '@/lib/storage/secure-storage';
import type { SavePersonStatusInput } from '@/models/v4/personnelStatuses/savePersonStatusInput';

interface QueueItem {
  id: string;
  type: 'personnelStatus';
  payload: SavePersonStatusInput;
  retries: number;
}

class RealOfflineQueueProcessor {
  private static instance: RealOfflineQueueProcessor | null = null;
  private processing = false;
  private storageKey = 'offline_queue';

  private constructor() {
    NetInfo.addEventListener((state) => {
      if (state.isInternetReachable) {
        this.processQueue();
      }
    });
  }

  static getInstance(): RealOfflineQueueProcessor {
    if (RealOfflineQueueProcessor.instance === null) {
      RealOfflineQueueProcessor.instance = new RealOfflineQueueProcessor();
    }
    return RealOfflineQueueProcessor.instance!;
  }

  async processQueue(): Promise<void> {
    if (this.processing) return;
    this.processing = true;
    try {
      const storage = await getOfflineQueueStorage();
      const raw = storage.getString(this.storageKey);
      const items: QueueItem[] = raw ? JSON.parse(raw) : [];
      const remaining: QueueItem[] = [];
      for (const item of items) {
        try {
          if (item.type === 'personnelStatus') {
            await savePersonnelStatus(item.payload);
          }
        } catch (error) {
          item.retries++;
          const backoff = Math.min(2 ** item.retries * 1000, 30000);
          await new Promise((resolve) => setTimeout(resolve, backoff));
          remaining.push(item);
          logger.warn({ message: 'Retrying offline queue item', context: { id: item.id, error } });
        }
      }
      await storage.set(this.storageKey, JSON.stringify(remaining));
    } catch (error) {
      logger.error({ message: 'Processing offline queue failed', context: { error } });
    } finally {
      this.processing = false;
    }
  }

  addPersonnelStatusToQueue(status: SavePersonStatusInput): string {
    const id = `${Date.now()}-${Math.random()}`;
    this.enqueue({ id, type: 'personnelStatus', payload: status, retries: 0 });
    return id;
  }

  private async enqueue(item: QueueItem): Promise<void> {
    const storage = await getOfflineQueueStorage();
    const raw = storage.getString(this.storageKey);
    const items: QueueItem[] = raw ? JSON.parse(raw) : [];
    items.push(item);
    await storage.set(this.storageKey, JSON.stringify(items));
  }

  cleanup(): void {
    // no-op
  }

  startProcessing(): Promise<void> {
    return this.processQueue();
  }

  startBackgroundProcessing(): Promise<void> {
    return this.processQueue();
  }
}

class StubOfflineQueueProcessor {
  private static instance: StubOfflineQueueProcessor | null = null;
  private constructor() {}
  static getInstance(): StubOfflineQueueProcessor {
    if (StubOfflineQueueProcessor.instance === null) {
      StubOfflineQueueProcessor.instance = new StubOfflineQueueProcessor();
    }
    return StubOfflineQueueProcessor.instance;
  }
  processQueue(): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      logger.error({ message: 'Stub offline queue used in production' });
      throw new Error('OfflineQueueProcessor stub used in production');
    }
    return Promise.resolve();
  }
  addPersonnelStatusToQueue(status: SavePersonStatusInput): string {
    if (process.env.NODE_ENV === 'production') {
      logger.error({ message: 'Stub offline queue used in production' });
      throw new Error('OfflineQueueProcessor stub used in production');
    }
    return '';
  }
  cleanup(): void {
    // no-op
  }
  startProcessing(): Promise<void> {
    return this.processQueue();
  }
  startBackgroundProcessing(): Promise<void> {
    return this.processQueue();
  }
}

const ProcessorClass = process.env.NODE_ENV === 'production' ? RealOfflineQueueProcessor : StubOfflineQueueProcessor;

export class OfflineQueueProcessor extends ProcessorClass {
  /**
   * Returns the singleton instance of the processor.
   */
  static getInstance(): RealOfflineQueueProcessor | StubOfflineQueueProcessor {
    const instance = ProcessorClass.getInstance();
    // Ensure the instance is recognized as OfflineQueueProcessor
    Object.setPrototypeOf(instance, OfflineQueueProcessor.prototype);
    return instance;
  }
}

export const offlineQueueProcessor = OfflineQueueProcessor.getInstance();
