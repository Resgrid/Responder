/**
 * GPS Integration Tests for Offline Event Manager
 * Tests GPS coordinate processing in offline queued events
 */

import { SaveUnitStatusInput, SaveUnitStatusRoleInput } from '@/models/v4/unitStatus/saveUnitStatusInput';
import { QueuedEventStatus, QueuedEventType, type QueuedUnitStatusEvent } from '@/models/offline-queue/queued-event';
import { offlineEventManager } from '@/services/offline-event-manager.service';
import { useOfflineQueueStore } from '@/stores/offline-queue/store';

// Mock the dependencies
jest.mock('@/api/units/unitStatuses', () => ({
  saveUnitStatus: jest.fn(),
}));

jest.mock('@/stores/offline-queue/store', () => ({
  useOfflineQueueStore: {
    getState: jest.fn(),
  },
}));

jest.mock('@/lib/logging', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

const mockSaveUnitStatus = require('@/api/units/unitStatuses').saveUnitStatus as jest.MockedFunction<any>;
const mockUseOfflineQueueStore = useOfflineQueueStore as { getState: jest.MockedFunction<any> };

describe('Offline Event Manager GPS Integration', () => {
  let mockStoreState: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockStoreState = {
      addEvent: jest.fn().mockReturnValue('test-event-id'),
      updateEventStatus: jest.fn(),
      removeEvent: jest.fn(),
      getPendingEvents: jest.fn().mockReturnValue([]),
      _setProcessing: jest.fn(),
      isConnected: true,
      isNetworkReachable: true,
    };

    mockUseOfflineQueueStore.getState.mockReturnValue(mockStoreState);
    mockSaveUnitStatus.mockResolvedValue({});
  });

  describe('queueUnitStatusEvent with GPS', () => {
    it('should queue unit status event with complete GPS data', () => {
      const gpsData = {
        latitude: '40.7128',
        longitude: '-74.0060',
        accuracy: '10',
        altitude: '50',
        altitudeAccuracy: '5',
        speed: '25',
        heading: '180',
      };

      const eventId = offlineEventManager.queueUnitStatusEvent(
        'unit-1',
        'available',
        'GPS enabled status',
        'call-123',
        [{ roleId: 'role-1', userId: 'user-1' }],
        gpsData
      );

      expect(eventId).toBe('test-event-id');
      expect(mockStoreState.addEvent).toHaveBeenCalledWith(
        QueuedEventType.UNIT_STATUS,
        expect.objectContaining({
          unitId: 'unit-1',
          statusType: 'available',
          note: 'GPS enabled status',
          respondingTo: 'call-123',
          roles: [{ roleId: 'role-1', userId: 'user-1' }],
          latitude: '40.7128',
          longitude: '-74.0060',
          accuracy: '10',
          altitude: '50',
          altitudeAccuracy: '5',
          speed: '25',
          heading: '180',
          timestamp: expect.any(String),
          timestampUtc: expect.any(String),
        })
      );
    });

    it('should queue unit status event with partial GPS data', () => {
      const gpsData = {
        latitude: '51.5074',
        longitude: '-0.1278',
        accuracy: '8',
        // Other GPS fields undefined
      };

      const eventId = offlineEventManager.queueUnitStatusEvent(
        'unit-2',
        'en-route',
        'Partial GPS',
        undefined,
        undefined,
        gpsData
      );

      expect(eventId).toBe('test-event-id');
      expect(mockStoreState.addEvent).toHaveBeenCalledWith(
        QueuedEventType.UNIT_STATUS,
        expect.objectContaining({
          unitId: 'unit-2',
          statusType: 'en-route',
          note: 'Partial GPS',
          respondingTo: undefined,
          roles: undefined,
          latitude: '51.5074',
          longitude: '-0.1278',
          accuracy: '8',
          altitude: undefined,
          altitudeAccuracy: undefined,
          speed: undefined,
          heading: undefined,
          timestamp: expect.any(String),
          timestampUtc: expect.any(String),
        })
      );
    });

    it('should queue unit status event without GPS data', () => {
      const eventId = offlineEventManager.queueUnitStatusEvent(
        'unit-3',
        'on-scene'
      );

      expect(eventId).toBe('test-event-id');
      expect(mockStoreState.addEvent).toHaveBeenCalledWith(
        QueuedEventType.UNIT_STATUS,
        expect.objectContaining({
          unitId: 'unit-3',
          statusType: 'on-scene',
          note: undefined,
          respondingTo: undefined,
          roles: undefined,
          latitude: undefined,
          longitude: undefined,
          accuracy: undefined,
          altitude: undefined,
          altitudeAccuracy: undefined,
          speed: undefined,
          heading: undefined,
          timestamp: expect.any(String),
          timestampUtc: expect.any(String),
        })
      );
    });

    it('should handle edge case GPS values', () => {
      const gpsData = {
        latitude: '0',
        longitude: '0',
        accuracy: '0',
        altitude: '-100', // Below sea level
        speed: '0',
        heading: '360', // Full circle
      };

      offlineEventManager.queueUnitStatusEvent(
        'unit-4',
        'available',
        'Edge case GPS',
        undefined,
        undefined,
        gpsData
      );

      expect(mockStoreState.addEvent).toHaveBeenCalledWith(
        QueuedEventType.UNIT_STATUS,
        expect.objectContaining({
          latitude: '0',
          longitude: '0',
          accuracy: '0',
          altitude: '-100',
          speed: '0',
          heading: '360',
        })
      );
    });
  });

  describe('processUnitStatusEvent with GPS', () => {
    let processUnitStatusEventMethod: any;

    beforeEach(() => {
      // Access private method for testing
      processUnitStatusEventMethod = (offlineEventManager as any).processUnitStatusEvent.bind(offlineEventManager);
    });

    it('should process event with complete GPS coordinates', async () => {
      const mockEvent: QueuedUnitStatusEvent = {
        id: 'event-1',
        type: QueuedEventType.UNIT_STATUS,
        status: QueuedEventStatus.PENDING,
        data: {
          unitId: 'unit-1',
          statusType: 'available',
          note: 'Test note',
          respondingTo: 'call-123',
          timestamp: '2023-01-01T00:00:00Z',
          timestampUtc: 'Sun, 01 Jan 2023 00:00:00 GMT',
          roles: [{ roleId: 'role-1', userId: 'user-1' }],
          latitude: '40.7128',
          longitude: '-74.0060',
          accuracy: '10',
          altitude: '50',
          altitudeAccuracy: '5',
          speed: '25',
          heading: '180',
        },
        retryCount: 0,
        maxRetries: 3,
        createdAt: Date.now(),
      };

      await processUnitStatusEventMethod(mockEvent);

      expect(mockSaveUnitStatus).toHaveBeenCalledWith(
        expect.objectContaining({
          Id: 'unit-1',
          Type: 'available',
          Note: 'Test note',
          RespondingTo: 'call-123',
          Timestamp: '2023-01-01T00:00:00Z',
          TimestampUtc: 'Sun, 01 Jan 2023 00:00:00 GMT',
          Latitude: '40.7128',
          Longitude: '-74.0060',
          Accuracy: '10',
          Altitude: '50',
          AltitudeAccuracy: '5',
          Speed: '25',
          Heading: '180',
          Roles: expect.arrayContaining([
            expect.objectContaining({
              RoleId: 'role-1',
              UserId: 'user-1',
            }),
          ]),
        })
      );
    });

    it('should process event with partial GPS coordinates', async () => {
      const mockEvent: QueuedUnitStatusEvent = {
        id: 'event-2',
        type: QueuedEventType.UNIT_STATUS,
        status: QueuedEventStatus.PENDING,
        data: {
          unitId: 'unit-2',
          statusType: 'en-route',
          timestamp: '2023-01-01T00:00:00Z',
          timestampUtc: 'Sun, 01 Jan 2023 00:00:00 GMT',
          latitude: '51.5074',
          longitude: '-0.1278',
          // Other GPS fields missing
        },
        retryCount: 0,
        maxRetries: 3,
        createdAt: Date.now(),
      };

      await processUnitStatusEventMethod(mockEvent);

      expect(mockSaveUnitStatus).toHaveBeenCalledWith(
        expect.objectContaining({
          Id: 'unit-2',
          Type: 'en-route',
          Latitude: '51.5074',
          Longitude: '-0.1278',
          Accuracy: '0',
          Altitude: '0',
          AltitudeAccuracy: '0',
          Speed: '0',
          Heading: '0',
        })
      );
    });

    it('should process event without GPS coordinates', async () => {
      const mockEvent: QueuedUnitStatusEvent = {
        id: 'event-3',
        type: QueuedEventType.UNIT_STATUS,
        status: QueuedEventStatus.PENDING,
        data: {
          unitId: 'unit-3',
          statusType: 'on-scene',
          timestamp: '2023-01-01T00:00:00Z',
          timestampUtc: 'Sun, 01 Jan 2023 00:00:00 GMT',
          // No GPS data
        },
        retryCount: 0,
        maxRetries: 3,
        createdAt: Date.now(),
      };

      await processUnitStatusEventMethod(mockEvent);

      expect(mockSaveUnitStatus).toHaveBeenCalledWith(
        expect.objectContaining({
          Id: 'unit-3',
          Type: 'on-scene',
          Latitude: '',
          Longitude: '',
          Accuracy: '',
          Altitude: '',
          AltitudeAccuracy: '',
          Speed: '',
          Heading: '',
        })
      );
    });

    it('should handle RespondingTo default value correctly', async () => {
      const mockEvent: QueuedUnitStatusEvent = {
        id: 'event-4',
        type: QueuedEventType.UNIT_STATUS,
        status: QueuedEventStatus.PENDING,
        data: {
          unitId: 'unit-4',
          statusType: 'available',
          timestamp: '2023-01-01T00:00:00Z',
          timestampUtc: 'Sun, 01 Jan 2023 00:00:00 GMT',
          // No respondingTo specified
        },
        retryCount: 0,
        maxRetries: 3,
        createdAt: Date.now(),
      };

      await processUnitStatusEventMethod(mockEvent);

      expect(mockSaveUnitStatus).toHaveBeenCalledWith(
        expect.objectContaining({
          RespondingTo: '0', // Should default to '0'
        })
      );
    });

    it('should process event with high precision GPS values', async () => {
      const mockEvent: QueuedUnitStatusEvent = {
        id: 'event-5',
        type: QueuedEventType.UNIT_STATUS,
        status: QueuedEventStatus.PENDING,
        data: {
          unitId: 'unit-5',
          statusType: 'available',
          timestamp: '2023-01-01T00:00:00Z',
          timestampUtc: 'Sun, 01 Jan 2023 00:00:00 GMT',
          latitude: '40.712821456',
          longitude: '-74.006015789',
          accuracy: '3.5',
          altitude: '10.25',
          speed: '15.7',
          heading: '245.8',
        },
        retryCount: 0,
        maxRetries: 3,
        createdAt: Date.now(),
      };

      await processUnitStatusEventMethod(mockEvent);

      expect(mockSaveUnitStatus).toHaveBeenCalledWith(
        expect.objectContaining({
          Latitude: '40.712821456',
          Longitude: '-74.006015789',
          Accuracy: '3.5',
          Altitude: '10.25',
          Speed: '15.7',
          Heading: '245.8',
        })
      );
    });

    it('should process event with zero and negative GPS values', async () => {
      const mockEvent: QueuedUnitStatusEvent = {
        id: 'event-6',
        type: QueuedEventType.UNIT_STATUS,
        status: QueuedEventStatus.PENDING,
        data: {
          unitId: 'unit-6',
          statusType: 'available',
          timestamp: '2023-01-01T00:00:00Z',
          timestampUtc: 'Sun, 01 Jan 2023 00:00:00 GMT',
          latitude: '0',
          longitude: '0',
          accuracy: '0',
          altitude: '-50',
          speed: '0',
          heading: '0',
        },
        retryCount: 0,
        maxRetries: 3,
        createdAt: Date.now(),
      };

      await processUnitStatusEventMethod(mockEvent);

      expect(mockSaveUnitStatus).toHaveBeenCalledWith(
        expect.objectContaining({
          Latitude: '0',
          Longitude: '0',
          Accuracy: '0',
          Altitude: '-50',
          Speed: '0',
          Heading: '0',
        })
      );
    });

    it('should handle missing latitude but present longitude', async () => {
      const mockEvent: QueuedUnitStatusEvent = {
        id: 'event-7',
        type: QueuedEventType.UNIT_STATUS,
        status: QueuedEventStatus.PENDING,
        data: {
          unitId: 'unit-7',
          statusType: 'available',
          timestamp: '2023-01-01T00:00:00Z',
          timestampUtc: 'Sun, 01 Jan 2023 00:00:00 GMT',
          longitude: '-74.0060', // Only longitude present
          accuracy: '10',
        },
        retryCount: 0,
        maxRetries: 3,
        createdAt: Date.now(),
      };

      await processUnitStatusEventMethod(mockEvent);

      // Should not include GPS data if latitude is missing
      expect(mockSaveUnitStatus).toHaveBeenCalledWith(
        expect.objectContaining({
          Latitude: '',
          Longitude: '',
          Accuracy: '',
          Altitude: '',
          Speed: '',
          Heading: '',
        })
      );
    });
  });

  describe('GPS Data Flow Integration', () => {
    it('should maintain GPS data integrity through queue and processing', async () => {
      // Queue an event with GPS data
      const gpsData = {
        latitude: '35.6762',
        longitude: '139.6503',
        accuracy: '12',
        altitude: '35',
        speed: '20',
        heading: '270',
      };

      const eventId = offlineEventManager.queueUnitStatusEvent(
        'unit-tokyo',
        'responding',
        'Tokyo location',
        'emergency-call',
        [{ roleId: 'medic', userId: 'user-medic' }],
        gpsData
      );

      // Verify the event was queued with GPS data
      const queueCall = mockStoreState.addEvent.mock.calls[0];
      expect(queueCall[1]).toMatchObject({
        unitId: 'unit-tokyo',
        statusType: 'responding',
        note: 'Tokyo location',
        respondingTo: 'emergency-call',
        roles: [{ roleId: 'medic', userId: 'user-medic' }],
        latitude: '35.6762',
        longitude: '139.6503',
        accuracy: '12',
        altitude: '35',
        speed: '20',
        heading: '270',
      });

      // Simulate processing the queued event
      const processUnitStatusEventMethod = (offlineEventManager as any).processUnitStatusEvent.bind(offlineEventManager);
      
      const mockEvent: QueuedUnitStatusEvent = {
        id: eventId,
        type: QueuedEventType.UNIT_STATUS,
        status: QueuedEventStatus.PENDING,
        data: queueCall[1], // Use the data that was queued
        retryCount: 0,
        maxRetries: 3,
        createdAt: Date.now(),
      };

      await processUnitStatusEventMethod(mockEvent);

      // Verify GPS data was correctly processed and sent to API
      expect(mockSaveUnitStatus).toHaveBeenCalledWith(
        expect.objectContaining({
          Id: 'unit-tokyo',
          Type: 'responding',
          Note: 'Tokyo location',
          RespondingTo: 'emergency-call',
          Latitude: '35.6762',
          Longitude: '139.6503',
          Accuracy: '12',
          Altitude: '35',
          Speed: '20',
          Heading: '270',
          Roles: expect.arrayContaining([
            expect.objectContaining({
              RoleId: 'medic',
              UserId: 'user-medic',
            }),
          ]),
        })
      );
    });
  });
});
