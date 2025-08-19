import NetInfo from '@react-native-community/netinfo';
import * as TaskManager from 'expo-task-manager';
import { AppState, type AppStateStatus } from 'react-native';

import { savePersonnelStatus } from '@/api/personnel/personnelStatuses';
import { logger } from '@/lib/logging';
import { type QueuedEvent, QueuedEventStatus, QueuedEventType } from '@/models/offline-queue/queued-event';
import { SavePersonStatusInput } from '@/models/v4/personnelStatuses/savePersonStatusInput';
import { useOfflineQueueStore } from '@/stores/offline-queue/store';

const QUEUE_PROCESSOR_TASK_NAME = 'offline-queue-processor';

// Define the background task for processing the queue
TaskManager.defineTask(QUEUE_PROCESSOR_TASK_NAME, async () => {
  try {
    logger.info({
      message: 'Background queue processor task running',
    });

    const processor = OfflineQueueProcessor.getInstance();
    await processor.processQueue();
  } catch (error) {
    logger.error({
      message: 'Error in background queue processor task',
      context: { error },
    });
  }
});

interface QueuedPersonnelStatusEvent extends Omit<QueuedEvent, 'data'> {
  type: QueuedEventType.PERSONNEL_STATUS;
  data: {
    userId: string;
    statusType: string;
    note?: string;
    respondingTo?: string;
    timestamp: string;
    timestampUtc: string;
    latitude?: string;
    longitude?: string;
    accuracy?: string;
    altitude?: string;
    altitudeAccuracy?: string;
    speed?: string;
    heading?: string;
    eventId?: string;
  };
}

export class OfflineQueueProcessor {
  private static instance: OfflineQueueProcessor;
  private isProcessing = false;
  private processingInterval: NodeJS.Timeout | null = null;
  private appStateSubscription: { remove: () => void } | null = null;
  private networkUnsubscribe: (() => void) | null = null;

  private constructor() {
    this.initializeListeners();
  }

  public static getInstance(): OfflineQueueProcessor {
    if (!OfflineQueueProcessor.instance) {
      OfflineQueueProcessor.instance = new OfflineQueueProcessor();
    }
    return OfflineQueueProcessor.instance;
  }

  private initializeListeners(): void {
    // Listen for app state changes
    this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange);

    // Listen for network state changes
    this.networkUnsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected && state.isInternetReachable) {
        logger.info({
          message: 'Network connected, processing offline queue',
        });
        this.processQueue();
      }
    });
  }

  private handleAppStateChange = (nextAppState: AppStateStatus): void => {
    if (nextAppState === 'active') {
      logger.info({
        message: 'App became active, starting queue processing',
      });
      this.startProcessing();
    } else if (nextAppState === 'background') {
      logger.info({
        message: 'App went to background, starting background queue processing',
      });
      this.startBackgroundProcessing();
    }
  };

  public async startProcessing(): Promise<void> {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }

    // Process immediately
    await this.processQueue();

    // Set up regular processing while app is active
    this.processingInterval = setInterval(async () => {
      await this.processQueue();
    }, 30000); // Process every 30 seconds while app is active

    logger.info({
      message: 'Started foreground queue processing',
    });
  }

  public async startBackgroundProcessing(): Promise<void> {
    try {
      // Register background task if not already registered
      const isTaskRegistered = await TaskManager.isTaskRegisteredAsync(QUEUE_PROCESSOR_TASK_NAME);
      if (!isTaskRegistered) {
        await TaskManager.defineTask(QUEUE_PROCESSOR_TASK_NAME, async () => {
          await this.processQueue();
        });

        logger.info({
          message: 'Background queue processor task registered',
        });
      }

      // Stop foreground processing
      if (this.processingInterval) {
        clearInterval(this.processingInterval);
        this.processingInterval = null;
      }

      logger.info({
        message: 'Started background queue processing',
      });
    } catch (error) {
      logger.error({
        message: 'Failed to start background queue processing',
        context: { error },
      });
    }
  }

  public stopProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }

    logger.info({
      message: 'Stopped queue processing',
    });
  }

  public async processQueue(): Promise<void> {
    if (this.isProcessing) {
      logger.debug({
        message: 'Queue processing already in progress, skipping',
      });
      return;
    }

    const queueStore = useOfflineQueueStore.getState();
    const pendingEvents = queueStore.getPendingEvents();

    if (pendingEvents.length === 0) {
      logger.debug({
        message: 'No pending events in queue',
      });
      return;
    }

    // Check network connectivity
    const networkState = await NetInfo.fetch();
    if (!networkState.isConnected || !networkState.isInternetReachable) {
      logger.info({
        message: 'No network connectivity, skipping queue processing',
        context: { isConnected: networkState.isConnected, isReachable: networkState.isInternetReachable },
      });
      return;
    }

    this.isProcessing = true;
    queueStore._setProcessing(true);

    logger.info({
      message: 'Processing offline queue',
      context: { pendingEventsCount: pendingEvents.length },
    });

    for (const event of pendingEvents) {
      try {
        queueStore._setProcessing(true, event.id);
        queueStore.updateEventStatus(event.id, QueuedEventStatus.PROCESSING);

        await this.processEvent(event);

        queueStore.updateEventStatus(event.id, QueuedEventStatus.COMPLETED);
        logger.info({
          message: 'Successfully processed queued event',
          context: { eventId: event.id, type: event.type },
        });
      } catch (error) {
        logger.error({
          message: 'Failed to process queued event',
          context: { eventId: event.id, type: event.type, error },
        });

        queueStore.updateEventStatus(event.id, QueuedEventStatus.FAILED, error instanceof Error ? error.message : String(error));

        // If max retries exceeded, log it
        if (event.retryCount >= event.maxRetries) {
          logger.warn({
            message: 'Event exceeded max retries, will not retry again',
            context: { eventId: event.id, retryCount: event.retryCount, maxRetries: event.maxRetries },
          });
        }
      }
    }

    this.isProcessing = false;
    queueStore._setProcessing(false);

    // Clean up completed events older than 24 hours
    this.cleanupOldEvents();

    logger.info({
      message: 'Queue processing completed',
    });
  }

  private async processEvent(event: QueuedEvent): Promise<void> {
    switch (event.type) {
      case QueuedEventType.PERSONNEL_STATUS:
        await this.processPersonnelStatusEvent(event as QueuedPersonnelStatusEvent);
        break;
      default:
        throw new Error(`Unsupported event type: ${event.type}`);
    }
  }

  private async processPersonnelStatusEvent(event: QueuedPersonnelStatusEvent): Promise<void> {
    const statusInput = new SavePersonStatusInput();

    // Map the queued event data to SavePersonStatusInput format
    statusInput.UserId = event.data.userId;
    statusInput.Type = event.data.statusType;
    statusInput.Note = event.data.note || '';
    statusInput.RespondingTo = event.data.respondingTo || '';
    statusInput.Timestamp = event.data.timestamp;
    statusInput.TimestampUtc = event.data.timestampUtc;
    statusInput.Latitude = event.data.latitude || '';
    statusInput.Longitude = event.data.longitude || '';
    statusInput.Accuracy = event.data.accuracy || '';
    statusInput.Altitude = event.data.altitude || '';
    statusInput.AltitudeAccuracy = event.data.altitudeAccuracy || '';
    statusInput.Speed = event.data.speed || '';
    statusInput.Heading = event.data.heading || '';
    statusInput.EventId = event.data.eventId || '';

    await savePersonnelStatus(statusInput);

    logger.info({
      message: 'Successfully processed personnel status event',
      context: { eventId: event.id, userId: statusInput.UserId, statusType: statusInput.Type },
    });
  }

  private cleanupOldEvents(): void {
    const queueStore = useOfflineQueueStore.getState();
    const completedEvents = queueStore.queuedEvents.filter((event) => event.status === QueuedEventStatus.COMPLETED);
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

    completedEvents.forEach((event) => {
      if (event.lastAttemptAt && event.lastAttemptAt < oneDayAgo) {
        queueStore.removeEvent(event.id);
      }
    });
  }

  public addPersonnelStatusToQueue(statusInput: SavePersonStatusInput, maxRetries = 3): string {
    const queueStore = useOfflineQueueStore.getState();

    // Convert SavePersonStatusInput to the queue event data format
    const eventData = {
      userId: statusInput.UserId,
      statusType: statusInput.Type,
      note: statusInput.Note,
      respondingTo: statusInput.RespondingTo,
      timestamp: statusInput.Timestamp,
      timestampUtc: statusInput.TimestampUtc,
      latitude: statusInput.Latitude,
      longitude: statusInput.Longitude,
      accuracy: statusInput.Accuracy,
      altitude: statusInput.Altitude,
      altitudeAccuracy: statusInput.AltitudeAccuracy,
      speed: statusInput.Speed,
      heading: statusInput.Heading,
      eventId: statusInput.EventId,
    };

    const eventId = queueStore.addEvent(QueuedEventType.PERSONNEL_STATUS, eventData, maxRetries);

    logger.info({
      message: 'Added personnel status to offline queue',
      context: { eventId, userId: statusInput.UserId, statusType: statusInput.Type },
    });

    // Try to process immediately if network is available
    NetInfo.fetch().then((state) => {
      if (state.isConnected && state.isInternetReachable) {
        this.processQueue();
      }
    });

    return eventId;
  }

  public cleanup(): void {
    this.stopProcessing();

    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }

    if (this.networkUnsubscribe) {
      this.networkUnsubscribe();
      this.networkUnsubscribe = null;
    }

    // Unregister background task
    TaskManager.isTaskRegisteredAsync(QUEUE_PROCESSOR_TASK_NAME).then((isRegistered) => {
      if (isRegistered) {
        TaskManager.unregisterTaskAsync(QUEUE_PROCESSOR_TASK_NAME);
      }
    });

    logger.info({
      message: 'Offline queue processor cleaned up',
    });
  }
}

// Export singleton instance
export const offlineQueueProcessor = OfflineQueueProcessor.getInstance();
