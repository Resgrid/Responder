import { QueuedEventStatus, QueuedEventType, type QueuedPersonnelStatusEvent } from '@/models/offline-queue/queued-event';

// Mock Platform.OS for testing
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
  },
}));

// Mock logger
jest.mock('@/lib/logging', () => ({
  logger: {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock secure storage to avoid expo dependencies in tests
jest.mock('../secure-storage', () => ({
  getGeneralStorage: jest.fn(),
  getOfflineQueueStorage: jest.fn(),
  rotateEncryptionKeys: jest.fn(),
  clearSecureKeys: jest.fn(),
}));

// Import the functions to test after mocking
const { auditPIIExposure, containsPII, sanitizeEventForLogging, shouldDisableOfflineQueueForWeb } = require('../pii-protection');
const { Platform } = require('react-native');

describe('PII Protection', () => {
  const mockPersonnelStatusEvent: QueuedPersonnelStatusEvent = {
    id: 'test-event-1',
    type: QueuedEventType.PERSONNEL_STATUS,
    status: QueuedEventStatus.PENDING,
    data: {
      userId: 'user-123',
      statusType: 'Available',
      note: 'Ready for duty',
      respondingTo: '',
      timestamp: '2025-01-01T00:00:00Z',
      timestampUtc: '2025-01-01T00:00:00Z',
      latitude: '40.7128',
      longitude: '-74.0060',
      accuracy: '5',
      altitude: '10',
      altitudeAccuracy: '3',
      speed: '0',
      heading: '0',
    },
    retryCount: 0,
    maxRetries: 3,
    createdAt: Date.now(),
  };

  const mockEventWithoutPII = {
    id: 'test-event-2',
    type: QueuedEventType.PERSONNEL_STATUS,
    status: QueuedEventStatus.PENDING,
    data: {
      statusType: 'Available',
      timestamp: '2025-01-01T00:00:00Z',
      timestampUtc: '2025-01-01T00:00:00Z',
    },
    retryCount: 0,
    maxRetries: 3,
    createdAt: Date.now(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('containsPII', () => {
    it('should detect PII in events with sensitive data', () => {
      expect(containsPII(mockPersonnelStatusEvent)).toBe(true);
    });

    it('should not detect PII in events without sensitive data', () => {
      expect(containsPII(mockEventWithoutPII as any)).toBe(false);
    });

    it('should handle empty or null data fields', () => {
      const eventWithEmptyPII = {
        ...mockPersonnelStatusEvent,
        data: {
          ...mockPersonnelStatusEvent.data,
          userId: '',
          note: null,
          latitude: undefined,
        },
      };

      expect(containsPII(eventWithEmptyPII as any)).toBe(true); // longitude is still present
    });
  });

  describe('sanitizeEventForLogging', () => {
    it('should sanitize PII fields from events', () => {
      const sanitized = sanitizeEventForLogging(mockPersonnelStatusEvent);

      expect(sanitized.data).toBeDefined();
      expect(sanitized.data!.userId).toBeUndefined();
      expect(sanitized.data!.note).toBe('[REDACTED]');
      expect(sanitized.data!.latitude).toBe(40.71); // Rounded
      expect(sanitized.data!.longitude).toBe(-74.01); // Rounded
      expect(sanitized.data!.statusType).toBe('Available'); // Non-PII preserved
    });

    it('should handle events without PII', () => {
      const sanitized = sanitizeEventForLogging(mockEventWithoutPII as any);

      expect(sanitized.data).toBeDefined();
      expect(sanitized.data!.statusType).toBe('Available');
      expect(sanitized.data!.timestamp).toBe('2025-01-01T00:00:00Z');
    });

    it('should handle invalid coordinate values', () => {
      const eventWithInvalidCoords = {
        ...mockPersonnelStatusEvent,
        data: {
          ...mockPersonnelStatusEvent.data,
          latitude: 'invalid',
          longitude: 'also-invalid',
        },
      };

      const sanitized = sanitizeEventForLogging(eventWithInvalidCoords as any);
      expect(sanitized.data!.latitude).toBe('invalid'); // Kept as-is if not a number
      expect(sanitized.data!.longitude).toBe('also-invalid');
    });
  });

  describe('shouldDisableOfflineQueueForWeb', () => {
    it('should return false for non-web platforms', () => {
      expect(shouldDisableOfflineQueueForWeb()).toBe(false);
    });

    it('should return true for web without proper encryption support', () => {
      // Mock Platform.OS as web
      (Platform as any).OS = 'web';

      // Mock missing localStorage
      Object.defineProperty(global, 'localStorage', {
        value: undefined,
        writable: true,
      });

      expect(shouldDisableOfflineQueueForWeb()).toBe(true);
    });

    it('should return false for web with proper encryption support', () => {
      (Platform as any).OS = 'web';

      // Mock localStorage
      Object.defineProperty(global, 'localStorage', {
        value: {
          getItem: jest.fn(),
          setItem: jest.fn(),
          removeItem: jest.fn(),
        },
        writable: true,
      });

      // Mock crypto support
      Object.defineProperty(global, 'window', {
        value: {
          crypto: {
            getRandomValues: jest.fn(),
          },
        },
        writable: true,
      });

      expect(shouldDisableOfflineQueueForWeb()).toBe(false);
    });
  });

  describe('auditPIIExposure', () => {
    it('should provide correct audit results for mixed events', () => {
      const events = [
        mockPersonnelStatusEvent,
        mockEventWithoutPII as any,
        mockPersonnelStatusEvent,
      ];

      const audit = auditPIIExposure(events);

      expect(audit.totalEvents).toBe(3);
      expect(audit.eventsWithPII).toBe(2);
      expect(audit.riskLevel).toBe('high'); // 66.7% > 50%
      expect(audit.recommendations).toContain('Consider implementing field-level encryption for PII data');
    });

    it('should classify risk levels correctly', () => {
      // Low risk (no PII)
      const lowRiskEvents = [mockEventWithoutPII, mockEventWithoutPII] as any[];
      const lowRiskAudit = auditPIIExposure(lowRiskEvents);
      expect(lowRiskAudit.riskLevel).toBe('low');

      // Medium risk (30% PII)
      const mediumRiskEvents = [
        mockPersonnelStatusEvent,
        mockEventWithoutPII,
        mockEventWithoutPII,
        mockEventWithoutPII,
      ] as any[];
      const mediumRiskAudit = auditPIIExposure(mediumRiskEvents);
      expect(mediumRiskAudit.riskLevel).toBe('medium');

      // High risk (100% PII)
      const highRiskEvents = [mockPersonnelStatusEvent, mockPersonnelStatusEvent];
      const highRiskAudit = auditPIIExposure(highRiskEvents);
      expect(highRiskAudit.riskLevel).toBe('high');
    });

    it('should handle empty events array', () => {
      const audit = auditPIIExposure([]);

      expect(audit.totalEvents).toBe(0);
      expect(audit.eventsWithPII).toBe(0);
      expect(audit.riskLevel).toBe('low');
    });

    it('should provide web-specific recommendations when on web platform', () => {
      (Platform as any).OS = 'web';
      const events = [mockPersonnelStatusEvent];
      const audit = auditPIIExposure(events);

      expect(audit.recommendations).toContain('Review web storage encryption implementation');
    });
  });
});
