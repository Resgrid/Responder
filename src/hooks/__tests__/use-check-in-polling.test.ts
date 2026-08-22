import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { renderHook } from '@testing-library/react-native';

import { useCheckInStore } from '@/stores/calls/check-in-store';

import { resetCheckInPollingSubscribers, useCheckInPolling } from '../use-check-in-polling';

const startPolling = jest.fn();
const stopPolling = jest.fn();

jest.mock('@/stores/calls/check-in-store', () => ({
  useCheckInStore: {
    getState: jest.fn(),
  },
}));

describe('useCheckInPolling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetCheckInPollingSubscribers();
    (useCheckInStore.getState as unknown as jest.Mock).mockReturnValue({ startPolling, stopPolling });
  });

  it('should start polling for the requested call', () => {
    renderHook(() => useCheckInPolling(42));

    expect(startPolling).toHaveBeenCalledWith(42);
  });

  it('should not start polling when no call is requested', () => {
    renderHook(() => useCheckInPolling(null));

    expect(startPolling).not.toHaveBeenCalled();
    expect(stopPolling).not.toHaveBeenCalled();
  });

  it('should stop polling once the only consumer unmounts', () => {
    const { unmount } = renderHook(() => useCheckInPolling(42));

    unmount();

    expect(stopPolling).toHaveBeenCalledTimes(1);
  });

  // Regression: the check-in store drives a single shared interval and stopPolling()
  // clears it unconditionally. The home Active Call tab stays mounted while the call
  // detail check-in tab is pushed, so popping that tab used to kill the home tab's poll
  // and timer statuses silently stopped refreshing.
  it('should keep polling for a still-mounted consumer when another one unmounts', () => {
    const homeTab = renderHook(() => useCheckInPolling(42));
    const callDetailTab = renderHook(() => useCheckInPolling(42));

    callDetailTab.unmount();

    expect(stopPolling).not.toHaveBeenCalled();
    // The single interval is re-pointed at the remaining consumer's call.
    expect(startPolling).toHaveBeenLastCalledWith(42);

    homeTab.unmount();

    expect(stopPolling).toHaveBeenCalledTimes(1);
  });

  it('should re-point the shared interval at the remaining consumer call id', () => {
    const homeTab = renderHook(() => useCheckInPolling(7));
    const callDetailTab = renderHook(() => useCheckInPolling(99));

    callDetailTab.unmount();

    expect(stopPolling).not.toHaveBeenCalled();
    expect(startPolling).toHaveBeenLastCalledWith(7);

    homeTab.unmount();
  });
});
