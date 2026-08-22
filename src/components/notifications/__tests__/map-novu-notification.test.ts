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

  it('tolerates a notification with no data bag', () => {
    const result = mapNovuNotification(buildNotification({ data: undefined }));

    expect(result.type).toBeUndefined();
    expect(result.referenceId).toBeUndefined();
    expect(result.metadata).toBeUndefined();
  });
});
