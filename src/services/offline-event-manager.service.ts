import { AppState, type AppStateStatus } from 'react-native';

import { saveCallImage } from '@/api/calls/callFiles';
import { setUnitLocation } from '@/api/units/unitLocation';
import { saveUnitStatus } from '@/api/units/unitStatuses';
import { logger } from '@/lib/logging';
import { type QueuedCallImageUploadEvent, type QueuedEvent, QueuedEventStatus, QueuedEventType, type QueuedLocationUpdateEvent, type QueuedUnitStatusEvent } from '@/models/offline-queue/queued-event';
import { SaveUnitLocationInput } from '@/models/v4/unitLocation/saveUnitLocationInput';
import { SaveUnitStatusInput, SaveUnitStatusRoleInput } from '@/models/v4/unitStatus/saveUnitStatusInput';
import { useOfflineQueueStore } from '@/stores/offline-queue/store';

class OfflineEventManager {
  private static instance: OfflineEventManager;
  private processingInterval: NodeJS.Timeout | null = null;
  private backgroundTimeout: NodeJS.Timeout | null = null;
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
   * Initialize the offline event manager
   */
  public initialize(): void {
    logger.info({
      message: 'Initializing offline event manager',
    });

    // Initialize network listener
    useOfflineQueueStore.getState().initializeNetworkListener();

    // Start processing when app becomes active
    this.handleAppStateChange(AppState.currentState);
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

    // Clear background timeout if it exists
    if (this.backgroundTimeout) {
      clearTimeout(this.backgroundTimeout);
      this.backgroundTimeout = null;
    }
  }

  /**
   * Add a unit status event to the queue
   */
  public queueUnitStatusEvent(
    unitId: string,
    statusType: string,
    note?: string,
    respondingTo?: string,
    roles?: { roleId: string; userId: string }[],
    gpsData?: {
      latitude?: string;
      longitude?: string;
      accuracy?: string;
      altitude?: string;
      altitudeAccuracy?: string;
      speed?: string;
      heading?: string;
    }
  ): string {
    const date = new Date();
    const data = {
      unitId,
      statusType,
      note,
      respondingTo,
      timestamp: date.toISOString(),
      timestampUtc: date.toUTCString().replace('UTC', 'GMT'),
      roles,
      latitude: gpsData?.latitude,
      longitude: gpsData?.longitude,
      accuracy: gpsData?.accuracy,
      altitude: gpsData?.altitude,
      altitudeAccuracy: gpsData?.altitudeAccuracy,
      speed: gpsData?.speed,
      heading: gpsData?.heading,
    };

    return useOfflineQueueStore.getState().addEvent(QueuedEventType.UNIT_STATUS, data);
  }

  /**
   * Add a location update event to the queue
   */
  public queueLocationUpdateEvent(unitId: string, latitude: number, longitude: number, accuracy?: number, heading?: number, speed?: number): string {
    const data = {
      unitId,
      latitude,
      longitude,
      accuracy,
      heading,
      speed,
      timestamp: new Date().toISOString(),
    };

    return useOfflineQueueStore.getState().addEvent(QueuedEventType.LOCATION_UPDATE, data);
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

    return useOfflineQueueStore.getState().addEvent(QueuedEventType.CALL_IMAGE_UPLOAD, data);
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
        case QueuedEventType.UNIT_STATUS:
          await this.processUnitStatusEvent(event as QueuedUnitStatusEvent);
          break;
        case QueuedEventType.LOCATION_UPDATE:
          await this.processLocationUpdateEvent(event as QueuedLocationUpdateEvent);
          break;
        case QueuedEventType.CALL_IMAGE_UPLOAD:
          await this.processCallImageUploadEvent(event as QueuedCallImageUploadEvent);
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
   * Process unit status event
   */
  private async processUnitStatusEvent(event: QueuedUnitStatusEvent): Promise<void> {
    const input = new SaveUnitStatusInput();
    input.Id = event.data.unitId;
    input.Type = event.data.statusType;
    input.Note = event.data.note || '';
    input.RespondingTo = event.data.respondingTo || '0';
    input.Timestamp = event.data.timestamp;
    input.TimestampUtc = event.data.timestampUtc;

    // Always set GPS coordinates (even if empty)
    if (event.data.latitude && event.data.longitude) {
      input.Latitude = event.data.latitude;
      input.Longitude = event.data.longitude;
      input.Accuracy = event.data.accuracy || '0';
      input.Altitude = event.data.altitude || '0';
      input.AltitudeAccuracy = event.data.altitudeAccuracy || '0';
      input.Speed = event.data.speed || '0';
      input.Heading = event.data.heading || '0';
    } else {
      // Set empty strings when GPS data is not available
      input.Latitude = '';
      input.Longitude = '';
      input.Accuracy = '';
      input.Altitude = '';
      input.AltitudeAccuracy = '';
      input.Speed = '';
      input.Heading = '';
    }

    if (event.data.roles) {
      input.Roles = event.data.roles.map((role) => {
        const roleInput = new SaveUnitStatusRoleInput();
        roleInput.RoleId = role.roleId;
        roleInput.UserId = role.userId;
        return roleInput;
      });
    }

    await saveUnitStatus(input);
  }

  /**
   * Process location update event
   */
  private async processLocationUpdateEvent(event: QueuedLocationUpdateEvent): Promise<void> {
    const input = new SaveUnitLocationInput();
    input.UnitId = event.data.unitId;
    input.Latitude = event.data.latitude.toString();
    input.Longitude = event.data.longitude.toString();
    input.Accuracy = event.data.accuracy?.toString() || '';
    input.Heading = event.data.heading?.toString() || '';
    input.Speed = event.data.speed?.toString() || '';
    input.Timestamp = event.data.timestamp;

    await setUnitLocation(input);
  }

  /**
   * Process call image upload event
   */
  private async processCallImageUploadEvent(event: QueuedCallImageUploadEvent): Promise<void> {
    await saveCallImage(event.data.callId, event.data.userId, event.data.note, event.data.name, event.data.latitude ?? null, event.data.longitude ?? null, event.data.filePath);
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
