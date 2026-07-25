import NetInfo from '@react-native-community/netinfo';
import CryptoJS from 'crypto-js';

import { savePersonnelStatus } from '@/api/personnel/personnelStatuses';
import { Env } from '@/lib/env';
import { logger } from '@/lib/logging';
import { getOfflineQueueStorage } from '@/lib/storage/secure-storage';
import type { SavePersonStatusInput } from '@/models/v4/personnelStatuses/savePersonStatusInput';

const MAX_RETRIES = 5;

const hashDiagnosticIdentifier = (identifier: string): string | null => {
  return identifier ? CryptoJS.HmacSHA256(identifier, Env.LOGGING_KEY || '').toString() : null;
};

interface QueueItem {
  id: string;
  type: 'personnelStatus';
  payload: SavePersonStatusInput;
  retries: number;
  attempts?: number;
  nextRetryAt?: number;
}

export class RealOfflineQueueProcessor {
  private static instance: RealOfflineQueueProcessor | null = null;
  private processing = false;
  private storageKey = 'offline_queue';
  private queueMutationChain: Promise<void> = Promise.resolve();

  private constructor() {
    NetInfo.addEventListener((state) => {
      if (state.isInternetReachable) {
        void this.processQueue().catch((error) => {
          logger.error({ message: 'Offline queue processing failed on network change', context: { error } });
        });
      }
    });
  }

  static getInstance(): RealOfflineQueueProcessor {
    if (RealOfflineQueueProcessor.instance === null) {
      RealOfflineQueueProcessor.instance = new RealOfflineQueueProcessor();
    }
    return RealOfflineQueueProcessor.instance!;
  }

  private async readQueue(storage: Awaited<ReturnType<typeof getOfflineQueueStorage>>): Promise<QueueItem[]> {
    const raw = storage.getString(this.storageKey);
    if (!raw) return [];
    try {
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as QueueItem[]) : [];
    } catch (error) {
      logger.warn({ message: 'Corrupt offline queue data, resetting queue', context: { error } });
      return [];
    }
  }

  private serializeQueueMutation<T>(mutation: () => Promise<T>): Promise<T> {
    const result = this.queueMutationChain.then(mutation);
    this.queueMutationChain = result.then(
      () => undefined,
      () => undefined
    );
    return result;
  }

  async processQueue(): Promise<void> {
    if (this.processing) return;
    this.processing = true;
    try {
      await this.serializeQueueMutation(async () => {
        const storage = await getOfflineQueueStorage();
        const items = await this.readQueue(storage);
        const remaining: QueueItem[] = [];
        for (const item of items) {
          if (item.nextRetryAt && item.nextRetryAt > Date.now()) {
            remaining.push(item);
            continue;
          }

          try {
            if (item.type === 'personnelStatus') {
              await savePersonnelStatus(item.payload);
            }
          } catch (error) {
            item.retries++;
            item.attempts = (item.attempts ?? item.retries - 1) + 1;
            if (item.attempts >= MAX_RETRIES) {
              logger.error({ message: 'Dropping offline queue item after max retries', context: { id: item.id, attempts: item.attempts, error } });
              continue;
            }
            const backoff = Math.min(2 ** item.retries * 1000, 30000);
            item.nextRetryAt = Date.now() + backoff;
            remaining.push(item);
            logger.warn({ message: 'Scheduled offline queue item retry', context: { id: item.id, attempts: item.attempts, nextRetryAt: item.nextRetryAt, error } });
          }
        }
        await storage.set(this.storageKey, JSON.stringify(remaining));
      });
    } catch (error) {
      logger.error({ message: 'Processing offline queue failed', context: { error } });
    } finally {
      this.processing = false;
    }
  }

  addPersonnelStatusToQueue(status: SavePersonStatusInput): string {
    const id = `${Date.now()}-${Math.random()}`;
    void this.enqueue({ id, type: 'personnelStatus', payload: status, retries: 0, attempts: 0 }).catch((error) => {
      logger.error({ message: 'Failed to enqueue personnel status', context: { id, error } });
    });
    return id;
  }

  private enqueue(item: QueueItem): Promise<void> {
    return this.serializeQueueMutation(async () => {
      const storage = await getOfflineQueueStorage();
      const items = await this.readQueue(storage);
      items.push(item);
      await storage.set(this.storageKey, JSON.stringify(items));
    });
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
    logger.warn({ message: 'Stub offline queue active: queued items are NOT persisted or processed (non-production environment)' });
    return Promise.resolve();
  }
  addPersonnelStatusToQueue(status: SavePersonStatusInput): string {
    if (process.env.NODE_ENV === 'production') {
      logger.error({ message: 'Stub offline queue used in production' });
      throw new Error('OfflineQueueProcessor stub used in production');
    }
    logger.warn({
      message: 'Stub offline queue: dropping personnel status item (non-production environment)',
      context: {
        userIdHash: hashDiagnosticIdentifier(status.UserId),
        eventIdHash: hashDiagnosticIdentifier(status.EventId),
        lawful_basis: 'legitimate_interests',
        purpose: 'offline_queue_diagnostics',
      },
    });
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
