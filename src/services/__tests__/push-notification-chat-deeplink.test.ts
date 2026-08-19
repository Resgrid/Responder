import { router } from 'expo-router';

import { logger } from '@/lib/logging';

import { extractPushNotificationData, handleChatDeepLink } from '../push-notification';

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
}));

jest.mock('expo-device', () => ({
  isDevice: true,
}));

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  setNotificationChannelAsync: jest.fn(),
  getLastNotificationResponseAsync: jest.fn(() => Promise.resolve(null)),
}));

jest.mock('@/api/devices/push', () => ({
  registerDevice: jest.fn(),
  registerUnitDevice: jest.fn(),
}));

jest.mock('@/components/weather-alerts/weather-alert-navigation', () => ({
  openWeatherAlertDetail: jest.fn(() => Promise.resolve()),
}));

jest.mock('@/lib/auth', () => {
  // handleChatDeepLink gates the cold-start push on a hydrated session, so the mock has to
  // answer getState() as well as being callable as a selector hook.
  const state = { status: 'signedIn', userId: 'test-user' };
  const store: any = jest.fn((selector: any) => (selector ? selector(state) : state));
  store.getState = () => state;
  return { useAuthStore: store };
});

jest.mock('@/lib/logging', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('@/lib/storage/app', () => ({
  getDeviceUuid: jest.fn(() => 'test-uuid'),
  getBaseApiUrl: jest.fn(() => ''),
}));

jest.mock('@/stores/security/store', () => ({
  securityStore: {
    getState: jest.fn(() => ({ accessToken: 'test-token' })),
  },
}));

describe('handleChatDeepLink', () => {
  const push = router.push as jest.Mock;
  const logError = logger.error as jest.Mock;

  beforeEach(() => {
    push.mockClear();
    logError.mockClear();
  });

  it.each([
    ['t:channel-1', 'channel-1'],
    ['g:9101', '9101'],
    ['T:channel-1', 'channel-1'],
    ['G:9101', '9101'],
  ])('navigates with explicit route params for %s', async (eventCode, channelId) => {
    await expect(handleChatDeepLink(eventCode)).resolves.toBe(true);
    expect(push).toHaveBeenCalledWith({ pathname: '/chat/[channelId]', params: { channelId } });
  });

  it.each(['t:a/b', 't:a\\b', 'g:a?x=1', 'g:a#fragment', 'x:123', 't:', 'notacode', ':missingprefix'])('rejects invalid payload %s', async (eventCode) => {
    await expect(handleChatDeepLink(eventCode)).resolves.toBe(false);
    expect(push).not.toHaveBeenCalled();
  });

  it('retries navigation when the router is not ready yet', async () => {
    push
      .mockImplementationOnce(() => {
        throw new Error('router not ready');
      })
      .mockImplementationOnce(() => undefined);

    const navigated = handleChatDeepLink('t:channel-1');
    expect(push).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(300);

    expect(push).toHaveBeenCalledTimes(2);
    await expect(navigated).resolves.toBe(true);
    expect(logError).not.toHaveBeenCalled();
  });

  it('resolves false and logs after exhausting navigation retries', async () => {
    push.mockImplementation(() => {
      throw new Error('router not ready');
    });

    const navigated = handleChatDeepLink('t:channel-1');

    // Budget is 40 attempts x 250ms so a cold start has ~10s to mount and hydrate.
    await jest.advanceTimersByTimeAsync(250 * 40);

    expect(push).toHaveBeenCalledTimes(40);
    // Resolving false is what tells the tap handler to fall back to the notification modal.
    await expect(navigated).resolves.toBe(false);
    expect(logError).toHaveBeenCalledWith(expect.objectContaining({ message: 'Failed to deep-link to chat channel' }));
  });
});

describe('extractPushNotificationData', () => {
  const makeRequest = (data: unknown, triggerPayload?: unknown): any => ({
    identifier: 'req-1',
    content: { title: 'T', body: 'B', data },
    trigger: triggerPayload === undefined ? { type: 'push' } : { type: 'push', payload: triggerPayload },
  });

  it('reads eventCode from content.data (Android FCM path)', () => {
    const { eventCode, data } = extractPushNotificationData(makeRequest({ eventCode: 'g:123', other: 1 }));
    expect(eventCode).toBe('g:123');
    expect(data).toEqual({ eventCode: 'g:123', other: 1 });
  });

  it('falls back to a top-level trigger payload key (iOS APNs custom key)', () => {
    const { eventCode } = extractPushNotificationData(makeRequest(undefined, { aps: { alert: {} }, eventCode: 't:abc', type: '13' }));
    expect(eventCode).toBe('t:abc');
  });

  it('falls back to the trigger payload body dict (iOS expo-style body key)', () => {
    const { eventCode } = extractPushNotificationData(makeRequest(null, { aps: {}, body: { eventCode: 'C:55' } }));
    expect(eventCode).toBe('C:55');
  });

  it('falls back to an aps-nested eventCode (FCM-relayed APNs override)', () => {
    const { eventCode } = extractPushNotificationData(makeRequest({}, { aps: { category: 'chats', eventCode: 'g:77' } }));
    expect(eventCode).toBe('g:77');
  });

  it('returns undefined when no eventCode exists anywhere', () => {
    const { eventCode, data } = extractPushNotificationData(makeRequest({ foo: 'bar' }, { aps: {} }));
    expect(eventCode).toBeUndefined();
    expect(data).toEqual({ foo: 'bar' });
  });
});
