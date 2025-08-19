import NetInfo from '@react-native-community/netinfo';
import * as TaskManager from 'expo-task-manager';
import { AppState } from 'react-native';

import { savePersonnelStatus } from '@/api/personnel/personnelStatuses';
import { SavePersonStatusInput } from '@/models/v4/personnelStatuses/savePersonStatusInput';
import { QueuedEventStatus, QueuedEventType } from '@/models/offline-queue/queued-event';
import { OfflineQueueProcessor } from '@/services/offline-queue-processor';
import { useOfflineQueueStore } from '@/stores/offline-queue/store';

// Mock dependencies
jest.mock('@react-native-community/netinfo');
jest.mock('expo-task-manager');
jest.mock('react-native', () => ({
  AppState: {
    addEventListener: jest.fn(),
    currentState: 'active',
  },
}));
jest.mock('@/api/personnel/personnelStatuses');
jest.mock('@/stores/offline-queue/store');
jest.mock('@/lib/logging', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
  },
}));

const mockNetInfo = NetInfo as jest.Mocked<typeof NetInfo>;
const mockTaskManager = TaskManager as jest.Mocked<typeof TaskManager>;
const mockSavePersonnelStatus = savePersonnelStatus as jest.MockedFunction<typeof savePersonnelStatus>;
const mockUseOfflineQueueStore = useOfflineQueueStore as jest.MockedFunction<typeof useOfflineQueueStore>;

describe('OfflineQueueProcessor', () => {
  let processor: OfflineQueueProcessor;
  let mockQueueStore: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock the queue store
    mockQueueStore = {
      getPendingEvents: jest.fn().mockReturnValue([]),
      updateEventStatus: jest.fn(),
      removeEvent: jest.fn(),
      addEvent: jest.fn().mockReturnValue('event-123'),
      _setProcessing: jest.fn(),
      queuedEvents: [],
    };
    
    mockUseOfflineQueueStore.mockImplementation((selector?: any) => {
      if (selector) {
        return selector(mockQueueStore);
      }
      return mockQueueStore;
    });
    (mockUseOfflineQueueStore as any).getState = jest.fn().mockReturnValue(mockQueueStore);

    // Mock network connectivity as available by default
    mockNetInfo.fetch.mockResolvedValue({
      isConnected: true,
      isInternetReachable: true,
    } as any);

    // Mock TaskManager
    mockTaskManager.isTaskRegisteredAsync.mockResolvedValue(false);
    mockTaskManager.defineTask.mockImplementation(() => {});
    mockTaskManager.unregisterTaskAsync.mockResolvedValue(undefined);

    processor = OfflineQueueProcessor.getInstance();
  });

  afterEach(() => {
    processor.cleanup();
  });

  describe('processQueue', () => {
    it('should skip processing when no pending events', async () => {
      mockQueueStore.getPendingEvents.mockReturnValue([]);

      await processor.processQueue();

      expect(mockQueueStore._setProcessing).not.toHaveBeenCalled();
    });

    it('should skip processing when no network connectivity', async () => {
      mockNetInfo.fetch.mockResolvedValue({
        isConnected: false,
        isInternetReachable: false,
      } as any);

      const pendingEvent = {
        id: 'event-1',
        type: QueuedEventType.PERSONNEL_STATUS,
        status: QueuedEventStatus.PENDING,
        data: {
          userId: 'user123',
          statusType: '1',
          timestamp: '2023-01-01T00:00:00Z',
          timestampUtc: 'Sun, 01 Jan 2023 00:00:00 GMT',
        },
        retryCount: 0,
        maxRetries: 3,
        createdAt: Date.now(),
      };

      mockQueueStore.getPendingEvents.mockReturnValue([pendingEvent]);

      await processor.processQueue();

      expect(mockQueueStore._setProcessing).not.toHaveBeenCalledWith(true, 'event-1');
    });

    it('should process personnel status events successfully', async () => {
      const pendingEvent = {
        id: 'event-1',
        type: QueuedEventType.PERSONNEL_STATUS,
        status: QueuedEventStatus.PENDING,
        data: {
          userId: 'user123',
          statusType: '1',
          note: 'Test note',
          respondingTo: '',
          timestamp: '2023-01-01T00:00:00Z',
          timestampUtc: 'Sun, 01 Jan 2023 00:00:00 GMT',
          latitude: '40.7128',
          longitude: '-74.0060',
          accuracy: '10',
          altitude: '100',
          altitudeAccuracy: '',
          speed: '0',
          heading: '90',
          eventId: '',
        },
        retryCount: 0,
        maxRetries: 3,
        createdAt: Date.now(),
      };

      mockQueueStore.getPendingEvents.mockReturnValue([pendingEvent]);
      mockSavePersonnelStatus.mockResolvedValue({} as any);

      await processor.processQueue();

      expect(mockQueueStore._setProcessing).toHaveBeenCalledWith(true);
      expect(mockQueueStore._setProcessing).toHaveBeenCalledWith(true, 'event-1');
      expect(mockQueueStore.updateEventStatus).toHaveBeenCalledWith('event-1', QueuedEventStatus.PROCESSING);
      expect(mockSavePersonnelStatus).toHaveBeenCalledWith(
        expect.objectContaining({
          UserId: 'user123',
          Type: '1',
          Note: 'Test note',
          Latitude: '40.7128',
          Longitude: '-74.0060',
        })
      );
      expect(mockQueueStore.updateEventStatus).toHaveBeenCalledWith('event-1', QueuedEventStatus.COMPLETED);
      expect(mockQueueStore._setProcessing).toHaveBeenCalledWith(false);
    });

    it('should handle failed personnel status events', async () => {
      const pendingEvent = {
        id: 'event-1',
        type: QueuedEventType.PERSONNEL_STATUS,
        status: QueuedEventStatus.PENDING,
        data: {
          userId: 'user123',
          statusType: '1',
          timestamp: '2023-01-01T00:00:00Z',
          timestampUtc: 'Sun, 01 Jan 2023 00:00:00 GMT',
        },
        retryCount: 0,
        maxRetries: 3,
        createdAt: Date.now(),
      };

      mockQueueStore.getPendingEvents.mockReturnValue([pendingEvent]);
      const error = new Error('Network error');
      mockSavePersonnelStatus.mockRejectedValue(error);

      await processor.processQueue();

      expect(mockQueueStore.updateEventStatus).toHaveBeenCalledWith('event-1', QueuedEventStatus.FAILED, 'Network error');
    });

    it('should skip processing if already in progress', async () => {
      const pendingEvent = {
        id: 'event-1',
        type: QueuedEventType.PERSONNEL_STATUS,
        status: QueuedEventStatus.PENDING,
        data: { userId: 'user123' },
        retryCount: 0,
        maxRetries: 3,
        createdAt: Date.now(),
      };

      mockQueueStore.getPendingEvents.mockReturnValue([pendingEvent]);
      
      // Make the first call hang
      mockSavePersonnelStatus.mockImplementation(() => new Promise(() => {}));

      // Start first processing (will hang)
      const firstProcess = processor.processQueue();
      
      // Try to start second processing
      await processor.processQueue();

      // The second call should return early
      expect(mockQueueStore._setProcessing).toHaveBeenCalledTimes(1);
    });
  });

  describe('addPersonnelStatusToQueue', () => {
    it('should add personnel status to queue and try immediate processing', async () => {
      const statusInput = new SavePersonStatusInput();
      statusInput.UserId = 'user123';
      statusInput.Type = '1';
      statusInput.Note = 'Test note';
      statusInput.Timestamp = '2023-01-01T00:00:00Z';
      statusInput.TimestampUtc = 'Sun, 01 Jan 2023 00:00:00 GMT';

      const eventId = processor.addPersonnelStatusToQueue(statusInput);

      expect(eventId).toBe('event-123');
      expect(mockQueueStore.addEvent).toHaveBeenCalledWith(
        QueuedEventType.PERSONNEL_STATUS,
        {
          userId: 'user123',
          statusType: '1',
          note: 'Test note',
          respondingTo: '',
          timestamp: '2023-01-01T00:00:00Z',
          timestampUtc: 'Sun, 01 Jan 2023 00:00:00 GMT',
          latitude: '',
          longitude: '',
          accuracy: '',
          altitude: '',
          altitudeAccuracy: '',
          speed: '',
          heading: '',
          eventId: '',
        },
        3
      );
      expect(mockNetInfo.fetch).toHaveBeenCalled();
    });
  });

  describe('app state handling', () => {
    it('should start processing when app becomes active', async () => {
      const spyStartProcessing = jest.spyOn(processor, 'startProcessing');
      
      // Get the app state change handler
      const addEventListenerCalls = (AppState.addEventListener as jest.Mock).mock.calls;
      const appStateChangeHandler = addEventListenerCalls[0][1];

      // Simulate app becoming active
      appStateChangeHandler('active');

      expect(spyStartProcessing).toHaveBeenCalled();
    });

    it('should start background processing when app goes to background', async () => {
      const spyStartBackgroundProcessing = jest.spyOn(processor, 'startBackgroundProcessing');
      
      // Get the app state change handler
      const addEventListenerCalls = (AppState.addEventListener as jest.Mock).mock.calls;
      const appStateChangeHandler = addEventListenerCalls[0][1];

      // Simulate app going to background
      appStateChangeHandler('background');

      expect(spyStartBackgroundProcessing).toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('should properly cleanup resources', () => {
      const mockRemove = jest.fn();
      const mockNetworkUnsubscribe = jest.fn();
      
      // Mock subscriptions
      (processor as any).appStateSubscription = { remove: mockRemove };
      (processor as any).networkUnsubscribe = mockNetworkUnsubscribe;

      processor.cleanup();

      expect(mockRemove).toHaveBeenCalled();
      expect(mockNetworkUnsubscribe).toHaveBeenCalled();
      expect(mockTaskManager.isTaskRegisteredAsync).toHaveBeenCalled();
    });
  });
});
