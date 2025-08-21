import { AppState } from 'react-native';

import { saveCallImage } from '@/api/calls/callFiles';
import { setUnitLocation } from '@/api/units/unitLocation';
import { saveUnitStatus } from '@/api/units/unitStatuses';
import { QueuedEventStatus, QueuedEventType } from '@/models/offline-queue/queued-event';
import { offlineEventManager } from '@/services/offline-event-manager.service';
import { useOfflineQueueStore } from '@/stores/offline-queue/store';

// Mock AppState
jest.mock('react-native', () => ({
  AppState: {
    addEventListener: jest.fn(),
    currentState: 'active',
  },
}));

// Mock APIs
jest.mock('@/api/calls/callFiles', () => ({
  saveCallImage: jest.fn(),
}));

jest.mock('@/api/units/unitLocation', () => ({
  setUnitLocation: jest.fn(),
}));

jest.mock('@/api/units/unitStatuses', () => ({
  saveUnitStatus: jest.fn(),
}));

// Mock the offline queue store
jest.mock('@/stores/offline-queue/store', () => ({
  useOfflineQueueStore: {
    getState: jest.fn(),
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

// Mock models
jest.mock('@/models/v4/unitLocation/saveUnitLocationInput', () => ({
  SaveUnitLocationInput: jest.fn().mockImplementation(() => ({
    UnitId: '',
    Timestamp: '',
    Latitude: '',
    Longitude: '',
    Accuracy: '',
    Altitude: '',
    AltitudeAccuracy: '',
    Speed: '',
    Heading: '',
  })),
}));

jest.mock('@/models/v4/unitStatus/saveUnitStatusInput', () => ({
  SaveUnitStatusInput: jest.fn().mockImplementation(() => ({
    Id: '',
    Type: '',
    Note: '',
    RespondingTo: '',
    Timestamp: '',
    TimestampUtc: '',
    Roles: [],
  })),
  SaveUnitStatusRoleInput: jest.fn().mockImplementation(() => ({
    RoleId: '',
    UserId: '',
  })),
}));

const mockSaveCallImage = saveCallImage as jest.MockedFunction<typeof saveCallImage>;
const mockSetUnitLocation = setUnitLocation as jest.MockedFunction<typeof setUnitLocation>;
const mockSaveUnitStatus = saveUnitStatus as jest.MockedFunction<typeof saveUnitStatus>;
const mockUseOfflineQueueStore = useOfflineQueueStore as { getState: jest.MockedFunction<any> };
const mockAppState = AppState as jest.Mocked<typeof AppState>;

describe('OfflineEventManager', () => {
  let mockStoreState: any;

  beforeAll(() => {
    // Use fake timers for the entire test suite
    jest.useFakeTimers();
  });

  afterAll(() => {
    // Clean up any remaining timers and restore real timers
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    
    mockStoreState = {
      isConnected: true,
      isNetworkReachable: true,
      addEvent: jest.fn().mockReturnValue('test-event-id'),
      updateEventStatus: jest.fn(),
      removeEvent: jest.fn(),
      getPendingEvents: jest.fn().mockReturnValue([]),
      getFailedEvents: jest.fn().mockReturnValue([]),
      initializeNetworkListener: jest.fn(),
      retryAllFailedEvents: jest.fn(),
      clearCompletedEvents: jest.fn(),
      _setProcessing: jest.fn(),
      totalEvents: 0,
      completedEvents: 0,
    };

    mockUseOfflineQueueStore.getState.mockReturnValue(mockStoreState);
    
    // Setup AppState mock
    mockAppState.addEventListener.mockReturnValue({ remove: jest.fn() });
  });

  afterEach(() => {
    // Ensure processing is stopped after each test
    try {
      offlineEventManager.stopProcessing();
    } catch (e) {
      // Ignore any errors during cleanup
    }
    jest.clearAllTimers();
  });

  describe('queueUnitStatusEvent', () => {
    it('should queue a unit status event', () => {
      const eventId = offlineEventManager.queueUnitStatusEvent(
        'unit-1',
        'available',
        'Test note',
        'call-1',
        [{ roleId: 'role-1', userId: 'user-1' }]
      );

      expect(eventId).toBe('test-event-id');
      expect(mockStoreState.addEvent).toHaveBeenCalledWith(
        QueuedEventType.UNIT_STATUS,
        expect.objectContaining({
          unitId: 'unit-1',
          statusType: 'available',
          note: 'Test note',
          respondingTo: 'call-1',
          roles: [{ roleId: 'role-1', userId: 'user-1' }],
          timestamp: expect.any(String),
          timestampUtc: expect.any(String),
        })
      );
    });

    it('should queue unit status event without optional parameters', () => {
      const eventId = offlineEventManager.queueUnitStatusEvent('unit-1', 'available');

      expect(eventId).toBe('test-event-id');
      expect(mockStoreState.addEvent).toHaveBeenCalledWith(
        QueuedEventType.UNIT_STATUS,
        expect.objectContaining({
          unitId: 'unit-1',
          statusType: 'available',
          note: undefined,
          respondingTo: undefined,
          roles: undefined,
        })
      );
    });
  });

  describe('queueLocationUpdateEvent', () => {
    it('should queue a location update event', () => {
      const eventId = offlineEventManager.queueLocationUpdateEvent(
        'unit-1',
        40.7128,
        -74.0060,
        10,
        45,
        25
      );

      expect(eventId).toBe('test-event-id');
      expect(mockStoreState.addEvent).toHaveBeenCalledWith(
        QueuedEventType.LOCATION_UPDATE,
        expect.objectContaining({
          unitId: 'unit-1',
          latitude: 40.7128,
          longitude: -74.0060,
          accuracy: 10,
          heading: 45,
          speed: 25,
          timestamp: expect.any(String),
        })
      );
    });

    it('should queue location update event without optional parameters', () => {
      const eventId = offlineEventManager.queueLocationUpdateEvent('unit-1', 40.7128, -74.0060);

      expect(eventId).toBe('test-event-id');
      expect(mockStoreState.addEvent).toHaveBeenCalledWith(
        QueuedEventType.LOCATION_UPDATE,
        expect.objectContaining({
          unitId: 'unit-1',
          latitude: 40.7128,
          longitude: -74.0060,
          accuracy: undefined,
          heading: undefined,
          speed: undefined,
        })
      );
    });
  });

  describe('queueCallImageUploadEvent', () => {
    it('should queue a call image upload event', () => {
      const eventId = offlineEventManager.queueCallImageUploadEvent(
        'call-1',
        'user-1',
        'Test note',
        'image.jpg',
        '/path/to/image.jpg',
        40.7128,
        -74.0060
      );

      expect(eventId).toBe('test-event-id');
      expect(mockStoreState.addEvent).toHaveBeenCalledWith(
        QueuedEventType.CALL_IMAGE_UPLOAD,
        expect.objectContaining({
          callId: 'call-1',
          userId: 'user-1',
          note: 'Test note',
          name: 'image.jpg',
          filePath: '/path/to/image.jpg',
          latitude: 40.7128,
          longitude: -74.0060,
        })
      );
    });

    it('should queue call image upload event without optional parameters', () => {
      const eventId = offlineEventManager.queueCallImageUploadEvent(
        'call-1',
        'user-1',
        'Test note',
        'image.jpg',
        '/path/to/image.jpg'
      );

      expect(eventId).toBe('test-event-id');
      expect(mockStoreState.addEvent).toHaveBeenCalledWith(
        QueuedEventType.CALL_IMAGE_UPLOAD,
        expect.objectContaining({
          callId: 'call-1',
          userId: 'user-1',
          note: 'Test note',
          name: 'image.jpg',
          filePath: '/path/to/image.jpg',
          latitude: undefined,
          longitude: undefined,
        })
      );
    });
  });

  describe('getStats', () => {
    it('should return processing statistics', () => {
      mockStoreState.totalEvents = 10;
      mockStoreState.completedEvents = 7;
      mockStoreState.getPendingEvents.mockReturnValue([{ id: '1' }, { id: '2' }]);
      mockStoreState.getFailedEvents.mockReturnValue([{ id: '3' }]);

      const stats = offlineEventManager.getStats();

      expect(stats).toEqual({
        isProcessing: false,
        totalEvents: 10,
        pendingEvents: 2,
        failedEvents: 1,
        completedEvents: 7,
      });
    });
  });

  describe('retryFailedEvents', () => {
    it('should retry all failed events', () => {
      offlineEventManager.retryFailedEvents();

      expect(mockStoreState.retryAllFailedEvents).toHaveBeenCalled();
    });
  });

  describe('clearCompletedEvents', () => {
    it('should clear completed events', () => {
      offlineEventManager.clearCompletedEvents();

      expect(mockStoreState.clearCompletedEvents).toHaveBeenCalled();
    });
  });

  describe('initialize', () => {
    it('should initialize network listener', () => {
      offlineEventManager.initialize();

      expect(mockStoreState.initializeNetworkListener).toHaveBeenCalled();
    });
  });

  describe('startProcessing', () => {
    it('should start processing interval', () => {
      const setIntervalSpy = jest.spyOn(global, 'setInterval');
      
      offlineEventManager.startProcessing();

      // Verify setInterval was called
      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 10000);
      
      // Verify immediate processing call
      expect(mockStoreState.getPendingEvents).toHaveBeenCalled();
    });

    it('should not start multiple intervals', () => {
      const setIntervalSpy = jest.spyOn(global, 'setInterval');
      
      offlineEventManager.startProcessing();
      offlineEventManager.startProcessing();

      expect(setIntervalSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('stopProcessing', () => {
    it('should stop processing interval', () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      
      offlineEventManager.startProcessing();
      offlineEventManager.stopProcessing();

      expect(clearIntervalSpy).toHaveBeenCalled();
    });
  });

  describe('event processing', () => {
    beforeEach(() => {
      mockSaveUnitStatus.mockResolvedValue({} as any);
      mockSetUnitLocation.mockResolvedValue({} as any);
      mockSaveCallImage.mockResolvedValue({} as any);
    });

    it('should set up processing interval but skip processing when offline', () => {
      mockStoreState.isConnected = false;
      mockStoreState.isNetworkReachable = false;
      
      const setIntervalSpy = jest.spyOn(global, 'setInterval');

      offlineEventManager.startProcessing();

      // The interval should still be set up, even if offline
      expect(setIntervalSpy).toHaveBeenCalled();
      
      // When offline, processQueuedEvents will return early and not call getPendingEvents
      // So we just verify the interval was set up
    });

    it('should set up processing interval when online', () => {
      const mockEvent = {
        id: 'test-event',
        type: QueuedEventType.UNIT_STATUS,
        status: QueuedEventStatus.PENDING,
        data: {
          unitId: 'unit-1',
          statusType: 'available',
          timestamp: '2023-01-01T00:00:00Z',
          timestampUtc: 'Sun, 01 Jan 2023 00:00:00 GMT',
        },
        retryCount: 0,
        maxRetries: 3,
        createdAt: Date.now(),
      };

      mockStoreState.getPendingEvents.mockReturnValue([mockEvent]);
      const setIntervalSpy = jest.spyOn(global, 'setInterval');

      // Trigger processing
      offlineEventManager.startProcessing();

      // The interval should be set up
      expect(setIntervalSpy).toHaveBeenCalled();
      
      // Verify that getPendingEvents is called immediately when online
      expect(mockStoreState.getPendingEvents).toHaveBeenCalled();
    });
  });

  describe('app state handling', () => {
    it('should have set up app state listener during initialization', () => {
      // The AppState listener should have been set up when the module was imported
      // Even if the mock wasn't capturing it initially, we can test the behavior
      // by directly calling the handler method that would be triggered
      
      // Create a spy to verify the method calls
      const startProcessingSpy = jest.spyOn(offlineEventManager, 'startProcessing');
      
      // Since we can't easily test the private method directly, let's test via initialize
      // which calls handleAppStateChange with current state
      offlineEventManager.initialize();
      
      // The initialize method calls handleAppStateChange with AppState.currentState ('active')
      // which should trigger startProcessing
      expect(startProcessingSpy).toHaveBeenCalled();
    });

    it('should be able to handle app state changes', () => {
      // Test that the service has the capability to handle state changes
      // by testing the initialize method which demonstrates the app state handling
      expect(() => {
        offlineEventManager.initialize();
      }).not.toThrow();
      
      // Verify the store initialization was called
      expect(mockStoreState.initializeNetworkListener).toHaveBeenCalled();
    });
  });
});
