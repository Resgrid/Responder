import { describe, expect, it } from '@jest/globals';

import { mapNovuNotification } from '../NotificationInbox';

// Regression guard for the @novu/js v2 -> v3 field rename (title -> subject, read -> isRead,
// payload -> data). Reading the v2 names type-checked while `item` was `any` and silently
// produced undefined, so unread styling and the "view reference" button never rendered.
// These assertions fail if anyone reintroduces the v2 names.
type NovuLike = Parameters<typeof mapNovuNotification>[0];

const buildNotification = (overrides: Record<string, unknown> = {}): NovuLike =>
  ({
    id: 'n-1',
    subject: 'Structure fire',
    body: 'Dispatched to 123 Main St',
    createdAt: '2026-08-20T10:00:00Z',
    isRead: false,
    data: {
      type: 'alert',
      referenceId: 'call-42',
      referenceType: 'call',
    },
    ...overrides,
  }) as unknown as NovuLike;

describe('mapNovuNotification', () => {
  it('reads the v3 subject/isRead/data fields', () => {
    const result = mapNovuNotification(buildNotification());

    expect(result.id).toBe('n-1');
    expect(result.title).toBe('Structure fire');
    expect(result.body).toBe('Dispatched to 123 Main St');
    expect(result.read).toBe(false);
    expect(result.type).toBe('alert');
  });

  it('surfaces the reference so the navigate-to-call button can render', () => {
    const result = mapNovuNotification(buildNotification());

    expect(result.referenceId).toBe('call-42');
    expect(result.referenceType).toBe('call');
  });

  it('marks a read notification as read', () => {
    const result = mapNovuNotification(buildNotification({ isRead: true }));

    expect(result.read).toBe(true);
  });

  it('ignores the v2 field names so a regression cannot pass silently', () => {
    const v2Shaped = {
      id: 'n-2',
      title: 'v2 title',
      body: 'body',
      createdAt: '2026-08-20T10:00:00Z',
      read: true,
      type: 'info',
      payload: { referenceId: 'call-9', referenceType: 'call' },
    } as unknown as NovuLike;

    const result = mapNovuNotification(v2Shaped);

    expect(result.title).toBeUndefined();
    expect(result.referenceId).toBeUndefined();
    expect(result.referenceType).toBeUndefined();
  });

  it('drops reference values that are not usable', () => {
    const result = mapNovuNotification(buildNotification({ data: { referenceId: 42, referenceType: 'spaceship' } }));

    expect(result.referenceId).toBeUndefined();
    expect(result.referenceType).toBeUndefined();
  });

  it('resolves a work-order reference from the push event code the bridge copies into data', () => {
    const result = mapNovuNotification(buildNotification({ data: { eventCode: 'NWO:0b7c3e52-2f4a-4d0e-9a57-1f7a0c9d6e11' } }));

    expect(result.referenceType).toBe('work-order');
    expect(result.referenceId).toBe('0b7c3e52-2f4a-4d0e-9a57-1f7a0c9d6e11');
    // Routing, not "Additional information".
    expect(result.metadata).toEqual({});
  });

  it('resolves a call dispatch code, which has no separator, to the call', () => {
    expect(mapNovuNotification(buildNotification({ data: { eventCode: 'C1234' } }))).toEqual(expect.objectContaining({ referenceType: 'call', referenceId: '1234', metadata: {} }));
    // A communication-test token is not a call, whatever its first letter.
    expect(mapNovuNotification(buildNotification({ data: { eventCode: 'CT:9f2c' } })).referenceType).toBeUndefined();
  });

  it('resolves a department message code to the message', () => {
    expect(mapNovuNotification(buildNotification({ data: { eventCode: 'M5678' } }))).toEqual(expect.objectContaining({ referenceType: 'message', referenceId: '5678', metadata: {} }));
  });

  it('resolves direct and group chat codes to the conversation', () => {
    expect(mapNovuNotification(buildNotification({ data: { eventCode: 't:9a2b' } }))).toEqual(expect.objectContaining({ referenceType: 'chat', referenceId: '9a2b', metadata: {} }));
    expect(mapNovuNotification(buildNotification({ data: { eventCode: 'g:7f1c' } }))).toEqual(expect.objectContaining({ referenceType: 'chat', referenceId: '7f1c' }));
    expect(mapNovuNotification(buildNotification({ data: { eventCode: 'g:../call/9' } })).referenceType).toBeUndefined();
    // The bridge sends an empty code when a trigger carried none.
    expect(mapNovuNotification(buildNotification({ data: { eventCode: '' } })).referenceType).toBeUndefined();
  });

  it('ignores a work-order event code whose id could steer the router', () => {
    const result = mapNovuNotification(buildNotification({ data: { eventCode: 'NWO:../settings' } }));

    expect(result.referenceType).toBeUndefined();
    expect(result.referenceId).toBeUndefined();
  });

  it('keeps an explicit reference when the event code is not one the inbox opens', () => {
    const result = mapNovuNotification(buildNotification({ data: { eventCode: 'N0', referenceId: 'call-42', referenceType: 'call', type: 'alert' } }));

    expect(result.referenceType).toBe('call');
    expect(result.referenceId).toBe('call-42');
    expect(result.metadata).toEqual({ referenceId: 'call-42', referenceType: 'call', type: 'alert' });
  });

  it('tolerates a notification with no data bag', () => {
    const result = mapNovuNotification(buildNotification({ data: undefined }));

    expect(result.type).toBeUndefined();
    expect(result.referenceId).toBeUndefined();
    expect(result.metadata).toBeUndefined();
  });
});
