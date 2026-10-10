/* eslint-disable @typescript-eslint/no-explicit-any */
jest.mock('@livekit/react-native-webrtc', () => ({
  RTCAudioSession: {
    audioSessionDidActivate: jest.fn(),
    audioSessionDidDeactivate: jest.fn(),
  },
}));

jest.mock('react-native-callkeep');

jest.mock('../../lib/logging', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

import { CallKeepService as AndroidCallKeepService } from '../callkeep.service.android';
import { CallKeepService as IosCallKeepService } from '../callkeep.service.ios';

describe.each([
  ['iOS', IosCallKeepService],
  ['Android', AndroidCallKeepService],
])('CallKeep mute handling (%s)', (_platform, ServiceClass) => {
  let service: any;
  let muteCallback: jest.Mock;

  const muteEvent = (muted: boolean) => service.handleMutedCallAction({ muted, callUUID: 'call-1' });

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    (ServiceClass as any).instance = null;
    service = (ServiceClass as any).getInstance();
    muteCallback = jest.fn();
    service.setMuteStateCallback(muteCallback);
  });

  afterEach(() => {
    jest.useRealTimers();
    (ServiceClass as any).instance = null;
  });

  it('forwards a mute change to the registered callback', () => {
    muteEvent(true);

    expect(muteCallback).toHaveBeenCalledWith(true);
  });

  it('ignores mute changes while a PTT press holds the external lock', () => {
    service.ignoreMuteEvents(1000);

    muteEvent(true);
    expect(muteCallback).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1001);
    muteEvent(false);
    expect(muteCallback).toHaveBeenCalledWith(false);
  });

  it('drops a storm of rapid mute changes until it settles', () => {
    muteEvent(true);
    expect(muteCallback).toHaveBeenCalledTimes(1);

    // Faulty headset / HFP conflict: events less than 500ms apart
    jest.advanceTimersByTime(100);
    muteEvent(false);
    jest.advanceTimersByTime(100);
    muteEvent(true);
    expect(muteCallback).toHaveBeenCalledTimes(1);

    // Quiet for longer than the storm window: events flow again
    jest.advanceTimersByTime(900);
    muteEvent(false);
    expect(muteCallback).toHaveBeenCalledTimes(2);
    expect(muteCallback).toHaveBeenLastCalledWith(false);
  });

  it('stops forwarding while a specialized PTT device has removed the listener', () => {
    service.removeMuteListener();
    muteEvent(true);
    expect(muteCallback).not.toHaveBeenCalled();

    service.restoreMuteListener();
    jest.advanceTimersByTime(600);
    muteEvent(false);
    expect(muteCallback).toHaveBeenCalledWith(false);
  });
});
