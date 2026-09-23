import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { NotificationDetail } from '../NotificationDetail';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { referenceType?: string }) =>
      ({
        'notifications.viewWorkOrder': 'View Work Order',
        'notifications.viewChat': 'View Chat',
        'notifications.viewCall': 'View Call',
        'notifications.viewMessage': 'View Message',
        'notifications.viewReference': `View ${options?.referenceType ?? ''}`,
      })[key] ?? key,
  }),
}));

const base = { id: 'n-1', title: 'Work order', body: 'WO-2026-000019: needs your attention', createdAt: '2026-09-22T10:00:00Z' };

describe('NotificationDetail reference button', () => {
  it('names a work-order reference in words and hands the id to the navigator', () => {
    const onNavigateToReference = jest.fn();
    render(<NotificationDetail notification={{ ...base, referenceType: 'work-order', referenceId: 'wo-guid' }} onClose={jest.fn()} onDelete={jest.fn()} onNavigateToReference={onNavigateToReference} />);

    expect(screen.getByText('View Work Order')).toBeTruthy();
    fireEvent.press(screen.getByTestId('notification-detail-reference'));

    expect(onNavigateToReference).toHaveBeenCalledWith('work-order', 'wo-guid');
  });

  it('names a chat reference in words', () => {
    render(<NotificationDetail notification={{ ...base, referenceType: 'chat', referenceId: '7f1c' }} onClose={jest.fn()} onDelete={jest.fn()} onNavigateToReference={jest.fn()} />);

    expect(screen.getByText('View Chat')).toBeTruthy();
  });

  it('names a call reference in words', () => {
    render(<NotificationDetail notification={{ ...base, referenceType: 'call', referenceId: '1234' }} onClose={jest.fn()} onDelete={jest.fn()} onNavigateToReference={jest.fn()} />);

    expect(screen.getByText('View Call')).toBeTruthy();
  });

  it('names a message reference in words', () => {
    render(<NotificationDetail notification={{ ...base, referenceType: 'message', referenceId: '5678' }} onClose={jest.fn()} onDelete={jest.fn()} onNavigateToReference={jest.fn()} />);

    expect(screen.getByText('View Message')).toBeTruthy();
  });

  it('keeps the generic label for other reference types', () => {
    render(<NotificationDetail notification={{ ...base, referenceType: 'note', referenceId: 'note-42' }} onClose={jest.fn()} onDelete={jest.fn()} onNavigateToReference={jest.fn()} />);

    expect(screen.getByText('View note')).toBeTruthy();
  });

  it('offers no button without a reference', () => {
    render(<NotificationDetail notification={base} onClose={jest.fn()} onDelete={jest.fn()} onNavigateToReference={jest.fn()} />);

    expect(screen.queryByTestId('notification-detail-reference')).toBeNull();
  });
});
