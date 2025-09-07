import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { logger } from '@/lib/logging';
import { secureOfflineQueueStorage } from '@/lib/storage/offline-queue-storage';
import { type QueuedEvent, QueuedEventStatus, type QueuedEventType } from '@/models/offline-queue/queued-event';
import { generateEventId } from '@/utils/id-generator';

interface OfflineQueueState {
  // Network state
  isConnected: boolean;
  isNetworkReachable: boolean;

  // Queue state
  queuedEvents: QueuedEvent[];
  isProcessing: boolean;
  processingEventId: string | null;

  // Statistics
  totalEvents: number;
  failedEvents: number;
  completedEvents: number;

  // Actions
  initializeNetworkListener: () => void;
  addEvent: (type: QueuedEventType, data: Record<string, any>, maxRetries?: number) => string;
  updateEventStatus: (eventId: string, status: QueuedEventStatus, error?: string) => void;
  removeEvent: (eventId: string) => void;
  getEventById: (eventId: string) => QueuedEvent | undefined;
  getEventsByType: (type: QueuedEventType) => QueuedEvent[];
  getPendingEvents: () => QueuedEvent[];
  getFailedEvents: () => QueuedEvent[];
  clearCompletedEvents: () => void;
  clearAllEvents: () => void;
  retryEvent: (eventId: string) => void;
  retryAllFailedEvents: () => void;

  // Internal actions
  _setNetworkState: (isConnected: boolean, isReachable: boolean) => void;
  _setProcessing: (isProcessing: boolean, eventId?: string) => void;
}

const DEFAULT_MAX_RETRIES = 3;
const RETRY_DELAY_BASE = 1000; // 1 second base delay

export const useOfflineQueueStore = create<OfflineQueueState>()(
  persist(
    (set, get) => ({
      // Initial state
      isConnected: true,
      isNetworkReachable: true,
      queuedEvents: [],
      isProcessing: false,
      processingEventId: null,
      totalEvents: 0,
      failedEvents: 0,
      completedEvents: 0,

      // Initialize network state listener
      initializeNetworkListener: () => {
        NetInfo.addEventListener((state: NetInfoState) => {
          const isConnected = state.isConnected ?? false;
          const isReachable = state.isInternetReachable ?? false;

          logger.info({
            message: 'Network state changed',
            context: {
              isConnected,
              isReachable,
              type: state.type,
              details: state.details,
            },
          });

          get()._setNetworkState(isConnected, isReachable);
        });

        // Get initial network state
        NetInfo.fetch().then((state: NetInfoState) => {
          const isConnected = state.isConnected ?? false;
          const isReachable = state.isInternetReachable ?? false;
          get()._setNetworkState(isConnected, isReachable);
        });
      },

      // Add new event to queue
      addEvent: (type: QueuedEventType, data: Record<string, any>, maxRetries = DEFAULT_MAX_RETRIES) => {
        const eventId = generateEventId();
        const now = Date.now();

        const event: QueuedEvent = {
          id: eventId,
          type,
          status: QueuedEventStatus.PENDING,
          data,
          retryCount: 0,
          maxRetries,
          createdAt: now,
        };

        set((state) => ({
          queuedEvents: [...state.queuedEvents, event],
          totalEvents: state.totalEvents + 1,
        }));

        logger.info({
          message: 'Event added to offline queue',
          context: { eventId, type, dataKeys: Object.keys(data) },
        });

        return eventId;
      },

      // Update event status
      updateEventStatus: (eventId: string, status: QueuedEventStatus, error?: string) => {
        set((state) => ({
          queuedEvents: state.queuedEvents.map((event) => {
            if (event.id === eventId) {
              const updatedEvent: QueuedEvent = {
                ...event,
                status,
                lastAttemptAt: Date.now(),
                // Use nullish coalescing to normalize error and explicitly clear stale fields for non-FAILED status
                error: status === QueuedEventStatus.FAILED ? (error ?? undefined) : undefined,
                nextRetryAt: undefined, // Clear initially, will be set below if FAILED
              };

              // Calculate next retry time if this is a failed attempt
              if (status === QueuedEventStatus.FAILED && event.retryCount < event.maxRetries) {
                const delay = RETRY_DELAY_BASE * Math.pow(2, event.retryCount); // Exponential backoff
                updatedEvent.nextRetryAt = Date.now() + delay;
                updatedEvent.retryCount = event.retryCount + 1;
              }

              return updatedEvent;
            }
            return event;
          }),
          failedEvents: status === QueuedEventStatus.FAILED ? state.failedEvents + 1 : state.failedEvents,
          completedEvents: status === QueuedEventStatus.COMPLETED ? state.completedEvents + 1 : state.completedEvents,
        }));

        logger.info({
          message: 'Event status updated',
          context: { eventId, status, error },
        });
      },

      // Remove event from queue
      removeEvent: (eventId: string) => {
        set((state) => ({
          queuedEvents: state.queuedEvents.filter((event) => event.id !== eventId),
        }));

        logger.debug({
          message: 'Event removed from queue',
          context: { eventId },
        });
      },

      // Get event by ID
      getEventById: (eventId: string) => {
        return get().queuedEvents.find((event) => event.id === eventId);
      },

      // Get events by type
      getEventsByType: (type: QueuedEventType) => {
        return get().queuedEvents.filter((event) => event.type === type);
      },

      // Get pending events
      getPendingEvents: () => {
        return get().queuedEvents.filter(
          (event) => event.status === QueuedEventStatus.PENDING || (event.status === QueuedEventStatus.FAILED && event.retryCount < event.maxRetries && (!event.nextRetryAt || event.nextRetryAt <= Date.now()))
        );
      },

      // Get failed events
      getFailedEvents: () => {
        return get().queuedEvents.filter((event) => event.status === QueuedEventStatus.FAILED && event.retryCount >= event.maxRetries);
      },

      // Clear completed events
      clearCompletedEvents: () => {
        set((state) => ({
          queuedEvents: state.queuedEvents.filter((event) => event.status !== QueuedEventStatus.COMPLETED),
        }));

        logger.debug({
          message: 'Completed events cleared from queue',
        });
      },

      // Clear all events
      clearAllEvents: () => {
        set({
          queuedEvents: [],
          totalEvents: 0,
          failedEvents: 0,
          completedEvents: 0,
          isProcessing: false,
          processingEventId: null,
        });

        logger.info({
          message: 'All events cleared from queue',
        });
      },

      // Retry specific event
      retryEvent: (eventId: string) => {
        set((state) => ({
          queuedEvents: state.queuedEvents.map((event) => {
            if (event.id === eventId && event.status === QueuedEventStatus.FAILED) {
              const updatedEvent: QueuedEvent = {
                ...event,
                status: QueuedEventStatus.PENDING,
                error: undefined,
                nextRetryAt: undefined,
              };
              return updatedEvent;
            }
            return event;
          }),
        }));

        logger.info({
          message: 'Event marked for retry',
          context: { eventId },
        });
      },

      // Retry all failed events
      retryAllFailedEvents: () => {
        set((state) => ({
          queuedEvents: state.queuedEvents.map((event) => {
            if (event.status === QueuedEventStatus.FAILED) {
              const updatedEvent: QueuedEvent = {
                ...event,
                status: QueuedEventStatus.PENDING,
                error: undefined,
                nextRetryAt: undefined,
              };
              return updatedEvent;
            }
            return event;
          }),
        }));

        logger.info({
          message: 'All failed events marked for retry',
        });
      },

      // Internal actions
      _setNetworkState: (isConnected: boolean, isReachable: boolean) => {
        set({ isConnected, isNetworkReachable: isReachable });
      },

      _setProcessing: (isProcessing: boolean, eventId?: string) => {
        set({
          isProcessing,
          processingEventId: isProcessing ? (eventId ?? null) : null,
        });
      },
    }),
    {
      name: 'offline-queue-storage',
      storage: createJSONStorage(() => secureOfflineQueueStorage),
      // Only persist the events and statistics, not the network state or processing state
      partialize: (state) => ({
        queuedEvents: state.queuedEvents,
        totalEvents: state.totalEvents,
        failedEvents: state.failedEvents,
        completedEvents: state.completedEvents,
      }),
    }
  )
);
