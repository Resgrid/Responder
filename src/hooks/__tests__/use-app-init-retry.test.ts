import { act, renderHook } from '@testing-library/react-native';

import { getInitRetryDelay, INIT_MAX_ATTEMPTS, INIT_RETRY_BASE_DELAY_MS, INIT_RETRY_MAX_DELAY_MS, useAppInitRetry } from '../use-app-init-retry';

jest.mock('@/lib/logging', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn(), trace: jest.fn(), fatal: jest.fn() },
}));

describe('getInitRetryDelay', () => {
  it('doubles the delay per attempt', () => {
    expect(getInitRetryDelay(1)).toBe(INIT_RETRY_BASE_DELAY_MS);
    expect(getInitRetryDelay(2)).toBe(INIT_RETRY_BASE_DELAY_MS * 2);
    expect(getInitRetryDelay(3)).toBe(INIT_RETRY_BASE_DELAY_MS * 4);
  });

  it('never exceeds the ceiling', () => {
    expect(getInitRetryDelay(20)).toBe(INIT_RETRY_MAX_DELAY_MS);
  });

  it('treats a zeroth attempt as the base delay', () => {
    expect(getInitRetryDelay(0)).toBe(INIT_RETRY_BASE_DELAY_MS);
  });
});

describe('useAppInitRetry', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('runs the queued retry after the backoff', () => {
    const { result } = renderHook(() => useAppInitRetry());
    const run = jest.fn();

    act(() => {
      result.current.recordAttempt();
      result.current.scheduleRetry(run);
    });

    expect(run).not.toHaveBeenCalled();
    act(() => {
      jest.advanceTimersByTime(INIT_RETRY_BASE_DELAY_MS);
    });
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('backs off further on each successive failure', () => {
    const { result } = renderHook(() => useAppInitRetry());
    const run = jest.fn();

    act(() => {
      result.current.recordAttempt();
      result.current.recordAttempt();
      result.current.scheduleRetry(run);
    });

    act(() => {
      jest.advanceTimersByTime(INIT_RETRY_BASE_DELAY_MS);
    });
    expect(run).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(INIT_RETRY_BASE_DELAY_MS);
    });
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('gives up once the attempt budget is spent', () => {
    const { result } = renderHook(() => useAppInitRetry());
    const run = jest.fn();

    act(() => {
      for (let i = 0; i < INIT_MAX_ATTEMPTS; i += 1) result.current.recordAttempt();
      result.current.scheduleRetry(run);
    });

    act(() => {
      jest.advanceTimersByTime(INIT_RETRY_MAX_DELAY_MS * 2);
    });
    expect(run).not.toHaveBeenCalled();
  });

  it('restores the budget after a reset so a later failure retries again', () => {
    const { result } = renderHook(() => useAppInitRetry());
    const run = jest.fn();

    act(() => {
      for (let i = 0; i < INIT_MAX_ATTEMPTS; i += 1) result.current.recordAttempt();
      // Sign-out, or a run that finally succeeded.
      result.current.reset();
      result.current.recordAttempt();
      result.current.scheduleRetry(run);
    });

    act(() => {
      jest.advanceTimersByTime(INIT_RETRY_BASE_DELAY_MS);
    });
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('cancels a pending retry when a new attempt starts', () => {
    const { result } = renderHook(() => useAppInitRetry());
    const run = jest.fn();

    act(() => {
      result.current.recordAttempt();
      result.current.scheduleRetry(run);
      result.current.recordAttempt();
    });

    act(() => {
      jest.advanceTimersByTime(INIT_RETRY_MAX_DELAY_MS);
    });
    expect(run).not.toHaveBeenCalled();
  });

  it('cancels a pending retry on reset', () => {
    const { result } = renderHook(() => useAppInitRetry());
    const run = jest.fn();

    act(() => {
      result.current.recordAttempt();
      result.current.scheduleRetry(run);
      result.current.reset();
    });

    act(() => {
      jest.advanceTimersByTime(INIT_RETRY_MAX_DELAY_MS);
    });
    expect(run).not.toHaveBeenCalled();
  });

  it('drops a pending retry when the layout unmounts', () => {
    const { result, unmount } = renderHook(() => useAppInitRetry());
    const run = jest.fn();

    act(() => {
      result.current.recordAttempt();
      result.current.scheduleRetry(run);
    });

    unmount();

    act(() => {
      jest.advanceTimersByTime(INIT_RETRY_MAX_DELAY_MS);
    });
    expect(run).not.toHaveBeenCalled();
  });
});
