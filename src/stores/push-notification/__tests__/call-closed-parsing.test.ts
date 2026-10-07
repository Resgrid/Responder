import { parseNotificationData } from '../store';

jest.mock('@/lib/logging', () => ({
  logger: {
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

describe('call closed event code parsing', () => {
  it('routes an NC event code to the call it names', () => {
    // Core sends "NC:{callId}" when a call is closed: the leading "N" keeps the push an ordinary
    // notification (not a critical call alert), and the app still opens the call on a tap.
    const parsed = parseNotificationData({ eventCode: 'NC:1234', title: 'Call Closed - Structure Fire', body: 'Call 26-12 closed as Closed.' });

    expect(parsed.type).toBe('call');
    expect(parsed.id).toBe('1234');
    expect(parsed.title).toBe('Call Closed - Structure Fire');
  });

  it('matches the prefix without regard to case', () => {
    expect(parseNotificationData({ eventCode: 'nc:77' }).type).toBe('call');
    expect(parseNotificationData({ eventCode: 'nc:77' }).id).toBe('77');
  });

  it('leaves the single letter call prefix unchanged', () => {
    expect(parseNotificationData({ eventCode: 'C:1234' }).type).toBe('call');
    expect(parseNotificationData({ eventCode: 'C:1234' }).id).toBe('1234');
  });
});
