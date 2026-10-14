const mockInitializeNetworkListener = jest.fn();
const mockStartProcessing = jest.fn(() => Promise.resolve());
const mockProcessQueue = jest.fn(() => Promise.resolve());

jest.mock('@/stores/offline-queue/store', () => ({
  useOfflineQueueStore: { getState: () => ({ initializeNetworkListener: mockInitializeNetworkListener, teardownNetworkListener: jest.fn() }) },
}));

jest.mock('../offline-queue-processor', () => ({
  offlineQueueProcessor: {
    startProcessing: () => mockStartProcessing(),
    processQueue: () => mockProcessQueue(),
    cleanup: jest.fn(),
  },
}));

jest.mock('@/lib/logging', () => ({
  logger: { info: jest.fn(), debug: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));

import { offlineQueueService } from '../offline-queue.service';

describe('offlineQueueService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    offlineQueueService.cleanup();
  });

  it('starts the queue on the first sign-in', async () => {
    await offlineQueueService.initialize();

    expect(mockInitializeNetworkListener).toHaveBeenCalledTimes(1);
    expect(mockStartProcessing).toHaveBeenCalledTimes(1);
  });

  it('sends what was held for the session on every later sign-in', async () => {
    await offlineQueueService.initialize();
    jest.clearAllMocks();

    await offlineQueueService.initialize();

    // Held while signed out, or while another account or server was, until this session came back.
    expect(mockProcessQueue).toHaveBeenCalledTimes(1);
    expect(mockInitializeNetworkListener).not.toHaveBeenCalled();
    expect(mockStartProcessing).not.toHaveBeenCalled();
  });

  it('does not fail sign-in when that pass fails', async () => {
    await offlineQueueService.initialize();
    mockProcessQueue.mockRejectedValueOnce(new Error('storage unavailable'));

    await expect(offlineQueueService.initialize()).resolves.toBeUndefined();
  });
});
