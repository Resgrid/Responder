import { isSafeRouteId, parseNotificationData } from '../store';

describe('approval request pushes', () => {
  it('reads "NA:{id}" as an approval request (passkey plan section 7.9), not a call or a message', () => {
    expect(parseNotificationData({ eventCode: 'NA:ap-123', title: 'Sign-in approval requested', body: '', data: {} })).toMatchObject({ type: 'mfa-approval', id: 'ap-123' });
    expect(parseNotificationData({ eventCode: 'na:ap-9', title: '', body: '', data: {} }).type).toBe('mfa-approval');
    expect(isSafeRouteId('ap-123')).toBe(true);
    expect(isSafeRouteId('../x')).toBe(false);
  });
});
