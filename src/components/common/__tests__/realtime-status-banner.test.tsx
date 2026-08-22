import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, render, screen } from '@testing-library/react-native';
import React from 'react';

import { type RealtimeHubOutages, useSignalRStore } from '@/stores/signalr/signalr-store';

import { REALTIME_OUTAGE_GRACE_MS, RealtimeStatusBanner } from '../realtime-status-banner';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('@/stores/signalr/signalr-store', () => ({
  useSignalRStore: jest.fn(),
}));

const mockUseSignalRStore = useSignalRStore as unknown as jest.MockedFunction<(selector: (state: { realtimeHubOutages: RealtimeHubOutages }) => unknown) => unknown>;

function setOutages(realtimeHubOutages: RealtimeHubOutages): void {
  mockUseSignalRStore.mockImplementation((selector) => selector({ realtimeHubOutages }));
}

describe('RealtimeStatusBanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-08-20T12:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // The store only records a hub that connected and then dropped, so a cold start has nothing
  // to report and the banner must stay out of the way.
  it('stays hidden during normal startup, when no hub has ever dropped', () => {
    setOutages({});

    const { toJSON } = render(<RealtimeStatusBanner />);

    expect(toJSON()).toBeNull();
    expect(screen.queryByTestId('realtime-status-banner')).toBeNull();
  });

  it('stays hidden through a routine brief reconnect', () => {
    setOutages({ update: { since: Date.now(), exhausted: false } });

    const { toJSON } = render(<RealtimeStatusBanner />);
    expect(toJSON()).toBeNull();

    // Still inside the grace period: the service is expected to heal this on its own.
    act(() => {
      jest.advanceTimersByTime(REALTIME_OUTAGE_GRACE_MS - 1);
    });

    expect(screen.queryByTestId('realtime-status-banner')).toBeNull();
  });

  it('shows once an outage outlasts the grace period', () => {
    setOutages({ update: { since: Date.now(), exhausted: false } });

    render(<RealtimeStatusBanner />);

    act(() => {
      jest.advanceTimersByTime(REALTIME_OUTAGE_GRACE_MS);
    });

    expect(screen.getByTestId('realtime-status-banner')).toBeTruthy();
    expect(screen.getByText('app.realtime_offline_title')).toBeTruthy();
    expect(screen.getByText('app.realtime_offline_description')).toBeTruthy();
  });

  it('shows immediately when reconnection is exhausted, without waiting out the grace period', () => {
    setOutages({ update: { since: Date.now(), exhausted: true } });

    render(<RealtimeStatusBanner />);

    expect(screen.getByTestId('realtime-status-banner')).toBeTruthy();
  });

  it('shows immediately for an outage that started before the banner mounted', () => {
    setOutages({ update: { since: Date.now() - REALTIME_OUTAGE_GRACE_MS - 1000, exhausted: false } });

    render(<RealtimeStatusBanner />);

    expect(screen.getByTestId('realtime-status-banner')).toBeTruthy();
  });

  it('hides again once the feed recovers', () => {
    setOutages({ update: { since: Date.now(), exhausted: true } });

    const { rerender } = render(<RealtimeStatusBanner />);
    expect(screen.getByTestId('realtime-status-banner')).toBeTruthy();

    // The store clears the entry on reconnect (and on sign-out).
    setOutages({});
    rerender(<RealtimeStatusBanner />);

    expect(screen.queryByTestId('realtime-status-banner')).toBeNull();
  });

  it('counts down from the oldest outage when a second hub also drops', () => {
    const firstDrop = Date.now() - (REALTIME_OUTAGE_GRACE_MS - 1000);
    setOutages({
      chat: { since: firstDrop, exhausted: false },
      update: { since: Date.now(), exhausted: false },
    });

    render(<RealtimeStatusBanner />);
    expect(screen.queryByTestId('realtime-status-banner')).toBeNull();

    // The later drop must not push the warning a further full grace period away.
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(screen.getByTestId('realtime-status-banner')).toBeTruthy();
  });

  it('exposes the outage to screen readers as an alert', () => {
    setOutages({ update: { since: Date.now(), exhausted: true } });

    render(<RealtimeStatusBanner />);

    const banner = screen.getByTestId('realtime-status-banner');
    expect(banner.props.accessibilityRole).toBe('alert');
    expect(banner.props.accessibilityLabel).toBe('app.realtime_offline_title. app.realtime_offline_description');
  });
});
