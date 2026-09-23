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
    processor.cleanup();
  });

  afterEach(() => {
    processor.cleanup();
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

  it('schedules a timer for the earliest pending retry and clears the previous one', async () => {
    jest.useFakeTimers();
    try {
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

      // Backoff of 2s from the failed item is armed rather than left dormant.
      expect(processor.retryTimer).not.toBeNull();
      expect(jest.getTimerCount()).toBe(1);

      const firstTimer = processor.retryTimer;

      // A second pass must replace the timer, not leak another one.
      await processor.processQueue();

      expect(processor.retryTimer).not.toBe(firstTimer);
      expect(jest.getTimerCount()).toBe(1);

      processor.cleanup();
      expect(processor.retryTimer).toBeNull();
      expect(jest.getTimerCount()).toBe(0);
    } finally {
      jest.useRealTimers();
    }
  });

  it('does not schedule a retry timer when nothing is deferred', async () => {
    jest.useFakeTimers();
    try {
      storage.getString.mockReturnValue('[]');

      await processor.processQueue();

      expect(processor.retryTimer).toBeNull();
      expect(jest.getTimerCount()).toBe(0);
    } finally {
      jest.useRealTimers();
    }
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

  describe('replaying personnel statuses', () => {
    const httpError = (status: number) => Object.assign(new Error(`Request failed with status code ${status}`), { response: { status } });

    // Queued while offline at 10:00:00Z; the replay below runs much later.
    const queuedStatus = {
      UserId: 'user-1',
      Type: '3',
      RespondingTo: '321',
      RespondingToType: 2,
      EventId: '321',
      Timestamp: '2026-09-23T10:00:00.000Z',
      TimestampUtc: 'Wed, 23 Sep 2026 10:00:00 GMT',
      Note: 'On scene at the north entrance',
      Latitude: '40.7128',
      Longitude: '-74.006',
    };

    const queue = (payload: Record<string, unknown>, extra: Record<string, unknown> = {}) => {
      storage.getString.mockReturnValue(JSON.stringify([{ id: 'item-1', type: 'personnelStatus', payload, retries: 0, attempts: 0, ...extra }]));
    };

    const persistedQueue = () => JSON.parse(storage.set.mock.calls[storage.set.mock.calls.length - 1][1]);

    it('sends the queued payload unchanged, keeping the original tap time rather than the replay time', async () => {
      jest.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-09-23T14:30:00.000Z'));
      queue(queuedStatus);

      await processor.processQueue();

      expect(savePersonnelStatus).toHaveBeenCalledTimes(1);
      expect(savePersonnelStatus).toHaveBeenCalledWith(queuedStatus);
      expect(persistedQueue()).toEqual([]);
    });

    it('retries once without the destination when the server answers 400, keeping timestamp and note', async () => {
      queue(queuedStatus);
      savePersonnelStatus.mockRejectedValueOnce(httpError(400)).mockResolvedValueOnce(undefined);

      await processor.processQueue();

      expect(savePersonnelStatus).toHaveBeenCalledTimes(2);
      expect(savePersonnelStatus).toHaveBeenLastCalledWith({
        ...queuedStatus,
        RespondingTo: '',
        RespondingToType: null,
        EventId: '',
      });
      expect(persistedQueue()).toEqual([]);
      expect(logger.warn).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('saved without it') }));
    });

    it('drops the item when the destination-less retry is also rejected, without looping to max retries', async () => {
      queue(queuedStatus);
      savePersonnelStatus.mockRejectedValue(httpError(400));

      await processor.processQueue();

      expect(savePersonnelStatus).toHaveBeenCalledTimes(2);
      expect(persistedQueue()).toEqual([]);
      expect(processor.retryTimer).toBeNull();
      expect(logger.error).toHaveBeenCalledWith(expect.objectContaining({ message: 'Dropping offline personnel status rejected by the server' }));
    });

    it('keeps the destination-less payload for a network retry when the fallback cannot reach the server', async () => {
      const now = 100000;
      jest.spyOn(Date, 'now').mockReturnValue(now);
      queue(queuedStatus);
      savePersonnelStatus.mockRejectedValueOnce(httpError(400)).mockRejectedValueOnce(new Error('Network Error'));

      await processor.processQueue();

      expect(persistedQueue()).toEqual([
        expect.objectContaining({
          id: 'item-1',
          attempts: 1,
          nextRetryAt: now + 2000,
          payload: expect.objectContaining({
            RespondingTo: '',
            RespondingToType: null,
            EventId: '',
            Timestamp: queuedStatus.Timestamp,
            TimestampUtc: queuedStatus.TimestampUtc,
            Note: queuedStatus.Note,
          }),
        }),
      ]);
    });

    it.each([['' as string], ['0' as string]])('does not retry a 400 without a destination (RespondingTo %p)', async (respondingTo) => {
      queue({ ...queuedStatus, RespondingTo: respondingTo, RespondingToType: null, EventId: '' });
      savePersonnelStatus.mockRejectedValue(httpError(400));

      await processor.processQueue();

      expect(savePersonnelStatus).toHaveBeenCalledTimes(1);
      expect(persistedQueue()).toEqual([]);
    });

    it.each([[401], [403], [404], [422]])('stops retrying and logs a %s instead of looping to max retries', async (status) => {
      queue(queuedStatus);
      savePersonnelStatus.mockRejectedValue(httpError(status));

      await processor.processQueue();

      expect(savePersonnelStatus).toHaveBeenCalledTimes(1);
      expect(persistedQueue()).toEqual([]);
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Dropping offline personnel status rejected by the server', context: expect.objectContaining({ id: 'item-1', httpStatus: status }) })
      );
    });

    it.each([[408], [429], [500], [503]])('keeps retrying with backoff on a transient %s', async (status) => {
      const now = 100000;
      jest.spyOn(Date, 'now').mockReturnValue(now);
      queue(queuedStatus);
      savePersonnelStatus.mockRejectedValue(httpError(status));

      await processor.processQueue();

      expect(savePersonnelStatus).toHaveBeenCalledTimes(1);
      expect(persistedQueue()).toEqual([expect.objectContaining({ id: 'item-1', attempts: 1, nextRetryAt: now + 2000, payload: queuedStatus })]);
    });

    it('still drops a network failure after max retries', async () => {
      queue(queuedStatus, { retries: 4, attempts: 4 });
      savePersonnelStatus.mockRejectedValue(new Error('Network Error'));

      await processor.processQueue();

      expect(persistedQueue()).toEqual([]);
      expect(logger.error).toHaveBeenCalledWith(expect.objectContaining({ message: 'Dropping offline queue item after max retries' }));
    });
  });
});
