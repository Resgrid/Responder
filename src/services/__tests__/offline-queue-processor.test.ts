// Test suite for OfflineQueueProcessor

// Mock NetInfo to prevent native dependencies
jest.mock('@react-native-community/netinfo', () => ({ addEventListener: jest.fn() }));

// Mock logger
jest.mock('@/lib/logging', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

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
const { offlineQueueProcessor, OfflineQueueProcessor, RealOfflineQueueProcessor } = require('@/services/offline-queue-processor');
const { savePersonnelStatus } = require('@/api/personnel/personnelStatuses');
const { getOfflineQueueStorage } = require('@/lib/storage/secure-storage');
const { SavePersonStatusInput } = require('@/models/v4/personnelStatuses/savePersonStatusInput');
const { logger } = require('@/lib/logging');

describe('offlineQueueProcessor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be an instance of OfflineQueueProcessor', () => {
    expect(offlineQueueProcessor).toBeInstanceOf(OfflineQueueProcessor);
  });

  it('should return empty string for addPersonnelStatusToQueue', () => {
    const input = new SavePersonStatusInput();
    const result = offlineQueueProcessor.addPersonnelStatusToQueue(input);
    expect(result).toBe('');
  });

  it('should log a warning when the stub discards an enqueued item', () => {
    const input = new SavePersonStatusInput();
    input.UserId = 'user-1';
    input.EventId = 'event-1';
    input.Note = 'sensitive note';
    offlineQueueProcessor.addPersonnelStatusToQueue(input);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('Stub offline queue'),
        context: {
          userIdHash: expect.any(String),
          eventIdHash: expect.any(String),
          lawful_basis: 'legitimate_interests',
          purpose: 'offline_queue_diagnostics',
        },
      })
    );
    const context = logger.warn.mock.calls[0][0].context;
    expect(context).not.toHaveProperty('status');
    expect(context.userIdHash).not.toBe(input.UserId);
    expect(context.eventIdHash).not.toBe(input.EventId);
  });

  it('should log a warning when the stub processes the queue', async () => {
    await offlineQueueProcessor.processQueue();
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('Stub offline queue'),
      })
    );
  });
});

describe('RealOfflineQueueProcessor', () => {
  const processor = RealOfflineQueueProcessor.getInstance();
  let storage: { getString: jest.Mock; set: jest.Mock };

  beforeEach(async () => {
    jest.clearAllMocks();
    storage = await getOfflineQueueStorage();
    storage.getString.mockReturnValue('[]');
    storage.set.mockResolvedValue(undefined);
    savePersonnelStatus.mockResolvedValue(undefined);
    processor.processing = false;
    processor.queueMutationChain = Promise.resolve();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('schedules and persists a failed item without sleeping', async () => {
    const now = 100000;
    jest.spyOn(Date, 'now').mockReturnValue(now);
    storage.getString.mockReturnValue(
      JSON.stringify([
        {
          id: 'item-1',
          type: 'personnelStatus',
          payload: { UserId: 'user-1' },
          retries: 0,
          attempts: 0,
        },
      ])
    );
    savePersonnelStatus.mockRejectedValue(new Error('offline'));

    await processor.processQueue();

    const persisted = JSON.parse(storage.set.mock.calls[0][1]);
    expect(persisted).toEqual([
      expect.objectContaining({
        id: 'item-1',
        retries: 1,
        attempts: 1,
        nextRetryAt: now + 2000,
      }),
    ]);
  });

  it('processes only items whose next retry time has elapsed', async () => {
    const now = 100000;
    jest.spyOn(Date, 'now').mockReturnValue(now);
    const futureItem = {
      id: 'future',
      type: 'personnelStatus',
      payload: { UserId: 'future-user' },
      retries: 1,
      attempts: 1,
      nextRetryAt: now + 1000,
    };
    const dueItem = {
      id: 'due',
      type: 'personnelStatus',
      payload: { UserId: 'due-user' },
      retries: 1,
      attempts: 1,
      nextRetryAt: now,
    };
    storage.getString.mockReturnValue(JSON.stringify([futureItem, dueItem]));

    await processor.processQueue();

    expect(savePersonnelStatus).toHaveBeenCalledTimes(1);
    expect(savePersonnelStatus).toHaveBeenCalledWith(dueItem.payload);
    expect(JSON.parse(storage.set.mock.calls[0][1])).toEqual([futureItem]);
  });

  it('preserves an item enqueued while queue processing is in progress', async () => {
    let storedQueue = JSON.stringify([
      {
        id: 'existing',
        type: 'personnelStatus',
        payload: { UserId: 'existing-user' },
        retries: 0,
        attempts: 0,
      },
    ]);
    storage.getString.mockImplementation(() => storedQueue);
    storage.set.mockImplementation((_key: string, value: string) => {
      storedQueue = value;
      return Promise.resolve();
    });

    let signalProcessingStarted: () => void;
    const processingStarted = new Promise<void>((resolve) => {
      signalProcessingStarted = resolve;
    });
    let finishProcessing: () => void;
    const processingBlocked = new Promise<void>((resolve) => {
      finishProcessing = resolve;
    });
    savePersonnelStatus.mockImplementation(() => {
      signalProcessingStarted!();
      return processingBlocked;
    });

    const processing = processor.processQueue();
    await processingStarted;

    const queuedId = processor.addPersonnelStatusToQueue({ UserId: 'new-user' });
    finishProcessing!();

    await processing;
    await processor.queueMutationChain;

    expect(queuedId).toEqual(expect.any(String));
    expect(JSON.parse(storedQueue)).toEqual([
      expect.objectContaining({
        id: queuedId,
        payload: expect.objectContaining({ UserId: 'new-user' }),
      }),
    ]);
  });
});
