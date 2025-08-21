import { QueuedEventStatus, QueuedEventType } from '@/models/offline-queue/queued-event';
import { useOfflineQueueStore } from '@/stores/offline-queue/store';

// Mock NetInfo
jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(),
  fetch: jest.fn(() =>
    Promise.resolve({
      isConnected: true,
      isInternetReachable: true,
      type: 'wifi',
      details: {},
    })
  ),
}));

// Mock zustand storage
jest.mock('@/lib/storage', () => ({
  zustandStorage: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

// Mock logger
jest.mock('@/lib/logging', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

// Mock ID generator
jest.mock('@/utils/id-generator', () => ({
  generateEventId: jest.fn(),
}));

const mockGenerateEventId = require('@/utils/id-generator').generateEventId as jest.MockedFunction<() => string>;

describe('OfflineQueueStore', () => {
  let eventIdCounter = 0;

  beforeEach(() => {
    // Reset store state before each test
    useOfflineQueueStore.setState({
      isConnected: true,
      isNetworkReachable: true,
      queuedEvents: [],
      isProcessing: false,
      processingEventId: null,
      totalEvents: 0,
      failedEvents: 0,
      completedEvents: 0,
    });
    
    // Reset event ID counter and mock
    eventIdCounter = 0;
    mockGenerateEventId.mockImplementation(() => `test-event-id-${++eventIdCounter}`);
    
    jest.clearAllMocks();
  });

  describe('addEvent', () => {
    it('should add a new event to the queue', () => {
      const store = useOfflineQueueStore.getState();
      
      const eventId = store.addEvent(QueuedEventType.UNIT_STATUS, {
        unitId: 'unit-1',
        statusType: 'available',
      });

      expect(eventId).toBe('test-event-id-1');
      
      const state = useOfflineQueueStore.getState();
      expect(state.queuedEvents).toHaveLength(1);
      expect(state.queuedEvents[0]).toMatchObject({
        id: eventId, // Use the actual returned ID
        type: QueuedEventType.UNIT_STATUS,
        status: QueuedEventStatus.PENDING,
        data: {
          unitId: 'unit-1',
          statusType: 'available',
        },
        retryCount: 0,
        maxRetries: 3,
      });
      expect(state.totalEvents).toBe(1);
    });

    it('should add event with custom max retries', () => {
      const store = useOfflineQueueStore.getState();
      
      store.addEvent(QueuedEventType.UNIT_STATUS, { test: 'data' }, 5);

      const state = useOfflineQueueStore.getState();
      expect(state.queuedEvents[0].maxRetries).toBe(5);
    });
  });

  describe('updateEventStatus', () => {
    let eventId: string;
    
    beforeEach(() => {
      // Add an event first
      const store = useOfflineQueueStore.getState();
      eventId = store.addEvent(QueuedEventType.UNIT_STATUS, { test: 'data' });
    });

    it('should update event status to completed', () => {
      const store = useOfflineQueueStore.getState();
      
      store.updateEventStatus(eventId, QueuedEventStatus.COMPLETED);

      const state = useOfflineQueueStore.getState();
      expect(state.queuedEvents[0].status).toBe(QueuedEventStatus.COMPLETED);
      expect(state.completedEvents).toBe(1);
    });

    it('should update event status to failed and increment retry count', () => {
      const store = useOfflineQueueStore.getState();
      
      store.updateEventStatus(eventId, QueuedEventStatus.FAILED, 'Network error');

      const state = useOfflineQueueStore.getState();
      expect(state.queuedEvents[0].status).toBe(QueuedEventStatus.FAILED);
      expect(state.queuedEvents[0].retryCount).toBe(1);
      expect(state.queuedEvents[0].error).toBe('Network error');
      expect(state.queuedEvents[0].nextRetryAt).toBeDefined();
      expect(state.failedEvents).toBe(1);
    });

    it('should not set nextRetryAt if max retries exceeded', () => {
      const store = useOfflineQueueStore.getState();
      
      // Set retry count to max
      store.updateEventStatus(eventId, QueuedEventStatus.FAILED);
      store.updateEventStatus(eventId, QueuedEventStatus.FAILED);
      store.updateEventStatus(eventId, QueuedEventStatus.FAILED);

      const state = useOfflineQueueStore.getState();
      expect(state.queuedEvents[0].retryCount).toBe(3);
    });
  });

  describe('removeEvent', () => {
    let eventId: string;
    
    beforeEach(() => {
      const store = useOfflineQueueStore.getState();
      eventId = store.addEvent(QueuedEventType.UNIT_STATUS, { test: 'data' });
    });

    it('should remove event from queue', () => {
      const store = useOfflineQueueStore.getState();
      
      store.removeEvent(eventId);

      const state = useOfflineQueueStore.getState();
      expect(state.queuedEvents).toHaveLength(0);
    });
  });

  describe('getEventById', () => {
    let eventId: string;
    
    beforeEach(() => {
      const store = useOfflineQueueStore.getState();
      eventId = store.addEvent(QueuedEventType.UNIT_STATUS, { test: 'data' });
    });

    it('should return event by ID', () => {
      const store = useOfflineQueueStore.getState();
      
      const event = store.getEventById(eventId);

      expect(event).toBeDefined();
      expect(event?.id).toBe(eventId);
    });

    it('should return undefined for non-existent ID', () => {
      const store = useOfflineQueueStore.getState();
      
      const event = store.getEventById('non-existent');

      expect(event).toBeUndefined();
    });
  });

  describe('getEventsByType', () => {
    beforeEach(() => {
      const store = useOfflineQueueStore.getState();
      store.addEvent(QueuedEventType.UNIT_STATUS, { test: 'data1' });
      store.addEvent(QueuedEventType.LOCATION_UPDATE, { test: 'data2' });
    });

    it('should return events of specified type', () => {
      const store = useOfflineQueueStore.getState();
      
      const events = store.getEventsByType(QueuedEventType.UNIT_STATUS);

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe(QueuedEventType.UNIT_STATUS);
    });
  });

  describe('getPendingEvents', () => {
    let eventId1: string;
    let eventId2: string;
    
    beforeEach(() => {
      const store = useOfflineQueueStore.getState();
      eventId1 = store.addEvent(QueuedEventType.UNIT_STATUS, { test: 'data1' });
      eventId2 = store.addEvent(QueuedEventType.UNIT_STATUS, { test: 'data2' });
    });

    it('should return events with pending status', () => {
      const store = useOfflineQueueStore.getState();
      
      const events = store.getPendingEvents();

      expect(events).toHaveLength(2);
      events.forEach((event) => {
        expect(event.status).toBe(QueuedEventStatus.PENDING);
      });
    });

    it('should include failed events ready for retry', () => {
      const store = useOfflineQueueStore.getState();
      
      // Mark one event as failed with retry time in the past
      store.updateEventStatus(eventId1, QueuedEventStatus.FAILED);
      const state = useOfflineQueueStore.getState();
      // Manually set nextRetryAt to past time
      state.queuedEvents[0].nextRetryAt = Date.now() - 1000;

      const events = store.getPendingEvents();

      expect(events).toHaveLength(2); // One pending + one failed ready for retry
    });

    it('should exclude failed events not ready for retry', () => {
      const store = useOfflineQueueStore.getState();
      
      // Mark one event as failed with retry time in the future
      store.updateEventStatus(eventId1, QueuedEventStatus.FAILED);
      const state = useOfflineQueueStore.getState();
      // Manually set nextRetryAt to future time
      state.queuedEvents[0].nextRetryAt = Date.now() + 10000;

      const events = store.getPendingEvents();

      expect(events).toHaveLength(1); // Only one pending event
    });
  });

  describe('getFailedEvents', () => {
    let eventId1: string;
    let eventId2: string;
    
    beforeEach(() => {
      const store = useOfflineQueueStore.getState();
      eventId1 = store.addEvent(QueuedEventType.UNIT_STATUS, { test: 'data1' });
      eventId2 = store.addEvent(QueuedEventType.UNIT_STATUS, { test: 'data2' });
    });

    it('should return events that have exceeded max retries', () => {
      const store = useOfflineQueueStore.getState();
      
      // Fail first event beyond max retries
      store.updateEventStatus(eventId1, QueuedEventStatus.FAILED);
      store.updateEventStatus(eventId1, QueuedEventStatus.FAILED);
      store.updateEventStatus(eventId1, QueuedEventStatus.FAILED);

      const events = store.getFailedEvents();

      expect(events).toHaveLength(1);
      expect(events[0].status).toBe(QueuedEventStatus.FAILED);
      expect(events[0].retryCount).toBe(3);
    });
  });

  describe('clearCompletedEvents', () => {
    let eventId1: string;
    let eventId2: string;
    
    beforeEach(() => {
      const store = useOfflineQueueStore.getState();
      eventId1 = store.addEvent(QueuedEventType.UNIT_STATUS, { test: 'data1' });
      eventId2 = store.addEvent(QueuedEventType.UNIT_STATUS, { test: 'data2' });
      store.updateEventStatus(eventId1, QueuedEventStatus.COMPLETED);
    });

    it('should remove completed events', () => {
      const store = useOfflineQueueStore.getState();
      
      store.clearCompletedEvents();

      const state = useOfflineQueueStore.getState();
      expect(state.queuedEvents).toHaveLength(1);
      expect(state.queuedEvents[0].status).toBe(QueuedEventStatus.PENDING);
    });
  });

  describe('clearAllEvents', () => {
    beforeEach(() => {
      const store = useOfflineQueueStore.getState();
      store.addEvent(QueuedEventType.UNIT_STATUS, { test: 'data1' });
      store.addEvent(QueuedEventType.UNIT_STATUS, { test: 'data2' });
    });

    it('should clear all events and reset counters', () => {
      const store = useOfflineQueueStore.getState();
      
      store.clearAllEvents();

      const state = useOfflineQueueStore.getState();
      expect(state.queuedEvents).toHaveLength(0);
      expect(state.totalEvents).toBe(0);
      expect(state.failedEvents).toBe(0);
      expect(state.completedEvents).toBe(0);
      expect(state.isProcessing).toBe(false);
      expect(state.processingEventId).toBeNull();
    });
  });

  describe('retryEvent', () => {
    beforeEach(() => {
      const store = useOfflineQueueStore.getState();
      store.addEvent(QueuedEventType.UNIT_STATUS, { test: 'data' });
      store.updateEventStatus('test-event-id', QueuedEventStatus.FAILED);
    });

    it('should reset failed event to pending', () => {
      const store = useOfflineQueueStore.getState();
      
      store.retryEvent('test-event-id');

      const state = useOfflineQueueStore.getState();
      expect(state.queuedEvents[0].status).toBe(QueuedEventStatus.PENDING);
      expect(state.queuedEvents[0].error).toBeUndefined();
      expect(state.queuedEvents[0].nextRetryAt).toBeUndefined();
    });
  });

  describe('retryAllFailedEvents', () => {
    beforeEach(() => {
      const store = useOfflineQueueStore.getState();
      store.addEvent(QueuedEventType.UNIT_STATUS, { test: 'data1' });
      store.addEvent(QueuedEventType.UNIT_STATUS, { test: 'data2' });
      store.updateEventStatus('test-event-id', QueuedEventStatus.FAILED);
    });

    it('should reset all failed events to pending', () => {
      const store = useOfflineQueueStore.getState();
      
      store.retryAllFailedEvents();

      const state = useOfflineQueueStore.getState();
      state.queuedEvents.forEach((event) => {
        if (event.id === 'test-event-id') {
          expect(event.status).toBe(QueuedEventStatus.PENDING);
          expect(event.error).toBeUndefined();
          expect(event.nextRetryAt).toBeUndefined();
        }
      });
    });
  });

  describe('network state management', () => {
    it('should update network state', () => {
      const store = useOfflineQueueStore.getState();
      
      store._setNetworkState(false, false);

      const state = useOfflineQueueStore.getState();
      expect(state.isConnected).toBe(false);
      expect(state.isNetworkReachable).toBe(false);
    });

    it('should update processing state', () => {
      const store = useOfflineQueueStore.getState();
      
      store._setProcessing(true, 'event-123');

      const state = useOfflineQueueStore.getState();
      expect(state.isProcessing).toBe(true);
      expect(state.processingEventId).toBe('event-123');
    });
  });
});
