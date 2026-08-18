import { router } from 'expo-router';

import { logger } from '@/lib/logging';

import { handleChatDeepLink } from '../push-notification';

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
  ])('navigates with explicit route params for %s', (eventCode, channelId) => {
    expect(handleChatDeepLink(eventCode)).toBe(true);
    expect(push).toHaveBeenCalledWith({ pathname: '/chat/[channelId]', params: { channelId } });
  });

  it.each(['t:a/b', 't:a\\b', 'g:a?x=1', 'g:a#fragment', 'x:123', 't:', 'notacode', ':missingprefix'])('rejects invalid payload %s', (eventCode) => {
    expect(handleChatDeepLink(eventCode)).toBe(false);
    expect(push).not.toHaveBeenCalled();
  });

  it('retries navigation when the router is not ready yet', async () => {
    push
      .mockImplementationOnce(() => {
        throw new Error('router not ready');
      })
      .mockImplementationOnce(() => undefined);

    expect(handleChatDeepLink('t:channel-1')).toBe(true);
    expect(push).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(300);

    expect(push).toHaveBeenCalledTimes(2);
    expect(logError).not.toHaveBeenCalled();
  });

  it('logs an error after exhausting navigation retries', async () => {
    push.mockImplementation(() => {
      throw new Error('router not ready');
    });

    expect(handleChatDeepLink('t:channel-1')).toBe(true);

    // Budget is 40 attempts x 250ms so a cold start has ~10s to mount and hydrate.
    await jest.advanceTimersByTimeAsync(250 * 40);

    expect(push).toHaveBeenCalledTimes(40);
    expect(logError).toHaveBeenCalledWith(expect.objectContaining({ message: 'Failed to deep-link to chat channel' }));
  });
});
