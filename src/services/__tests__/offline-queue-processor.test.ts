// Test suite for OfflineQueueProcessor

// Mock NetInfo to prevent native dependencies
jest.mock('@react-native-community/netinfo', () => ({ addEventListener: jest.fn() }));

// Mock secure storage to stub storage operations
jest.mock('@/lib/storage/secure-storage', () => ({
  getOfflineQueueStorage: jest.fn().mockResolvedValue({
    getString: jest.fn().mockReturnValue('[]'),
    set: jest.fn().mockResolvedValue(undefined),
  }),
}));

// Mock personnel status API to prevent network calls
jest.mock('@/api/personnel/personnelStatuses', () => ({
  savePersonnelStatus: jest.fn().mockResolvedValue(undefined),
}));

// Require modules after mocks are set up
const { offlineQueueProcessor, OfflineQueueProcessor } = require('@/services/offline-queue-processor');
const { SavePersonStatusInput } = require('@/models/v4/personnelStatuses/savePersonStatusInput');

describe('offlineQueueProcessor', () => {
  it('should be an instance of OfflineQueueProcessor', () => {
    expect(offlineQueueProcessor).toBeInstanceOf(OfflineQueueProcessor);
  });

  it('should return empty string for addPersonnelStatusToQueue', () => {
  const input = new SavePersonStatusInput();
  const result = offlineQueueProcessor.addPersonnelStatusToQueue(input);
    expect(result).toBe('');
  });
});