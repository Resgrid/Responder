import { parseNotificationData } from '../store';

jest.mock('@/lib/logging', () => ({
  logger: {
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

describe('communication test event code parsing', () => {
  it('parses a CT event code into a communication-test notification carrying the response token', () => {
    const parsed = parseNotificationData({ eventCode: 'CT:9f2c4a1b8e7d4f0a' });

    expect(parsed.type).toBe('communication-test');
    expect(parsed.id).toBe('9f2c4a1b8e7d4f0a');
  });

  it('does not collapse the two letter CT prefix into the single letter call prefix', () => {
    // The prefix map is keyed on the first character, so "CT" would read as "C" (call) and the
    // responder would be shown a View Call button for a token that is not a call id.
    const parsed = parseNotificationData({ eventCode: 'ct:abc123' });

    expect(parsed.type).not.toBe('call');
    expect(parsed.type).toBe('communication-test');
  });

  it('still parses the single letter prefixes', () => {
    expect(parseNotificationData({ eventCode: 'C:1234' }).type).toBe('call');
    expect(parseNotificationData({ eventCode: 'M:5678' }).type).toBe('message');
    expect(parseNotificationData({ eventCode: 't:9012' }).type).toBe('chat');
    expect(parseNotificationData({ eventCode: 'G:3456' }).type).toBe('group-chat');
    expect(parseNotificationData({ eventCode: 'W:9012' }).type).toBe('weather');
  });

  it('keeps an id that itself contains a colon', () => {
    const parsed = parseNotificationData({ eventCode: 'CT:aa:bb' });

    expect(parsed.id).toBe('aa:bb');
  });

  it('treats an unknown prefix and a code with no separator as unknown', () => {
    expect(parseNotificationData({ eventCode: 'ZZ:1' }).type).toBe('unknown');
    expect(parseNotificationData({ eventCode: 'N0' }).type).toBe('unknown');
    expect(parseNotificationData({ eventCode: '' }).type).toBe('unknown');
    expect(parseNotificationData({ eventCode: ':1234' }).type).toBe('unknown');
  });

  it('parses the three letter NWO prefix as a work order carrying the order id', () => {
    const parsed = parseNotificationData({ eventCode: 'NWO:0b7c3e52-2f4a-4d0e-9a57-1f7a0c9d6e11' });

    expect(parsed.type).toBe('work-order');
    expect(parsed.id).toBe('0b7c3e52-2f4a-4d0e-9a57-1f7a0c9d6e11');
    // Lowercase, as the chat codes already arrive.
    expect(parseNotificationData({ eventCode: 'nwo:abc' }).type).toBe('work-order');
    // Other "n" codes stay plain notifications, which is what builds without the NWO entry show.
    expect(parseNotificationData({ eventCode: 'NX:abc' }).type).toBe('unknown');
  });
});
