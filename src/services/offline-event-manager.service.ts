import { AppState, type AppStateStatus } from 'react-native';

import { saveCallImage } from '@/api/calls/callFiles';
import { performCheckIn } from '@/api/calls/check-in-timers';
import { logger } from '@/lib/logging';
import { type QueuedCallImageUploadEvent, type QueuedCheckInEvent, type QueuedEvent, QueuedEventStatus, QueuedEventType } from '@/models/offline-queue/queued-event';
import { useOfflineQueueStore } from '@/stores/offline-queue/store';

class OfflineEventManager {
  private static instance: OfflineEventManager;
  private processingInterval: ReturnType<typeof setInterval> | null = null;
  private backgroundTimeout: ReturnType<typeof setTimeout> | null = null;
  private isProcessing = false;
  private appStateSubscription: { remove: () => void } | null = null;
  private readonly PROCESSING_INTERVAL = 10000; // 10 seconds
  private readonly MAX_CONCURRENT_EVENTS = 3;

  private constructor() {
    this.initializeAppStateListener();
  }

  static getInstance(): OfflineEventManager {
    if (!OfflineEventManager.instance) {
      OfflineEventManager.instance = new OfflineEventManager();
    }
    return OfflineEventManager.instance;
  }

  /**
   * Initialize the offline event manager. Safe to call more than once: the store's network
   * listener registration and startProcessing are both idempotent.
   */
  public initialize(): void {
    logger.info({
      message: 'Initializing offline event manager',
    });

    // Initialize network listener (idempotent in the store)
    useOfflineQueueStore.getState().initializeNetworkListener();

    // Start processing when app becomes active
    this.handleAppStateChange(AppState.currentState);
  }

  /**
   * Bring the manager online the first time work is queued. Without this the processing
   * loop only started on an AppState transition to 'active', so an event queued while
   * offline sat untouched until the user backgrounded and reopened the app.
   */
  private ensureProcessing(): void {
    useOfflineQueueStore.getState().initializeNetworkListener();
    this.startProcessing();
  }

  /**
   * Start background processing of queued events
   */
  public startProcessing(): void {
    if (this.processingInterval) {
      logger.debug({
        message: 'Event processing already running',
      });
      return;
    }

    logger.info({
      message: 'Starting offline event processing',
    });

    this.processingInterval = setInterval(() => {
      this.processQueuedEvents();
    }, this.PROCESSING_INTERVAL);

    // Process immediately on start
    this.processQueuedEvents();
  }

  /**
   * Stop background processing
   */
  public stopProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
      logger.info({
        message: 'Stopped offline event processing',
      });
    }
    // Clear any pending background timeout when stopping processing
    if (this.backgroundTimeout) {
      clearTimeout(this.backgroundTimeout);
      this.backgroundTimeout = null;
    }

    // Clear background timeout if it exists
    if (this.backgroundTimeout) {
      clearTimeout(this.backgroundTimeout);
      this.backgroundTimeout = null;
    }
  }

  /**
   * Add a call image upload event to the queue
   */
  public queueCallImageUploadEvent(callId: string, userId: string, note: string, name: string, filePath: string, latitude?: number, longitude?: number): string {
    const data = {
      callId,
      userId,
      note,
      name,
      latitude,
      longitude,
      filePath,
    };

    const queuedId = useOfflineQueueStore.getState().addEvent(QueuedEventType.CALL_IMAGE_UPLOAD, data);
    this.ensureProcessing();
    return queuedId;
  }

  /**
   * Process queued events
   */
  private async processQueuedEvents(): Promise<void> {
    if (this.isProcessing) {
      logger.debug({
        message: 'Event processing already in progress, skipping',
      });
      return;
    }

    const store = useOfflineQueueStore.getState();

    // Don't process if offline
    if (!store.isConnected || !store.isNetworkReachable) {
      logger.debug({
        message: 'Device is offline, skipping event processing',
        context: { isConnected: store.isConnected, isNetworkReachable: store.isNetworkReachable },
      });
      return;
    }

    const pendingEvents = store.getPendingEvents();
    if (pendingEvents.length === 0) {
      return;
    }

    this.isProcessing = true;
    store._setProcessing(true);

    logger.info({
      message: 'Processing queued events',
      context: { eventCount: pendingEvents.length },
    });

    // Process events in batches
    const eventsToProcess = pendingEvents.slice(0, this.MAX_CONCURRENT_EVENTS);
    const processingPromises = eventsToProcess.map((event) => this.processEvent(event));

    try {
      await Promise.allSettled(processingPromises);
    } catch (error) {
      logger.error({
        message: 'Error during batch event processing',
        context: { error },
      });
    } finally {
      this.isProcessing = false;
      store._setProcessing(false);
    }
  }

  /**
   * Process a single event
   */
  private async processEvent(event: QueuedEvent): Promise<void> {
    const store = useOfflineQueueStore.getState();

    logger.debug({
      message: 'Processing event',
      context: { eventId: event.id, type: event.type },
    });

    store.updateEventStatus(event.id, QueuedEventStatus.PROCESSING);

    try {
      switch (event.type) {
        case QueuedEventType.CALL_IMAGE_UPLOAD:
          await this.processCallImageUploadEvent(event as QueuedCallImageUploadEvent);
          break;
        case QueuedEventType.CHECK_IN:
          await this.processCheckInEvent(event as QueuedCheckInEvent);
          break;
        default:
          throw new Error(`Unknown event type: ${event.type}`);
      }

      // Mark as completed and remove from queue
      store.updateEventStatus(event.id, QueuedEventStatus.COMPLETED);

      // Clean up completed events after a delay to avoid immediate removal
      setTimeout(() => {
        store.removeEvent(event.id);
      }, 1000);

      logger.info({
        message: 'Event processed successfully',
        context: { eventId: event.id, type: event.type },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      store.updateEventStatus(event.id, QueuedEventStatus.FAILED, errorMessage);

      logger.error({
        message: 'Failed to process event',
        context: { eventId: event.id, type: event.type, error: errorMessage },
      });
    }
  }

  /**
   * Process call image upload event
   */
  private async processCallImageUploadEvent(event: QueuedCallImageUploadEvent): Promise<void> {
    await saveCallImage(event.data.callId, event.data.userId, event.data.note, event.data.name, event.data.latitude ?? null, event.data.longitude ?? null, event.data.filePath);
  }

  /**
   * Add a check-in event to the queue
   */
  public queueCheckInEvent(callId: number, checkInType: number, unitId?: number, latitude?: string, longitude?: string, note?: string): string {
    const data = {
      callId,
      checkInType,
      unitId,
      latitude,
      longitude,
      note,
      timestamp: new Date().toISOString(),
    };

    const queuedId = useOfflineQueueStore.getState().addEvent(QueuedEventType.CHECK_IN, data);
    this.ensureProcessing();
    return queuedId;
  }

  /**
   * Process check-in event
   */
  private async processCheckInEvent(event: QueuedCheckInEvent): Promise<void> {
    await performCheckIn({
      CallId: event.data.callId,
      CheckInType: event.data.checkInType,
      UnitId: event.data.unitId,
      Latitude: event.data.latitude,
      Longitude: event.data.longitude,
      Note: event.data.note,
    });
  }

  /**
   * Initialize app state listener to start/stop processing
   */
  private initializeAppStateListener(): void {
    this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange);
  }

  /**
   * Handle app state changes
   */
  private handleAppStateChange = (nextAppState: AppStateStatus): void => {
    logger.info({
      message: 'Offline event manager handling app state change',
      context: { nextAppState },
    });

    // Clear any existing background timeout when state changes
    if (this.backgroundTimeout) {
      clearTimeout(this.backgroundTimeout);
      this.backgroundTimeout = null;
    }

    if (nextAppState === 'active') {
      this.startProcessing();
    } else if (nextAppState === 'background') {
      // Keep processing in background for a short time
      this.backgroundTimeout = setTimeout(() => {
        if (AppState.currentState === 'background') {
          this.stopProcessing();
        }
      }, 30000); // 30 seconds
    } else if (nextAppState === 'inactive') {
      this.stopProcessing();
    }
  };

  /**
   * Clean up resources
   */
  public cleanup(): void {
    this.stopProcessing();

    // Clear background timeout
    if (this.backgroundTimeout) {
      clearTimeout(this.backgroundTimeout);
      this.backgroundTimeout = null;
    }

    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }

    logger.info({
      message: 'Offline event manager cleaned up',
    });
  }

  /**
   * Get processing statistics
   */
  public getStats(): {
    isProcessing: boolean;
    totalEvents: number;
    pendingEvents: number;
    failedEvents: number;
    completedEvents: number;
  } {
    const store = useOfflineQueueStore.getState();

    return {
      isProcessing: this.isProcessing,
      totalEvents: store.totalEvents,
      pendingEvents: store.getPendingEvents().length,
      failedEvents: store.getFailedEvents().length,
      completedEvents: store.completedEvents,
    };
  }

  /**
   * Retry all failed events
   */
  public retryFailedEvents(): void {
    useOfflineQueueStore.getState().retryAllFailedEvents();

    // Trigger processing immediately
    this.processQueuedEvents();
  }

  /**
   * Clear completed events
   */
  public clearCompletedEvents(): void {
    useOfflineQueueStore.getState().clearCompletedEvents();
  }
}

// Export singleton instance
export const offlineEventManager = OfflineEventManager.getInstance();
